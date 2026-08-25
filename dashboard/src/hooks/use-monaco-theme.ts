import * as React from "react"

/** Syncs Monaco editor theme with the app's dark/light mode (class-based). */
export function useMonacoTheme() {
  const [theme, setTheme] = React.useState<"vs-dark" | "light">(() =>
    document.documentElement.classList.contains("dark") ? "vs-dark" : "light",
  )

  React.useEffect(() => {
    const root = document.documentElement
    const observer = new MutationObserver(() => {
      setTheme(root.classList.contains("dark") ? "vs-dark" : "light")
    })
    observer.observe(root, { attributes: true, attributeFilter: ["class"] })
    return () => observer.disconnect()
  }, [])

  return theme
}
