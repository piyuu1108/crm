# Integration Architecture Report: ERP & IMS

## Executive Summary
This document provides a comprehensive architectural analysis and integration strategy for uniting two distinct applications within the monorepo:
1. **ERP**: The master academic gateway, source of historical truth, and RBAC orchestrator.
2. **IMS**: The internal planning engine, isolated sandbox for academic allocation, and timetable generation constraint solver.

Given that both systems leverage PostgreSQL, Drizzle ORM, and utilize standardized business keys (`facultyCode`, `subjectCode`, `classCode`), this report outlines multiple pathways to achieve seamless synchronization without compromising system integrity or temporal safety.

---

## 1. SYSTEM RESPONSIBILITY ANALYSIS

To prevent "distributed monolith" anti-patterns, bounded contexts must be strictly enforced.

### ERP Ownership (Master System of Record)
* **Identity & Access Management**: Passwords, RBAC, Roles, and JWTs.
* **Core Reference Data**: Master Faculty Profiles, Student Profiles, Courses, and Subjects.
* **Academic Lifecycle**: Semesters (start/end dates), Division rollouts, Promotions.
* **Historical Data**: Published Timetables (`timetableEntries`), Finalized Assignments, Attendance, Marks.

### IMS Ownership (Planning & Optimization Sandbox)
* **Planning Workspace**: Draft timetables, optimization algorithms, constraint logic.
* **Transient Planning Data**: Draft faculty allocations, draft subject distributions.
* **Spatial Data**: Physical room allocations, lab capacity, temporary lab sessions.
* **Local Reference Snapshots**: IMS should only hold *immutable snapshots* of Faculty and Subjects required for the *current planning session*.

### Key Design Principle: "Session-Based Immutability"
IMS should **not** maintain historical data across semesters. It is a mathematical engine. It requires inputs (Faculty, Subjects, Classes for Semester X), performs optimization, and produces outputs (Timetables). Once the output is published back to the ERP, the IMS workspace can theoretically be wiped clean for the next semester.

---

## 2. POSSIBLE INTEGRATION STRATEGIES

### A. Manual JSON Import/Export (The Air-Gapped Approach)
* **Architecture**: No direct network/DB connection. ERP exports a predefined JSON of active Faculty/Subjects/Classes. IMS imports it. HOD generates timetable, exports JSON, imports to ERP.
* **Temporal Safety**: 100% safe. The JSON acts as a perfect temporal snapshot.
* **Source of Truth**: Enforced perfectly by human boundary.
* **Scaling/Risks**: Zero scaling issues, zero network failure modes. High risk of human error (uploading wrong/stale files).
* **DevEx**: Cumbersome for users, zero maintenance for devs.

### B. ERP → IMS Push APIs (The "Webhooks" Approach)
* **Architecture**: ERP pushes updates (`POST /internal-api/sync`) to IMS whenever a relevant entity (Faculty/Subject) is created or modified. 
* **Data Flow**: Event occurs in ERP -> ERP fires HTTP request to IMS -> IMS updates local DB.
* **Temporal Safety**: Moderate. Mid-session changes in ERP (e.g., faculty resigns) immediately corrupt/affect the ongoing IMS planning session if not handled via versioning.
* **Risks**: Network timeouts, partial syncs, split-brain if push fails.

### C. ERP Pulls IMS APIs (The "Gateway" Approach)
* **Architecture**: ERP acts as the sole API gateway. IMS has no DB of its own for master data; instead, it queries ERP over the network for Faculty/Subjects on-the-fly.
* **Data Flow**: IMS `GET /api/internal/faculty` from ERP. 
* **Risks**: IMS is highly coupled to ERP's uptime. High latency for algorithm runs if data is fetched over HTTP.

### D. Shared Database Schema (The "Monolith DB" Approach)
* **Architecture**: Both apps use the exact same Postgres Database. ERP uses the `public` schema, IMS uses the `ims` schema.
* **Data Flow**: IMS runs cross-schema queries (`SELECT * FROM public.faculty`).
* **Source of Truth**: ERP owns the tables; IMS has read-only DB user access to `public`.
* **Risks**: High DB-level coupling. A migration in ERP breaks IMS queries. Temporal safety is violated because IMS always sees the "live" ERP data, ruining historical or static planning sessions.

### E. Event-Driven Architecture (Kafka / RabbitMQ / Redis PubSub)
* **Architecture**: ERP emits domain events (`FacultyCreated`, `SubjectUpdated`). IMS consumes them and updates its own read-models.
* **Temporal Safety**: Excellent. Decoupled and eventually consistent.
* **Risks**: Massive overengineering for an academic timetable app. High operational overhead.

### F. IMS Embedded Inside ERP (The "Module" Approach)
* **Architecture**: IMS is refactored from a standalone app into an internal Next.js module within the ERP app.
* **Data Flow**: Shares the exact same Drizzle instance and runtime.
* **Risks**: Dilutes the bounded contexts. ERP becomes bloated.

### G. Session-Based Snapshot Replication (The "Enterprise Sandbox" Approach) 🥇
* **Architecture**: When a new semester is initiated in ERP, the ERP orchestrates a "Session Init" API call to IMS. It sends the *exact* subset of active Faculty, Subjects, and Divisions for that specific Semester. IMS stores this locally. IMS generates the timetable. Once approved, IMS exposes a "Publish" API. ERP calls this API, ingests the resulting timetable, and saves it into `timetable_entries` attached to the `semester_id`.
* **Temporal Safety**: Flawless. Mid-semester master data changes in ERP do not break the IMS draft unless explicitly re-synced.
* **Ownership**: Clean boundaries. ERP owns history; IMS owns the active sandbox.
* **DevEx**: Highly predictable, stateless integration.

---

## 3. TEMPORAL / SESSION SAFETY ANALYSIS

Academic systems are highly temporal. A timetable generated in 2024 must remain identical in 2026, even if a Faculty's name changes or a Subject's credit changes.

**Current State**: 
- ERP uses `semesters` and `divisions` linked tightly to batch years.
- ERP handles history gracefully by copying names/codes into transaction tables (e.g., `timetableEntries` has `facultyName`, `subjectName` explicitly duplicated for safety).
- IMS uses generic `classes` (year, semester) with no strict temporal isolation.

**Recommendation**:
IMS should operate strictly on a **"Current Planning Session"** model.
1. ERP sends payload: `{ sessionId: "SEM_5", faculty: [...], subjects: [...] }`.
2. IMS clears its previous draft constraints and populates its local tables with this fresh data.
3. IMS generates the timetable.
4. ERP pulls the finalized timetable and stores it in `timetableEntries` along with the immutable snapshot strings (`facultyName`, `courseCode`, etc.).
5. IMS does **not** need to preserve historical timetables. ERP handles that.

---

## 4. AUTHENTICATION & SECURITY ANALYSIS

**Current State**: ERP has RBAC (`roles` table). IMS has independent `admins` table.

**Recommendation**:
* **Frontend boundary**: The frontend ONLY communicates with ERP. 
* **Backend boundary**: ERP acts as an API Gateway. When a Principal needs to access the IMS planning UI, ERP verifies RBAC and proxies the request or generates a short-lived internal JWT for IMS.
* **Service-to-Service (S2S)**: ERP and IMS communicate via a Private Network (e.g., Docker bridge network, VPC internal IP). They use an internal `X-API-Shared-Secret` or internal JWT to authenticate. IMS drops its own `admins` table and trusts the `x-user-role: Principal` header passed down by the ERP API Gateway.

---

## 5. DATABASE & IDENTITY ANALYSIS

**Current State**: 
- ERP uses `serial` IDs heavily. 
- IMS uses `serial` IDs and some `uuid`.
- Both heavily use Business Keys (`facultyCode`, `subjectCode`, `classCode`).

**Recommendation**:
NEVER use internal `serial` IDs across the application boundary. 
If ERP says Faculty ID `45` is "John", IMS might have Faculty ID `45` as "Jane".
* **Integration Contract**: All cross-system communication MUST use Business Keys.
* When ERP sends data to IMS, it matches on `facultyCode`.
* When IMS sends the timetable back to ERP, it says `[facultyCode: "FAC101", subjectCode: "CS101", classCode: "DIV-A"]`. ERP resolves these codes back to its internal `serial` IDs before inserting into `timetableEntries`.

---

## 6. MONOREPO & SHARED PACKAGE ANALYSIS

Since both exist in a monorepo, you have powerful code-sharing capabilities without runtime coupling.

**What to Share (`packages/shared`)**:
* **DTOs & Zod Schemas**: The exact payload structure of the `SyncSessionRequest` and `PublishTimetableResponse`.
* **Business Enums**: `subjectTypeEnum` (Theory, Practical, Both).
* **Constants**: Academic limits, max duration slots.
* **TypeScript Interfaces**: `FacultySnapshot`, `SubjectSnapshot`.

**What NEVER to Share**:
* **Drizzle Schemas**: Do not share the schema files. They represent different bounded contexts. ERP's `Faculty` has 30 columns (blood group, address). IMS's `Faculty` needs 2 columns (code, name). Let them be decoupled.
* **Database Connections**: Separate connection strings.

---

## 7. RECOMMENDED TARGET ARCHITECTURES

### 🥉 MVP Architecture: "Manual Sync & Push"
* **Flow**: Admin logs into IMS, clicks "Sync from ERP". IMS calls ERP's internal API `GET /api/internal/master-data`. IMS populates its DB. HOD plans timetable. Admin clicks "Publish to ERP". IMS calls ERP's `POST /api/internal/ingest-timetable`.
* **Pros**: Easy to build, decoupled DBs, immediate value.
* **Cons**: Requires manual admin intervention to trigger syncs.

### 🥈 Medium-Scale Architecture: "Session-Based Replication Gateway"
* **Flow**: ERP acts as an API Gateway. HOD accesses ERP frontend. ERP proxies `/api/planning/*` to IMS. When HOD creates a new Semester in ERP, ERP automatically pushes a `SessionSync` payload to IMS. IMS generates the timetable. ERP automatically pulls the drafted timetable for display, and upon HOD approval, locks it into the ERP DB.
* **Pros**: Seamless UX (single frontend). Excellent temporal safety. Clean DB separation.
* **Cons**: Requires configuring Next.js proxy/rewrites in ERP.

### 🥇 Long-Term Enterprise Architecture: "Event-Carried State Transfer + Gateway"
* **Flow**: ERP emits events on an internal message bus (Redis PubSub or lightweight BullMQ). IMS listens for `SemesterInitiated` and pulls data. IMS computes timetables asynchronously via worker queues. ERP acts as an API gateway for all UI interaction. S2S authentication uses internal JWTs.
* **Pros**: Ultimate scalability, zero HTTP blocking, perfect domain isolation.
* **Cons**: Infrastructure overhead.

---

## 8. MIGRATION ROADMAP

### Phase 1: MUST DO NOW (Lowest Risk, Highest Yield)
1. **Unify Business Keys**: Ensure `facultyCode`, `subjectCode`, and `courseCode` perfectly align between both DBs. Write a one-off script to sync existing records.
2. **Implement DTO Package**: Create `packages/contracts` containing Zod schemas for the Timetable Payload.
3. **Build the Export/Ingest APIs**: 
   - ERP: `POST /api/internal/ingest-timetable` (receives JSON with business keys, inserts to `timetableEntries`).
   - IMS: `GET /api/internal/export-timetable` (generates the standard JSON).
4. **Network Trust**: Implement a basic `x-internal-secret` header for these two endpoints.

### Phase 2: SHOULD DO SOON (Operational Simplification)
1. **Drop IMS Admins**: Refactor IMS to remove the `admins` table. Rely on ERP to handle authentication and pass the user's role via headers (Gateway Proxy pattern).
2. **Automated Session Sync**: Build an ERP endpoint that IMS calls to fetch the "Active Semester Snapshot" (Faculty, Subjects, Classes) so IMS doesn't need manual data entry.
3. **Monorepo Shared Types**: Move Drizzle enums into a shared TS package.

### Phase 3: OPTIONAL FUTURE IMPROVEMENTS
1. **Zero-Trust Internal Network**: Implement mTLS or internal JWT signing between ERP and IMS.
2. **Asynchronous Planning**: Move IMS timetable generation to a background queue, allowing ERP to poll for status.
3. **Historical Purging**: Implement a cron job that drops IMS data for semesters older than 1 year, as ERP is the true system of record.
