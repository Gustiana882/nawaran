import * as React from "react"
import Editor from "@monaco-editor/react"
import { useParams } from "react-router-dom"

import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { WebsiteItem } from "@/types/cms"

interface WebsiteDetailPageProps {
  websites: WebsiteItem[]
}

const editorOptions = {
  minimap: { enabled: false },
  fontSize: 13,
  scrollBeyondLastLine: false,
  automaticLayout: true,
  readOnly: true,
  tabSize: 2,
} as const

export default function WebsiteDetailPage({ websites }: WebsiteDetailPageProps) {
  const { id } = useParams()
  const website = React.useMemo(() => websites.find((item) => item.id === id), [websites, id])

  if (!website) {
    return <div className="px-4 text-sm text-muted-foreground">Website tidak ditemukan.</div>
  }

  return (
    <div className="flex flex-1 flex-col gap-4 px-4">
      <div>
        <h1 className="text-xl font-semibold">{website.name}</h1>
        <p className="text-sm text-muted-foreground">{website.description || "Tanpa deskripsi"}</p>
      </div>

      <Tabs defaultValue="detail" className="flex flex-1 flex-col gap-4">
        <TabsList>
          <TabsTrigger value="detail">Detail</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
          <TabsTrigger value="html">HTML</TabsTrigger>
        </TabsList>

        <TabsContent value="detail" className="space-y-2">
          <Label>Nama Website</Label>
          <div className="rounded-md border px-3 py-2 text-sm">{website.name}</div>
          <Label>Domain</Label>
          <div className="rounded-md border px-3 py-2 text-sm">{website.domain || "-"}</div>
          <Label>Deskripsi</Label>
          <div className="rounded-md border px-3 py-2 text-sm text-muted-foreground">{website.description || "-"}</div>
        </TabsContent>

        <TabsContent value="data" className="space-y-2">
          <Label>Data (JSON)</Label>
          <div className="overflow-hidden rounded-md border">
            <Editor
              height="480px"
              language="json"
              theme="vs-dark"
              value={JSON.stringify(website.data, null, 2)}
              options={editorOptions}
            />
          </div>
        </TabsContent>

        <TabsContent value="html" className="space-y-2">
          <Label>HTML</Label>
          <div className="overflow-hidden rounded-md border">
            <Editor
              height="480px"
              language="html"
              theme="vs-dark"
              value={website.html}
              options={editorOptions}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
