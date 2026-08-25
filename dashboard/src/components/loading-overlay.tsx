import { Loader2Icon } from "lucide-react"

interface LoadingOverlayProps {
  show: boolean
  label?: string
}

/**
 * Semi-transparent overlay shown on top of the current content during async operations.
 * Position: absolute, so parent must be `relative`.
 */
export function LoadingOverlay({ show, label = "Memuat..." }: LoadingOverlayProps) {
  if (!show) return null
  return (
    <div
      aria-live="polite"
      aria-label={label}
      className="absolute inset-0 z-20 flex items-center justify-center rounded-md bg-background/60 backdrop-blur-[1px]"
    >
      <div className="flex items-center gap-2 rounded-lg border bg-background px-4 py-2.5 text-sm font-medium shadow-md">
        <Loader2Icon className="h-4 w-4 animate-spin text-primary" />
        <span>{label}</span>
      </div>
    </div>
  )
}

/** Centered full-screen loader for initial page load. */
export function PageLoader({ label = "Memuat..." }: { label?: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8">
      <Loader2Icon className="h-6 w-6 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  )
}
