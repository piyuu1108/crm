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
                    <div className="flex items-center gap-2">
                      <p className="truncate text-xs text-success" title={fileKey}>
                        ✓ Uploaded
                      </p>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(doc.key)}
                        className="text-xs text-danger hover:underline"
                      >
                        <TrashBin className="size-3" />
                      </button>
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
