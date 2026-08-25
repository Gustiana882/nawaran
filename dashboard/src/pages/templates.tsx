import * as React from "react"
import { Link, useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { PageToast, useToast } from "@/components/page-toast"
import type { TemplateItem } from "@/types/cms"
import {
  LayoutTemplateIcon,
  PlusCircleIcon,
  MoreHorizontalIcon,
  EyeIcon,
  EditIcon,
  TrashIcon,
  RefreshCwIcon,
  AlertCircleIcon,
  GlobeIcon,
} from "lucide-react"

interface TemplatesPageProps {
  templates: TemplateItem[]
  isLoading: boolean
  errorMessage: string | null
  onRetry: () => Promise<void>
  onDelete: (id: string) => Promise<{ ok: boolean; message?: string }>
}

export default function TemplatesPage({
  templates,
  isLoading,
  errorMessage,
  onRetry,
  onDelete,
}: TemplatesPageProps) {
  const navigate = useNavigate()
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const { toast, showToast, dismissToast } = useToast()

  async function handleDelete(template: TemplateItem) {
    if (!confirm(`Hapus template "${template.name}"? Tindakan ini tidak dapat dibatalkan.`)) return
    setDeletingId(template.id)
    const result = await onDelete(template.id)
    setDeletingId(null)
    if (!result.ok) {
      showToast("error", result.message || "Gagal menghapus template")
    } else {
      showToast("success", `Template "${template.name}" berhasil dihapus`)
    }
  }

  return (
    <div className="flex flex-1 flex-col bg-muted/20">
      <PageToast message={toast} onDismiss={dismissToast} />

      {/* Header */}
      <div className="flex items-center justify-between gap-4 border-b bg-background px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
            <LayoutTemplateIcon className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-sm font-semibold leading-tight">Templates</h1>
            <p className="text-xs text-muted-foreground">Kelola template halaman landing.</p>
          </div>
        </div>
        <Button nativeButton={false} render={<Link to="/templates/new" />}>
          <PlusCircleIcon className="h-3.5 w-3.5" />
          Buat Template
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* Error banner */}
        {!isLoading && errorMessage && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <div className="flex items-center gap-2">
              <AlertCircleIcon className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <Button nativeButton={false} variant="outline" onClick={() => void onRetry()}>
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
                <Skeleton className="mb-4 h-3 w-full" />
                <Skeleton className="mb-2 h-3 w-5/6" />
                <div className="mt-4 flex gap-2">
                  <Skeleton className="h-8 flex-1" />
                  <Skeleton className="h-8 w-8" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !errorMessage && templates.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-background/50 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <LayoutTemplateIcon className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">Belum ada template</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Mulai dengan membuat template pertama Anda.</p>
            </div>
            <Button nativeButton={false} render={<Link to="/templates/new" />}>
              <PlusCircleIcon className="h-3.5 w-3.5" />
              Buat Template
            </Button>
          </div>
        )}

        {/* Grid */}
        {!isLoading && !errorMessage && templates.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {templates.map((tpl) => (
              <article
                key={tpl.id}
                className="group flex flex-col rounded-lg border bg-card text-card-foreground shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex-1 p-4">
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <h2 className="line-clamp-1 text-sm font-semibold">{tpl.name}</h2>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className="-mr-1 -mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md opacity-0 transition-opacity hover:bg-accent group-hover:opacity-100 focus:outline-none"
                        aria-label="Opsi"
                      >
                        <MoreHorizontalIcon className="h-4 w-4" />
                      </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onClick={() => navigate(`/templates/${tpl.id}`)}>
                          <EyeIcon className="h-3.5 w-3.5" /> Detail
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(`/templates/${tpl.id}/edit`)}>
                          <EditIcon className="h-3.5 w-3.5" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          disabled={deletingId === tpl.id}
                          onClick={() => void handleDelete(tpl)}
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
                          {deletingId === tpl.id ? "Menghapus..." : "Hapus"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {tpl.description || "Tanpa deskripsi"}
                  </p>
                </div>

                <div className="border-t px-4 py-3">
                  <Button
                    variant="outline"
                    nativeButton={false}
                    className="w-full"
                    render={<Link to={`/websites/new?templateId=${tpl.id}`} />}
                  >
                    <GlobeIcon className="h-3.5 w-3.5" />
                    Gunakan Template
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
