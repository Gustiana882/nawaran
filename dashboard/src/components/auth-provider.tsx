import * as React from "react"

import keycloak from "@/lib/keycloak"

type AuthContextValue = {
  authenticated: boolean
  token: string | undefined
  login: () => Promise<void>
  logout: () => Promise<void>
  refreshToken: () => Promise<string | undefined>
}

const AuthContext = React.createContext<AuthContextValue | null>(null)
let keycloakInitPromise: Promise<boolean> | undefined

export function useAuth() {
  const value = React.useContext(AuthContext)
  if (!value) throw new Error("useAuth must be used within AuthProvider")
  return value
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

  const value: AuthContextValue = {
    authenticated,
    token,
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
