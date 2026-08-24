import * as React from "react"
import Editor from "@monaco-editor/react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import type { TemplateItem } from "@/types/cms"
import {
  LayoutTemplateIcon,
  FileTextIcon,
  CheckCircle2Icon,
  AlertCircleIcon,
} from "lucide-react"

const DEFAULT_JSON = `{
  "title": "Judul Halaman",
  "subtitle": "",
  "price": ""
}`

const DEFAULT_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{{ .title }}</title>
  </head>
  <body>
    <h1>{{ .title }}</h1>
  </body>
</html>`

type SaveResult = { ok: boolean; message?: string }

export interface TemplateSavePayload {
  name: string
  description: string
  data: unknown
  html: string
}

interface TemplateCreatePageProps {
  onSave: (payload: TemplateSavePayload) => Promise<SaveResult>
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

export default function TemplateCreatePage({ onSave, initialTemplate, mode = "create" }: TemplateCreatePageProps) {
  const [name, setName] = React.useState(initialTemplate?.name ?? "")
  const [description, setDescription] = React.useState(initialTemplate?.description ?? "")
  const [jsonValue, setJsonValue] = React.useState(
    initialTemplate ? JSON.stringify(initialTemplate.data, null, 2) : DEFAULT_JSON
  )
  const [htmlValue, setHtmlValue] = React.useState(initialTemplate?.html ?? DEFAULT_HTML)
  const [jsonError, setJsonError] = React.useState<string | null>(null)
  const [isSaving, setIsSaving] = React.useState(false)
  const [saveMessage, setSaveMessage] = React.useState<
    { type: "success" | "error"; text: string } | null
  >(null)
  const monacoTheme = useMonacoTheme()

  async function handleSave() {
    setSaveMessage(null)

    if (!name.trim()) {
      setSaveMessage({ type: "error", text: "Nama template wajib diisi" })
      return
    }

    let parsedData: unknown
    try {
      parsedData = JSON.parse(jsonValue)
      setJsonError(null)
    } catch (error) {
      const message = error instanceof Error ? error.message : "JSON tidak valid"
      setJsonError(message)
      setSaveMessage({
        type: "error",
        text: "Data JSON tidak valid - cek tab Data",
      })
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

    setSaveMessage(
      result.ok
        ? { type: "success", text: "Template berhasil disimpan" }
        : { type: "error", text: result.message || "Gagal menyimpan template" }
    )
  }

  return (
    <div className="flex h-screen flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 border-b bg-background px-3 py-2">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <LayoutTemplateIcon className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-base font-semibold leading-tight">
              {mode === "edit" ? "Edit Template" : "Buat Template"}
            </h1>
            <p className="text-xs text-muted-foreground">
              Isi detail, data JSON, dan markup HTML untuk template ini.
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Menyimpan..." : "Save"}
        </Button>
      </div>

      {saveMessage && (
        <div
          className={
            saveMessage.type === "success"
              ? "mx-3 mt-3 flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-300"
              : "mx-3 mt-3 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
          }
        >
          {saveMessage.type === "success" ? (
            <CheckCircle2Icon className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircleIcon className="h-4 w-4 shrink-0" />
          )}
          {saveMessage.text}
        </div>
      )}

      {/* Body */}
      <div className="grid flex-1 grid-cols-1 gap-3 overflow-hidden p-3 xl:grid-cols-[320px_1fr]">
        {/* Info panel */}
        <div className="space-y-3 rounded-md border bg-card p-3 text-card-foreground xl:overflow-y-auto">
          <div className="space-y-1.5">
            <Label htmlFor="template-name">Nama</Label>
            <Input
              id="template-name"
              placeholder="mis. Landing Page Kelas Digital Marketing"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="template-description">Deskripsi</Label>
            <Textarea
              id="template-description"
              placeholder="Deskripsi singkat tentang template ini"
              rows={6}
              value={description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
            />
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

          <TabsContent value="data" className="flex min-h-0 flex-1 flex-col gap-1.5">
            <div className="h-full overflow-hidden rounded-md border">
              <Editor
                height="100%"
                language="json"
                theme={monacoTheme}
                value={jsonValue}
                onChange={(value: string | undefined) => setJsonValue(value ?? "")}
                options={editorOptions}
              />
            </div>
            {jsonError && (
              <p className="flex items-center gap-1.5 text-sm text-red-600">
                <AlertCircleIcon className="h-3.5 w-3.5 shrink-0" />
                JSON tidak valid: {jsonError}
              </p>
            )}
          </TabsContent>

          <TabsContent value="html" className="min-h-0 flex-1">
            <div className="h-full overflow-hidden rounded-md border">
              <Editor
                height="100%"
                language="html"
                theme={monacoTheme}
                value={htmlValue}
                onChange={(value: string | undefined) => setHtmlValue(value ?? "")}
                options={editorOptions}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}