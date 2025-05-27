import { ChevronRight, type LucideIcon } from "lucide-react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@shadcn/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@shadcn/components/ui/sidebar";

const indexToRoute = ["commandStream", "connectionInformationManage", "sqlCommandManage", "commandDiff", "dbConfigEditor", "other"];

export function NavMain({
                          items,
                        }: {
  items: {
    title: string;
    icon: LucideIcon;
    isActive?: boolean;
    items?: {
      title: string;
    }[];
  }[];
}) {
  const { activeMenuItem, setActiveMenuItem } = useSidebar();

  const handleMenuItemClick = (index: number) => {
    if (index >= indexToRoute.length) {
      setActiveMenuItem("other");
      return;
    }
    setActiveMenuItem(indexToRoute[index]);
  };

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-sm font-medium mb-2">Platform</SidebarGroupLabel>
      <SidebarMenu className="space-y-1">
        {items.map((item, index) => (
          <Collapsible key={item.title} asChild defaultOpen={item.isActive}>
            <SidebarMenuItem className="">
              <SidebarMenuButton 
                className="py-4 flex items-center gap-4" 
                isActive={activeMenuItem === indexToRoute[index]}
                onClick={() => handleMenuItemClick(index)} 
                tooltip={item.title}
              >
                <div className="flex items-center justify-center w-6 h-6">
                  <item.icon className="size-5" />
                </div>
                <span className="text-base font-medium">{item.title}</span>
              </SidebarMenuButton>
              {item.items?.length ? (
                <>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuAction className="data-[state=open]:rotate-90 h-12">
                      <ChevronRight />
                      <span className="sr-only">Toggle</span>
                    </SidebarMenuAction>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items?.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton className="py-3" asChild>
                            <span className="text-sm">{subItem.title}</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </>
              ) : null}
            </SidebarMenuItem>
          </Collapsible>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
