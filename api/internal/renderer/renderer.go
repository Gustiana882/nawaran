// Package renderer provides shared logic for the landing and editor servers:
// HTTP client, cache read/write, API calls, and HTML template rendering.
package renderer

import (
	"encoding/json"
	"errors"
	"fmt"
	"html/template"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"
)

// ErrWebsiteNotFound is returned when the API responds with 404.
var ErrWebsiteNotFound = errors.New("website not found")

// ─── Environment helpers ──────────────────────────────────────────────────────

func EnvOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func ResolveStaticDir() string {
	if dir := os.Getenv("STATIC_DIR"); strings.TrimSpace(dir) != "" {
		return dir
	}
	for _, dir := range []string{"./static", "../../static"} {
		if info, err := os.Stat(dir); err == nil && info.IsDir() {
			return dir
		}
	}
	return "./static"
}

func ResolveCacheDir() string {
	if dir := os.Getenv("LANDING_CACHE_DIR"); strings.TrimSpace(dir) != "" {
		return dir
	}
	for _, dir := range []string{"./cache", "../../cache"} {
		if info, err := os.Stat(dir); err == nil && info.IsDir() {
			return dir
		}
	}
	return "./cache"
}

func ParseTimeout(apiTimeoutMS string) time.Duration {
	ms, err := time.ParseDuration(strings.TrimSpace(apiTimeoutMS) + "ms")
	if err != nil || ms <= 0 {
		return 1500 * time.Millisecond
	}
	return ms
}

func NewHTTPClient(timeout time.Duration) *http.Client {
	return &http.Client{Timeout: timeout}
}

// ─── Website ID resolution ────────────────────────────────────────────────────

func ResolveWebsiteID(r *http.Request, defaultID string) string {
	if id := strings.TrimSpace(r.URL.Query().Get("website_id")); id != "" {
		return id
	}
	if id := strings.TrimSpace(defaultID); id != "" && id != "-" {
		return id
	}
	return ""
}

func sanitizeWebsiteID(websiteID string) string {
	re := regexp.MustCompile(`[^a-zA-Z0-9_-]+`)
	clean := re.ReplaceAllString(websiteID, "_")
	if clean == "" {
		return "default"
	}
	return clean
}

// ─── Cache ────────────────────────────────────────────────────────────────────

type WebsiteCache struct {
	UpdatedAt string         `json:"updated_at"`
	Payload   map[string]any `json:"payload"`
}

func cacheFilePath(cacheDir, websiteID string) string {
	return filepath.Join(cacheDir, sanitizeWebsiteID(websiteID)+".json")
}

func ReadCache(cacheDir, websiteID string) (*WebsiteCache, error) {
	raw, err := os.ReadFile(cacheFilePath(cacheDir, websiteID))
	if err != nil {
		return nil, err
	}
	var c WebsiteCache
	if err := json.Unmarshal(raw, &c); err != nil {
		return nil, err
	}
	if c.Payload == nil {
		c.Payload = map[string]any{}
	}
	return &c, nil
}

func WriteCache(cacheDir, websiteID, updatedAt string, payload map[string]any) error {
	if err := os.MkdirAll(cacheDir, 0o755); err != nil {
		return err
	}
	raw, err := json.Marshal(WebsiteCache{UpdatedAt: updatedAt, Payload: payload})
	if err != nil {
		return err
	}
	return os.WriteFile(cacheFilePath(cacheDir, websiteID), raw, 0o644)
}

// ─── API calls ────────────────────────────────────────────────────────────────

type websiteVersionResponse struct {
	OK        bool   `json:"ok"`
	UpdatedAt string `json:"updated_at"`
}

func GetWebsiteVersion(client *http.Client, apiURL, websiteID string) (string, error) {
	resp, err := client.Get(apiURL + "/api/websites/version?website_id=" + websiteID)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return "", ErrWebsiteNotFound
	}
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("version API status %d", resp.StatusCode)
	}

	var body websiteVersionResponse
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		return "", err
	}
	if strings.TrimSpace(body.UpdatedAt) == "" {
		return "", errors.New("updated_at kosong")
	}
	return body.UpdatedAt, nil
}

func GetWebsiteData(client *http.Client, apiURL, websiteID string) (map[string]any, error) {
	resp, err := client.Get(apiURL + "/api/websites/data?website_id=" + websiteID)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return nil, ErrWebsiteNotFound
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("data API status %d", resp.StatusCode)
	}

	var data map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return nil, err
	}
	return data, nil
}

// ─── Rendering ────────────────────────────────────────────────────────────────

// RenderPayload renders the HTML template stored in payload["html"] using the
// remaining fields as template data. editable injects a boolean so templates
// can conditionally show editor controls.
func RenderPayload(w http.ResponseWriter, payload map[string]any, scripts, styles []string) {
	data := make(map[string]any, len(payload)+1)
	for k, v := range payload {
		data[k] = v
	}

	if len(scripts) > 0 {
		data["scripts"] = scripts
	}
	if len(styles) > 0 {
		data["styles"] = styles
	}

	htmlSource, _ := data["html"].(string)
	delete(data, "html")

	if strings.TrimSpace(htmlSource) == "" {
		http.Error(w, "Template HTML kosong di database/cache", http.StatusInternalServerError)
		return
	}

	tmpl, err := template.New("page").Parse(htmlSource)
	if err != nil {
		http.Error(w, "Failed to parse template: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	if err := tmpl.Execute(w, data); err != nil {
		http.Error(w, "Failed to render template: "+err.Error(), http.StatusInternalServerError)
	}
}

// ─── Handler factory ──────────────────────────────────────────────────────────

// HandlerConfig holds the dependencies needed to build a page handler.
type HandlerConfig struct {
	APIURL    string
	CacheDir  string
	DefaultID string
	Timeout   time.Duration
	Scripts   []string
	Styles    []string
}

// NewPageHandler returns an http.HandlerFunc that fetches, caches, and renders
// a website. Set Editable=true for the editor variant.
func NewPageHandler(cfg HandlerConfig) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		websiteID := ResolveWebsiteID(r, cfg.DefaultID)
		if websiteID == "" {
			http.Error(w, "website tidak ditemukan", http.StatusNotFound)
			return
		}

		client := NewHTTPClient(cfg.Timeout)

		cached, _ := ReadCache(cfg.CacheDir, websiteID)

		updatedAt, versionErr := GetWebsiteVersion(client, cfg.APIURL, websiteID)
		if versionErr == nil && cached != nil && cached.UpdatedAt == updatedAt {
			RenderPayload(w, cached.Payload, cfg.Scripts, cfg.Styles)
			return
		}

		fresh, dataErr := GetWebsiteData(client, cfg.APIURL, websiteID)
		if dataErr == nil {
			freshUpdatedAt, _ := fresh["updated_at"].(string)
			if strings.TrimSpace(freshUpdatedAt) == "" {
				freshUpdatedAt = updatedAt
				fresh["updated_at"] = freshUpdatedAt
			}
			if freshUpdatedAt != "" {
				_ = WriteCache(cfg.CacheDir, websiteID, freshUpdatedAt, fresh)
			}
			RenderPayload(w, fresh, cfg.Scripts, cfg.Styles)
			return
		}

		if cached != nil {
			RenderPayload(w, cached.Payload, cfg.Scripts, cfg.Styles)
			return
		}

		if errors.Is(versionErr, ErrWebsiteNotFound) || errors.Is(dataErr, ErrWebsiteNotFound) {
			http.Error(w, "Website tidak ditemukan", http.StatusNotFound)
			return
		}

		http.Error(w, "API tidak tersedia dan cache lokal belum ada", http.StatusServiceUnavailable)
	}
}
