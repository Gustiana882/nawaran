import * as React from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { TemplateItem } from "@/types/cms"
import {
  GlobeIcon,
  LayoutTemplateIcon,
  CheckCircle2Icon,
  AlertCircleIcon,
  SaveIcon,
} from "lucide-react"

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
    <div className="flex flex-1 flex-col bg-muted/20">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 border-b bg-background px-3 py-2">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <GlobeIcon className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-base font-semibold leading-tight">Add Website</h1>
            <p className="text-xs text-muted-foreground">
              Buat website baru dari template yang dipilih.
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          <SaveIcon />
          {isSaving ? "Menyimpan..." : "Save"}
        </Button>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        {saveMessage && (
          <div
            className={
              saveMessage.type === "success"
                ? "flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-300"
                : "flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
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

        <div className="max-w-xl space-y-3">
          {/* Selected template reference */}
          <div className="flex items-center gap-2.5 rounded-md border bg-card p-3 text-card-foreground">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <LayoutTemplateIcon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Template</p>
              <p className="truncate text-sm font-medium">
                {template ? template.name : "Belum ada template dipilih"}
              </p>
            </div>
          </div>

          {/* Form */}
          <div className="space-y-3 rounded-md border bg-card p-3 text-card-foreground">
            <div className="space-y-1.5">
              <Label htmlFor="website-name">Nama</Label>
              <Input id="website-name" value={name} onChange={(e) => setName(e.target.value)} />
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
                rows={5}
                value={description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}