import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
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

  // --- 2. Cookie check for authentication ---
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

  return NextResponse.next();
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
