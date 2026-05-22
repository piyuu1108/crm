"use client";

import React, { useState, useCallback } from "react";
import { Button, Alert, Spinner } from "@heroui/react";
import {
  ArrowRight,
  ArrowUpFromLine,
  TrashBin,
  CircleCheck,
  FileText,
  Picture,
  Eye,
  ArrowDownToLine,
} from "@gravity-ui/icons";
import {
  useSaveStepMutation,
  useUploadUrlMutation,
  uploadFileToStorage,
  type ProfileData,
} from "@/app/lib/queries/profile";
import {
  validateStep4,
  type DocumentsData,
  type ValidationError,
} from "@/app/lib/validations/profile";

// ─── Constants ──────────────────────────────────────────────────────────────

const MAX_FILE_SIZE = 100 * 1024; // 100KB

interface DocConfig {
  key: keyof DocumentsData;
  dbKey: string;
  label: string;
  required: boolean;
  conditionalRequired?: (profile: ProfileData) => boolean;
  accept: string;
  icon: typeof FileText;
}

const DOC_CONFIGS: DocConfig[] = [
  {
    key: "profilePhoto",
    dbKey: "profile_photo",
    label: "Profile Photo",
    required: true,
    accept: "image/jpeg,image/png,image/webp",
    icon: Picture,
  },
  {
    key: "lcCertificate",
    dbKey: "lc_certificate",
    label: "Leaving Certificate (LC)",
    required: true,
    accept: "image/jpeg,image/png,image/webp,application/pdf",
    icon: FileText,
  },
  {
    key: "marksheet10th",
    dbKey: "marksheet_10th",
    label: "10th Marksheet",
    required: true,
    accept: "image/jpeg,image/png,image/webp,application/pdf",
    icon: FileText,
  },
  {
    key: "marksheet12th",
    dbKey: "marksheet_12th",
    label: "12th Marksheet",
    required: true,
    accept: "image/jpeg,image/png,image/webp,application/pdf",
    icon: FileText,
  },
  {
    key: "casteCertificate",
    dbKey: "caste_certificate",
    label: "Caste Certificate",
    required: false,
    conditionalRequired: (p) => !!p.category && p.category !== "Open",
    accept: "image/jpeg,image/png,image/webp,application/pdf",
    icon: FileText,
  },
  {
    key: "migrationCertificate",
    dbKey: "migration_certificate",
    label: "Migration Certificate",
    required: false,
    conditionalRequired: (p) => !!p.board && p.board !== "GSEB",
    accept: "image/jpeg,image/png,image/webp,application/pdf",
    icon: FileText,
  },
];

function isImageFile(key: string | undefined | null): boolean {
  if (!key) return false;
  const lower = key.toLowerCase();
  return lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".png") || lower.endsWith(".webp");
}

// ─── Component ──────────────────────────────────────────────────────────────

interface StepDocumentsProps {
  profile: ProfileData;
  onSaved: () => void;
  onSaving: (saving: boolean) => void;
}

export function StepDocuments({ profile, onSaved, onSaving }: StepDocumentsProps) {
  const saveMutation = useSaveStepMutation();
  const uploadUrlMutation = useUploadUrlMutation();

  // Track uploaded file keys per doc type
  const [uploadedFiles, setUploadedFiles] = useState<DocumentsData>(() => ({
    profilePhoto: profile.profilePhoto || undefined,
    lcCertificate: profile.documents?.["lc_certificate"] || undefined,
    marksheet10th: profile.documents?.["marksheet_10th"] || undefined,
    marksheet12th: profile.documents?.["marksheet_12th"] || undefined,
    casteCertificate: profile.documents?.["caste_certificate"] || undefined,
    migrationCertificate: profile.documents?.["migration_certificate"] || undefined,
  }));

  const [uploading, setUploading] = useState<string | null>(null);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);

  const getFieldError = (field: string) =>
    errors.find((e) => e.field === field)?.message;

  // ── Upload a single file ────────────────────────────────────────────────

  const handleFileSelect = useCallback(
    async (docKey: keyof DocumentsData, file: File) => {
      // Client-side size check
      if (file.size > MAX_FILE_SIZE) {
        setServerError(`File "${file.name}" exceeds maximum size of 100KB`);
        return;
      }

      setServerError(null);
      setUploading(docKey);

      try {
        // Map frontend key to backend docType
        const docTypeMap: Record<string, string> = {
          profilePhoto: "profile_photo",
          lcCertificate: "lc_certificate",
          marksheet10th: "marksheet_10th",
          marksheet12th: "marksheet_12th",
          casteCertificate: "caste_certificate",
          migrationCertificate: "migration_certificate",
        };

        // 1. Get presigned URL
        const { uploadUrl, fileKey } = await uploadUrlMutation.mutateAsync({
          docType: docTypeMap[docKey],
          contentType: file.type,
          fileSize: file.size,
        });

        // 2. Upload directly to storage
        await uploadFileToStorage(file, uploadUrl);

        // 3. Store the file key locally
        setUploadedFiles((prev) => ({
          ...prev,
          [docKey]: fileKey,
        }));
      } catch (err) {
        setServerError((err as Error).message);
      } finally {
        setUploading(null);
      }
    },
    [uploadUrlMutation]
  );

  const handleRemoveFile = useCallback((docKey: keyof DocumentsData) => {
    setUploadedFiles((prev) => ({
      ...prev,
      [docKey]: undefined,
    }));
  }, []);

  // ── Save step ─────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    // Validate
    const result = validateStep4(uploadedFiles, profile.category ?? undefined, profile.board ?? undefined);
    setErrors(result.errors);
    if (!result.valid) return;

    onSaving(true);
    try {
      await saveMutation.mutateAsync({ step: 4, data: { ...uploadedFiles } as unknown as Record<string, unknown> });
      onSaved();
    } catch (err) {
      setServerError((err as Error).message);
    } finally {
      onSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {serverError && (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>{serverError}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      <Alert status="accent">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Description>
            Maximum file size: <strong>100KB</strong> per file. Accepted formats: JPEG, PNG, WebP, PDF.
          </Alert.Description>
        </Alert.Content>
      </Alert>

      <div className="grid gap-4 sm:grid-cols-2">
        {DOC_CONFIGS.map((doc) => {
          const isRequired = doc.required || (doc.conditionalRequired?.(profile) ?? false);
          const fileKey = uploadedFiles[doc.key];
          const isUploaded = !!fileKey;
          const isCurrentlyUploading = uploading === doc.key;
          const fieldError = getFieldError(doc.key);
          const Icon = doc.icon;

          return (
            <div
              key={doc.key}
              className={`
                relative rounded-xl border-2 border-dashed p-4 transition-all duration-200
                ${fieldError
                  ? "border-danger bg-danger/5"
                  : isUploaded
                    ? "border-success/40 bg-success/5"
                    : "border-divider hover:border-accent/40 hover:bg-accent/5"
                }
              `}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`
                    flex h-10 w-10 shrink-0 items-center justify-center rounded-lg
                    ${isUploaded ? "bg-success/10 text-success" : "bg-default/10 text-muted-foreground"}
                  `}
                >
                  {isUploaded ? <CircleCheck className="size-5" /> : <Icon className="size-5" />}
                </div>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{doc.label}</p>
                    {isRequired && (
                      <span className="rounded bg-danger/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-danger">
                        Required
                      </span>
                    )}
                  </div>

                  {isUploaded ? (
                    <div className="space-y-3 pt-1">
                      {/* Preview Media Container */}
                      <div className="flex items-center gap-3">
                        {isImageFile(fileKey) ? (
                          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md border border-success/30 shadow-sm bg-muted">
                            <img
                              src={`/api/student/profile-photo?key=${encodeURIComponent(fileKey)}`}
                              alt={doc.label}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md border border-divider bg-default/10 text-muted-foreground shadow-sm">
                            <FileText className="size-6 text-danger" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-success">
                            ✓ Uploaded successfully
                          </p>
                          <p className="truncate text-[10px] text-muted-foreground" title={fileKey}>
                            {fileKey.split("/").pop()}
                          </p>
                        </div>
                      </div>

                      {/* Action Buttons Group */}
                      <div className="flex flex-wrap items-center gap-2">
                        {/* View Preview Button */}
                        <a
                          href={`/api/student/profile-photo?key=${encodeURIComponent(fileKey)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-divider bg-content1 px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-default/10 hover:text-foreground transition-all duration-200"
                          title="Open document in a new tab to preview"
                        >
                          <Eye className="size-3.5" />
                          <span>Preview</span>
                        </a>

                        {/* Download Button */}
                        <a
                          href={`/api/student/profile-photo?key=${encodeURIComponent(fileKey)}&download=true`}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-divider bg-content1 px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-default/10 hover:text-foreground transition-all duration-200"
                          title="Download document to your device"
                        >
                          <ArrowDownToLine className="size-3.5" />
                          <span>Download</span>
                        </a>

                        {/* Remove Button */}
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(doc.key)}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-danger/20 bg-danger/5 px-2.5 py-1.5 text-xs font-medium text-danger hover:bg-danger/10 transition-all duration-200"
                          title="Remove this document"
                        >
                          <TrashBin className="size-3.5" />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>
                  ) : isCurrentlyUploading ? (
                    <div className="flex items-center gap-2">
                      <Spinner size="sm" />
                      <span className="text-xs text-muted-foreground">Uploading…</span>
                    </div>
                  ) : (
                    <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-accent hover:underline">
                      <ArrowUpFromLine className="size-3" />
                      Choose file
                      <input
                        type="file"
                        accept={doc.accept}
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileSelect(doc.key, file);
                          // Reset input so same file can be re-selected
                          e.target.value = "";
                        }}
                      />
                    </label>
                  )}

                  {fieldError && (
                    <p className="text-xs text-danger">{fieldError}</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          isPending={saveMutation.isPending}
          isDisabled={saveMutation.isPending || !!uploading}
        >
          {({ isPending }) => (
            <>
              {isPending ? <Spinner color="current" size="sm" /> : null}
              {isPending ? "Saving…" : "Save & Continue"}
              {!isPending && <ArrowRight className="size-4" />}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
