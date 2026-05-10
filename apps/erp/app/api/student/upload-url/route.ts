import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/app/lib/auth";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client, S3_BUCKET } from "@/app/lib/storage";

/**
 * Valid document types for upload
 */
const VALID_DOC_TYPES = [
  "profile_photo",
  "lc_certificate",
  "marksheet_10th",
  "marksheet_12th",
  "caste_certificate",
  "migration_certificate",
  "request_attachment",
] as const;

type DocType = (typeof VALID_DOC_TYPES)[number];

/**
 * Allowed MIME types
 */
const ALLOWED_MIMES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "application/pdf": ".pdf",
};

/** Max file size per doc type */
const MAX_FILE_SIZE_DEFAULT = 100 * 1024; // 100KB
const MAX_FILE_SIZE_REQUEST = 2 * 1024 * 1024; // 2MB for request attachments

/**
 * POST /api/student/upload-url
 *
 * Generates a short-lived presigned PUT URL for direct client upload to S3/R2.
 * Backend never handles the file — only stores the reference.
 *
 * Body: { docType: string, contentType: string, fileSize: number }
 * Returns: { uploadUrl: string, fileKey: string }
 */
export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: invalid session" },
        { status: 401 }
      );
    }

    const roles = Array.isArray(payload.roles) ? payload.roles : [];
    if (!roles.includes("student")) {
      return NextResponse.json(
        { success: false, error: "Forbidden: student role required" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { docType, contentType, fileSize } = body;

    // ── Validate docType ──────────────────────────────────────────────────
    if (!docType || !VALID_DOC_TYPES.includes(docType as DocType)) {
      return NextResponse.json(
        { success: false, error: `Invalid docType. Must be one of: ${VALID_DOC_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    // ── Validate contentType ──────────────────────────────────────────────
    if (!contentType || !ALLOWED_MIMES[contentType]) {
      return NextResponse.json(
        { success: false, error: `Invalid contentType. Allowed: ${Object.keys(ALLOWED_MIMES).join(", ")}` },
        { status: 400 }
      );
    }

    // ── Validate fileSize ─────────────────────────────────────────────────
    if (!fileSize || typeof fileSize !== "number" || fileSize <= 0) {
      return NextResponse.json(
        { success: false, error: "fileSize is required and must be positive" },
        { status: 400 }
      );
    }

    const maxSize = docType === "request_attachment" ? MAX_FILE_SIZE_REQUEST : MAX_FILE_SIZE_DEFAULT;
    if (fileSize > maxSize) {
      return NextResponse.json(
        { success: false, error: `File exceeds maximum size of ${Math.round(maxSize / 1024)}KB` },
        { status: 400 }
      );
    }

    // ── Generate unique file key ──────────────────────────────────────────
    const ext = ALLOWED_MIMES[contentType];
    const timestamp = Date.now();
    const fileKey = `students/${payload.userId}/${docType}_${timestamp}${ext}`;

    // ── Generate presigned URL (5 min expiry) ─────────────────────────────
    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: fileKey,
      ContentType: contentType,
      ContentLength: fileSize,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 300, // 5 minutes
    });

    return NextResponse.json({
      success: true,
      data: {
        uploadUrl,
        fileKey,
      },
    });
  } catch (error) {
    console.error("[POST /api/student/upload-url]", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate upload URL" },
      { status: 500 }
    );
  }
}
