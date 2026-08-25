import * as React from "react"
import { CheckCircle2Icon, AlertCircleIcon, XIcon } from "lucide-react"

export type ToastMessage = {
  type: "success" | "error"
  text: string
}

interface PageToastProps {
  message: ToastMessage | null
  onDismiss: () => void
  /** Auto-dismiss delay in ms. Default 4000. Pass 0 to disable. */
  autoHide?: number
}

/**
 * Fixed-position toast that appears in the top-right corner of the viewport.
 * Does NOT affect layout — no reflow, no scroll.
 */
export function PageToast({ message, onDismiss, autoHide = 4000 }: PageToastProps) {
  React.useEffect(() => {
    if (!message || autoHide === 0) return
    const t = setTimeout(onDismiss, autoHide)
    return () => clearTimeout(t)
  }, [message, autoHide, onDismiss])

  if (!message) return null

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed right-4 top-4 z-50 flex w-[340px] max-w-[calc(100vw-2rem)] animate-in slide-in-from-top-2 fade-in items-start gap-3 rounded-lg border bg-background px-4 py-3 shadow-lg transition-all"
      style={
        message.type === "success"
          ? { borderColor: "var(--color-green-200)", background: "var(--color-green-50)", color: "var(--color-green-800)" }
          : { borderColor: "var(--color-red-200)", background: "var(--color-red-50)", color: "var(--color-red-800)" }
      }
    >
      <span className="mt-0.5 shrink-0">
        {message.type === "success" ? (
          <CheckCircle2Icon className="h-4 w-4" />
        ) : (
          <AlertCircleIcon className="h-4 w-4" />
        )}
      </span>
      <p className="flex-1 text-sm leading-snug">{message.text}</p>
      <button
        onClick={onDismiss}
        className="mt-0.5 shrink-0 rounded-sm opacity-60 transition-opacity hover:opacity-100 focus:outline-none focus:ring-1"
        aria-label="Tutup"
      >
        <XIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

/** Hook to manage a single toast message with auto-dismiss. */
export function useToast() {
  const [toast, setToast] = React.useState<ToastMessage | null>(null)

  const showToast = React.useCallback((type: ToastMessage["type"], text: string) => {
    setToast({ type, text })
  }, [])

  const dismissToast = React.useCallback(() => setToast(null), [])

  return { toast, showToast, dismissToast }
}
