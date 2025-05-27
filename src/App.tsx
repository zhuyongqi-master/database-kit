import { Separator } from "@shadcn/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger, useSidebar } from "@shadcn/components/ui/sidebar";
import AppSidebar from "./container/nav/app-sidebar";
import CommandLayout from "./container/command-stream";
import ConnectionManagementWrapper from "@/container/connection-information-management";
import Index from "@/container/sql-command-management";
import CommandDiff from "@/container/command-diff";
import DBConfigManagerWrapper from "@/container/db-config-manager";
import { Toaster } from "sonner";
import { DBConfigProvider } from "@/context/DBConfigContext";
import { ConnectionProvider } from "@/context/ConnectionContext";
import React, { useEffect, useRef, useState } from "react";
import { CommandStreamProvider } from "@/context/CommandStreamContext";
import { SQLCommandProvider } from "@/context/SQLCommandContext";
import LanguageSwitcher from "./components/LanguageSwitcher";

const route = {
  commandStream: CommandLayout,
  connectionInformationManage: ConnectionManagementWrapper,
  sqlCommandManage: Index,
  commandDiff: CommandDiff,
  dbConfigEditor: DBConfigManagerWrapper,
  other: () => <div></div>,
};

export function Page() {
  const { activeMenuItem, setActiveMenuItem } = useSidebar();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedActiveMenuItem = localStorage.getItem("activeMenuItem");
    if (storedActiveMenuItem) {
      setActiveMenuItem(storedActiveMenuItem as keyof typeof route);
    }
    setIsLoading(false);
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (isLoading) return;
    localStorage.setItem("activeMenuItem", activeMenuItem);
  }, [activeMenuItem, isLoading]);

  const renderContent = () => {
    const Component = route[activeMenuItem as keyof typeof route];
    return <Component/>;
  };

  return (
    <>
      <AppSidebar variant="floating" collapsible="icon"/>
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger variant="outline" className="scale-100 sm:scale -100"/>
            <Separator orientation="vertical" className="bg-border-1 mr-2 h-4"/>
          </div>
          <div>
            <LanguageSwitcher/>
          </div>
        </header>
        <div>
          <CommandStreamProvider>
            <ConnectionProvider>
              <DBConfigProvider>
                <SQLCommandProvider>
                  {renderContent()}
                </SQLCommandProvider>
              </DBConfigProvider>
            </ConnectionProvider>
          </CommandStreamProvider>
        </div>
      </SidebarInset>
    </>
  );
}

function App() {
  return (
    <SidebarProvider>
      <Page/>
      <Toaster richColors position="top-right"/>
    </SidebarProvider>
  );
}

export default App;
