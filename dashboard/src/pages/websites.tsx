import * as React from "react"
import { Link, useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { PageToast, useToast } from "@/components/page-toast"
import { RoleGate } from "@/components/auth-provider"
import type { WebsiteItem } from "@/types/cms"
import {
  GlobeIcon,
  PlusCircleIcon,
  MoreHorizontalIcon,
  EyeIcon,
  EditIcon,
  TrashIcon,
  RefreshCwIcon,
  AlertCircleIcon,
  ExternalLinkIcon,
  FilePenIcon,
} from "lucide-react"
import { appConfig } from "@/lib/config"

interface WebsitesPageProps {
  websites: WebsiteItem[]
  isLoading: boolean
  errorMessage: string | null
  onRetry: () => Promise<void>
  onDelete: (id: string) => Promise<{ ok: boolean; message?: string }>
}

export default function WebsitesPage({
  websites,
  isLoading,
  errorMessage,
  onRetry,
  onDelete,
}: WebsitesPageProps) {
  const navigate = useNavigate()
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const { toast, showToast, dismissToast } = useToast()

  async function handleDelete(website: WebsiteItem) {
    if (!confirm(`Hapus website "${website.name}"? Tindakan ini tidak dapat dibatalkan.`)) return
    setDeletingId(website.id)
    const result = await onDelete(website.id)
    setDeletingId(null)
    if (!result.ok) {
      showToast("error", result.message || "Gagal menghapus website")
    } else {
      showToast("success", `Hapus website "${website.name}" sedang diproses`)
    }
  }

  return (
    <div className="flex flex-1 flex-col bg-muted/20">
      <PageToast message={toast} onDismiss={dismissToast} />

      {/* Header */}
      <div className="flex items-center justify-between gap-4 border-b bg-background px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
            <GlobeIcon className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-sm font-semibold leading-tight">Websites</h1>
            <p className="text-xs text-muted-foreground">Kelola website yang dibuat dari website.</p>
          </div>
        </div>
        <RoleGate roles={["website.create"]} fallback={null}>
          <Button nativeButton={false} render={<Link to="/websites/new" />}>
            <PlusCircleIcon className="h-3.5 w-3.5" />
            Buat Website
          </Button>
        </RoleGate>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* Error banner */}
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

        {/* Loading skeletons */}
        {isLoading && (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-lg border bg-card p-4">
                <Skeleton className="mb-2 h-4 w-2/3" />
                <Skeleton className="mb-1 h-3 w-1/3" />
                <Skeleton className="mb-4 h-3 w-full" />
                <div className="flex gap-2">
                  <Skeleton className="h-8 flex-1" />
                  <Skeleton className="h-8 w-8" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !errorMessage && websites.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-background/50 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <GlobeIcon className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">Belum ada website</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Buat website dari salah satu template yang tersedia.</p>
            </div>
            <RoleGate roles={["website.create"]} fallback={null}>
              <Button nativeButton={false} render={<Link to="/websites/new" />}>
                <PlusCircleIcon className="h-3.5 w-3.5" />
                Buat Website
              </Button>
            </RoleGate>
          </div>
        )}

        {/* Grid */}
        {!isLoading && !errorMessage && websites.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {websites.map((site) => (
              <article
                key={site.id}
                className="group flex flex-col rounded-lg border bg-card text-card-foreground shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex-1 p-4">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="flex items-start gap-1">
                      <h2 className="line-clamp-1 text-sm font-semibold">{site.name}</h2>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${site.status === "creating" ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300" :
                          site.status === "deleting" ? "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300" :
                            "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                        }`}>
                        {site.status === "creating" ? "Creating" : site.status === "deleting" ? "Deleting" : "Active"}
                      </span>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className="-mr-1 -mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md opacity-0 transition-opacity hover:bg-accent group-hover:opacity-100 focus:outline-none"
                        aria-label="Opsi"
                      >
                        <MoreHorizontalIcon className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onClick={() => navigate(`/websites/${site.id}`)}>
                          <EyeIcon className="h-3.5 w-3.5" /> Detail
                        </DropdownMenuItem>
                        <RoleGate roles={["website.update"]} fallback={null}>
                          <DropdownMenuItem onClick={() => navigate(`/websites/${site.id}/edit`)}>
                            <EditIcon className="h-3.5 w-3.5" /> Edit
                          </DropdownMenuItem>
                        </RoleGate>
                        {site.domain && (
                          <DropdownMenuItem onClick={() => window.open(`${appConfig.editorBaseUrl}?website_id=${site.id}&domain=${site.domain}`, "_blank")}>
                            <FilePenIcon className="h-3.5 w-3.5" /> Buka Editor
                          </DropdownMenuItem>
                        )}
                        <RoleGate roles={["website.delete"]} fallback={null}>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            disabled={deletingId === site.id}
                            onClick={() => void handleDelete(site)}
                          >
                            <TrashIcon className="h-3.5 w-3.5" />
                            {deletingId === site.id ? "Menghapus..." : "Hapus"}
                          </DropdownMenuItem>
                        </RoleGate>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {site.domain ? (
                    <a
                      href={`https://${site.domain}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mb-2 inline-flex items-center gap-1 text-xs text-sidebar-primary hover:underline"
                    >
                      {site.domain}
                      <ExternalLinkIcon className="h-3 w-3" />
                    </a>
                  ) : (
                    <p className="mb-2 text-xs text-muted-foreground">Tanpa domain</p>
                  )}

                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {site.description || "Tanpa deskripsi"}
                  </p>
                  <div className="mt-3 text-[10px] uppercase tracking-wide text-muted-foreground">
                    {site.status === "creating" ? "Website sedang dibuat" : site.status === "deleting" ? "Website sedang dihapus" : "Website siap dipakai"}
                  </div>
                </div>

                <div className="flex gap-2 border-t px-4 py-3">
                  <Button
                    variant="outline"
                    nativeButton={false}
                    className="flex-1"
                    render={<Link to={`/websites/${site.id}`} />}
                  >
                    <EyeIcon className="h-3.5 w-3.5" />
                    Detail
                  </Button>
                  <Button
                    variant="outline"
                    nativeButton={false}
                    className="flex-1"
                    render={<Link to={`/websites/${site.id}/edit`} />}
                  >
                    <EditIcon className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
