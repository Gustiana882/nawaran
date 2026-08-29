import type { WebsiteItem } from "@/types/cms"
import { authorizedFetch } from "@/lib/api-client"
import { appConfig } from "@/lib/config"

type WebsiteApiItem = {
  uuid: string
  id: number
  name: string
  description: string
  domain: string
  data: unknown
  html: string
  updated_at: string
}

type ListWebsitesResponse = {
  ok: boolean
  websites?: WebsiteApiItem[]
  message?: string
}

type CreateWebsiteResponse = {
  ok: boolean
  website?: WebsiteApiItem
  message?: string
}

type DeleteWebsiteResponse = {
  ok: boolean
  message?: string
}

type UpdateWebsiteResponse = {
  ok: boolean
  website?: WebsiteApiItem
  message?: string
}

export type WebsiteCreateInput = {
  name: string
  description: string
  domain: string
  template_uuid: string
}

export type WebsiteUpdateInput = {
  name: string
  description: string
  domain: string
  data: unknown
  html: string
}

const API_BASE_URL = appConfig.apiBaseUrl

function getDataValue(data: unknown, key: string): string {
  if (!data || typeof data !== "object" || Array.isArray(data)) return ""
  const value = (data as Record<string, unknown>)[key]
  return typeof value === "string" ? value : ""
}

function toWebsiteItem(item: WebsiteApiItem): WebsiteItem {
  return {
    id: item.uuid,
    name: item.name || getDataValue(item.data, "name") || getDataValue(item.data, "title") || `Website ${item.id}`,
    description: item.description || getDataValue(item.data, "description"),
    domain: item.domain || getDataValue(item.data, "domain"),
    data: item.data,
    html: item.html,
    createdAt: item.updated_at,
  }
}

function parseData(data: unknown): unknown {
  if (typeof data !== "string") return data
  try {
    return JSON.parse(data)
  } catch {
    return data
  }
}

export async function listWebsites(): Promise<WebsiteItem[]> {
  const res = await authorizedFetch(`${API_BASE_URL}/websites`)
  const body = (await res.json()) as ListWebsitesResponse
  if (!res.ok || !body.ok || !body.websites) {
    throw new Error(body.message || "Gagal mengambil daftar website")
  }
  return body.websites.map((item) => toWebsiteItem({ ...item, data: parseData(item.data) }))
}

export async function createWebsite(input: WebsiteCreateInput): Promise<WebsiteItem> {
  const res = await authorizedFetch(`${API_BASE_URL}/websites`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
  const body = (await res.json()) as CreateWebsiteResponse
  if (!res.ok || !body.ok || !body.website) {
    throw new Error(body.message || "Gagal membuat website")
  }

  return toWebsiteItem({
    ...body.website,
    data: parseData(body.website.data),
  })
}

export async function updateWebsite(id: string, input: WebsiteUpdateInput): Promise<WebsiteItem> {
  const res = await authorizedFetch(`${API_BASE_URL}/websites/${id}/update`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
  const body = (await res.json()) as UpdateWebsiteResponse
  if (!res.ok || !body.ok || !body.website) {
    throw new Error(body.message || "Gagal memperbarui website")
  }

  return toWebsiteItem({
    ...body.website,
    data: parseData(body.website.data),
  })
}

export async function deleteWebsite(id: string): Promise<void> {
  const res = await authorizedFetch(`${API_BASE_URL}/websites/${id}`, {
    method: "DELETE",
  })
  const body = (await res.json()) as DeleteWebsiteResponse
  if (!res.ok || !body.ok) {
    throw new Error(body.message || "Gagal menghapus website")
  }
}
