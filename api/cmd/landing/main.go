package main

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

var port = envOr("LANDING_PORT", "8081")

// Bisa dioverride lewat env var API_URL.
var apiURL = envOr("API_URL", "http://localhost:8080")

var apiTimeoutMS = envOr("LANDING_API_TIMEOUT_MS", "1500")

var websiteUUID = envOr("LANDING_WEBSITE_ID", "-")

var errWebsiteNotFound = errors.New("website not found")

type websiteVersionResponse struct {
	OK        bool   `json:"ok"`
	WebsiteID string `json:"website_id"`
	UpdatedAt string `json:"updated_at"`
	Message   string `json:"message,omitempty"`
}

type websiteCache struct {
	UpdatedAt string         `json:"updated_at"`
	Payload   map[string]any `json:"payload"`
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func resolveStaticDir() string {
	if dir := os.Getenv("STATIC_DIR"); strings.TrimSpace(dir) != "" {
		return dir
	}

	candidates := []string{"./static", "../../static"}
	for _, dir := range candidates {
		if info, err := os.Stat(dir); err == nil && info.IsDir() {
			return dir
		}
	}

	return "./static"
}

func resolveCacheDir() string {
	if dir := os.Getenv("LANDING_CACHE_DIR"); strings.TrimSpace(dir) != "" {
		return dir
	}

	candidates := []string{"./cache", "../../cache"}
	for _, dir := range candidates {
		if info, err := os.Stat(dir); err == nil && info.IsDir() {
			return dir
		}
	}

	return "./cache"
}

func parseTimeout() time.Duration {
	ms, err := time.ParseDuration(strings.TrimSpace(apiTimeoutMS) + "ms")
	if err != nil || ms <= 0 {
		return 1500 * time.Millisecond
	}
	return ms
}

func newHTTPClient() *http.Client {
	return &http.Client{Timeout: parseTimeout()}
}

func resolveWebsiteID(r *http.Request) string {
	websiteID := strings.TrimSpace(r.URL.Query().Get("website_id"))
	if websiteID != "" {
		return websiteID
	}

	if strings.TrimSpace(websiteUUID) != "" && strings.TrimSpace(websiteUUID) != "-" {
		return strings.TrimSpace(websiteUUID)
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

func cacheFilePath(cacheDir, websiteID string) string {
	return filepath.Join(cacheDir, sanitizeWebsiteID(websiteID)+".json")
}

func readCache(cacheDir, websiteID string) (*websiteCache, error) {
	path := cacheFilePath(cacheDir, websiteID)
	raw, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	var cache websiteCache
	if err := json.Unmarshal(raw, &cache); err != nil {
		return nil, err
	}
	if cache.Payload == nil {
		cache.Payload = map[string]any{}
	}

	return &cache, nil
}

func writeCache(cacheDir, websiteID, updatedAt string, payload map[string]any) error {
	if err := os.MkdirAll(cacheDir, 0o755); err != nil {
		return err
	}

	cache := websiteCache{UpdatedAt: updatedAt, Payload: payload}
	raw, err := json.Marshal(cache)
	if err != nil {
		return err
	}

	return os.WriteFile(cacheFilePath(cacheDir, websiteID), raw, 0o644)
}

func getWebsiteVersion(client *http.Client, websiteID string) (string, error) {
	url := apiURL + "/api/websites/version?website_id=" + websiteID
	resp, err := client.Get(url)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		if resp.StatusCode == http.StatusNotFound {
			return "", errWebsiteNotFound
		}
		return "", fmt.Errorf("status %d", resp.StatusCode)
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

func getWebsiteData(client *http.Client, websiteID string) (map[string]any, error) {
	url := apiURL + "/api/websites/data?website_id=" + websiteID
	resp, err := client.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		if resp.StatusCode == http.StatusNotFound {
			return nil, errWebsiteNotFound
		}
		return nil, fmt.Errorf("status %d", resp.StatusCode)
	}

	var data map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return nil, err
	}

	return data, nil
}

func renderPayload(w http.ResponseWriter, payload map[string]any, editable bool) {
	data := make(map[string]any, len(payload)+1)
	for k, v := range payload {
		data[k] = v
	}
	data["editable"] = editable

	htmlSource, _ := data["html"].(string)
	delete(data, "html")

	if strings.TrimSpace(htmlSource) == "" {
		http.Error(w, "Template HTML kosong di database/cache", http.StatusInternalServerError)
		return
	}

	tmpl, err := template.New("page").Parse(htmlSource)
	if err != nil {
		http.Error(w, "Failed to load template", http.StatusInternalServerError)
		return
	}

	if err := tmpl.Execute(w, data); err != nil {
		http.Error(w, "Failed to render template", http.StatusInternalServerError)
		return
	}
}

func landing(editable bool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		websiteID := resolveWebsiteID(r)
		if websiteID == "" {
			http.Error(w, "website tidak ditemukan", http.StatusNotFound)
			return
		}

		client := newHTTPClient()
		cacheDir := resolveCacheDir()

		cached, cacheErr := readCache(cacheDir, websiteID)

		updatedAt, versionErr := getWebsiteVersion(client, websiteID)
		if versionErr == nil && cached != nil && strings.TrimSpace(cached.UpdatedAt) != "" && cached.UpdatedAt == updatedAt {
			renderPayload(w, cached.Payload, editable)
			return
		}

		fresh, dataErr := getWebsiteData(client, websiteID)
		if dataErr == nil {
			freshUpdatedAt, _ := fresh["updated_at"].(string)
			if strings.TrimSpace(freshUpdatedAt) == "" {
				freshUpdatedAt = updatedAt
				fresh["updated_at"] = freshUpdatedAt
			}
			if strings.TrimSpace(freshUpdatedAt) != "" {
				_ = writeCache(cacheDir, websiteID, freshUpdatedAt, fresh)
			}
			renderPayload(w, fresh, editable)
			return
		}

		if cached != nil {
			renderPayload(w, cached.Payload, editable)
			return
		}

		if errors.Is(versionErr, errWebsiteNotFound) || errors.Is(dataErr, errWebsiteNotFound) {
			http.Error(w, "Website tidak ditemukan", http.StatusNotFound)
			return
		}

		if cacheErr == nil {
			http.Error(w, "Cache lokal kosong", http.StatusServiceUnavailable)
			return
		}

		http.Error(w, "API tidak tersedia dan cache lokal belum ada", http.StatusServiceUnavailable)
	}
}

func main() {
	staticDir := resolveStaticDir()
	cacheDir := resolveCacheDir()
	http.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.Dir(staticDir))))

	http.HandleFunc("/", landing(false))
	http.HandleFunc("/editor", landing(true))

	println("Landing server running at http://localhost:" + port)
	println("Serving static assets from", filepath.Clean(staticDir))
	println("Using cache directory", filepath.Clean(cacheDir))

	http.ListenAndServe(":"+port, nil)
}
