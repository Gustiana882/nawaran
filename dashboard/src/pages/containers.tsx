import * as React from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PageToast, useToast } from "@/components/page-toast"
import { RoleGate } from "@/components/auth-provider"
import type { ContainerCreateInput, ContainerItem } from "@/lib/containers-api"
import {
  AlertCircleIcon,
  PlayIcon,
  PlusCircleIcon,
  PowerOffIcon,
  RefreshCwIcon,
  ServerIcon,
  SquareIcon,
  TrashIcon,
} from "lucide-react"

interface ContainersPageProps {
  containers: ContainerItem[]
  isLoading: boolean
  errorMessage: string | null
  onRetry: () => Promise<void>
  onCreate: (payload: ContainerCreateInput) => Promise<{ ok: boolean; message?: string }>
  onStart: (name: string) => Promise<{ ok: boolean; message?: string }>
  onStop: (name: string) => Promise<{ ok: boolean; message?: string }>
  onRestart: (name: string) => Promise<{ ok: boolean; message?: string }>
  onDelete: (name: string) => Promise<{ ok: boolean; message?: string }>
}

export default function ContainersPage({
  containers,
  isLoading,
  errorMessage,
  onRetry,
  onCreate,
  onStart,
  onStop,
  onRestart,
  onDelete,
}: ContainersPageProps) {
  const [form, setForm] = React.useState({ name: "", image: "" })
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [pendingAction, setPendingAction] = React.useState<string | null>(null)
  const { toast, showToast, dismissToast } = useToast()

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const image = form.image.trim()
    if (!image) {
      showToast("error", "Image container wajib diisi")
      return
    }

    setIsSubmitting(true)
    const result = await onCreate({ name: form.name.trim() || undefined, image })
    setIsSubmitting(false)

    if (!result.ok) {
      showToast("error", result.message || "Gagal membuat container")
      return
    }

    showToast("success", "Container berhasil dibuat")
    setForm({ name: "", image: "" })
  }

  async function handleAction(action: "start" | "stop" | "restart" | "delete", name: string) {
    if (action === "delete" && !confirm(`Hapus container "${name}"?`)) return

    setPendingAction(`${action}:${name}`)
    const result =
      action === "start"
        ? await onStart(name)
        : action === "stop"
          ? await onStop(name)
          : action === "restart"
            ? await onRestart(name)
            : await onDelete(name)
    setPendingAction(null)

    if (!result.ok) {
      showToast("error", result.message || `Gagal ${action} container`)
      return
    }

    showToast("success", {
      start: "Container berhasil dijalankan",
      stop: "Container berhasil dihentikan",
      restart: "Container berhasil di-restart",
      delete: "Container berhasil dihapus",
    }[action])
  }

  return (
    <div className="flex flex-1 flex-col bg-muted/20">
      <PageToast message={toast} onDismiss={dismissToast} />

      <div className="flex items-center justify-between gap-4 border-b bg-background px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
            <ServerIcon className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-sm font-semibold leading-tight">Containers</h1>
            <p className="text-xs text-muted-foreground">Kelola container runtime dan operasionalnya.</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {!isLoading && errorMessage && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <div className="flex items-center gap-2">
              <AlertCircleIcon className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <Button variant="outline" onClick={() => void onRetry()}>
              <RefreshCwIcon className="h-3.5 w-3.5" />
              Coba Lagi
            </Button>
          </div>
        )}

        {!isLoading && (
          <form onSubmit={handleSubmit} className="mb-4 rounded-xl border bg-card p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                <PlusCircleIcon className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold">Buat container</h2>
                <p className="text-xs text-muted-foreground">Buat container baru berdasarkan image yang tersedia.</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="container-name">Nama (opsional)</Label>
                <Input
                  id="container-name"
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="contoh: app-api"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="container-image">Image</Label>
                <Input
                  id="container-image"
                  value={form.image}
                  onChange={(event) => setForm((prev) => ({ ...prev, image: event.target.value }))}
                  placeholder="nginx:latest"
                />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end">
              <RoleGate roles={["container.create"]} fallback={null}>
                <Button type="submit" nativeButton={false} disabled={isSubmitting}>
                  {isSubmitting ? <RefreshCwIcon className="h-3.5 w-3.5 animate-spin" /> : <PlusCircleIcon className="h-3.5 w-3.5" />}
                  {isSubmitting ? "Membuat..." : "Buat Container"}
                </Button>
              </RoleGate>
            </div>
          </form>
        )}

        {isLoading && (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-lg border bg-card p-4">
                <div className="mb-2 h-4 w-2/3 animate-pulse rounded bg-muted" />
                <div className="mb-3 h-3 w-full animate-pulse rounded bg-muted" />
                <div className="mb-4 h-3 w-1/2 animate-pulse rounded bg-muted" />
                <div className="flex gap-2">
                  <div className="h-8 flex-1 animate-pulse rounded bg-muted" />
                  <div className="h-8 w-8 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && !errorMessage && containers.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-background/50 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <ServerIcon className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">Belum ada container</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Container yang berjalan atau berhenti akan muncul di sini.</p>
            </div>
          </div>
        )}

        {!isLoading && !errorMessage && containers.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {containers.map((container) => (
              <article key={container.id} className="rounded-lg border bg-card p-4 shadow-sm">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <h2 className="line-clamp-1 text-sm font-semibold">{container.name}</h2>
                    <p className="text-[11px] text-muted-foreground">{container.id.slice(0, 12)}</p>
                  </div>
                  <span
                    className={[
                      "rounded-full px-2 py-1 text-[10px] font-medium uppercase tracking-wide",
                      container.state === "running" ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground",
                    ].join(" ")}
                  >
                    {container.state}
                  </span>
                </div>

                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <ServerIcon className="h-3.5 w-3.5 text-primary" />
                    <span className="line-clamp-1">{container.image}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <RefreshCwIcon className="h-3.5 w-3.5 text-primary" />
                    <span>{container.status}</span>
                  </div>
                  {container.ports.length > 0 && (
                    <div className="flex items-center gap-2">
                      <SquareIcon className="h-3.5 w-3.5 text-primary" />
                      <span>{container.ports.join(", ")}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <RoleGate roles={["container.start"]} fallback={null}>
                    <Button
                      type="button"
                      variant="outline"
                      nativeButton={false}
                      size="sm"
                      disabled={pendingAction === `start:${container.name}` || container.state === "running"}
                      onClick={() => void handleAction("start", container.name)}
                    >
                      <PlayIcon className="h-3.5 w-3.5" />
                      {pendingAction === `start:${container.name}` ? "..." : "Start"}
                    </Button>
                  </RoleGate>

                  <RoleGate roles={["container.stop"]} fallback={null}>
                    <Button
                      type="button"
                      variant="outline"
                      nativeButton={false}
                      size="sm"
                      disabled={pendingAction === `stop:${container.name}` || container.state !== "running"}
                      onClick={() => void handleAction("stop", container.name)}
                    >
                      <PowerOffIcon className="h-3.5 w-3.5" />
                      {pendingAction === `stop:${container.name}` ? "..." : "Stop"}
                    </Button>
                  </RoleGate>

                  <RoleGate roles={["container.restart"]} fallback={null}>
                    <Button
                      type="button"
                      variant="outline"
                      nativeButton={false}
                      size="sm"
                      disabled={pendingAction === `restart:${container.name}`}
                      onClick={() => void handleAction("restart", container.name)}
                    >
                      <RefreshCwIcon className="h-3.5 w-3.5" />
                      {pendingAction === `restart:${container.name}` ? "..." : "Restart"}
                    </Button>
                  </RoleGate>

                  <RoleGate roles={["container.delete"]} fallback={null}>
                    <Button
                      type="button"
                      variant="destructive"
                      nativeButton={false}
                      size="sm"
                      disabled={pendingAction === `delete:${container.name}`}
                      onClick={() => void handleAction("delete", container.name)}
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                      {pendingAction === `delete:${container.name}` ? "..." : "Delete"}
                    </Button>
                  </RoleGate>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
