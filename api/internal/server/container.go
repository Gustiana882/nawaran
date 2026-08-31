package server

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"api/internal/container"
)

func (s *Server) handleContainer(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		s.handleGetContainer(w, r)
	case http.MethodPost:
		s.handleCreateContainer(w, r)
	default:
		writeJSON(w, http.StatusMethodNotAllowed, SaveResponse{OK: false, Message: "method tidak didukung"})
	}
}

func (s *Server) handleGetContainer(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	if err := s.auth.CheckRole(ctx, "container.view"); err != nil {
		writeJSON(w, http.StatusForbidden, SaveResponse{OK: false, Message: "akses ditolak"})
		return
	}

	containers, err := s.container.List(ctx)
	if err != nil {
		fmt.Printf("Failed to list containers: %v", err)
		writeJSON(w, http.StatusInternalServerError, SaveResponse{OK: false, Message: "gagal mengambil daftar container"})
		return
	}

	writeJSON(w, http.StatusOK, containers)
}

func (s *Server) handleCreateContainer(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	if err := s.auth.CheckRole(ctx, "container.create"); err != nil {
		writeJSON(w, http.StatusForbidden, SaveResponse{OK: false, Message: "akses ditolak"})
		return
	}

	// batasi ukuran body supaya tidak dipakai untuk DoS
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20) // 1MB

	var req container.CreateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, SaveResponse{OK: false, Message: "body request tidak valid: " + err.Error()})
		return
	}

	if strings.TrimSpace(req.Image) == "" {
		writeJSON(w, http.StatusBadRequest, SaveResponse{OK: false, Message: "field image wajib diisi"})
		return
	}

	res, err := s.container.Create(ctx, req)
	if err != nil {
		fmt.Printf("Failed to create container: %v", err)
		writeJSON(w, http.StatusBadGateway, SaveResponse{OK: false, Message: "gagal membuat container: " + err.Error()})
		return
	}

	writeJSON(w, http.StatusCreated, res)
}

// =========================
// Operasi per-container (identifikasi lewat nama/ID di path)
// =========================

// handleContainerByName menangani request yang menyasar satu container
// spesifik, dengan path:
//
//	GET    /api/containers/{name}          -> inspect
//	DELETE /api/containers/{name}          -> hapus
//	POST   /api/containers/{name}/start    -> start
//	POST   /api/containers/{name}/stop     -> stop
//	POST   /api/containers/{name}/restart  -> restart
//
// Daftarkan lewat: mux.HandleFunc("/api/containers/", s.handleContainerByName)
func (s *Server) handleContainerByName(w http.ResponseWriter, r *http.Request) {
	trimmed := strings.TrimPrefix(r.URL.Path, "/api/containers/")
	trimmed = strings.Trim(trimmed, "/")
	if trimmed == "" {
		writeJSON(w, http.StatusBadRequest, SaveResponse{OK: false, Message: "nama container wajib diisi di path"})
		return
	}

	parts := strings.SplitN(trimmed, "/", 2)
	name := parts[0]

	// ada action tambahan, contoh: {name}/start
	if len(parts) == 2 {
		switch parts[1] {
		case "start":
			s.handleStartContainer(w, r, name)
		case "stop":
			s.handleStopContainer(w, r, name)
		case "restart":
			s.handleRestartContainer(w, r, name)
		default:
			writeJSON(w, http.StatusNotFound, SaveResponse{OK: false, Message: "action tidak dikenali"})
		}
		return
	}

	// tidak ada action -> operasi langsung ke resource container
	switch r.Method {
	case http.MethodGet:
		s.handleInspectContainer(w, r, name)
	case http.MethodDelete:
		s.handleDeleteContainer(w, r, name)
	default:
		writeJSON(w, http.StatusMethodNotAllowed, SaveResponse{OK: false, Message: "method tidak didukung"})
	}
}

func (s *Server) handleInspectContainer(w http.ResponseWriter, r *http.Request, name string) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	if err := s.auth.CheckRole(ctx, "container.view"); err != nil {
		writeJSON(w, http.StatusForbidden, SaveResponse{OK: false, Message: "akses ditolak"})
		return
	}

	detail, err := s.container.Get(ctx, name)
	if err != nil {
		fmt.Printf("Failed to inspect container %s: %v", name, err)
		writeJSON(w, http.StatusNotFound, SaveResponse{OK: false, Message: "container tidak ditemukan: " + err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, detail)
}

func (s *Server) handleDeleteContainer(w http.ResponseWriter, r *http.Request, name string) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	if err := s.auth.CheckRole(ctx, "container.delete"); err != nil {
		writeJSON(w, http.StatusForbidden, SaveResponse{OK: false, Message: "akses ditolak"})
		return
	}

	force := r.URL.Query().Get("force") == "true"

	if err := s.container.Delete(ctx, name, force); err != nil {
		fmt.Printf("Failed to delete container %s: %v", name, err)
		writeJSON(w, http.StatusBadGateway, SaveResponse{OK: false, Message: "gagal menghapus container: " + err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, SaveResponse{OK: true, Message: fmt.Sprintf("container %s berhasil dihapus", name)})
}

func (s *Server) handleStartContainer(w http.ResponseWriter, r *http.Request, name string) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, SaveResponse{OK: false, Message: "method tidak didukung"})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	if err := s.auth.CheckRole(ctx, "container.start"); err != nil {
		writeJSON(w, http.StatusForbidden, SaveResponse{OK: false, Message: "akses ditolak"})
		return
	}

	if err := s.container.Start(ctx, name); err != nil {
		fmt.Printf("Failed to start container %s: %v", name, err)
		writeJSON(w, http.StatusBadGateway, SaveResponse{OK: false, Message: "gagal start container: " + err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, SaveResponse{OK: true, Message: fmt.Sprintf("container %s berhasil dijalankan", name)})
}

func (s *Server) handleStopContainer(w http.ResponseWriter, r *http.Request, name string) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, SaveResponse{OK: false, Message: "method tidak didukung"})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	if err := s.auth.CheckRole(ctx, "container.stop"); err != nil {
		writeJSON(w, http.StatusForbidden, SaveResponse{OK: false, Message: "akses ditolak"})
		return
	}

	timeout := 0
	if v := r.URL.Query().Get("timeout"); v != "" {
		if parsed, err := strconv.Atoi(v); err == nil {
			timeout = parsed
		}
	}

	if err := s.container.Stop(ctx, name, timeout); err != nil {
		fmt.Printf("Failed to stop container %s: %v", name, err)
		writeJSON(w, http.StatusBadGateway, SaveResponse{OK: false, Message: "gagal stop container: " + err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, SaveResponse{OK: true, Message: fmt.Sprintf("container %s berhasil dihentikan", name)})
}

func (s *Server) handleRestartContainer(w http.ResponseWriter, r *http.Request, name string) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, SaveResponse{OK: false, Message: "method tidak didukung"})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	if err := s.auth.CheckRole(ctx, "container.restart"); err != nil {
		writeJSON(w, http.StatusForbidden, SaveResponse{OK: false, Message: "akses ditolak"})
		return
	}

	if err := s.container.Restart(ctx, name); err != nil {
		fmt.Printf("Failed to restart container %s: %v", name, err)
		writeJSON(w, http.StatusBadGateway, SaveResponse{OK: false, Message: "gagal restart container: " + err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, SaveResponse{OK: true, Message: fmt.Sprintf("container %s berhasil di-restart", name)})
}
