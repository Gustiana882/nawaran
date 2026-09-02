function readEnv(name: string, fallback: string): string {
  const value = import.meta.env[name]
  if (typeof value === "string" && value.trim()) {
    return value.trim().replace(/\/+$/, "")
  }
  return fallback
}

export const appConfig = {
  apiBaseUrl: readEnv("VITE_API_BASE_URL", readEnv("VITE_API_URL", "http://localhost:8080/api")),
  editorBaseUrl: readEnv("VITE_EDITOR_BASE_URL", readEnv("VITE_EDITOR_URL", "https://editor.localhost")),
  keycloakUrl: readEnv("VITE_KEYCLOAK_URL", "http://localhost:8082"),
  keycloakRealm: readEnv("VITE_KEYCLOAK_REALM", "nawaran"),
  keycloakClientId: readEnv("VITE_KEYCLOAK_CLIENT_ID", "dashboard"),
}
