# LabSense Agent API Reference

Base URL: `http://192.168.1.50:1108`

All endpoints return JSON. All agent routes support permissive CORS (any origin).

---

## 1. Student Login

Authenticates a student, registers the machine if new, and creates an active session.

```
POST /api/agent/login
Content-Type: application/json
```

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `collegeId` | `string` | ✅ | Student college ID |
| `password` | `string` | ✅ | Plaintext password (verified via Argon2) |
| `hardwareId` | `string` | ✅ | Unique hardware fingerprint of the machine |
| `pcName` | `string` | ✅ | Windows computer name |
| `labName` | `string` | ❌ | Optional lab grouping label |

### YSe Same collegeid and password, its already inside server db
```json
{
  "collegeId": "24BCADS135",
  "password": "pass@123",
  "hardwareId": "HW-ABC-DEF-123",
  "pcName": "LAB3-168",
  "labName": "LAB3"
}
```

### Success Response — `200 OK`

| Field | Type | Description |
|-------|------|-------------|
| `sessionId` | `string (UUID)` | Unique session identifier — use this for sync and logout |
| `syncIntervalSeconds` | `number` | How often the agent should sync (seconds) |
| `syncJitterSeconds` | `number` | Max random jitter to add to sync interval (seconds) |
| `timeoutSeconds` | `number` | Server will auto-timeout session after this many seconds of no sync |
| `idleThreshold` | `number` | Time after which the agent is considered idle (seconds) |

```json
{
  "sessionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "syncIntervalSeconds": 30,
  "syncJitterSeconds": 30,
  "timeoutSeconds": 120,
  "idleThreshold": 30
}
```

### Error Responses

| Status | Condition | Body |
|--------|-----------|------|
| `400` | Missing/malformed fields | `{ "error": "collegeId is required and must be a non-empty string" }` |
| `401` | Wrong student ID or password | `{ "error": "Invalid student ID or password" }` |
| `403` | Account deactivated | `{ "error": "Account is inactive" }` |

### cURL Example

```bash
curl -X POST http://localhost:5173/api/agent/login \
  -H "Content-Type: application/json" \
  -d '{
    "collegeId": "24bcads135",
    "password": "pass@123",
    "hardwareId": "HW-ABC-DEF-123",
    "pcName": "LAB1-PC05",
    "labName": "Lab A"
  }'
```

### PowerShell Example

```powershell
$body = @{
    collegeId  = "24bcads135"
    password   = "pass@123"
    hardwareId = "HW-ABC-DEF-123"
    pcName     = "LAB1-PC05"
    labName    = "Lab A"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5173/api/agent/login" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body
```

---

## 2. Session Sync

Periodic heartbeat from the agent. Sends cumulative session and application usage data.

```
PATCH /api/sessions/:id
Content-Type: application/json
```

### URL Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `string (UUID)` | Session ID returned from login |

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `totalSeconds` | `integer ≥ 0` | ✅ | Total session duration so far |
| `activeSeconds` | `integer ≥ 0` | ✅ | Total active usage time so far |
| `idleSeconds` | `integer ≥ 0` | ✅ | Total idle time so far |
| `applications` | `AppUsage[]` | ✅ | Per-application usage summaries (can be empty array) |

#### AppUsage Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `appName` | `string` | ✅ | Application executable name (e.g. `"chrome.exe"`) |
| `totalSeconds` | `integer ≥ 0` | ✅ | Total focused duration for this app |
| `activeSeconds` | `integer ≥ 0` | ✅ | Active usage duration for this app |
| `idleSeconds` | `integer ≥ 0` | ✅ | Idle duration while this app was focused |

> **Note:** All duration values are **cumulative totals**, not deltas. The server overwrites the stored values with the latest sync payload.

```json
{
  "totalSeconds": 600,
  "activeSeconds": 480,
  "idleSeconds": 120,
  "applications": [
    {
      "appName": "chrome.exe",
      "totalSeconds": 300,
      "activeSeconds": 250,
      "idleSeconds": 50
    },
    {
      "appName": "code.exe",
      "totalSeconds": 200,
      "activeSeconds": 180,
      "idleSeconds": 20
    }
  ]
}
```

### Success Response — `200 OK`

```json
{
  "success": true
}
```

### Error Responses

| Status | Condition | Body |
|--------|-----------|------|
| `400` | Invalid UUID format | `{ "error": "Invalid session ID format" }` |
| `400` | Invalid/missing fields or negative durations | `{ "error": "totalSeconds must be a non-negative integer" }` |
| `404` | Session ID not found | `{ "error": "Session not found" }` |
| `409` | Session already completed | `{ "error": "Session is already completed" }` |

### cURL Example

```bash
SESSION_ID="a1b2c3d4-e5f6-7890-abcd-ef1234567890"

curl -X PATCH "http://localhost:5173/api/sessions/${SESSION_ID}" \
  -H "Content-Type: application/json" \
  -d '{
    "totalSeconds": 600,
    "activeSeconds": 480,
    "idleSeconds": 120,
    "applications": [
      {
        "appName": "chrome.exe",
        "totalSeconds": 300,
        "activeSeconds": 250,
        "idleSeconds": 50
      }
    ]
  }'
```

### PowerShell Example

```powershell
$sessionId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"

$body = @{
    totalSeconds  = 600
    activeSeconds = 480
    idleSeconds   = 120
    applications  = @(
        @{
            appName       = "chrome.exe"
            totalSeconds  = 300
            activeSeconds = 250
            idleSeconds   = 50
        }
    )
} | ConvertTo-Json -Depth 3

Invoke-RestMethod -Uri "http://localhost:5173/api/sessions/$sessionId" `
    -Method PATCH `
    -ContentType "application/json" `
    -Body $body
```

---

## 3. Session Logout

Ends a session normally. The agent should call this when the student logs out.

```
POST /api/sessions/:id/logout
```

### URL Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `string (UUID)` | Session ID returned from login |

### Request Body

None required. No body needed.

### Success Response — `200 OK`

```json
{
  "success": true
}
```

### Error Responses

| Status | Condition | Body |
|--------|-----------|------|
| `400` | Invalid UUID format | `{ "error": "Invalid session ID format" }` |
| `404` | Session ID not found | `{ "error": "Session not found" }` |
| `409` | Session already completed (duplicate logout) | `{ "error": "Session is already completed" }` |

### cURL Example

```bash
SESSION_ID="a1b2c3d4-e5f6-7890-abcd-ef1234567890"

curl -X POST "http://localhost:5173/api/sessions/${SESSION_ID}/logout"
```

### PowerShell Example

```powershell
$sessionId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"

Invoke-RestMethod -Uri "http://localhost:5173/api/sessions/$sessionId/logout" `
    -Method POST
```

---

## 4. Automatic Session Timeout

> This is **not an API endpoint** — it is server-side behavior.

The server runs a background sweeper every **30 seconds**. If any active session has not synced within the configured `timeout_seconds` threshold:

- `status` → `completed`
- `end_reason` → `timeout`
- `logout_at` → server timestamp

The timeout threshold is read from the `system_settings` table on each sweep, so admin changes take effect immediately without a restart.

**Default timeout:** 120 seconds (2 minutes)

---

## CORS

All `/api/agent/*` and `/api/sessions/*` routes include permissive CORS headers:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PATCH, OPTIONS
Access-Control-Allow-Headers: Content-Type
Access-Control-Max-Age: 86400
```

Every endpoint also handles `OPTIONS` preflight requests with a `204 No Content` response.

---

## TypeScript Types

These are the exact types used server-side. Agent implementations should match these shapes.

```typescript
// POST /api/agent/login — request body
interface LoginPayload {
  studentId: string;
  password: string;
  hardwareId: string;
  pcName: string;
  labName?: string;
}

// POST /api/agent/login — response body
interface LoginResponse {
  sessionId: string;
  syncIntervalSeconds: number;
  syncJitterSeconds: number;
  timeoutSeconds: number;
}

// PATCH /api/sessions/:id — request body
interface SyncPayload {
  totalSeconds: number;
  activeSeconds: number;
  idleSeconds: number;
  applications: AppUsagePayload[];
}

interface AppUsagePayload {
  appName: string;
  totalSeconds: number;
  activeSeconds: number;
  idleSeconds: number;
}

// Success response (sync + logout)
interface SuccessResponse {
  success: true;
}

// Error response (all endpoints)
interface ErrorResponse {
  error: string;
}
```

---

## Agent Workflow

```
┌─────────────────┐
│  Agent Starts    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     401/403
│  POST /login    │────────────▶ Show error, retry
└────────┬────────┘
         │ 200 OK
         │ { sessionId, syncIntervalSeconds, ... }
         ▼
┌─────────────────────────────┐
│  Sync Loop                  │
│                             │
│  Every (interval + jitter): │
│    PATCH /sessions/:id      │◀──┐
│                             │   │
│    200 → continue           │───┘
│    409 → session ended      │
│    404 → session lost       │
└────────┬────────────────────┘
         │ User logs out
         ▼
┌─────────────────┐
│  POST /logout   │
└────────┬────────┘
         │ 200 OK
         ▼
┌─────────────────┐
│  Agent Exits    │
└─────────────────┘

If agent crashes or disconnects:
  → Server auto-timeouts after timeout_seconds
```

---

## System Settings

The `system_settings` table stores runtime-configurable values:

| Setting | Default | Description |
|---------|---------|-------------|
| `sync_interval_seconds` | `30` | Base sync interval returned to agents |
| `sync_jitter_seconds` | `30` | Max random jitter agents should add |
| `timeout_seconds` | `120` | Seconds of no sync before auto-timeout |

These values are returned in the login response and read by the timeout sweeper on each tick. Changing them in the database takes immediate effect.
