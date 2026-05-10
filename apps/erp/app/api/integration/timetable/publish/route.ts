import { NextRequest, NextResponse } from "next/server";
import { SimplifiedPayloadSchema } from "@/app/lib/integration/timetable-validator";
import { z } from "zod";
import { processTimetablePublish } from "@/app/lib/integration/timetable-repository";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization",
  };
}

// Preflight request handler
export async function OPTIONS() {
  return NextResponse.json({}, {
    status: 200,
    headers: corsHeaders(),
  });
}

export async function POST(req: NextRequest) {
  try {
    // 1. Basic API Key Authentication (Configurable via ENV)
    const authHeader = req.headers.get("authorization");
    const EXPECTED_SECRET =
      process.env.IMS_INTEGRATION_SECRET || "dev-ims-secret";

    if (authHeader !== `Bearer ${EXPECTED_SECRET}`) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        {
          status: 401,
          headers: corsHeaders(),
        }
      );
    }

    // 2. Parse body
    const body = await req.json();

    // 3. Validate Zod Schema
    const PayloadArraySchema = z.array(SimplifiedPayloadSchema);
    const parseResult = PayloadArraySchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_PAYLOAD_STRUCTURE",
          message:
            "The payload does not match the expected API contract.",
          validationErrors: parseResult.error.issues.map(
            (err: any) => ({
              path: err.path.join("."),
              message: err.message,
            })
          ),
        },
        {
          status: 400,
          headers: corsHeaders(),
        }
      );
    }

    // 4. Process publish operation
    const result = await processTimetablePublish(
      parseResult.data
    );

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: "VALIDATION_FAILED",
          message:
            "The payload contains invalid business keys or missing references. Import rejected.",
          validationErrors: result.errors,
        },
        {
          status: 400,
          headers: corsHeaders(),
        }
      );
    }

    // 5. Success
    return NextResponse.json(
      {
        success: true,
        message: "Timetable published successfully.",
        data: {
          insertedRows: result.insertedRows,
          timestamp: new Date().toISOString(),
        },
      },
      {
        status: 200,
        headers: corsHeaders(),
      }
    );
  } catch (error: any) {
    console.error("Timetable publish error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_SERVER_ERROR",
        message:
          "An unexpected error occurred during the publishing process.",
      },
      {
        status: 500,
        headers: corsHeaders(),
      }
    );
  }
}