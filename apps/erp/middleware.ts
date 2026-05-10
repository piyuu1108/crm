import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/app/lib/auth";
import { redis } from "@/app/lib/redis";
import { Ratelimit } from "@upstash/ratelimit";

const loginRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "1 m"), // 10 requests per minute
  analytics: true,
  prefix: "ratelimit:login",
});

const apiRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, "1 m"), // 100 requests per minute
  analytics: true,
  prefix: "ratelimit:api",
});

// Define public paths that bypass authentication
const PUBLIC_PATHS = [
  "/api/auth/login",
  "/api/set-password",
  "/auth/login",
  "/set-password",
  "/api/integration/timetable/publish"
];

// Role priority for default selection (same as dashboard API)
const ROLE_PRIORITY = ["hod", "counselor", "faculty", "student"] as const;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = request.headers.get("x-forwarded-for") || "127.0.0.1";

  // --- 1. Edge Rate Limiting via Upstash Redis ---
  if (pathname.startsWith("/api/")) {
    try {
      let limitResult;
      if (pathname === "/api/auth/login") {
        limitResult = await loginRateLimit.limit(ip);
      } else {
        limitResult = await apiRateLimit.limit(ip);
      }

      if (!limitResult.success) {
        return NextResponse.json(
          { success: false, error: "Too many requests. Please try again later." },
          { status: 429 }
        );
      }
    } catch (error) {
      // Fail-open for availability: auth/API should still work if Redis is down.
      console.error("[middleware] Rate limit unavailable, skipping:", error);
    }
  }

  // --- Bypass Auth for Public Paths ---
  if (PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(path + "/"))) {
    return NextResponse.next();
  }

  // --- Bypass Auth for Root or Public Assets (Temporary, can be adjusted based on needs) ---
  if (pathname === "/") {
    return NextResponse.next();
  }

  // --- 2. Edge JWT Verification ---
  const token = request.cookies.get("auth_token")?.value;

  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Missing token" },
        { status: 401 }
      );
    }
    // Redirect unauthenticated UI requests to login
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  const payload = await verifyToken(token);

  if (!payload) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Invalid or expired token" },
        { status: 401 }
      );
    }
    // Redirect unauthenticated UI requests to login (e.g., token expired)
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  // --- 3. Header Injection for Downstream API RBAC ---
  // We inject the validated identity so API routes do not have to parse the JWT again
  // unless they need strict re-verification per AGENTS.md
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-id", payload.userId.toString());
  requestHeaders.set("x-user-roles", JSON.stringify(payload.roles));
  if (payload.facultyCode) {
    requestHeaders.set("x-faculty-code", payload.facultyCode);
  }

  // --- 4. Active Role Injection from Cookie ---
  // Read the active_role cookie (set by client on role switch).
  // Validate it against JWT roles — never trust frontend blindly.
  const activeRoleCookie = request.cookies.get("active_role")?.value;
  const rolesArray = Array.isArray(payload.roles) ? payload.roles : [];

  let resolvedRole: string;

  if (activeRoleCookie && rolesArray.includes(activeRoleCookie)) {
    // Cookie role is valid
    resolvedRole = activeRoleCookie;
  } else {
    // Fallback: pick by priority order (same as dashboard API)
    resolvedRole =
      ROLE_PRIORITY.find((r) => rolesArray.includes(r)) ?? rolesArray[0] ?? "";
  }

  if (resolvedRole) {
    requestHeaders.set("x-active-role", resolvedRole);
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

// Ensure middleware runs on appropriate paths
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, favicon.svg (favicon files)
     * - images, fonts in public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|favicon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
