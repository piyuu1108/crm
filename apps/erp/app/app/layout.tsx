"use client";

import React from "react";
import { SidebarProvider, useSidebar } from "@/components/layout/sidebar-context";
import { Sidebar } from "@/components/layout/sidebar";
import { Navbar } from "@/components/layout/navbar";
import { AuthHydrator } from "@/components/auth/auth-hydrator";

function LayoutShellContent({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useSidebar();
  return (
    <div className="min-h-full flex bg-background text-foreground w-full">
      {/* Sidebar */}
      <Sidebar />

      {/* Main area */}
      <div className={`flex flex-1 flex-col min-w-0 max-w-full transition-all duration-300 ml-0 ${isCollapsed ? "lg:ml-16" : "lg:ml-(--sidebar-width)"}`}>
        <Navbar />
        <main className="flex-1 min-w-0 max-w-full">
          <div className="mx-auto w-full max-w-7xl px-5 py-3 pb-10 flex flex-col gap-4 min-w-0">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthHydrator>
      <SidebarProvider>
        <LayoutShellContent>{children}</LayoutShellContent>
      </SidebarProvider>
    </AuthHydrator>
  );
}
