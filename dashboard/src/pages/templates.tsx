import { Link } from "react-router-dom"
import * as React from "react"

import { Button } from "@/components/ui/button"
import type { TemplateItem } from "@/types/cms"

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
    <div className="flex flex-1 flex-col gap-4 px-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Templates</h1>
          <p className="text-sm text-muted-foreground">
            Pilih template untuk dipakai ke website baru.
          </p>
        </div>
        <Button render={<Link to="/templates/new" />}>Buat Template</Button>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Memuat template...</p>}

      {errorMessage && (
        <div className="flex items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          <span>{errorMessage}</span>
          <Button size="sm" variant="outline" onClick={() => void onRetry()}>
            Coba Lagi
          </Button>
        </div>
      )}

      {!isLoading && !errorMessage && templates.length === 0 && (
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          Belum ada template. Silakan buat template pertama.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {templates.map((template) => (
          <article key={template.id} className="rounded-lg border bg-card p-4 text-card-foreground">
            <div className="mb-2 flex items-start justify-between gap-3">
              <h2 className="line-clamp-2 text-base font-semibold">{template.name}</h2>
            </div>
            <p className="mb-4 line-clamp-3 text-sm text-muted-foreground">
              {template.description || "Tanpa deskripsi"}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" render={<Link to={`/templates/${template.id}`} />}>
                Detail
              </Button>
              <Button size="sm" variant="outline" render={<Link to={`/templates/${template.id}/edit`} />}>
                Edit
              </Button>
              <Button size="sm" render={<Link to={`/websites/new?templateId=${template.id}`} />}>
                Use Template
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => void handleDelete(template)}
                disabled={deletingId === template.id}
              >
                {deletingId === template.id ? "Menghapus..." : "Delete"}
              </Button>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}