import { authorizedFetch } from "@/lib/api-client"
import { appConfig } from "@/lib/config"

export type ProxyItem = {
  id: string
  domain: string
  upstream: string
  createdAt?: string
  updatedAt?: string
}

export type ProxySaveInput = {
  domain: string
  upstream: string
}

type ProxyApiRecord = {
  "@id"?: string
  id?: string
  match?: Array<{ host?: string[] }>
  handle?: Array<{ upstreams?: Array<{ dial?: string }> }>
}

const API_BASE_URL = appConfig.apiBaseUrl

function toProxyItem(record: ProxyApiRecord): ProxyItem {
  const id = record["@id"] || record.id || ""
  const domain =
    record.match
      ?.flatMap((item) => item.host ?? [])
      .find((host) => typeof host === "string" && host.trim().length > 0) ?? ""
  const upstream =
    record.handle
      ?.flatMap((item) => item.upstreams ?? [])
      .map((item) => item.dial)
      .find((dial) => typeof dial === "string" && dial.trim().length > 0) ?? ""

  return {
    id,
    domain,
    upstream,
  }
}

export async function listProxies(): Promise<ProxyItem[]> {
  const res = await authorizedFetch(`${API_BASE_URL}/proxies`)

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string }
    throw new Error(body.message || "Gagal mengambil daftar proxy")
  }

  const body = (await res.json()) as ProxyApiRecord[]
  return body.map((record) => toProxyItem(record))
}

export async function createProxy(input: ProxySaveInput): Promise<ProxyItem> {
  const res = await authorizedFetch(`${API_BASE_URL}/proxies`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })

  const body = (await res.json()) as { ok?: boolean; id?: string; domain?: string; message?: string }
  if (!res.ok || !body.ok || !body.id) {
    throw new Error(body.message || "Gagal membuat proxy")
  }

  return {
    id: body.id,
    domain: input.domain,
    upstream: input.upstream,
  }
}

export async function getProxyByID(id: string): Promise<ProxyItem> {
  const res = await authorizedFetch(`${API_BASE_URL}/proxies/${id}`)
  const body = (await res.json()) as ProxyApiRecord
  if (!res.ok) {
    throw new Error("Proxy tidak ditemukan")
  }

  return toProxyItem(body)
}

export async function updateProxy(id: string, input: ProxySaveInput): Promise<ProxyItem> {
  const res = await authorizedFetch(`${API_BASE_URL}/proxies/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })

  const body = (await res.json()) as { ok?: boolean; message?: string }
  if (!res.ok || !body.ok) {
    throw new Error(body.message || "Gagal memperbarui proxy")
  }

  return {
    id,
    domain: input.domain,
    upstream: input.upstream,
  }
}

export async function deleteProxy(id: string): Promise<void> {
  const res = await authorizedFetch(`${API_BASE_URL}/proxies/${id}`, {
    method: "DELETE",
  })

  const body = (await res.json()) as { ok?: boolean; message?: string }
  if (!res.ok || !body.ok) {
    throw new Error(body.message || "Gagal menghapus proxy")
  }
}
