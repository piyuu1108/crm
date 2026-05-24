"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, Settings } from "lucide-react";
import { Avatar, Chip, ScrollShadow, Disclosure, Tooltip } from "@heroui/react";
import { useSidebar } from "@/components/layout/sidebar-context";
import { navigationConfig, Role, type NavItem } from "@/config/navigation";
import { useAuthStore } from "@/app/lib/store/use-auth-store";
import { useQuery } from "@tanstack/react-query";

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
  if (
    profilePhoto.startsWith("students/") ||
    profilePhoto.startsWith("faculty/")
  ) {
    return `/api/student/profile-photo?key=${encodeURIComponent(profilePhoto)}`;
  }
  return profilePhoto;
}

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
      if (isParentActive) setIsExpanded(true);
      else if (isCollapsed) setIsExpanded(false);
    });
    return () => cancelAnimationFrame(frameId);
  }, [pathname, isParentActive, isCollapsed]);

  const Icon = item.icon;

  return (
    <React.Fragment>
      {/* Expanded */}
      <li className={`w-full block lg:${isCollapsed ? "hidden" : "block"}`}>
        <Disclosure isExpanded={isExpanded} onExpandedChange={setIsExpanded}>
          <Disclosure.Heading>
            <Disclosure.Trigger
              className={`w-full flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] transition-colors cursor-pointer select-none text-left focus:outline-none ${
                isParentActive
                  ? "bg-default-100 text-foreground font-medium"
                  : "text-default-400 hover:bg-default-50 hover:text-default-700 font-normal"
              }`}
            >
              {Icon && <Icon className="size-[15px] shrink-0" />}
              <span className="flex-1">{item.title}</span>
              <ChevronDown
                className={`size-3.5 shrink-0 text-default-300 transition-transform duration-200 ${
                  isExpanded ? "rotate-180" : ""
                }`}
              />
            </Disclosure.Trigger>
          </Disclosure.Heading>
          <Disclosure.Content>
            <Disclosure.Body className="mt-0.5 flex flex-col gap-px border-l border-divider ml-[18px] pl-2.5">
              {item.children?.map((subItem) => {
                const isSubActive = subItem.href
                  ? isNavItemActive(pathname, subItem)
                  : false;
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
                    className={`block rounded px-2 py-1 text-[12px] text-left transition-colors ${
                      isSubActive
                        ? "text-foreground font-medium"
                        : "text-default-400 hover:text-default-700 font-normal"
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
                className={`flex items-center justify-center size-8 rounded-md transition-colors ${
                  isParentActive
                    ? "bg-default-100 text-foreground"
                    : "text-default-400 hover:bg-default-50 hover:text-default-700"
                }`}
                aria-label={item.title}
              >
                {Icon && <Icon className="size-[15px] shrink-0" />}
              </button>
            </div>
          </Tooltip.Trigger>
          <Tooltip.Content placement="right">
            <div className="flex flex-col gap-0.5 py-0.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-default-400 mb-1 px-1">
                {item.title}
              </p>
              {item.children?.map((child) => {
                const isChildActive = child.href
                  ? isNavItemActive(pathname, child)
                  : false;
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
                        ? "text-foreground font-medium"
                        : "text-foreground/70 hover:text-foreground"
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

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isCollapsed, isMobileOpen, closeMobile } = useSidebar();
  const { activeRole, user } = useAuthStore();

  const isStudent = activeRole === "student";
  const isFaculty =
    activeRole === "faculty" ||
    activeRole === "hod" ||
    activeRole === "counselor";
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
              if (item.title === "Requests") badge = pendingRequestsCount;
              const mappedItem = { ...item, badge };
              if (item.children) {
                mappedItem.children = item.children.filter((child) =>
                  activeRole
                    ? child.roles.includes(activeRole as Role)
                    : false
                );
              }
              return mappedItem;
            })
            .filter((item) => !item.children || item.children.length > 0),
        }))
        .filter((section) => section.items.length > 0),
    [activeRole, pendingRequestsCount]
  );

  React.useEffect(() => {
    closeMobile();
  }, [pathname, closeMobile]);

  const ROLE_LABEL: Record<string, string> = {
    hod: "Head of Department",
    faculty: "Faculty",
    counselor: "Counselor",
    student: "Student",
    admin: "Admin",
  };

  const isSettingsActive = pathname.startsWith("/settings");

  const settingsNavLink = (
    <button
      type="button"
      onClick={() => {
        router.push("/settings/customize");
        closeMobile();
      }}
      className={`flex items-center w-full rounded-md transition-colors ${
        isCollapsed
          ? "lg:justify-center lg:size-8 lg:mx-auto lg:p-0 gap-2.5 px-2.5 py-1.5 text-[13px]"
          : "gap-2.5 px-2.5 py-1.5 text-[13px]"
      } ${
        isSettingsActive
          ? "bg-default-100 text-foreground font-medium"
          : "text-default-400 hover:bg-default-50 hover:text-default-700 font-normal"
      }`}
      aria-label="Settings"
    >
      <Settings className="size-[15px] shrink-0" />
      <span className={`${isCollapsed ? "lg:hidden block" : "block"}`}>
        Settings
      </span>
    </button>
  );

  return (
    <>
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={closeMobile}
        />
      )}

      <aside
        className={`fixed left-0 top-0 h-screen border-r border-divider bg-background z-50 flex flex-col transition-transform lg:transition-all duration-300
          lg:translate-x-0 ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
          ${isCollapsed ? "lg:w-16 w-[240px]" : "w-[240px] lg:w-(--sidebar-width)"}
        `}
      >
        {/* Logo */}
        <div
          className={`flex items-center h-14 px-4 shrink-0 ${
            isCollapsed ? "lg:justify-center lg:px-0" : ""
          }`}
        >
          <div
            className={`flex items-center gap-2.5 ${
              isCollapsed ? "lg:justify-center" : ""
            }`}
          >
            <div className="flex size-7 items-center justify-center rounded-lg shrink-0">
              <img
                src="/logo1.png"
                alt=""
                className="h-5 w-5 object-contain"
              />
            </div>
            <span
              className={`text-[13px] font-semibold tracking-tight text-foreground ${
                isCollapsed ? "lg:hidden block" : "block"
              }`}
            >
              Vtcbcsr
            </span>
          </div>
        </div>

        <div className="h-px bg-divider shrink-0" />

        {/* Navigation */}
        <ScrollShadow
          className={`flex-1 py-3 ${isCollapsed ? "lg:px-2 px-3" : "px-3"}`}
          hideScrollBar
        >
          <nav>
            <ul className="flex flex-col gap-px">
              {filteredNav.map((section, sectionIdx) => (
                <React.Fragment key={section.section}>
                  {/* Section label */}
                  {sectionIdx > 0 && (
                    <li className="pt-3 pb-1">
                      <span
                        className={`block px-2.5 text-[10px] font-medium uppercase tracking-widest text-default-300 ${
                          isCollapsed ? "lg:hidden block" : "block"
                        }`}
                      >
                        {section.section}
                      </span>
                      {isCollapsed && (
                        <div className="hidden lg:block h-px bg-divider my-1 mx-1" />
                      )}
                    </li>
                  )}
                  {/* First section gets no label, just a small top gap if not first */}
                  {sectionIdx === 0 && (
                    <li
                      className={`pb-1 ${
                        isCollapsed ? "lg:hidden block" : "block"
                      }`}
                    >
                      <span className="block px-2.5 text-[10px] font-medium uppercase tracking-widest text-default-300">
                        {section.section}
                      </span>
                    </li>
                  )}

                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = isNavItemActive(pathname, item);

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

                    const navLink = (
                      <button
                        type="button"
                        onClick={() => {
                          if (item.href) {
                            router.push(item.href);
                            closeMobile();
                          }
                        }}
                        className={`flex items-center w-full rounded-md transition-colors ${
                          isCollapsed
                            ? "lg:justify-center lg:size-8 lg:mx-auto lg:p-0 gap-2.5 px-2.5 py-1.5 text-[13px]"
                            : "gap-2.5 px-2.5 py-1.5 text-[13px]"
                        } ${
                          isActive
                            ? "bg-default-100 text-foreground font-medium"
                            : "text-default-400 hover:bg-default-50 hover:text-default-700 font-normal"
                        }`}
                        aria-label={item.title}
                        aria-current={isActive ? "page" : undefined}
                      >
                        {Icon && <Icon className="size-[15px] shrink-0" />}
                        <span
                          className={`flex-1 text-left ${
                            isCollapsed ? "lg:hidden block" : "block"
                          }`}
                        >
                          {item.title}
                        </span>
                        {item.badge != null && item.badge > 0 && (
                          <Chip
                            size="sm"
                            color="danger"
                            variant="secondary"
                            className={`text-[10px] h-4 min-w-4 px-1 ${
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
                              <div className="flex w-full justify-center">
                                {navLink}
                              </div>
                            </Tooltip.Trigger>
                            <Tooltip.Content
                              placement="right"
                              className="capitalize"
                            >
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

        <div className="h-px bg-divider shrink-0" />

        {/* Settings */}
        <div className={`px-3 py-2 shrink-0 ${isCollapsed ? "lg:px-2" : ""}`}>
          {isCollapsed ? (
            <Tooltip delay={0}>
              <Tooltip.Trigger>
                <div className="flex w-full justify-center">
                  {settingsNavLink}
                </div>
              </Tooltip.Trigger>
              <Tooltip.Content placement="right">
                <p>Settings</p>
              </Tooltip.Content>
            </Tooltip>
          ) : (
            settingsNavLink
          )}
        </div>

        <div className="h-px bg-divider shrink-0" />

        {/* Footer: User info */}
        <div
          className={`px-3 py-3 shrink-0 ${isCollapsed ? "lg:px-2" : ""}`}
        >
          <div
            className={`flex items-center gap-3 rounded-md px-2 py-2 ${
              isCollapsed ? "lg:justify-center lg:px-0" : ""
            }`}
          >
            <Avatar size="sm" className="shrink-0 size-7">
              <Avatar.Image
                src={resolveProfilePhotoSrc(user?.profilePhoto)}
                alt={user?.name || "User"}
              />
              <Avatar.Fallback className="text-xs">
                {user?.name?.[0]?.toUpperCase() || "U"}
              </Avatar.Fallback>
            </Avatar>
            <div
              className={`flex min-w-0 flex-col ${
                isCollapsed ? "lg:hidden flex" : "flex"
              }`}
            >
              <span className="text-[13px] font-medium leading-tight text-foreground truncate">
                {user?.name || "Loading..."}
              </span>
              <span className="text-[11px] leading-tight text-default-400 truncate mt-0.5">
                {ROLE_LABEL[activeRole ?? ""] ?? activeRole ?? "—"}
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}