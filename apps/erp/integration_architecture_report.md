# Low-Level Architecture & Integration Report

## 1. SYSTEM OVERVIEW

**System Purpose**
This system operates as a specialized **Academic Operations & Scheduling Engine** rather than a full-scale enterprise ERP. It handles faculty scheduling, timetable generation, student attendance tracking, and internal evaluation processing. 

**Architecture Style & Boundaries**
Architecturally, it is a **Hybrid Monolith**. It is tightly coupled to its frontend presentation layer (via Next.js and cookie-based JWT authentication) but models distinct bounded contexts (Academics, Attendance, Examinations) in the database. 

It behaves like a **Service-Oriented Module**. It lacks central ERP capabilities like finance, HR payroll, or deep lifecycle management, implying that it is designed to exist downstream from a larger Master Student Information System (SIS) or HR system.

---

## 2. DATABASE ANALYSIS

**Table Responsibilities & Coupling Level**
The schema heavily employs **denormalization** to optimize read paths. 
*   **Highly Coupled/Denormalized:** Tables like `faculty_subject_assignments`, `timetable_entries`, `attendance_sessions`, and `marks` explicitly duplicate `faculty_name`, `subject_name`, `division_name`, and `course_code`.
*   **Dangerous Update Chains:** Because of this denormalization, changing a faculty member's name or a subject's name in the master tables (`faculty` or `subjects`) will result in stale data unless cascading updates are manually orchestrated across all dependent transactional tables.

**Entity Lifecycles & Types**
*   **Static Entities:** `courses`, `roles`.
*   **Temporal Entities:** `semesters`, `divisions`. These dictate the academic lifecycle.
*   **Snapshot Entities:** `timetable_entries`, `attendance`, `marks`. These represent historical truth and should ideally be immutable once finalized.
*   **Operational Entities:** `students`, `faculty`, `faculty_subject_assignments`.

**Source-of-Truth vs. Imported Data**
*   **Should be Imported/Derived (Managed by Master ERP):** `students` (admission/enrollment), `faculty` (HR onboarding), `courses`.
*   **Should be Source-of-Truth (Managed by this System):** `timetable_entries`, `attendance`, `marks`, `internal_evaluations`.

**Scalability & Migration Risks**
The heavy reliance on auto-incrementing integers (`serial`) across all tables presents a massive risk for multi-master or distributed database integration. Merging databases or syncing partial records will lead to ID collisions.

---

## 3. IDENTITY & ENTITY MAPPING ANALYSIS

**Entity Identifiers & Keys**
The system uses surrogate auto-incrementing integer IDs (`id: serial("id")`) universally. **UUIDs are entirely absent.** 

**VERY IMPORTANT: Integration Risks**
Raw DB IDs (e.g., `facultyId: 42`, `subjectId: 10`) are **unsafe for cross-system integration**. If the upstream ERP sends an update for a faculty member, mapping by internal `id` will fail across environment teardowns or partial syncs.

**Recommended Cross-System Mapping Strategy**
You must enforce **Natural Business Keys** for all cross-system API boundaries:
*   **Students:** Use `enrollment_id`, `spid`, or `abc_id` instead of `studentId`.
*   **Faculty:** Use `faculty_code` instead of `facultyId`.
*   **Subjects:** Use `code` (e.g., `BCA101`) instead of `subjectId`.
*   **Divisions:** Map via a composite key of `batch_year` + `course_code` + `division_no` or use the permanent `display_name` (e.g., "26BCAAIDIV1").

---

## 4. API & SERVICE ANALYSIS

**API Architecture & Trust Boundaries**
The API routes are heavily coupled to the Next.js frontend context. The middleware (`middleware.ts`) relies exclusively on HTTP-only cookies (`auth_token`) for authentication and reads a secondary `active_role` cookie to inject `x-user-id` and `x-active-role` headers for downstream routes.

**Suitability for Server-to-Server Communication**
Currently, the system is **highly unsuitable** for acting as an internal microservice or receiving direct server-to-server webhook events from an external ERP. An external system cannot easily provide the required HTTP cookies. 

**Identified Risks**
*   **Serialization Risks:** Relies heavily on DTOs directly bound to the DB schema.
*   **Trust Boundaries:** The middleware assumes any request with a valid JWT cookie is a user. There is no concept of a "Service Account" or "API Key" for automated, programmatic integrations.

---

## 5. AUTHENTICATION & SECURITY ANALYSIS

**RBAC & Boundaries**
The system implements Role-Based Access Control via `x-user-roles` header injection and a priority fallback mechanism (`["hod", "counselor", "faculty", "student"]`). 

**Minimal Required Hardening for Integration**
To safely integrate an external ERP, you MUST implement:
1.  **Service Tokens / API Keys:** Bypass the cookie requirement for specific protected routes (e.g., `/api/webhooks/erp-sync`) by validating a long-lived Bearer API Key.
2.  **Internal Network Restrictions:** If the ERP pushes data, the ingestion endpoints should strictly whitelist the ERP's IP addresses or VPC CIDR blocks.

---

## 6. INTEGRATION STRATEGY ANALYSIS

| Approach | Advantages | Risks & Disadvantages | Production Suitability |
| :--- | :--- | :--- | :--- |
| **A. Shared Database** | Instant data access, zero API latency. | Catastrophic schema coupling. ID collisions. Breaks microservice boundaries. | **Worst** |
| **B. JSON Export/Import** | Total decoupling. Easy to implement. | Stale data, high operational complexity (manual or cron jobs). | **Low** |
| **C. ERP Calling Internal APIs** | Real-time updates. | Requires major auth refactoring (service tokens). Potential rate-limiting conflicts. | **High** |
| **D. Internal Engine Pushing to ERP** | Shifts load to ERP. | If ERP goes down, queues/retries must be built here. | **Medium** |
| **E. Event-Driven Sync (Kafka/RabbitMQ)** | Asynchronous, highly scalable, zero coupling. | High infrastructure cost. Eventual consistency headaches. | **Best for Long-Term** |
| **F. Periodic Synchronization Jobs** | Predictable load, easy MVP. | Data latency (12-24h). Conflict resolution is difficult. | **Best for MVP** |

**Ranking Strategy:**
*   **Best for MVP:** Periodic Synchronization Jobs (via API).
*   **Best for Long-Term:** Event-Driven Sync (Pub/Sub).
*   **Safest:** ERP Calling Internal APIs (with strict business-key mapping).

---

## 7. SCALABILITY ANALYSIS

**Bottlenecks & Monolith Pressure Points**
*   **DB Contention:** The `attendance` and `attendance_sessions` tables will face severe row-locking contention if thousands of students are marked present simultaneously at 9:00 AM every day.
*   **Historical Data Growth:** `timetable_entries` and `attendance` have no partitioning strategy. Over 4 years, these tables will inflate massively, slowing down current-semester queries.
*   **Coupling Scalability:** Because string names are denormalized everywhere, bulk updates (e.g., a faculty member changing their legal name) will lock massive portions of the database to update `faculty_subject_assignments`, `timetable_entries`, and `attendance_sessions`.

---

## 8. TEMPORAL / ACADEMIC SESSION ANALYSIS

**Academic Year Modeling**
The system correctly implements a `semesters` table with an `isActive` flag. The `divisions` table correctly binds to a `batchYear` and `semesterNo`. 

**Data Corruption Risks**
The `students` table holds `currentSemesterNo` and `currentDivisionId`. When a semester ends, how are students promoted? If `currentDivisionId` is overwritten, the student's historical association with previous divisions is lost unless relying strictly on historical `marks` and `attendance_sessions` tables to derive past context. 

Tables like `timetable_entries` need to be treated as **immutable snapshots** once a semester concludes. If a subject name changes next year, last year's timetable entries should NOT update.

---

## 9. RECOMMENDED TARGET ARCHITECTURE

**Ideal Architecture: The "Academic Execution Node"**
This system should be refactored into a bounded execution node. 

1.  **Source-of-Truth Ownership:** 
    *   **Master ERP:** Owns User Identity, Financials, HR, Master Subject Catalog.
    *   **This System:** Owns Timetable Execution, Day-to-Day Attendance, Internal Assessments.
2.  **Synchronization Direction:**
    *   **Inbound (Master -> Node):** Master ERP publishes `StudentEnrolled`, `FacultyHired`, `CourseCreated` events. This system consumes them and upserts via Business Keys (`spid`, `faculty_code`).
    *   **Outbound (Node -> Master):** This system publishes `AttendanceFinalized`, `MarksFinalized` events for the Master ERP to consume for transcript generation.
3.  **Snapshot Strategy:** Denormalized names (`faculty_name`, `subject_name`) should be explicitly defined as *point-in-time snapshots*, meaning an update to the master entity does NOT cascade to historical records.

---

## 10. MIGRATION / REFACTOR PLAN

**MUST FIX NOW (Critical Path for Integration)**
1.  **Implement API Service Tokens:** Update `middleware.ts` to allow `Bearer <API_KEY>` auth for automated integrations, bypassing cookie checks.
2.  **Enforce Business Keys in DTOs:** All integration endpoints must accept and resolve `faculty_code`, `enrollment_id`, and `course_code`. Do not expose `id: 5` in integration contracts.

**SHOULD FIX LATER (Medium Term)**
1.  **Extract Denormalization Logic:** Centralize the logic that syncs `faculty.name` -> `faculty_subject_assignments.facultyName` into a specific background worker or database trigger, explicitly preventing updates to inactive semesters.
2.  **Promotion History Table:** Add a `student_semester_history` table to track a student's division journey over years, rather than just overwriting `currentDivisionId`.

**OPTIONAL IMPROVEMENTS (Enterprise Scale)**
1.  **UUID Migration:** Plan a slow migration from `serial("id")` to UUIDv7 to allow multi-region database scaling and seamless cross-system merging.
2.  **Table Partitioning:** Partition `attendance` and `timetable_entries` by `semester_id` to maintain query speed as years accumulate.
