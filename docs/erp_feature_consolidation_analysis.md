# ERP & IMS Feature Consolidation Analysis

## Executive Summary
This analysis evaluates the integration of the standalone IMS (Timetable/Planning Engine) into the main ERP application to form a unified modular monolith. The IMS codebase contains exceptional planning, conflict-detection, and assignment-matrix features that the ERP currently lacks. However, IMS also contains a significant amount of duplicated CRUD logic for core entities (Faculty, Subjects, Classes) that must be entirely discarded in favor of ERP's established Master Data Management. The final architecture will position the ported IMS features as a high-value "Planning & Optimization" module within the ERP, relying entirely on ERP's robust RBAC, identity, and historical session schemas.

---

## ERP Missing Features (Required for Timetable/Planning)
1. **Interactive Timetable Builder UI**: ERP lacks a dedicated, interactive matrix/grid interface for HODs to map out schedules dynamically.
2. **Real-time Conflict Detection**: ERP lacks the business logic to warn if a faculty member or class is double-booked during the *drafting* phase.
3. **Faculty Schedule Matrix**: An aggregate view for administration to see the weekly load distribution across all faculty members.
4. **Lab/Room Capacity Management**: ERP has `is_lab` strings but no actual `rooms` entity to manage physical space allocations and collisions.
5. **Session/Draft Workspaces**: ERP saves everything directly to historical tables (`timetableEntries`); it lacks a volatile "sandbox" for planning a semester before publishing it.

---

## Features Worth Migrating (The "Keepers")
1. **`ims/src/app/dashboard/timetable-builder`**: The core interactive UI for scheduling.
2. **`ims/src/app/dashboard/faculty-schedule`**: The workload and schedule visualization tools for administration.
3. **`ims/src/app/dashboard/assignments`**: The Faculty-Subject-Division assignment matrix interface (assuming IMS's UI is superior to ERP's standard forms).
4. **`ims/src/app/dashboard/lab-config` & `lab-schedule`**: The physical room management and contiguous lab block scheduling logic.
5. **Business Logic & Validators**: Any complex Zod schemas or constraint solvers in IMS that prevent timetable conflicts.

---

## Features To Ignore/Drop (The "Bloat")
1. **IMS `admins` Table & Auth System**: Completely drop. ERP's NextAuth/JWT + `roles` table is superior and unified.
2. **IMS `classes` CRUD**: Drop. ERP's `divisions` table manages batch years, semesters, and sections effectively.
3. **IMS `subjects` & `courses` CRUD**: Drop. ERP already owns the academic curriculum hierarchy and marking schemes.
4. **IMS `faculty` CRUD**: Drop. ERP owns faculty profiles (personal info, qualifications, documents).
5. **IMS `settings` Table**: Drop. Migrate any essential planning settings into ERP's global config or `.env`.

---

## Duplicate Logic Detected
1. **Faculty Subject Assignments**: Both `ims.assignments` and `erp.facultySubjectAssignments` exist. ERP's version includes `semesterId` (temporal safety) which makes it superior for data storage, but IMS's UI for creating them is likely better. **Resolution**: Port IMS UI, but wire it to save to ERP's database schema.
2. **API Routes**: `ims/src/app/api/faculty`, `/api/subjects`, `/api/classes`. **Resolution**: Delete these from IMS. The imported UI components must be refactored to fetch from ERP's existing data-access layer.
3. **Timetable Storage**: `ims.timetables` vs `erp.timetableEntries`. **Resolution**: Keep `erp.timetableEntries` for published history. Repurpose `ims.timetables` as `erp.planning_timetables` for drafts.

---

## Required ERP Schema Extensions
To support the incoming IMS workflows, the `erp/app/lib/schema.ts` must be extended:

```typescript
// 1. Rooms & Labs Infrastructure
export const rooms = pgTable("rooms", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  isLab: boolean("is_lab").notNull().default(true),
  capacity: integer("capacity").default(60),
});

// 2. Draft / Planning Timetables (The Workspace)
export const planningTimetables = pgTable("planning_timetables", {
  id: serial("id").primaryKey(),
  semesterId: integer("semester_id").notNull().references(() => semesters.id),
  divisionId: integer("division_id").notNull().references(() => divisions.id),
  assignmentId: integer("assignment_id").notNull().references(() => facultySubjectAssignments.id),
  dayOfWeek: varchar("day_of_week", { length: 10 }).notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  roomId: integer("room_id").references(() => rooms.id), // Physical location tracking
  isLabSession: boolean("is_lab_session").notNull().default(false),
});
```

---

## Required RBAC Changes
ERP currently supports: `"student" | "faculty" | "counselor" | "hod"`.
IMS supports: `"HOD" | "Principal" | "VicePrincipal"`.

**Action Needed**: 
Extend ERP `roles` table and Next.js middleware to include `principal` and `vice_principal`. Ensure that the ported `/planning` routes are restricted exclusively to `hod`, `principal`, and `vice_principal`.

---

## UI/UX Improvements Worth Keeping
*   **Drag-and-Drop / Grid Builders**: The IMS Timetable Builder must be ported intact.
*   **Assignment Matrix Visualizer**: The IMS UI for assigning faculty to subjects often includes visual indicators of "faculty load" (e.g., how many hours they are teaching). This is critical and missing in standard ERP forms.
*   **Lab Session Contiguity**: IMS's logic for blocking out 2-hour or 3-hour contiguous lab slots in the UI is highly valuable and must be preserved.

---

## Migration Priority Matrix

| Phase | Feature/Task | Action | Complexity | Value |
| :--- | :--- | :--- | :--- | :--- |
| **Phase 1** | **Schema & RBAC Preparation** | **Build in ERP** | Low | Critical |
| | Add `rooms`, `planning_timetables` to ERP | | | |
| | Add `principal` role to ERP | | | |
| **Phase 2** | **Assignment Matrix Porting** | **Migrate to ERP** | Medium | High |
| | Move IMS Assignment UI to ERP | | | |
| | Wire UI to ERP's `facultySubjectAssignments`| | | |
| **Phase 3** | **Timetable Engine Porting** | **Migrate to ERP** | High | Critical |
| | Port Timetable Builder UI & Conflict Logic | | | |
| | Wire UI to `planning_timetables` | | | |
| **Phase 4** | **Publish Workflow** | **Build in ERP** | High | Critical |
| | Build "Publish" button to move data from `planning_timetables` -> `timetable_entries` | | | |
| **Phase 5** | **Cleanup** | **Delete** | Low | High |
| | Delete old IMS `api/` CRUD routes | | | |
| | Delete entire `ims` monorepo app | | | |

---

## Final Recommended ERP Feature Set (Post-Merge)

**Modules in the Unified ERP:**
1.  **(Core) Master Data Management**: Students, Faculty, Courses, Subjects, Semesters, Divisions.
2.  **(Core) Identity & RBAC**: Centralized authentication, Roles (Student -> Principal).
3.  **(Operations) Daily Academic**: Attendance Tracking, Internal Exam Marks, Student Requests.
4.  **(Operations) Communications**: Circulars, Notices.
5.  **(Planning) Academic Resource Allocation**: Faculty Workload Matrix, Assignment Builder. *(Ported from IMS)*
6.  **(Planning) Timetable Engine**: Interactive Draft Builder, Lab Allocation, Conflict Detection, Publish to History. *(Ported from IMS)*
