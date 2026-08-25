import * as React from "react"
import Editor from "@monaco-editor/react"
import { useNavigate, useParams } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import type { WebsiteItem } from "@/types/cms"
import { updateWebsite } from "@/lib/websites-api"
import {
  GlobeIcon,
  ArrowLeftIcon,
  CheckCircle2Icon,
  AlertCircleIcon,
  SaveIcon,
  FileTextIcon,
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

export default function WebsiteEditPage({ websites, onUpdate }: WebsiteEditPageProps) {
  const { id } = useParams()
  const navigate = useNavigate()
  const monacoTheme = useMonacoTheme()

  const website = React.useMemo(() => websites.find((w) => w.id === id) ?? null, [websites, id])

  const [name, setName] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [domain, setDomain] = React.useState("")
  const [jsonValue, setJsonValue] = React.useState("")
  const [htmlValue, setHtmlValue] = React.useState("")
  const [jsonError, setJsonError] = React.useState<string | null>(null)
  const [isSaving, setIsSaving] = React.useState(false)
  const [saveMessage, setSaveMessage] = React.useState<
    { type: "success" | "error"; text: string } | null
  >(null)

  // Populate form when website data is available
  React.useEffect(() => {
    if (!website) return
    setName(website.name)
    setDescription(website.description)
    setDomain(website.domain)
    setJsonValue(JSON.stringify(website.data, null, 2))
    setHtmlValue(website.html)
  }, [website])

  async function handleSave() {
    setSaveMessage(null)
    setJsonError(null)

    if (!id) {
      setSaveMessage({ type: "error", text: "Website ID tidak ditemukan" })
      return
    }
    if (!name.trim()) {
      setSaveMessage({ type: "error", text: "Nama website wajib diisi" })
      return
    }

    let parsedData: unknown
    try {
      parsedData = JSON.parse(jsonValue)
    } catch (error) {
      const message = error instanceof Error ? error.message : "JSON tidak valid"
      setJsonError(message)
      setSaveMessage({ type: "error", text: "Data JSON tidak valid — cek tab Data" })
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
      setSaveMessage({ type: "success", text: "Website berhasil diperbarui" })
    } catch (error) {
      setSaveMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Gagal memperbarui website",
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (!website) {
    return (
      <div className="flex flex-1 items-center justify-center p-4 text-sm text-muted-foreground">
        Website tidak ditemukan.
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 border-b bg-background px-3 py-2">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <GlobeIcon className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-base font-semibold leading-tight">Edit Website</h1>
            <p className="text-xs text-muted-foreground">
              Ubah detail, data JSON, dan markup HTML website ini.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeftIcon />
            Batal
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <SaveIcon />
            {isSaving ? "Menyimpan..." : "Save"}
          </Button>
        </div>
      </div>

      {saveMessage && (
        <div
          className={
            (saveMessage.type === "success"
              ? "border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-300"
              : "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300") +
            " mx-3 mt-3 flex min-w-0 items-center gap-2 rounded-md border px-3 py-2 text-sm"
          }
        >
          {saveMessage.type === "success" ? (
            <CheckCircle2Icon className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircleIcon className="h-4 w-4 shrink-0" />
          )}
          <span className="min-w-0 flex-1 break-words">{saveMessage.text}</span>
        </div>
      )}

      {/* Body */}
      <div className="grid flex-1 grid-cols-1 gap-3 overflow-hidden p-3 xl:grid-cols-[320px_1fr]">
        {/* Info panel */}
        <div className="space-y-3 rounded-md border bg-card p-3 text-card-foreground xl:overflow-y-auto">
          <div className="space-y-1.5">
            <Label htmlFor="website-name">Nama</Label>
            <Input
              id="website-name"
              placeholder="Nama website"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="website-domain">Domain</Label>
            <Input
              id="website-domain"
              placeholder="contoh: promo.brandkamu.com"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="website-description">Deskripsi</Label>
            <Textarea
              id="website-description"
              placeholder="Deskripsi singkat tentang website ini"
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
                onChange={(value) => setJsonValue(value ?? "")}
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
