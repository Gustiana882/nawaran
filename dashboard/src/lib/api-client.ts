import keycloak from "@/lib/keycloak"

export async function authorizedFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  await keycloak.updateToken(30)
  const headers = new Headers(init.headers)
  if (keycloak.token) headers.set("Authorization", `Bearer ${keycloak.token}`)
  return fetch(input, { ...init, headers })
}
