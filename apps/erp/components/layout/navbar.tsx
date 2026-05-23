"use client";

import React from "react";
import dynamic from "next/dynamic";
import {
  Avatar,
  Badge,
  Button,
  Dropdown,
  Label,
} from "@heroui/react";
import {
  Bell,
  ArrowRightFromSquare,
  Person,
  Bars,
} from "@gravity-ui/icons";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/app/lib/store/use-auth-store";
import { useLayoutStore } from "@/app/lib/store/use-layout-store";
import { usePathname, useRouter } from "next/navigation";
import { navigationConfig, Role } from "@/config/navigation";
import { authMeQueryKey } from "@/app/lib/queries/auth";
import { fetchWithTimeout } from "@/app/lib/http";
import { useNotificationsQuery } from "@/app/lib/queries/notifications";

// SSR-safe: ThemeSwitcher reads useThemeConfig() which needs the client-only provider
const ThemeSwitcher = dynamic(
  () => import("@/app/theme/theme-switcher"),
  { ssr: false },
);

const ROLE_LABEL: Record<string, string> = {
  hod: "HOD",
  faculty: "Faculty",
  counselor: "Counselor",
  student: "Student",
};

function resolveProfilePhotoSrc(profilePhoto?: string): string | undefined {
  if (!profilePhoto) return undefined;
  if (profilePhoto.startsWith("/api/")) return profilePhoto;
  if (profilePhoto.startsWith("students/") || profilePhoto.startsWith("faculty/")) {
    return `/api/student/profile-photo?key=${encodeURIComponent(profilePhoto)}`;
  }
  return profilePhoto;
}

/** Resolve the current page title from the navigation config (best-match / longest prefix) */
function usePageTitle(pathname: string, activeRole: string | null): string {
  let bestTitle = "";
  let bestLen = 0;

  for (const section of navigationConfig) {
    for (const item of section.items) {
      // Check direct href
      if (item.href) {
        const matches =
          pathname === item.href || pathname.startsWith(item.href + "/");
        if (matches && item.href.length > bestLen) {
          bestLen = item.href.length;
          bestTitle = item.title;
        }
      }
      // Check children
      if (item.children) {
        for (const child of item.children) {
          if (child.href) {
            const matches =
              pathname === child.href || pathname.startsWith(child.href + "/");
            if (matches && child.href.length > bestLen) {
              bestLen = child.href.length;
              bestTitle = child.title;
            }
          }
        }
      }
    }
  }

  return bestTitle;
}

export function Navbar() {
  const { user, activeRole, setActiveRole, logout } = useAuthStore();
  const { toggleMobileSidebar } = useLayoutStore();
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const pageTitle = usePageTitle(pathname, activeRole);
  const { data: notificationsData } = useNotificationsQuery({}, activeRole);
  const unreadCount = notificationsData?.metrics?.unread ?? 0;

  const handleLogout = async () => {
    // 1. Tell server to clear httpOnly cookie
    await fetchWithTimeout("/api/auth/logout", {
      method: "POST",
      credentials: "include",
      timeoutMs: 4000,
      timeoutMessage: "Logout request timed out. Finishing sign-out locally.",
    }).catch(() => { });
    // 2. Clear client state (store + localStorage + active_role cookie)
    logout();
    // 3. Clear all query cache to prevent zombie data
    queryClient.removeQueries({ queryKey: authMeQueryKey });
    queryClient.removeQueries({ queryKey: ["dashboard"] });
    // 4. Hard navigation — fully resets Next.js router cache
    window.location.href = "/auth/login";
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full shrink-0 items-center justify-between border-b border-divider bg-background/80 px-4 backdrop-blur-md md:px-6">
      {/* ── Left: mobile hamburger + page title + role switcher ── */}
      <div className="flex items-center gap-3">
        {/* Mobile hamburger — only visible on small screens */}
        <Button
          isIconOnly
          variant="tertiary"
          size="sm"
          onPress={toggleMobileSidebar}
          className="lg:hidden"
          aria-label="Open navigation menu"
        >
          <Bars className="size-5" />
        </Button>

        {/* Page title */}
        {/* {pageTitle && (
          <span className="hidden text-sm font-semibold text-foreground sm:block">
            {pageTitle}
          </span>
        )} */}

        {/* Divider between title and role switcher */}
        {pageTitle && user && user.roles.length > 1 && (
          <div className="hidden h-4 w-px bg-divider sm:block" />
        )}

        {/* Role switcher */}
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
                    // Invalidate auth/me queries to update role-specific details (photo, facultyCode, etc.)
                    queryClient.invalidateQueries({ queryKey: authMeQueryKey });
                    // Refresh server state to match new role
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
        ) : (
          <div className="text-sm font-medium text-muted-foreground capitalize">
            {ROLE_LABEL[activeRole ?? ""] ?? activeRole ?? "User"} Portal
          </div>
        )}
      </div>

      {/* ── Right: Notifications & Profile ─────────────────────── */}
      <div className="flex items-center gap-2">
        {/* Notifications Bell */}
        <Badge.Anchor>
          <Button
            isIconOnly
            variant="tertiary"
            size="sm"
            aria-label="Notifications"
            onPress={() => router.push("/app/notifications")}
          >
            <Bell className="size-5" />
          </Button>
          {unreadCount > 0 && (
            <Badge color="danger" size="sm">
              {unreadCount}
            </Badge>
          )}
        </Badge.Anchor>

        {/* Theme Switcher — same as login page */}
        <ThemeSwitcher />

        <div className="h-6 w-px bg-divider" />

        {/* User Profile Dropdown */}
        <Dropdown>
          <button
            type="button"
            className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-default/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            aria-label="User menu"
          >
            <div className="hidden flex-col items-end sm:flex">
              <span className="text-sm font-semibold leading-none text-foreground">
                {user?.name || "Loading..."}
              </span>
              <span className="mt-0.5 text-xs capitalize text-muted-foreground">
                {ROLE_LABEL[activeRole ?? ""] ?? activeRole ?? "—"}
              </span>
            </div>
            {/* ✅ Correct (HeroUI v3): src on Avatar.Image */}
            <Avatar
              size="sm"
              className="bg-accent text-accent-foreground ring-2 ring-accent/20"
            >
              <Avatar.Image
                src={resolveProfilePhotoSrc(user?.profilePhoto)}
                alt={user?.name || "User profile"}
              />
              <Avatar.Fallback>
                {user?.name?.[0]?.toUpperCase() || "U"}
              </Avatar.Fallback>
            </Avatar>
          </button>

          <Dropdown.Popover className="min-w-[210px]">
            {/* User info header */}
            <div className="border-b border-divider px-4 py-3">
              <p className="text-sm font-semibold text-foreground">{user?.name}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <Dropdown.Menu
              onAction={(key) => {
                if (key === "logout") handleLogout();
                if (key === "profile") router.push("/app/profile");
              }}
            >
              <Dropdown.Section>
                <Dropdown.Item id="profile" textValue="Profile">
                  <Person className="size-4 shrink-0 text-muted-foreground" />
                  <Label>Profile</Label>
                </Dropdown.Item>
              </Dropdown.Section>
              <Dropdown.Item id="logout" textValue="Log out" variant="danger">
                <ArrowRightFromSquare className="size-4 shrink-0" />
                <Label>Log out</Label>
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown>
      </div>
    </header>
  );
}
