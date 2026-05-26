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
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { CourseSwitcher } from "./course-switcher";

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
  principal: "Principal",
  vice_principal: "Vice Principal",
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

  // Real-time unread count from Convex — updates instantly via WebSocket
  const unreadCount = useQuery(
    api.notifications.getUnreadCount,
    user ? { receiverUserId: user.id } : "skip"
  ) ?? 0;

  // Real-time unread list from Convex to detect new incoming notifications
  const recentUnread = useQuery(
    api.notifications.getRecentUnread,
    user ? { receiverUserId: user.id } : "skip"
  );

  // Track seen notifications to prevent duplicate toasts
  const seenNotificationIdsRef = React.useRef<Set<string>>(new Set());
  const isFirstLoadRef = React.useRef(true);

  // Reset tracking if user logs out or switches
  React.useEffect(() => {
    seenNotificationIdsRef.current = new Set();
    isFirstLoadRef.current = true;
  }, [user?.id]);

  React.useEffect(() => {
    if (!recentUnread) return;

    if (isFirstLoadRef.current) {
      // On first load, mark all existing unread notifications as seen so we don't toast spam
      for (const n of recentUnread) {
        seenNotificationIdsRef.current.add(n._id);
      }
      isFirstLoadRef.current = false;
      return;
    }

    // Check for new, unseen notifications
    for (const n of recentUnread) {
      if (!seenNotificationIdsRef.current.has(n._id)) {
        seenNotificationIdsRef.current.add(n._id);
        
        // Trigger a premium real-time toast alert
        toast.info(n.title, {
          description: n.message,
        });
      }
    }
  }, [recentUnread]);
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
          {/* Course Switcher */}
          <CourseSwitcher />

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
        </div>
      </div>
    </header>
  );
}
