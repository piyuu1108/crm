"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import {
  Badge,
  Button,
  Dropdown,
  Label,
  toast,
} from "@heroui/react";
import { Bell, PanelLeft, Download } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/app/lib/store/use-auth-store";
import { useSidebar } from "@/components/layout/sidebar-context";
import { useRouter } from "next/navigation";
import { authMeQueryKey } from "@/app/lib/queries/auth";
import { useNotificationsQuery } from "@/app/lib/queries/notifications";

const ThemeSwitcher = dynamic(
  () => import("@/app/theme/theme-switcher"),
  { ssr: false },
);

const ROLE_LABEL: Record<string, string> = {
  hod: "HOD",
  faculty: "Faculty",
  counselor: "Counselor",
  student: "Student",
  admin: "Admin",
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getFirstName(name?: string): string {
  if (!name) return "";
  return name.split(" ")[0];
}

export function Navbar() {
  const { user, activeRole, setActiveRole } = useAuthStore();
  const { toggle, toggleMobile } = useSidebar();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { data: notificationsData } = useNotificationsQuery({}, activeRole);
  const unreadCount = notificationsData?.metrics?.unread ?? 0;

  const handleToggle = () => {
    toggle();
    toggleMobile();
  };

  return (
    <header className="sticky top-0 z-40 h-16 bg-background w-full">
      <div className="mx-auto max-w-7xl h-full flex items-center px-5 gap-3 w-full min-w-0">
        <Button isIconOnly size="sm" variant="ghost" aria-label="Toggle sidebar" onPress={handleToggle}>
          <PanelLeft className="size-4" />
        </Button>

        <h1 className="text-xl font-semibold text-foreground truncate min-w-0 shrink">
          {getGreeting()}, {getFirstName(user?.name) || "there"}!
        </h1>

        <div className="flex-1 min-w-0" />

        <div className="flex items-center gap-2 shrink-0">
          {/* Theme Switcher */}
          <ThemeSwitcher />

          {/* Notifications Bell */}
          <Badge.Anchor>
            <Button
              isIconOnly
              size="sm"
              variant="tertiary"
              aria-label="Notifications"
              onPress={() => router.push("/app/notifications")}
            >
              <Bell className="size-4" />
            </Button>
            {unreadCount > 0 && (
              <Badge color="danger" size="sm">
                {unreadCount}
              </Badge>
            )}
          </Badge.Anchor>

          {/* Role Switcher */}
          {user && user.roles.length > 1 ? (
            <Dropdown>
              <Button variant="secondary" size="sm" className="capitalize font-medium">
                {ROLE_LABEL[activeRole ?? ""] ?? activeRole ?? "Select Role"}
              </Button>
              <Dropdown.Popover className="min-w-[180px]">
                <Dropdown.Menu
                  selectionMode="single"
                  selectedKeys={new Set([activeRole ?? ""])}
                  onSelectionChange={(keys) => {
                    const selected = Array.from(keys)[0] as string;
                    if (selected && selected !== activeRole) {
                      setActiveRole(selected);
                      queryClient.invalidateQueries({ queryKey: authMeQueryKey });
                      router.refresh();
                    }
                  }}
                >
                  {user.roles.map((role) => (
                    <Dropdown.Item id={role} key={role} textValue={ROLE_LABEL[role] ?? role}>
                      <Dropdown.ItemIndicator />
                      <Label className="capitalize">{ROLE_LABEL[role] ?? role}</Label>
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown>
          ) : null}

          {/* Download button */}
          <Button
            size="sm"
            onPress={() => {
              toast.info("This feature will be added.");
            }}
          >
            <Download className="size-4" />
            <span className="hidden sm:inline">Download</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
