import { authorizedFetch } from "@/lib/api-client"
import { appConfig } from "@/lib/config"

export type ContainerItem = {
  id: string
  name: string
  image: string
  state: string
  status: string
  ports: string[]
  createdAt?: string
}

export type ContainerCreateInput = {
  name?: string
  image: string
  command?: string[]
  env?: Record<string, string>
}

type ContainerApiRecord = {
  Id?: string
  Names?: string[]
  Image?: string
  State?: string
  Status?: string
  Ports?: Array<{
    IP?: string
    PrivatePort?: number
    PublicPort?: number
    Type?: string
    host_ip?: string
    host_port?: number
    protocol?: string
    container_port?: number
  }>
  Created?: number | string
}

const API_BASE_URL = appConfig.apiBaseUrl

function normalizeDate(value: unknown): string | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    const normalized = value > 1e12 ? value : value * 1000
    const date = new Date(normalized)
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
  }

  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed) return undefined

    const asNumber = Number(trimmed)
    if (Number.isFinite(asNumber)) {
      const normalized = asNumber > 1e12 ? asNumber : asNumber * 1000
      const date = new Date(normalized)
      if (!Number.isNaN(date.getTime())) return date.toISOString()
    }

    const date = new Date(trimmed)
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
  }

  return undefined
}

function toContainerItem(record: ContainerApiRecord): ContainerItem {
  const id = record.Id || ""
  const name = (record.Names ?? []).map((item) => item.replace(/^\/+/, ""))[0] || id || "unknown"
  const ports = (record.Ports ?? [])
    .map((port) => {
      const hostPort =
        typeof port.host_port === "number"
          ? port.host_port
          : typeof port.PublicPort === "number"
            ? port.PublicPort
            : typeof port.container_port === "number"
              ? port.container_port
              : undefined

      const ip = port.host_ip ?? port.IP ?? "0.0.0.0"
      const protocol = port.protocol ?? port.Type ?? "tcp"

      if (typeof hostPort !== "number" || !Number.isFinite(hostPort)) return ""
      return `${ip}:${hostPort}/${protocol}`
    })
    .filter(Boolean)

  return {
    id,
    name,
    image: record.Image || "-",
    state: record.State || "unknown",
    status: record.Status || "-",
    ports,
    createdAt: normalizeDate(record.Created),
  }
}

export async function listContainers(): Promise<ContainerItem[]> {
  const res = await authorizedFetch(`${API_BASE_URL}/containers`)

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string }
    throw new Error(body.message || "Gagal mengambil daftar container")
  }

  const body = (await res.json()) as ContainerApiRecord[]
  return body.map((record) => toContainerItem(record))
}

export async function createContainer(input: ContainerCreateInput): Promise<ContainerItem> {
  const payload = {
    name: input.name?.trim() || undefined,
    image: input.image.trim(),
    command: input.command ?? [],
    env: input.env ?? {},
  }

  const res = await authorizedFetch(`${API_BASE_URL}/containers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  const body = (await res.json().catch(() => ({}))) as { Id?: string; name?: string; message?: string }

  if (!res.ok || !body.Id) {
    throw new Error(body.message || "Gagal membuat container")
  }

  return {
    id: body.Id,
    name: (input.name || body.name || "container").trim() || "container",
    image: input.image.trim(),
    state: "created",
    status: "Created",
    ports: [],
  }
}

export async function startContainer(name: string): Promise<void> {
  const res = await authorizedFetch(`${API_BASE_URL}/containers/${encodeURIComponent(name)}/start`, {
    method: "POST",
  })

  const body = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string }
  if (!res.ok || body.ok === false) {
    throw new Error(body.message || "Gagal menjalankan container")
  }
}

export async function stopContainer(name: string): Promise<void> {
  const res = await authorizedFetch(`${API_BASE_URL}/containers/${encodeURIComponent(name)}/stop`, {
    method: "POST",
  })

  const body = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string }
  if (!res.ok || body.ok === false) {
    throw new Error(body.message || "Gagal menghentikan container")
  }
}

export async function restartContainer(name: string): Promise<void> {
  const res = await authorizedFetch(`${API_BASE_URL}/containers/${encodeURIComponent(name)}/restart`, {
    method: "POST",
  })

  const body = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string }
  if (!res.ok || body.ok === false) {
    throw new Error(body.message || "Gagal merestart container")
  }
}

export async function deleteContainer(name: string): Promise<void> {
  const res = await authorizedFetch(`${API_BASE_URL}/containers/${encodeURIComponent(name)}?force=true`, {
    method: "DELETE",
  })

  const body = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string }
  if (!res.ok || body.ok === false) {
    throw new Error(body.message || "Gagal menghapus container")
  }
}
