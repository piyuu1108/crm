# ENTERPRISE ARCHITECTURE & INTEGRATION REPORT
**Target System:** IMS / Academic Timetable Planning Module  
**Objective:** Evaluation for integration with a Core Academic ERP  

---

## 1. SYSTEM OVERVIEW

**Architectural Identity:**  
This system is a **Domain-Specific Planning Module / Hybrid Monolith**. It is *not* a full-scale ERP. Architecturally, it behaves as an isolated scheduling engine that has accidentally assumed ownership of master data (Faculty, Subjects, Courses) to function standalone. 

**Responsibility Boundaries:**  
The system's core competency lies in complex workload constraint validation (Assignment Matrix) and offline-first scheduling (Timetable Builder using `localStorage`). It is strictly a "Drafting and Validation" environment. In an enterprise ecosystem, this system should be treated as a **micro-frontend/service module** that receives master data from an external HR/Academic core and returns a compiled scheduling artifact.

---

## 2. DATABASE ANALYSIS

The database utilizes PostgreSQL managed via Drizzle ORM. 

### Schema Deep Dive & Risks
*   **Highly Normalized but Tightly Coupled:** The schema relies heavily on hard foreign-key constraints with `ON DELETE CASCADE` (e.g., `timetables -> assignments`, `assignments -> faculty`). While this prevents orphans locally, **this is a catastrophic risk for ERP integration.** If the Core ERP signals that a Faculty member has left (triggering a delete in this DB), the cascade will instantly destroy all historical timetables and assignments tied to them. 
*   **Entity Ownership Mismatch:** Currently, this system acts as the Source-of-Truth (SoT) for `courses`, `classes`, `specializations`, `faculty`, and `subjects`. In an integration, these are **Imported/Derived Entities**. The only true SoT entities this system should own are `assignments`, `timetables`, and `lab_sessions`.
*   **Temporal Danger:** The database defines entities as *Operational* (current state) rather than *Temporal*. See Section 8 for the severe implications of this.

**Tight Coupling Chains:**  
`courses` → `specializations` → `classes` → `assignments` → `timetables`  
Deleting a single course wipes the entire dependency tree.

---

## 3. IDENTITY & ENTITY MAPPING ANALYSIS

### Identity Strategy Weaknesses
The database heavily uses `serial` (incremental integer) surrogate keys for all primary relationships (`subjectId`, `facultyId`, `classId`). Only `admins.id` uses UUIDs.

**Integration Blocking Risk:**  
Raw `serial` IDs are strictly local to this Postgres instance and are **unsafe for cross-system integration**. An external ERP operates on its own IDs. If the ERP sends a payload referencing `faculty ID 1024`, it will collide or fail here.

### Cross-System Mapping Strategy
You must utilize the enforced **Natural/Business Keys** currently present in the schema to act as the integration layer identifiers:
*   **Faculty:** Map via `faculty.code` (e.g., "F-101" / Employee ID).
*   **Subjects:** Map via `subjects.code` (e.g., "CS-501").
*   **Courses:** Map via `courses.name` (e.g., "BCA").
*   **Classes:** Map via `classes.name` (which the system auto-generates deterministically: `24BCACS1`).

*Recommendation:* Do NOT replace internal surrogate keys (`serial`). Instead, the integration API layer must perform a lookup translating incoming external business keys (`faculty.code`) into internal `serial` IDs before writing to the database.

---

## 4. API & SERVICE ANALYSIS

### API Architecture
The system exposes Next.js Route Handlers (`src/app/api/*`). The controllers are thin, delegating database operations to a dedicated Service layer (`src/lib/services/*`). DTO validation is strictly enforced using Zod (`src/lib/validators.ts`), which safely rejects malformed payloads.

### Server-to-Server Readiness
**Status: Unsuitable in current state.**
All data-mutating APIs are locked behind a cookie-based JWT session check (`const admin = await getCurrentAdmin();`). There is zero support for headless server-to-server communication. 

**API Capability Profile:**
*   **Internal Microservice:** Capable, provided auth is refactored.
*   **Synchronization Service:** Excellent. The `/api/timetable/generation-data` endpoint already acts as a massive aggregator, proving the backend can compile complex state efficiently.

---

## 5. AUTHENTICATION & SECURITY ANALYSIS

### Current Trust Model
*   **Mechanism:** Encrypted JWT stored in HTTP-only, SameSite=Lax cookies (`manage-session`).
*   **RBAC Presence:** The schema defines an `admin_role` enum (`HOD`, `Principal`, `VicePrincipal`), but **authorization boundaries are not enforced in the API**. Currently, *any* authenticated admin can hit `DELETE /api/assignments`. 
*   **Frontend/Backend Trust:** Secure. The backend does not trust frontend calculations, relying on Zod and Drizzle.

### Minimal Required Hardening for Integration
To allow the Core ERP to inject master data (e.g., updated Faculty lists):
1.  **Service Tokens:** Implement a middleware bypassing cookie checks if a valid `x-api-key` or HMAC-signed payload is present in the headers.
2.  **Network Segmentation:** Restrict the new ingestion APIs to accept traffic only from the internal VPC/Subnet of the Core ERP.

---

## 6. INTEGRATION STRATEGY ANALYSIS

| Strategy | Viability | Risks & Scaling Limits | Maintainability |
| :--- | :--- | :--- | :--- |
| **A. Shared Database** | **Reject** | Severe schema lock-in. Cross-team migrations will break constraints. | Very Poor |
| **B. JSON Export/Import** | **Low** | Requires human intervention. Prone to desync and validation errors. | Poor |
| **C. ERP pushing via internal APIs** | **High** | Requires exposing secure ingestion endpoints. Fast, deterministic sync. | Good |
| **D. Periodic Sync Jobs** | **High** | slight data latency. Requires building a cron-worker to pull ERP views. | Excellent |
| **E. Event-driven (Kafka)** | **Medium** | Overkill for academic scheduling which changes rarely (twice a year). | Complex |

**Rankings for this specific codebase:**
1.  **Best for MVP & Easiest to Maintain:** *C. ERP pushing via internal APIs.* (Core ERP hits an `upsert` webhook on this system when faculty/subjects change).
2.  **Safest / Most Scalable Long-Term:** *D. Periodic Sync Jobs.* (This system pulls a materialized view from the ERP nightly to update local tables).

---

## 7. SCALABILITY ANALYSIS

*   **Timetable Generation Scalability:** Excellent. The heavy lifting of timetable drafting and conflict resolution is offloaded entirely to the client's browser (React + `localStorage`). The server only handles the final atomic `POST /save` transaction.
*   **DB Contention Risks:** Very low. The system uses batch processing for heavy loads.
*   **API Scalability:** Next.js Route handlers are stateless (JWTs). Horizontal scaling behind a load balancer will work immediately without sticky sessions.
*   **The Monolith Pressure Point:** The system currently pulls all classes and assignments into memory for matrix calculations. For a university with 50,000 students and 5,000 subjects, the `getAssignmentMatrix` and `getGenerationData` services will suffer massive latency and memory spikes.

---

## 8. TEMPORAL / ACADEMIC SESSION ANALYSIS

**CRITICAL ARCHITECTURAL DEBT DETECTED**

The database lacks any concept of an `Academic Session` or `Year` (e.g., "2026-2027"). 
*   `timetables` and `assignments` are bound directly to `classId` and `subjectId`.
*   If a class progresses from Semester 1 to Semester 2, and an admin updates the class record, **the system will instantly corrupt or invalidate all historical assignments and timetables** for that class.

**Consequences:**
The current architecture **cannot support multi-year operations safely**. It operates as a disposable, single-semester scratchpad. 

**Required Fix:**
Before integrating with an ERP, you must introduce a `session_id` into `assignments`, `timetables`, and `classes`. The ERP must pass down the active Session Context, and all operations must be scoped to it to preserve historical immutable schedules.

---

## 9. RECOMMENDED TARGET ARCHITECTURE

### The "Planning Engine" Pattern
**Source-of-Truth Ownership:**
*   **Core ERP owns:** Faculty, Subjects, Courses, Students.
*   **Timetable System owns:** Assignment Matrix workloads, Timetable Grids, Lab configs.

**Synchronization Direction:**
1.  **Downstream Sync (Nightly/Webhook):** Core ERP pushes Master Data updates to the Timetable System. The Timetable System upserts its local derivative tables using Business Keys (`faculty.code`).
2.  **Upstream Publish (On-Demand):** When an HOD finalizes a timetable, they click "Publish". The Timetable System fires a webhook to the Core ERP with the compiled schedule JSON. The Core ERP saves this to its own database for student portal rendering.

---

## 10. MIGRATION / REFACTOR PLAN

### 🚨 MUST FIX NOW (Blockers for Integration)
1.  **Academic Sessions:** Add `academic_year_id` or `session_id` to `assignments` and `timetables`. Make the UI scope all queries to the active session.
2.  **API Auth Gateway:** Create an `/api/integration/*` route namespace protected by an `x-api-key` header to allow the external ERP to push updates without a browser cookie.
3.  **Soft Deletes on Master Data:** Remove `ON DELETE CASCADE` from `courses`, `faculty`, and `subjects`. If a faculty member leaves, mark them `is_active = false` so historical timetables are not deleted.

### ⚠️ SHOULD FIX LATER (Scalability)
1.  **Implement RBAC Middleware:** Enforce the existing `adminRoleEnum` so only `HOD`s can modify assignments, while `Principal` gets read-only dashboards.
2.  **Pagination/Filtering:** The matrix endpoints currently load entire courses into memory. Add pagination limits.

### 💡 OPTIONAL IMPROVEMENTS
1.  **Audit Logs:** Implement an `audit_logs` table tracking who modified which assignment and when, crucial for enterprise compliance.
