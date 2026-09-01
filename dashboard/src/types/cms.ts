export interface TemplateItem {
  id: string
  name: string
  description: string
  data: unknown
  html: string
  createdAt: string
  updatedAt?: string
}

export interface WebsiteItem {
  id: string
  name: string
  description: string
  domain: string
  data: unknown
  html: string
  templateId?: string
  createdAt: string
  status?: string
}
