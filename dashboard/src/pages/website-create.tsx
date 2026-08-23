import * as React from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { TemplateItem } from "@/types/cms"

export interface WebsiteSavePayload {
  name: string
  description: string
  domain: string
  template_uuid: string
}

interface WebsiteCreatePageProps {
  template?: TemplateItem
  onSave: (payload: WebsiteSavePayload) => Promise<{ ok: boolean; message?: string }>
}

export default function WebsiteCreatePage({ template, onSave }: WebsiteCreatePageProps) {
  const [name, setName] = React.useState(template ? `${template.name} Website` : "")
  const [description, setDescription] = React.useState(template?.description ?? "")
  const [domain, setDomain] = React.useState("")
  const [isSaving, setIsSaving] = React.useState(false)
  const [saveMessage, setSaveMessage] = React.useState<
    { type: "success" | "error"; text: string } | null
  >(null)

  React.useEffect(() => {
    if (!template) return
    setName(`${template.name} Website`)
    setDescription(template.description)
  }, [template])

  async function handleSave() {
    setSaveMessage(null)

    if (!name.trim()) {
      setSaveMessage({ type: "error", text: "Nama website wajib diisi" })
      return
    }

    if (!template) {
      setSaveMessage({ type: "error", text: "Pilih template terlebih dahulu" })
      return
    }

    setIsSaving(true)
    const result = await onSave({
      name: name.trim(),
      description: description.trim(),
      domain: domain.trim(),
      template_uuid: template.id,
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

      <div className="max-w-xl space-y-4">
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
      </div>
    </div>
  )
}
