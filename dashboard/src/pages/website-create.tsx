import * as React from "react"
import Editor from "@monaco-editor/react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import type { TemplateItem } from "@/types/cms"

export interface WebsiteSavePayload {
  name: string
  description: string
  domain: string
  data: unknown
  html: string
  templateId?: string
}

interface WebsiteCreatePageProps {
  template?: TemplateItem
  onSave: (payload: WebsiteSavePayload) => Promise<{ ok: boolean; message?: string }>
}

const editorOptions = {
  minimap: { enabled: false },
  fontSize: 13,
  scrollBeyondLastLine: false,
  automaticLayout: true,
  tabSize: 2,
} as const

export default function WebsiteCreatePage({ template, onSave }: WebsiteCreatePageProps) {
  const [name, setName] = React.useState(template ? `${template.name} Website` : "")
  const [description, setDescription] = React.useState(template?.description ?? "")
  const [domain, setDomain] = React.useState("")
  const [jsonValue, setJsonValue] = React.useState(JSON.stringify(template?.data ?? {}, null, 2))
  const [htmlValue, setHtmlValue] = React.useState(template?.html ?? "")
  const [jsonError, setJsonError] = React.useState<string | null>(null)
  const [isSaving, setIsSaving] = React.useState(false)
  const [saveMessage, setSaveMessage] = React.useState<
    { type: "success" | "error"; text: string } | null
  >(null)

  React.useEffect(() => {
    if (!template) return
    setName(`${template.name} Website`)
    setDescription(template.description)
    setJsonValue(JSON.stringify(template.data ?? {}, null, 2))
    setHtmlValue(template.html)
  }, [template])

  async function handleSave() {
    setSaveMessage(null)

    if (!name.trim()) {
      setSaveMessage({ type: "error", text: "Nama website wajib diisi" })
      return
    }

    let parsedData: unknown
    try {
      parsedData = JSON.parse(jsonValue)
      setJsonError(null)
    } catch (error) {
      const message = error instanceof Error ? error.message : "JSON tidak valid"
      setJsonError(message)
      setSaveMessage({ type: "error", text: "Data JSON tidak valid" })
      return
    }

    setIsSaving(true)
    const result = await onSave({
      name: name.trim(),
      description: description.trim(),
      domain: domain.trim(),
      data: parsedData,
      html: htmlValue,
      templateId: template?.id,
    })
    setIsSaving(false)

    setSaveMessage(
      result.ok
        ? { type: "success", text: "Website berhasil disimpan" }
        : { type: "error", text: result.message || "Gagal menyimpan website" }
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 px-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Add Website</h1>
          <p className="text-sm text-muted-foreground">
            Buat website baru dari template yang dipilih.
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Menyimpan..." : "Save"}
        </Button>
      </div>

      {saveMessage && (
        <div
          className={
            saveMessage.type === "success"
              ? "rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-300"
              : "rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
          }
        >
          {saveMessage.text}
        </div>
      )}

      <Tabs defaultValue="detail" className="flex flex-1 flex-col gap-4">
        <TabsList>
          <TabsTrigger value="detail">Detail</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
          <TabsTrigger value="html">HTML</TabsTrigger>
        </TabsList>

        <TabsContent value="detail" className="max-w-xl space-y-4">
          <div className="space-y-2">
            <Label htmlFor="website-name">Nama</Label>
            <Input id="website-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="website-domain">Domain</Label>
            <Input
              id="website-domain"
              placeholder="contoh: promo.brandkamu.com"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="website-description">Deskripsi</Label>
            <Textarea
              id="website-description"
              rows={5}
              value={description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
            />
          </div>
        </TabsContent>

        <TabsContent value="data" className="space-y-2">
          <Label>Data (JSON)</Label>
          <div className="overflow-hidden rounded-md border">
            <Editor
              height="480px"
              language="json"
              theme="vs-dark"
              value={jsonValue}
              onChange={(value: string | undefined) => setJsonValue(value ?? "")}
              options={editorOptions}
            />
          </div>
          {jsonError && <p className="text-sm text-red-600">JSON tidak valid: {jsonError}</p>}
        </TabsContent>

        <TabsContent value="html" className="space-y-2">
          <Label>HTML</Label>
          <div className="overflow-hidden rounded-md border">
            <Editor
              height="480px"
              language="html"
              theme="vs-dark"
              value={htmlValue}
              onChange={(value: string | undefined) => setHtmlValue(value ?? "")}
              options={editorOptions}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
