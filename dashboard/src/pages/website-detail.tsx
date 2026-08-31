import * as React from "react"
import Editor from "@monaco-editor/react"
import { Link, useNavigate, useParams } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageToast, useToast } from "@/components/page-toast"
import { RoleGate } from "@/components/auth-provider"
import { useMonacoTheme } from "@/hooks/use-monaco-theme"
import type { WebsiteItem } from "@/types/cms"
import {
  GlobeIcon,
  FileTextIcon,
  EditIcon,
  TrashIcon,
  AlertCircleIcon,
  ExternalLinkIcon,
  Loader2Icon,
  FilePenIcon,
} from "lucide-react"

interface WebsiteDetailPageProps {
  websites: WebsiteItem[]
  onDelete: (id: string) => Promise<{ ok: boolean; message?: string }>
}

const editorOptions = {
  minimap: { enabled: false },
  fontSize: 13,
  scrollBeyondLastLine: false,
  automaticLayout: true,
  readOnly: true,
  tabSize: 2,
  padding: { top: 12 },
} as const

export default function WebsiteDetailPage({ websites, onDelete }: WebsiteDetailPageProps) {
  const { id } = useParams()
  const navigate = useNavigate()
  const monacoTheme = useMonacoTheme()
  const { toast, showToast, dismissToast } = useToast()

  const website = React.useMemo(() => websites.find((item) => item.id === id), [websites, id])
  const [isDeleting, setIsDeleting] = React.useState(false)

  async function handleDelete() {
    if (!website) return
    if (!confirm(`Hapus website "${website.name}"? Tindakan ini tidak dapat dibatalkan.`)) return
    setIsDeleting(true)
    const result = await onDelete(website.id)
    setIsDeleting(false)
    if (result.ok) {
      navigate("/websites")
    } else {
      showToast("error", result.message || "Gagal menghapus website")
    }
  }

  if (!website) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
        <AlertCircleIcon className="h-4 w-4 shrink-0" />
        Website tidak ditemukan.
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-1 flex-col overflow-hidden">
      <PageToast message={toast} onDismiss={dismissToast} />

      {/* Header */}
      <div className="flex shrink-0 items-center justify-between gap-4 border-b bg-background px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <GlobeIcon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold leading-tight">{website.name}</h1>
            <p className="truncate text-xs text-muted-foreground">{website.description || "Tanpa deskripsi"}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {website.domain && (
            <Button
              nativeButton={false}
              variant="outline"
              render={
                <a
                  href={`https://${website.domain}/editor?page_id=${website.id}`}
                  target="_blank"
                  rel="noreferrer"
                />
              }
            >
              <FilePenIcon className="h-3.5 w-3.5" />
              Editor
            </Button>
          )}
          <RoleGate roles={["website.update"]} fallback={null}>
            <Button nativeButton={false} variant="outline" render={<Link to={`/websites/${website.id}/edit`} />}>
              <EditIcon className="h-3.5 w-3.5" />
              Edit
            </Button>
          </RoleGate>
          <RoleGate roles={["website.delete"]} fallback={null}>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? <Loader2Icon className="h-3.5 w-3.5 animate-spin" /> : <TrashIcon className="h-3.5 w-3.5" />}
              {isDeleting ? "Menghapus..." : "Hapus"}
            </Button>
          </RoleGate>
        </div>
      </div>

      {/* Body */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden p-3 xl:grid-cols-[300px_1fr]">
        {/* Info panel */}
        <div className="space-y-4 overflow-y-auto rounded-lg border bg-card p-4 text-card-foreground">
          <div className="space-y-1">
            <Label className="text-xs font-medium text-muted-foreground">Nama Website</Label>
            <div className="rounded-md bg-muted/40 px-3 py-2 text-sm">{website.name}</div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium text-muted-foreground">Domain</Label>
            {website.domain ? (
              <a
                href={`https://${website.domain}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 rounded-md bg-muted/40 px-3 py-2 text-sm text-primary hover:underline"
              >
                {website.domain}
                <ExternalLinkIcon className="h-3.5 w-3.5 shrink-0" />
              </a>
            ) : (
              <div className="rounded-md bg-muted/40 px-3 py-2 text-sm text-muted-foreground">—</div>
            )}
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium text-muted-foreground">Deskripsi</Label>
            <div className="min-h-[3rem] rounded-md bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              {website.description || "—"}
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium text-muted-foreground">Terakhir Diubah</Label>
            <div className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              {new Date(website.createdAt).toLocaleDateString("id-ID", {
                day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
              })}
            </div>
          </div>
        </div>

        {/* Code panel — read-only */}
        <Tabs defaultValue="html" className="flex min-h-0 flex-col gap-2">
          <TabsList className="w-fit shrink-0">
            <TabsTrigger value="data" className="gap-1.5 text-xs">
              <FileTextIcon className="h-3.5 w-3.5" />
              Data JSON
            </TabsTrigger>
            <TabsTrigger value="html" className="gap-1.5 text-xs">
              <FileTextIcon className="h-3.5 w-3.5" />
              HTML
            </TabsTrigger>
          </TabsList>

          <TabsContent value="data" className="min-h-0 flex-1">
            <div className="h-full overflow-hidden rounded-lg border">
              <Editor
                height="100%"
                language="json"
                theme={monacoTheme}
                value={JSON.stringify(website.data, null, 2)}
                options={editorOptions}
              />
            </div>
          </TabsContent>

          <TabsContent value="html" className="min-h-0 flex-1">
            <div className="h-full overflow-hidden rounded-lg border">
              <Editor
                height="100%"
                language="html"
                theme={monacoTheme}
                value={website.html}
                options={editorOptions}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
