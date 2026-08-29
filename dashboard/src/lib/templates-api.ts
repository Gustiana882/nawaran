import type { TemplateItem } from "@/types/cms"
import { authorizedFetch } from "@/lib/api-client"

type TemplateApiItem = {
  id: string
  name: string
  description: string
  data: unknown
  html: string
  created_at: string
  updated_at: string
}

type ListTemplatesResponse = {
  ok: boolean
  templates?: TemplateApiItem[]
  message?: string
}

type SingleTemplateResponse = {
  ok: boolean
  template?: TemplateApiItem
  message?: string
}

export type TemplateSaveInput = {
  name: string
  description: string
  data: unknown
  html: string
}

function toTemplateItem(item: TemplateApiItem): TemplateItem {
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    data: item.data,
    html: item.html,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  }
}

const API_BASE_URL = "https://api.nawaran.id/api" // Replace with your actual API base URL

export async function listTemplates(): Promise<TemplateItem[]> {
  const res = await authorizedFetch(`${API_BASE_URL}/templates`)
  const body = (await res.json()) as ListTemplatesResponse
  if (!res.ok || !body.ok || !body.templates) {
    throw new Error(body.message || "Gagal mengambil template")
  }
  return body.templates.map(toTemplateItem)
}

export async function getTemplateByID(id: string): Promise<TemplateItem> {
  const res = await authorizedFetch(`${API_BASE_URL}/templates/${id}`)
  const body = (await res.json()) as SingleTemplateResponse
  if (!res.ok || !body.ok || !body.template) {
    throw new Error(body.message || "Template tidak ditemukan")
  }
  return toTemplateItem(body.template)
}

export async function createTemplate(input: TemplateSaveInput): Promise<TemplateItem> {
  const res = await authorizedFetch(`${API_BASE_URL}/templates`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })

  const body = (await res.json()) as SingleTemplateResponse
  if (!res.ok || !body.ok || !body.template) {
    throw new Error(body.message || "Gagal membuat template")
  }
  return toTemplateItem(body.template)
}

export async function updateTemplate(id: string, input: TemplateSaveInput): Promise<TemplateItem> {
  const res = await authorizedFetch(`${API_BASE_URL}/templates/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })

  const body = (await res.json()) as SingleTemplateResponse
  if (!res.ok || !body.ok || !body.template) {
    throw new Error(body.message || "Gagal mengubah template")
  }
  return toTemplateItem(body.template)
}

export async function deleteTemplate(id: string): Promise<void> {
  const res = await authorizedFetch(`${API_BASE_URL}/templates/${id}`, { method: "DELETE" })
  if (!res.ok) {
    throw new Error("Gagal menghapus template")
  }
}
