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
  Gear,
} from "@gravity-ui/icons";
import { navigationConfig, Role, type NavItem } from "@/config/navigation";
import { useAuthStore } from "@/app/lib/store/use-auth-store";
import { useLayoutStore } from "@/app/lib/store/use-layout-store";
import { useQuery } from "@tanstack/react-query";


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
              className={`group relative flex w-full items-center justify-center gap-s5 rounded-rsm px-s3 py-s4 text-sm font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                isParentActive
                  ? "bg-accent/10 text-accent"
                  : "text-foreground/70 hover:bg-default hover:text-foreground"
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
        className={`group relative flex w-full items-center gap-s5 rounded-rsm px-s5 py-s4 text-sm font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
          isParentActive
            ? "bg-accent/10 text-accent"
            : "text-foreground/70 hover:bg-default hover:text-foreground"
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
        <div className="ml-8 mt-0.5 flex flex-col gap-s1 border-l border-border/50 pl-s5">
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
                className={`rounded-rxs px-s5 py-s3 text-left text-[13px] font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                  isChildActive
                    ? "bg-accent/10 text-accent"
                    : "text-foreground/60 hover:bg-default hover:text-foreground"
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

  const isStudent = activeRole === "student";
  const isFaculty = activeRole === "faculty" || activeRole === "hod" || activeRole === "counselor";
  const hasRequests = isStudent || isFaculty;

  const { data: requestsData } = useQuery({
    queryKey: ["requests", "count", activeRole],
    queryFn: async () => {
      const apiUrl = isStudent ? "/api/requests" : "/api/requests/faculty";
      const res = await fetch(`${apiUrl}?status=pending&limit=1`);
      if (!res.ok) throw new Error("Failed to fetch requests count");
      return res.json();
    },
    enabled: !!activeRole && hasRequests,
  });

  const pendingRequestsCount = requestsData?.pagination?.total ?? 0;

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
              let badge = item.badge;
              if (item.title === "Requests") {
                badge = pendingRequestsCount;
              }

              const mappedItem = {
                ...item,
                badge,
              };

              // Also filter children by role
              if (item.children) {
                mappedItem.children = item.children.filter((child) =>
                  activeRole ? child.roles.includes(activeRole as Role) : false
                );
              }
              return mappedItem;
            })
            // Remove parent items whose children all got filtered out
            .filter((item) => !item.children || item.children.length > 0),
        }))
        .filter((section) => section.items.length > 0),
    [activeRole, pendingRequestsCount]
  );

  return (
    <>
      {/* ── Navigation ─────────────────────────────────────────── */}
      <ScrollShadow className="flex-1 overflow-y-auto px-s5 py-s6">
        <nav className="flex flex-col gap-s6">
          {filteredNav.map((section, idx) => (
            <div key={idx} className="flex flex-col gap-s1">
              {/* Section label */}
              <div
                className={`overflow-hidden transition-all duration-200 ${
                  collapsed ? "h-0 opacity-0" : "h-5 opacity-100"
                }`}
              >
                <span className="px-s3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
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
                      className={`group relative flex w-full items-center gap-s5 rounded-rsm py-s4 text-sm font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                        collapsed ? "justify-center px-s3" : "px-s5"
                      } ${
                        isActive
                          ? "bg-accent/10 text-accent"
                          : "text-foreground/70 hover:bg-default hover:text-foreground"
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

      {/* ── Bottom Settings ────────────────────────────────────── */}
      <div className="shrink-0 border-t border-border p-s5">
        <button
          onClick={() => {
            router.push("/settings/customize");
            onNavigate?.();
          }}
          className={`group flex w-full items-center gap-s5 rounded-rsm px-s5 py-s4 text-sm font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
            collapsed ? "justify-center" : ""
          } ${
            pathname.startsWith("/app/settings")
              ? "bg-accent/10 text-accent"
              : "text-foreground/70 hover:bg-default hover:text-foreground"
          }`}
          aria-label="Settings"
        >
          <Gear
            className={`size-5 transition-colors ${
              pathname.startsWith("/app/settings")
                ? "text-accent"
                : "text-foreground/60 group-hover:text-foreground"
            }`}
          />
          {!collapsed && <span className="truncate">Settings</span>}
        </button>
      </div>
    </>
  );
}

// ─── Desktop Sidebar ──────────────────────────────────────────────────────────
export function Sidebar() {
  const { isCollapsed, toggleCollapsed } = useLayoutStore();

  return (
    <aside
      className={`relative flex h-full flex-col border-r border-border bg-background transition-all duration-300 ease-in-out ${
        isCollapsed ? "w-[72px]" : "w-[260px]"
      }`}
    >
      {/* Brand Header */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-s6">
        <div className="flex min-w-0 items-center gap-s5 overflow-hidden">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-rxs text-accent-foreground shadow-s1">
            <img src="/logo1.png" alt="" className="h-6 w-6 object-contain" />
          </div>
          <span
            className={`truncate text-[15px] font-bold tracking-tight text-foreground transition-all duration-200 ${
              isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
            }`}
          >
            Vtcbcsr
          </span>
        </div>

        {/* Collapse toggle — floats on the right edge */}
        <Button
          isIconOnly
          variant="tertiary"
          size="sm"
          onPress={toggleCollapsed}
          className="absolute -right-4 top-[18px] z-50 size-8 rounded-full border border-border bg-background shadow-s1 transition-transform hover:scale-110"
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
      <aside className="fixed inset-y-0 left-0 z-50 flex h-full w-[260px] flex-col border-r border-border bg-background shadow-s2">
        {/* Brand Header with close button */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-s6">
          <div className="flex items-center gap-s5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-rxs bg-accent text-accent-foreground shadow-s1">
              <SquareChartBar className="size-4" />
            </div>
            <span className="text-[15px] font-bold tracking-tight text-foreground">
              Vtcbcsr
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
