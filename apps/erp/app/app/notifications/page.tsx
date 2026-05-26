"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Chip,
  Dropdown,
  Input,
  Label,
  Card,
  toast,
  Modal,
  Select,
  ListBox,
  TextArea,
  TextField,
  type Selection,
  type SortDescriptor,
} from "@heroui/react";
import {
  Bell,
  ChevronDown,
  Check,
  Plus,
  CircleInfo,
} from "@gravity-ui/icons";
import { useAuthStore } from "@/app/lib/store/use-auth-store";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { DataTable, type TableColumnDef } from "@/components/data-table";

// Notification type matching Convex document shape
interface Notification {
  _id: Id<"notifications">;
  _creationTime: number;
  title: string;
  message: string;
  notificationType: string;
  relatedEntityType?: string;
  relatedEntityId?: number;
  createdBy?: number;
  receiverUserId: number;
  receiverRole?: string;
  priority: "low" | "medium" | "high";
  isRead: boolean;
  metadata?: any;
  // Computed for compatibility
  id: number;
  createdAt: string;
}

// ─── Columns Definition ──────────────────────────────────────────────────────
const COLUMNS: TableColumnDef[] = [
  { name: "Priority", uid: "priority", allowsSorting: true, className: "w-[100px]" },
  { name: "Title", uid: "title", allowsSorting: true, isRowHeader: true, className: "min-w-[200px]" },
  { name: "Message", uid: "message", className: "min-w-[300px]" },
  { name: "Type", uid: "notificationType", allowsSorting: true, className: "w-[140px]" },
  { name: "Created At", uid: "createdAt", allowsSorting: true, className: "w-[160px]" },
  { name: "Status", uid: "isRead", allowsSorting: true, className: "w-[100px]" },
  { name: "Actions", uid: "actions", className: "w-[100px] text-right" },
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

// ─── Page Component ──────────────────────────────────────────────────────────
export default function NotificationsPage() {
  const { activeRole } = useAuthStore();
  const router = useRouter();

  // ─── Table State ───────────────────────────────────────────────────────────
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // ─── Filter State ──────────────────────────────────────────────────────────
  const [isReadFilter, setIsReadFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [dateRangeFilter, setDateRangeFilter] = useState<string>("all");

  // ─── Selection & Sorting ───────────────────────────────────────────────────
  const [selectedKeys, setSelectedKeys] = useState<Selection>(new Set());
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

  // ─── Convex Reactive Data ──────────────────────────────────────────────────
  const { user } = useAuthStore();
  const convexData = useQuery(
    api.notifications.listForUser,
    user ? { receiverUserId: user.id } : "skip"
  );

  const isLoading = convexData === undefined;
  const isError = false;
  const error = null;

  const allNotifications: Notification[] = useMemo(() => {
    if (!convexData) return [];
    return convexData.notifications.map((n, idx) => ({
      ...n,
      id: idx,
      createdAt: new Date(n._creationTime).toISOString(),
    }));
  }, [convexData]);

  // Client-side filtering
  const filteredNotifications = useMemo(() => {
    let items = [...allNotifications];
    if (isReadFilter !== "all") {
      items = items.filter((n) => String(n.isRead) === isReadFilter);
    }
    if (priorityFilter !== "all") {
      items = items.filter((n) => n.priority === priorityFilter);
    }
    if (typeFilter !== "all") {
      items = items.filter((n) => n.notificationType === typeFilter);
    }
    if (dateRangeFilter !== "all") {
      const now = new Date();
      if (dateRangeFilter === "today") {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        items = items.filter((n) => n._creationTime >= start);
      } else if (dateRangeFilter === "week") {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()).getTime();
        items = items.filter((n) => n._creationTime >= start);
      } else if (dateRangeFilter === "month") {
        const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
        items = items.filter((n) => n._creationTime >= start);
      }
    }
    if (searchInput.trim()) {
      const q = searchInput.trim().toLowerCase();
      items = items.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.message.toLowerCase().includes(q)
      );
    }
    return items;
  }, [allNotifications, isReadFilter, priorityFilter, typeFilter, dateRangeFilter, searchInput]);

  const notificationsList = filteredNotifications;
  const metrics = convexData?.metrics || { total: 0, unread: 0, read: 0, highPriority: 0, today: 0 };

  // ─── Convex Mutations ─────────────────────────────────────────────────────
  const convexMarkAsRead = useMutation(api.notifications.markAsRead);
  const convexMarkAllAsRead = useMutation(api.notifications.markAllAsRead);
  const convexCreate = useMutation(api.notifications.create);

  const handleMarkAsRead = useCallback(
    async (ids: Id<"notifications">[]) => {
      try {
        await convexMarkAsRead({ ids });
        toast.success("Notifications updated successfully");
        setSelectedKeys(new Set());
      } catch (err: any) {
        toast.danger("Failed to update notifications", {
          description: err.message || "Please try again.",
        });
      }
    },
    [convexMarkAsRead]
  );

  const handleMarkAllAsRead = useCallback(async () => {
    if (!user) return;
    try {
      await convexMarkAllAsRead({ receiverUserId: user.id });
      toast.success("All notifications marked as read");
    } catch (err: any) {
      toast.danger("Failed to update notifications", {
        description: err.message || "Please try again.",
      });
    }
  }, [convexMarkAllAsRead, user]);

  const handleSimulateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simTitle || !simMessage || !simReceiverId) {
      toast.danger("Please fill in all required fields");
      return;
    }

    try {
      await convexCreate({
        title: simTitle.trim(),
        message: simMessage.trim(),
        notificationType: simType,
        receiverUserId: Number(simReceiverId.trim()),
        receiverRole: simReceiverRole,
        priority: simPriority as "low" | "medium" | "high",
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

  const totalPages = Math.ceil(filteredNotifications.length / rowsPerPage) || 1;

  // Client-side pagination
  const paginatedItems = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return sortedItems.slice(start, start + rowsPerPage);
  }, [sortedItems, page, rowsPerPage]);

  // ─── Selection Logic ───────────────────────────────────────────────────────
  const selectedCount = selectedKeys === "all" ? sortedItems.length : selectedKeys.size;

  const handleMarkAsReadSelected = () => {
    const idsToMark = selectedKeys === "all"
      ? sortedItems.map((item) => item._id)
      : Array.from(selectedKeys).map((k) => k as Id<"notifications">);
    handleMarkAsRead(idsToMark);
  };

  const handleViewDetails = useCallback((notif: Notification) => {
    if (notif.relatedEntityType === "student_requests" && notif.relatedEntityId) {
      router.push(`/app/workflows/requests/${notif.relatedEntityId}`);
    } else {
      toast.info("No detailed view available for this type of event.", {
        description: notif.message,
      });
    }
  }, [router]);

  const hasActiveFilters =
    isReadFilter !== "all" ||
    priorityFilter !== "all" ||
    typeFilter !== "all" ||
    dateRangeFilter !== "all";

  const handleClearFilters = () => {
    setIsReadFilter("all");
    setPriorityFilter("all");
    setTypeFilter("all");
    setDateRangeFilter("all");
    setPage(1);
  };

  const renderCell = useCallback((notif: Notification, columnKey: string) => {
    const dateStr = new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(notif.createdAt));

    const typeDetails = TYPE_CONFIG[notif.notificationType] || { label: notif.notificationType, color: "default" };

    switch (columnKey) {
      case "priority":
        return (
          <Chip size="sm" color={PRIORITY_COLOR[notif.priority] || "default"} variant="secondary" className="capitalize font-semibold text-[10px]">
            {notif.priority}
          </Chip>
        );
      case "title":
        return (
          <span className="font-semibold text-sm text-foreground">
            {notif.title}
          </span>
        );
      case "message":
        return (
          <span className="text-xs text-muted-foreground line-clamp-2 max-w-[400px]">
            {notif.message}
          </span>
        );
      case "notificationType":
        return (
          <Chip size="sm" color={typeDetails.color} variant="secondary" className="font-semibold text-[10px]">
            {typeDetails.label}
          </Chip>
        );
      case "createdAt":
        return (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {dateStr}
          </span>
        );
      case "isRead":
        return (
          <Chip size="sm" color={notif.isRead ? "success" : "accent"} variant="secondary" className="font-semibold text-[10px]">
            {notif.isRead ? "Read" : "Unread"}
          </Chip>
        );
      case "actions":
        return (
          <div className="flex justify-end gap-1.5">
            {!notif.isRead && (
              <Button size="sm" variant="ghost" className="p-1 min-w-[28px] size-7" onPress={() => handleMarkAsRead([notif._id])}>
                <Check className="size-4" />
              </Button>
            )}
            <Button size="sm" variant="ghost" className="p-1 min-w-[28px] size-7 text-primary" onPress={() => handleViewDetails(notif)}>
              <CircleInfo className="size-4" />
            </Button>
          </div>
        );
      default:
        return null;
    }
  }, [handleMarkAsRead, handleViewDetails]);

  const getRowClassName = useCallback((notif: Notification) => {
    return `transition-colors hover:bg-default-50/50 ${!notif.isRead ? "bg-primary/5 hover:bg-primary/10" : ""}`;
  }, []);

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
            <Button size="sm" onPress={() => setIsSimulateOpen(true)}>
              <Plus className="size-4 mr-1" />
              Simulate Event
            </Button>
          )}
          {metrics.unread > 0 && (
            <Button variant="outline" size="sm" onPress={handleMarkAllAsRead}>
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

      {/* ─── Bulk Action Banner ──────────────────────────────────────────────── */}
      {selectedCount > 0 && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-primary/10 border border-primary/20 animate-fade-in">
          <span className="text-xs font-semibold text-primary">
            {selectedCount} row{selectedCount > 1 ? "s" : ""} selected
          </span>
          <Button
            size="sm"
            variant="primary"
            className="font-semibold"
            onPress={handleMarkAsReadSelected}
          >
            Mark as Read
          </Button>
        </div>
      )}

      {/* ─── Notifications DataTable ────────────────────────────────────────── */}
      <DataTable
        data={paginatedItems}
        columns={COLUMNS}
        initialVisibleColumns={INITIAL_VISIBLE_COLUMNS}
        searchPlaceholder="Search alerts..."
        searchQuery={searchInput}
        onSearchQueryChange={setSearchInput}
        page={page}
        onPageChange={setPage}
        totalPages={totalPages}
        totalItems={filteredNotifications.length}
        itemsPerPage={rowsPerPage}
        onItemsPerPageChange={(limit) => {
          setRowsPerPage(limit);
          setPage(1);
        }}
        sortDescriptor={sortDescriptor}
        onSortChange={handleSortChange}
        renderCell={renderCell}
        getRowClassName={getRowClassName}
        localStorageKey="notifications_table_columns"
        isLoading={isLoading}
        isError={isError}
        error={error}
        emptyStateMessage="No alerts match your current filters."
        selectionMode="multiple"
        selectedKeys={selectedKeys}
        onSelectionChange={setSelectedKeys}
        toolbarActions={
          <div className="flex flex-wrap gap-2 items-center">
            {/* Read Status */}
            <Dropdown>
              <Button variant="tertiary" size="sm">
                Status: {isReadFilter === "all" ? "All" : isReadFilter === "false" ? "Unread" : "Read"}
                <ChevronDown className="size-3.5 ml-1" />
              </Button>
              <Dropdown.Popover>
                <Dropdown.Menu
                  aria-label="Filter Status"
                  selectionMode="single"
                  selectedKeys={new Set([isReadFilter])}
                  onSelectionChange={(keys) => {
                    const key = Array.from(keys)[0] as string;
                    setIsReadFilter(key || "all");
                    setPage(1);
                  }}
                >
                  <Dropdown.Item id="all" key="all" textValue="All">
                    <Dropdown.ItemIndicator />
                    <Label>All</Label>
                  </Dropdown.Item>
                  <Dropdown.Item id="false" key="false" textValue="Unread">
                    <Dropdown.ItemIndicator />
                    <Label>Unread</Label>
                  </Dropdown.Item>
                  <Dropdown.Item id="true" key="true" textValue="Read">
                    <Dropdown.ItemIndicator />
                    <Label>Read</Label>
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown>

            {/* Priority */}
            <Dropdown>
              <Button variant="tertiary" size="sm">
                Priority: <span className="capitalize">{priorityFilter === "all" ? "All" : priorityFilter}</span>
                <ChevronDown className="size-3.5 ml-1" />
              </Button>
              <Dropdown.Popover>
                <Dropdown.Menu
                  aria-label="Filter Priority"
                  selectionMode="single"
                  selectedKeys={new Set([priorityFilter])}
                  onSelectionChange={(keys) => {
                    const key = Array.from(keys)[0] as string;
                    setPriorityFilter(key || "all");
                    setPage(1);
                  }}
                >
                  <Dropdown.Item id="all" key="all" textValue="All Priorities">
                    <Dropdown.ItemIndicator />
                    <Label>All Priorities</Label>
                  </Dropdown.Item>
                  <Dropdown.Item id="low" key="low" textValue="Low">
                    <Dropdown.ItemIndicator />
                    <Label>Low</Label>
                  </Dropdown.Item>
                  <Dropdown.Item id="medium" key="medium" textValue="Medium">
                    <Dropdown.ItemIndicator />
                    <Label>Medium</Label>
                  </Dropdown.Item>
                  <Dropdown.Item id="high" key="high" textValue="High">
                    <Dropdown.ItemIndicator />
                    <Label>High</Label>
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown>

            {/* Notification Type */}
            <Dropdown>
              <Button variant="tertiary" size="sm">
                Event: {typeFilter === "all"
                  ? "All"
                  : typeFilter === "leave_request"
                  ? "Requests"
                  : typeFilter === "timetable_change"
                  ? "Timetable"
                  : typeFilter === "approval"
                  ? "Approvals"
                  : typeFilter === "assignment_update"
                  ? "Assignments"
                  : typeFilter === "fee_event"
                  ? "Fee Events"
                  : typeFilter === "counselor_action"
                  ? "Counselor"
                  : typeFilter === "admin_action"
                  ? "Admin"
                  : typeFilter}
                <ChevronDown className="size-3.5 ml-1" />
              </Button>
              <Dropdown.Popover>
                <Dropdown.Menu
                  aria-label="Filter Event Type"
                  selectionMode="single"
                  selectedKeys={new Set([typeFilter])}
                  onSelectionChange={(keys) => {
                    const key = Array.from(keys)[0] as string;
                    setTypeFilter(key || "all");
                    setPage(1);
                  }}
                >
                  <Dropdown.Item id="all" key="all" textValue="All Events">
                    <Dropdown.ItemIndicator />
                    <Label>All Events</Label>
                  </Dropdown.Item>
                  <Dropdown.Item id="leave_request" key="leave_request" textValue="Leave Requests">
                    <Dropdown.ItemIndicator />
                    <Label>Leave Requests</Label>
                  </Dropdown.Item>
                  <Dropdown.Item id="timetable_change" key="timetable_change" textValue="Timetable Changes">
                    <Dropdown.ItemIndicator />
                    <Label>Timetable Changes</Label>
                  </Dropdown.Item>
                  <Dropdown.Item id="approval" key="approval" textValue="Approvals">
                    <Dropdown.ItemIndicator />
                    <Label>Approvals</Label>
                  </Dropdown.Item>
                  <Dropdown.Item id="assignment_update" key="assignment_update" textValue="Assignment Updates">
                    <Dropdown.ItemIndicator />
                    <Label>Assignment Updates</Label>
                  </Dropdown.Item>
                  <Dropdown.Item id="fee_event" key="fee_event" textValue="Fees / Bills">
                    <Dropdown.ItemIndicator />
                    <Label>Fees / Bills</Label>
                  </Dropdown.Item>
                  <Dropdown.Item id="counselor_action" key="counselor_action" textValue="Counselor Actions">
                    <Dropdown.ItemIndicator />
                    <Label>Counselor Actions</Label>
                  </Dropdown.Item>
                  <Dropdown.Item id="admin_action" key="admin_action" textValue="Administrative Actions">
                    <Dropdown.ItemIndicator />
                    <Label>Administrative Actions</Label>
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown>

            {/* Date range filter */}
            <Dropdown>
              <Button variant="tertiary" size="sm">
                Date: {dateRangeFilter === "all"
                  ? "All Time"
                  : dateRangeFilter === "today"
                  ? "Today"
                  : dateRangeFilter === "week"
                  ? "This Week"
                  : dateRangeFilter === "month"
                  ? "This Month"
                  : dateRangeFilter}
                <ChevronDown className="size-3.5 ml-1" />
              </Button>
              <Dropdown.Popover>
                <Dropdown.Menu
                  aria-label="Filter Date"
                  selectionMode="single"
                  selectedKeys={new Set([dateRangeFilter])}
                  onSelectionChange={(keys) => {
                    const key = Array.from(keys)[0] as string;
                    setDateRangeFilter(key || "all");
                    setPage(1);
                  }}
                >
                  <Dropdown.Item id="all" key="all" textValue="All Time">
                    <Dropdown.ItemIndicator />
                    <Label>All Time</Label>
                  </Dropdown.Item>
                  <Dropdown.Item id="today" key="today" textValue="Today">
                    <Dropdown.ItemIndicator />
                    <Label>Today</Label>
                  </Dropdown.Item>
                  <Dropdown.Item id="week" key="week" textValue="This Week">
                    <Dropdown.ItemIndicator />
                    <Label>This Week</Label>
                  </Dropdown.Item>
                  <Dropdown.Item id="month" key="month" textValue="This Month">
                    <Dropdown.ItemIndicator />
                    <Label>This Month</Label>
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown>

            {/* Clear filters */}
            {hasActiveFilters && (
              <Button variant="tertiary" size="sm" onPress={handleClearFilters}>
                Clear
              </Button>
            )}
          </div>
        }
      />

      {/* ─── Simulation Modal Dialog ────────────────────────────────────────── */}
      <Modal isOpen={isSimulateOpen} onOpenChange={setIsSimulateOpen}>
        <Modal.Backdrop>
          <Modal.Container placement="center">
            <Modal.Dialog className="w-full max-w-md">
              <Modal.CloseTrigger />
              <Modal.Header>
                <div className="flex items-center gap-2">
                  <Bell className="size-5 text-secondary" />
                  <h3 className="text-lg font-bold text-foreground">
                    Simulate Business Event
                  </h3>
                </div>
              </Modal.Header>

              <Modal.Body>
                <form id="simulate-event-form" onSubmit={handleSimulateSubmit} className="flex flex-col gap-4 py-2">
                  <TextField
                    isRequired
                    value={simReceiverId}
                    onChange={(v) => setSimReceiverId(v)}
                  >
                    <Label className="text-xs font-semibold text-muted-foreground mb-1.5">Receiver User ID (number)</Label>
                    <Input placeholder="Enter recipient user ID (e.g. student/faculty ID number)" />
                  </TextField>

                  <div className="grid grid-cols-2 gap-4">
                    <Select
                      isRequired
                      className="w-full"
                      value={simReceiverRole}
                      onChange={(key) => setSimReceiverRole(key as string)}
                    >
                      <Label className="text-xs font-semibold text-muted-foreground mb-1.5">Receiver Role</Label>
                      <Select.Trigger>
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          <ListBox.Item id="student" textValue="Student">Student<ListBox.ItemIndicator /></ListBox.Item>
                          <ListBox.Item id="faculty" textValue="Faculty">Faculty<ListBox.ItemIndicator /></ListBox.Item>
                          <ListBox.Item id="counselor" textValue="Counselor">Counselor<ListBox.ItemIndicator /></ListBox.Item>
                          <ListBox.Item id="hod" textValue="HOD">HOD<ListBox.ItemIndicator /></ListBox.Item>
                          <ListBox.Item id="admin" textValue="Admin">Admin<ListBox.ItemIndicator /></ListBox.Item>
                        </ListBox>
                      </Select.Popover>
                    </Select>

                    <Select
                      isRequired
                      className="w-full"
                      value={simType}
                      onChange={(key) => setSimType(key as string)}
                    >
                      <Label className="text-xs font-semibold text-muted-foreground mb-1.5">Event Type</Label>
                      <Select.Trigger>
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          <ListBox.Item id="leave_request" textValue="Leave Request">Leave Request<ListBox.ItemIndicator /></ListBox.Item>
                          <ListBox.Item id="timetable_change" textValue="Timetable Change">Timetable Change<ListBox.ItemIndicator /></ListBox.Item>
                          <ListBox.Item id="approval" textValue="Approval">Approval<ListBox.ItemIndicator /></ListBox.Item>
                          <ListBox.Item id="assignment_update" textValue="Assignment Update">Assignment Update<ListBox.ItemIndicator /></ListBox.Item>
                          <ListBox.Item id="fee_event" textValue="Fee / Billing Alert">Fee / Billing Alert<ListBox.ItemIndicator /></ListBox.Item>
                          <ListBox.Item id="counselor_action" textValue="Counselor Alert">Counselor Alert<ListBox.ItemIndicator /></ListBox.Item>
                          <ListBox.Item id="admin_action" textValue="Admin Alert">Admin Alert<ListBox.ItemIndicator /></ListBox.Item>
                          <ListBox.Item id="system_alert" textValue="System Notice">System Notice<ListBox.ItemIndicator /></ListBox.Item>
                        </ListBox>
                      </Select.Popover>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Select
                      isRequired
                      className="w-full"
                      value={simPriority}
                      onChange={(key) => setSimPriority(key as string)}
                    >
                      <Label className="text-xs font-semibold text-muted-foreground mb-1.5">Priority Override</Label>
                      <Select.Trigger>
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          <ListBox.Item id="low" textValue="Low">Low<ListBox.ItemIndicator /></ListBox.Item>
                          <ListBox.Item id="medium" textValue="Medium">Medium<ListBox.ItemIndicator /></ListBox.Item>
                          <ListBox.Item id="high" textValue="High">High<ListBox.ItemIndicator /></ListBox.Item>
                        </ListBox>
                      </Select.Popover>
                    </Select>
                  </div>

                  <TextField
                    isRequired
                    value={simTitle}
                    onChange={(v) => setSimTitle(v)}
                  >
                    <Label className="text-xs font-semibold text-muted-foreground mb-1.5">Title</Label>
                    <Input placeholder="E.g. Outstanding Tuition Fee Alert" />
                  </TextField>

                  <TextField
                    isRequired
                    value={simMessage}
                    onChange={(v) => setSimMessage(v)}
                  >
                    <Label className="text-xs font-semibold text-muted-foreground mb-1.5">Message</Label>
                    <TextArea
                      placeholder="Enter full notification content..."
                      rows={4}
                    />
                  </TextField>
                </form>
              </Modal.Body>

              <Modal.Footer>
                <Button variant="secondary" onPress={() => setIsSimulateOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" form="simulate-event-form">
                  Broadcast Notification
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
}
