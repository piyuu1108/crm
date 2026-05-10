"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuthStore } from "@/app/lib/store/use-auth-store";
import {
  Button,
  Card,
  Alert,
  Label,
  TextField,
  TextArea,
  ComboBox,
  ListBox,
  Spinner,
  toast,
  Input
} from "@heroui/react";
import { ArrowLeft, ArrowUpToLine, File as FileIcon, Xmark } from "@gravity-ui/icons";

// ─── Types ──────────────────────────────────────────────────────────────────
interface FacultyOption {
  id: number;
  name: string;
  facultyCode: string;
  designation: string | null;
}

export default function CreateRequestPage() {
  const router = useRouter();
  const { activeRole } = useAuthStore();

  // Form state
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [facultySearch, setFacultySearch] = useState("");
  const [selectedFacultyId, setSelectedFacultyId] = useState<number | null>(null);
  const [selectedFacultyName, setSelectedFacultyName] = useState("");
  const [file, setFile] = useState<globalThis.File | null>(null);
  const [error, setError] = useState("");

  // ── Faculty list query ────────────────────────────────────────────────
  const { data: allFacultyData, isLoading: isFacultyLoading } = useQuery({
    queryKey: ["faculty-all"],
    queryFn: async () => {
      const res = await fetch("/api/requests/faculty-search");
      if (!res.ok) throw new Error("Failed to fetch faculty list");
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 mins
  });

  const allFaculty: FacultyOption[] = allFacultyData?.data || [];

  // Filter in memory
  const facultyOptions = useMemo(() => {
    if (!facultySearch.trim()) return allFaculty;
    const lowerSearch = facultySearch.toLowerCase();
    return allFaculty.filter(
      (f) =>
        f.name.toLowerCase().includes(lowerSearch) ||
        f.facultyCode.toLowerCase().includes(lowerSearch) ||
        (f.designation && f.designation.toLowerCase().includes(lowerSearch))
    );
  }, [allFaculty, facultySearch]);

  // ── File handling ─────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

      if (!allowedTypes.includes(selectedFile.type)) {
        setError("Only JPEG, PNG, WebP, and PDF files are allowed.");
        setFile(null);
        return;
      }

      if (selectedFile.size > 2 * 1024 * 1024) {
        setError("File size exceeds 2MB limit.");
        setFile(null);
        return;
      }

      setFile(selectedFile);
      setError("");
    }
  };

  // ── Submit mutation ───────────────────────────────────────────────────
  const submitMutation = useMutation({
    mutationFn: async () => {
      let attachmentUrl = null;
      let attachmentType = null;
      let attachmentSize = null;

      // Upload file if exists
      if (file) {
        const urlRes = await fetch("/api/student/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            docType: "request_attachment",
            contentType: file.type,
            fileSize: file.size,
          }),
        });

        if (!urlRes.ok) {
          const errData = await urlRes.json();
          throw new Error(errData.error || "Failed to get upload URL");
        }

        const {
          data: { uploadUrl, fileKey },
        } = await urlRes.json();

        const uploadRes = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });

        if (!uploadRes.ok) {
          throw new Error("Failed to upload file");
        }

        attachmentUrl = fileKey;
        attachmentType = file.type;
        attachmentSize = file.size;
      }

      // Create request
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim(),
          description: description.trim(),
          targetFacultyId: selectedFacultyId,
          requestType: "general",
          attachmentUrl,
          attachmentType,
          attachmentSize,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to create request");
      }

      return res.json();
    },
    onSuccess: () => {
      toast.success("Request submitted", {
        description: "Your request has been sent to the selected faculty.",
      });
      router.push("/app/workflows/requests");
    },
    onError: (err: Error) => {
      setError(err.message || "An error occurred during submission.");
    },
  });

  // ── Validation ────────────────────────────────────────────────────────
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!subject.trim()) {
      setError("Title is required.");
      return;
    }
    if (!description.trim()) {
      setError("Description is required.");
      return;
    }
    if (!selectedFacultyId) {
      setError("Please select a faculty member.");
      return;
    }

    submitMutation.mutate();
  };

  // ── Guard ─────────────────────────────────────────────────────────────
  if (activeRole !== "student") {
    return (
      <div className="p-6">
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Unauthorized</Alert.Title>
            <Alert.Description>
              Only students can create requests.
            </Alert.Description>
          </Alert.Content>
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          isIconOnly
          variant="tertiary"
          onPress={() => router.back()}
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">New Request</h1>
          <p className="text-sm text-muted">
            Send a request to a faculty member for approval
          </p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Error</Alert.Title>
            <Alert.Description>{error}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      {/* Form Card */}
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5 w-full">
          {/* Title */}
          <TextField
            isRequired
            value={subject}
            onChange={(v) => setSubject(v)}
          >
            <Label>Title</Label>
            <Input placeholder="e.g., Leave Application, Document Request" />
          </TextField>

          <TextField
            isRequired
            value={description}
            onChange={(v) => setDescription(v)}
          >
            <Label>Description</Label>
            <TextArea
              placeholder="Describe your request in detail..."
              rows={5}
            />
          </TextField>

          <ComboBox
            isRequired
            inputValue={facultySearch}
            onInputChange={(v) => setFacultySearch(v)}
            onSelectionChange={(key) => {
              if (key) {
                const selected = facultyOptions.find(
                  (f) => f.id.toString() === key.toString()
                );
                if (selected) {
                  setSelectedFacultyId(selected.id);
                  setSelectedFacultyName(selected.name);
                }
              } else {
                setSelectedFacultyId(null);
                setSelectedFacultyName("");
              }
            }}
          >
            <Label>Select Faculty</Label>
            <ComboBox.InputGroup>
              <Input placeholder="Search by name..." />
              <ComboBox.Trigger />
            </ComboBox.InputGroup>
            <ComboBox.Popover>
              <ListBox>
                {isFacultyLoading ? (
                  <ListBox.Item id="loading" textValue="Loading...">
                    <div className="flex items-center gap-2 py-1">
                      <Spinner size="sm" />
                      <span className="text-sm text-muted">Searching...</span>
                    </div>
                  </ListBox.Item>
                ) : facultyOptions.length === 0 ? (
                  <ListBox.Item id="empty" textValue="No results">
                    <span className="text-sm text-muted">No faculty found</span>
                  </ListBox.Item>
                ) : (
                  facultyOptions.map((f) => (
                    <ListBox.Item
                      key={f.id.toString()}
                      id={f.id.toString()}
                      textValue={f.name}
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{f.name}</span>
                        <span className="text-xs text-muted">
                          {f.facultyCode}
                          {f.designation ? ` • ${f.designation}` : ""}
                        </span>
                      </div>
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))
                )}
              </ListBox>
            </ComboBox.Popover>
          </ComboBox>

          {/* Selected faculty indicator */}
          {selectedFacultyId && (
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 -mt-2">
              <span>✓ Selected: {selectedFacultyName}</span>
            </div>
          )}

          {/* File Upload */}
          <div className="flex flex-col gap-2 border-t border-separator pt-5">
            <label className="text-sm font-medium text-foreground">
              Attachment{" "}
              <span className="text-muted font-normal">
                (Optional — PDF or Image, max 2MB)
              </span>
            </label>
            <div className="flex items-center gap-4">
              <Button
                variant="secondary"
                onPress={() =>
                  document.getElementById("request-file-upload")?.click()
                }
              >
                <ArrowUpToLine className="w-4 h-4" />
                Choose File
              </Button>
              <input
                id="request-file-upload"
                type="file"
                className="hidden"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={handleFileChange}
              />
              {file && (
                <div className="flex items-center gap-2 text-sm text-muted">
                  <FileIcon className="w-4 h-4" />
                  <span className="truncate max-w-[200px]">{file.name}</span>
                  <span>({Math.round(file.size / 1024)} KB)</span>
                  <Button
                    size="sm"
                    isIconOnly
                    variant="tertiary"
                    className="text-danger"
                    onPress={() => setFile(null)}
                  >
                    <Xmark className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-separator w-full">
            <Button variant="tertiary" onPress={() => router.back()}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              isPending={submitMutation.isPending}
            >
              Submit Request
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
