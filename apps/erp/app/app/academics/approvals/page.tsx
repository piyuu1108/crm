"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/app/lib/store/use-auth-store";
import { usePermission } from "@/app/lib/hooks/use-permission";
import { useRouter } from "next/navigation";
import {
  Spinner,
  Button,
  Card,
  Chip,
  Select,
  ListBox,
  Input,
  Drawer,
  Alert,
  TextField,
  Label,
  useOverlayState,
} from "@heroui/react";
import { Plus, Clock, Check, Xmark, FileText } from "@gravity-ui/icons";

// ─── Status chip configurations ──────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: "warning" | "success" | "danger" | "default"; className: string }> = {
  pending: { label: "Pending", color: "warning", className: "bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200" },
  approved: { label: "Approved", color: "success", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200" },
  rejected: { label: "Rejected", color: "danger", className: "bg-rose-100 text-rose-800 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-200" },
};

function StatusChip({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <Chip size="sm" color={config.color} className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${config.className}`}>
      {config.label}
    </Chip>
  );
}

// ─── Dynamic Dropdown to Edit/Override Proxy Faculty ──────────────────────────
function ProxySelector({
  date,
  slotId,
  currentProxyId,
  onSelect,
}: {
  date: string;
  slotId: number;
  currentProxyId: number;
  onSelect: (newId: number) => void;
}) {
  const { data: response } = useQuery({
    queryKey: ["approvals", "proxies", "available", date, slotId],
    queryFn: async () => {
      const res = await fetch(`/api/approvals/proxies/available?date=${date}&slotId=${slotId}`);
      if (!res.ok) throw new Error("Failed to fetch available proxies");
      return res.json();
    },
  });

  const availableList = response?.data || [];

  return (
    <div className="w-[180px]">
      <Select
        aria-label="Select Proxy"
        selectedKey={String(currentProxyId)}
        onSelectionChange={(key) => {
          if (key) {
            onSelect(Number(key));
          }
        }}
      >
        <Select.Trigger>
          <Select.Value>
            {({ isPlaceholder, state }) => {
              if (isPlaceholder || state.selectedItems.length === 0) {
                return "Choose Proxy";
              }
              return <span>{state.selectedItems[0].textValue}</span>;
            }}
          </Select.Value>
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            {availableList.map((f: any) => (
              <ListBox.Item id={String(f.id)} key={f.id} textValue={f.name}>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-medium">{f.name}</span>
                  <span className="text-[10px] text-default-400">{f.facultyCode}</span>
                </div>
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>
    </div>
  );
}

// ─── Dashboard Main Page ──────────────────────────────────────────────────────
export default function ApprovalsPage() {
  const { activeRole, isHydrated } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  
  const drawerState = useOverlayState();
  
  // Dynamic state for inline proxy overrides in detail view
  const [proxyOverrides, setProxyOverrides] = useState<Record<number, number>>({});
  const [remarks, setRemarks] = useState("");

  const canCreate = activeRole === "faculty" || activeRole === "hod" || activeRole === "counselor";
  const canApprove = activeRole === "hod" || activeRole === "principal" || activeRole === "vice_principal";
  const canOverride = usePermission("approvals.override_proxy");

  // Fetch submitted requests list
  const { data: listResponse, isLoading } = useQuery({
    queryKey: ["approvals", "list", activeRole],
    queryFn: async () => {
      const res = await fetch("/api/approvals/list");
      if (!res.ok) throw new Error("Failed to fetch approvals list");
      return res.json();
    },
    enabled: isHydrated && !!activeRole,
  });

  // Fetch detailed information of the selected request
  const { data: detailResponse, isLoading: isDetailLoading } = useQuery({
    queryKey: ["approvals", "detail", selectedRequestId],
    queryFn: async () => {
      if (!selectedRequestId) return null;
      const res = await fetch(`/api/approvals/list?id=${selectedRequestId}`);
      if (!res.ok) throw new Error("Failed to fetch request detail");
      return res.json();
    },
    enabled: !!selectedRequestId,
  });

  // Action mutation (approve/reject)
  const actionMutation = useMutation({
    mutationFn: async (payload: {
      requestId: number;
      action: "approve" | "reject";
      remarks: string;
      proxyOverrides: { proxyId: number; newProxyFacultyId: number }[];
    }) => {
      const res = await fetch("/api/approvals/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Action failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
      drawerState.close();
      setSelectedRequestId(null);
      setProxyOverrides({});
      setRemarks("");
      alert("Action processed successfully!");
    },
    onError: (err: any) => {
      alert(err.message || "An error occurred");
    },
  });

  if (!isHydrated || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  const rawList = listResponse?.data || [];
  const filteredList = rawList.filter((row: any) => {
    if (statusFilter === "all") return true;
    return row.status === statusFilter;
  });

  const detail = detailResponse?.data || null;

  const handleOpenDetail = (id: number) => {
    setSelectedRequestId(id);
    setProxyOverrides({});
    setRemarks("");
    drawerState.open();
  };

  const handleProxyOverride = (proxyRecordId: number, newFacultyId: number) => {
    setProxyOverrides((prev) => ({
      ...prev,
      [proxyRecordId]: newFacultyId,
    }));
  };

  const handleActionSubmit = (action: "approve" | "reject") => {
    if (!selectedRequestId) return;

    // Build the proxy overrides list
    const overridesArray = Object.entries(proxyOverrides).map(([recordId, newFacultyId]) => ({
      proxyId: Number(recordId),
      newProxyFacultyId: newFacultyId,
    }));

    actionMutation.mutate({
      requestId: selectedRequestId,
      action,
      remarks,
      proxyOverrides: overridesArray,
    });
  };

  return (
    <div className="flex flex-col gap-6 p-1">
      {/* Header Banner */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Faculty Approvals & Workflows
          </h1>
          <p className="text-sm text-default-500">
            Submit leave/WFH requests or review pending approvals for your course division.
          </p>
        </div>
        {canCreate && (
          <Button
            onPress={() => router.push("/app/academics/approvals/new")}
            className="flex items-center gap-2 font-medium"
          >
            <Plus className="h-4 w-4" />
            Create Request
          </Button>
        )}
      </div>

      {/* Main Grid: Left is filter, right is list */}
      <div className="flex flex-col gap-4">
        {/* Filters bar */}
        <div className="flex items-center gap-3 bg-default-50 p-3 rounded-xl border border-divider">
          <span className="text-xs text-default-500 font-semibold uppercase tracking-wider pl-1">
            Filter Status:
          </span>
          <div className="flex gap-1.5">
            {["all", "pending", "approved", "rejected"].map((st) => (
              <Button
                key={st}
                size="sm"
                variant={statusFilter === st ? "secondary" : "tertiary"}
                onPress={() => setStatusFilter(st)}
                className="capitalize font-medium px-4 text-xs"
              >
                {st}
              </Button>
            ))}
          </div>
        </div>

        {/* Requests Table/List */}
        {filteredList.length === 0 ? (
          <Card className="p-8 text-center text-default-500 border border-dashed border-default-300">
            <Card.Content className="max-w-md mx-auto flex flex-col items-center gap-2">
              <FileText className="w-10 h-10 text-default-300" />
              <h3 className="font-semibold text-sm text-default-700">No requests found</h3>
              <p className="text-xs">There are no leave or work from home applications under the selected filter.</p>
            </Card.Content>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredList.map((row: any) => {
              const formattedDate = new Intl.DateTimeFormat("en-US", {
                month: "short",
                day: "2-digit",
                year: "numeric",
              }).format(new Date(row.createdAt));

              const leavePeriod = row.fromDate === row.toDate
                ? new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit" }).format(new Date(row.fromDate))
                : `${new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit" }).format(new Date(row.fromDate))} - ${new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit" }).format(new Date(row.toDate))}`;

              return (
                <div
                  key={row.id}
                  onClick={() => handleOpenDetail(row.id)}
                  role="button"
                  className="w-full text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary rounded-xl"
                >
                  <Card className="w-full border border-divider hover:shadow-md transition-all">
                    <Card.Content className="flex flex-row justify-between items-center p-4">
                      <div className="flex flex-col gap-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground truncate">
                            {row.facultyName}
                          </span>
                          <span className="text-default-300 text-xs">•</span>
                          <span className="text-xs font-medium text-default-500 capitalize">
                            {row.requestTypeName}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-default-400">
                          <span>Period: {leavePeriod}</span>
                          <span>•</span>
                          <span>Submitted on {formattedDate}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="flex flex-col items-end">
                          <StatusChip status={row.status} />
                          <span className="text-[10px] text-default-400 mt-1">
                            Pending: {row.pendingWith}
                          </span>
                        </div>
                      </div>
                    </Card.Content>
                  </Card>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Dynamic Drawer for Request Details */}
      <Drawer state={drawerState}>
        <Drawer.Backdrop>
          <Drawer.Content placement="right">
            <Drawer.Dialog className="w-full max-w-lg">
              <Drawer.CloseTrigger />
              <Drawer.Header>
                <div className="flex items-center justify-between">
                  <Drawer.Heading className="text-lg font-bold text-foreground">Request Details</Drawer.Heading>
                  {detail?.request && <StatusChip status={detail.request.status} />}
                </div>
              </Drawer.Header>
              <Drawer.Body>
                {isDetailLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <Spinner />
                  </div>
                ) : detail ? (
                  <div className="flex flex-col gap-6 text-sm">
                    {/* Meta details */}
                    <div className="grid grid-cols-2 gap-4 bg-default-50 p-4 rounded-xl border border-divider">
                      <div>
                        <span className="text-[11px] font-semibold text-default-400 uppercase tracking-wider block">
                          Faculty Name
                        </span>
                        <span className="font-semibold text-default-800">
                          {detail.request.facultyName}
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] font-semibold text-default-400 uppercase tracking-wider block">
                          Request Type
                        </span>
                        <span className="font-medium text-default-800 capitalize">
                          {detail.request.requestTypeName}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-[11px] font-semibold text-default-400 uppercase tracking-wider block">
                          Date Range
                        </span>
                        <span className="font-medium text-default-800">
                          {detail.request.fromDate} to {detail.request.toDate}
                        </span>
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <span className="text-[11px] font-semibold text-default-400 uppercase tracking-wider block mb-1">
                        Reason & Description
                      </span>
                      <p className="p-3 bg-default-50 border border-divider rounded-xl text-xs text-default-700 leading-relaxed">
                        {detail.request.description}
                      </p>
                    </div>

                    {/* Documents */}
                    {detail.documents.length > 0 && (
                      <div>
                        <span className="text-[11px] font-semibold text-default-400 uppercase tracking-wider block mb-2">
                          Attachments
                        </span>
                        <div className="flex flex-col gap-1.5">
                          {detail.documents.map((doc: any) => (
                            <a
                              key={doc.id}
                              href={doc.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 p-2.5 rounded-lg border border-divider text-xs text-primary hover:bg-default-50 transition-colors w-fit"
                            >
                              📎 <span className="underline truncate max-w-[200px]">{doc.fileName}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Lecture timetable proxy mappings (Only for leave approval) */}
                    {detail.request.requestTypeCode === "leave_approval" && (
                      <div>
                        <span className="text-[11px] font-semibold text-default-400 uppercase tracking-wider block mb-3">
                          Lecture Proxy Schedule & Assignments
                        </span>
                        {detail.proxies.length === 0 ? (
                          <p className="text-xs text-default-400 italic">No lecture slot assignments were required.</p>
                        ) : (
                          <div className="flex flex-col gap-3">
                            {detail.proxies.map((p: any) => {
                              const isProxyOverridden = proxyOverrides[p.id] !== undefined;
                              const currentProxyId = isProxyOverridden ? proxyOverrides[p.id] : p.proxyFacultyId;

                              return (
                                <div
                                  key={p.id}
                                  className="p-3 bg-default-50 border border-divider rounded-xl flex flex-col gap-2.5"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex flex-col text-left">
                                      <span className="text-xs font-bold text-default-800">
                                        {p.slotLabel} ({p.startTime.slice(0, 5)} - {p.endTime.slice(0, 5)})
                                      </span>
                                      <span className="text-[10px] text-default-400">
                                        Date: {p.date} • Class: {p.divisionName} • Subject: {p.subjectName}
                                      </span>
                                    </div>
                                    <span className="text-[10px]">
                                      {p.status === "overridden" ? (
                                        <Chip size="sm" color="warning" variant="soft">Overridden</Chip>
                                      ) : (
                                        <Chip size="sm" color="default" variant="soft">Original</Chip>
                                      )}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-3 bg-white dark:bg-default-100 p-2 rounded-lg border border-default-200">
                                    <span className="text-[11px] font-semibold text-default-500 uppercase shrink-0">
                                      Proxy:
                                    </span>
                                    {canOverride && detail.request.status === "pending" ? (
                                      <ProxySelector
                                        date={p.date}
                                        slotId={p.slotId}
                                        currentProxyId={currentProxyId}
                                        onSelect={(newId) => handleProxyOverride(p.id, newId)}
                                      />
                                    ) : (
                                      <span className="text-xs font-semibold text-default-800">
                                        {p.proxyFacultyName}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Workflow approvals progress */}
                    <div>
                      <span className="text-[11px] font-semibold text-default-400 uppercase tracking-wider block mb-3">
                        Approval Workflow Chain
                      </span>
                      <div className="flex flex-col gap-2 relative pl-4 border-l-2 border-divider">
                        {detail.approvals.map((app: any) => {
                          const isActiveStep = detail.request.status === "pending" && detail.request.currentStepIndex === app.sequenceOrder;
                          
                          return (
                            <div key={app.id} className="relative flex flex-col gap-1 text-xs">
                              {/* Dot indicator */}
                              <div className={`absolute -left-[21px] top-1 size-2.5 rounded-full border-2 ${
                                app.status === "approved" ? "bg-emerald-500 border-emerald-500" :
                                app.status === "rejected" ? "bg-rose-500 border-rose-500" :
                                isActiveStep ? "bg-amber-500 border-amber-500 animate-pulse" : "bg-default-200 border-default-200"
                              }`} />
                              
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-default-800">
                                  {app.approverRole} Approval
                                </span>
                                <span className="text-[10px] uppercase font-bold text-default-400">
                                  (Step {app.sequenceOrder + 1})
                                </span>
                              </div>

                              <div className="flex justify-between items-center text-default-500">
                                <span>
                                  {app.status === "approved" ? `Approved by ${app.approverName}` :
                                   app.status === "rejected" ? `Rejected by ${app.approverName}` :
                                   "Pending action"}
                                </span>
                                {app.actionedAt && (
                                  <span className="text-[10px]">
                                    {new Date(app.actionedAt).toLocaleDateString()}
                                  </span>
                                )}
                              </div>

                              {app.remarks && (
                                <span className="italic text-default-400 text-[11px] pl-2 border-l border-default-200 mt-0.5">
                                  "{app.remarks}"
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Action input panel (Only if user has pending approval action) */}
                    {canApprove && detail.request.status === "pending" && (
                      <div className="border-t border-divider pt-6 flex flex-col gap-4 mt-4">
                        <span className="text-[11px] font-semibold text-default-400 uppercase tracking-wider block">
                          Approver Actions
                        </span>

                        <TextField value={remarks} onChange={setRemarks}>
                          <Label>Approval/Rejection Remarks</Label>
                          <Input
                            placeholder="Provide reasoning or remarks here..."
                          />
                        </TextField>

                        {Object.keys(proxyOverrides).length > 0 && (
                          <Alert status="warning">
                            <Alert.Indicator />
                            <Alert.Content>
                              <Alert.Description>You have changed one or more proxy assignments. Clicking approve will instantly save these selections and notify all affected faculties.</Alert.Description>
                            </Alert.Content>
                          </Alert>
                        )}

                        <div className="flex gap-3">
                          <Button
                            className="flex-1 font-semibold text-white bg-emerald-600"
                            onPress={() => handleActionSubmit("approve")}
                            isDisabled={actionMutation.isPending}
                          >
                            Approve Request
                          </Button>
                          <Button
                            variant="danger-soft"
                            className="flex-1 font-semibold"
                            onPress={() => handleActionSubmit("reject")}
                            isDisabled={actionMutation.isPending}
                          >
                            Reject Request
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-center text-default-400 py-10">No request selected.</p>
                )}
              </Drawer.Body>
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
      </Drawer>
    </div>
  );
}
