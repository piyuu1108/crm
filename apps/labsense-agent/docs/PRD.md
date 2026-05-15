# Product Requirements Document (PRD)

# LabSense Analytics

---

# 1. Overview

LabSense is a lightweight LAN-based laboratory analytics system designed for institutional computer labs.

The platform tracks:

- student login sessions
- application usage summaries
- active vs idle usage time
- machine activity status

The system operates entirely inside the local network without requiring internet connectivity or external ERP integration.

---

# 2. Objectives

## Primary Objectives

- Provide lightweight lab activity analytics
- Maintain low CPU and RAM usage on student systems
- Store summarized analytics instead of raw telemetry
- Operate reliably within institutional LAN environments
- Keep deployment and maintenance simple for internal lab infrastructure

---

# 3. System Architecture

```
[ Student PCs ]
      ↓
  Rust Agent
      ↓
   Local LAN
      ↓
[ LabSense Server ]
(SvelteKit + PostgreSQL)
      ↓
 Admin Dashboard
```

---

# 4. Technology Stack

| Component | Technology |
| --- | --- |
| Student Agent | Rust |
| Main Server | SvelteKit |
| Runtime | Bun (planned) |
| Database | PostgreSQL |

---

# 5. Functional Requirements

## 5.1 Student Authentication

Students authenticate locally using:

- student ID
- password

Passwords are stored using secure password hashing.

---

## 5.2 Session Tracking

A session starts when:

- student logs in successfully

A session ends when:

- student logs out
    
    OR
    
- the agent stops syncing within the configured timeout duration

Each session stores:

- login time
- logout time
- total session duration
- active usage duration
- idle duration

---

## 5.3 Application Usage Aggregation

The Rust agent tracks:

- active application name
- application usage duration
- active vs idle time while application is focused

The system stores summarized application analytics only.

The system does NOT store:

- keystrokes
- screenshots
- clipboard contents
- raw activity timelines
- file contents

---

## 5.4 Agent Sync Model

The agent periodically sends summarized session data to the server over LAN.

Each sync:

- updates session statistics
- updates application aggregates
- updates machine activity timestamp

If sync stops beyond timeout threshold:

- the session is marked as `timeout`

---

## 5.5 Machine Identification

Each machine is identified using a generated hardware fingerprint.

The fingerprint is used to:

- uniquely identify machines
- associate sessions with physical systems

---

# 6. Database Design

## Table: machines

Stores registered lab computers.

| Column | Type | Notes |
| --- | --- | --- |
| id | UUID PRIMARY KEY | Internal identifier |
| hardware_id | TEXT UNIQUE NOT NULL | Generated hardware fingerprint |
| pc_name | TEXT NOT NULL | Windows computer name |
| lab_name | TEXT NULL | Optional grouping |
| last_seen_at | TIMESTAMPTZ NULL | Last successful sync |
| created_at | TIMESTAMPTZ NOT NULL DEFAULT now() | Record creation timestamp |

---

## Table: students

Stores local student authentication records.

| Column | Type | Notes |
| --- | --- | --- |
| id | TEXT PRIMARY KEY | Student identifier |
| ref_id | TEXT NULL | Optional future external mapping |
| password_hash | TEXT NOT NULL | Secure password hash |
| is_active | BOOLEAN NOT NULL DEFAULT true | Account status |
| created_at | TIMESTAMPTZ NOT NULL DEFAULT now() | Record creation timestamp |

---

## Table: sessions

Stores summarized login session analytics.

One row represents one complete login session.

| Column | Type | Notes |
| --- | --- | --- |
| id | UUID PRIMARY KEY | Session identifier |
| student_id | TEXT NOT NULL REFERENCES students(id) | Logged-in student |
| machine_id | UUID NOT NULL REFERENCES machines(id) | Session machine |
| login_at | TIMESTAMPTZ NOT NULL | Session start timestamp |
| logout_at | TIMESTAMPTZ NULL | Session end timestamp |
| last_sync_at | TIMESTAMPTZ NOT NULL | Last successful sync |
| total_seconds | INTEGER NOT NULL DEFAULT 0 | Total session duration |
| active_seconds | INTEGER NOT NULL DEFAULT 0 | Actual active usage |
| idle_seconds | INTEGER NOT NULL DEFAULT 0 | Idle duration |
| status | TEXT NOT NULL | active / ended / timeout |
| created_at | TIMESTAMPTZ NOT NULL DEFAULT now() | Record creation timestamp |

---

## Table: session_apps

Stores aggregated per-application usage summaries.

This table stores summarized analytics only and does not contain raw event logs.

| Column | Type | Notes |
| --- | --- | --- |
| id | UUID PRIMARY KEY | Record identifier |
| session_id | UUID NOT NULL REFERENCES sessions(id) | Parent session |
| app_name | TEXT NOT NULL | Application executable name |
| total_seconds | INTEGER NOT NULL DEFAULT 0 | Total focused duration |
| active_seconds | INTEGER NOT NULL DEFAULT 0 | Active usage duration |
| idle_seconds | INTEGER NOT NULL DEFAULT 0 | Idle duration while focused |
| updated_at | TIMESTAMPTZ NOT NULL DEFAULT now() | Last update timestamp |

---

# 7. Session Timeout Logic

The server determines active sessions based on the latest successful sync timestamp.

If:

```
current_time - last_sync_at > timeout_threshold
```

then:

- session status becomes `timeout`
- logout timestamp is assigned automatically

---

# 8. API Design

## Create Session

```
POST /api/sessions
```

Creates a new login session.

---

## Session Sync

```
PATCH /api/sessions/:id
```

Updates:

- session aggregates
- application aggregates
- last sync timestamp

---

## Logout Session

```
POST /api/sessions/:id/logout
```

Ends the session normally.

---

# 9. Non-Functional Requirements

## Scalability

The system should support:

- 400+ concurrent lab machines

using summarized sync architecture.

---

## Resource Usage

The student agent should maintain:

- low CPU usage
- low RAM usage
- low network usage

during normal operation.

---

## Privacy

The system only stores summarized application analytics.

The platform does not capture:

- keystrokes
- screenshots
- microphone input
- webcam data
- clipboard contents

---

# 10. Future Considerations (Not MVP)

The following features are intentionally excluded from the current MVP scope:

- ERP integration
- timetable mapping
- lecture tracking
- faculty RBAC
- cloud synchronization
- remote desktop functionality
- screenshot monitoring
- realtime exam mode
- centralized remote deployment
- internet-based synchronization

# 11. Agent Runtime Architecture

The Rust agent maintains active session analytics entirely in memory during runtime.

The agent stores:

- session statistics
- application usage summaries
- active usage duration
- idle duration

using lightweight in-memory data structures.

The agent periodically sends summarized session updates to the server over LAN using the session sync API.

The MVP implementation does not use:

- local databases
- offline persistence
- synchronization queues

The server remains the primary persistent source of truth for all session analytics.

If the agent unexpectedly stops before the next sync interval:

- only the most recent unsynced interval may be lost
- the session is automatically marked as `timeout` by the server after the configured timeout duration

This architecture is intentionally optimized for:

- low memory usage
- low CPU usage
- minimal storage overhead
- simplified deployment
- stable institutional LAN environments 💛