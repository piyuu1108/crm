"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, Settings } from "lucide-react";
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
        <Disclosure isExpanded={isExpanded} onExpandedChange={setIsExpanded}>
          <Disclosure.Heading>
            <Disclosure.Trigger
              className={`group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] transition-all duration-200 ease-in-out cursor-pointer select-none text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-default-400 ${
                isParentActive
                  ? "bg-default-100 text-foreground font-medium"
                  : "text-default-500 hover:bg-default-50 hover:text-foreground font-normal"
              }`}
            >
              {Icon && <Icon className="size-4 shrink-0" />}
              <span className="flex-1 truncate">{item.title}</span>
              <ChevronDown
                className={`size-4 shrink-0 transition-transform duration-200 ease-in-out opacity-70 group-hover:opacity-100 ${
                  isExpanded ? "rotate-180" : ""
                }`}
              />
            </Disclosure.Trigger>
          </Disclosure.Heading>
          <Disclosure.Content>
            <Disclosure.Body className="mt-0.5 flex flex-col gap-0.5 border-l-2 border-divider ml-[20px] pl-2.5">
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
                    className={`block w-full truncate rounded-md px-2.5 py-1 text-[12px] text-left transition-all duration-200 ease-in-out cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-default-400 ${
                      isSubActive
                        ? "text-foreground bg-white dark:bg-default-100 shadow-sm  font-medium"
                        : "text-default-500 hover:text-foreground hover:bg-default-50/50 font-normal"
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
                className={`flex items-center justify-center size-8 mx-auto rounded-lg transition-all duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-default-400 ${
                  isParentActive
                    ? "bg-default-100 text-foreground"
                    : "text-default-500 hover:bg-default-50 hover:text-foreground"
                }`}
                aria-label={item.title}
              >
                {Icon && <Icon className="size-4.5 shrink-0" />}
              </button>
            </div>
          </Tooltip.Trigger>
          <Tooltip.Content placement="right" className="ml-2">
            <div className="flex flex-col gap-1 py-1.5 px-1 min-w-[140px]">
              <p className="text-[13px] font-medium text-foreground/80 mb-1  px-2 uppercase tracking-wider">
                {item.title}
              </p>
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
                    className={`rounded-md w-full px-2 py-1 text-left text-xs transition-colors cursor-pointer focus-visible:outline-none ${
                      isChildActive
                        ? "text-foreground bg-white dark:bg-default-100 shadow-sm  font-medium"
                        : "text-foreground/80 hover:text-foreground hover:bg-default-50"
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
    principal: "Principal",
    vice_principal: "Vice Principal",
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
        className={`fixed left-0 top-0 h-screen border-r border-divider bg-background z-50 flex flex-col transition-all duration-300 ease-in-out lg:translate-x-0 ${
          isMobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        } ${isCollapsed ? "lg:w-20 w-[260px]" : "w-[260px] lg:w-(--sidebar-width)"}`}
      >
        {/* Header: Company logo & name */}
        <div className={`px-4 pt-4 pb-2 ${isCollapsed ? "lg:px-3" : ""}`}>
          <div className={`flex items-center ${isCollapsed ? "lg:justify-center justify-start gap-3" : "gap-3"}`}>
            <div className="flex size-8 items-center justify-center rounded-xl shrink-0 bg-default-50 border border-default-100">
              <img src="/logo1.png" alt="Vtcbcsr Logo" className="h-5 w-5 object-contain" />
            </div>
            <span
              className={`text-[15px] font-bold tracking-tight text-foreground truncate ${
                isCollapsed ? "lg:hidden block" : "block"
              }`}
            >
              Vtcbcsr
            </span>
          </div>
        </div>

        {/* Navigation */}
        <ScrollShadow
          className={`flex-1 ${isCollapsed ? "lg:px-3 lg:pb-4 lg:pt-1 px-4 pb-4 pt-1" : "px-4 pb-2 pt-1"}`}
          hideScrollBar
        >
          <nav>
            <ul className="flex flex-col gap-0.5">
              {filteredNav.map((section, sectionIdx) => (
                <React.Fragment key={section.section}>
                  {/* Section label */}
                  <li
                    className={`overflow-hidden transition-all duration-200 ease-in-out ${
                      isCollapsed ? "lg:h-0 lg:opacity-0 h-7 opacity-100" : "h-7 opacity-100"
                    } ${sectionIdx > 0 ? "mt-3.5" : "mt-5"}`}
                  >
                    <span className="px-3 flex items-center h-full text-[11px] font-bold uppercase tracking-wider text-default-400">
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
                        className={`flex items-center w-full transition-all duration-200 ease-in-out rounded-lg cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-default-400 ${
                          isCollapsed
                            ? "lg:justify-center lg:size-8 lg:mx-auto lg:p-0 gap-2.5 px-2.5 py-1.5 text-[13px]"
                            : "gap-2.5 px-2.5 py-1.5 text-[13px]"
                        } ${
                          isActive
                            ? "bg-white dark:bg-default-100 shadow-sm  text-foreground font-medium"
                            : "text-default-500 hover:bg-default-50/50 hover:text-foreground font-normal"
                        }`}
                        aria-label={item.title}
                        aria-current={isActive ? "page" : undefined}
                      >
                        {Icon && <Icon className="size-4 shrink-0" />}
                        <span
                          className={`flex-1 text-left truncate ${
                            isCollapsed ? "lg:hidden block" : "block"
                          }`}
                        >
                          {item.title}
                        </span>
                        {item.badge != null && item.badge > 0 && (
                          <Chip
                            size="sm"
                            color="danger"
                            variant="soft"
                            className={`h-5 px-1 text-[11px] font-medium ${
                              isCollapsed ? "lg:hidden" : ""
                            }`}
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
                            <Tooltip.Content placement="right" className="ml-2 capitalize px-3 py-1.5 text-sm font-medium">
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
        <div className={`px-4 pb-3 pt-2 ${isCollapsed ? "lg:px-3" : ""}`}>
          <button
            type="button"
            onClick={() => {
              router.push("/settings/customize");
              closeMobile();
            }}
            className={`flex items-center w-full rounded-lg transition-all duration-200 ease-in-out cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-default-400 ${
              isCollapsed
                ? "lg:justify-center lg:size-8 lg:mx-auto lg:p-0 gap-2.5 px-2.5 py-1.5 text-[13px]"
                : "gap-2.5 px-2.5 py-1.5 text-[13px]"
            } ${
              pathname.startsWith("/settings")
                ? "bg-white dark:bg-default-100 shadow-sm  text-foreground font-medium"
                : "text-default-500 hover:bg-default-50/50 hover:text-foreground font-normal"
            }`}
            aria-label="Settings"
          >
            <Settings className="size-4 shrink-0" />
            <span className={`truncate text-left flex-1 ${isCollapsed ? "lg:hidden block" : "block"}`}>
              Settings
            </span>
          </button>
        </div>

        {/* Footer: User info */}
        <div className="border-t border-divider px-4 py-4 bg-default-50/30">
          <div
            className={`flex items-center ${
              isCollapsed ? "lg:justify-center lg:px-0 justify-start px-1 gap-3" : "gap-3 px-1"
            }`}
          >
            <Avatar 
              size="sm" 
              className="shrink-0 border border-divider"
            >
              <Avatar.Image
                src={resolveProfilePhotoSrc(user?.profilePhoto)}
                alt={user?.name || "User"}
              />
              <Avatar.Fallback className="text-xs">
                {user?.name?.[0]?.toUpperCase() || "U"}
              </Avatar.Fallback>
            </Avatar>
            <div className={`flex min-w-0 flex-1 flex-col ${isCollapsed ? "lg:hidden flex" : "flex"}`}>
              <span className="truncate text-[13px] font-semibold leading-tight text-foreground">
                {user?.name || "Loading..."}
              </span>
              <span className="truncate text-[11px] font-medium leading-tight text-default-500 mt-0.5">
                {ROLE_LABEL[activeRole ?? ""] ?? activeRole ?? "—"}
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}