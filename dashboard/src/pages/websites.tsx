import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import type { WebsiteItem } from "@/types/cms"

interface WebsitesPageProps {
  websites: WebsiteItem[]
  isLoading: boolean
  errorMessage: string | null
  onRetry: () => Promise<void>
}

export default function WebsitesPage({ websites, isLoading, errorMessage, onRetry }: WebsitesPageProps) {
  return (
    <div className="flex flex-1 flex-col gap-4 px-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">My Website</h1>
          <p className="text-sm text-muted-foreground">
            Daftar website yang sudah dibuat dari template.
          </p>
        </div>
        <Button render={<Link to="/websites/new" />}>Add Website</Button>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Memuat website...</p>}

      {errorMessage && (
        <div className="flex items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          <span>{errorMessage}</span>
          <Button size="sm" variant="outline" onClick={() => void onRetry()}>
            Coba Lagi
          </Button>
        </div>
      )}

      {!isLoading && !errorMessage && websites.length === 0 && (
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          Belum ada website.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {websites.map((website) => (
          <article key={website.id} className="rounded-lg border bg-card p-4 text-card-foreground">
            <h2 className="mb-1 line-clamp-1 text-base font-semibold">{website.name}</h2>
            <p className="mb-3 line-clamp-1 text-xs text-muted-foreground">{website.domain || "Tanpa domain"}</p>
            <p className="mb-4 line-clamp-3 text-sm text-muted-foreground">
              {website.description || "Tanpa deskripsi"}
            </p>
            <Button size="sm" variant="outline" render={<Link to={`/websites/${website.id}`} />}>
              Detail
            </Button>
          </article>
        ))}
      </div>
    </div>
  )
}
