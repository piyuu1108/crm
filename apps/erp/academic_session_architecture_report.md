# Reusable Academic Session Architecture Report

This report extracts the temporal and academic session models from the existing ERP implementation, analyzing how semester progression, historical preservation, and active session logic function. It defines a minimal, safe, reusable architecture suitable for integration into an internal timetable/planning engine.

---

## 1. ACADEMIC SESSION DETECTION

### How Sessions are Modeled
The system models an academic session explicitly via the `semesters` table.
*   **Entity:** `semesters`
*   **Fields:** `id`, `name` (e.g., "Fall 2026"), `startDate`, `endDate`, `isActive` (boolean).
*   **Behavior:** The `semesters` entity represents a specific block of time for the entire institution. It is **immutable** in concept—once a semester ends, its `isActive` flag is toggled to false, and a new semester record is created. 

### How Active Semester is Determined
The "Active Semester" is fundamentally derived through the **Division Lifecycle**. 
*   Students belong to a `division` (e.g., `26BCAAIDIV1`).
*   The `divisions` table holds a foreign key to `semesterId`.
*   APIs determine the "current" context by querying the student's `currentDivisionId`, resolving the associated `semesterId`, and fetching data exclusively scoped to that `semesterId`.
*   Faculty data (assignments) is directly scoped by `semesterId`.

### Coexistence
Multiple sessions technically coexist in the database. Historical sessions remain intact, and queries filter by `semesterId` to ensure boundary isolation.

---

## 2. TEMPORAL MODEL ANALYSIS

### Classification of Entities
*   **Immutable Historical Entities:** `attendance_sessions`, `attendance`, `marks`, `internal_evaluations`. These represent point-in-time facts bound permanently to a specific `semesterId`.
*   **Snapshot Entities:** `timetable_entries`. A timetable is a snapshot of the expected schedule for a specific `semesterId` and `divisionId`.
*   **Mutable Operational Entities:** `students`, `faculty`.

### Historical Correctness
Historical correctness is preserved **exclusively through explicit Foreign Keys to `semesterId`**. 
*   If a student is promoted, their `currentDivisionId` changes, but old `attendance` records remain valid because they are permanently bound to `attendance.studentId` and the *old* `attendanceSessions.semesterId`.
*   **Risk Over Time:** The `students` table only holds `currentSemesterNo` and `currentDivisionId`. The schema **loses old state** for the student's division history. To know which division a student belonged to 2 years ago, the system must reverse-engineer it by querying historical `marks` or `attendance` tables.

---

## 3. STUDENT PROMOTION FLOW

### Promotion Mechanism
When students move between semesters, the system relies on **In-Place Mutation**.
*   `students.currentSemesterNo` is incremented.
*   `students.currentDivisionId` is updated to a newly created division for the new semester.

### Risks
*   **Destructive Updates:** Promotion rewrites the operational student record. 
*   **No Explicit History Table:** There is no `student_semester_history` table mapping a student to past divisions.
*   This schema means that if an external engine needs to know "Which cohort was John in during Fall 2024?", it cannot rely on the `students` table. 

---

## 4. DIVISION / CLASS LIFECYCLE ANALYSIS

### Division Identity
Divisions in this schema are **Session-Specific and Transient**, not permanent cohorts.
*   **Entity:** `divisions` (`batchYear`, `semesterNo`, `semesterId`, `displayName`).
*   **Lifecycle:** Because a division has a `semesterId`, a division like "Division A" for Batch 2026 in Semester 1 is a *completely different database row* than "Division A" for Batch 2026 in Semester 2. 
*   **Impact on History:** This guarantees temporal safety for timetables. A timetable is tied to `division_id: 10`. When Semester 2 starts, a new `division_id: 15` is created. Modifying the new division's timetable structurally cannot corrupt Semester 1's timetable.

---

## 5. TIMETABLE TEMPORAL SAFETY

### Architectural Assumptions
*   `timetable_entries` references `divisionId`, `semesterId`, and `assignmentId`.
*   It denormalizes `subjectName`, `facultyName`, and `divisionName`.

### Safety Analysis
*   **Snapshot Behavior:** By explicitly duplicating the string names (`facultyName`, `subjectName`), the timetable entry acts as a historical snapshot. If a faculty member legally changes their name next year, last year's timetable entries (with the old string name) remain historically accurate.
*   **Vulnerability:** The timetable entry is tied to `assignmentId` (`facultySubjectAssignments`). If an administrator maliciously or accidentally alters the *historical* `facultySubjectAssignments` record, it could break constraints or cause cascading issues. However, standard operations (creating new assignments for a new semester) are completely safe because they generate new `assignmentId`s.

---

## 6. ACTIVE SEMESTER / SESSION LOGIC

### Runtime Session Resolution Logic
1.  **Request Initiation:** The frontend does **not** explicitly pass `semesterId` in standard payload routes. 
2.  **Context Inference (Backend):**
    *   **For Students:** The backend reads the JWT, queries `students.currentDivisionId`, joins the `divisions` table, and extracts `semesterId`.
    *   **For Faculty:** The backend queries `facultySubjectAssignments` mapped to the faculty's ID, joins `divisions`, and fetches the current active assignments. 

**Conclusion:** The backend infers the session context implicitly via the operational state of the user (`currentDivisionId` or active `facultySubjectAssignments`).

---

## 7. API & SERVICE SESSION PROPAGATION

The internal logic is highly coupled to the active state of the user. An external planning engine should **never** rely on this implicit resolution. If an external engine needs to push or pull a timetable, it must explicitly define the `semesterId` in the API contract.

---

## 8. REUSABLE SESSION ARCHITECTURE EXTRACTION

To build a safe, standalone internal timetable/planning engine based on the successful patterns here (while discarding the ERP overhead), use the following minimal schema design:

### 1. The Temporal Anchor (Semesters)
```sql
CREATE TABLE Planning_Sessions (
    session_id UUID PRIMARY KEY,
    name VARCHAR(50), -- e.g., "Fall 2026"
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN
);
```

### 2. The Cohort Snapshot (Divisions)
*Always recreate cohorts per session to protect historical timetables.*
```sql
CREATE TABLE Planning_Cohorts (
    cohort_id UUID PRIMARY KEY,
    session_id UUID REFERENCES Planning_Sessions(session_id),
    external_course_code VARCHAR(50), -- Link back to Master ERP
    batch_year INT,
    display_name VARCHAR(100) -- e.g., "CS-Batch26-Sem1-DivA"
);
```

### 3. The Assignment Snapshot
*Do not map timetables directly to a global Faculty table. Map them to a session-bound assignment.*
```sql
CREATE TABLE Session_Assignments (
    assignment_id UUID PRIMARY KEY,
    session_id UUID REFERENCES Planning_Sessions(session_id),
    cohort_id UUID REFERENCES Planning_Cohorts(cohort_id),
    external_faculty_id VARCHAR(50), -- Business key from ERP
    external_subject_code VARCHAR(50), -- Business key from ERP
    snapshot_faculty_name VARCHAR(100),
    snapshot_subject_name VARCHAR(100)
);
```

### 4. The Timetable Grid (Immutable per Session)
```sql
CREATE TABLE Timetable_Blocks (
    block_id UUID PRIMARY KEY,
    session_id UUID REFERENCES Planning_Sessions(session_id),
    cohort_id UUID REFERENCES Planning_Cohorts(cohort_id),
    assignment_id UUID REFERENCES Session_Assignments(assignment_id),
    day_of_week VARCHAR(10),
    start_time TIME,
    end_time TIME
);
```

### Extraction Summary
*   **Required Concepts:** Explicit session anchors (`Planning_Sessions`), session-specific cohorts (`Planning_Cohorts`), and session-specific assignments (`Session_Assignments`).
*   **Required Temporal Safety:** Never mutate a cohort across sessions. A cohort represents a specific group of students *in a specific session*.
*   **Required Identifiers:** Use UUIDs internally, and store External Business Keys (`external_faculty_id`, `external_subject_code`) to maintain loose coupling with the master ERP.
*   **Discarded Concepts:** `students` tables, current division pointers, attendance tracking, and marks. The planning engine does not need to know who the students are; it only needs to know that a cohort exists and requires scheduling.
