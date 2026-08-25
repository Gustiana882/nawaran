import * as React from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { PageToast, useToast } from "@/components/page-toast"
import type { TemplateItem } from "@/types/cms"
import {
  GlobeIcon,
  LayoutTemplateIcon,
  SaveIcon,
  Loader2Icon,
  AlertCircleIcon,
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
  const { toast, showToast, dismissToast } = useToast()

  const [name, setName] = React.useState(template ? `${template.name} Website` : "")
  const [description, setDescription] = React.useState(template?.description ?? "")
  const [domain, setDomain] = React.useState("")
  const [isSaving, setIsSaving] = React.useState(false)

  React.useEffect(() => {
    if (!template) return
    setName(`${template.name} Website`)
    setDescription(template.description)
  }, [template])

  async function handleSave() {
    if (!name.trim()) { showToast("error", "Nama website wajib diisi"); return }
    if (!template) { showToast("error", "Pilih template terlebih dahulu"); return }

    setIsSaving(true)
    const result = await onSave({
      name: name.trim(),
      description: description.trim(),
      domain: domain.trim(),
      template_uuid: template.id,
    })
    setIsSaving(false)

    if (result.ok) {
      showToast("success", "Website berhasil dibuat")
    } else {
      showToast("error", result.message || "Gagal membuat website")
    }
  }

  return (
    <div className="flex flex-1 flex-col bg-muted/20">
      <PageToast message={toast} onDismiss={dismissToast} />

      {/* Header */}
      <div className="flex shrink-0 items-center justify-between gap-4 border-b bg-background px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <GlobeIcon className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-sm font-semibold leading-tight">Buat Website</h1>
            <p className="text-xs text-muted-foreground">Website baru dari template yang dipilih.</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2Icon className="h-3.5 w-3.5 animate-spin" /> : <SaveIcon className="h-3.5 w-3.5" />}
          {isSaving ? "Menyimpan..." : "Simpan"}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-xl space-y-4">
          {/* Template reference card */}
          <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <LayoutTemplateIcon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Template</p>
              <p className="truncate text-sm font-medium">
                {template ? template.name : (
                  <span className="flex items-center gap-1.5 text-destructive">
                    <AlertCircleIcon className="h-3.5 w-3.5" />
                    Belum ada template dipilih
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Form */}
          <div className="space-y-4 rounded-lg border bg-card p-4">
            <div className="space-y-1.5">
              <Label htmlFor="ws-name" className="text-xs font-medium">
                Nama <span className="text-destructive">*</span>
              </Label>
              <Input
                id="ws-name"
                placeholder="mis. Landing Page Produk A"
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
              <p className="text-xs text-muted-foreground">Tanpa https:// — kosongkan jika belum ada.</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ws-desc" className="text-xs font-medium">Deskripsi</Label>
              <Textarea
                id="ws-desc"
                placeholder="Deskripsi singkat tentang website ini"
                rows={5}
                className="resize-none"
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
