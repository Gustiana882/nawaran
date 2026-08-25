import * as React from "react"
import { Navigate, Route, Routes, useNavigate, useParams, useSearchParams } from "react-router-dom"

import { createTemplate, deleteTemplate, getTemplateByID, listTemplates, updateTemplate } from "@/lib/templates-api"
import { createWebsite, deleteWebsite, listWebsites } from "@/lib/websites-api"
import type { TemplateItem, WebsiteItem } from "@/types/cms"
import TemplateCreatePage, { type TemplateSavePayload } from "./pages/template-create"
import TemplateDetailPage from "./pages/template-detail"
import TemplatesPage from "./pages/templates"
import WebsiteCreatePage, { type WebsiteSavePayload } from "./pages/website-create"
import WebsiteDetailPage from "./pages/website-detail"
import WebsiteEditPage from "./pages/website-edit"
import WebsitesPage from "./pages/websites"

export default function AppRoutes() {
  const navigate = useNavigate()
  const [templates, setTemplates] = React.useState<TemplateItem[]>([])
  const [templatesLoading, setTemplatesLoading] = React.useState(true)
  const [templatesError, setTemplatesError] = React.useState<string | null>(null)
  const [websites, setWebsites] = React.useState<WebsiteItem[]>([])
  const [websitesLoading, setWebsitesLoading] = React.useState(true)
  const [websitesError, setWebsitesError] = React.useState<string | null>(null)

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

  React.useEffect(() => {
    void loadTemplates()
    void loadWebsites()
  }, [loadTemplates, loadWebsites])

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
      return () => {
        cancelled = true
      }
    }, [id])

    if (isLoading) return <div className="px-4 text-sm text-muted-foreground">Memuat template...</div>
    if (!template) return <div className="px-4 text-sm text-muted-foreground">Template tidak ditemukan.</div>

    return <TemplateCreatePage mode="edit" initialTemplate={template} onSave={(payload) => onUpdateTemplate(template.id, payload)} />
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/templates" replace />} />
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
      <Route path="/templates/:id" element={<TemplateDetailPage templates={templates} onDelete={onDeleteTemplate} />} />
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
      <Route path="/websites/:id" element={<WebsiteDetailPage websites={websites} />} />
      <Route path="*" element={<Navigate to="/templates" replace />} />
    </Routes>
  )
}
