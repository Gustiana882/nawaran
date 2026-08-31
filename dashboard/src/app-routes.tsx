import * as React from "react"
import { Navigate, Route, Routes, useNavigate, useParams, useSearchParams } from "react-router-dom"

import { createTemplate, deleteTemplate, getTemplateByID, listTemplates, updateTemplate } from "@/lib/templates-api"
import { createWebsite, deleteWebsite, listWebsites } from "@/lib/websites-api"
import { createProxy, deleteProxy, listProxies, updateProxy, type ProxyItem, type ProxySaveInput } from "@/lib/proxies-api"
import {
  createContainer,
  deleteContainer,
  listContainers,
  restartContainer,
  startContainer,
  stopContainer,
  type ContainerCreateInput,
  type ContainerItem,
} from "@/lib/containers-api"
import type { TemplateItem, WebsiteItem } from "@/types/cms"
import TemplateCreatePage, { type TemplateSavePayload } from "./pages/template-create"
import TemplateDetailPage from "./pages/template-detail"
import TemplatesPage from "./pages/templates"
import ProxiesPage from "./pages/proxies"
import WebsiteCreatePage, { type WebsiteSavePayload } from "./pages/website-create"
import WebsiteDetailPage from "./pages/website-detail"
import WebsiteEditPage from "./pages/website-edit"
import WebsitesPage from "./pages/websites"
import ContainersPage from "./pages/containers"

export default function AppRoutes() {
  const navigate = useNavigate()
  const [templates, setTemplates] = React.useState<TemplateItem[]>([])
  const [templatesLoading, setTemplatesLoading] = React.useState(true)
  const [templatesError, setTemplatesError] = React.useState<string | null>(null)
  const [websites, setWebsites] = React.useState<WebsiteItem[]>([])
  const [websitesLoading, setWebsitesLoading] = React.useState(true)
  const [websitesError, setWebsitesError] = React.useState<string | null>(null)
  const [proxies, setProxies] = React.useState<ProxyItem[]>([])
  const [proxiesLoading, setProxiesLoading] = React.useState(true)
  const [proxiesError, setProxiesError] = React.useState<string | null>(null)
  const [containers, setContainers] = React.useState<ContainerItem[]>([])
  const [containersLoading, setContainersLoading] = React.useState(true)
  const [containersError, setContainersError] = React.useState<string | null>(null)

  const loadTemplates = React.useCallback(async () => {
    setTemplatesLoading(true)
    setTemplatesError(null)
    try {
      setTemplates(await listTemplates())
    } catch (error) {
      setTemplatesError(error instanceof Error ? error.message : "Gagal mengambil template")
    } finally {
      setTemplatesLoading(false)
    }
  }, [])

  const loadWebsites = React.useCallback(async () => {
    setWebsitesLoading(true)
    setWebsitesError(null)
    try {
      setWebsites(await listWebsites())
    } catch (error) {
      setWebsitesError(error instanceof Error ? error.message : "Gagal mengambil website")
    } finally {
      setWebsitesLoading(false)
    }
  }, [])

  const loadProxies = React.useCallback(async () => {
    setProxiesLoading(true)
    setProxiesError(null)
    try {
      setProxies(await listProxies())
    } catch (error) {
      setProxiesError(error instanceof Error ? error.message : "Gagal mengambil proxy")
    } finally {
      setProxiesLoading(false)
    }
  }, [])

  const loadContainers = React.useCallback(async () => {
    setContainersLoading(true)
    setContainersError(null)
    try {
      setContainers(await listContainers())
    } catch (error) {
      setContainersError(error instanceof Error ? error.message : "Gagal mengambil container")
    } finally {
      setContainersLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void loadTemplates()
    void loadWebsites()
    void loadProxies()
    void loadContainers()
  }, [loadTemplates, loadWebsites, loadProxies, loadContainers])

  // ── Template handlers ──────────────────────────────────────────────────────

  async function onSaveTemplate(payload: TemplateSavePayload) {
    try {
      const created = await createTemplate(payload)
      setTemplates((prev) => [created, ...prev])
      navigate("/templates")
      return { ok: true as const }
    } catch (error) {
      return { ok: false as const, message: error instanceof Error ? error.message : "Gagal menyimpan template" }
    }
  }

  async function onUpdateTemplate(id: string, payload: TemplateSavePayload) {
    try {
      const updated = await updateTemplate(id, payload)
      setTemplates((prev) => prev.map((item) => (item.id === id ? updated : item)))
      navigate(`/templates/${id}`)
      return { ok: true as const }
    } catch (error) {
      return { ok: false as const, message: error instanceof Error ? error.message : "Gagal mengubah template" }
    }
  }

  async function onDeleteTemplate(id: string) {
    try {
      await deleteTemplate(id)
      setTemplates((prev) => prev.filter((item) => item.id !== id))
      return { ok: true as const }
    } catch (error) {
      return { ok: false as const, message: error instanceof Error ? error.message : "Gagal menghapus template" }
    }
  }

  // ── Website handlers ───────────────────────────────────────────────────────

  async function onSaveWebsite(payload: WebsiteSavePayload) {
    try {
      const created = await createWebsite(payload)
      setWebsites((prev) => [created, ...prev])
      navigate("/websites")
      return { ok: true as const }
    } catch (error) {
      return { ok: false as const, message: error instanceof Error ? error.message : "Gagal membuat website" }
    }
  }

  function onUpdateWebsiteState(id: string, updated: WebsiteItem) {
    setWebsites((prev) => prev.map((item) => (item.id === id ? updated : item)))
  }

  async function onDeleteWebsite(id: string) {
    try {
      await deleteWebsite(id)
      setWebsites((prev) => prev.filter((item) => item.id !== id))
      return { ok: true as const }
    } catch (error) {
      return { ok: false as const, message: error instanceof Error ? error.message : "Gagal menghapus website" }
    }
  }

  // ── Proxy handlers ────────────────────────────────────────────────────────

  async function onCreateProxy(payload: ProxySaveInput) {
    try {
      const created = await createProxy(payload)
      setProxies((prev) => [created, ...prev])
      return { ok: true as const }
    } catch (error) {
      return { ok: false as const, message: error instanceof Error ? error.message : "Gagal membuat proxy" }
    }
  }

  async function onUpdateProxy(id: string, payload: ProxySaveInput) {
    try {
      const updated = await updateProxy(id, payload)
      setProxies((prev) => prev.map((item) => (item.id === id ? { ...item, ...updated } : item)))
      return { ok: true as const }
    } catch (error) {
      return { ok: false as const, message: error instanceof Error ? error.message : "Gagal memperbarui proxy" }
    }
  }

  async function onDeleteProxy(id: string) {
    try {
      await deleteProxy(id)
      setProxies((prev) => prev.filter((item) => item.id !== id))
      return { ok: true as const }
    } catch (error) {
      return { ok: false as const, message: error instanceof Error ? error.message : "Gagal menghapus proxy" }
    }
  }

  async function onCreateContainer(payload: ContainerCreateInput) {
    try {
      const created = await createContainer(payload)
      setContainers((prev) => [created, ...prev])
      return { ok: true as const }
    } catch (error) {
      return { ok: false as const, message: error instanceof Error ? error.message : "Gagal membuat container" }
    }
  }

  async function onStartContainer(name: string) {
    try {
      await startContainer(name)
      setContainers((prev) => prev.map((item) => (item.name === name ? { ...item, state: "running", status: "Up" } : item)))
      return { ok: true as const }
    } catch (error) {
      return { ok: false as const, message: error instanceof Error ? error.message : "Gagal menjalankan container" }
    }
  }

  async function onStopContainer(name: string) {
    try {
      await stopContainer(name)
      setContainers((prev) => prev.map((item) => (item.name === name ? { ...item, state: "exited", status: "Exited" } : item)))
      return { ok: true as const }
    } catch (error) {
      return { ok: false as const, message: error instanceof Error ? error.message : "Gagal menghentikan container" }
    }
  }

  async function onRestartContainer(name: string) {
    try {
      await restartContainer(name)
      setContainers((prev) => prev.map((item) => (item.name === name ? { ...item, status: "Restarting" } : item)))
      return { ok: true as const }
    } catch (error) {
      return { ok: false as const, message: error instanceof Error ? error.message : "Gagal merestart container" }
    }
  }

  async function onDeleteContainer(name: string) {
    try {
      await deleteContainer(name)
      setContainers((prev) => prev.filter((item) => item.name !== name))
      return { ok: true as const }
    } catch (error) {
      return { ok: false as const, message: error instanceof Error ? error.message : "Gagal menghapus container" }
    }
  }

  // ── Inline route components ────────────────────────────────────────────────

  function WebsiteCreateRoute() {
    const [params] = useSearchParams()
    const templateId = params.get("templateId")
    const template = templateId ? templates.find((item) => item.id === templateId) : undefined
    return <WebsiteCreatePage template={template} onSave={onSaveWebsite} />
  }

  function TemplateEditRoute() {
    const { id } = useParams()
    const [template, setTemplate] = React.useState<TemplateItem | null>(null)
    const [isLoading, setIsLoading] = React.useState(true)

    React.useEffect(() => {
      let cancelled = false
      async function run() {
        if (!id) return
        const fromList = templates.find((item) => item.id === id)
        if (fromList) {
          setTemplate(fromList)
          setIsLoading(false)
          return
        }
        try {
          const fromAPI = await getTemplateByID(id)
          if (!cancelled) setTemplate(fromAPI)
        } finally {
          if (!cancelled) setIsLoading(false)
        }
      }
      void run()
      return () => { cancelled = true }
    }, [id])

    if (isLoading) {
      return (
        <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
          Memuat template...
        </div>
      )
    }
    if (!template) {
      return (
        <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
          Template tidak ditemukan.
        </div>
      )
    }

    return (
      <TemplateCreatePage
        mode="edit"
        initialTemplate={template}
        onSave={(payload) => onUpdateTemplate(template.id, payload)}
      />
    )
  }

  // ── Routes ─────────────────────────────────────────────────────────────────

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/templates" replace />} />

      {/* Templates */}
      <Route
        path="/templates"
        element={
          <TemplatesPage
            templates={templates}
            isLoading={templatesLoading}
            errorMessage={templatesError}
            onRetry={loadTemplates}
            onDelete={onDeleteTemplate}
          />
        }
      />
      <Route path="/templates/new" element={<TemplateCreatePage onSave={onSaveTemplate} />} />
      <Route path="/templates/:id/edit" element={<TemplateEditRoute />} />
      <Route
        path="/templates/:id"
        element={<TemplateDetailPage templates={templates} onDelete={onDeleteTemplate} />}
      />

      {/* Websites */}
      <Route
        path="/websites"
        element={
          <WebsitesPage
            websites={websites}
            isLoading={websitesLoading}
            errorMessage={websitesError}
            onRetry={loadWebsites}
            onDelete={onDeleteWebsite}
          />
        }
      />
      <Route path="/websites/new" element={<WebsiteCreateRoute />} />
      <Route
        path="/websites/:id/edit"
        element={<WebsiteEditPage websites={websites} onUpdate={onUpdateWebsiteState} />}
      />
      <Route
        path="/websites/:id"
        element={<WebsiteDetailPage websites={websites} onDelete={onDeleteWebsite} />}
      />

      {/* Proxy */}
      <Route
        path="/proxies"
        element={
          <ProxiesPage
            proxies={proxies}
            isLoading={proxiesLoading}
            errorMessage={proxiesError}
            onRetry={loadProxies}
            onCreate={onCreateProxy}
            onUpdate={onUpdateProxy}
            onDelete={onDeleteProxy}
          />
        }
      />

      {/* Containers */}
      <Route
        path="/containers"
        element={
          <ContainersPage
            containers={containers}
            isLoading={containersLoading}
            errorMessage={containersError}
            onRetry={loadContainers}
            onCreate={onCreateContainer}
            onStart={onStartContainer}
            onStop={onStopContainer}
            onRestart={onRestartContainer}
            onDelete={onDeleteContainer}
          />
        }
      />

      <Route path="*" element={<Navigate to="/templates" replace />} />
    </Routes>
  )
}
