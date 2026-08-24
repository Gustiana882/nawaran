import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import AppRoutes from "./app-routes"

export default function App() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AppRoutes />
      </SidebarInset>
    </SidebarProvider>
  )
}
