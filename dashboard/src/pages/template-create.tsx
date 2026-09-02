import * as React from "react"
import Editor from "@monaco-editor/react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { PageToast, useToast } from "@/components/page-toast"
import { useMonacoTheme } from "@/hooks/use-monaco-theme"
import type { TemplateItem } from "@/types/cms"
import {
  LayoutTemplateIcon,
  FileTextIcon,
  AlertCircleIcon,
  SaveIcon,
  Loader2Icon,
} from "lucide-react"

const DEFAULT_JSON = `{
  "title": "Judul Halaman",
  "subtitle": "Deskripsi website",
  "features": [
    {
      "title": "Fitur Pertama",
      "description": "Deskripsi fitur pertama"
    },
    {
      "title": "Fitur Kedua",
      "description": "Deskripsi fitur kedua"
    }
  ],
  "benefits": [
    {
      "text": "Gratis konsultasi"
    },
    {
      "text": "Dukungan 24/7"
    }
  ],
  "stats": [
    {
      "value": "500+",
      "label": "Pengguna"
    }
  ],
  "items": [
    {
      "text": "Item pertama"
    }
  ]
}`

const DEFAULT_HTML = `<!doctype html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{{ .title }}</title>
  {{ range .styles }}
  <link rel="stylesheet" href="{{ . }}">
  {{ end }}
  <style>
    * {box-sizing: border-box;}
    body {margin: 0; font-family: Arial, sans-serif; color: #1f2937; background: #f8fafc; line-height: 1.6;}
    header {padding: 80px 24px; text-align: center; background: #fff; border-bottom: 1px solid #e5e7eb;}
    header h1 {margin: 0 0 16px; font-size: 48px; line-height: 1.1;}
    header p {margin: 0; color: #64748b; font-size: 18px;}
    section {width: 100%; max-width: 1100px; margin: 0 auto; padding: 70px 24px;}
    .feature-grid {display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px;}
    .feature-item {padding: 28px; background: #fff; border: 1px solid #e5e7eb; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,.04);}
    .feature-item h2 {margin: 0 0 10px; font-size: 22px;}
    .feature-item p {margin: 0; color: #64748b;}
    .benefits {display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px;}
    .benefit-item {padding: 20px 24px; background: #fff; border: 1px solid #e5e7eb; border-radius: 16px;}
    .stats {display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px; text-align: center;}
    .stat-item {padding: 28px; background: #fff; border: 1px solid #e5e7eb; border-radius: 16px;}
    .stat-value {display: block; font-size: 36px; line-height: 1.2;}
    .stat-label {color: #64748b;}
    .items {width: 100%; max-width: 1100px; margin: 0 auto; padding: 0 24px 70px; list-style: none;}
    .item {padding: 16px 20px; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; margin-bottom: 12px;}
    @media (max-width: 768px) {
      header {padding: 60px 20px;}
      header h1 {font-size: 36px;}
      section {padding: 50px 20px;}
      .feature-grid, .benefits, .stats {grid-template-columns: 1fr;}
      .items {padding: 0 20px 50px;}
    }
  </style>
</head>
<body>
  <!-- Single text field -->
  <header>
    <h1 data-editor="text" data-name="title">{{ .title }}</h1>
    <p data-editor="text" data-name="subtitle">{{ .subtitle }}</p>
  </header>
  <!-- Collection: multiple fields -->
  <section class="feature-grid" data-editor-collection="features" data-editor-add-label="+ Tambah fitur">
    {{ range $index, $item := .features }}
    <article class="feature-item" data-editor-item data-item-id="{{ $index }}">
      <h2 data-editor="text" data-name="title">{{ $item.title }}</h2>
      <p data-editor="text" data-name="description">{{ $item.description }}</p>
    </article>
    {{ end }}
  </section>
  <!-- Collection: array string -->
  <section class="benefits" data-editor-collection="benefits" data-editor-add-label="+ Tambah benefit">
    {{ range $index, $item := .benefits }}
    <div class="benefit-item" data-editor-item data-item-id="{{ $index }}">
      <span data-editor="text" data-name="text">{{ $item.text }}</span>
    </div>
    {{ end }}
  </section>
  <!-- Collection: multiple fields -->
  <section class="stats" data-editor-collection="stats" data-editor-add-label="+ Tambah statistik">
    {{ range $index, $item := .stats }}
    <div class="stat-item" data-editor-item data-item-id="{{ $index }}">
      <strong class="stat-value" data-editor="text" data-name="value">{{ $item.value }}</strong>
      <span class="stat-label" data-editor="text" data-name="label">{{ $item.label }}</span>
    </div>
    {{ end }}
  </section>
  <!-- Collection: UL -->
  <ul class="items" data-editor-collection="items" data-editor-add-label="+ Tambah item">
    {{ range $index, $item := .items }}
    <li class="item" data-editor-item data-item-id="{{ $index }}">
      <span data-editor="text" data-name="text">{{ $item.text }}</span>
    </li>
    {{ end }}
  </ul>
  {{ range .scripts }}
  <script src="{{ . }}"></script>
  {{ end }}
</body>
</html>`

export interface TemplateSavePayload {
  name: string
  description: string
  data: unknown
  html: string
}

interface TemplateCreatePageProps {
  onSave: (payload: TemplateSavePayload) => Promise<{ ok: boolean; message?: string }>
  initialTemplate?: TemplateItem
  mode?: "create" | "edit"
}

const editorOptions = {
  minimap: { enabled: false },
  fontSize: 13,
  scrollBeyondLastLine: false,
  automaticLayout: true,
  tabSize: 2,
  padding: { top: 12 },
} as const

export default function TemplateCreatePage({ onSave, initialTemplate, mode = "create" }: TemplateCreatePageProps) {
  const monacoTheme = useMonacoTheme()
  const { toast, showToast, dismissToast } = useToast()

  const [name, setName] = React.useState(initialTemplate?.name ?? "")
  const [description, setDescription] = React.useState(initialTemplate?.description ?? "")
  const [jsonValue, setJsonValue] = React.useState(
    initialTemplate ? JSON.stringify(initialTemplate.data, null, 2) : DEFAULT_JSON,
  )
  const [htmlValue, setHtmlValue] = React.useState(initialTemplate?.html ?? DEFAULT_HTML)
  const [jsonError, setJsonError] = React.useState<string | null>(null)
  const [isSaving, setIsSaving] = React.useState(false)

  async function handleSave() {
    setJsonError(null)

    if (!name.trim()) {
      showToast("error", "Nama template wajib diisi")
      return
    }

    let parsedData: unknown
    try {
      parsedData = JSON.parse(jsonValue)
    } catch (error) {
      const message = error instanceof Error ? error.message : "JSON tidak valid"
      setJsonError(message)
      showToast("error", "Data JSON tidak valid — cek tab Data")
      return
    }

    setIsSaving(true)
    const result = await onSave({
      name: name.trim(),
      description: description.trim(),
      data: parsedData,
      html: htmlValue,
    })
    setIsSaving(false)

    if (result.ok) {
      showToast("success", mode === "edit" ? "Template berhasil diperbarui" : "Template berhasil dibuat")
    } else {
      showToast("error", result.message || "Gagal menyimpan template")
    }
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
            <h1 className="text-sm font-semibold leading-tight">
              {mode === "edit" ? "Edit Template" : "Buat Template"}
            </h1>
            <p className="truncate text-xs text-muted-foreground">
              {mode === "edit" && initialTemplate ? initialTemplate.name : "Isi detail, data JSON, dan markup HTML."}
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2Icon className="h-3.5 w-3.5 animate-spin" /> : <SaveIcon className="h-3.5 w-3.5" />}
          {isSaving ? "Menyimpan..." : "Simpan"}
        </Button>
      </div>

      {/* Body */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden p-3 xl:grid-cols-[300px_1fr]">
        {/* Info panel */}
        <div className="space-y-4 overflow-y-auto rounded-lg border bg-card p-4 text-card-foreground">
          <div className="space-y-1.5">
            <Label htmlFor="tpl-name" className="text-xs font-medium">
              Nama <span className="text-destructive">*</span>
            </Label>
            <Input
              id="tpl-name"
              placeholder="mis. Landing Page Kelas Online"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tpl-desc" className="text-xs font-medium">
              Deskripsi
            </Label>
            <Textarea
              id="tpl-desc"
              placeholder="Deskripsi singkat tentang template ini"
              rows={8}
              className="resize-none"
              value={description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
            />
          </div>
        </div>

        {/* Code panel */}
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

          <TabsContent value="data" className="flex min-h-0 flex-1 flex-col gap-2">
            <div className="min-h-0 flex-1 overflow-hidden rounded-lg border">
              <Editor
                height="100%"
                language="json"
                theme={monacoTheme}
                value={jsonValue}
                onChange={(value) => setJsonValue(value ?? "")}
                options={editorOptions}
              />
            </div>
            {jsonError && (
              <p className="flex shrink-0 items-center gap-1.5 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                <AlertCircleIcon className="h-3.5 w-3.5 shrink-0" />
                {jsonError}
              </p>
            )}
          </TabsContent>

          <TabsContent value="html" className="min-h-0 flex-1">
            <div className="h-full overflow-hidden rounded-lg border">
              <Editor
                height="100%"
                language="html"
                theme={monacoTheme}
                value={htmlValue}
                onChange={(value) => setHtmlValue(value ?? "")}
                options={editorOptions}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
