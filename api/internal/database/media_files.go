package database

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"
)

type MediaFile struct {
	Name        string    `json:"name"`
	Size        int64     `json:"size"`
	ContentType string    `json:"content_type"`
	URL         string    `json:"url"`
	CreatedAt   time.Time `json:"created_at"`
}

type CreateMediaFileInput struct {
	UserID      string
	Name        string
	Size        int64
	ContentType string
}

func ensureMediaFilesTable(db *sql.DB) error {
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS media_files (
			id BIGSERIAL PRIMARY KEY,
			user_id TEXT NOT NULL,
			name TEXT NOT NULL,
			size BIGINT NOT NULL,
			content_type TEXT NOT NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
			CONSTRAINT media_files_user_name_unique UNIQUE (user_id, name)
		);
		CREATE INDEX IF NOT EXISTS media_files_user_id_idx ON media_files (user_id);
	`)
	return err
}

func (s *service) ListMediaFiles(ctx context.Context, userID string) ([]MediaFile, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT name, size, content_type, created_at
		FROM media_files WHERE user_id = $1 ORDER BY created_at DESC
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("list media files: %w", err)
	}
	defer rows.Close()
	files := make([]MediaFile, 0)
	for rows.Next() {
		var file MediaFile
		if err := rows.Scan(&file.Name, &file.Size, &file.ContentType, &file.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan media file: %w", err)
		}
		files = append(files, file)
	}
	return files, rows.Err()
}

func (s *service) CreateMediaFile(ctx context.Context, input CreateMediaFileInput) (*MediaFile, error) {
	var file MediaFile
	err := s.db.QueryRowContext(ctx, `
		INSERT INTO media_files (user_id, name, size, content_type)
		VALUES ($1, $2, $3, $4)
		RETURNING name, size, content_type, created_at
	`, input.UserID, input.Name, input.Size, input.ContentType).Scan(
		&file.Name, &file.Size, &file.ContentType, &file.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("create media file: %w", err)
	}
	return &file, nil
}

func (s *service) DeleteMediaFile(ctx context.Context, userID, name string) error {
	result, err := s.db.ExecContext(ctx, `DELETE FROM media_files WHERE user_id = $1 AND name = $2`, userID, name)
	if err != nil {
		return fmt.Errorf("delete media file: %w", err)
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("delete media file rows affected: %w", err)
	}
	if affected == 0 {
		return fmt.Errorf("media file %s not found: %w", name, sql.ErrNoRows)
	}
	return nil
}

func IsMediaFileNotFound(err error) bool {
	return errors.Is(err, sql.ErrNoRows)
}
