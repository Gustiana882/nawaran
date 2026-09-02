package main

import (
	"net/http"
	"path/filepath"

	"api/internal/renderer"
)

func main() {
	port := renderer.EnvOr("LANDING_PORT", "8080")
	apiURL := renderer.EnvOr("API_URL", "http://api:8080")
	timeoutMS := renderer.EnvOr("LANDING_API_TIMEOUT_MS", "1500")
	defaultID := renderer.EnvOr("LANDING_WEBSITE_ID", "-")
	staticDir := renderer.ResolveStaticDir()
	cacheDir := renderer.ResolveCacheDir()

	mux := http.NewServeMux()
	mux.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.Dir(staticDir))))
	mux.HandleFunc("/", renderer.NewPageHandler(renderer.HandlerConfig{
		APIURL:    apiURL,
		CacheDir:  cacheDir,
		DefaultID: defaultID,
		Timeout:   renderer.ParseTimeout(timeoutMS),
		Scripts:   []string{},
		Styles:    []string{},
	}))

	println("Landing server running at http://localhost:" + port)
	println("Serving static assets from", filepath.Clean(staticDir))
	println("Using cache directory", filepath.Clean(cacheDir))

	if err := http.ListenAndServe(":"+port, mux); err != nil {
		panic(err)
	}
}
