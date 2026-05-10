# ERP API Guide

This document defines the standards and implementation patterns for all API routes in the College ERP system, as specified in [AGENTS.md](/guides/AGENTS.md).

## 📡 Core Standards

### 1. Mandatory Response Format
All API responses must follow this structure. Never return raw database objects or direct arrays.

**Success Response:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Meaningful error message for the user"
}
```

### 2. Authentication Flow
1.  **Edge Layer (Middleware):** Verifies the `auth_token` cookie. Blocks unauthorized requests. Injects `x-user-id` and `x-user-roles` headers.
2.  **API Layer (Route Handler):** Must re-verify the JWT to prevent header spoofing.
3.  **Role Validation:** Routes must check the `X-Active-Role` header against the authorized roles in the JWT.

### 3. Error Handling Pattern
Always use `try/catch` blocks. Log the full error to the server console (will be captured by Axiom) and return a sanitized message to the client.

```typescript
try {
  // logic
} catch (error) {
  console.error("[MODULE_NAME] Description:", error);
  return NextResponse.json(
    { success: false, error: "Generic but helpful message" },
    { status: 500 }
  );
}
```

---

## 🛠️ Global API Endpoints

### `POST /api/auth/login`
Authenticates a user and sets an `HttpOnly` cookie.
- **Rate Limit:** 10 requests per minute.
- **Response:** `{ success: true, data: { user } }`

### `POST /api/auth/logout`
Clears the `auth_token` cookie.
- **Response:** `{ success: true }`

### `GET /api/dashboard`
The primary data source for the dashboard.
- **Header Required:** `X-Active-Role` (optional, defaults to first role in JWT).
- **Behavior:** Returns user info and role-specific dashboard data (KPIs, schedules, requests).

### `GET /api/health`
System connectivity check.
- **Tests:** Database (Neon), Cache (Redis), Storage (S3).
- **Response:** Latency and connection status for each service.

---

## 🏗️ Implementation Guidelines

### Input Validation
Always validate request bodies and query parameters.
- Use **Zod** for schema validation.
- Return `400 Bad Request` if validation fails.

### Database Operations (Drizzle)
- Use the **HTTP driver** for all operations.
- Wrap multi-table inserts in **Transactions**.
- Always use `returning()` for inserts if IDs are needed.

### Pagination (Required for Lists)
All list-based endpoints MUST implement pagination.
- Default limit: 20 items.
- Parameters: `page`, `limit`.
- Response should include `meta: { total, page, limit }`.

---

## 🚫 Prohibited Patterns
- ❌ No `fetch` inside UI components (use TanStack Query hooks).
- ❌ No raw database errors in API responses.
- ❌ No direct TCP database connections.
- ❌ No file handling in the API (use direct-to-S3 client uploads).
- ❌ No business logic inside Middleware (keep it at the Edge).

---
*Last Updated: 2026-04-29*
