import { NextRequest, NextResponse } from "next/server";
import { AuthContext } from "./api-auth";

/**
 * Standardized compact JSON audit log schema definitions for storage efficiency.
 */
export interface AuditLogSchema {
  ts: string;          // ISO Date
  lvl: "info" | "warn" | "error";
  tid: string;          // Trace ID (UUID)
  env: "prod" | "dev";
  evt: {
    act: string;        // Action: e.g. "circulars.create"
    cat: string;        // Category: e.g. "circulars"
    s: number;          // Success status: 1 = success, 0 = failure
    dur: number;        // Duration in milliseconds
  };
  usr: {
    uid?: string;       // User ID
    rl?: string;        // Active Role
    cid?: string;       // Tenant ID / Course ID context
  };
  req: {
    m: string;          // HTTP Method
    p: string;          // Request path
    code: number;       // HTTP Status code
    ip: string;         // IP Address
  };
  biz: {
    sum: string;        // Human readable summary
    did?: string;       // Division ID if applicable
    what?: string;      // Target entity
    eid?: string;       // Target entity ID
    [key: string]: any; // Dynamic shortened keys for context details
  };
}

/**
 * AuditTracker tracks a single request lifetime.
 * Automatically handles duration calculations, error formatting, and context mapping.
 */
export class AuditTracker {
  private startTime: number;
  private req: NextRequest;
  private auth: AuthContext | null;
  private traceId: string;
  private metadata: {
    action: string;
    category: string;
    summary: string;
    entityType?: string;
    entityId?: number;
    divisionId?: number;
  };

  constructor(
    req: NextRequest,
    auth: AuthContext | null,
    metadata: {
      action: string;
      category: string;
      summary: string;
      entityType?: string;
      entityId?: number;
      divisionId?: number;
    }
  ) {
    this.startTime = performance.now();
    this.req = req;
    this.auth = auth;
    this.traceId =
      req.headers.get("x-trace-id") ||
      req.headers.get("X-Trace-ID") ||
      crypto.randomUUID();
    this.metadata = metadata;
  }

  /**
   * Retrieves the current Trace ID.
   */
  getTraceId(): string {
    return this.traceId;
  }

  /**
   * Logs a successful operation and attaches the Trace ID to the response header.
   */
  success(response: NextResponse, bizExtra?: Record<string, any>): NextResponse {
    const duration = Math.round(performance.now() - this.startTime);
    const status = response.status;
    this.writeLog("info", 1, duration, status, bizExtra);

    response.headers.set("x-trace-id", this.traceId);
    return response;
  }

  /**
   * Logs a failed operation with full exception traceback mapping, returning a NextResponse.
   */
  error(error: any, responseOverride?: NextResponse, status: number = 500): NextResponse {
    const duration = Math.round(performance.now() - this.startTime);
    const errMessage = error instanceof Error ? error.message : String(error);
    const errStack = error instanceof Error ? error.stack : undefined;

    const bizExtra = {
      err: errMessage,
      stack: errStack ? errStack.split("\n").slice(0, 3).join(" | ") : undefined,
    };

    const code = responseOverride ? responseOverride.status : status;
    this.writeLog("error", 0, duration, code, bizExtra);

    const res = responseOverride || NextResponse.json(
      { success: false, error: errMessage || "Internal server error" },
      { status: code }
    );
    res.headers.set("x-trace-id", this.traceId);
    return res;
  }

  /**
   * Internal logger formatting to output standard compact JSON console logs.
   */
  private writeLog(
    level: "info" | "warn" | "error",
    successStatus: number,
    duration: number,
    statusCode: number,
    bizExtra?: Record<string, any>
  ) {
    // Extract client IP address safely
    const ip =
      this.req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      this.req.headers.get("x-real-ip") ||
      "127.0.0.1";

    // Standardize Course / Active Course as user's primary context/tenant ID (cid)
    let cid: string | undefined = undefined;
    if (this.auth) {
      if (this.auth.courseId) {
        cid = String(this.auth.courseId);
      } else if (this.auth.activeCourseId && this.auth.activeCourseId !== "all") {
        cid = String(this.auth.activeCourseId);
      }
    }

    const log: AuditLogSchema = {
      ts: new Date().toISOString(),
      lvl: level,
      tid: this.traceId,
      env: process.env.NODE_ENV === "production" ? "prod" : "dev",
      evt: {
        act: this.metadata.action,
        cat: this.metadata.category,
        s: successStatus,
        dur: duration,
      },
      usr: {
        uid: this.auth?.userId ? String(this.auth.userId) : undefined,
        rl: this.auth?.activeRole || "guest",
        cid: cid,
      },
      req: {
        m: this.req.method,
        p: this.req.nextUrl.pathname,
        code: statusCode,
        ip: ip,
      },
      biz: {
        sum: this.metadata.summary,
        did: this.metadata.divisionId || this.auth?.divisionId ? String(this.metadata.divisionId || this.auth?.divisionId) : undefined,
        what: this.metadata.entityType,
        eid: this.metadata.entityId ? String(this.metadata.entityId) : undefined,
        ...bizExtra,
      },
    };

    // Remove undefined fields for ultimate payload compactness
    const cleanLog = JSON.parse(JSON.stringify(log));

    // Internal output targeting console.log (Axiom/Vercel standard)
    console.log(JSON.stringify(cleanLog));
  }
}

/**
 * Reusable Entry Point for ERP Audit Logging.
 */
export class AuditLogger {
  /**
   * Initializes and starts auditing for a single request.
   */
  static start(
    req: NextRequest,
    auth: AuthContext | null,
    metadata: {
      action: string;
      category: string;
      summary: string;
      entityType?: string;
      entityId?: number;
      divisionId?: number;
    }
  ): AuditTracker {
    return new AuditTracker(req, auth, metadata);
  }
}
