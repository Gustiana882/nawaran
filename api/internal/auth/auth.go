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
	Issuer       string
	JWKSURL      string
	Audience     string
	RequiredRole string
}

type Validator struct {
	config Config
	jwks   interface {
		Keyfunc(*jwt.Token) (interface{}, error)
	}
}

func NewFromEnv(ctx context.Context) (*Validator, error) {
	config := Config{
		Issuer:       strings.TrimRight(os.Getenv("KEYCLOAK_ISSUER"), "/"),
		JWKSURL:      strings.TrimSpace(os.Getenv("KEYCLOAK_JWKS_URL")),
		Audience:     strings.TrimSpace(os.Getenv("KEYCLOAK_AUDIENCE")),
		RequiredRole: strings.TrimSpace(os.Getenv("KEYCLOAK_REQUIRED_ROLE")),
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

func (v *Validator) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims, err := v.Validate(r.Context(), r)
		if err != nil {
			log.Printf("Keycloak token rejected: %v", err)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{"message": "unauthorized"})
			return
		}
		ctx := context.WithValue(r.Context(), claimsKey{}, claims)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

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
	if v.config.RequiredRole != "" && !hasRole(claims, v.config.RequiredRole) {
		return nil, fmt.Errorf("required role missing")
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

func hasRole(claims jwt.MapClaims, role string) bool {
	if realmAccess, ok := claims["realm_access"].(map[string]any); ok {
		if roles, ok := realmAccess["roles"].([]any); ok {
			for _, value := range roles {
				if value == role {
					return true
				}
			}
		}
	}
	return false
}
