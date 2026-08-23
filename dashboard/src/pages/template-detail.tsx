import * as React from "react"
import Editor from "@monaco-editor/react"
import { Link, useNavigate, useParams } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { getTemplateByID } from "@/lib/templates-api"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { TemplateItem } from "@/types/cms"

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
} as const

export default function TemplateDetailPage({ templates, onDelete }: TemplateDetailPageProps) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [template, setTemplate] = React.useState<TemplateItem | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

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

  if (isLoading) {
    return <div className="px-4 text-sm text-muted-foreground">Memuat template...</div>
  }

  if (!template) {
    return <div className="px-4 text-sm text-muted-foreground">{errorMessage ?? "Template tidak ditemukan."}</div>
  }

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

  return (
    <div className="flex flex-1 flex-col gap-4 px-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{template.name}</h1>
          <p className="text-sm text-muted-foreground">{template.description || "Tanpa deskripsi"}</p>
        </div>
        <div className="flex gap-2">
          <Button nativeButton={false} size="sm" variant="outline" render={<Link to={`/templates/${template.id}/edit`} />}>
            Edit
          </Button>
          <Button size="sm" variant="destructive" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? "Menghapus..." : "Delete"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="detail" className="flex flex-1 flex-col gap-4">
        <TabsList>
          <TabsTrigger value="detail">Detail</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
          <TabsTrigger value="html">HTML</TabsTrigger>
        </TabsList>

        <TabsContent value="detail" className="space-y-2">
          <Label>Nama Template</Label>
          <div className="rounded-md border px-3 py-2 text-sm">{template.name}</div>
          <Label>Deskripsi</Label>
          <div className="rounded-md border px-3 py-2 text-sm text-muted-foreground">{template.description || "-"}</div>
        </TabsContent>

        <TabsContent value="data" className="space-y-2">
          <Label>Data (JSON)</Label>
          <div className="overflow-hidden rounded-md border">
            <Editor
              height="580px"
              language="json"
              theme="vs-dark"
              value={JSON.stringify(template.data, null, 2)}
              options={editorOptions}
            />
          </div>
        </TabsContent>

        <TabsContent value="html" className="space-y-2">
          <Label>HTML</Label>
          <div className="overflow-hidden rounded-md border">
            <Editor
              height="580px"
              language="html"
              theme="vs-dark"
              value={template.html}
              options={editorOptions}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
