package server

import (
	"errors"
	"io"
	"net/http"
	"os"
	"path"

	"api/internal/database"
	"api/internal/storage"
)

func (s *Server) handleUpload(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodPost:
		s.handleUploadCreate(w, r)
	case http.MethodGet:
		s.handleUploadList(w, r)
	default:
		w.Header().Set("Allow", "GET, POST")
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func (s *Server) handleUploadByName(w http.ResponseWriter, r *http.Request) {
	name := path.Base(r.URL.Path)
	if name == "upload" || name == "." || name == ".." {
		http.Error(w, "file name is required", http.StatusBadRequest)
		return
	}
	switch r.Method {
	case http.MethodDelete:
		s.handleUploadDelete(w, r, name)
	default:
		w.Header().Set("Allow", "DELETE")
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func (s *Server) handlePublicImage(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.Header().Set("Allow", "GET")
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	name := path.Base(r.URL.Path)
	if name == "images" || name == "." || name == ".." {
		http.Error(w, "file name is required", http.StatusBadRequest)
		return
	}
	s.handleUploadRead(w, r, name)
}

func (s *Server) handleUploadCreate(w http.ResponseWriter, r *http.Request) {
	userID, ok := s.uploadUserID(w, r)
	if !ok {
		return
	}
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		http.Error(w, "invalid multipart form", http.StatusBadRequest)
		return
	}
	file, header, err := r.FormFile("file")
	if err != nil {
		http.Error(w, `field "file" is required`, http.StatusBadRequest)
		return
	}
	defer file.Close()

	upload, err := s.files.Upload(r.Context(), header.Filename, file)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if _, err := s.db.CreateMediaFile(r.Context(), database.CreateMediaFileInput{
		UserID: userID, Name: upload.Name, Size: upload.Size, ContentType: upload.ContentType,
	}); err != nil {
		_ = s.files.Delete(r.Context(), upload.Name)
		http.Error(w, "failed to register upload", http.StatusInternalServerError)
		return
	}
	upload.URL = "/api/images/" + upload.Name
	writeJSON(w, http.StatusCreated, upload)
}

func (s *Server) handleUploadList(w http.ResponseWriter, r *http.Request) {
	userID, ok := s.uploadUserID(w, r)
	if !ok {
		return
	}
	files, err := s.db.ListMediaFiles(r.Context(), userID)
	if err != nil {
		http.Error(w, "failed to list uploads", http.StatusInternalServerError)
		return
	}
	for i := range files {
		files[i].URL = "/api/images/" + files[i].Name
	}
	writeJSON(w, http.StatusOK, files)
}

func (s *Server) handleUploadRead(w http.ResponseWriter, r *http.Request, name string) {
	file, metadata, err := s.files.Open(r.Context(), name)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			http.Error(w, "upload not found", http.StatusNotFound)
			return
		}
		http.Error(w, "failed to open upload", http.StatusInternalServerError)
		return
	}
	defer file.Close()
	w.Header().Set("Content-Type", metadata.ContentType)
	_, _ = io.Copy(w, file)
}

func (s *Server) handleUploadDelete(w http.ResponseWriter, r *http.Request, name string) {
	userID, ok := s.uploadUserID(w, r)
	if !ok {
		return
	}
	if err := s.db.DeleteMediaFile(r.Context(), userID, name); err != nil {
		if database.IsMediaFileNotFound(err) {
			http.Error(w, "upload not found", http.StatusNotFound)
			return
		}
		http.Error(w, "failed to delete upload", http.StatusInternalServerError)
		return
	}
	if err := s.files.Delete(r.Context(), name); err != nil && !errors.Is(err, os.ErrNotExist) {
		http.Error(w, "failed to delete upload", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) uploadUserID(w http.ResponseWriter, r *http.Request) (string, bool) {
	if s.auth == nil {
		http.Error(w, "authentication is not configured", http.StatusServiceUnavailable)
		return "", false
	}
	userID, err := s.auth.GetSub(r.Context())
	if err != nil || userID == "" {
		http.Error(w, "user not authenticated", http.StatusUnauthorized)
		return "", false
	}
	return userID, true
}

var _ storage.FileStorage = (*storage.LocalStorage)(nil)
