"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronDown,
  Settings,
} from "lucide-react";
import { Avatar, Chip, ScrollShadow, Disclosure, Tooltip } from "@heroui/react";
import { useSidebar } from "@/components/layout/sidebar-context";
import { navigationConfig, Role, type NavItem } from "@/config/navigation";
import { useAuthStore } from "@/app/lib/store/use-auth-store";
import { useQuery } from "@tanstack/react-query";

// ─── Active-state helpers ─────────────────────────────────────────────────────
function isNavItemActive(pathname: string, item: NavItem): boolean {
  if (!item.href) {
    return item.children?.some((child) => isNavItemActive(pathname, child)) ?? false;
  }
  if (pathname === item.href) return true;
  if (pathname.startsWith(item.href + "/")) return true;
  return false;
}

function resolveProfilePhotoSrc(profilePhoto?: string): string | undefined {
  if (!profilePhoto) return undefined;
  if (profilePhoto.startsWith("/api/")) return profilePhoto;
  if (profilePhoto.startsWith("students/") || profilePhoto.startsWith("faculty/")) {
    return `/api/student/profile-photo?key=${encodeURIComponent(profilePhoto)}`;
  }
  return profilePhoto;
}

// ─── Collapsible sub-menu ─────────────────────────────────────────────────────
function CollapsibleNavItem({
  item,
  pathname,
  isCollapsed,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  isCollapsed: boolean;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const isParentActive = isNavItemActive(pathname, item);
  const [isExpanded, setIsExpanded] = React.useState(isParentActive);

  React.useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      if (isParentActive) {
        setIsExpanded(true);
      } else if (isCollapsed) {
        setIsExpanded(false);
      }
    });
    return () => cancelAnimationFrame(frameId);
  }, [pathname, isParentActive, isCollapsed]);

  const Icon = item.icon;

  return (
    <React.Fragment>
      {/* Expanded: full disclosure menu */}
      <li className={`w-full block lg:${isCollapsed ? "hidden" : "block"}`}>
        <Disclosure
          isExpanded={isExpanded}
          onExpandedChange={setIsExpanded}
        >
          <Disclosure.Heading>
            <Disclosure.Trigger
              className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors cursor-pointer select-none text-left focus:outline-none ${
                isParentActive
                  ? "bg-default-100 text-foreground font-semibold"
                  : "text-default-500 hover:bg-default-50 hover:text-foreground font-normal"
              }`}
            >
              {Icon && <Icon className="size-4 shrink-0" />}
              <span className="flex-1">{item.title}</span>
              <ChevronDown
                className={`size-4 shrink-0 transition-transform duration-200 ${
                  isExpanded ? "rotate-180" : ""
                }`}
              />
            </Disclosure.Trigger>
          </Disclosure.Heading>
          <Disclosure.Content>
            <Disclosure.Body className="mt-0.5 flex flex-col gap-0.5 border-l border-divider ml-5 pl-2">
              {item.children?.map((subItem) => {
                const isSubActive = subItem.href ? isNavItemActive(pathname, subItem) : false;
                return (
                  <button
                    key={subItem.title}
                    type="button"
                    onClick={() => {
                      if (subItem.href) {
                        router.push(subItem.href);
                        onNavigate?.();
                      }
                    }}
                    className={`block rounded-md px-2.5 py-1 text-xs text-left transition-colors ${
                      isSubActive
                        ? "text-foreground bg-default-100 font-semibold"
                        : "text-default-500 hover:text-foreground hover:bg-default-50 font-normal"
                    }`}
                  >
                    {subItem.title}
                  </button>
                );
              })}
            </Disclosure.Body>
          </Disclosure.Content>
        </Disclosure>
      </li>

      {/* Collapsed: icon-only with tooltip */}
      <li className={isCollapsed ? "lg:block hidden" : "hidden"}>
        <Tooltip delay={0}>
          <Tooltip.Trigger>
            <div className="flex w-full justify-center">
              <button
                type="button"
                className={`flex items-center justify-center size-10 mx-auto rounded-lg transition-colors ${
                  isParentActive
                    ? "bg-default-100 text-foreground"
                    : "text-default-500 hover:bg-default-50 hover:text-foreground"
                }`}
                aria-label={item.title}
              >
                {Icon && <Icon className="size-4 shrink-0" />}
              </button>
            </div>
          </Tooltip.Trigger>
          <Tooltip.Content placement="right">
            <div className="flex flex-col gap-1 py-1">
              <p className="text-xs font-semibold text-foreground/60 mb-1">{item.title}</p>
              {item.children?.map((child) => {
                const isChildActive = child.href ? isNavItemActive(pathname, child) : false;
                return (
                  <button
                    key={child.title}
                    type="button"
                    onClick={() => {
                      if (child.href) {
                        router.push(child.href);
                        onNavigate?.();
                      }
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
      </li>
    </React.Fragment>
  );
}

// ─── Main Sidebar ─────────────────────────────────────────────────────────────
export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isCollapsed, isMobileOpen, closeMobile } = useSidebar();
  const { activeRole, user } = useAuthStore();

  // Role-based nav filtering
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

  const filteredNav = React.useMemo(
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
              const mappedItem = { ...item, badge };
              if (item.children) {
                mappedItem.children = item.children.filter((child) =>
                  activeRole ? child.roles.includes(activeRole as Role) : false
                );
              }
              return mappedItem;
            })
            .filter((item) => !item.children || item.children.length > 0),
        }))
        .filter((section) => section.items.length > 0),
    [activeRole, pendingRequestsCount]
  );

  // Close mobile drawer on route change
  React.useEffect(() => {
    closeMobile();
  }, [pathname, closeMobile]);

  const ROLE_LABEL: Record<string, string> = {
    hod: "HOD",
    faculty: "Faculty",
    counselor: "Counselor",
    student: "Student",
    admin: "Admin",
  };

  return (
    <>
      {/* Mobile Sidebar Backdrop Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={closeMobile}
        />
      )}

      <aside
        className={`fixed left-0 top-0 h-screen border-r border-divider bg-background z-50 flex flex-col transition-transform lg:transition-all duration-300 
          lg:translate-x-0 ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
          ${isCollapsed ? "lg:w-16 w-[240px]" : "w-[240px] lg:w-(--sidebar-width)"}
        `}
      >
        {/* Header: Company logo & name */}
        <div className={`px-4 py-4 ${isCollapsed ? "lg:px-2 px-4" : "px-4"}`}>
          <div className={`flex items-center px-1 py-1 ${isCollapsed ? "lg:justify-center justify-start gap-2.5" : "gap-2.5"}`}>
            <div className="flex size-7 items-center justify-center rounded-lg shrink-0">
              <img src="/logo1.png" alt="" className="h-5 w-5 object-contain" />
            </div>
            <span className={`text-sm font-semibold tracking-tight text-foreground ${isCollapsed ? "lg:hidden block" : "block"}`}>
              Vtcbcsr
            </span>
          </div>
        </div>

        {/* Navigation */}
        <ScrollShadow className={`flex-1 ${isCollapsed ? "lg:px-2 lg:py-3 px-3 py-3" : "px-3 py-3"}`} hideScrollBar>
          <nav>
            <ul className="flex flex-col gap-0.5">
              {filteredNav.map((section) => (
                <React.Fragment key={section.section}>
                  {/* Section label */}
                  <li
                    className={`overflow-hidden transition-all duration-200 ${
                      isCollapsed ? "lg:h-0 lg:opacity-0 h-5 opacity-100" : "h-5 opacity-100"
                    }`}
                  >
                    <span className="px-3 text-[10px] font-semibold uppercase tracking-widest text-default-400">
                      {section.section}
                    </span>
                  </li>

                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = isNavItemActive(pathname, item);

                    // Collapsible items with children
                    if (item.children && item.children.length > 0) {
                      return (
                        <CollapsibleNavItem
                          key={item.title}
                          item={item}
                          pathname={pathname}
                          isCollapsed={isCollapsed}
                          onNavigate={closeMobile}
                        />
                      );
                    }

                    // Simple nav items
                    const navLink = (
                      <button
                        type="button"
                        onClick={() => {
                          if (item.href) {
                            router.push(item.href);
                            closeMobile();
                          }
                        }}
                        className={`flex items-center w-full transition-colors ${
                          isCollapsed
                            ? "lg:justify-center lg:size-10 lg:mx-auto lg:p-0 gap-3 px-3 py-2 text-sm"
                            : "gap-3 px-3 py-2 text-sm"
                        } rounded-lg ${
                          isActive
                            ? "bg-default-100 text-foreground font-semibold"
                            : "text-default-500 hover:bg-default-50 hover:text-foreground font-normal"
                        }`}
                        aria-label={item.title}
                        aria-current={isActive ? "page" : undefined}
                      >
                        {Icon && <Icon className="size-4 shrink-0" />}
                        <span className={`flex-1 text-left ${isCollapsed ? "lg:hidden block" : "block"}`}>{item.title}</span>
                        {item.badge != null && item.badge > 0 && (
                          <Chip
                            size="sm"
                            color="danger"
                            variant="soft"
                            className={isCollapsed ? "lg:hidden" : ""}
                          >
                            {item.badge > 9 ? "9+" : item.badge}
                          </Chip>
                        )}
                      </button>
                    );

                    return (
                      <li key={item.title}>
                        {isCollapsed ? (
                          <Tooltip delay={0}>
                            <Tooltip.Trigger>
                              <div className="flex w-full justify-center">{navLink}</div>
                            </Tooltip.Trigger>
                            <Tooltip.Content placement="right" className="capitalize">
                              <p>{item.title}</p>
                            </Tooltip.Content>
                          </Tooltip>
                        ) : (
                          navLink
                        )}
                      </li>
                    );
                  })}
                </React.Fragment>
              ))}
            </ul>
          </nav>
        </ScrollShadow>

        {/* Settings button */}
        <div className={`px-3 pb-1 ${isCollapsed ? "lg:px-2" : ""}`}>
          <button
            type="button"
            onClick={() => {
              router.push("/settings/customize");
              closeMobile();
            }}
            className={`flex items-center w-full rounded-lg transition-colors ${
              isCollapsed
                ? "lg:justify-center lg:size-10 lg:mx-auto lg:p-0 gap-3 px-3 py-2 text-sm"
                : "gap-3 px-3 py-2 text-sm"
            } ${
              pathname.startsWith("/settings")
                ? "bg-default-100 text-foreground font-semibold"
                : "text-default-500 hover:bg-default-50 hover:text-foreground font-normal"
            }`}
            aria-label="Settings"
          >
            <Settings className="size-4 shrink-0" />
            <span className={`${isCollapsed ? "lg:hidden block" : "block"}`}>Settings</span>
          </button>
        </div>

        {/* Footer: User info */}
        <div className="border-t border-divider px-4 py-4 bg-default-50/50">
          <div className={`flex items-center ${isCollapsed ? "lg:justify-center lg:px-0 justify-start px-1 py-0.5 gap-3" : "gap-3 px-1 py-0.5"}`}>
            <Avatar size="sm" className="shrink-0">
              <Avatar.Image
                src={resolveProfilePhotoSrc(user?.profilePhoto)}
                alt={user?.name || "User"}
              />
              <Avatar.Fallback>
                {user?.name?.[0]?.toUpperCase() || "U"}
              </Avatar.Fallback>
            </Avatar>
            <div className={`flex min-w-0 flex-col ${isCollapsed ? "lg:hidden flex" : "flex"}`}>
              <span className="text-sm font-semibold leading-tight text-foreground">
                {user?.name || "Loading..."}
              </span>
              <span className="text-xs font-normal leading-tight text-default-500">
                {ROLE_LABEL[activeRole ?? ""] ?? activeRole ?? "—"}
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
