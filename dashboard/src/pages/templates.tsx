import { Link } from "react-router-dom"
import * as React from "react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { TemplateItem } from "@/types/cms"
import {
  TrashIcon,
  EditIcon,
  EyeIcon,
  PlusCircleIcon,
  MoreVerticalIcon,
  LayoutTemplateIcon,
  RefreshCwIcon,
  AlertCircleIcon,
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
  const [deletingId, setDeletingId] = React.useState<string | null>(null)

  async function handleDelete(template: TemplateItem) {
    const confirmed = window.confirm(`Hapus template "${template.name}"?`)
    if (!confirmed) return

    setDeletingId(template.id)
    await onDelete(template.id)
    setDeletingId(null)
  }

  return (
    <div className="flex flex-1 flex-col bg-muted/20">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 border-b bg-background px-3 py-2">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
            <LayoutTemplateIcon className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-base font-semibold leading-tight">Templates</h1>
            <p className="text-xs text-muted-foreground">
              Pilih template untuk dipakai ke website baru.
            </p>
          </div>
        </div>
        <Button render={<Link to="/templates/new" />}>
          <PlusCircleIcon />
          Buat Template
        </Button>
      </div>

      <div className="flex-1 p-3">
        {/* Loading state */}
        {isLoading && (
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-md border bg-card p-3"
              >
                <div className="mb-3 h-4 w-2/3 rounded bg-muted" />
                <div className="mb-2 h-3 w-full rounded bg-muted" />
                <div className="mb-4 h-3 w-4/5 rounded bg-muted" />
                <div className="h-8 w-full rounded bg-muted" />
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {!isLoading && errorMessage && (
          <div className="flex items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            <div className="flex items-center gap-2">
              <AlertCircleIcon className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 border-red-300 bg-white hover:bg-red-100"
              onClick={() => void onRetry()}
            >
              <RefreshCwIcon className="h-3.5 w-3.5" />
              Coba Lagi
            </Button>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !errorMessage && templates.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed bg-background/50 py-10 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <LayoutTemplateIcon className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">Belum ada template</p>
              <p className="text-xs text-muted-foreground">
                Silakan buat template pertama untuk mulai membangun website.
              </p>
            </div>
            <Button render={<Link to="/templates/new" />} size="sm">
              <PlusCircleIcon className="h-3.5 w-3.5" />
              Buat Template
            </Button>
          </div>
        )}

        {/* Template grid */}
        {!isLoading && !errorMessage && templates.length > 0 && (
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {templates.map((template) => (
              <article
                key={template.id}
                className="group flex flex-col rounded-md border bg-card p-3 text-card-foreground shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="line-clamp-2 text-base font-semibold">
                    {template.name}
                  </h2>

                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 text-muted-foreground opacity-70 hover:opacity-100"
                          aria-label="Menu template"
                        />
                      }
                    >
                      <MoreVerticalIcon className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        render={<Link to={`/templates/${template.id}`} />}
                      >
                        <EyeIcon className="h-4 w-4" />
                        Detail
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        render={<Link to={`/templates/${template.id}/edit`} />}
                      >
                        <EditIcon className="h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        disabled={deletingId === template.id}
                        onClick={() => void handleDelete(template)}
                      >
                        <TrashIcon className="h-4 w-4" />
                        {deletingId === template.id ? "Menghapus..." : "Delete"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <p className="mb-3 line-clamp-3 flex-1 text-sm text-muted-foreground">
                  {template.description || "Tanpa deskripsi"}
                </p>

                <Button
                  className="w-full"
                  render={<Link to={`/websites/new?templateId=${template.id}`} />}
                >
                  Use Template
                </Button>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}