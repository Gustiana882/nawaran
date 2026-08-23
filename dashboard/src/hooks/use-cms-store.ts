import * as React from "react"

import type { TemplateItem, WebsiteItem } from "@/types/cms"

const TEMPLATES_KEY = "dashboard.templates.v1"
const WEBSITES_KEY = "dashboard.websites.v1"

const defaultTemplate: TemplateItem = {
  id: "tpl-default",
  name: "Landing Dasar",
  description: "Template landing page basic untuk mulai cepat",
  data: {
    title: "Judul Halaman",
    subtitle: "Subjudul",
    price: "Rp 199.000",
  },
  html: `<!doctype html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{{ .title }}</title>
  </head>
  <body>
    <h1>{{ .title }}</h1>
    <p>{{ .subtitle }}</p>
    <strong>{{ .price }}</strong>
  </body>
</html>`,
  createdAt: new Date().toISOString(),
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function useCmsStore() {
  const [templates, setTemplates] = React.useState<TemplateItem[]>(() =>
    safeParse<TemplateItem[]>(localStorage.getItem(TEMPLATES_KEY), [defaultTemplate])
  )
  const [websites, setWebsites] = React.useState<WebsiteItem[]>(() =>
    safeParse<WebsiteItem[]>(localStorage.getItem(WEBSITES_KEY), [])
  )

  React.useEffect(() => {
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates))
  }, [templates])

  React.useEffect(() => {
    localStorage.setItem(WEBSITES_KEY, JSON.stringify(websites))
  }, [websites])

  const createTemplate = React.useCallback(
    (input: Omit<TemplateItem, "id" | "createdAt">) => {
      const next: TemplateItem = {
        id: uid("tpl"),
        createdAt: new Date().toISOString(),
        ...input,
      }
      setTemplates((prev) => [next, ...prev])
      return next
    },
    []
  )

  const createWebsite = React.useCallback(
    (input: Omit<WebsiteItem, "id" | "createdAt">) => {
      const next: WebsiteItem = {
        id: uid("web"),
        createdAt: new Date().toISOString(),
        ...input,
      }
      setWebsites((prev) => [next, ...prev])
      return next
    },
    []
  )

  return {
    templates,
    websites,
    createTemplate,
    createWebsite,
  }
}
