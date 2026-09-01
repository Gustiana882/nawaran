package container

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"
)

type Service struct {
	BaseURL    string
	Network    string
	HTTPClient *http.Client
}

func New(baseURL string) *Service {
	return &Service{
		BaseURL: strings.TrimRight(baseURL, "/"),
		Network: strings.TrimSpace(os.Getenv("PODMAN_NETWORK")),
		HTTPClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// =========================
// Request / Response
// =========================

type CreateRequest struct {
	Name          string            `json:"name,omitempty"`
	Image         string            `json:"image"`
	Command       []string          `json:"command,omitempty"`
	Entrypoint    []string          `json:"entrypoint,omitempty"`
	Env           map[string]string `json:"env,omitempty"`
	WorkingDir    string            `json:"work_dir,omitempty"`
	RestartPolicy string            `json:"restart_policy,omitempty"`
	Networks      map[string]any    `json:"networks,omitempty"`

	PortMappings []PortMapping `json:"portmappings,omitempty"`
}

type PortMapping struct {
	ContainerPort uint16 `json:"container_port"`
	HostPort      uint16 `json:"host_port"`
	Protocol      string `json:"protocol,omitempty"`
	HostIP        string `json:"host_ip,omitempty"`
}

type CreateResponse struct {
	ID       string   `json:"Id"`
	Warnings []string `json:"Warnings,omitempty"`
}

// =========================
// Create
// =========================

func (s *Service) Create(ctx context.Context, input CreateRequest) (*CreateResponse, error) {
	if len(input.Networks) == 0 && s.Network != "" {
		input.Networks = map[string]any{s.Network: map[string]any{}}
	}

	body, err := json.Marshal(input)
	if err != nil {
		return nil, fmt.Errorf("marshal create container: %w", err)
	}

	var response CreateResponse

	path := "/libpod/containers/create"
	if err := s.requestJSON(ctx, http.MethodPost, path, body, &response); err != nil {
		return nil, fmt.Errorf("create container: %w", err)
	}

	return &response, nil
}

// =========================
// List
// =========================

func (s *Service) List(ctx context.Context) ([]map[string]any, error) {
	var response []map[string]any

	path := "/libpod/containers/json"
	if err := s.requestJSON(ctx, http.MethodGet, path, nil, &response); err != nil {
		return nil, fmt.Errorf("list containers: %w", err)
	}

	return response, nil
}

// =========================
// Inspect / Get
// =========================

func (s *Service) Get(ctx context.Context, name string) (map[string]any, error) {
	path := fmt.Sprintf("/libpod/containers/%s/json", url.PathEscape(name))

	var response map[string]any
	if err := s.requestJSON(ctx, http.MethodGet, path, nil, &response); err != nil {
		return nil, fmt.Errorf("inspect container: %w", err)
	}

	return response, nil
}

// =========================
// Start
// =========================

func (s *Service) Start(ctx context.Context, name string) error {
	path := fmt.Sprintf("/libpod/containers/%s/start", url.PathEscape(name))
	if err := s.request(ctx, http.MethodPost, path, nil); err != nil {
		return fmt.Errorf("start container: %w", err)
	}

	return nil
}

// =========================
// Stop
// =========================

func (s *Service) Stop(ctx context.Context, name string, timeout int) error {
	path := fmt.Sprintf("/libpod/containers/%s/stop", url.PathEscape(name))

	if timeout > 0 {
		path += fmt.Sprintf("?timeout=%d", timeout)
	}

	if err := s.request(ctx, http.MethodPost, path, nil); err != nil {
		return fmt.Errorf("stop container: %w", err)
	}

	return nil
}

// =========================
// Restart
// =========================

func (s *Service) Restart(ctx context.Context, name string) error {
	path := fmt.Sprintf("/libpod/containers/%s/restart", url.PathEscape(name))

	if err := s.request(ctx, http.MethodPost, path, nil); err != nil {
		return fmt.Errorf("restart container: %w", err)
	}

	return nil
}

// =========================
// Delete
// =========================

func (s *Service) Delete(ctx context.Context, name string, force bool) error {
	path := fmt.Sprintf("/libpod/containers/%s", url.PathEscape(name))

	if force {
		path += "?force=true"
	}

	if err := s.request(ctx, http.MethodDelete, path, nil); err != nil {
		return fmt.Errorf("delete container: %w", err)
	}

	return nil
}

// =========================
// HTTP helpers
// =========================

func (s *Service) request(ctx context.Context, method string, path string, body []byte) error {
	_, err := s.doRequest(ctx, method, path, body, nil)
	return err
}

func (s *Service) requestJSON(ctx context.Context, method string, path string, body []byte, result any) error {
	_, err := s.doRequest(ctx, method, path, body, result)

	return err
}

func (s *Service) doRequest(ctx context.Context, method string, path string, body []byte, result any) (int, error) {
	var reader io.Reader

	if body != nil {
		reader = bytes.NewReader(body)
	}

	req, err := http.NewRequestWithContext(ctx, method, s.BaseURL+path, reader)
	if err != nil {
		return 0, fmt.Errorf("create podman request: %w", err)
	}

	req.Header.Set("Accept", "application/json")

	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	resp, err := s.HTTPClient.Do(req)
	if err != nil {
		return 0, fmt.Errorf("request podman: %w", err)
	}

	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotModified {
		return resp.StatusCode, nil
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		responseBody, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))

		return resp.StatusCode, fmt.Errorf(
			"podman returned status %d: %s",
			resp.StatusCode,
			strings.TrimSpace(string(responseBody)),
		)
	}

	if result == nil || resp.StatusCode == http.StatusNoContent {
		return resp.StatusCode, nil
	}

	if err := json.NewDecoder(resp.Body).Decode(result); err != nil {
		return resp.StatusCode, fmt.Errorf("decode podman response: %w", err)
	}

	return resp.StatusCode, nil
}
