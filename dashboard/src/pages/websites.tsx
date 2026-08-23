import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import type { WebsiteItem } from "@/types/cms"

interface WebsitesPageProps {
  websites: WebsiteItem[]
}

export default function WebsitesPage({ websites }: WebsitesPageProps) {
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
