package server

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
)

// =========================
// Request bodies
// =========================

type createProxyRequest struct {
	Domain   string `json:"domain"`
	Upstream string `json:"upstream"`
}

type updateProxyRequest struct {
	Domain   string `json:"domain"`
	Upstream string `json:"upstream"`
}

// =========================
// /api/proxies  (list belum tersedia di Service, jadi hanya POST)
// =========================

func (s *Server) handleProxy(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		s.handleListProxy(w, r)
	case http.MethodPost:
		s.handleCreateProxy(w, r)
	default:
		writeJSON(w, http.StatusMethodNotAllowed, SaveResponse{OK: false, Message: "method tidak didukung"})
	}
}

func (s *Server) handleListProxy(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	if err := s.auth.CheckRole(ctx, "proxy.view"); err != nil {
		writeJSON(w, http.StatusForbidden, SaveResponse{OK: false, Message: "akses ditolak"})
		return
	}

	routes, err := s.proxy.ListProxies(ctx)
	if err != nil {
		fmt.Printf("Failed to list proxies: %v", err)
		writeJSON(w, http.StatusInternalServerError, SaveResponse{OK: false, Message: "gagal mengambil daftar proxy"})
		return
	}

	writeJSON(w, http.StatusOK, routes)
}

func (s *Server) handleCreateProxy(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	if err := s.auth.CheckRole(ctx, "proxy.create"); err != nil {
		writeJSON(w, http.StatusForbidden, SaveResponse{OK: false, Message: "akses ditolak"})
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, 1<<20) // 1MB

	var req createProxyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, SaveResponse{OK: false, Message: "body request tidak valid: " + err.Error()})
		return
	}

	req.Domain = strings.TrimSpace(req.Domain)
	req.Upstream = strings.TrimSpace(req.Upstream)

	if req.Domain == "" || req.Upstream == "" {
		writeJSON(w, http.StatusBadRequest, SaveResponse{OK: false, Message: "field domain dan upstream wajib diisi"})
		return
	}

	id, err := s.proxy.CreateProxy(ctx, req.Domain, req.Upstream)
	if err != nil {
		fmt.Printf("Failed to create proxy for %s: %v", req.Domain, err)
		writeJSON(w, http.StatusBadGateway, SaveResponse{OK: false, Message: "gagal membuat proxy: " + err.Error()})
		return
	}

	writeJSON(w, http.StatusCreated, map[string]any{
		"ok":      true,
		"id":      id.String(),
		"domain":  req.Domain,
		"message": fmt.Sprintf("proxy untuk domain %s berhasil dibuat", req.Domain),
	})
}

// =========================
// /api/proxies/{id}
// =========================

// handleProxyByID menangani:
//
//	GET    /api/proxies/{id}  -> ambil detail proxy
//	PATCH  /api/proxies/{id}  -> update domain/upstream proxy
//	DELETE /api/proxies/{id}  -> hapus proxy
//
// Daftarkan lewat: mux.HandleFunc("/api/proxies/", s.handleProxyByID)
func (s *Server) handleProxyByID(w http.ResponseWriter, r *http.Request) {
	id := strings.Trim(strings.TrimPrefix(r.URL.Path, "/api/proxies/"), "/")
	if id == "" {
		writeJSON(w, http.StatusBadRequest, SaveResponse{OK: false, Message: "id proxy wajib diisi di path"})
		return
	}

	switch r.Method {
	case http.MethodGet:
		s.handleGetProxy(w, r, id)
	case http.MethodPatch:
		s.handleUpdateProxy(w, r, id)
	case http.MethodDelete:
		s.handleDeleteProxy(w, r, id)
	default:
		writeJSON(w, http.StatusMethodNotAllowed, SaveResponse{OK: false, Message: "method tidak didukung"})
	}
}

func (s *Server) handleGetProxy(w http.ResponseWriter, r *http.Request, id string) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	if err := s.auth.CheckRole(ctx, "proxy.view"); err != nil {
		writeJSON(w, http.StatusForbidden, SaveResponse{OK: false, Message: "akses ditolak"})
		return
	}

	detail, err := s.proxy.GetProxy(ctx, id)
	if err != nil {
		fmt.Printf("Failed to get proxy %s: %v", id, err)
		writeJSON(w, http.StatusNotFound, SaveResponse{OK: false, Message: "proxy tidak ditemukan: " + err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, detail)
}

func (s *Server) handleUpdateProxy(w http.ResponseWriter, r *http.Request, id string) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	if err := s.auth.CheckRole(ctx, "proxy.update"); err != nil {
		writeJSON(w, http.StatusForbidden, SaveResponse{OK: false, Message: "akses ditolak"})
		return
	}

	parsedID, err := uuid.Parse(id)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, SaveResponse{OK: false, Message: "id proxy tidak valid, harus berupa UUID"})
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)

	var req updateProxyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, SaveResponse{OK: false, Message: "body request tidak valid: " + err.Error()})
		return
	}

	req.Domain = strings.TrimSpace(req.Domain)
	req.Upstream = strings.TrimSpace(req.Upstream)

	if req.Domain == "" || req.Upstream == "" {
		writeJSON(w, http.StatusBadRequest, SaveResponse{OK: false, Message: "field domain dan upstream wajib diisi"})
		return
	}

	if _, err := s.proxy.UpdateProxy(ctx, parsedID, req.Domain, req.Upstream); err != nil {
		fmt.Printf("Failed to update proxy %s: %v", id, err)
		writeJSON(w, http.StatusBadGateway, SaveResponse{OK: false, Message: "gagal memperbarui proxy: " + err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, SaveResponse{OK: true, Message: fmt.Sprintf("proxy %s berhasil diperbarui", id)})
}

func (s *Server) handleDeleteProxy(w http.ResponseWriter, r *http.Request, id string) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	if err := s.auth.CheckRole(ctx, "proxy.delete"); err != nil {
		writeJSON(w, http.StatusForbidden, SaveResponse{OK: false, Message: "akses ditolak"})
		return
	}

	if err := s.proxy.DeleteProxy(ctx, id); err != nil {
		fmt.Printf("Failed to delete proxy %s: %v", id, err)
		writeJSON(w, http.StatusBadGateway, SaveResponse{OK: false, Message: "gagal menghapus proxy: " + err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, SaveResponse{OK: true, Message: fmt.Sprintf("proxy %s berhasil dihapus", id)})
}
