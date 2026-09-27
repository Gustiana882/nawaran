import { authorizedFetch } from "@/lib/api-client"
import { appConfig } from "@/lib/config"

export type MediaFile = {
  name: string
  url: string
  size: number
  content_type: string
  created_at: string
}

const apiOrigin = appConfig.apiBaseUrl.replace(/\/api\/?$/, "")

export function publicMediaUrl(url: string) {
  if (/^https?:\/\//i.test(url)) return url
  return `${apiOrigin}${url}`
}

export async function listMedia() {
  const response = await authorizedFetch(`${appConfig.apiBaseUrl}/upload`)
  if (!response.ok) throw new Error("Gagal mengambil media")
  return (await response.json()) as MediaFile[]
}

export async function uploadMedia(file: File) {
  const form = new FormData()
  form.append("file", file)
  const response = await authorizedFetch(`${appConfig.apiBaseUrl}/upload`, { method: "POST", body: form })
  if (!response.ok) throw new Error((await response.text()) || "Gagal mengunggah gambar")
  return (await response.json()) as MediaFile
}

export async function deleteMedia(name: string) {
  const response = await authorizedFetch(`${appConfig.apiBaseUrl}/upload/${encodeURIComponent(name)}`, { method: "DELETE" })
  if (!response.ok) throw new Error((await response.text()) || "Gagal menghapus gambar")
}