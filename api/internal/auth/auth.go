package auth

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/MicahParks/keyfunc/v3"
	"github.com/golang-jwt/jwt/v5"
)

type Config struct {
	Issuer   string
	JWKSURL  string
	Audience string
}

type Validator struct {
	config Config
	jwks   interface {
		Keyfunc(*jwt.Token) (interface{}, error)
	}
}

func NewFromEnv(ctx context.Context) (*Validator, error) {
	config := Config{
		Issuer:   strings.TrimRight(os.Getenv("KEYCLOAK_ISSUER"), "/"),
		JWKSURL:  strings.TrimSpace(os.Getenv("KEYCLOAK_JWKS_URL")),
		Audience: strings.TrimSpace(os.Getenv("KEYCLOAK_AUDIENCE")),
	}
	if config.Issuer == "" || config.JWKSURL == "" {
		return nil, fmt.Errorf("KEYCLOAK_ISSUER dan KEYCLOAK_JWKS_URL wajib diisi")
	}

	jwks, err := keyfunc.NewDefault([]string{config.JWKSURL})
	if err != nil {
		return nil, fmt.Errorf("initialize keycloak jwks: %w", err)
	}

	return &Validator{config: config, jwks: jwks}, nil
}

// Middleware hanya memvalidasi token (issuer, audience, signature, expiry)
// dan menaruh claims ke context. Tidak ada pengecekan role di sini —
// role dicek per-feature lewat CheckRole/CheckAnyRole/CheckAllRoles
// yang dipanggil langsung di dalam handler.
func (v *Validator) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims, err := v.Validate(r.Context(), r)
		if err != nil {
			log.Printf("Keycloak token rejected: %v", err)
			writeJSONError(w, http.StatusUnauthorized, "unauthorized")
			return
		}
		ctx := context.WithValue(r.Context(), claimsKey{}, claims)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// CheckRole mengecek satu role tertentu berdasarkan claims yang ada di context
// (ditaruh oleh Middleware). Dipanggil langsung di dalam handler, per-feature.
//
//	if err := validator.CheckRole(r.Context(), "admin"); err != nil {
//	    http.Error(w, "forbidden", http.StatusForbidden)
//	    return
//	}
func (v *Validator) CheckRole(ctx context.Context, role string) error {
	return v.CheckAnyRole(ctx, role)
}

// CheckAnyRole mengecek apakah claims punya salah satu dari beberapa role (OR).
func (v *Validator) CheckAnyRole(ctx context.Context, roles ...string) error {
	claims := ClaimsFromContext(ctx)
	if claims == nil {
		return fmt.Errorf("claims not found in context")
	}
	for _, role := range roles {
		if v.hasRole(claims, role) {
			return nil
		}
	}
	return fmt.Errorf("role not found")
}

// CheckAllRoles mengecek apakah claims punya semua role yang disebutkan (AND).
func (v *Validator) CheckAllRoles(ctx context.Context, roles ...string) (bool, error) {
	claims := ClaimsFromContext(ctx)
	if claims == nil {
		return false, fmt.Errorf("claims not found in context")
	}
	for _, role := range roles {
		if !v.hasRole(claims, role) {
			return false, nil
		}
	}
	return true, nil
}

// Validate hanya memvalidasi token JWT (tanpa cek role) dan mengembalikan claims-nya.
func (v *Validator) Validate(_ context.Context, r *http.Request) (jwt.MapClaims, error) {
	authHeader := strings.TrimSpace(r.Header.Get("Authorization"))
	if !strings.HasPrefix(authHeader, "Bearer ") {
		return nil, fmt.Errorf("bearer token required")
	}
	rawToken := strings.TrimSpace(strings.TrimPrefix(authHeader, "Bearer "))
	if rawToken == "" {
		return nil, fmt.Errorf("bearer token required")
	}

	options := []jwt.ParserOption{jwt.WithIssuer(v.config.Issuer)}
	if audiences := splitValues(v.config.Audience); len(audiences) > 0 {
		options = append(options, jwt.WithAudience(audiences...))
	}
	token, err := jwt.Parse(rawToken, v.jwks.Keyfunc, options...)
	if err != nil || !token.Valid {
		if err == nil {
			err = fmt.Errorf("invalid token")
		}
		return nil, err
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return nil, fmt.Errorf("invalid claims")
	}
	return claims, nil
}

func splitValues(value string) []string {
	parts := strings.Split(value, ",")
	values := make([]string, 0, len(parts))
	for _, part := range parts {
		if trimmed := strings.TrimSpace(part); trimmed != "" {
			values = append(values, trimmed)
		}
	}
	return values
}

type claimsKey struct{}

func ClaimsFromContext(ctx context.Context) jwt.MapClaims {
	claims, _ := ctx.Value(claimsKey{}).(jwt.MapClaims)
	return claims
}

// hasRole mengambil role dari claims "resource_access.<audience>.roles",
// sesuai struktur token Keycloak untuk client role (role di-scope ke client,
// bukan realm_access global). Client id yang dicek diambil dari
// KEYCLOAK_AUDIENCE (bisa lebih dari satu, dipisah koma).
func (v *Validator) hasRole(claims jwt.MapClaims, role string) bool {
	resourceAccess, ok := claims["resource_access"].(map[string]any)
	if !ok {
		return false
	}
	for _, aud := range splitValues(v.config.Audience) {
		client, ok := resourceAccess[aud].(map[string]any)
		if !ok {
			continue
		}
		roles, ok := client["roles"].([]any)
		if !ok {
			continue
		}
		for _, value := range roles {
			if value == role {
				return true
			}
		}
	}
	return false
}

func writeJSONError(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]string{"message": message})
}
