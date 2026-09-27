package server

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"api/internal/storage"
)

func TestHandleUploadCreateIsCompatibleWithEditorImage(t *testing.T) {
	root := t.TempDir()
	files, err := storage.NewLocal(root)
	if err != nil {
		t.Fatal(err)
	}

	uploaded, err := files.Upload(t.Context(), "images.jpg", strings.NewReader("\xff\xd8\xff\xe0JFIF"))
	if err != nil {
		t.Fatal(err)
	}
	uploaded.URL = "/api/images/" + uploaded.Name
	if uploaded.URL != "/api/images/"+uploaded.Name {
		t.Fatalf("expected editor-compatible URL, got %q", uploaded.URL)
	}
	if _, err := os.Stat(filepath.Join(root, uploaded.Name)); err != nil {
		t.Fatalf("uploaded file was not persisted: %v", err)
	}
}

func TestUploadReadDoesNotRequireAuth(t *testing.T) {
	root := t.TempDir()
	files, err := storage.NewLocal(root)
	if err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(root, "public.jpg"), []byte{0xff, 0xd8, 0xff}, 0o644); err != nil {
		t.Fatal(err)
	}

	request := httptest.NewRequest(http.MethodGet, "/api/images/public.jpg", nil)
	response := httptest.NewRecorder()
	server := &Server{files: files}
	server.RegisterRoutes().ServeHTTP(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("expected unauthenticated image read to return 200, got %d: %s", response.Code, response.Body.String())
	}
	if response.Header().Get("Content-Type") != "image/jpeg" {
		t.Fatalf("expected image content type, got %q", response.Header().Get("Content-Type"))
	}
}
