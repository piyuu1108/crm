"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Chip,
  Dropdown,
  Input,
  Label,
  Pagination,
  Table,
  Card,
  Checkbox,
  toast,
  type Selection,
  type SortDescriptor,
} from "@heroui/react";
import {
  Bell,
  Magnifier,
  Funnel,
  ChevronUp,
  Gear,
  ChevronDown,
  Check,
  Plus,
  CircleInfo,
} from "@gravity-ui/icons";
import { useAuthStore } from "@/app/lib/store/use-auth-store";
import {
  useNotificationsQuery,
  useMarkNotificationsReadMutation,
  useCreateNotificationMutation,
  type Notification,
} from "@/app/lib/queries/notifications";

// ─── Debounce Hook ───────────────────────────────────────────────────────────
function useDebounce(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

// ─── Columns Definition ──────────────────────────────────────────────────────
const COLUMNS = [
  { name: "Priority", uid: "priority" },
  { name: "Title", uid: "title" },
  { name: "Message", uid: "message" },
  { name: "Type", uid: "notificationType" },
  { name: "Created At", uid: "createdAt" },
  { name: "Status", uid: "isRead" },
  { name: "Actions", uid: "actions" },
];

const INITIAL_VISIBLE_COLUMNS = ["priority", "title", "message", "notificationType", "createdAt", "isRead", "actions"];

// ─── Constants ───────────────────────────────────────────────────────────────
const TYPE_CONFIG: Record<string, { label: string; color: "default" | "success" | "warning" | "danger" | "accent" }> = {
  leave_request: { label: "Request", color: "accent" },
  timetable_change: { label: "Timetable", color: "accent" },
  approval: { label: "Approval", color: "success" },
  assignment_update: { label: "Assignment", color: "warning" },
  fee_event: { label: "Fee Event", color: "danger" },
  counselor_action: { label: "Counselor", color: "success" },
  admin_action: { label: "Admin Alert", color: "danger" },
  system_alert: { label: "System", color: "default" },
};

const PRIORITY_COLOR: Record<string, "default" | "warning" | "danger"> = {
  low: "default",
  medium: "warning",
  high: "danger",
};

// ─── Sortable Column Header ──────────────────────────────────────────────────
function SortableColumnHeader({
  children,
  sortDirection,
}: {
  children: React.ReactNode;
  sortDirection?: "ascending" | "descending";
}) {
  return (
    <span className="flex items-center gap-1">
      {children}
      {!!sortDirection && (
        <ChevronUp
          className={`size-3 transform transition-transform duration-100 ease-out ${
            sortDirection === "descending" ? "rotate-180" : ""
          }`}
        />
      )}
    </span>
  );
}

// ─── Page Component ──────────────────────────────────────────────────────────
export default function NotificationsPage() {
  const { activeRole } = useAuthStore();
  const router = useRouter();

  // ─── Table State ───────────────────────────────────────────────────────────
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 300);

  // ─── Filter State ──────────────────────────────────────────────────────────
  const [isReadFilter, setIsReadFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [dateRangeFilter, setDateRangeFilter] = useState<string>("all");

  // ─── Selection & Sorting ───────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: "createdAt",
    direction: "descending",
  });

  // ─── Simulation Modal State ────────────────────────────────────────────────
  const [isSimulateOpen, setIsSimulateOpen] = useState(false);
  const [simTitle, setSimTitle] = useState("");
  const [simMessage, setSimMessage] = useState("");
  const [simType, setSimType] = useState("fee_event");
  const [simReceiverId, setSimReceiverId] = useState("");
  const [simReceiverRole, setSimReceiverRole] = useState("student");
  const [simPriority, setSimPriority] = useState("medium");

  // ─── Visible Columns State ─────────────────────────────────────────────────
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set(INITIAL_VISIBLE_COLUMNS));
  const rowsPerPage = 10;

  useEffect(() => {
    const saved = localStorage.getItem("notifications_table_columns");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setVisibleColumns(new Set(parsed));
        }
      } catch (e) {}
    }
  }, []);

  const handleColumnSelectionChange = (keys: any) => {
    if (keys === "all") {
      const allKeys = COLUMNS.map((c) => c.uid);
      setVisibleColumns(new Set(allKeys));
      localStorage.setItem("notifications_table_columns", JSON.stringify(allKeys));
      return;
    }
    const newKeys = Array.from(keys) as string[];
    setVisibleColumns(new Set(newKeys));
    localStorage.setItem("notifications_table_columns", JSON.stringify(newKeys));
  };

  // ─── Fetch API ─────────────────────────────────────────────────────────────
  const params = useMemo(() => {
    const qParams: any = {
      limit: rowsPerPage,
      offset: (page - 1) * rowsPerPage,
    };
    if (isReadFilter !== "all") qParams.isRead = isReadFilter;
    if (priorityFilter !== "all") qParams.priority = priorityFilter;
    if (typeFilter !== "all") qParams.notificationType = typeFilter;
    if (dateRangeFilter !== "all") qParams.dateRange = dateRangeFilter;
    if (debouncedSearch) qParams.search = debouncedSearch;
    return qParams;
  }, [page, isReadFilter, priorityFilter, typeFilter, dateRangeFilter, debouncedSearch]);

  const { data, isLoading, isError, error } = useNotificationsQuery(params, activeRole);

  const notificationsList = data?.notifications || [];
  const metrics = data?.metrics || { total: 0, unread: 0, read: 0, highPriority: 0, today: 0 };
  const pagination = data?.pagination || { total: 0, limit: rowsPerPage, offset: 0, totalPages: 0 };

  // ─── Mutations ─────────────────────────────────────────────────────────────
  const markReadMutation = useMarkNotificationsReadMutation(activeRole);
  const createNotificationMutation = useCreateNotificationMutation();

  const handleMarkAsRead = useCallback(
    async (ids: number[]) => {
      try {
        await markReadMutation.mutateAsync({ ids });
        toast.success("Notifications updated successfully");
        setSelectedIds(new Set());
      } catch (err: any) {
        toast.danger("Failed to update notifications", {
          description: err.message || "Please try again.",
        });
      }
    },
    [markReadMutation]
  );

  const handleMarkAllAsRead = useCallback(async () => {
    try {
      await markReadMutation.mutateAsync({ all: true });
      toast.success("All notifications marked as read");
    } catch (err: any) {
      toast.danger("Failed to update notifications", {
        description: err.message || "Please try again.",
      });
    }
  }, [markReadMutation]);

  const handleSimulateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simTitle || !simMessage || !simReceiverId) {
      toast.danger("Please fill in all required fields");
      return;
    }

    try {
      await createNotificationMutation.mutateAsync({
        title: simTitle,
        message: simMessage,
        notificationType: simType,
        receiverUserId: simReceiverId.trim(),
        receiverRole: simReceiverRole,
        priority: simPriority,
      });

      toast.success("Notification event simulated successfully");
      setIsSimulateOpen(false);
      setSimTitle("");
      setSimMessage("");
      setSimReceiverId("");
    } catch (err: any) {
      toast.danger("Failed to simulate event", {
        description: err.message || "Please try again.",
      });
    }
  };

  // ─── Sorting Logic ─────────────────────────────────────────────────────────
  const sortedItems = useMemo(() => {
    const items = [...notificationsList];
    return items.sort((a, b) => {
      let first = a[sortDescriptor.column as keyof Notification];
      let second = b[sortDescriptor.column as keyof Notification];
      
      if (first === null || first === undefined) first = "";
      if (second === null || second === undefined) second = "";

      let cmp = first < second ? -1 : first > second ? 1 : 0;
      return sortDescriptor.direction === "descending" ? -cmp : cmp;
    });
  }, [notificationsList, sortDescriptor]);

  const handleSortChange = useCallback((descriptor: SortDescriptor) => {
    setSortDescriptor(descriptor);
    setPage(1);
  }, []);

  const totalPages = Math.ceil(pagination.total / rowsPerPage) || 1;

  // ─── Bulk Select Logic ─────────────────────────────────────────────────────
  const isAllSelected = sortedItems.length > 0 && sortedItems.every((item) => selectedIds.has(item.id));
  const isSomeSelected = sortedItems.some((item) => selectedIds.has(item.id)) && !isAllSelected;

  const handleSelectAllToggle = () => {
    if (isAllSelected) {
      const newSelected = new Set(selectedIds);
      sortedItems.forEach((item) => newSelected.delete(item.id));
      setSelectedIds(newSelected);
    } else {
      const newSelected = new Set(selectedIds);
      sortedItems.forEach((item) => newSelected.add(item.id));
      setSelectedIds(newSelected);
    }
  };

  const handleSelectRow = (id: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleViewDetails = (notif: Notification) => {
    if (notif.relatedEntityType === "student_requests" && notif.relatedEntityId) {
      router.push(`/app/workflows/requests/${notif.relatedEntityId}`);
    } else {
      toast.info("No detailed view available for this type of event.", {
        description: notif.message,
      });
    }
  };

  const hasActiveFilters =
    isReadFilter !== "all" ||
    priorityFilter !== "all" ||
    typeFilter !== "all" ||
    dateRangeFilter !== "all" ||
    searchInput.trim() !== "";

  const handleClearFilters = () => {
    setIsReadFilter("all");
    setPriorityFilter("all");
    setTypeFilter("all");
    setDateRangeFilter("all");
    setSearchInput("");
    setPage(1);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* ─── Page Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            Manage system alerts, course notifications, and task approvals
          </p>
        </div>
        <div className="flex items-center gap-2">
          {["faculty", "counselor", "hod", "admin"].includes(activeRole || "") && (
            <Button variant="secondary" size="sm" className="font-semibold" onPress={() => setIsSimulateOpen(true)}>
              <Plus className="size-4 mr-1" />
              Simulate Event
            </Button>
          )}
          {metrics.unread > 0 && (
            <Button variant="secondary" size="sm" onPress={handleMarkAllAsRead}>
              <Check className="size-4 mr-1" />
              Mark All Read
            </Button>
          )}
        </div>
      </div>

      {/* ─── Metrics Dashboard Grid ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <Card className="border border-divider bg-card/40 backdrop-blur-md">
          <Card.Content className="p-4 flex flex-col gap-1">
            <span className="text-xs font-semibold text-muted-foreground capitalize">Total Alerts</span>
            <span className="text-2xl font-bold text-foreground">{metrics.total}</span>
          </Card.Content>
        </Card>
        <Card className="border border-divider bg-card/40 backdrop-blur-md">
          <Card.Content className="p-4 flex flex-col gap-1 border-l-4 border-l-primary">
            <span className="text-xs font-semibold text-muted-foreground capitalize">Unread</span>
            <span className="text-2xl font-bold text-primary">{metrics.unread}</span>
          </Card.Content>
        </Card>
        <Card className="border border-divider bg-card/40 backdrop-blur-md">
          <Card.Content className="p-4 flex flex-col gap-1 border-l-4 border-l-success">
            <span className="text-xs font-semibold text-muted-foreground capitalize">Read</span>
            <span className="text-2xl font-bold text-success">{metrics.read}</span>
          </Card.Content>
        </Card>
        <Card className="border border-divider bg-card/40 backdrop-blur-md">
          <Card.Content className="p-4 flex flex-col gap-1 border-l-4 border-l-danger">
            <span className="text-xs font-semibold text-muted-foreground capitalize">High Priority</span>
            <span className="text-2xl font-bold text-danger">{metrics.highPriority}</span>
          </Card.Content>
        </Card>
        <Card className="border border-divider bg-card/40 backdrop-blur-md col-span-2 sm:col-span-1">
          <Card.Content className="p-4 flex flex-col gap-1">
            <span className="text-xs font-semibold text-muted-foreground capitalize">Received Today</span>
            <span className="text-2xl font-bold text-foreground">{metrics.today}</span>
          </Card.Content>
        </Card>
      </div>

      {/* ─── Filters Toolbar ────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-center gap-3">
            {/* Search */}
            <div className="relative w-full max-w-xs">
              <Input
                placeholder="Search alerts..."
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  setPage(1);
                }}
                className="pl-9 w-full"
                aria-label="Search notifications"
              />
              <Magnifier className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            </div>

            {/* Clear filters */}
            {hasActiveFilters && (
              <Button variant="secondary" size="sm" onPress={handleClearFilters}>
                Clear Filters
              </Button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Column Selector */}
            <Dropdown>
              <Button variant="secondary" size="sm">
                Columns <Gear className="size-4 ml-1" />
                <ChevronDown className="size-4 ml-1" />
              </Button>
              <Dropdown.Popover>
                <Dropdown.Menu
                  disallowEmptySelection
                  aria-label="Table Columns"
                  selectedKeys={visibleColumns}
                  selectionMode="multiple"
                  onSelectionChange={handleColumnSelectionChange}
                >
                  {COLUMNS.map((column) => (
                    <Dropdown.Item id={column.uid} key={column.uid} textValue={column.name} className="capitalize">
                      <Dropdown.ItemIndicator />
                      <Label>{column.name}</Label>
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown>
          </div>
        </div>

        {/* Advanced Compact Filtering Panel */}
        <div className="flex flex-wrap gap-2 items-center p-3 rounded-xl border border-divider bg-default-50">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mr-2">
            <Funnel className="size-3.5" />
            Filters:
          </div>

          {/* Read Status */}
          <div className="flex items-center gap-1.5 bg-background px-3 py-1.5 rounded-lg border border-divider">
            <span className="text-[11px] text-muted-foreground">Status:</span>
            <select
              value={isReadFilter}
              onChange={(e) => {
                setIsReadFilter(e.target.value);
                setPage(1);
              }}
              className="bg-transparent text-xs font-semibold outline-none cursor-pointer text-foreground"
            >
              <option value="all">All</option>
              <option value="false">Unread</option>
              <option value="true">Read</option>
            </select>
          </div>

          {/* Priority */}
          <div className="flex items-center gap-1.5 bg-background px-3 py-1.5 rounded-lg border border-divider">
            <span className="text-[11px] text-muted-foreground">Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value);
                setPage(1);
              }}
              className="bg-transparent text-xs font-semibold outline-none cursor-pointer text-foreground"
            >
              <option value="all">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          {/* Notification Type */}
          <div className="flex items-center gap-1.5 bg-background px-3 py-1.5 rounded-lg border border-divider">
            <span className="text-[11px] text-muted-foreground">Event:</span>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="bg-transparent text-xs font-semibold outline-none cursor-pointer text-foreground"
            >
              <option value="all">All Events</option>
              <option value="leave_request">Leave Requests</option>
              <option value="timetable_change">Timetable Changes</option>
              <option value="approval">Approvals</option>
              <option value="assignment_update">Assignment Updates</option>
              <option value="fee_event">Fees / Bills</option>
              <option value="counselor_action">Counselor Actions</option>
              <option value="admin_action">Administrative Actions</option>
            </select>
          </div>

          {/* Date range filter */}
          <div className="flex items-center gap-1.5 bg-background px-3 py-1.5 rounded-lg border border-divider">
            <span className="text-[11px] text-muted-foreground">Date:</span>
            <select
              value={dateRangeFilter}
              onChange={(e) => {
                setDateRangeFilter(e.target.value);
                setPage(1);
              }}
              className="bg-transparent text-xs font-semibold outline-none cursor-pointer text-foreground"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>
        </div>
      </div>

      {/* ─── Bulk Action Banner ──────────────────────────────────────────────── */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-primary/10 border border-primary/20 animate-fade-in">
          <span className="text-xs font-semibold text-primary">
            {selectedIds.size} row{selectedIds.size > 1 ? "s" : ""} selected
          </span>
          <Button
            size="sm"
            variant="primary"
            className="font-semibold"
            onPress={() => handleMarkAsRead(Array.from(selectedIds))}
          >
            Mark as Read
          </Button>
        </div>
      )}

      {/* ─── Notifications Table ────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex flex-col gap-3 animate-pulse">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 rounded-xl border border-divider bg-default/10" />
          ))}
        </div>
      ) : isError ? (
        <Card className="border border-danger/30 bg-danger/5 p-8 text-center">
          <Card.Content className="flex flex-col items-center gap-3">
            <CircleInfo className="size-8 text-danger" />
            <h2 className="text-lg font-semibold text-foreground">Failed to load notifications</h2>
            <p className="text-xs text-muted-foreground">
              {error instanceof Error ? error.message : "An unexpected server error occurred."}
            </p>
          </Card.Content>
        </Card>
      ) : sortedItems.length === 0 ? (
        <Card className="border border-divider p-12 text-center">
          <Card.Content className="flex flex-col items-center gap-3">
            <Bell className="size-8 text-muted-foreground animate-bounce" />
            <p className="text-sm font-medium text-foreground">All caught up!</p>
            <p className="text-xs text-muted-foreground">No alerts match your current filters.</p>
          </Card.Content>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          <Table>
            <Table.ScrollContainer>
              <Table.Content
                aria-label="Notifications table"
                className="min-w-[800px]"
                sortDescriptor={sortDescriptor}
                onSortChange={handleSortChange}
              >
                <Table.Header>
                  <Table.Column className="w-[50px] text-center">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={handleSelectAllToggle}
                      className="h-4 w-4 rounded border-divider cursor-pointer accent-primary"
                    />
                  </Table.Column>
                  {visibleColumns.has("priority") && (
                    <Table.Column allowsSorting id="priority" className="w-[100px]">
                      {({ sortDirection }) => (
                        <SortableColumnHeader sortDirection={sortDirection}>
                          Priority
                        </SortableColumnHeader>
                      )}
                    </Table.Column>
                  )}
                  {visibleColumns.has("title") && (
                    <Table.Column allowsSorting id="title" className="min-w-[200px]">
                      {({ sortDirection }) => (
                        <SortableColumnHeader sortDirection={sortDirection}>
                          Title
                        </SortableColumnHeader>
                      )}
                    </Table.Column>
                  )}
                  {visibleColumns.has("message") && <Table.Column id="message" className="min-w-[300px]">Message</Table.Column>}
                  {visibleColumns.has("notificationType") && (
                    <Table.Column allowsSorting id="notificationType" className="w-[140px]">
                      {({ sortDirection }) => (
                        <SortableColumnHeader sortDirection={sortDirection}>
                          Type
                        </SortableColumnHeader>
                      )}
                    </Table.Column>
                  )}
                  {visibleColumns.has("createdAt") && (
                    <Table.Column allowsSorting id="createdAt" className="w-[160px]">
                      {({ sortDirection }) => (
                        <SortableColumnHeader sortDirection={sortDirection}>
                          Date/Time
                        </SortableColumnHeader>
                      )}
                    </Table.Column>
                  )}
                  {visibleColumns.has("isRead") && (
                    <Table.Column allowsSorting id="isRead" className="w-[100px]">
                      {({ sortDirection }) => (
                        <SortableColumnHeader sortDirection={sortDirection}>
                          Status
                        </SortableColumnHeader>
                      )}
                    </Table.Column>
                  )}
                  {visibleColumns.has("actions") && <Table.Column id="actions" className="w-[100px] text-right">Actions</Table.Column>}
                </Table.Header>

                <Table.Body>
                  {sortedItems.map((notif) => {
                    const dateStr = new Intl.DateTimeFormat("en-US", {
                      month: "short",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(new Date(notif.createdAt));

                    const typeDetails = TYPE_CONFIG[notif.notificationType] || { label: notif.notificationType, color: "default" };

                    return (
                      <Table.Row
                        key={notif.id}
                        className={`transition-colors hover:bg-default-50/50 ${!notif.isRead ? "bg-primary/5 hover:bg-primary/10" : ""}`}
                      >
                        <Table.Cell className="text-center">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(notif.id)}
                            onChange={() => handleSelectRow(notif.id)}
                            className="h-4 w-4 rounded border-divider cursor-pointer accent-primary"
                          />
                        </Table.Cell>

                        {visibleColumns.has("priority") && (
                          <Table.Cell>
                            <Chip size="sm" color={PRIORITY_COLOR[notif.priority] || "default"} variant="secondary" className="capitalize font-semibold text-[10px]">
                              {notif.priority}
                            </Chip>
                          </Table.Cell>
                        )}

                        {visibleColumns.has("title") && (
                          <Table.Cell className="font-semibold text-sm text-foreground">
                            {notif.title}
                          </Table.Cell>
                        )}

                        {visibleColumns.has("message") && (
                          <Table.Cell className="text-xs text-muted-foreground line-clamp-2 max-w-[400px]">
                            {notif.message}
                          </Table.Cell>
                        )}

                        {visibleColumns.has("notificationType") && (
                          <Table.Cell>
                            <Chip size="sm" color={typeDetails.color} variant="secondary" className="font-semibold text-[10px]">
                              {typeDetails.label}
                            </Chip>
                          </Table.Cell>
                        )}

                        {visibleColumns.has("createdAt") && (
                          <Table.Cell className="text-xs text-muted-foreground whitespace-nowrap">
                            {dateStr}
                          </Table.Cell>
                        )}

                        {visibleColumns.has("isRead") && (
                          <Table.Cell>
                            <Chip size="sm" color={notif.isRead ? "success" : "accent"} variant="secondary" className="font-semibold text-[10px]">
                              {notif.isRead ? "Read" : "Unread"}
                            </Chip>
                          </Table.Cell>
                        )}

                        {visibleColumns.has("actions") && (
                          <Table.Cell className="text-right">
                            <div className="flex justify-end gap-1.5">
                              {!notif.isRead && (
                                <Button size="sm" variant="ghost" className="p-1 min-w-[28px] size-7" onPress={() => handleMarkAsRead([notif.id])}>
                                  <Check className="size-4" />
                                </Button>
                              )}
                              <Button size="sm" variant="ghost" className="p-1 min-w-[28px] size-7 text-primary" onPress={() => handleViewDetails(notif)}>
                                <CircleInfo className="size-4" />
                              </Button>
                            </div>
                          </Table.Cell>
                        )}
                      </Table.Row>
                    );
                  })}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>

          {/* ─── Pagination Footer ─────────────────────────────────────────── */}
          {totalPages > 1 && (
            <Table.Footer>
              <Pagination size="sm">
                <Pagination.Summary>
                  {((page - 1) * rowsPerPage) + 1} to {Math.min(page * rowsPerPage, pagination.total)} of {pagination.total} results
                </Pagination.Summary>
                <Pagination.Content>
                  <Pagination.Item>
                    <Pagination.Previous
                      isDisabled={page === 1}
                      onPress={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      <Pagination.PreviousIcon />
                      Prev
                    </Pagination.Previous>
                  </Pagination.Item>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (p) => (
                      <Pagination.Item key={p}>
                        <Pagination.Link
                          isActive={page === p}
                          onPress={() => setPage(p)}
                        >
                          {p}
                        </Pagination.Link>
                      </Pagination.Item>
                    )
                  )}
                  <Pagination.Item>
                    <Pagination.Next
                      isDisabled={page === totalPages}
                      onPress={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                    >
                      Next
                      <Pagination.NextIcon />
                    </Pagination.Next>
                  </Pagination.Item>
                </Pagination.Content>
              </Pagination>
            </Table.Footer>
          )}
        </div>
      )}

      {/* ─── Simulation Modal Dialog ────────────────────────────────────────── */}
      {isSimulateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
          <Card className="w-full max-w-md border border-divider shadow-2xl bg-card">
            <Card.Content className="p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-divider pb-3">
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Bell className="size-5 text-secondary" />
                  Simulate Business Event
                </h3>
                <Button size="sm" variant="ghost" className="min-w-0 p-1 size-7" onPress={() => setIsSimulateOpen(false)}>
                  ✕
                </Button>
              </div>

              <form onSubmit={handleSimulateSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Receiver User ID (number)*</label>
                  <Input
                    placeholder="Enter recipient user ID (e.g. student/faculty ID number)"
                    value={simReceiverId}
                    onChange={(e) => setSimReceiverId(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Receiver Role*</label>
                    <select
                      value={simReceiverRole}
                      onChange={(e) => setSimReceiverRole(e.target.value)}
                      className="w-full p-2 text-sm bg-background border border-divider rounded-xl outline-none"
                    >
                      <option value="student">Student</option>
                      <option value="faculty">Faculty</option>
                      <option value="counselor">Counselor</option>
                      <option value="hod">HOD</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Event Type*</label>
                    <select
                      value={simType}
                      onChange={(e) => setSimType(e.target.value)}
                      className="w-full p-2 text-sm bg-background border border-divider rounded-xl outline-none"
                    >
                      <option value="leave_request">Leave Request</option>
                      <option value="timetable_change">Timetable Change</option>
                      <option value="approval">Approval</option>
                      <option value="assignment_update">Assignment Update</option>
                      <option value="fee_event">Fee / Billing Alert</option>
                      <option value="counselor_action">Counselor Alert</option>
                      <option value="admin_action">Admin Alert</option>
                      <option value="system_alert">System Notice</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Priority Override</label>
                    <select
                      value={simPriority}
                      onChange={(e) => setSimPriority(e.target.value)}
                      className="w-full p-2 text-sm bg-background border border-divider rounded-xl outline-none"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Title*</label>
                  <Input
                    placeholder="E.g. Outstanding Tuition Fee Alert"
                    value={simTitle}
                    onChange={(e) => setSimTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Message*</label>
                  <textarea
                    placeholder="Enter full notification content..."
                    value={simMessage}
                    onChange={(e) => setSimMessage(e.target.value)}
                    required
                    className="w-full p-2.5 min-h-[80px] text-sm bg-background border border-divider rounded-xl outline-none resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 border-t border-divider pt-3 mt-1">
                  <Button size="sm" variant="secondary" onPress={() => setIsSimulateOpen(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" variant="primary" type="submit">
                    Broadcast Notification
                  </Button>
                </div>
              </form>
            </Card.Content>
          </Card>
        </div>
      )}
    </div>
  );
}
