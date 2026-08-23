package server

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"time"

	_ "github.com/joho/godotenv/autoload"

	"api/internal/auth"
	"api/internal/database"
)

type Server struct {
	port int

	db   database.Service
	auth *auth.Validator
}

func NewServer() *http.Server {
	port, _ := strconv.Atoi(os.Getenv("PORT"))
	authValidator, err := auth.NewFromEnv(context.Background())
	if err != nil {
		log.Printf("Keycloak auth disabled: %v", err)
	}

	NewServer := &Server{
		port: port,

		db:   database.New(),
		auth: authValidator,
	}

	// Declare Server config
	server := &http.Server{
		Addr:         fmt.Sprintf(":%d", NewServer.port),
		Handler:      NewServer.RegisterRoutes(),
		IdleTimeout:  time.Minute,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 30 * time.Second,
	}

	return server
}

func (s *Server) protected(next http.Handler) http.Handler {
	if s.auth == nil {
		return http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
			http.Error(w, "authentication is not configured", http.StatusServiceUnavailable)
		})
	}
	return s.auth.Middleware(next)
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}
