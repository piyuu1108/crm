Here is the complete, properly combined specification document. I have organized it into two major parts—Foundational Infrastructure and the Examination Workflow—while cleaning up minor typos in the route names and formatting for a seamless, professional presentation.

---

# Integrated Academic Infrastructure & Examination System

This document outlines the comprehensive architecture for managing physical classroom infrastructure and the multi-step internal examination workflow.

---

# PART 1: Classroom & Seating Infrastructure Management Module

## 1. Overview

This module manages the college's physical classroom infrastructure and visual bench layouts. It acts as the foundational layer for future examination seating generation, anti-cheating allocation, supervision management, and seating visualization.

The system supports classroom identifiers such as:

* `G1`, `G2` → Ground Floor
* `F1`, `F2` → First Floor
* `S1`, `S2` → Second Floor

The module is intentionally designed as a reusable infrastructure system rather than an exam-only feature. The same classroom data can later be reused for lectures, examinations, events, seminars, and lab management.

## 2. Classroom Management

### 2.1 Classroom Creation

The HOD/Admin can create classrooms manually.

**Classroom Fields**

| Field | Description |
| --- | --- |
| `id` | Unique classroom identifier |
| `room_code` | Classroom code (e.g., `G1`, `F2`) |
| `floor` | Floor identifier (`Ground`, `First`, `Second`) |
| `building_name` | Optional building/block name |
| `lecture_capacity` | Estimated normal classroom capacity |
| `description` | Optional notes |
| `is_active` | Classroom active/inactive status |

### 2.2 Lecture Capacity Rules

The `lecture_capacity` field represents the estimated day-to-day classroom usage capacity only. It is **NOT** used directly for examination seating generation.

**Example**

| Scenario | Seating |
| --- | --- |
| Daily lectures | 80 students |
| Examination mode | 40–60 students |

The actual examination seating capacity is calculated dynamically from the bench layout and anti-cheating rules.

## 3. Classroom Layout Designer

### 3.1 Overview

Each classroom contains a visual seating layout editor similar to a simplified BookMyShow-style arrangement system. The admin opens a classroom and accesses a visual designer canvas where benches can be added, positioned, edited, or removed.

### 3.2 Layout Philosophy

The system does NOT assume classrooms follow a perfect rectangular structure. Real classrooms may contain:

* Missing benches
* Uneven rows
* Different bench capacities
* Irregular spacing

The system fully supports irregular layouts.

## 4. Bench Management System

### 4.1 Bench Entity

Each classroom layout consists of multiple benches.

**Bench Fields**

| Field | Description |
| --- | --- |
| `id` | Unique bench identifier |
| `room_id` | Linked classroom |
| `label` | Human-readable bench label (`A1`, `B2`) |
| `grid_x` | Horizontal grid position |
| `grid_y` | Vertical grid position |
| `max_students` | Maximum students supported on the bench |
| `is_active` | Bench enabled/disabled |
| `notes` | Optional maintenance/admin notes |

### 4.2 Grid-Based Layout System

The layout system uses logical grid coordinates rather than pixel-based positioning. This approach provides simpler rendering, easier seating generation, cleaner algorithms, and support for irregular layouts.

**Example**

| Label | grid_x | grid_y |
| --- | --- | --- |
| A1 | 0 | 0 |
| A2 | 1 | 0 |
| B1 | 0 | 1 |

### 4.3 Bench Labels

Bench labels such as `A1`, `A2`, `B3` are used for seating charts, invigilator instructions, student seat lookups, reports, and administrative readability. Labels are human-readable identifiers only and are separate from the actual positioning logic.

## 5. Layout Designer Features

### 5.1 Admin Actions

The layout designer supports:

* Add bench
* Remove bench
* Edit bench
* Change bench capacity
* Move bench position
* Enable/disable bench
* Reset layout
* Save layout

### 5.2 Automatic Capacity Calculation

The system automatically calculates total benches, total seating capacity, active seating capacity, and estimated exam seating capacity. The exam seating capacity depends on examination rules and is not statically stored.

## 6. Examination Seating Compatibility

### 6.1 Examination Integration

This module acts as the infrastructure layer for automatic examination seating generation. Seating allocation logic follows:
`Classroom -> Bench Layout -> Bench Capacity -> Student Allocation`

### 6.2 Student Ordering & Academic Year Derivation

Students are ordered sequentially by their **College ID** in ascending order.

* While the College ID is strictly used for sequential sorting, the student's academic year (used for anti-cheating rules) is derived **directly from the database** via their active `currentSemesterNo`.
* This explicitly avoids parsing ID string prefixes, natively accommodating ATKT/Year Drop students to ensure anti-cheating integrity.
* Sequential seating follows strictly ascending College ID sort order.
* Ineligible or absent students are skipped; the next eligible student in sequence is placed instead.

### 6.3 Anti-Cheating Seating Rules

The following rules are absolute and have no exceptions:

* A bench **cannot** contain two or more students from the same academic year.
* Maximum **one student per year per bench**, regardless of physical bench capacity.

| Combination | Allowed |
| --- | --- |
| `FY + SY` | ✅ |
| `FY + TY` | ✅ |
| `SY + TY` | ✅ |
| `FY + SY + TY` | ✅ |
| `FY + FY` | ❌ |
| `SY + SY` | ❌ |
| `TY + TY` | ❌ |

**Bench Capacity vs Exam Usage**
Even if a bench physically supports 3 or 4 students, the anti-cheating rule naturally caps exam allocation:

| Scenario | Max Students on Bench |
| --- | --- |
| Three years running simultaneously | 3 (one per year) |
| Two years running simultaneously | 2 (one per year) |
| Only one year running | 1 |

**Exhaustion Handling for 3-Year Exams**
When any year's list is exhausted, remaining years continue filling benches with one student each:

```txt
Bench 1 → FY001 + SY001 + TY001
Bench 2 → FY002 + SY002 + TY002
Bench 3 → FY003 + SY003 + TY003   ← TY list ends here
Bench 4 → FY004 + SY004            ← TY exhausted, FY+SY continue
Bench 5 → FY005 + SY005            ← SY list ends here
Bench 6 → FY006                    ← FY continues solo

```

### 6.4 Classroom Sequence and Bench Filling

**HOD-Defined Room Order**
The HOD defines the order in which classrooms are filled during seating generation (e.g., `F1 → F2 → F3 → F4 → G1 → G2`). The algorithm fills benches sequentially across classrooms in this defined order.

**Dual-Year Filling Logic**
When two years (e.g., FY and SY) have simultaneous examinations:

* Each bench receives **one FY student + one SY student**.
* Both year lists are consumed in parallel, bench by bench.

**Exhaustion Handling**
When one year's student list is exhausted before the other, the remaining year continues filling benches **alone** (one student per bench). The algorithm does not stop or hold benches waiting for the other year.

### 6.5 Seating Generation Trigger

* Seating is **automatically generated** after the appeal period ends.
* The HOD can also **manually re-trigger** seating generation at any time after initial generation.
* Re-triggering is useful for scenarios such as last-minute eligibility changes or room unavailability.

## 7. Faculty Supervision Assignment

### 7.1 Supervision Pool Rules

* The institution operates as a single-department structure tied to courses. Faculty are mapped directly via `courseId`, seamlessly generating the supervision pool without the need for complex interdisciplinary queries.
* Faculty who are **on approved leave** on the examination day are automatically excluded.
* Normal lectures are considered cancelled during examination days; lecture schedules do not count as conflicts.

### 7.2 Fair Distribution

Supervision duties are distributed as evenly as possible across available faculty.

| Fair Example | Unfair Example |
| --- | --- |
| Faculty A → 3 | Faculty A → 5 |
| Faculty B → 3 | Faculty B → 1 |
| Faculty C → 3 | Faculty C → 3 |

### 7.3 Rotation Rules

* Faculty should **not repeatedly supervise the same classroom or class**.
* Supervision duties rotate across examination days to ensure balanced exposure.

## 8. Access Control

| Role | Permission |
| --- | --- |
| **HOD/Admin** | Full classroom and layout management |
| **Faculty** | View-only access to classroom layouts |
| **Counselor** | View-only access |
| **Student** | No access |

## 9. Infrastructure Design Principles

* Classroom infrastructure is independent from examination allocation logic.
* Bench layouts are reusable across multiple future modules.
* Layouts support irregular real-world classroom structures.
* Examination seating capacity is dynamically derived, not manually entered.
* Bench labels are human-readable identifiers only.
* Grid positioning is used instead of pixel coordinates for simplicity and maintainability.
* Student ordering is strictly by College ID ascending; academic year is derived strictly from the database, not the ID prefix.
* Anti-cheating bench rules are absolute with no exceptions.

---

# PART 2: Internal Examination Module Redesign

## 1. Overview

The Internal Examination module should support:

* Multi-year examinations
* Cross-semester scheduling
* Subject conflict prevention
* Attendance eligibility management
* Sequential seating allocation
* Shared time slots across different years
* Faculty and HOD exam visibility

The entire module should behave like a guided workflow instead of a long single form.

## 2. Module Structure & Routes

```txt
app/academics/internal-exams/page.tsx

```

Internal examination listing dashboard.

```txt
app/academics/internal-exams/create/page.tsx

```

Multi-step examination creation flow.

## 3. Internal Examination Listing Page

**Top Section**

* Header: Internal Examinations
* Subtitle: Manage internal assessment exams, schedules, eligibility and hall allocation.

**Right Side Actions**

* Create Exam

**Exam Listing View**

> Use the Codebase DataTable which directly includes all filters.

Columns should display:

* Exam Name
* Exam Number
* Target Years
* Division Count
* Subject Count
* Schedule Progress
* Seating Progress
* Approval Deadline
* Status

**Status Chips**

* Draft
* Scheduled
* Seating Pending
* Active
* Completed

## 4. Create Examination Flow (Stepper Wizard)

**Route:** `app/academics/internal-exams/create`
The entire flow should use a stepper wizard UI instead of a single large form.

### Step Structure

1. Basic Details
2. Target Scope
3. Eligibility Rules
4. Subject Selection
5. Schedule Planning
6. Hall Allocation
7. Review & Publish

---

### STEP 1 — Basic Details

Simple clean card layout.

**Fields**

| Field | Type |
| --- | --- |
| Exam Name | Text |
| Exam Number | Number |
| Description | Optional Textarea |
| Academic Year | Auto-selected |
| Exam Type | Internal / Mid / Unit |

---

### STEP 2 — Target Scope (`/scope/page.tsx`)

This is the primary scope selection step.

**Section A — Active Classes**
Display only active running classes. Do not show completed or inactive classes.
*Rows:* Class Names. *Columns:* Semester, Student Count, Year Label.

**Section B — Year Filters**
Automatically detect unique years from selected classes. Show selectable chips (e.g., `First Year`, `Second Year`, `Third Year`) and allow multi-selection.

**Section C — Division Selection**
After class selection, show grouped divisions. Use checkbox-based multi-selection.

**Live Summary Panel (Sticky)**
Display:

* Target Students: 482
* Selected Divisions: 8
* Unique Subjects: 23
* Years Included: First Year, Second Year

---

### STEP 3 — Eligibility Rules (`/eligibility/page.tsx`)

Attendance eligibility configuration should be managed here.

**Year-wise Attendance Rules**
Automatically generate cards for each unique selected year.

*Example — First Year*

| Requirement | Value |
| --- | --- |
| Minimum Attendance | 70% |
| Allow Approval Override | Toggle |
| Approval Last Date | Date |

**Eligibility Indicators**
Display real-time calculations: Estimated Eligible, Need Approval, Blocked Students. Include progress indicators for visibility.

---

### STEP 4 — Subject Selection (`/subjects/page.tsx`)

This step should behave as a unique subject mapping grid. Do not use an academic management style table.

**Table Structure**

| Select | Code | Short Name | Subject Name | Semester | Credit | Assignments | Duration |
| --- | --- | --- | --- | --- | --- | --- | --- |


**Assignments Column & Deduplication**

* The assignments column displays chips representing all classes/divisions where the subject exists (e.g., `26BCAAI1`, `26BCADS2`).
* The table contains unique subjects only. If a subject exists across multiple classes, it appears only once.
* When the HOD selects a subject, the system automatically identifies all linked assignments/classes, linked students, and linked semesters.

**Duration Selection & Behaviour**

* Duration dropdown (1 Hour, 2 Hours, 3 Hours, Custom) remains disabled until the subject is selected.
* Upon selection: The row highlights, duration dropdown becomes active, and assignment chips highlight.

**Sticky Summary Bar**
Display: Selected Subjects, Remaining Subjects, Total Estimated Hours.

---

### STEP 5 — Schedule Planning (`/schedule/page.tsx`)

This is the core scheduling experience.

**Layout**

* Left Side: Date list, Calendar view.
* Right Side: Time slot management, Subject scheduling.

**Date & Time Slot Creation**

* Add Date → Add Time Slot (e.g., `09:30 AM – 11:30 AM`).
* Inside the slot: Multi-subject selection, Year badges, Auto-filled duration.

**Multi-Subject Same Slot & Conflicts**

* Different year subjects can run in the same slot (e.g., FY Maths, TY Java, SY DBMS).
* If a subject is already scheduled, block duplicate scheduling and disable it for selection.

**Timeline Visualization & Remaining Subjects**

* Each date should visually show time distribution (e.g., `09:30 ━━━━━━━━━━━━`).
* Sticky right sidebar shows unscheduled subjects with Red (Pending) and Green (Scheduled) status chips.

---

### STEP 6 — Hall Allocation (`/halls/page.tsx`)

This step manages sequential seating allocation.

**Top Information Card**
Students will be allocated sequentially based on selected classroom order (e.g., `F1 → F2 → F3`). When F1 becomes full, allocation continues to F2.

**Classroom Selection UI**
Use horizontal classroom cards displaying: Room Name, Capacity, Bench Capacity, Estimated Filled Percentage, and Remaining Seats. Use click-to-order interaction instead of drag-and-drop.

**Live Capacity & Warnings**

* Display: Eligible Students, Available Seats, Utilization (with a progress bar).
* Smart warnings: `42 seats still required`, `Room F2 unavailable on 14 Oct`, `Capacity imbalance detected`.

---

### STEP 7 — Review & Publish (`/review/page.tsx`)

Final summary and publishing screen.

**Sections**

* Basic Information: Exam Name, Exam Number, Scope
* Eligibility Summary: Attendance Rules, Approval Enabled Years
* Subject Summary: Total Subjects, Total Exam Hours
* Schedule Summary: Timeline overview of all scheduled slots
* Seating Summary: Room usage visualization

**Final Actions**

* Save Draft
* Publish Exam
* Generate Seating
* Generate Timetable PDF

---

## 5. Architectural Structure

Do not store examinations division-wise. This avoids duplication and supports cross-year examinations.

Recommended structure:

```txt
Exam
↓
ExamScopes
↓
EligibilityScopes
↓  
ExamSubjects
↓
ExamSchedules
↓
ExamHallAllocations

```

## 6. Exam Workflow UX Guidelines

**Recommended**

* Stepper wizard flow
* Sticky summary panels
* Chips for quick visibility
* Real-time validation
* Conflict prevention
* Progressive disclosure
* Timeline-based scheduling
* Smart warning states
* Automatic calculations

**Avoid**

* Large single forms
* Heavy drag-and-drop systems
* Full calendar libraries initially
* Separate exam creation per year
* Manual attendance calculations
* Manual subject duplication