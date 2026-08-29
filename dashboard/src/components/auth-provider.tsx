import * as React from "react"

import keycloak from "@/lib/keycloak"

export type AuthUser = {
  name: string
  email: string
  username: string
}

type AuthContextValue = {
  authenticated: boolean
  token: string | undefined
  user: AuthUser
  roles: string[]
  login: () => Promise<void>
  logout: () => Promise<void>
  refreshToken: () => Promise<string | undefined>
  hasRole: (role: string) => boolean
  hasAnyRole: (...roles: string[]) => boolean
  hasAllRoles: (...roles: string[]) => boolean
}

type RoleGateProps = {
  roles: string[]
  any?: boolean
  children: React.ReactNode
  fallback?: React.ReactNode
}

const AuthContext = React.createContext<AuthContextValue | null>(null)
let keycloakInitPromise: Promise<boolean> | undefined

function parseRoles(tokenParsed: Record<string, unknown> | undefined): string[] {
  const roles = new Set<string>()

  const realmAccess = tokenParsed?.realm_access
  if (realmAccess && typeof realmAccess === "object") {
    const realmRoles = (realmAccess as { roles?: unknown }).roles
    if (Array.isArray(realmRoles)) {
      for (const role of realmRoles) {
        if (typeof role === "string") roles.add(role)
      }
    }
  }

  const resourceAccess = tokenParsed?.resource_access
  if (resourceAccess && typeof resourceAccess === "object") {
    for (const client of Object.values(resourceAccess as Record<string, unknown>)) {
      if (!client || typeof client !== "object") continue
      const clientRoles = (client as { roles?: unknown }).roles
      if (!Array.isArray(clientRoles)) continue
      for (const role of clientRoles) {
        if (typeof role === "string") roles.add(role)
      }
    }
  }

  return Array.from(roles)
}

export function useAuth() {
  const value = React.useContext(AuthContext)
  if (!value) throw new Error("useAuth must be used within AuthProvider")
  return value
}

export function RoleGate({ roles, any = true, children, fallback = null }: RoleGateProps) {
  const { hasAnyRole, hasAllRoles } = useAuth()

  const allowed =
    roles.length === 0
      ? true
      : any
        ? hasAnyRole(...roles)
        : hasAllRoles(...roles)

  if (!allowed) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = React.useState(false)
  const [authenticated, setAuthenticated] = React.useState(false)
  const [token, setToken] = React.useState<string | undefined>()
  const [authError, setAuthError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let mounted = true

    const initPromise = keycloakInitPromise ??= keycloak.init({
      onLoad: "login-required",
      pkceMethod: "S256",
      checkLoginIframe: false,
    })

    initPromise
      .then((isAuthenticated) => {
        if (!mounted) return
        setAuthenticated(isAuthenticated && keycloak.authenticated === true)
        setToken(keycloak.token)
        setReady(true)
      })
      .catch((error: unknown) => {
        if (!mounted) return
        const message = error instanceof Error ? error.message : "Keycloak gagal diinisialisasi"
        console.error("Keycloak initialization failed:", error)
        setAuthError(message)
        setReady(true)
      })

    keycloak.onTokenExpired = () => {
      void keycloak.updateToken(30).then(() => setToken(keycloak.token))
    }

    return () => {
      mounted = false
    }
  }, [])

  const roles = React.useMemo(() => parseRoles(keycloak.tokenParsed), [keycloak.tokenParsed])

  const value: AuthContextValue = {
    authenticated,
    token,
    user: {
      name: [keycloak.tokenParsed?.given_name, keycloak.tokenParsed?.family_name]
        .filter(Boolean)
        .join(" ") || keycloak.tokenParsed?.preferred_username || "User",
      email: keycloak.tokenParsed?.email ?? "",
      username: keycloak.tokenParsed?.preferred_username ?? "",
    },
    roles,
    login: async () => {
      await keycloak.login()
    },
    logout: async () => {
      await keycloak.logout({ redirectUri: window.location.origin })
    },
    refreshToken: async () => {
      await keycloak.updateToken(30)
      setToken(keycloak.token)
      return keycloak.token
    },
    hasRole: (role: string) => roles.includes(role),
    hasAnyRole: (...roleList: string[]) => roleList.some((role) => roles.includes(role)),
    hasAllRoles: (...roleList: string[]) => roleList.every((role) => roles.includes(role)),
  }

  if (!ready) {
    return <div className="flex min-h-svh items-center justify-center text-sm">Memuat autentikasi...</div>
  }

  if (authError) {
    return <div className="flex min-h-svh items-center justify-center text-sm">Autentikasi gagal: {authError}</div>
  }

  if (!authenticated) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <button className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground" onClick={value.login}>
          Login
        </button>
      </div>
    )
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
