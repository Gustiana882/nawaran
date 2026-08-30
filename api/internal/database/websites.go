package database

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
)

type Websites struct {
	ID          int             `json:"id"`
	UUID        string          `json:"uuid"`
	Name        string          `json:"name"`
	Description string          `json:"description"`
	Domain      string          `json:"domain"`
	Data        json.RawMessage `json:"data"`
	HTML        string          `json:"html"`
	UpdatedAt   *time.Time      `json:"updated_at"`
	UserID      string          `json:"user_id"`
}

// SavePayload harus persis sama dengan yang dikirim InlineEditor lewat
// onSave() di editor.js:
//
//	{
//	  "website_id": "...",
//	  "fields": { "title": "...", "price": "..." },
//	  "collections": {
//	    "features": [
//	      { "id": "0", "text": "Materi video HD" },
//	      { "id": "new-1729-ab12cd", "text": "Fitur baru" }
//	    ]
//	  },
//	  "deletedItems": {
//	    "features": ["2", "5"]
//	  }
//	}
type SavePayload struct {
	WebsiteID    string                      `json:"website_id"`
	Domain       string                      `json:"domain"`
	Fields       map[string]string           `json:"fields"`
	Collections  map[string][]map[string]any `json:"collections"`
	DeletedItems map[string][]string         `json:"deletedItems"`
}

type CreateWebsiteInput struct {
	Name         string
	Description  string
	Domain       string
	TemplateUUID string
	UserID       string
}

var (
	ErrWebsiteNotFound       = errors.New("website not found")
	ErrWebsiteDomainMismatch = errors.New("website id and domain mismatch")
)

func (p SavePayload) id() string {
	return p.WebsiteID
}

func (s *service) ListWebsites(ctx context.Context, userID *string) ([]Websites, error) {
	query := `
		SELECT uuid, id, domain, name, description, data, html, updated_at
		FROM websites
	`

	if userID != nil {
		query += fmt.Sprintf(" WHERE user_id = '%s'", *userID)
	}

	rows, err := s.db.QueryContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("list websites: %w", err)
	}
	defer rows.Close()

	websites := make([]Websites, 0)
	for rows.Next() {
		var website Websites
		var name, description, domain, htmlVal sql.NullString
		if err := rows.Scan(
			&website.UUID, &website.ID, &domain, &name, &description,
			&website.Data, &htmlVal, &website.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan website: %w", err)
		}
		website.Name = name.String
		website.Description = description.String
		website.Domain = domain.String
		website.HTML = htmlVal.String
		websites = append(websites, website)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate websites: %w", err)
	}

	return websites, nil
}

func (s *service) CreateWebsite(ctx context.Context, input CreateWebsiteInput) (*Websites, error) {

	// Ambil template dari DB, supaya bisa menyalin data JSONB + HTML ke website baru.
	var rawData []byte
	var html string
	if err := s.db.QueryRowContext(ctx, `SELECT data, html FROM templates WHERE uuid = $1`, input.TemplateUUID).Scan(&rawData, &html); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("template %s tidak ditemukan", input.TemplateUUID)
		}
		return nil, fmt.Errorf("get template for website: %w", err)
	}

	// Buat website baru dengan UUID baru, domain, nama, deskripsi, data JSONB, dan HTML dari template.
	websiteUUID := uuid.NewString()
	var website Websites
	if err := s.db.QueryRowContext(ctx, `
		INSERT INTO websites (uuid, domain, name, description, data, html, updated_at)
		VALUES ($1, $2, $3, $4, $5::jsonb, $6, now())
		RETURNING id, uuid, domain, name, description, data, html, updated_at
	`, websiteUUID, input.Domain, input.Name, input.Description, rawData, html).Scan(
		&website.ID, &website.UUID, &website.Domain, &website.Name, &website.Description, &website.Data, &website.HTML, &website.UpdatedAt,
	); err != nil {
		return nil, fmt.Errorf("create website: %w", err)
	}

	return &website, nil
}

// GetWebsiteData mengembalikan isi kolom JSONB `websites.data` + template html.
func (s *service) GetWebsiteData(ctx context.Context, websiteID string) ([]byte, error) {
	var raw []byte
	var html sql.NullString
	var updatedAt time.Time
	err := s.db.QueryRowContext(ctx,
		`SELECT data, html, updated_at FROM websites WHERE uuid = $1`,
		websiteID,
	).Scan(&raw, &html, &updatedAt)

	if errors.Is(err, sql.ErrNoRows) {
		return nil, fmt.Errorf("%w: %s", ErrWebsiteNotFound, websiteID)
	}
	if err != nil {
		return nil, fmt.Errorf("select data: %w", err)
	}

	var data map[string]any
	if err := json.Unmarshal(raw, &data); err != nil {
		return nil, fmt.Errorf("parse data: %w", err)
	}
	data["html"] = html.String
	data["updated_at"] = updatedAt.UTC().Format(time.RFC3339Nano)

	out, err := json.Marshal(data)
	if err != nil {
		return nil, fmt.Errorf("marshal data: %w", err)
	}

	return out, nil
}

// GetWebsiteVersion mengembalikan updated_at untuk validasi cache ringan.
func (s *service) GetWebsiteVersion(ctx context.Context, websiteID string) (time.Time, error) {
	var updatedAt time.Time
	err := s.db.QueryRowContext(ctx,
		`SELECT updated_at FROM websites WHERE uuid = $1`,
		websiteID,
	).Scan(&updatedAt)

	if errors.Is(err, sql.ErrNoRows) {
		return time.Time{}, fmt.Errorf("%w: %s", ErrWebsiteNotFound, websiteID)
	}
	if err != nil {
		return time.Time{}, fmt.Errorf("select updated_at: %w", err)
	}

	return updatedAt, nil
}

// ApplySave menggabungkan payload ke kolom JSONB `websites.data`, dijalankan
// dalam transaksi + SELECT ... FOR UPDATE supaya aman kalau ada dua request
// save nyaris bersamaan (mis. dua tab admin terbuka).
func (s *service) ApplySave(ctx context.Context, payload SavePayload) error {
	websiteID := payload.id()
	if strings.TrimSpace(websiteID) == "" {
		return fmt.Errorf("website id wajib diisi")
	}
	requestedDomain := normalizeDomain(payload.Domain)
	if requestedDomain == "" {
		return fmt.Errorf("domain wajib diisi")
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback() // no-op kalau sudah di-Commit

	var raw []byte
	var domain string
	err = tx.QueryRowContext(ctx,
		`SELECT domain, data FROM websites WHERE uuid = $1 FOR UPDATE`,
		websiteID,
	).Scan(&domain, &raw)

	if errors.Is(err, sql.ErrNoRows) {
		return fmt.Errorf("%w: %s", ErrWebsiteNotFound, websiteID)
	}
	if err != nil {
		return fmt.Errorf("select data: %w", err)
	}

	var data map[string]any
	if err := json.Unmarshal(raw, &data); err != nil {
		return fmt.Errorf("parse data existing: %w", err)
	}
	if normalizeDomain(domain) != requestedDomain {
		return ErrWebsiteDomainMismatch
	}

	// 1) Field teks biasa (di luar koleksi) -> langsung timpa
	for key, value := range payload.Fields {
		data[key] = value
	}

	// 2) Koleksi/array -> merge per-item dulu (edit + item baru).
	//
	//    PENTING: kumpulkan hasil merge di variabel LOKAL (mergedCollections)
	//    dulu, JANGAN langsung ditulis ke `data[collectionKey]` di sini.
	//    Kalau langsung ditulis ke `data`, dan collection yang sama juga
	//    ada di payload.DeletedItems, maka extractItems() akan dipanggil
	//    LAGI di step 3 terhadap nilai yang sudah bertipe []map[string]any
	//    (bukan []any lagi) -> type assertion gagal diam-diam -> item yang
	//    baru saja di-merge lenyap total. Ini bug nyata yang sudah kejadian.
	mergedCollections := make(map[string][]map[string]any, len(payload.Collections))

	for collectionKey, edits := range payload.Collections {
		items := extractItems(data[collectionKey])
		items = applyCollectionEdits(collectionKey, items, edits)
		mergedCollections[collectionKey] = items
	}

	// 3) Baru proses penghapusan, berdasarkan index ASLI (sebelum ada
	//    penambahan item baru di langkah 2 tadi, jadi index-nya masih valid).
	//    Ambil dari mergedCollections dulu kalau collection itu barusan
	//    di-merge di step 2; kalau tidak, baru fallback ke `data` asli.
	for collectionKey, deletedIDs := range payload.DeletedItems {
		var items []map[string]any
		if existing, ok := mergedCollections[collectionKey]; ok {
			items = existing
		} else {
			items = extractItems(data[collectionKey])
		}
		mergedCollections[collectionKey] = removeItemsByIndex(items, deletedIDs)
	}

	// 4) Tulis semua hasil merge ke `data` di akhir, sekali jalan.
	for collectionKey, items := range mergedCollections {
		data[collectionKey] = items
	}

	updated, err := json.Marshal(data)
	if err != nil {
		return fmt.Errorf("marshal data baru: %w", err)
	}

	_, err = tx.ExecContext(ctx,
		`UPDATE websites SET data = $1, updated_at = now() WHERE uuid = $2`,
		updated, websiteID,
	)
	if err != nil {
		return fmt.Errorf("update: %w", err)
	}

	return tx.Commit()
}

func normalizeDomain(domain string) string {
	return strings.ToLower(strings.TrimSpace(strings.TrimSuffix(domain, "/")))
}

// extractItems mengubah nilai array-of-object dari kolom JSONB menjadi
// []map[string]any yang mudah dimanipulasi.
//
// Menangani DUA bentuk input dengan sengaja:
//   - []any (bentuk asli hasil json.Unmarshal ke map[string]any)
//   - []map[string]any (kalau nilai ini sudah pernah diproses sebelumnya
//     di request yang sama — lihat catatan di ApplySave di atas)
//
// Kalau bukan salah satu dari keduanya (key belum ada / bukan array sama
// sekali), kembalikan slice kosong DAN catat log peringatan — supaya kalau
// ini terjadi karena key salah nama/mismatch, ketahuan lewat log, bukan
// menghilang diam-diam.
func extractItems(raw any) []map[string]any {
	switch v := raw.(type) {
	case []any:
		items := make([]map[string]any, 0, len(v))
		for _, entry := range v {
			if m, ok := entry.(map[string]any); ok {
				items = append(items, m)
			}
		}
		return items
	case []map[string]any:
		return v
	case nil:
		return []map[string]any{}
	default:
		log.Printf("extractItems: nilai tidak dikenal (%T), dianggap array kosong", raw)
		return []map[string]any{}
	}
}

// applyCollectionEdits menggabungkan perubahan field per item.
//
//   - id numerik (index asli item, mis. "0", "1") -> item yang sudah ada;
//     HANYA field yang dikirim yang diubah (partial merge). editor.js cuma
//     mengirim field yang benar-benar diedit user, jadi field lain pada
//     item yang sama tidak boleh ikut ter-timpa/hilang.
//   - id berformat "new-..." -> item baru dari klik tombol "+ Tambah",
//     ditambahkan ke akhir array (id sementara ini TIDAK ikut disimpan).
//
// Kalau id numerik ternyata di luar jangkauan array yang sedang ada
// (mis. karena `items` kosong padahal harusnya berisi data lama), ini
// KEMUNGKINAN BESAR menandakan `data[collectionKey]` tidak ter-load
// dengan benar dari DB (key salah nama, atau kolom memang belum diisi).
// Daripada diam-diam di-skip (dan datanya seolah "hilang"), sekarang
// dicatat sebagai warning supaya kelihatan di log server.
func applyCollectionEdits(collectionKey string, items []map[string]any, edits []map[string]any) []map[string]any {
	for _, edit := range edits {
		idRaw, _ := edit["id"].(string)

		fields := make(map[string]any, len(edit))
		for k, v := range edit {
			if k == "id" {
				continue
			}
			fields[k] = v
		}

		if strings.HasPrefix(idRaw, "new-") {
			items = append(items, fields)
			continue
		}

		idx, err := strconv.Atoi(idRaw)
		if err != nil || idx < 0 || idx >= len(items) {
			log.Printf(
				"applyCollectionEdits: SKIP collection=%q id=%q (items saat ini cuma %d) - edit ini TIDAK tersimpan, cek apakah data[%q] ke-load dengan benar dari DB",
				collectionKey, idRaw, len(items), collectionKey,
			)
			continue
		}

		for k, v := range fields {
			items[idx][k] = v
		}
	}

	return items
}

// removeItemsByIndex membuang item berdasarkan index asli (dikirim sebagai
// string angka lewat payload.DeletedItems).
func removeItemsByIndex(items []map[string]any, ids []string) []map[string]any {
	toDelete := make(map[int]bool, len(ids))
	for _, idStr := range ids {
		if idx, err := strconv.Atoi(idStr); err == nil {
			toDelete[idx] = true
		}
	}

	filtered := make([]map[string]any, 0, len(items))
	for i, item := range items {
		if !toDelete[i] {
			filtered = append(filtered, item)
		}
	}
	return filtered
}

// DeleteWebsite menghapus website berdasarkan UUID.
func (s *service) DeleteWebsite(ctx context.Context, websiteUUID string) error {
	result, err := s.db.ExecContext(ctx, `DELETE FROM websites WHERE uuid = $1`, websiteUUID)
	if err != nil {
		return fmt.Errorf("delete website: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("check rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("%w: %s", ErrWebsiteNotFound, websiteUUID)
	}

	return nil
}

type UpdateWebsiteInput struct {
	ID          string
	Name        string
	Description string
	Domain      string
	Data        []byte
	HTML        string
}

// UpdateWebsite memperbarui website berdasarkan UUID.
func (s *service) UpdateWebsite(ctx context.Context, input UpdateWebsiteInput) (*Websites, error) {
	// Jika data/html tidak dikirim, ambil nilai existing dari DB dulu
	if len(input.Data) == 0 && input.HTML == "" {
		var website Websites
		err := s.db.QueryRowContext(ctx, `
			UPDATE websites 
			SET name = $1, description = $2, domain = $3, updated_at = now()
			WHERE uuid = $4
			RETURNING id, uuid, domain, name, description, data, html, updated_at
		`, input.Name, input.Description, input.Domain, input.ID).Scan(
			&website.ID, &website.UUID, &website.Domain, &website.Name, &website.Description, &website.Data, &website.HTML, &website.UpdatedAt,
		)
		if errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("%w: %s", ErrWebsiteNotFound, input.ID)
		}
		if err != nil {
			return nil, fmt.Errorf("update website: %w", err)
		}
		return &website, nil
	}

	var website Websites
	err := s.db.QueryRowContext(ctx, `
		UPDATE websites 
		SET name = $1, description = $2, domain = $3, data = $4::jsonb, html = $5, updated_at = now()
		WHERE uuid = $6
		RETURNING id, uuid, domain, name, description, data, html, updated_at
	`, input.Name, input.Description, input.Domain, input.Data, input.HTML, input.ID).Scan(
		&website.ID, &website.UUID, &website.Domain, &website.Name, &website.Description, &website.Data, &website.HTML, &website.UpdatedAt,
	)

	if errors.Is(err, sql.ErrNoRows) {
		return nil, fmt.Errorf("%w: %s", ErrWebsiteNotFound, input.ID)
	}
	if err != nil {
		return nil, fmt.Errorf("update website: %w", err)
	}

	return &website, nil
}
