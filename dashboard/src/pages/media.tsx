import * as React from "react"
import { ImageIcon, RefreshCwIcon, TrashIcon, UploadCloudIcon, AlertCircleIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PageToast, useToast } from "@/components/page-toast"
import { deleteMedia, listMedia, publicMediaUrl, uploadMedia, type MediaFile } from "@/lib/media-api"

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

export default function MediaPage() {
  const [files, setFiles] = React.useState<MediaFile[]>([])
  const [loading, setLoading] = React.useState(true)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const { toast, showToast, dismissToast } = useToast()

  const load = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setFiles(await listMedia())
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Gagal mengambil media")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { void load() }, [load])

  async function onUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    if (!file.type.startsWith("image/")) {
      showToast("error", "File harus berupa gambar")
      return
    }
    setBusy(true)
    try {
      const uploaded = await uploadMedia(file)
      setFiles((current) => [uploaded, ...current])
      showToast("success", "Gambar berhasil diunggah")
    } catch (reason) {
      showToast("error", reason instanceof Error ? reason.message : "Gagal mengunggah gambar")
    } finally {
      setBusy(false)
    }
  }

  async function onDelete(file: MediaFile) {
    if (!confirm(`Hapus gambar "${file.name}"? Gambar tidak dapat dipulihkan.`)) return
    setBusy(true)
    try {
      await deleteMedia(file.name)
      setFiles((current) => current.filter((item) => item.name !== file.name))
      showToast("success", "Gambar berhasil dihapus")
    } catch (reason) {
      showToast("error", reason instanceof Error ? reason.message : "Gagal menghapus gambar")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col bg-muted/20">
      <PageToast message={toast} onDismiss={dismissToast} />
      <div className="flex items-center justify-between gap-4 border-b bg-background px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary"><ImageIcon className="h-4 w-4" /></div>
          <div><h1 className="text-sm font-semibold">Media</h1><p className="text-xs text-muted-foreground">Kelola gambar yang Anda unggah.</p></div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => void load()} disabled={loading} aria-label="Muat ulang"><RefreshCwIcon /></Button>
          <Button nativeButton={false} render={<label htmlFor="media-upload" />} disabled={busy}>
            <UploadCloudIcon /> Unggah gambar
          </Button>
          <Input id="media-upload" className="hidden" type="file" accept="image/*" onChange={onUpload} />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {error && <div className="mb-4 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"><AlertCircleIcon className="h-4 w-4" />{error}</div>}
        {!loading && !error && files.length === 0 && <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed bg-background/50 py-16 text-center"><ImageIcon className="h-8 w-8 text-muted-foreground" /><p className="text-sm text-muted-foreground">Belum ada gambar.</p></div>}
        {loading && <p className="text-sm text-muted-foreground">Memuat media...</p>}
        {!loading && !error && files.length > 0 && <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {files.map((file) => <article key={file.name} className="overflow-hidden rounded-lg border bg-card">
            <div className="aspect-video bg-muted"><img src={publicMediaUrl(file.url)} alt={file.name} className="h-full w-full object-cover" /></div>
            <div className="flex items-center justify-between gap-2 p-3"><div className="min-w-0"><p className="truncate text-xs font-medium" title={file.name}>{file.name}</p><p className="text-[11px] text-muted-foreground">{formatBytes(file.size)}</p></div><Button variant="destructive" size="icon" disabled={busy} onClick={() => void onDelete(file)} aria-label={`Hapus ${file.name}`}><TrashIcon /></Button></div>
          </article>)}
        </div>}
      </div>
    </div>
  )
}