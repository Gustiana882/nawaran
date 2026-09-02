import * as React from "react"

import type { TemplateItem, WebsiteItem } from "@/types/cms"

const TEMPLATES_KEY = "dashboard.templates.v1"
const WEBSITES_KEY = "dashboard.websites.v1"

const defaultTemplate: TemplateItem = {
  id: "tpl-default",
  name: "Landing Dasar",
  description: "Template landing page basic untuk mulai cepat",
  data: {
    title: "Judul Halaman"
  },
  html: `<!doctype html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{{ .title }}</title>
  {{ range .styles }}
  <link rel="stylesheet" href="{{ . }}">
  {{ end }}
  <style>
    * {box-sizing: border-box;}
    body {margin: 0; font-family: Arial, sans-serif; color: #1f2937; background: #f8fafc; line-height: 1.6;}
    header {padding: 80px 24px; text-align: center; background: #fff; border-bottom: 1px solid #e5e7eb;}
    header h1 {margin: 0 0 16px; font-size: 48px; line-height: 1.1;}
    header p {margin: 0; color: #64748b; font-size: 18px;}
    section {width: 100%; max-width: 1100px; margin: 0 auto; padding: 70px 24px;}
    .feature-grid {display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px;}
    .feature-item {padding: 28px; background: #fff; border: 1px solid #e5e7eb; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,.04);}
    .feature-item h2 {margin: 0 0 10px; font-size: 22px;}
    .feature-item p {margin: 0; color: #64748b;}
    .benefits {display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px;}
    .benefit-item {padding: 20px 24px; background: #fff; border: 1px solid #e5e7eb; border-radius: 16px;}
    .stats {display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px; text-align: center;}
    .stat-item {padding: 28px; background: #fff; border: 1px solid #e5e7eb; border-radius: 16px;}
    .stat-value {display: block; font-size: 36px; line-height: 1.2;}
    .stat-label {color: #64748b;}
    .items {padding-left: 0; list-style: none;}
    .item {padding: 16px 20px; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; margin-bottom: 12px;}
    @media (max-width: 768px) {
      header {padding: 60px 20px;}
      header h1 {font-size: 36px;}
      section {padding: 50px 20px;}
      .feature-grid, .benefits, .stats {grid-template-columns: 1fr;}
    }
  </style>
</head>
<body>
  <!-- Single text field -->
  <header>
    <h1 data-editor="text" data-name="title">{{ .title }}</h1>
    <p data-editor="text" data-name="subtitle">Deskripsi website</p>
  </header>
  <!-- Collection: multiple fields -->
  <section data-editor-collection="features" data-editor-add-label="+ Tambah fitur">
    <article class="feature-grid" data-editor-item data-item-id="0">
      <h2 data-editor="text" data-name="title">Fitur Pertama</h2>
      <p data-editor="text" data-name="description">Deskripsi fitur pertama</p>
    </article>
    <article class="feature-grid" data-editor-item data-item-id="1">
      <h2 data-editor="text" data-name="title">Fitur Kedua</h2>
      <p data-editor="text" data-name="description">Deskripsi fitur kedua</p>
    </article>
  </section>
  <!-- Collection: array string -->
  <section class="benefits" data-editor-collection="benefits" data-editor-add-label="+ Tambah benefit">
    <div class="benefit-item" data-editor-item data-item-id="0">
      <span data-editor="text" data-name="text">Gratis konsultasi</span>
    </div>
    <div class="benefit-item" data-editor-item data-item-id="1">
      <span data-editor="text" data-name="text">Dukungan 24/7</span>
    </div>
  </section>
  <!-- Collection with multiple fields -->
  <section class="stats" data-editor-collection="stats" data-editor-add-label="+ Tambah statistik">
    <div class="stat-item" data-editor-item data-item-id="0">
      <strong class="stat-value" data-editor="text" data-name="value">500+</strong>
      <span class="stat-label" data-editor="text" data-name="label">Pengguna</span>
    </div>
  </section>
  <!-- UL collection -->
  <ul class="items" data-editor-collection="items" data-editor-add-label="+ Tambah item">
    <li class="item" data-editor-item data-item-id="0">
      <span data-editor="text" data-name="text">Item pertama</span>
    </li>
  </ul>
  {{ range .scripts }}
  <script src="{{ . }}"></script>
  {{ end }}
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
