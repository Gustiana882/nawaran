import { AppSidebar } from "@/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import * as React from "react"
import { Navigate, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom"

import { useCmsStore } from "@/hooks/use-cms-store"
import { createTemplate, deleteTemplate, getTemplateByID, listTemplates, updateTemplate } from "@/lib/templates-api"
import type { TemplateItem } from "@/types/cms"
import TemplateCreatePage, { type TemplateSavePayload } from "./pages/template-create"
import TemplateDetailPage from "./pages/template-detail"
import TemplatesPage from "./pages/templates"
import WebsiteCreatePage, { type WebsiteSavePayload } from "./pages/website-create"
import WebsiteDetailPage from "./pages/website-detail"
import WebsitesPage from "./pages/websites"

function AppRoutes() {
  const { websites, createWebsite } = useCmsStore()
  const navigate = useNavigate()
  const [templates, setTemplates] = React.useState<TemplateItem[]>([])
  const [templatesLoading, setTemplatesLoading] = React.useState(true)
  const [templatesError, setTemplatesError] = React.useState<string | null>(null)

  const loadTemplates = React.useCallback(async () => {
    setTemplatesLoading(true)
    setTemplatesError(null)
    try {
      const items = await listTemplates()
      setTemplates(items)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal mengambil template"
      setTemplatesError(message)
    } finally {
      setTemplatesLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void loadTemplates()
  }, [loadTemplates])

  async function onSaveTemplate(payload: TemplateSavePayload) {
    try {
      const created = await createTemplate(payload)
      setTemplates((prev) => [created, ...prev])
      navigate("/templates")
      return { ok: true as const }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal menyimpan template"
      return { ok: false as const, message }
    }
  }

  async function onUpdateTemplate(id: string, payload: TemplateSavePayload) {
    try {
      const updated = await updateTemplate(id, payload)
      setTemplates((prev) => prev.map((item) => (item.id === id ? updated : item)))
      navigate(`/templates/${id}`)
      return { ok: true as const }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal mengubah template"
      return { ok: false as const, message }
    }
  }

  async function onDeleteTemplate(id: string) {
    try {
      await deleteTemplate(id)
      setTemplates((prev) => prev.filter((item) => item.id !== id))
      return { ok: true as const }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal menghapus template"
      return { ok: false as const, message }
    }
  }

  async function onSaveWebsite(payload: WebsiteSavePayload) {
    createWebsite(payload)
    navigate("/websites")
    return { ok: true as const }
  }

  function WebsiteCreateRoute() {
    const [params] = useSearchParams()
    const templateId = params.get("templateId")
    const template: TemplateItem | undefined = templateId
      ? templates.find((item) => item.id === templateId)
      : undefined
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

    if (isLoading) {
      return <div className="px-4 text-sm text-muted-foreground">Memuat template...</div>
    }
    if (!template) {
      return <div className="px-4 text-sm text-muted-foreground">Template tidak ditemukan.</div>
    }

    return (
      <TemplateCreatePage
        mode="edit"
        initialTemplate={template}
        onSave={(payload) => onUpdateTemplate(template.id, payload)}
      />
    )
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
      <Route path="/websites" element={<WebsitesPage websites={websites} />} />
      <Route path="/websites/new" element={<WebsiteCreateRoute />} />
      <Route path="/websites/:id" element={<WebsiteDetailPage websites={websites} />} />
      <Route path="*" element={<Navigate to="/templates" replace />} />
    </Routes>
  )
}

function HeaderBreadcrumb() {
  const location = useLocation()
  const params = useParams()

  const parts = location.pathname.split("/").filter(Boolean)
  const section = parts[0] || "dashboard"
  const page = parts[1] || "list"

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem className="hidden md:block">
          <BreadcrumbLink href="#">CMS</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator className="hidden md:block" />
        <BreadcrumbItem className="hidden md:block">
          <BreadcrumbPage>{section}</BreadcrumbPage>
        </BreadcrumbItem>
        <BreadcrumbSeparator className="hidden md:block" />
        <BreadcrumbItem>
          <BreadcrumbPage>{params.id ? `${page}:${params.id}` : page}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  )
}

export default function Page() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center gap-2 transition-[width,height] ease-linear">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <HeaderBreadcrumb />
          </div>
        </header>
        <AppRoutes />
      </SidebarInset>
    </SidebarProvider>
  )
}
