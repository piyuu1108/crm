# Modular Monolith Migration: Architectural Risk Analysis

## Executive Summary

Merging the IMS (Timetable Planning Engine) and the ERP (Master Academic System) into a single **Modular Monolith** is strategically sound. It eliminates network boundaries, consolidates the deployment pipeline, and establishes a single source of truth for identity and academic records. 

However, this merge carries **severe short-term technical and operational risks**. The primary danger lies in database schema reconciliation—specifically, differing definitions of core academic entities (Classes vs. Divisions, Draft vs. Published Timetables) and merging disparate RBAC models. If executed poorly, this merge will corrupt historical academic records, expose unfinalized planning data to students, and create a tightly coupled "Big Ball of Mud" that will collapse under the weight of future scale (10k+ students, concurrent multi-semester operations).

A phased, schema-first approach with strict internal module boundaries is mandatory.

---

## 🔴 Critical Risks (High Probability, High Impact)

### 1. Schema Conflicts & Duplicate Entities (Database Migration Risks)
*   **The Risk**: Both applications define core entities differently. 
    *   `ims.classes` (year, semester, divisionNumber) overlaps with `erp.divisions` (batchYear, semesterNo, specialization). 
    *   `ims.subjects` has `credit` and `type`, while `erp.subjects` has `subjectType` and extensive marking schemes.
*   **Impact**: Attempting to force one schema into the other without careful mapping will result in orphaned records or data loss. 

### 2. Timetable Draft vs. Published Data Safety
*   **The Risk**: ERP currently stores finalized, historical `timetableEntries`. IMS stores iterative, volatile `timetables` representing work-in-progress drafts.
*   **Impact**: If merged into a single table without rigorous separation, students might see half-finished timetables. Attendance might be marked against volatile draft schedules. This breaks temporal safety and compromises the integrity of academic operations.

### 3. RBAC and Identity Merging
*   **The Risk**: ERP relies on a `roles` table (student, faculty, counselor, HOD) mapped via `faculty_roles`. IMS relies on a separate `admins` table with a custom Enum (`HOD`, `Principal`, `VicePrincipal`) and UUIDs.
*   **Impact**: Porting IMS routes without rewriting their authentication layers will leave massive security holes. A Principal might lose access to planning tools, or a standard faculty member might accidentally gain HOD planning rights.

### 4. Semester / Session Lifecycle Logic Risks
*   **The Risk**: ERP tracks historical `semesters` (`isActive` flag). IMS logic inherently assumes it is working on the "current" session. 
*   **Impact**: When IMS features are ported, if they are not updated to explicitly require a `semesterId`, a planner might accidentally overwrite historical timetables or mutate data belonging to a past academic year.

### 5. Transaction Consistency During "Publish" Workflows
*   **The Risk**: Moving a timetable from "Draft" to "Published" involves converting thousands of draft slots into official `timetableEntries`. 
*   **Impact**: If this is not wrapped in a strict PostgreSQL transaction (`db.transaction()`), a server crash mid-publish will leave the ERP in a corrupted, partial state where half the college has a timetable and the other half does not.

---

## 🟡 Medium Risks (Moderate Probability, Moderate Impact)

### 6. Module Coupling & Circular Dependencies
*   **The Risk**: Inside the monolith, it becomes trivial to `import` anything from anywhere. The `timetable` module might directly import from the `attendance` module, which imports from `student`, which imports from `timetable`.
*   **Impact**: Next.js build failures, spaghetti code, and inability to refactor easily.

### 7. Drizzle ORM Migration Issues
*   **The Risk**: Merging two `schema.ts` files and running `drizzle-kit generate` will create a massive, chaotic SQL migration file. It may attempt to `DROP` the IMS tables, erasing any existing planning data.
*   **Impact**: Production deployment failure, extensive downtime, and rollback complexity.

### 8. API Route & Naming Inconsistencies
*   **The Risk**: Both apps likely have routes like `/api/faculty` or components named `<FacultyList />`. 
*   **Impact**: Naming collisions during the merge will cause silent overwrites and extremely confusing debugging sessions.

### 9. Inconsistent Business Keys
*   **The Risk**: ERP and IMS both use `facultyCode` and `subjectCode`, but if the validation formats differ (e.g., case sensitivity, spacing), the merged system will fail to join records properly.

### 10. Frontend Route Restructuring Risks
*   **The Risk**: Merging IMS Next.js pages into ERP will break existing bookmarks or saved links used by the Principal and HOD.

---

## 🟢 Low Risks (Easily Mitigated)

### 11. Settings & Config Tables Merge
*   **The Risk**: `ims.settings` might conflict with ERP environment variables.
*   **Mitigation**: Move IMS settings into ERP's global config or convert them to standard `.env` variables.

### 12. Legacy Code Cleanup Risks
*   **The Risk**: Dead code from IMS (e.g., its old authentication wrappers) is accidentally ported over.
*   **Mitigation**: Strict code review during the porting phase.

### 13. State Management Conflicts
*   **The Risk**: React Contexts or global stores (Zustand) overlapping.

---

## 🚫 Architectural Anti-Patterns (What NOT to do)

1.  **The "God Table" Anti-Pattern**: 
    *   *Do NOT* add `is_draft` and `is_published` columns to the `timetableEntries` table. Published academic records are immutable history. Drafts are volatile scratchpads. 
    *   *Solution*: Keep `timetable_entries` for history. Create a new `planning_timetables` table for drafts.
2.  **Spaghetti Imports**: 
    *   *Do NOT* allow deep file imports like `import { db } from "../../../app/lib/db"`. 
    *   *Solution*: Enforce strict folder boundaries. Use module barrel files (`index.ts`).
3.  **Bypassing the ERP Gateway**:
    *   *Do NOT* port IMS API routes as "unprotected" just because they were internal before. 
    *   *Solution*: Every ported route must run through the ERP's RBAC middleware.
4.  **Blind Schema Pushes**:
    *   *Do NOT* use `drizzle-kit push` for this migration. You *must* use `drizzle-kit generate` and manually inspect/edit the generated SQL to ensure safe data porting.

---

## 🗺️ Recommended Safe Migration Strategy

Do not merge the codebases in one PR. Follow a sequenced, multi-phase migration.

### Phase 1: Database & Identity Unification (The Foundation)
1.  **Schema Merge**: Add `planning_assignments`, `planning_timetables`, `rooms`, and `lab_sessions` to the ERP `schema.ts`.
2.  **Entity Resolution**: Map `ims.classes` logic directly into `erp.divisions`. Map `ims.subjects` unique fields (like `credit`) into `erp.subjects`.
3.  **Data Porting (SQL Script)**: Write a custom raw SQL script to migrate `ims.admins` into the `erp.faculty` table, assigning them the appropriate `role_id` for HOD/Principal.

### Phase 2: Backend Logic Integration
1.  Port IMS planning logic into a new ERP folder: `apps/erp/modules/planning/`.
2.  Update all Drizzle queries in the ported code to use the ERP schema (e.g., swapping `classes.id` for `divisions.id`).
3.  Wrap all planning API routes with ERP's session authentication and RBAC checks ensuring only `HOD`/`Principal` roles can access them.

### Phase 3: Frontend Porting
1.  Move IMS UI components into `apps/erp/app/(dashboard)/planning/`.
2.  Refactor components to utilize ERP's shared UI library (buttons, tables, dialogs) to ensure consistent UX.

### Phase 4: Decommissioning
1.  Verify the ERP Planning module works flawlessly in staging.
2.  Drop the `ims` database schema and delete the `apps/ims` folder from the monorepo.

---

## 📁 Recommended Final Modular Structure

To prevent a Big Ball of Mud, the ERP should adopt a feature-sliced or modular folder structure:

```text
apps/erp/
├── app/                        # Next.js App Router (UI & API endpoints)
│   ├── (academic)/             # Student views, Attendance, Marks
│   ├── (planning)/             # HOD Timetable Generation (Ported IMS UI)
│   └── (admin)/                # ERP Admin, Role assignment
│
├── modules/                    # Core Business Logic (Framework Agnostic)
│   ├── core/                   # Auth, RBAC, Shared Utilities, Drizzle DB
│   ├── students/               # Student lifecycle, profiles
│   ├── faculty/                # Faculty profiles, roles
│   ├── academic-calendar/      # Semesters, Divisions, Subjects
│   ├── planning-engine/        # Drafts, Timetable Solver, Lab Sessions (Ported IMS Backend)
│   └── attendance/             # Daily attendance logic
```
*Rule: `planning-engine` can read from `academic-calendar`, but `academic-calendar` CANNOT read from `planning-engine`.*

---

## ⏳ Long-Term Maintainability Concerns

1.  **Technical Debt Accrual**: By merging, you risk maintaining two ways of doing the same thing. If both ERP and IMS had a "calculate faculty load" function, and both survive the merge, bugs will inevitably occur. **Action**: Ruthlessly deduplicate utility functions during Phase 2.
2.  **Query Scalability**: At 10k+ students and 500+ faculty, querying timetables requires massive `JOIN` operations across divisions, subjects, faculty, and rooms. **Action**: Ensure `timetable_entries` remains slightly denormalized (keeping string snapshots of names/codes as it currently does) to prevent complex joins on hot-path queries like "Student Daily View".
3.  **Silent Failing of Historical Integrity**: If the boundary between `planning_timetables` and `timetable_entries` blurs over the next 2 years, developers might start using planning tables for historical lookups. **Action**: Document module boundaries explicitly.

---

## ⚖️ Final Verdict

Merging IMS into ERP to form a Modular Monolith is the **correct architectural decision** for the long term. It reduces operational complexity and centralizes identity.

However, the migration is **high risk**. The absolute most dangerous pitfall is **Schema Conflict & Data Corruption**. You must treat the ERP database as sacred. Do not dump IMS tables directly into it. Instead, recreate the necessary IMS structures (as `planning_*` tables) within the ERP schema, enforce strict RBAC, and permanently maintain a firewall between **volatile planning data** and **immutable historical records**.
