"use client";

import React, { useState, useCallback, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Avatar, Badge, Button, ScrollShadow, Tooltip } from "@heroui/react";
import {
  SquareChartBar,
  CaretLeft,
  CaretRight,
  Xmark,
  ChevronDown,
} from "@gravity-ui/icons";
import { navigationConfig, Role, type NavItem } from "@/config/navigation";
import { useAuthStore } from "@/app/lib/store/use-auth-store";
import { useLayoutStore } from "@/app/lib/store/use-layout-store";

const ROLE_LABEL: Record<string, string> = {
  hod: "HOD",
  faculty: "Faculty",
  counselor: "Counselor",
  student: "Student",
};

function resolveProfilePhotoSrc(profilePhoto?: string): string | undefined {
  if (!profilePhoto) return undefined;
  if (profilePhoto.startsWith("/api/")) return profilePhoto;
  if (profilePhoto.startsWith("students/")) {
    return `/api/student/profile-photo?key=${encodeURIComponent(profilePhoto)}`;
  }
  return profilePhoto;
}

// ─── Active-state helpers ─────────────────────────────────────────────────────
// Determines whether a nav item is the "active" match for the current pathname.
// Uses exact or strict-prefix matching to avoid false positives where one route
// is a prefix of another (e.g. /internal-exams vs /internal-exams/evaluation).
function isNavItemActive(pathname: string, item: NavItem): boolean {
  if (!item.href) {
    // Parent items with children — active if any child is active
    return item.children?.some((child) => isNavItemActive(pathname, child)) ?? false;
  }
  // Exact match
  if (pathname === item.href) return true;
  // Strict prefix match (pathname starts with href + "/")
  if (pathname.startsWith(item.href + "/")) return true;
  return false;
}

// ─── Collapsible Nav Item ─────────────────────────────────────────────────────
function CollapsibleNavItem({
  item,
  pathname,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const isParentActive = isNavItemActive(pathname, item);
  const [isExpanded, setIsExpanded] = useState(isParentActive);

  const Icon = item.icon;

  const handleToggle = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  // In collapsed mode, show a tooltip with the children list
  if (collapsed) {
    return (
      <Tooltip delay={0}>
        <Tooltip.Trigger>
          <div className="flex w-full justify-center">
            <button
              type="button"
              onClick={handleToggle}
              className={`group relative flex w-full items-center justify-center gap-3 rounded-xl px-2 py-2.5 text-sm font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                isParentActive
                  ? "bg-accent/10 text-accent"
                  : "text-foreground/70 hover:bg-default/60 hover:text-foreground"
              }`}
              aria-label={item.title}
            >
              {isParentActive && (
                <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-accent" />
              )}
              {Icon && (
                <Icon
                  className={`size-5 transition-colors ${
                    isParentActive
                      ? "text-accent"
                      : "text-foreground/60 group-hover:text-foreground"
                  }`}
                />
              )}
            </button>
          </div>
        </Tooltip.Trigger>
        <Tooltip.Content placement="right">
          <div className="flex flex-col gap-1 py-1">
            <p className="text-xs font-semibold text-foreground/60 mb-1">{item.title}</p>
            {item.children?.map((child, idx) => {
              const isChildActive = isNavItemActive(pathname, child);
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    router.push(child.href || "#");
                    onNavigate?.();
                  }}
                  className={`rounded px-2 py-1 text-left text-xs transition-colors ${
                    isChildActive
                      ? "text-accent font-semibold"
                      : "text-foreground/80 hover:text-accent"
                  }`}
                >
                  {child.title}
                </button>
              );
            })}
          </div>
        </Tooltip.Content>
      </Tooltip>
    );
  }

  return (
    <div>
      {/* Parent toggle */}
      <button
        type="button"
        onClick={handleToggle}
        className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
          isParentActive
            ? "bg-accent/10 text-accent"
            : "text-foreground/70 hover:bg-default/60 hover:text-foreground"
        }`}
        aria-label={item.title}
        aria-expanded={isExpanded}
      >
        {isParentActive && (
          <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-accent" />
        )}
        {Icon && (
          <Icon
            className={`size-5 transition-colors ${
              isParentActive
                ? "text-accent"
                : "text-foreground/60 group-hover:text-foreground"
            }`}
          />
        )}
        <span className="flex-1 truncate text-left">{item.title}</span>
        <ChevronDown
          className={`size-3.5 shrink-0 text-foreground/40 transition-transform duration-200 ${
            isExpanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Children */}
      <div
        className={`overflow-hidden transition-all duration-200 ease-in-out ${
          isExpanded ? "max-h-40 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="ml-8 mt-0.5 flex flex-col gap-0.5 border-l border-divider/50 pl-3">
          {item.children?.map((child, idx) => {
            const isChildActive = isNavItemActive(pathname, child);
            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  router.push(child.href || "#");
                  onNavigate?.();
                }}
                className={`rounded-lg px-3 py-2 text-left text-[13px] font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                  isChildActive
                    ? "bg-accent/8 text-accent"
                    : "text-foreground/60 hover:bg-default/40 hover:text-foreground"
                }`}
                aria-current={isChildActive ? "page" : undefined}
              >
                {child.title}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Shared Nav Content ───────────────────────────────────────────────────────
// Extracted so both desktop sidebar and mobile drawer render the same nav items.
function SidebarNavContent({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { activeRole, user } = useAuthStore();

  // activeRole is guaranteed by AuthHydrator — never null here
  const filteredNav = useMemo(
    () =>
      navigationConfig
        .map((section) => ({
          ...section,
          items: section.items
            .filter((item) =>
              activeRole ? item.roles.includes(activeRole as Role) : false
            )
            .map((item) => {
              // Also filter children by role
              if (item.children) {
                return {
                  ...item,
                  children: item.children.filter((child) =>
                    activeRole ? child.roles.includes(activeRole as Role) : false
                  ),
                };
              }
              return item;
            })
            // Remove parent items whose children all got filtered out
            .filter((item) => !item.children || item.children.length > 0),
        }))
        .filter((section) => section.items.length > 0),
    [activeRole]
  );

  return (
    <>
      {/* ── Navigation ─────────────────────────────────────────── */}
      <ScrollShadow className="flex-1 overflow-y-auto px-3 py-5">
        <nav className="flex flex-col gap-5">
          {filteredNav.map((section, idx) => (
            <div key={idx} className="flex flex-col gap-1">
              {/* Section label */}
              <div
                className={`overflow-hidden transition-all duration-200 ${
                  collapsed ? "h-0 opacity-0" : "h-5 opacity-100"
                }`}
              >
                <span className="px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {section.section}
                </span>
              </div>

              {/* Items */}
              <div className="flex flex-col gap-0.5">
                {section.items.map((item, itemIdx) => {
                  // Collapsible items with children
                  if (item.children && item.children.length > 0) {
                    return (
                      <CollapsibleNavItem
                        key={itemIdx}
                        item={item}
                        pathname={pathname}
                        collapsed={collapsed}
                        onNavigate={onNavigate}
                      />
                    );
                  }

                  // Regular nav items
                  const isActive = isNavItemActive(pathname, item);
                  const Icon = item.icon;

                  const navButton = (
                    <button
                      key={itemIdx}
                      type="button"
                      onClick={() => {
                        router.push(item.href || "#");
                        onNavigate?.();
                      }}
                      className={`group relative flex w-full items-center gap-3 rounded-xl py-2.5 text-sm font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                        collapsed ? "justify-center px-2" : "px-3"
                      } ${
                        isActive
                          ? "bg-accent/10 text-accent"
                          : "text-foreground/70 hover:bg-default/60 hover:text-foreground"
                      }`}
                      aria-label={item.title}
                      aria-current={isActive ? "page" : undefined}
                    >
                      {/* Active indicator bar */}
                      {isActive && (
                        <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-accent" />
                      )}

                      {/* Icon */}
                      {Icon && (
                        <div className="relative shrink-0">
                          <Icon
                            className={`size-5 transition-colors ${
                              isActive
                                ? "text-accent"
                                : "text-foreground/60 group-hover:text-foreground"
                            }`}
                          />
                          {/* Badge dot in collapsed mode */}
                          {collapsed && item.badge && (
                            <span className="absolute -right-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full bg-danger text-[9px] font-bold text-white">
                              {item.badge > 9 ? "9+" : item.badge}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Label + badge */}
                      {!collapsed && (
                        <>
                          <span className="flex-1 truncate text-left">
                            {item.title}
                          </span>
                          {item.badge && (
                            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-danger px-1.5 text-[10px] font-bold text-white">
                              {item.badge > 9 ? "9+" : item.badge}
                            </span>
                          )}
                        </>
                      )}
                    </button>
                  );

                  return collapsed ? (
                    <Tooltip key={itemIdx} delay={0}>
                      <Tooltip.Trigger>
                        <div className="flex w-full justify-center">{navButton}</div>
                      </Tooltip.Trigger>
                      <Tooltip.Content placement="right" className="capitalize">
                        <p>{item.title}</p>
                      </Tooltip.Content>
                    </Tooltip>
                  ) : (
                    <div key={itemIdx}>{navButton}</div>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </ScrollShadow>

      {/* ── Bottom User Card ───────────────────────────────────── */}
      <div className="shrink-0 border-t border-divider p-3">
        {collapsed ? (
          <div className="flex justify-center py-1">
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
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-xl px-3 py-2">
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
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-semibold text-foreground">
                {user?.name || "User"}
              </span>
              <span className="truncate text-xs text-muted-foreground capitalize">
                {ROLE_LABEL[activeRole ?? ""] ?? activeRole ?? "—"}
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Desktop Sidebar ──────────────────────────────────────────────────────────
export function Sidebar() {
  const { isCollapsed, toggleCollapsed } = useLayoutStore();

  return (
    <aside
      className={`relative flex h-full flex-col border-r border-divider bg-content1 transition-all duration-300 ease-in-out ${
        isCollapsed ? "w-[72px]" : "w-[260px]"
      }`}
    >
      {/* Brand Header */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-divider px-4">
        <div className="flex min-w-0 items-center gap-3 overflow-hidden">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg text-accent-foreground shadow-sm">
            <img src="/logo1.png" alt="" className="h-6 w-6 object-contain" />
          </div>
          <span
            className={`truncate text-[15px] font-bold tracking-tight text-foreground transition-all duration-200 ${
              isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
            }`}
          >
            VTCBCSR
          </span>
        </div>

        {/* Collapse toggle — floats on the right edge */}
        <Button
          isIconOnly
          variant="tertiary"
          size="sm"
          onPress={toggleCollapsed}
          className="absolute -right-4 top-[18px] z-50 size-8 rounded-full border border-divider bg-background shadow-md transition-transform hover:scale-110"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <CaretRight className="size-3 text-muted-foreground" />
          ) : (
            <CaretLeft className="size-3 text-muted-foreground" />
          )}
        </Button>
      </div>

      <SidebarNavContent collapsed={isCollapsed} />
    </aside>
  );
}

// ─── Mobile Sidebar Overlay ───────────────────────────────────────────────────
export function MobileSidebar() {
  const { isMobileSidebarOpen, closeMobileSidebar } = useLayoutStore();

  if (!isMobileSidebarOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={closeMobileSidebar}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <aside className="fixed inset-y-0 left-0 z-50 flex h-full w-[260px] flex-col border-r border-divider bg-content1 shadow-2xl">
        {/* Brand Header with close button */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-divider px-4">
          <div className="flex items-center gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground shadow-sm">
              <SquareChartBar className="size-4" />
            </div>
            <span className="text-[15px] font-bold tracking-tight text-foreground">
              College ERP
            </span>
          </div>
          <Button
            isIconOnly
            variant="tertiary"
            size="sm"
            onPress={closeMobileSidebar}
            aria-label="Close sidebar"
          >
            <Xmark className="size-4" />
          </Button>
        </div>

        {/* Shared nav content — never collapsed in mobile drawer */}
        <SidebarNavContent collapsed={false} onNavigate={closeMobileSidebar} />
      </aside>
    </>
  );
}
