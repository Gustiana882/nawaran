import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import type { WebsiteItem } from "@/types/cms"
import {
  EyeIcon,
  PlusCircleIcon,
  GlobeIcon,
  ExternalLinkIcon,
  RefreshCwIcon,
  AlertCircleIcon,
  FilePenIcon,
  TrashIcon
} from "lucide-react"

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
  return (
    <div className="flex flex-1 flex-col bg-muted/20">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 border-b bg-background px-3 py-2">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
            <GlobeIcon className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-base font-semibold leading-tight">My Website</h1>
            <p className="text-xs text-muted-foreground">
              Daftar website yang sudah dibuat dari template.
            </p>
          </div>
        </div>
        <Button nativeButton={false} render={<Link to="/websites/new" />}>
          <PlusCircleIcon />
          Add Website
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
                <div className="mb-2 h-4 w-2/3 rounded bg-muted" />
                <div className="mb-3 h-3 w-1/3 rounded bg-muted" />
                <div className="mb-4 h-3 w-full rounded bg-muted" />
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
        {!isLoading && !errorMessage && websites.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed bg-background/50 py-10 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <GlobeIcon className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">Belum ada website</p>
              <p className="text-xs text-muted-foreground">
                Buat website pertama dari salah satu template kamu.
              </p>
            </div>
            <Button nativeButton={false} render={<Link to="/websites/new" />} size="sm">
              <PlusCircleIcon className="h-3.5 w-3.5" />
              Add Website
            </Button>
          </div>
        )}

        {/* Website grid */}
        {!isLoading && !errorMessage && websites.length > 0 && (
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {websites.map((website) => (
              <article
                key={website.id}
                className="flex flex-col rounded-md border bg-card p-3 text-card-foreground shadow-sm transition-shadow hover:shadow-md"
              >
                <h2 className="line-clamp-1 text-base font-semibold">
                  {website.name}
                </h2>

                {website.domain ? (
                  <a
                    href={`https://${website.domain}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mb-2 inline-flex w-fit items-center gap-1 text-xs text-sidebar-primary hover:underline"
                  >
                    {website.domain}
                    <ExternalLinkIcon className="h-3 w-3" />
                  </a>
                ) : (
                  <p className="mb-2 text-xs text-muted-foreground">Tanpa domain</p>
                )}

                <p className="mb-3 line-clamp-2 flex-1 text-sm text-muted-foreground">
                  {website.description || "Tanpa deskripsi"}
                </p>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    render={<Link to={`/websites/${website.id}`} />}
                  >
                    <EyeIcon />
                    Detail
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    render={<a href={`https://${website.domain}/editor?page_id=${website.id}`} target="_blank" rel="noreferrer" />}
                  >
                    <FilePenIcon />
                    Editor
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      if (confirm(`Apakah Anda yakin ingin menghapus website "${website.name}"?`)) {
                        void onDelete(website.id)
                      }
                    }}
                  >
                    <TrashIcon />
                    Delete
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