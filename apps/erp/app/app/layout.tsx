"use client";

import React from "react";
import { Sidebar, MobileSidebar } from "@/components/layout/sidebar";
import { Navbar } from "@/components/layout/navbar";
import { AuthHydrator } from "@/components/auth/auth-hydrator";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthHydrator>
      <div className="flex h-screen w-full overflow-hidden bg-background">
        {/* ── Desktop Sidebar (hidden on mobile) ────────────────── */}
        <div className="hidden lg:flex">
          <Sidebar />
        </div>

        {/* ── Mobile Sidebar Overlay ─────────────────────────────── */}
        <MobileSidebar />

        {/* ── Main Container ─────────────────────────────────────── */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Sticky Navbar */}
          <Navbar />

          {/* Scrollable Content Area */}
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
            <div className="mx-auto w-full max-w-7xl">
              {children}
            </div>
          </main>
        </div>
      </div>
    </AuthHydrator>
  );
}
