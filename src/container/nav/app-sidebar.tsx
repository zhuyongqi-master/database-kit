import * as React from "react";
import { Code, GitCompare, Link2, LucideProps, Settings, Terminal } from "lucide-react";
import { useTranslation } from "react-i18next";

import { NavMain } from "@/container/nav/nav-main";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@shadcn/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@shadcn/components/ui/avatar";

type Item = {
  title: string;
  icon: React.ForwardRefExoticComponent<Omit<LucideProps, "ref"> & React.RefAttributes<SVGSVGElement>>;
  isActive: boolean;
};

// Custom DatabaseKit icon component
const DatabaseKitIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <ellipse cx="12" cy="5" rx="9" ry="3"/>
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
    <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"/>
    <path d="M12 8v4M8 10h8"/>
  </svg>
);

function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { t } = useTranslation();
  
  const data = {
    user: {
      name: "zhuyongqi",
      email: "github.com/zhuyongqi-master/database-kit",
      avatar: "/avatars/shadcn.jpg",
    },
    sections: [
      {
        type: "main",
        items: [
          {
            title: t('sidebar.commandStream'),
            icon: Terminal,
            isActive: true,
          },
          {
            title: t('sidebar.connectionManagement'),
            icon: Link2,
            isActive: false,
          },
          {
            title: t('sidebar.sqlCommandManage'),
            icon: Code,
            isActive: false,
          },
          {
            title: t('sidebar.commandDiff'),
            icon: GitCompare,
            isActive: false,
          },
          {
            title: t('sidebar.dbConfigEditor'),
            icon: Settings,
            isActive: false,
          },
        ],
      },
    ],
  };

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <div>
                <div
                  className="flex aspect-square size-10 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <DatabaseKitIcon className="size-6"/>
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Database Kit</span>
                  <span className="truncate text-xs">DB Management Tools</span>
                </div>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.sections[0].items}/>
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
          <Avatar className="h-8 w-8 rounded-lg">
            <AvatarImage src={data.user.avatar} alt={data.user.name}/>
            <AvatarFallback className="rounded-lg">ZYQ</AvatarFallback>
          </Avatar>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">{data.user.name}</span>
            <span className="truncate text-xs hover:overflow-visible">{data.user.email}</span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

export default AppSidebar;
export type { Item as item };
