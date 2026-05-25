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
  toast,
} from "@heroui/react";
import { 
  ChevronLeft, 
  UploadCloud, 
  CheckCircle, 
  FileText, 
  X, 
  ArrowRight, 
  Calendar, 
  Clock, 
  AlertCircle,
  HelpCircle,
  FileCheck,
  Briefcase,
  UserCheck
} from "lucide-react";

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
    <div className="w-full sm:w-[280px]">
      <Select
        aria-label="Select Proxy Faculty"
        placeholder={isLoading ? "Scanning available faculties..." : "Assign Free Faculty"}
        selectedKey={value ? String(value) : undefined}
        onSelectionChange={(key) => {
          if (key) {
            onSelect(Number(key));
          }
        }}
        className="w-full"
      >
        <Select.Trigger className="w-full bg-content2/50 hover:bg-content2 border border-divider/60 rounded-xl transition-all h-10 px-3 flex items-center justify-between">
          <Select.Value>
            {({ isPlaceholder, state }) => {
              if (isPlaceholder || state.selectedItems.length === 0) {
                return <span className="text-xs text-default-400 font-medium">Select Proxy Faculty</span>;
              }
              return <span className="text-xs font-semibold text-foreground">{state.selectedItems[0].textValue}</span>;
            }}
          </Select.Value>
          <Select.Indicator className="text-default-400" />
        </Select.Trigger>
        <Select.Popover className="backdrop-blur-md bg-content1/95 border border-divider/80 shadow-2xl rounded-xl min-w-[280px]">
          <ListBox className="p-1">
            {availableList.length === 0 ? (
              <ListBox.Item id="none" textValue="No free faculty found" isDisabled className="py-2.5">
                <div className="flex items-center gap-2 px-2 text-rose-500 font-medium text-xs">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>No free faculty for this slot</span>
                </div>
              </ListBox.Item>
            ) : (
              availableList.map((f: any) => (
                <ListBox.Item id={String(f.id)} key={f.id} textValue={f.name} className="p-2 rounded-lg hover:bg-primary/10 transition-colors">
                  <div className="flex items-center gap-3 text-left w-full">
                    <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                      {f.name.charAt(0)}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-foreground">{f.name}</span>
                      <span className="text-[10px] text-default-400">{f.facultyCode}</span>
                    </div>
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
  
  // Real simulated file upload states
  const [fileName, setFileName] = useState<string>("");
  const [fileUrl, setFileUrl] = useState<string>("");
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "success">("idle");
  const [uploadProgress, setUploadProgress] = useState(0);

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
      toast.success("Leave request submitted successfully!");
      router.push("/app/academics/approvals");
    },
    onError: (err: any) => {
      toast.danger(err.message || "An error occurred");
    },
  });

  const handleSimulatedUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadState("uploading");
    setUploadProgress(0);
    setFileName(file.name);

    // Simulate progress bar increase
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setUploadState("success");
          setFileUrl(`https://college-erp-s3.s3.amazonaws.com/uploads/${Date.now()}_${file.name}`);
          return 100;
        }
        return prev + 20;
      });
    }, 150);
  };

  const clearUploadedFile = () => {
    setFileName("");
    setFileUrl("");
    setUploadState("idle");
    setUploadProgress(0);
  };

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
      toast.danger("Please fill in all mandatory fields");
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
        toast.danger("Please select a proxy faculty for all lecture slots before submitting.");
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
    <div className="flex flex-col gap-8 max-w-4xl mx-auto p-4 pb-20 animate-fade-in">
      {/* 🟢 Glassmorphic Header Card */}
      <div className="relative overflow-hidden rounded-3xl border border-divider/65 bg-gradient-to-r from-primary/10 via-secondary/5 to-background p-6 md:p-8 shadow-md">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-40 h-40 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-40 h-40 bg-secondary/15 rounded-full blur-3xl" />
        
        <Button
          variant="tertiary"
          onPress={() => router.push("/app/academics/approvals")}
          className="flex items-center gap-1.5 text-default-500 hover:text-foreground font-semibold mb-4 transition-colors group px-0 min-w-0 bg-transparent"
        >
          <ChevronLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Back to Approvals
        </Button>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
          New Leave / WFH Request
        </h1>
        <p className="text-sm text-default-500 mt-1 max-w-xl leading-relaxed">
          Create an official request, specify your absence period, and assign proxy faculties to ensure your teaching lectures continue smoothly.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-8">
        {/* 📋 Main Request Info Card */}
        <Card className="p-6 border border-divider/65 bg-content1/75 backdrop-blur-md rounded-2xl shadow-sm">
          <Card.Content className="flex flex-col gap-6">
            <h2 className="text-base font-bold text-foreground/90 border-b border-divider/50 pb-2.5 flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-primary" />
              General Details
            </h2>

            {/* Request Type Selection */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-default-500 uppercase tracking-wider flex items-center gap-1">
                Request Type <span className="text-rose-500">*</span>
              </label>
              <Select
                aria-label="Select Request Type"
                placeholder="Choose Request Type"
                selectedKey={requestTypeCode}
                onSelectionChange={(key) => setRequestTypeCode(key as string)}
                className="max-w-md"
              >
                <Select.Trigger className="bg-content2/40 hover:bg-content2/80 border border-divider/80 rounded-xl h-11 px-4 flex items-center justify-between transition-colors">
                  <Select.Value>
                    {({ isPlaceholder, state }) => {
                      if (isPlaceholder || state.selectedItems.length === 0) {
                        return <span className="text-sm text-default-400 font-medium">Choose Request Type</span>;
                      }
                      return <span className="text-sm font-semibold text-foreground">{state.selectedItems[0].textValue}</span>;
                    }}
                  </Select.Value>
                  <Select.Indicator className="text-default-400" />
                </Select.Trigger>
                <Select.Popover className="backdrop-blur-md bg-content1/95 border border-divider shadow-2xl rounded-xl min-w-[320px]">
                  <ListBox className="p-1">
                    {requestTypes.map((type: any) => (
                      <ListBox.Item id={type.code} key={type.code} textValue={type.name} className="p-2.5 rounded-lg hover:bg-primary/10 transition-colors">
                        <span className="text-sm font-semibold text-foreground">{type.name}</span>
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
            </div>

            {/* Date Range Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-default-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-default-400" />
                  From Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="bg-content2/40 hover:bg-content2/80 focus:bg-content1 border border-divider/80 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl h-11 px-4 text-sm font-semibold text-foreground transition-all outline-none"
                />
              </div>
              
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-default-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-default-400" />
                  To Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="bg-content2/40 hover:bg-content2/80 focus:bg-content1 border border-divider/80 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl h-11 px-4 text-sm font-semibold text-foreground transition-all outline-none"
                />
              </div>
            </div>

            {/* Description Textarea */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-default-500 uppercase tracking-wider">
                Reason & Description <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Please state the reason for leave or WFH (e.g., Medical Emergency, External Research Workshop...)"
                rows={4}
                className="bg-content2/40 hover:bg-content2/80 focus:bg-content1 border border-divider/80 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl p-4 text-sm text-foreground transition-all outline-none resize-none leading-relaxed"
              />
            </div>

            {/* 📎 Premium Interactive File Uploader */}
            <div className="flex flex-col gap-2 mt-2">
              <label className="text-xs font-bold text-default-500 uppercase tracking-wider flex items-center gap-1.5">
                Supporting Documents (Optional)
              </label>
              
              {uploadState === "idle" && (
                <div className="border-2 border-dashed border-divider hover:border-primary/50 bg-content2/20 hover:bg-content2/40 rounded-2xl p-6 text-center cursor-pointer transition-all relative group overflow-hidden">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleSimulatedUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                  />
                  <div className="flex flex-col items-center gap-2.5">
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                      <UploadCloud className="h-5 w-5" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-foreground">Click to upload or drag files here</span>
                      <span className="text-[10px] text-default-400 mt-0.5">PDF or Images up to 5MB</span>
                    </div>
                  </div>
                </div>
              )}

              {uploadState === "uploading" && (
                <div className="border border-divider bg-content1 rounded-2xl p-5 flex flex-col gap-3 shadow-inner">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-default-500 flex items-center gap-2">
                      <Spinner size="xl" />
                      Uploading: {fileName}
                    </span>
                    <span className="font-extrabold text-primary">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-content2 rounded-full h-2 overflow-hidden border border-divider">
                    <div 
                      className="bg-primary h-full transition-all duration-150 rounded-full" 
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {uploadState === "success" && (
                <div className="border border-success/35 bg-success/5 rounded-2xl p-4 flex items-center justify-between shadow-sm animate-scale-up">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-success/15 text-success flex items-center justify-center shadow-inner">
                      <CheckCircle className="h-5 w-5" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-foreground max-w-[280px] md:max-w-md truncate">
                        {fileName}
                      </span>
                      <span className="text-[9px] text-success/80 font-semibold flex items-center gap-1">
                        <FileCheck className="h-3 w-3" />
                        Uploaded successfully
                      </span>
                    </div>
                  </div>
                  <Button
                    isIconOnly
                    variant="outline"
                    onPress={clearUploadedFile}
                    className="text-default-400 hover:text-rose-500 rounded-full bg-transparent hover:bg-rose-50 min-w-0 w-8 h-8 flex items-center justify-center transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </Card.Content>
        </Card>

        {/* 🗓️ Timetable / Proxy Slot Allocation Card (Only loaded for Leave Approval) */}
        {requestTypeCode === "leave_approval" && fromDate && toDate && (
          <Card className="p-6 border border-divider/65 bg-content1/75 backdrop-blur-md rounded-2xl shadow-sm animate-slide-up">
            <Card.Content className="flex flex-col gap-5">
              <div className="border-b border-divider/50 pb-2.5 flex items-center justify-between">
                <h2 className="text-base font-bold text-foreground/90 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Lecture Proxy Allocations
                </h2>
                <div className="bg-primary/10 text-primary text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Absence schedule
                </div>
              </div>

              {isTimetableLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3 bg-content2/20 rounded-2xl border border-dashed border-divider">
                  <Spinner size="lg" />
                  <span className="text-xs text-default-400 font-semibold">Scanning your schedule for lecturing slots...</span>
                </div>
              ) : timetableDays.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-10 bg-content2/10 rounded-2xl border border-dashed border-divider">
                  <FileText className="h-8 w-8 text-default-300 mb-2" />
                  <span className="text-xs font-bold text-default-400">No scheduled lectures found</span>
                  <span className="text-[10px] text-default-400 max-w-xs mt-0.5">
                    No academic schedule matches your selected leave period. You can submit without proxy.
                  </span>
                </div>
              ) : (
                <div className="flex flex-col gap-6">
                  {timetableDays.map((day) => {
                    if (day.lectures.length === 0) return null;

                    return (
                      <div key={day.date} className="flex flex-col gap-3 bg-content2/20 p-4 rounded-2xl border border-divider/40">
                        <div className="flex items-center gap-2 border-b border-divider/40 pb-2">
                          <div className="w-2 h-2 rounded-full bg-primary" />
                          <span className="text-xs font-extrabold text-foreground">{day.dayOfWeek}</span>
                          <span className="text-[10px] text-default-400">({day.date})</span>
                        </div>

                        <div className="flex flex-col gap-3">
                          {day.lectures.map((lect: any) => {
                            const assignmentKey = `${day.date}_${lect.slotId}`;
                            const currentProxyId = proxyAssignments[assignmentKey] || null;

                            return (
                              <div
                                key={lect.slotId}
                                className="p-4 bg-content1 rounded-xl border border-divider/60 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow-sm hover:border-primary/20 transition-all"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-xl bg-primary/5 text-primary flex items-center justify-center font-bold text-xs shadow-inner">
                                    {lect.label.split(" ")[0] || "L"}
                                  </div>
                                  <div className="flex flex-col text-left">
                                    <span className="text-xs font-bold text-foreground">
                                      {lect.label}
                                    </span>
                                    <span className="text-[10px] text-default-400 mt-0.5">
                                      Division: <span className="font-semibold text-foreground/80">{lect.divisionName}</span> • Subject: <span className="font-semibold text-foreground/80">{lect.subjectName}</span>
                                    </span>
                                  </div>
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

        {/* 🔗 Dynamic Workflow Stepper Visualizer */}
        {currentChain.length > 0 && (
          <Card className="p-6 border border-divider/65 bg-content1/75 backdrop-blur-md rounded-2xl shadow-sm">
            <Card.Content className="flex flex-col gap-4">
              <h2 className="text-base font-bold text-foreground/90 flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-primary" />
                Dynamic Routing Workflow Chain
              </h2>
              <p className="text-xs text-default-400 leading-normal">
                Based on your requested type, this request automatically routes sequentially through these authorized roles:
              </p>

              <div className="flex flex-wrap items-center gap-4 bg-content2/30 p-5 rounded-2xl border border-divider/40 shadow-inner mt-2">
                {currentChain.map((role: string, idx: number) => (
                  <React.Fragment key={role}>
                    <div className="flex items-center gap-3 bg-content1 px-4 py-3 rounded-xl border border-divider shadow-sm hover:-translate-y-0.5 transition-all cursor-default">
                      <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shadow-inner">
                        {idx + 1}
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="text-xs font-bold text-foreground capitalize">
                          {role.replace("_", " ")}
                        </span>
                        <span className="text-[9px] text-default-400 font-semibold uppercase tracking-wider">
                          Approver Level {idx + 1}
                        </span>
                      </div>
                    </div>
                    {idx < currentChain.length - 1 && (
                      <ArrowRight className="text-primary/40 animate-pulse hidden sm:block h-4 w-4" />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </Card.Content>
          </Card>
        )}

        {/* 🚀 Submit Button */}
        <Button
          type="submit"
          className="font-extrabold w-full bg-primary hover:bg-primary/95 text-primary-foreground py-6 rounded-2xl text-sm transition-all hover:scale-[1.01] hover:shadow-lg shadow-md flex items-center justify-center gap-2 mt-4"
        >
          {submitMutation.isPending ? (
            <>
              <Spinner size="sm" color="current" />
              <span>Submitting Request...</span>
            </>
          ) : (
            <span>Submit Request to Approval Chain</span>
          )}
        </Button>
      </form>
    </div>
  );
}
