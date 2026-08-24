import * as React from "react"
import Editor from "@monaco-editor/react"
import { Link, useNavigate, useParams } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { getTemplateByID } from "@/lib/templates-api"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { TemplateItem } from "@/types/cms"
import {
  LayoutTemplateIcon,
  FileTextIcon,
  EditIcon,
  TrashIcon,
  AlertCircleIcon,
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

/** Keeps Monaco's theme in sync with the app's light/dark mode (class-based). */
function useMonacoTheme() {
  const [theme, setTheme] = React.useState<"vs-dark" | "light">(() =>
    document.documentElement.classList.contains("dark") ? "vs-dark" : "light",
  )

  React.useEffect(() => {
    const root = document.documentElement
    const observer = new MutationObserver(() => {
      setTheme(root.classList.contains("dark") ? "vs-dark" : "light")
    })
    observer.observe(root, { attributes: true, attributeFilter: ["class"] })
    return () => observer.disconnect()
  }, [])

  return theme
}

export default function TemplateDetailPage({ templates, onDelete }: TemplateDetailPageProps) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [template, setTemplate] = React.useState<TemplateItem | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const monacoTheme = useMonacoTheme()

  React.useEffect(() => {
    let cancelled = false

    async function run() {
      if (!id) {
        setTemplate(null)
        setErrorMessage("Template tidak ditemukan.")
        return
      }

      const fromList = templates.find((item) => item.id === id)
      if (fromList) {
        setTemplate(fromList)
        setErrorMessage(null)
        return
      }

      setIsLoading(true)
      setErrorMessage(null)
      try {
        const fromAPI = await getTemplateByID(id)
        if (!cancelled) {
          setTemplate(fromAPI)
        }
      } catch (error) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : "Template tidak ditemukan."
          setErrorMessage(message)
          setTemplate(null)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [id, templates])

  async function handleDelete() {
    if (!template) return
    const confirmed = window.confirm(`Hapus template "${template.name}"?`)
    if (!confirmed) return

    setIsDeleting(true)
    const result = await onDelete(template.id)
    setIsDeleting(false)

    if (result.ok) {
      navigate("/templates")
    } else {
      setErrorMessage(result.message || "Gagal menghapus template")
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-4 text-sm text-muted-foreground">
        Memuat template...
      </div>
    )
  }

  if (!template) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 p-4 text-sm text-muted-foreground">
        <AlertCircleIcon className="h-4 w-4 shrink-0" />
        {errorMessage ?? "Template tidak ditemukan."}
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 border-b bg-background px-3 py-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <LayoutTemplateIcon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold leading-tight">{template.name}</h1>
            <p className="truncate text-xs text-muted-foreground">
              {template.description || "Tanpa deskripsi"}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link to={`/templates/${template.id}/edit`} />}
          >
            <EditIcon className="h-3.5 w-3.5" />
            Edit
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
            <TrashIcon className="h-3.5 w-3.5" />
            {isDeleting ? "Menghapus..." : "Delete"}
          </Button>
        </div>
      </div>

      {errorMessage && (
        <div className="mx-3 mt-3 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          <AlertCircleIcon className="h-4 w-4 shrink-0" />
          {errorMessage}
        </div>
      )}

      {/* Body */}
      <div className="grid flex-1 grid-cols-1 gap-3 overflow-hidden p-3 xl:grid-cols-[320px_1fr]">
        {/* Info panel */}
        <div className="space-y-3 rounded-md border bg-card p-3 text-card-foreground xl:overflow-y-auto">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Nama Template</Label>
            <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">{template.name}</div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Deskripsi</Label>
            <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
              {template.description || "-"}
            </div>
          </div>
        </div>

        {/* Code panel */}
        <Tabs defaultValue="data" className="flex min-h-0 flex-col gap-2">
          <TabsList className="w-fit">
            <TabsTrigger value="data">
              <FileTextIcon className="h-3.5 w-3.5" />
              Data
            </TabsTrigger>
            <TabsTrigger value="html">
              <FileTextIcon className="h-3.5 w-3.5" />
              HTML
            </TabsTrigger>
          </TabsList>

          <TabsContent value="data" className="min-h-0 flex-1">
            <div className="h-full overflow-hidden rounded-md border">
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
            <div className="h-full overflow-hidden rounded-md border">
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