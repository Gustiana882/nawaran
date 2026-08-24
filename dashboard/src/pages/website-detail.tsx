import * as React from "react"
import Editor from "@monaco-editor/react"
import { useParams } from "react-router-dom"

import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { WebsiteItem } from "@/types/cms"
import { GlobeIcon, FileTextIcon } from "lucide-react"

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
  padding: { top: 12 },
} as const

/** Keeps Monaco's theme in sync with the app's light/dark mode (class-based). */
function useMonacoTheme() {
  const [theme, setTheme] = React.useState<"vs-dark" | "light">(() =>
    document.documentElement.classList.contains("dark") ? "vs-dark" : "light",
  )

  React.useEffect(() => {
    const root = document.documentElement
    const observer = new MutationObserver(() => {
      setTheme(root.classList.contains("dark") ? "vs-dark" : "light")
    })
    observer.observe(root, { attributes: true, attributeFilter: ["class"] })
    return () => observer.disconnect()
  }, [])

  return theme
}

export default function WebsiteDetailPage({ websites }: WebsiteDetailPageProps) {
  const { id } = useParams()
  const website = React.useMemo(() => websites.find((item) => item.id === id), [websites, id])
  const monacoTheme = useMonacoTheme()

  if (!website) {
    return (
      <div className="flex flex-1 items-center justify-center p-4 text-sm text-muted-foreground">
        Website tidak ditemukan.
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 border-b bg-background px-4 py-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <GlobeIcon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold leading-tight">{website.name}</h1>
          <p className="truncate text-xs text-muted-foreground">
            {website.description || "Tanpa deskripsi"}
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="grid flex-1 grid-cols-1 gap-3 overflow-hidden p-3 xl:grid-cols-[320px_1fr]">
        {/* Info panel */}
        <div className="rounded-md border bg-card p-3 text-card-foreground xl:overflow-y-auto">
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Nama Website</Label>
              <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">{website.name}</div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Domain</Label>
              {website.domain ? (
                <a
                  href={`https://${website.domain}`}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-md border bg-muted/30 px-3 py-2 text-sm text-primary hover:underline"
                >
                  {website.domain}
                </a>
              ) : (
                <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">-</div>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Deskripsi</Label>
              <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                {website.description || "-"}
              </div>
            </div>
          </div>
        </div>

        {/* Code panel */}
        <Tabs defaultValue="html" className="flex min-h-0 flex-col gap-2">
          <TabsList className="w-fit">
            <TabsTrigger value="data">
              <FileTextIcon className="h-3.5 w-3.5" />
              Data
            </TabsTrigger>
            <TabsTrigger value="html">
              <FileTextIcon className="h-3.5 w-3.5" />
              HTML
            </TabsTrigger>
          </TabsList>

          <TabsContent value="data" className="min-h-0 flex-1">
            <div className="h-full overflow-hidden rounded-md border">
              <Editor
                height="100%"
                language="json"
                theme={monacoTheme}
                value={JSON.stringify(website.data, null, 2)}
                options={editorOptions}
              />
            </div>
          </TabsContent>

          <TabsContent value="html" className="min-h-0 flex-1">
            <div className="h-full overflow-hidden rounded-md border">
              <Editor
                height="100%"
                language="html"
                theme={monacoTheme}
                value={website.html}
                options={editorOptions}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}