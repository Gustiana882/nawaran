package server

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"api/internal/database"
)

type templatePayload struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Data        any    `json:"data"`
	HTML        string `json:"html"`
}

type templateSingleResponse struct {
	OK       bool              `json:"ok"`
	Template database.Template `json:"template"`
	Message  string            `json:"message,omitempty"`
}

type templateListResponse struct {
	OK        bool                `json:"ok"`
	Templates []database.Template `json:"templates"`
	Message   string              `json:"message,omitempty"`
}

func readTemplateID(path string) string {
	id := strings.TrimPrefix(path, "/api/templates/")
	id = strings.TrimSpace(id)
	if strings.Contains(id, "/") {
		return ""
	}
	return id
}

func (s *Server) handleTemplates(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		s.handleListTemplates(w, r)
	case http.MethodPost:
		s.handleCreateTemplate(w, r)
	default:
		writeJSON(w, http.StatusMethodNotAllowed, SaveResponse{OK: false, Message: "method tidak didukung"})
	}
}

func (s *Server) handleTemplateByID(w http.ResponseWriter, r *http.Request) {
	id := readTemplateID(r.URL.Path)
	if id == "" {
		writeJSON(w, http.StatusBadRequest, SaveResponse{OK: false, Message: "template id wajib diisi"})
		return
	}

	switch r.Method {
	case http.MethodGet:
		s.handleGetTemplate(w, r, id)
	case http.MethodPut:
		s.handleUpdateTemplate(w, r, id)
	case http.MethodDelete:
		s.handleDeleteTemplate(w, r, id)
	default:
		writeJSON(w, http.StatusMethodNotAllowed, SaveResponse{OK: false, Message: "method tidak didukung"})
	}
}

func (s *Server) handleListTemplates(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	templates, err := s.db.ListTemplates(ctx)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, SaveResponse{OK: false, Message: "gagal mengambil daftar template"})
		return
	}

	writeJSON(w, http.StatusOK, templateListResponse{OK: true, Templates: templates})
}

func (s *Server) handleCreateTemplate(w http.ResponseWriter, r *http.Request) {
	var payload templatePayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeJSON(w, http.StatusBadRequest, SaveResponse{OK: false, Message: "payload tidak valid: " + err.Error()})
		return
	}

	if strings.TrimSpace(payload.Name) == "" {
		writeJSON(w, http.StatusBadRequest, SaveResponse{OK: false, Message: "name wajib diisi"})
		return
	}
	if strings.TrimSpace(payload.HTML) == "" {
		writeJSON(w, http.StatusBadRequest, SaveResponse{OK: false, Message: "html wajib diisi"})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	created, err := s.db.CreateTemplate(ctx, database.CreateTemplateInput{
		Name:        payload.Name,
		Description: payload.Description,
		Data:        payload.Data,
		HTML:        payload.HTML,
	})
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, SaveResponse{OK: false, Message: "gagal membuat template"})
		return
	}

	writeJSON(w, http.StatusCreated, templateSingleResponse{OK: true, Template: *created})
}

func (s *Server) handleGetTemplate(w http.ResponseWriter, r *http.Request, id string) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	tpl, err := s.db.GetTemplateByID(ctx, id)
	if err != nil {
		writeJSON(w, http.StatusNotFound, SaveResponse{OK: false, Message: "template tidak ditemukan"})
		return
	}

	writeJSON(w, http.StatusOK, templateSingleResponse{OK: true, Template: *tpl})
}

func (s *Server) handleUpdateTemplate(w http.ResponseWriter, r *http.Request, id string) {
	var payload templatePayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeJSON(w, http.StatusBadRequest, SaveResponse{OK: false, Message: "payload tidak valid: " + err.Error()})
		return
	}

	if strings.TrimSpace(payload.Name) == "" {
		writeJSON(w, http.StatusBadRequest, SaveResponse{OK: false, Message: "name wajib diisi"})
		return
	}
	if strings.TrimSpace(payload.HTML) == "" {
		writeJSON(w, http.StatusBadRequest, SaveResponse{OK: false, Message: "html wajib diisi"})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	updated, err := s.db.UpdateTemplate(ctx, id, database.UpdateTemplateInput{
		Name:        payload.Name,
		Description: payload.Description,
		Data:        payload.Data,
		HTML:        payload.HTML,
	})
	if err != nil {
		writeJSON(w, http.StatusNotFound, SaveResponse{OK: false, Message: "template tidak ditemukan / gagal diupdate"})
		return
	}

	writeJSON(w, http.StatusOK, templateSingleResponse{OK: true, Template: *updated})
}

func (s *Server) handleDeleteTemplate(w http.ResponseWriter, r *http.Request, id string) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	if err := s.db.DeleteTemplate(ctx, id); err != nil {
		writeJSON(w, http.StatusNotFound, SaveResponse{OK: false, Message: "template tidak ditemukan / gagal dihapus"})
		return
	}

	writeJSON(w, http.StatusOK, SaveResponse{OK: true})
}
