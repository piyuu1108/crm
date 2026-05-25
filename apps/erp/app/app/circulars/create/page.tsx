"use client";

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Input,
  Button,
  Select,
  ListBox,
  Label,
  Card,
  Alert,
  Checkbox,
  CheckboxGroup,
  Spinner,
} from "@heroui/react";
import { useAuthStore } from "@/app/lib/store/use-auth-store";
import { RichTextEditor } from "../components/rich-text-editor";
import { ArrowLeft, ArrowUpToLine, File } from "@gravity-ui/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const AUDIENCE_OPTIONS = [
  {
    id: "ALL",
    label: "All Users",
    description: "Every student, faculty, and staff member",
    color: "success",
  },
  {
    id: "FACULTY",
    label: "Faculty Only",
    description: "Only faculty, counselors, and HODs — not students",
    color: "accent",
  },
  {
    id: "YEAR",
    label: "Specific Year",
    description: "All students in a particular academic year",
    color: "warning",
  },
  {
    id: "DIVISION",
    label: "Specific Division(s)",
    description: "Only students in selected divisions",
    color: "danger",
  },
] as const;

export default function CreateCircularPage() {
  const router = useRouter();
  const { activeRole } = useAuthStore();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetType, setTargetType] = useState<string>("ALL");
  const [targetYear, setTargetYear] = useState<string>("");
  const [targetDivisionIds, setTargetDivisionIds] = useState<string[]>([]);

  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const canCreate =
    activeRole === "faculty" ||
    activeRole === "hod" ||
    activeRole === "counselor" ||
    activeRole === "principal" ||
    activeRole === "vice_principal";

  const isAdmin = activeRole === "principal" || activeRole === "vice_principal";
  const audienceOptions = isAdmin
    ? AUDIENCE_OPTIONS.filter((o) => o.id === "ALL" || o.id === "FACULTY")
    : AUDIENCE_OPTIONS;

  const { data: divisionsData, isLoading: isDivisionsLoading } = useQuery({
    queryKey: ["divisions-all"],
    queryFn: async () => {
      const res = await fetch("/api/admin/divisions?limit=1000", {
        credentials: "include",
      });
      if (!res.ok) return { data: { divisions: [] } };
      return res.json();
    },
    enabled: targetType === "DIVISION",
    staleTime: 5 * 60_000,
  });

  const divisions: any[] = divisionsData?.data?.divisions ?? [];

  if (!canCreate) {
    return (
      <div className="p-6">
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Unauthorized</Alert.Title>
            <Alert.Description>You do not have permission to create circulars.</Alert.Description>
          </Alert.Content>
        </Alert>
      </div>
    );
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      if (selectedFile.size > 2 * 1024 * 1024) {
        setError("File size exceeds 2 MB limit.");
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setError("");
    }
  };

  const validate = (): boolean => {
    if (!title.trim()) {
      setError("Title is required.");
      return false;
    }
    if (targetType === "YEAR" && !targetYear) {
      setError("Please select a target year.");
      return false;
    }
    if (targetType === "DIVISION" && targetDivisionIds.length === 0) {
      setError("Please select at least one division.");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      let attachmentUrl = null;
      let attachmentType = null;
      let attachmentSize = null;

      if (file) {
        const urlRes = await fetch("/api/faculty/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            docType: "circular_attachment",
            contentType: file.type,
            fileSize: file.size,
          }),
        });
        if (!urlRes.ok) {
          const errData = await urlRes.json();
          throw new Error(errData.error ?? "Failed to get upload URL");
        }
        const {
          data: { uploadUrl, fileKey },
        } = await urlRes.json();

        const uploadRes = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!uploadRes.ok) throw new Error("Failed to upload file");

        attachmentUrl = fileKey;
        attachmentType = file.type;
        attachmentSize = file.size;
      }

      const res = await fetch("/api/faculty/circulars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: title.trim(),
          description,
          targetType,
          targetYear: targetType === "YEAR" ? parseInt(targetYear, 10) : null,
          targetDivisionIds:
            targetType === "DIVISION"
              ? targetDivisionIds.map(Number)
              : [],
          attachmentUrl,
          attachmentType,
          attachmentSize,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error ?? "Failed to create circular");
      }

      // Invalidate list so it refreshes immediately
      await queryClient.invalidateQueries({ queryKey: ["circulars"] });
      router.push("/app/circulars");
    } catch (err: any) {
      setError(err.message ?? "An error occurred during submission.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAudienceChange = (value: string) => {
    setTargetType(value);
    setTargetYear("");
    setTargetDivisionIds([]);
    setError("");
  };

  const selectedAudienceOption = AUDIENCE_OPTIONS.find((o) => o.id === targetType);

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
          <h1 className="text-2xl font-bold text-foreground">Create Circular</h1>
          <p className="text-sm text-muted-foreground">
            Publish a notice to your selected audience
          </p>
        </div>
      </div>

      {error && (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Error</Alert.Title>
            <Alert.Description>{error}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      <Card>
        <Card.Content>
          <form id="create-circular-form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-6 w-full">
            {/* Title */}
            <div className="flex flex-col gap-1.5">
              <Label>
                Title <span className="text-danger">*</span>
              </Label>
              <Input
                placeholder="Enter circular title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">
                Description
              </label>
              <RichTextEditor
                value={description}
                onChange={setDescription}
                placeholder="Write the details of the circular here..."
              />
            </div>

            {/* Audience */}
            <div className="flex flex-col gap-3">
              <Label>
                Target Audience <span className="text-danger">*</span>
              </Label>

              {/* Audience type cards */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {audienceOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleAudienceChange(opt.id)}
                    className={`flex flex-col gap-1 rounded-lg border p-3 text-left transition-colors duration-100 ${
                      targetType === opt.id
                        ? "border-accent bg-accent/5"
                        : "border-divider hover:border-default-400 hover:bg-default/5"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground">
                        {opt.label}
                      </span>
                      {targetType === opt.id && (
                        <span className="h-2 w-2 rounded-full bg-accent" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-tight">
                      {opt.description}
                    </p>
                  </button>
                ))}
              </div>

              {/* Year selector */}
              {targetType === "YEAR" && (
                <Select
                  isRequired
                  placeholder="Select academic year"
                  selectedKey={targetYear}
                  onSelectionChange={(v) => setTargetYear(v as string)}
                >
                  <Label>Academic Year</Label>
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {["1", "2", "3", "4"].map((y) => (
                        <ListBox.Item key={y} id={y} textValue={`${y}${["st","nd","rd","th"][+y-1]} Year`}>
                          {y}{["st","nd","rd","th"][+y-1]} Year
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>
              )}

              {/* Division multi-select */}
              {targetType === "DIVISION" && (
                <div className="flex flex-col gap-2">
                  <Label>Select Divisions</Label>
                  {isDivisionsLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Spinner size="sm" />
                      Loading divisions…
                    </div>
                  ) : divisions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No divisions found.
                    </p>
                  ) : (
                    <CheckboxGroup
                      value={targetDivisionIds}
                      onChange={(vals) => setTargetDivisionIds(vals as string[])}
                      className="grid grid-cols-2 sm:grid-cols-3 gap-2"
                    >
                      {divisions.map((div: any) => (
                        <Checkbox key={div.id} value={div.id.toString()}>
                          {div.displayName}
                        </Checkbox>
                      ))}
                    </CheckboxGroup>
                  )}
                  {targetDivisionIds.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {targetDivisionIds.map((id) => {
                        const div = divisions.find(
                          (d: any) => d.id.toString() === id
                        );
                        return (
                          div && (
                            <div
                              key={id}
                              className="inline-flex items-center gap-1 rounded-full bg-danger/10 text-danger px-2.5 py-0.5 text-xs font-medium"
                            >
                              {div.displayName}
                              <button
                                type="button"
                                onClick={() =>
                                  setTargetDivisionIds((prev) =>
                                    prev.filter((d) => d !== id)
                                  )
                                }
                                className="ml-0.5 rounded-full hover:bg-danger/20 p-0.5 transition-colors"
                                aria-label={`Remove ${div.displayName}`}
                              >
                                ×
                              </button>
                            </div>
                          )
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Attachment */}
            <div className="flex flex-col gap-2 border-t border-divider pt-5">
              <label className="text-sm font-medium text-foreground">
                Attachment{" "}
                <span className="text-xs text-muted-foreground font-normal">
                  (Optional · Max 2 MB · PDF or image)
                </span>
              </label>
              <div className="flex items-center gap-3 flex-wrap">
                <Button
                  variant="secondary"
                  size="sm"
                  onPress={() =>
                    document.getElementById("circular-file-upload")?.click()
                  }
                >
                  <ArrowUpToLine className="w-4 h-4" />
                  Choose File
                </Button>
                <input
                  id="circular-file-upload"
                  type="file"
                  className="hidden"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={handleFileChange}
                />
                {file && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <File className="w-4 h-4 shrink-0" />
                    <span className="truncate max-w-[180px]">{file.name}</span>
                    <span className="text-xs">
                      ({Math.round(file.size / 1024)} KB)
                    </span>
                    <Button
                      size="sm"
                      isIconOnly
                      variant="tertiary"
                      className="text-danger"
                      onPress={() => setFile(null)}
                    >
                      ×
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Footer actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-divider w-full">
              <Button
                variant="tertiary"
                onPress={() => router.back()}
                isDisabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                form="create-circular-form"
                isDisabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Spinner color="current" size="sm" />
                    Publishing…
                  </>
                ) : (
                  "Publish Circular"
                )}
              </Button>
            </div>
          </form>
        </Card.Content>
      </Card>
    </div>
  );
}
