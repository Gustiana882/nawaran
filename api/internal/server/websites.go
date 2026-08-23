package server

import (
	"context"
	"encoding/json"
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

func readWebsiteID(r *http.Request) string {
	return strings.TrimSpace(r.URL.Query().Get("website_id"))
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

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	if err := s.db.ApplySave(ctx, payload); err != nil {
		log.Printf("save error website=%s: %v", payload.WebsiteID, err)
		writeJSON(w, http.StatusInternalServerError, SaveResponse{OK: false, Message: "gagal menyimpan perubahan"})
		return
	}

	writeJSON(w, http.StatusOK, SaveResponse{OK: true})
}
