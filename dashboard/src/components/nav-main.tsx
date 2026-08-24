import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Link, useLocation } from "react-router-dom"

interface NavMainItem {
  title: string
  url: string
  icon?: React.ReactNode
}

export function NavMain({ items }: { items: NavMainItem[] }) {
  const location = useLocation()

  function isActive(url: string) {
    return (
      location.pathname === url ||
      location.pathname.startsWith(url + "/")
    )
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Platform</SidebarGroupLabel>

      <SidebarMenu>
        {items.map((item) => (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton isActive={isActive(item.url)} render={<Link to={item.url} />} className="py-4.5">
              {item.icon}
              <span>{item.title}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}