"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Button, Select, Label, ListBox, Avatar, Chip, Separator } from "@heroui/react";
import { Icon } from "@iconify/react";
import ChangePasswordModal from "@/components/ChangePasswordModal";
import { DataProvider, useDataContext } from "@/contexts/DataContext";

interface Admin {
  id: string;
  name: string;
  email: string;
  role: string;
  mustChangePassword: boolean;
}

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "gravity-ui:layout-rows-3" },
  { href: "/dashboard/faculty", label: "Faculty", icon: "gravity-ui:persons" },
  { href: "/dashboard/classes", label: "Classes", icon: "gravity-ui:layers-3-diagonal" },
  { href: "/dashboard/subjects", label: "Subjects", icon: "gravity-ui:book-open" },
  { href: "/dashboard/assignments", label: "Matrix", icon: "gravity-ui:layout-cells-large" },
  // { href: "/dashboard/labs", label: "Labs", icon: "gravity-ui:flask" },
  // { href: "/dashboard/lab-config", label: "Lab Config", icon: "gravity-ui:wrench" },
  { href: "/dashboard/lab-schedule", label: "Lab Schedule", icon: "gravity-ui:calendar" },
  { href: "/dashboard/faculty-schedule", label: "Faculty Schedule", icon: "gravity-ui:person" },
  // { href: "/dashboard/timetable", label: "Timetable", icon: "gravity-ui:layout-header-cells-large" },
  { href: "/dashboard/timetable-builder", label: "TT Builder", icon: "gravity-ui:pencil-to-square" },
];

const BOTTOM_NAV_ITEMS = [
  { href: "/dashboard/settings", label: "Settings", icon: "gravity-ui:gear" },
];

function DashboardContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { courseId, setCourseId, courses } = useDataContext();

  // Fetch admin info
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.admin) {
          setAdmin(data.admin);
          if (data.admin.mustChangePassword) {
            setShowChangePassword(true);
          }
        }
      })
      .catch(() => router.push("/login"));
  }, [router]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const renderNavItem = (item: any) => {
    const isActive =
      item.href === "/dashboard"
        ? pathname === "/dashboard"
        : pathname.startsWith(item.href);

    return (
      <Link
        key={item.href}
        href={item.href}
        className={`sidebar-link ${isActive ? "sidebar-link--active" : ""}`}
        title={sidebarCollapsed ? item.label : undefined}
      >
        <Icon icon={item.icon} width={18} />
        {!sidebarCollapsed && <span>{item.label}</span>}
      </Link>
    );
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside
        className={`flex flex-col border-r border-border bg-sidebar-bg transition-all duration-200 ${
          sidebarCollapsed ? "w-16" : "w-56"
        }`}
      >
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-4 py-4">
          <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center overflow-hidden">
            <img src="/logo1.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          {!sidebarCollapsed && (
            <span className="font-bold text-sm tracking-tight">Manage</span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 flex flex-col overflow-y-auto">
          <div className="space-y-0.5">
            {NAV_ITEMS.map(renderNavItem)}
          </div>
          <div className="mt-auto pt-4 space-y-0.5">
            {BOTTOM_NAV_ITEMS.map(renderNavItem)}
          </div>
        </nav>

        {/* Collapse toggle */}
        <div className="px-2 py-2 border-t border-border">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="sidebar-link w-full justify-center"
          >
            <Icon
              icon={
                sidebarCollapsed
                  ? "gravity-ui:chevrons-right"
                  : "gravity-ui:chevrons-left"
              }
              width={16}
            />
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between px-5 py-4 bg-background">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">
              {NAV_ITEMS.find((i) =>
                i.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(i.href)
              )?.label || "Dashboard"}
            </h2>

            {/* Course Filter - HeroUI Select */}
            {courses.length > 0 && (
              <>
                <Separator orientation="vertical" className="h-6" />
                <Select
                  className="w-[160px]"
                  aria-label="Course filter"
                  selectedKey={courseId != null ? String(courseId) : undefined}
                  onSelectionChange={(key) => {
                    if (key !== null) setCourseId(Number(key));
                  }}
                >
                  <Select.Trigger className="h-8 text-sm">
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {courses.map((c) => (
                        <ListBox.Item key={String(c.id)} id={String(c.id)} textValue={c.name}>
                          {c.name}
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            {admin && (
              <div className="flex items-center gap-3">
                
                <div className="hidden sm:block text-right mr-2">
                  <div className="text-sm font-medium">{admin.name}</div>
                  <Chip size="sm" variant="soft" color="accent" className="h-5 text-[10px] px-1">
                    {admin.role}
                  </Chip>
                </div>
              </div>
            )}
            <Separator orientation="vertical" className="h-6 mx-1" />
            <Button
              isIconOnly
              variant="ghost"
              onPress={handleLogout}
              aria-label="Log out"
            >
              <Icon icon="gravity-ui:arrow-right-from-square" width={18} className="text-muted" />
            </Button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto bg-background p-5">
          <div className="max-w-[1400px] mx-auto w-full">
            {children}
          </div>
        </main>
      </div>

      <ChangePasswordModal
        isOpen={showChangePassword}
        onSuccess={() => {
          setShowChangePassword(false);
          // Refresh admin info
          fetch("/api/auth/me")
            .then((r) => r.json())
            .then((data) => {
              if (data.admin) setAdmin(data.admin);
            });
        }}
      />
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DataProvider>
      <DashboardContent>{children}</DashboardContent>
    </DataProvider>
  );
}
