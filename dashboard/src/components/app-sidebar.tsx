import * as React from "react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { GalleryVerticalEndIcon, LayoutTemplateIcon, GlobeIcon } from "lucide-react"
import { ModeToggle } from "./mode-toggle"

// This is sample data.
const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  teams: {
    name: "Acme Inc",
    logo: <GalleryVerticalEndIcon />,
    plan: "Enterprise",
  },
  navMain: [
    {
      title: "Templates",
      url: "/templates",
      icon: <LayoutTemplateIcon />,
    },
    {
      title: "Websites",
      url: "/websites",
      icon: <GlobeIcon />,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                {data.teams.logo}
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{data.teams.name}</span>
                <span className="truncate text-xs">{data.teams.plan}</span>
              </div>
            <ModeToggle />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
