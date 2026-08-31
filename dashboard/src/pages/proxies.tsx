import * as React from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PageToast, useToast } from "@/components/page-toast"
import { RoleGate } from "@/components/auth-provider"
import type { ProxyItem, ProxySaveInput } from "@/lib/proxies-api"
import {
  ArrowUpDownIcon,
  CheckCircle2Icon,
  GlobeIcon,
  Loader2Icon,
  MoreHorizontalIcon,
  NetworkIcon,
  PlusCircleIcon,
  RefreshCwIcon,
  TrashIcon,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface ProxiesPageProps {
  proxies: ProxyItem[]
  isLoading: boolean
  errorMessage: string | null
  onRetry: () => Promise<void>
  onCreate: (payload: ProxySaveInput) => Promise<{ ok: boolean; message?: string }>
  onUpdate: (id: string, payload: ProxySaveInput) => Promise<{ ok: boolean; message?: string }>
  onDelete: (id: string) => Promise<{ ok: boolean; message?: string }>
}

export default function ProxiesPage({
  proxies,
  isLoading,
  errorMessage,
  onRetry,
  onCreate,
  onUpdate,
  onDelete,
}: ProxiesPageProps) {
  const [form, setForm] = React.useState<ProxySaveInput>({ domain: "", upstream: "" })
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const { toast, showToast, dismissToast } = useToast()

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const domain = form.domain.trim()
    const upstream = form.upstream.trim()

    if (!domain || !upstream) {
      showToast("error", "Domain dan upstream wajib diisi")
      return
    }

    setIsSubmitting(true)
    const result = editingId
      ? await onUpdate(editingId, { domain, upstream })
      : await onCreate({ domain, upstream })
    setIsSubmitting(false)

    if (!result.ok) {
      showToast("error", result.message || "Gagal menyimpan proxy")
      return
    }

    showToast("success", editingId ? "Proxy berhasil diperbarui" : "Proxy berhasil dibuat")
    setForm({ domain: "", upstream: "" })
    setEditingId(null)
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus proxy ini?")) return
    setDeletingId(id)
    const result = await onDelete(id)
    setDeletingId(null)

    if (!result.ok) {
      showToast("error", result.message || "Gagal menghapus proxy")
      return
    }

    showToast("success", "Proxy berhasil dihapus")
    if (editingId === id) {
      setEditingId(null)
      setForm({ domain: "", upstream: "" })
    }
  }

  function startEdit(proxy: ProxyItem) {
    setEditingId(proxy.id)
    setForm({ domain: proxy.domain, upstream: proxy.upstream })
  }

  function resetForm() {
    setEditingId(null)
    setForm({ domain: "", upstream: "" })
  }

  return (
    <div className="flex flex-1 flex-col bg-muted/20">
      <PageToast message={toast} onDismiss={dismissToast} />

      <div className="flex items-center justify-between gap-4 border-b bg-background px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
            <ArrowUpDownIcon className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-sm font-semibold leading-tight">Proxy</h1>
            <p className="text-xs text-muted-foreground">Kelola reverse proxy domain ke upstream service.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <RoleGate roles={["proxy.create"]} fallback={null}>
            <Button variant="outline" nativeButton={false} onClick={() => setEditingId(null)}>
              <PlusCircleIcon className="h-3.5 w-3.5" />
              Baru
            </Button>
          </RoleGate>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-4xl space-y-4">
          {!isLoading && errorMessage && (
            <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              <span>{errorMessage}</span>
              <Button variant="outline" onClick={() => void onRetry()}>
                <RefreshCwIcon className="h-3.5 w-3.5" />
                Coba Lagi
              </Button>
            </div>
          )}

          {isLoading && (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="rounded-lg border bg-card p-4">
                  <div className="mb-2 h-4 w-2/3 animate-pulse rounded bg-muted" />
                  <div className="mb-4 h-3 w-full animate-pulse rounded bg-muted" />
                  <div className="mb-2 h-3 w-5/6 animate-pulse rounded bg-muted" />
                  <div className="mt-4 flex gap-2">
                    <div className="h-8 flex-1 animate-pulse rounded bg-muted" />
                    <div className="h-8 w-8 animate-pulse rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isLoading && (
            <>
              <form onSubmit={handleSubmit} className="rounded-xl border bg-card p-4 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <NetworkIcon className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold">{editingId ? "Edit proxy" : "Buat proxy baru"}</h2>
                    <p className="text-xs text-muted-foreground">Atur domain dan endpoint upstream yang akan diproxy.</p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="domain">Domain</Label>
                    <Input
                      id="domain"
                      value={form.domain}
                      onChange={(event) => setForm((prev) => ({ ...prev, domain: event.target.value }))}
                      placeholder="app.example.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="upstream">Upstream</Label>
                    <Input
                      id="upstream"
                      value={form.upstream}
                      onChange={(event) => setForm((prev) => ({ ...prev, upstream: event.target.value }))}
                      placeholder="service:8080"
                    />
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-end gap-2">
                  {editingId && (
                    <Button type="button" variant="outline" nativeButton={false} onClick={resetForm}>
                      Batal
                    </Button>
                  )}
                  <RoleGate roles={[editingId ? "proxy.update" : "proxy.create"]} fallback={null}>
                    <Button type="submit" nativeButton={false} disabled={isSubmitting}>
                      {isSubmitting ? <Loader2Icon className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2Icon className="h-3.5 w-3.5" />}
                      {isSubmitting ? (editingId ? "Menyimpan..." : "Membuat...") : editingId ? "Simpan Perubahan" : "Buat Proxy"}
                    </Button>
                  </RoleGate>
                </div>
              </form>

              {proxies.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-background/50 py-16 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                    <GlobeIcon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Belum ada proxy</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">Tambahkan reverse proxy untuk domain baru ke service upstream.</p>
                  </div>
                  <RoleGate roles={["proxy.create"]} fallback={null}>
                    <Button nativeButton={false} onClick={() => setEditingId(null)}>
                      <PlusCircleIcon className="h-3.5 w-3.5" />
                      Buat Proxy
                    </Button>
                  </RoleGate>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {proxies.map((proxy) => (
                    <article
                      key={proxy.id}
                      className="group flex flex-col rounded-lg border bg-card text-card-foreground shadow-sm transition-shadow hover:shadow-md"
                    >
                      <div className="flex-1 p-4">
                        <div className="mb-1 flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h2 className="line-clamp-1 text-sm font-semibold">{proxy.domain}</h2>
                            <p className="mt-1 text-[11px] text-muted-foreground">{proxy.id}</p>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              className="-mr-1 -mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md opacity-0 transition-opacity hover:bg-accent group-hover:opacity-100 focus:outline-none"
                              aria-label="Opsi"
                            >
                              <MoreHorizontalIcon className="h-4 w-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <RoleGate roles={["proxy.update"]} fallback={null}>
                                <DropdownMenuItem onClick={() => startEdit(proxy)}>
                                  <RefreshCwIcon className="h-3.5 w-3.5" /> Edit
                                </DropdownMenuItem>
                              </RoleGate>
                              <RoleGate roles={["proxy.delete"]} fallback={null}>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  variant="destructive"
                                  disabled={deletingId === proxy.id}
                                  onClick={() => void handleDelete(proxy.id)}
                                >
                                  <TrashIcon className="h-3.5 w-3.5" />
                                  {deletingId === proxy.id ? "Menghapus..." : "Hapus"}
                                </DropdownMenuItem>
                              </RoleGate>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <GlobeIcon className="h-3.5 w-3.5 text-primary" />
                            <span className="line-clamp-1">{proxy.domain}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <ArrowUpDownIcon className="h-3.5 w-3.5 text-primary" />
                            <span className="line-clamp-1">{proxy.upstream}</span>
                          </div>
                        </div>
                      </div>

                      <div className="border-t px-4 py-3">
                        <Button
                          variant="outline"
                          nativeButton={false}
                          className="w-full"
                          onClick={() => startEdit(proxy)}
                        >
                          <RefreshCwIcon className="h-3.5 w-3.5" />
                          Edit Proxy
                        </Button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
