import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { requirePermission } from "@/app/lib/api-auth";
import { s3Client, S3_BUCKET } from "@/app/lib/storage";
import { AuditLogger } from "@/app/lib/audit-logger";

const VALID_DOC_TYPES = ["profile_photo", "circular_attachment"] as const;
type DocType = (typeof VALID_DOC_TYPES)[number];

const ALLOWED_MIMES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "application/pdf": ".pdf",
};

const MAX_FILE_SIZES: Record<DocType, number> = {
  profile_photo: 100 * 1024, // 100 KB
  circular_attachment: 2 * 1024 * 1024, // 2 MB
};

export async function POST(req: NextRequest) {
  const result = await requirePermission(req, "s3.upload_faculty");
  if (result instanceof NextResponse) return result;
  const auth = result;

  const audit = AuditLogger.start(req, auth, {
    action: "file_upload.generate_url",
    category: "storage",
    summary: "Generated file upload URL for faculty",
  });

  try {
    const body = await req.json();
    const { docType, contentType, fileSize } = body;

    if (!docType || !VALID_DOC_TYPES.includes(docType as DocType)) {
      return audit.error(
        `Invalid docType. Must be one of: ${VALID_DOC_TYPES.join(", ")}`,
        NextResponse.json({ success: false, error: `Invalid docType. Must be one of: ${VALID_DOC_TYPES.join(", ")}` }, { status: 400 })
      );
    }

    if (!contentType || !ALLOWED_MIMES[contentType]) {
      return audit.error(
        `Invalid contentType. Allowed: ${Object.keys(ALLOWED_MIMES).join(", ")}`,
        NextResponse.json({ success: false, error: `Invalid contentType. Allowed: ${Object.keys(ALLOWED_MIMES).join(", ")}` }, { status: 400 })
      );
    }

    if (!fileSize || typeof fileSize !== "number" || fileSize <= 0) {
      return audit.error(
        "fileSize is required and must be positive",
        NextResponse.json({ success: false, error: "fileSize is required and must be positive" }, { status: 400 })
      );
    }

    const maxFileSize = MAX_FILE_SIZES[docType as DocType];
    if (fileSize > maxFileSize) {
      return audit.error(
        `File exceeds maximum size of ${maxFileSize / 1024}KB`,
        NextResponse.json({ success: false, error: `File exceeds maximum size of ${maxFileSize / 1024}KB` }, { status: 400 })
      );
    }

    const ext = ALLOWED_MIMES[contentType];
    const timestamp = Date.now();
    const fileKey = `faculty/${auth.userId}/${docType}_${timestamp}${ext}`;

    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: fileKey,
      ContentType: contentType,
      ContentLength: fileSize,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 300,
    });

    return audit.success(NextResponse.json({
      success: true,
      data: { uploadUrl, fileKey },
    }), { doc: docType, ext });
  } catch (error) {
    return audit.error(error);
  }
}
