package proxy

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
)

type Service struct {
	BaseURL    string
	ServerName string
	HTTPClient *http.Client
}

func New(baseURL string, serverName string) *Service {
	return &Service{
		BaseURL:    strings.TrimRight(baseURL, "/"),
		ServerName: serverName,
		HTTPClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

// Route represents a Caddy HTTP route.
type Route struct {
	ID       uuid.UUID `json:"@id,omitempty"`
	Match    []Match   `json:"match,omitempty"`
	Handle   []Handle  `json:"handle,omitempty"`
	Terminal bool      `json:"terminal,omitempty"`
}

type Match struct {
	Host []string `json:"host,omitempty"`
}

type Handle struct {
	Handler   string     `json:"handler"`
	Upstreams []Upstream `json:"upstreams,omitempty"`
}

type Upstream struct {
	Dial string `json:"dial"`
}

// ListProxies lists all reverse proxy routes registered on the server.
//
// GET /config/apps/http/servers/{server}/routes
func (s *Service) ListProxies(ctx context.Context) ([]Route, error) {
	path := fmt.Sprintf("/config/apps/http/servers/%s/routes", s.ServerName)

	var routes []Route

	if err := s.requestJSON(ctx, http.MethodGet, path, nil, &routes); err != nil {
		return nil, fmt.Errorf("list caddy routes: %w", err)
	}

	return routes, nil
}

// CreateProxy creates a new reverse proxy route in Caddy.
//
// POST /config/apps/http/servers/{server}/routes
func (s *Service) CreateProxy(ctx context.Context, domain string, upstream string) (*uuid.UUID, error) {
	var uuid uuid.UUID = uuid.New()
	route := Route{
		ID: uuid,
		Match: []Match{
			{
				Host: []string{domain},
			},
		},
		Handle: []Handle{
			{
				Handler: "reverse_proxy",
				Upstreams: []Upstream{
					{
						Dial: upstream,
					},
				},
			},
		},
		Terminal: true,
	}

	body, err := json.Marshal(route)
	if err != nil {
		return nil, fmt.Errorf("marshal caddy route: %w", err)
	}

	path := fmt.Sprintf("/config/apps/http/servers/%s/routes", s.ServerName)

	if err := s.request(ctx, http.MethodPost, path, body); err != nil {
		return nil, err
	}

	return &uuid, nil
}

// GetProxy gets an existing proxy by its Caddy ID.
//
// GET /id/{id}
func (s *Service) GetProxy(ctx context.Context, id string) (map[string]any, error) {
	path := fmt.Sprintf("/id/%s", id)

	var result map[string]any

	if err := s.requestJSON(ctx, http.MethodGet, path, nil, &result); err != nil {
		return nil, err
	}

	return result, nil
}

// UpdateProxy updates only the reverse_proxy handle.
//
// PATCH /id/{id}/handle
func (s *Service) UpdateProxy(ctx context.Context, uuid uuid.UUID, domain string, upstream string) (*uuid.UUID, error) {
	route := Route{
		ID: uuid,
		Match: []Match{
			{
				Host: []string{domain},
			},
		},
		Handle: []Handle{
			{
				Handler: "reverse_proxy",
				Upstreams: []Upstream{
					{
						Dial: upstream,
					},
				},
			},
		},
		Terminal: true,
	}

	body, err := json.Marshal(route)
	if err != nil {
		return nil, fmt.Errorf("marshal caddy route: %w", err)
	}

	path := fmt.Sprintf("/id/%s/handle", uuid.String())

	if err := s.request(ctx, http.MethodPatch, path, body); err != nil {
		return nil, err
	}

	return &uuid, nil
}

// DeleteProxy deletes a proxy route.
//
// DELETE /id/{id}
func (s *Service) DeleteProxy(ctx context.Context, id string) error {
	path := fmt.Sprintf("/id/%s", id)

	return s.request(ctx, http.MethodDelete, path, nil)
}

// request executes a request against Caddy Admin API.
func (s *Service) request(ctx context.Context, method string, path string, body []byte) error {
	url := s.BaseURL + path

	var reader *bytes.Reader

	if body != nil {
		reader = bytes.NewReader(body)
	} else {
		reader = bytes.NewReader(nil)
	}

	req, err := http.NewRequestWithContext(ctx, method, url, reader)
	if err != nil {
		return fmt.Errorf("create caddy request: %w", err)
	}

	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	resp, err := s.HTTPClient.Do(req)
	if err != nil {
		return fmt.Errorf("request caddy: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("caddy returned status %d", resp.StatusCode)
	}

	return nil
}

// requestJSON executes a Caddy request and decodes JSON response.
func (s *Service) requestJSON(ctx context.Context, method string, path string, body []byte, result any) error {
	url := s.BaseURL + path

	var reader *bytes.Reader

	if body != nil {
		reader = bytes.NewReader(body)
	} else {
		reader = bytes.NewReader(nil)
	}

	req, err := http.NewRequestWithContext(ctx, method, url, reader)
	if err != nil {
		return fmt.Errorf("create caddy request: %w", err)
	}

	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	resp, err := s.HTTPClient.Do(req)
	if err != nil {
		return fmt.Errorf("request caddy: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("caddy returned status %d", resp.StatusCode)
	}

	if result == nil {
		return nil
	}

	if err := json.NewDecoder(resp.Body).Decode(result); err != nil {
		return fmt.Errorf("decode caddy response: %w", err)
	}

	return nil
}
