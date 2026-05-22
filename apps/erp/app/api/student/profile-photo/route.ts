import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, S3_BUCKET } from "@/app/lib/storage";
import { getAuthContext } from "@/app/lib/api-auth";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");

  if (!key) {
    return new NextResponse("Key required", { status: 400 });
  }

  // 1. Authenticate user
  const auth = await getAuthContext(req);
  if (!auth) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // 2. Authorize access to S3 key
  let isAuthorized = false;

  const studentMatch = key.match(/^students\/(\d+)\//);
  const facultyMatch = key.match(/^faculty\/(\d+)\//);

  if (studentMatch) {
    const studentId = Number(studentMatch[1]);
    if (auth.roles.some((role) => ["faculty", "counselor", "hod"].includes(role))) {
      // Faculty, Counselor, and HOD can view any student files
      isAuthorized = true;
    } else if (auth.roles.includes("student")) {
      // Students can only access their own files
      isAuthorized = auth.userId === studentId;
    }
  } else if (facultyMatch) {
    const facultyId = Number(facultyMatch[1]);
    const isCircular = key.includes("/circular_attachment_");

    if (auth.roles.some((role) => ["faculty", "counselor", "hod"].includes(role))) {
      if (auth.roles.includes("hod")) {
        // HOD can view any faculty files
        isAuthorized = true;
      } else {
        // Other faculty can view circulars or their own files
        isAuthorized = isCircular || auth.userId === facultyId;
      }
    } else if (auth.roles.includes("student")) {
      // Students can view circulars
      isAuthorized = isCircular;
    }
  }

  if (!isAuthorized) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const command = new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
    });

    const response = await s3Client.send(command);
    if (!response.Body) {
      return new NextResponse("File not found", { status: 404 });
    }

    const contentType = response.ContentType || "application/octet-stream";
    
    // transformToByteArray() returns Uint8Array; wrap in Blob for BodyInit compatibility.
    const bytes = await response.Body.transformToByteArray();
    const view = new Uint8Array(
      bytes.buffer as ArrayBuffer,
      bytes.byteOffset,
      bytes.byteLength
    );
    const body = new Blob([view], { type: contentType });

    const headers: Record<string, string> = {
      "Content-Type": contentType,
      "Cache-Control": "private, no-cache, no-store, must-revalidate", // 🚀 Security: do not allow public caching of sensitive documents
    };

    if (searchParams.get("download") === "true") {
      const filename = key.split("/").pop() || "document";
      headers["Content-Disposition"] = `attachment; filename="${filename}"`;
    }

    return new NextResponse(body, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("[GET /api/student/profile-photo]", error);
    return new NextResponse("Not Found", { status: 404 });
  }
}