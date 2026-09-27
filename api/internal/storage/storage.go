package storage

import (
	"context"
	"fmt"
	"io"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/google/uuid"
)

const maxImageSize = 10 << 20

type File struct {
	Name        string    `json:"name"`
	URL         string    `json:"url"`
	Size        int64     `json:"size"`
	ContentType string    `json:"content_type"`
	CreatedAt   time.Time `json:"created_at"`
}

type FileStorage interface {
	Upload(ctx context.Context, name string, content io.Reader) (File, error)
	List(ctx context.Context) ([]File, error)
	Open(ctx context.Context, name string) (io.ReadCloser, File, error)
	Delete(ctx context.Context, name string) error
}

type LocalStorage struct {
	root string
}

func NewLocal(root string) (*LocalStorage, error) {
	if root == "" {
		root = "./app/uploads"
	}
	if err := os.MkdirAll(root, 0o755); err != nil {
		return nil, fmt.Errorf("create local storage directory: %w", err)
	}
	return &LocalStorage{root: root}, nil
}

func (s *LocalStorage) Upload(ctx context.Context, name string, content io.Reader) (File, error) {
	select {
	case <-ctx.Done():
		return File{}, ctx.Err()
	default:
	}

	data, err := io.ReadAll(io.LimitReader(content, maxImageSize+1))
	if err != nil {
		return File{}, fmt.Errorf("read upload: %w", err)
	}
	if len(data) == 0 || len(data) > maxImageSize {
		return File{}, fmt.Errorf("image must be between 1 byte and %d MB", maxImageSize/(1<<20))
	}

	contentType := http.DetectContentType(data)
	if !strings.HasPrefix(contentType, "image/") {
		return File{}, fmt.Errorf("only image files are allowed")
	}
	extension := extensionFor(name, contentType)
	fileName := uuid.NewString() + extension
	if err := os.WriteFile(filepath.Join(s.root, fileName), data, 0o644); err != nil {
		return File{}, fmt.Errorf("save upload: %w", err)
	}

	createdAt := time.Now().UTC()
	return File{Name: fileName, Size: int64(len(data)), ContentType: contentType, CreatedAt: createdAt}, nil
}

func (s *LocalStorage) List(_ context.Context) ([]File, error) {
	entries, err := os.ReadDir(s.root)
	if err != nil {
		return nil, fmt.Errorf("list uploads: %w", err)
	}
	files := make([]File, 0, len(entries))
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		file, err := s.fileInfo(entry.Name())
		if err != nil {
			return nil, err
		}
		files = append(files, file)
	}
	sort.Slice(files, func(i, j int) bool { return files[i].CreatedAt.After(files[j].CreatedAt) })
	return files, nil
}

func (s *LocalStorage) Open(_ context.Context, name string) (io.ReadCloser, File, error) {
	path, err := s.safePath(name)
	if err != nil {
		return nil, File{}, err
	}
	file, err := s.fileInfo(name)
	if err != nil {
		return nil, File{}, err
	}
	handle, err := os.Open(path)
	if err != nil {
		return nil, File{}, fmt.Errorf("open upload: %w", err)
	}
	return handle, file, nil
}

func (s *LocalStorage) Delete(_ context.Context, name string) error {
	path, err := s.safePath(name)
	if err != nil {
		return err
	}
	if err := os.Remove(path); err != nil {
		return fmt.Errorf("delete upload: %w", err)
	}
	return nil
}

func (s *LocalStorage) fileInfo(name string) (File, error) {
	path, err := s.safePath(name)
	if err != nil {
		return File{}, err
	}
	info, err := os.Stat(path)
	if err != nil {
		return File{}, fmt.Errorf("stat upload: %w", err)
	}
	contentType := mime.TypeByExtension(filepath.Ext(name))
	if contentType == "" {
		contentType = "application/octet-stream"
	}
	return File{Name: name, Size: info.Size(), ContentType: contentType, CreatedAt: info.ModTime().UTC()}, nil
}

func (s *LocalStorage) safePath(name string) (string, error) {
	if name == "" || filepath.Base(name) != name || name == "." || name == ".." {
		return "", fmt.Errorf("invalid file name")
	}
	return filepath.Join(s.root, name), nil
}

func extensionFor(name, contentType string) string {
	extension := strings.ToLower(filepath.Ext(name))
	if extension != "" {
		return extension
	}
	extensions, _ := mime.ExtensionsByType(contentType)
	if len(extensions) > 0 {
		return extensions[0]
	}
	return ".img"
}
