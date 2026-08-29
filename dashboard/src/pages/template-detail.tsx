import * as React from "react"
import Editor from "@monaco-editor/react"
import { Link, useNavigate, useParams } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageToast, useToast } from "@/components/page-toast"
import { PageLoader } from "@/components/loading-overlay"
import { RoleGate } from "@/components/auth-provider"
import { useMonacoTheme } from "@/hooks/use-monaco-theme"
import { getTemplateByID } from "@/lib/templates-api"
import type { TemplateItem } from "@/types/cms"
import {
  LayoutTemplateIcon,
  FileTextIcon,
  EditIcon,
  TrashIcon,
  AlertCircleIcon,
  Loader2Icon,
  GlobeIcon,
} from "lucide-react"

interface TemplateDetailPageProps {
  templates: TemplateItem[]
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

export default function TemplateDetailPage({ templates, onDelete }: TemplateDetailPageProps) {
  const { id } = useParams()
  const navigate = useNavigate()
  const monacoTheme = useMonacoTheme()
  const { toast, showToast, dismissToast } = useToast()

  const [template, setTemplate] = React.useState<TemplateItem | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [fetchError, setFetchError] = React.useState<string | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false
    async function run() {
      if (!id) { setFetchError("ID template tidak ditemukan."); return }
      const fromList = templates.find((t) => t.id === id)
      if (fromList) { setTemplate(fromList); return }
      setIsLoading(true)
      setFetchError(null)
      try {
        const fromAPI = await getTemplateByID(id)
        if (!cancelled) setTemplate(fromAPI)
      } catch (error) {
        if (!cancelled) setFetchError(error instanceof Error ? error.message : "Template tidak ditemukan.")
      } finally {
        setIsLoading(false)
      }
    }
    void run()
    return () => { cancelled = true }
  }, [id, templates])

  async function handleDelete() {
    if (!template) return
    if (!confirm(`Hapus template "${template.name}"? Tindakan ini tidak dapat dibatalkan.`)) return
    setIsDeleting(true)
    const result = await onDelete(template.id)
    setIsDeleting(false)
    if (result.ok) {
      navigate("/templates")
    } else {
      showToast("error", result.message || "Gagal menghapus template")
    }
  }

  if (isLoading) return <PageLoader label="Memuat template..." />

  if (fetchError || !template) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
        <AlertCircleIcon className="h-4 w-4 shrink-0" />
        {fetchError ?? "Template tidak ditemukan."}
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
            <LayoutTemplateIcon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold leading-tight">{template.name}</h1>
            <p className="truncate text-xs text-muted-foreground">{template.description || "Tanpa deskripsi"}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <RoleGate roles={["template.create"]} fallback={null}>
            <Button nativeButton={false} variant="outline" render={<Link to={`/websites/new?templateId=${template.id}`} />}>
              <GlobeIcon className="h-3.5 w-3.5" />
              Buat Website
            </Button>
          </RoleGate>
          <RoleGate roles={["template.update"]} fallback={null}>
            <Button nativeButton={false} variant="outline" render={<Link to={`/templates/${template.id}/edit`} />}>
              <EditIcon className="h-3.5 w-3.5" />
              Edit
            </Button>
          </RoleGate>
          <RoleGate roles={["template.delete"]} fallback={null}>
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
            <Label className="text-xs font-medium text-muted-foreground">Nama Template</Label>
            <div className="rounded-md bg-muted/40 px-3 py-2 text-sm">{template.name}</div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium text-muted-foreground">Deskripsi</Label>
            <div className="min-h-[3rem] rounded-md bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              {template.description || "—"}
            </div>
          </div>
          {template.updatedAt && (
            <div className="space-y-1">
              <Label className="text-xs font-medium text-muted-foreground">Terakhir Diubah</Label>
              <div className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                {new Date(template.updatedAt).toLocaleDateString("id-ID", {
                  day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
                })}
              </div>
            </div>
          )}
        </div>

        {/* Code panel — read-only */}
        <Tabs defaultValue="data" className="flex min-h-0 flex-col gap-2">
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
                value={JSON.stringify(template.data, null, 2)}
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
                value={template.html}
                options={editorOptions}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
