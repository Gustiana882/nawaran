import * as React from "react"
import Editor from "@monaco-editor/react"
import { useNavigate, useParams } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { PageToast, useToast } from "@/components/page-toast"
import { useMonacoTheme } from "@/hooks/use-monaco-theme"
import { updateWebsite } from "@/lib/websites-api"
import type { WebsiteItem } from "@/types/cms"
import {
  GlobeIcon,
  ArrowLeftIcon,
  SaveIcon,
  FileTextIcon,
  AlertCircleIcon,
  Loader2Icon,
} from "lucide-react"

interface WebsiteEditPageProps {
  websites: WebsiteItem[]
  onUpdate: (id: string, updated: WebsiteItem) => void
}

const editorOptions = {
  minimap: { enabled: false },
  fontSize: 13,
  scrollBeyondLastLine: false,
  automaticLayout: true,
  tabSize: 2,
  padding: { top: 12 },
} as const

export default function WebsiteEditPage({ websites, onUpdate }: WebsiteEditPageProps) {
  const { id } = useParams()
  const navigate = useNavigate()
  const monacoTheme = useMonacoTheme()
  const { toast, showToast, dismissToast } = useToast()

  const website = React.useMemo(() => websites.find((w) => w.id === id) ?? null, [websites, id])

  const [name, setName] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [domain, setDomain] = React.useState("")
  const [jsonValue, setJsonValue] = React.useState("")
  const [htmlValue, setHtmlValue] = React.useState("")
  const [jsonError, setJsonError] = React.useState<string | null>(null)
  const [isSaving, setIsSaving] = React.useState(false)

  React.useEffect(() => {
    if (!website) return
    setName(website.name)
    setDescription(website.description)
    setDomain(website.domain)
    setJsonValue(JSON.stringify(website.data, null, 2))
    setHtmlValue(website.html)
  }, [website])

  async function handleSave() {
    setJsonError(null)

    if (!id) { showToast("error", "Website ID tidak ditemukan"); return }
    if (!name.trim()) { showToast("error", "Nama website wajib diisi"); return }

    let parsedData: unknown
    try {
      parsedData = JSON.parse(jsonValue)
    } catch (error) {
      const message = error instanceof Error ? error.message : "JSON tidak valid"
      setJsonError(message)
      showToast("error", "Data JSON tidak valid — cek tab Data JSON")
      return
    }

    setIsSaving(true)
    try {
      const updated = await updateWebsite(id, {
        name: name.trim(),
        description: description.trim(),
        domain: domain.trim(),
        data: parsedData,
        html: htmlValue,
      })
      onUpdate(id, updated)
      showToast("success", "Website berhasil diperbarui")
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Gagal memperbarui website")
    } finally {
      setIsSaving(false)
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
            <h1 className="text-sm font-semibold leading-tight">Edit Website</h1>
            <p className="truncate text-xs text-muted-foreground">{website.name}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeftIcon className="h-3.5 w-3.5" />
            Batal
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2Icon className="h-3.5 w-3.5 animate-spin" /> : <SaveIcon className="h-3.5 w-3.5" />}
            {isSaving ? "Menyimpan..." : "Simpan"}
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden p-3 xl:grid-cols-[300px_1fr]">
        {/* Info panel */}
        <div className="space-y-4 overflow-y-auto rounded-lg border bg-card p-4 text-card-foreground">
          <div className="space-y-1.5">
            <Label htmlFor="ws-name" className="text-xs font-medium">
              Nama <span className="text-destructive">*</span>
            </Label>
            <Input
              id="ws-name"
              placeholder="Nama website"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ws-domain" className="text-xs font-medium">Domain</Label>
            <Input
              id="ws-domain"
              placeholder="contoh: promo.brandkamu.com"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Tanpa https://</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ws-desc" className="text-xs font-medium">Deskripsi</Label>
            <Textarea
              id="ws-desc"
              placeholder="Deskripsi singkat tentang website ini"
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
