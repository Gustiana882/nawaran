package server

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strings"
	"time"

	"api/internal/database"
)

type SaveResponse struct {
	OK      bool   `json:"ok"`
	Message string `json:"message,omitempty"`
}

type WebsiteVersionResponse struct {
	OK        bool   `json:"ok"`
	WebsiteID string `json:"website_id"`
	UpdatedAt string `json:"updated_at"`
	Message   string `json:"message,omitempty"`
}

type createWebsitePayload struct {
	Name         string `json:"name"`
	Description  string `json:"description"`
	Domain       string `json:"domain"`
	TemplateUUID string `json:"template_uuid"`
}

type websiteSingleResponse struct {
	OK      bool              `json:"ok"`
	Website database.Websites `json:"website"`
	Message string            `json:"message,omitempty"`
}

type websiteListResponse struct {
	OK       bool                `json:"ok"`
	Websites []database.Websites `json:"websites"`
	Message  string              `json:"message,omitempty"`
}

type deleteWebsiteResponse struct {
	OK      bool   `json:"ok"`
	Message string `json:"message,omitempty"`
}

type updateWebsitePayload struct {
	Name        string          `json:"name"`
	Description string          `json:"description"`
	Domain      string          `json:"domain"`
	Data        json.RawMessage `json:"data"`
	HTML        string          `json:"html"`
}

func readWebsiteID(r *http.Request) string {
	// Try path parameter first (for routes like /api/websites/{id})
	if id := r.PathValue("id"); id != "" {
		return strings.TrimSpace(id)
	}
	// Fall back to query string (for routes like /api/websites/data?website_id=...)
	return strings.TrimSpace(r.URL.Query().Get("website_id"))
}

// handleListWebsites godoc: GET, POST /api/websites
func (s *Server) handleListWebsites(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodPost {
		s.handleCreateWebsite(w, r)
		return
	}
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, SaveResponse{OK: false, Message: "method tidak didukung"})
		return
	}

	// cek role user
	if err := s.auth.CheckRole(r.Context(), "website.view"); err != nil {
		writeJSON(w, http.StatusForbidden, SaveResponse{OK: false, Message: "akses ditolak"})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	websites, err := s.db.ListWebsites(ctx)
	if err != nil {
		log.Printf("list websites error: %v", err)
		writeJSON(w, http.StatusInternalServerError, SaveResponse{OK: false, Message: "gagal mengambil daftar website"})
		return
	}

	writeJSON(w, http.StatusOK, websiteListResponse{OK: true, Websites: websites})
}

func (s *Server) handleCreateWebsite(w http.ResponseWriter, r *http.Request) {
	// cek role user
	if err := s.auth.CheckRole(r.Context(), "website.create"); err != nil {
		writeJSON(w, http.StatusForbidden, SaveResponse{OK: false, Message: "akses ditolak"})
		return
	}

	var payload createWebsitePayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeJSON(w, http.StatusBadRequest, SaveResponse{OK: false, Message: "payload tidak valid: " + err.Error()})
		return
	}

	payload.Name = strings.TrimSpace(payload.Name)
	payload.Description = strings.TrimSpace(payload.Description)
	payload.Domain = strings.TrimSpace(payload.Domain)
	payload.TemplateUUID = strings.TrimSpace(payload.TemplateUUID)
	if payload.Name == "" {
		writeJSON(w, http.StatusBadRequest, SaveResponse{OK: false, Message: "name wajib diisi"})
		return
	}
	if payload.TemplateUUID == "" {
		writeJSON(w, http.StatusBadRequest, SaveResponse{OK: false, Message: "template_uuid wajib diisi"})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	website, err := s.db.CreateWebsite(ctx, database.CreateWebsiteInput{
		Name:         payload.Name,
		Description:  payload.Description,
		Domain:       payload.Domain,
		TemplateUUID: payload.TemplateUUID,
	})
	if err != nil {
		log.Printf("create website error template=%s: %v", payload.TemplateUUID, err)
		if strings.Contains(err.Error(), "template ") && strings.Contains(err.Error(), "tidak ditemukan") {
			writeJSON(w, http.StatusNotFound, SaveResponse{OK: false, Message: "template tidak ditemukan"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, SaveResponse{OK: false, Message: "gagal membuat website"})
		return
	}

	writeJSON(w, http.StatusCreated, websiteSingleResponse{OK: true, Website: *website})
}

// handleGetVersion godoc: GET /api/websites/version?website_id=...
func (s *Server) handleGetVersion(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, SaveResponse{OK: false, Message: "method tidak didukung"})
		return
	}

	websiteID := readWebsiteID(r)
	if websiteID == "" {
		writeJSON(w, http.StatusBadRequest, SaveResponse{OK: false, Message: "website_id wajib diisi"})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	updatedAt, err := s.db.GetWebsiteVersion(ctx, websiteID)
	if err != nil {
		log.Printf("get version error website=%s: %v", websiteID, err)
		writeJSON(w, http.StatusNotFound, SaveResponse{OK: false, Message: "halaman tidak ditemukan"})
		return
	}

	writeJSON(w, http.StatusOK, WebsiteVersionResponse{
		OK:        true,
		WebsiteID: websiteID,
		UpdatedAt: updatedAt.UTC().Format(time.RFC3339Nano),
	})
}

// handleGetData godoc: GET /api/websites/data?website_id=...
func (s *Server) handleGetData(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, SaveResponse{OK: false, Message: "method tidak didukung"})
		return
	}

	websiteID := readWebsiteID(r)
	if websiteID == "" {
		writeJSON(w, http.StatusBadRequest, SaveResponse{OK: false, Message: "website_id wajib diisi"})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	raw, err := s.db.GetWebsiteData(ctx, websiteID)
	if err != nil {
		log.Printf("get data error website=%s: %v", websiteID, err)
		writeJSON(w, http.StatusNotFound, SaveResponse{OK: false, Message: "halaman tidak ditemukan"})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(raw)
}

// handleSave godoc: POST /api/websites/save
func (s *Server) handleSave(w http.ResponseWriter, r *http.Request) {
	// cek role user
	if err := s.auth.CheckRole(r.Context(), "website.create"); err != nil {
		writeJSON(w, http.StatusForbidden, SaveResponse{OK: false, Message: "akses ditolak"})
		return
	}

	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, SaveResponse{OK: false, Message: "method tidak didukung"})
		return
	}

	var payload database.SavePayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeJSON(w, http.StatusBadRequest, SaveResponse{OK: false, Message: "payload tidak valid: " + err.Error()})
		return
	}

	if strings.TrimSpace(payload.WebsiteID) == "" {
		writeJSON(w, http.StatusBadRequest, SaveResponse{OK: false, Message: "website_id wajib diisi"})
		return
	}
	if strings.TrimSpace(payload.Domain) == "" {
		writeJSON(w, http.StatusBadRequest, SaveResponse{OK: false, Message: "domain wajib diisi"})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	if err := s.db.ApplySave(ctx, payload); err != nil {
		log.Printf("save error website=%s: %v", payload.WebsiteID, err)
		if errors.Is(err, database.ErrWebsiteNotFound) {
			writeJSON(w, http.StatusNotFound, SaveResponse{OK: false, Message: "website_id salah, website tidak ditemukan"})
			return
		}
		if errors.Is(err, database.ErrWebsiteDomainMismatch) {
			writeJSON(w, http.StatusConflict, SaveResponse{OK: false, Message: "website_id dan domain tidak cocok, perubahan tidak disimpan"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, SaveResponse{OK: false, Message: "gagal menyimpan perubahan"})
		return
	}

	writeJSON(w, http.StatusOK, SaveResponse{OK: true})
}

// handleDeleteWebsite godoc: DELETE /api/websites/:id
func (s *Server) handleDeleteWebsite(w http.ResponseWriter, r *http.Request) {
	// cek role user
	if err := s.auth.CheckRole(r.Context(), "website.delete"); err != nil {
		writeJSON(w, http.StatusForbidden, SaveResponse{OK: false, Message: "akses ditolak"})
		return
	}

	if r.Method != http.MethodDelete {
		writeJSON(w, http.StatusMethodNotAllowed, SaveResponse{OK: false, Message: "method tidak didukung"})
		return
	}

	websiteID := readWebsiteID(r)
	if websiteID == "" {
		writeJSON(w, http.StatusBadRequest, SaveResponse{OK: false, Message: "website_id wajib diisi"})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	if err := s.db.DeleteWebsite(ctx, websiteID); err != nil {
		log.Printf("delete website error id=%s: %v", websiteID, err)
		if errors.Is(err, database.ErrWebsiteNotFound) {
			writeJSON(w, http.StatusNotFound, deleteWebsiteResponse{OK: false, Message: "website tidak ditemukan"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, deleteWebsiteResponse{OK: false, Message: "gagal menghapus website"})
		return
	}

	writeJSON(w, http.StatusOK, deleteWebsiteResponse{OK: true})
}

// handleUpdateWebsite godoc: PUT /api/websites/:id
func (s *Server) handleUpdateWebsite(w http.ResponseWriter, r *http.Request) {
	// cek role user
	if err := s.auth.CheckRole(r.Context(), "website.update"); err != nil {
		writeJSON(w, http.StatusForbidden, SaveResponse{OK: false, Message: "akses ditolak"})
		return
	}

	if r.Method != http.MethodPut {
		writeJSON(w, http.StatusMethodNotAllowed, SaveResponse{OK: false, Message: "method tidak didukung"})
		return
	}

	websiteID := readWebsiteID(r)
	if websiteID == "" {
		writeJSON(w, http.StatusBadRequest, SaveResponse{OK: false, Message: "website_id wajib diisi"})
		return
	}

	var payload updateWebsitePayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeJSON(w, http.StatusBadRequest, SaveResponse{OK: false, Message: "payload tidak valid: " + err.Error()})
		return
	}

	payload.Name = strings.TrimSpace(payload.Name)
	payload.Description = strings.TrimSpace(payload.Description)
	payload.Domain = strings.TrimSpace(payload.Domain)
	if payload.Name == "" {
		writeJSON(w, http.StatusBadRequest, SaveResponse{OK: false, Message: "name wajib diisi"})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	website, err := s.db.UpdateWebsite(ctx, database.UpdateWebsiteInput{
		ID:          websiteID,
		Name:        payload.Name,
		Description: payload.Description,
		Domain:      payload.Domain,
		Data:        []byte(payload.Data),
		HTML:        payload.HTML,
	})
	if err != nil {
		log.Printf("update website error id=%s: %v", websiteID, err)
		if errors.Is(err, database.ErrWebsiteNotFound) {
			writeJSON(w, http.StatusNotFound, websiteSingleResponse{OK: false, Message: "website tidak ditemukan"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, websiteSingleResponse{OK: false, Message: "gagal memperbarui website"})
		return
	}

	writeJSON(w, http.StatusOK, websiteSingleResponse{OK: true, Website: *website})
}
