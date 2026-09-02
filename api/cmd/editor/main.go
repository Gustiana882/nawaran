package main

import (
	"net/http"
	"net/http/httputil"
	"net/url"
	"path/filepath"

	"api/internal/renderer"
)

func main() {
	port := renderer.EnvOr("EDITOR_PORT", "8080")
	apiURL := renderer.EnvOr("API_URL", "http://api:8080")
	timeoutMS := renderer.EnvOr("EDITOR_API_TIMEOUT_MS", "1500")
	staticDir := renderer.ResolveStaticDir()
	cacheDir := renderer.ResolveCacheDir()

	// Backend API URL
	target, err := url.Parse(apiURL)
	if err != nil {
		panic(err)
	}

	// Reverse proxy ke backend
	apiProxy := httputil.NewSingleHostReverseProxy(target)

	mux := http.NewServeMux()
	mux.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.Dir(staticDir))))

	mux.HandleFunc("/api/", func(w http.ResponseWriter, r *http.Request) {
		apiProxy.ServeHTTP(w, r)
	})

	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		id := r.URL.Query().Get("website_id")

		handler := renderer.NewPageHandler(renderer.HandlerConfig{
			APIURL:    apiURL,
			CacheDir:  cacheDir,
			DefaultID: id,
			Timeout:   renderer.ParseTimeout(timeoutMS),
			Editable:  true,
		})

		handler(w, r)
	})

	println("Editor server running at http://localhost:" + port)
	println("Serving static assets from", filepath.Clean(staticDir))
	println("Using cache directory", filepath.Clean(cacheDir))

	if err := http.ListenAndServe(":"+port, mux); err != nil {
		panic(err)
	}
}
