import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, S3_BUCKET } from "@/app/lib/storage";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");

  if (!key) {
    return new NextResponse("Key required", { status: 400 });
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

    // 🚀 FIX: Return the binary buffer directly with image headers
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        // Highly Recommended: Cache the image to reduce repeated S3 bucket reads & save costs
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=43200",
      },
    });
  } catch (error) {
    console.error("[GET /api/student/profile-photo]", error);
    return new NextResponse("Not Found", { status: 404 });
  }
}