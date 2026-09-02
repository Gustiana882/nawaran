package main

import (
	"net/http"
	"path/filepath"

	"api/internal/renderer"
)

func main() {
	port := renderer.EnvOr("EDITOR_PORT", "8080")
	apiURL := renderer.EnvOr("API_URL", "http://api:8080")
	timeoutMS := renderer.EnvOr("EDITOR_API_TIMEOUT_MS", "1500")
	staticDir := renderer.ResolveStaticDir()
	cacheDir := renderer.ResolveCacheDir()

	mux := http.NewServeMux()
	mux.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.Dir(staticDir))))
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		id := r.URL.Query().Get("website_id")

		if id == "" {
			id = r.URL.Query().Get("page_id")
		}

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
