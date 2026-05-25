"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/app/lib/store/use-auth-store";
import {
  Spinner,
  Button,
  Card,
  Input,
  Select,
  ListBox,
  TextField,
  TextArea,
  Alert,
} from "@heroui/react";
import { ChevronLeft } from "@gravity-ui/icons";

// ─── Dynamic Dropdown to Select Free Proxy for a Slot ────────────────────────
function ProxyDropdown({
  date,
  slotId,
  value,
  onSelect,
}: {
  date: string;
  slotId: number;
  value: number | null;
  onSelect: (id: number) => void;
}) {
  const { data: response, isLoading } = useQuery({
    queryKey: ["approvals", "proxies", "available", date, slotId],
    queryFn: async () => {
      const res = await fetch(`/api/approvals/proxies/available?date=${date}&slotId=${slotId}`);
      if (!res.ok) throw new Error("Failed to fetch available proxies");
      return res.json();
    },
    enabled: !!date && !!slotId,
  });

  const availableList = response?.data || [];

  return (
    <div className="w-full sm:w-[260px]">
      <Select
        aria-label="Select Proxy Faculty"
        placeholder={isLoading ? "Loading free faculties..." : "Select Free Faculty"}
        selectedKey={value ? String(value) : undefined}
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
                return "Select Proxy Faculty";
              }
              return <span>{state.selectedItems[0].textValue}</span>;
            }}
          </Select.Value>
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            {availableList.length === 0 ? (
              <ListBox.Item id="none" textValue="No free faculty found" isDisabled>
                <span className="text-xs text-rose-500 font-medium">No free faculty found</span>
              </ListBox.Item>
            ) : (
              availableList.map((f: any) => (
                <ListBox.Item id={String(f.id)} key={f.id} textValue={f.name}>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-semibold">{f.name}</span>
                    <span className="text-[10px] text-default-400">{f.facultyCode}</span>
                  </div>
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))
            )}
          </ListBox>
        </Select.Popover>
      </Select>
    </div>
  );
}

// ─── New Request Creation Page ────────────────────────────────────────────────
export default function NewRequestPage() {
  const router = useRouter();
  const { isHydrated } = useAuthStore();

  const [requestTypeCode, setRequestTypeCode] = useState<string>("");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  
  // Simulated document fields
  const [fileName, setFileName] = useState<string>("");
  const [fileUrl, setFileUrl] = useState<string>("");

  // Timetable lectures mapped day-by-day
  const [timetableDays, setTimetableDays] = useState<any[]>([]);
  const [proxyAssignments, setProxyAssignments] = useState<Record<string, number>>({});

  // 1. Fetch Request Types
  const { data: typesResponse } = useQuery({
    queryKey: ["approvals", "types"],
    queryFn: async () => {
      const res = await fetch("/api/approvals/types");
      if (!res.ok) throw new Error("Failed to fetch types");
      return res.json();
    },
    enabled: isHydrated,
  });

  const requestTypes = typesResponse?.data || [];

  // 2. Fetch Approval Chain Workflow Configurations
  const { data: configsResponse } = useQuery({
    queryKey: ["approvals", "configs"],
    queryFn: async () => {
      const res = await fetch("/api/approvals/config");
      if (!res.ok) throw new Error("Failed to fetch configs");
      return res.json();
    },
    enabled: isHydrated,
  });

  const configs = configsResponse?.data || {};
  const currentChain = requestTypeCode ? configs[requestTypeCode] || ["HOD"] : [];

  // 3. Fetch Lecturing slots dynamically when leave dates change
  const { data: timetableResponse, isFetching: isTimetableLoading } = useQuery({
    queryKey: ["approvals", "timetable", fromDate, toDate],
    queryFn: async () => {
      if (!fromDate || !toDate) return null;
      const res = await fetch(`/api/approvals/timetable?fromDate=${fromDate}&toDate=${toDate}`);
      if (!res.ok) throw new Error("Failed to fetch timetable slots");
      return res.json();
    },
    enabled: requestTypeCode === "leave_approval" && !!fromDate && !!toDate,
  });

  useEffect(() => {
    if (timetableResponse?.success) {
      setTimetableDays(timetableResponse.data);
      // Clean/reset previous proxy assignments
      setProxyAssignments({});
    } else {
      setTimetableDays([]);
    }
  }, [timetableResponse]);

  // 4. Submit Mutation
  const submitMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/approvals/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Submission failed");
      }
      return res.json();
    },
    onSuccess: () => {
      alert("Leave/WFH request submitted successfully!");
      router.push("/app/academics/approvals");
    },
    onError: (err: any) => {
      alert(err.message || "An error occurred");
    },
  });

  if (!isHydrated) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  const handleSelectProxy = (date: string, slotId: number, proxyFacultyId: number) => {
    const key = `${date}_${slotId}`;
    setProxyAssignments((prev) => ({
      ...prev,
      [key]: proxyFacultyId,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!requestTypeCode || !fromDate || !toDate || !description) {
      alert("Please fill in all mandatory fields");
      return;
    }

    // Proxy checking for Leave requests
    const flatProxiesList: any[] = [];
    if (requestTypeCode === "leave_approval") {
      let missingProxy = false;
      
      for (const day of timetableDays) {
        for (const lect of day.lectures) {
          const key = `${day.date}_${lect.slotId}`;
          const proxyId = proxyAssignments[key];
          if (!proxyId) {
            missingProxy = true;
          } else {
            flatProxiesList.push({
              date: day.date,
              slotId: lect.slotId,
              proxyFacultyId: proxyId,
              divisionId: lect.divisionId,
              subjectId: lect.subjectId,
              slotLabel: lect.label,
            });
          }
        }
      }

      if (missingProxy) {
        alert("Please select a proxy faculty for all lecture slots before submitting.");
        return;
      }
    }

    const payload = {
      requestTypeCode,
      fromDate,
      toDate,
      description,
      document: fileUrl ? { fileName: fileName || "Attachment", fileUrl, fileSize: 102400 } : null,
      proxies: flatProxiesList,
    };

    submitMutation.mutate(payload);
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto p-1 pb-16">
      {/* Top Navigation Row */}
      <div>
        <Button
          variant="tertiary"
          onPress={() => router.push("/app/academics/approvals")}
          className="flex items-center gap-1 text-default-500 font-semibold mb-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Approvals
        </Button>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          New Leave / Work From Home Request
        </h1>
        <p className="text-sm text-default-500">
          Fill out details and assign proxies for your lecture schedule.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <Card className="p-6 border border-divider">
          <Card.Content className="flex flex-col gap-5">
            {/* Request Type */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-default-500 uppercase tracking-wider">
                Request Type <span className="text-rose-500">*</span>
              </label>
              <Select
                aria-label="Select Request Type"
                placeholder="Choose Request Type"
                selectedKey={requestTypeCode}
                onSelectionChange={(key) => setRequestTypeCode(key as string)}
                className="max-w-md"
              >
                <Select.Trigger>
                  <Select.Value>
                    {({ isPlaceholder, state }) => {
                      if (isPlaceholder || state.selectedItems.length === 0) {
                        return "Choose Request Type";
                      }
                      return <span>{state.selectedItems[0].textValue}</span>;
                    }}
                  </Select.Value>
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {requestTypes.map((type: any) => (
                      <ListBox.Item id={type.code} key={type.code} textValue={type.name}>
                        {type.name}
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
            </div>

            {/* Date Range Picker */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextField isRequired value={fromDate} onChange={setFromDate}>
                <label className="text-xs font-bold text-default-500 uppercase tracking-wider">
                  From Date <span className="text-rose-500">*</span>
                </label>
                <Input type="date" />
              </TextField>
              <TextField isRequired value={toDate} onChange={setToDate}>
                <label className="text-xs font-bold text-default-500 uppercase tracking-wider">
                  To Date <span className="text-rose-500">*</span>
                </label>
                <Input type="date" />
              </TextField>
            </div>

            {/* Description */}
            <TextField isRequired value={description} onChange={setDescription}>
              <label className="text-xs font-bold text-default-500 uppercase tracking-wider">
                Reason & Description <span className="text-rose-500">*</span>
              </label>
              <TextArea
                placeholder="Brief description or explanation of your request..."
                rows={4}
              />
            </TextField>

            {/* Document upload simulation */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextField value={fileName} onChange={setFileName}>
                <label className="text-xs font-bold text-default-500 uppercase tracking-wider">
                  Document Name (Optional)
                </label>
                <Input placeholder="e.g. medical_certificate.pdf" />
              </TextField>
              <TextField value={fileUrl} onChange={setFileUrl}>
                <label className="text-xs font-bold text-default-500 uppercase tracking-wider">
                  Document URL / Proof Link
                </label>
                <Input placeholder="e.g. https://s3.amazonaws.com/college-erp/doc.pdf" />
              </TextField>
            </div>
          </Card.Content>
        </Card>

        {/* TIMETABLE OVERLAY SECTION (Only loaded for Leave Approval) */}
        {requestTypeCode === "leave_approval" && fromDate && toDate && (
          <Card className="p-6 border border-divider">
            <Card.Content>
              <h2 className="text-sm font-bold text-default-700 mb-4 uppercase tracking-wider">
                Lecture Timetable Proxy Settings
              </h2>

              {isTimetableLoading ? (
                <div className="flex items-center justify-center py-10 gap-2">
                  <Spinner />
                  <span className="text-xs text-default-500">Checking your lecturing slots...</span>
                </div>
              ) : timetableDays.length === 0 ? (
                <p className="text-xs text-default-400 italic py-4">
                  No teaching lectures are scheduled during the selected dates.
                </p>
              ) : (
                <div className="flex flex-col gap-5">
                  {timetableDays.map((day) => {
                    if (day.lectures.length === 0) return null;

                    return (
                      <div key={day.date} className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 border-b border-divider pb-1">
                          <span className="text-xs font-bold text-default-800">{day.dayOfWeek}</span>
                          <span className="text-[10px] text-default-400">({day.date})</span>
                        </div>

                        <div className="flex flex-col gap-2">
                          {day.lectures.map((lect: any) => {
                            const assignmentKey = `${day.date}_${lect.slotId}`;
                            const currentProxyId = proxyAssignments[assignmentKey] || null;

                            return (
                              <div
                                key={lect.slotId}
                                className="p-3 bg-default-50 rounded-xl border border-divider flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
                              >
                                <div className="flex flex-col text-left">
                                  <span className="text-xs font-bold text-default-800">
                                    {lect.label}
                                  </span>
                                  <span className="text-[10px] text-default-400">
                                    Class: {lect.divisionName} • Subject: {lect.subjectName}
                                  </span>
                                </div>

                                <ProxyDropdown
                                  date={day.date}
                                  slotId={lect.slotId}
                                  value={currentProxyId}
                                  onSelect={(id) => handleSelectProxy(day.date, lect.slotId, id)}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card.Content>
          </Card>
        )}

        {/* Dynamic workflow warning checklists */}
        {currentChain.length > 0 && (
          <Alert status="accent">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Dynamic Workflow Verification</Alert.Title>
              <Alert.Description>
                <div className="text-xs mt-1">
                  <span>This request will be routed in sequence for approval to:</span>
                  <ol className="list-decimal list-inside font-semibold mt-1">
                    {currentChain.map((role: string) => (
                      <li key={role}>{role}</li>
                    ))}
                  </ol>
                </div>
              </Alert.Description>
            </Alert.Content>
          </Alert>
        )}

        {/* Action button */}
        <Button
          type="submit"
          className="font-bold w-full bg-primary py-3 hover:opacity-90 animate-pulse"
        >
          {submitMutation.isPending ? "Submitting..." : "Submit Request"}
        </Button>
      </form>
    </div>
  );
}
