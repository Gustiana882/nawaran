package database

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
)

type Template struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Data        any       `json:"data"`
	HTML        string    `json:"html"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type CreateTemplateInput struct {
	Name        string
	Description string
	Data        any
	HTML        string
}

type UpdateTemplateInput struct {
	Name        string
	Description string
	Data        any
	HTML        string
}

func ensureTemplatesTable(db *sql.DB) error {
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS templates (
			uuid TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			description TEXT NOT NULL DEFAULT '',
			data JSONB NOT NULL,
			html TEXT NOT NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
		)
	`)
	return err
}

func encodeJSONB(v any) ([]byte, error) {
	if v == nil {
		return []byte(`{}`), nil
	}
	return json.Marshal(v)
}

func decodeJSONB(raw []byte) (any, error) {
	var out any
	if len(raw) == 0 {
		return map[string]any{}, nil
	}
	if err := json.Unmarshal(raw, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func (s *service) ListTemplates(ctx context.Context, userID *string) ([]Template, error) {
	query := `
		SELECT uuid, name, description, data, html, created_at, updated_at
		FROM templates
	`
	if userID != nil {
		query += fmt.Sprintf(" WHERE user_id = '%s'", *userID)
	}
	rows, err := s.db.QueryContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("list templates: %w", err)
	}
	defer rows.Close()

	result := make([]Template, 0)
	for rows.Next() {
		var t Template
		var rawData []byte
		if err := rows.Scan(&t.ID, &t.Name, &t.Description, &rawData, &t.HTML, &t.CreatedAt, &t.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan template: %w", err)
		}
		decoded, err := decodeJSONB(rawData)
		if err != nil {
			return nil, fmt.Errorf("decode data: %w", err)
		}
		t.Data = decoded
		result = append(result, t)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate templates: %w", err)
	}

	return result, nil
}

func (s *service) GetTemplateByID(ctx context.Context, id string) (*Template, error) {
	var t Template
	var rawData []byte
	err := s.db.QueryRowContext(ctx, `
		SELECT uuid, name, description, data, html, created_at, updated_at
		FROM templates
		WHERE uuid = $1
	`, id).Scan(&t.ID, &t.Name, &t.Description, &rawData, &t.HTML, &t.CreatedAt, &t.UpdatedAt)

	if errors.Is(err, sql.ErrNoRows) {
		return nil, fmt.Errorf("template %s tidak ditemukan", id)
	}
	if err != nil {
		return nil, fmt.Errorf("get template: %w", err)
	}

	decoded, err := decodeJSONB(rawData)
	if err != nil {
		return nil, fmt.Errorf("decode data: %w", err)
	}
	t.Data = decoded

	return &t, nil
}

func (s *service) CreateTemplate(ctx context.Context, input CreateTemplateInput) (*Template, error) {
	id := uuid.NewString()
	rawData, err := encodeJSONB(input.Data)
	if err != nil {
		return nil, fmt.Errorf("encode data: %w", err)
	}

	var t Template
	var outRaw []byte
	err = s.db.QueryRowContext(ctx, `
		INSERT INTO templates (uuid, name, description, data, html, created_at, updated_at)
		VALUES ($1, $2, $3, $4::jsonb, $5, now(), now())
		RETURNING uuid, name, description, data, html, created_at, updated_at
	`, id, input.Name, input.Description, rawData, input.HTML).Scan(
		&t.ID, &t.Name, &t.Description, &outRaw, &t.HTML, &t.CreatedAt, &t.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("create template: %w", err)
	}

	decoded, err := decodeJSONB(outRaw)
	if err != nil {
		return nil, fmt.Errorf("decode data: %w", err)
	}
	t.Data = decoded

	return &t, nil
}

func (s *service) UpdateTemplate(ctx context.Context, id string, input UpdateTemplateInput) (*Template, error) {
	rawData, err := encodeJSONB(input.Data)
	if err != nil {
		return nil, fmt.Errorf("encode data: %w", err)
	}

	var t Template
	var outRaw []byte
	err = s.db.QueryRowContext(ctx, `
		UPDATE templates
		SET name = $2,
			description = $3,
			data = $4::jsonb,
			html = $5,
			updated_at = now()
		WHERE uuid = $1
		RETURNING uuid, name, description, data, html, created_at, updated_at
	`, id, input.Name, input.Description, rawData, input.HTML).Scan(
		&t.ID, &t.Name, &t.Description, &outRaw, &t.HTML, &t.CreatedAt, &t.UpdatedAt,
	)

	if errors.Is(err, sql.ErrNoRows) {
		return nil, fmt.Errorf("template %s tidak ditemukan", id)
	}
	if err != nil {
		return nil, fmt.Errorf("update template: %w", err)
	}

	decoded, err := decodeJSONB(outRaw)
	if err != nil {
		return nil, fmt.Errorf("decode data: %w", err)
	}
	t.Data = decoded

	return &t, nil
}

func (s *service) DeleteTemplate(ctx context.Context, id string) error {
	res, err := s.db.ExecContext(ctx, `DELETE FROM templates WHERE uuid = $1`, id)
	if err != nil {
		return fmt.Errorf("delete template: %w", err)
	}

	affected, err := res.RowsAffected()
	if err != nil {
		return fmt.Errorf("delete template rows affected: %w", err)
	}
	if affected == 0 {
		return fmt.Errorf("template %s tidak ditemukan", id)
	}

	return nil
}
