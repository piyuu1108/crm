# Internal Examination Module Redesign

The Internal Examination module should support:

* Multi-year examinations
* Cross-semester scheduling
* Subject conflict prevention
* Attendance eligibility management
* Sequential seating allocation
* Shared time slots across different years
* Faculty and HOD exam visibility

The entire module should behave like a guided workflow instead of a long single form.

---

# Module Structure

## Routes

```txt
app/academics/internal-exams/page.tsx
```

Internal examination listing dashboard.

```txt
app/academics/internal-exams/create/page.tsx
```

Multi-step examination creation flow.

```txt
app/academics/internal-exams/[examId]/page.tsx
```

Exam overview and student eligibility management.

```txt
app/academics/internal-exams/[examId]/schedule/page.tsx
```

Detailed schedule management.

```txt
app/academics/internal-exams/[examId]/seating/page.tsx
```

Exam hall allocation and seating management.

---

# 1. Internal Examination Listing Page

## Route

```txt
app/academics/internal-exams
```

---

# Top Section

## Header

```txt
Internal Examinations
```

## Subtitle

```txt
Manage internal assessment exams, schedules, eligibility and hall allocation.
```

---

# Right Side Actions

* Create Exam

---

# Exam Listing View

> Use Our Codebase DataTAble which has all filters and all directly

columns should display:

* Exam Name
* Exam Number
* Target Years
* Division Count
* Subject Count
* Schedule Progress
* Seating Progress
* Approval Deadline
* Status

---

# Status Chips

* Draft
* Scheduled
* Seating Pending
* Active
* Completed

---

# 2. Create Examination Flow

## Route

```txt
app/academics/internal-exams/create
```

The entire flow should use a stepper wizard UI instead of a single large form.

---

# Step Structure

1. Basic Details
2. Target Scope
3. Eligibility Rules
4. Subject Selection
5. Schedule Planning
6. Hall Allocation
7. Review & Publish

---

# STEP 1 — Basic Details

Simple clean card layout.

## Fields

| Field         | Type                  |
| ------------- | --------------------- |
| Exam Name     | Text                  |
| Exam Number   | Number                |
| Description   | Optional Textarea     |
| Academic Year | Auto-selected         |
| Exam Type     | Internal / Mid / Unit |

---

# STEP 2 — Target Scope /scope/page.tsx

This is the primary scope selection step.

---

# Section A — Active Classes

Display only active running classes.

Examples:

```txt
26BCAAI1
26BCAAI2
26BCAAI3
```

```txt
24BCADS1
24BCADS2
24BCADS3
```

Do not show completed or inactive classes.

---

# Data Table Structure

## Rows

* Class Names

## Columns

* Semester
* Student Count
* Year Label

---

# Section B — Year Filters

Automatically detect unique years from selected classes.

Show selectable chips:

```txt
First Year
Second Year
Third Year
```

Allow multi-selection.

Example:

```txt
Semester 3 + Semester 5
Only Second Year + Third Year
```

---

# Section C — Division Selection

After class selection, show grouped divisions.

Example:

```txt
Second Year
 ├─ CE-A
 ├─ CE-B
 ├─ IT-A

Third Year
 ├─ CE-A
 ├─ IT-B
```

Use checkbox-based multi-selection.

---

# Live Summary Panel

Sticky right-side summary panel.

Display:

```txt
Target Students: 482
Selected Divisions: 8
Unique Subjects: 23

Years Included:
- First Year
- Second Year
```

---

# STEP 3 — Eligibility Rules /eligibilty/page.tsx

Attendance eligibility configuration should be managed here.

---

# Year-wise Attendance Rules

Automatically generate cards for each unique selected year.

---

## Example — First Year

| Requirement             | Value  |
| ----------------------- | ------ |
| Minimum Attendance      | 70%    |
| Allow Approval Override | Toggle |
| Approval Last Date      | Date   |

---

## Example — Second Year

| Requirement             | Value  |
| ----------------------- | ------ |
| Minimum Attendance      | 80%    |
| Allow Approval Override | Toggle |
| Approval Last Date      | Date   |

---

# Eligibility Indicators

Display real-time calculations:

```txt
Estimated Eligible: 420
Need Approval: 62
Blocked Students: 38
```

Include progress indicators for visibility.

---

# STEP 4 — Subject Selection /subjects/page.tsx

This step should behave as a unique subject mapping grid.

Do not use an academic management style table.

---

# Table Structure

| Select | Code | Short Name | Subject Name | Semester | Credit | Assignments | Duration |
| ------ | ---- | ---------- | ------------ | -------- | ------ | ----------- | -------- |

---

# Assignments Column

The assignments column should display chips representing all classes or divisions where the subject exists.

Example:

```txt
26BCAAI1
26BCADS2
26BCAREG3
26BCAREG4
```

This helps identify which classes will participate if the subject is selected.

---

# Subject Deduplication Logic

The table should contain unique subjects only.

If a subject exists across multiple classes, it should still appear only once.

Example:

```txt
Maths
```

Assignments chips:

```txt
F1
F2
F3
```

---

# Duration Selection

Each selected subject should have a duration dropdown.

## Options

```txt
1 Hour
2 Hours
3 Hours
Custom
```

Duration should remain disabled until the subject is selected.

---

# Selection Behaviour

When a subject is selected:

* The row becomes highlighted
* Duration dropdown becomes active
* Assignment chips become highlighted

---

# Sticky Summary Bar

Display:

```txt
Selected Subjects: 12
Remaining Subjects: 8
Total Estimated Hours: 24
```

---

# Important Logic

Since the table is unique-subject based:

When the HOD selects:

```txt
Maths
```

The system should automatically identify:

* All linked assignments/classes
* All linked students
* All linked semesters

Subjects should not be duplicated per class.

---

# STEP 5 — Schedule Planning /scedule/page.tsx

This is the core scheduling experience.

---

# Layout

## Left Side

* Date list
* Calendar view

## Right Side

* Time slot management
* Subject scheduling

---

# Date Creation Flow

## Add Date

Example:

```txt
12 Oct 2026
```

Inside each date:

```txt
+ Add Time Slot
```

---

# Time Slot Card

Example:

```txt
09:30 AM – 11:30 AM
```

Inside the slot:

* Multi-subject selection
* Year badges
* Auto-filled duration

---

# Multi-Subject Same Slot

Example:

```txt
09:30 AM

- FY Maths
- TY Java
- SY DBMS
```

Different year subjects can run in the same slot.

---

# Conflict Prevention Logic

If a subject is already scheduled, block duplicate scheduling.

Display:

```txt
Already Scheduled:
13 Oct • 09:30 AM
```

The subject should become disabled for selection.

---

# Remaining Subjects Panel

Sticky right sidebar showing:

```txt
Unscheduled Subjects
```

Status chips:

* Red → Pending
* Green → Scheduled

---

# Timeline Visualization

Each date should visually show time distribution.

Example:

```txt
09:30 ━━━━━━━━━━━━
12:00 ━━━━━━━
03:00 ━━━━━━━━━
```

This improves schedule readability.

---

# STEP 6 — Hall Allocation /halls/tsx

This step manages sequential seating allocation.

---

# Top Information Card

```txt
Students will be allocated sequentially based on selected classroom order.
```

Example:

```txt
F1 → F2 → F3
```

When F1 becomes full, allocation continues to F2.

---

# Classroom Selection UI

Use horizontal classroom cards.

Each card should display:

* Room Name
* Capacity
* Bench Capacity
* Estimated Filled Percentage
* Remaining Seats

---

# Sequential Ordering

Use click-to-order interaction instead of drag-and-drop.

Example:

```txt
1 → F1
2 → F2
3 → F3
```

---

# Live Capacity Section

Display:

```txt
Eligible Students: 428
Available Seats: 460
Utilization: 93%
```

Include a progress bar.

---

# Warning States

Examples:

```txt
42 seats still required
Room F2 unavailable on 14 Oct
Capacity imbalance detected
```

---

# STEP 7 — Review & Publish /review.tsx

Final summary and publishing screen.

---

# Sections

## Basic Information

* Exam Name
* Exam Number
* Scope

---

## Eligibility Summary

* Attendance Rules
* Approval Enabled Years

---

## Subject Summary

* Total Subjects
* Total Exam Hours

---

## Schedule Summary

Timeline overview of all scheduled slots.

---

## Seating Summary

Room usage visualization.

---

# Final Actions

* Save Draft
* Publish Exam
* Generate Seating
* Generate Timetable PDF

---

# Architecture Structure

Do not store examinations division-wise.

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

This avoids duplication and supports cross-year examinations.

---

# UX Guidelines

## Recommended

* Stepper wizard flow
* Sticky summary panels
* Chips for quick visibility
* Real-time validation
* Conflict prevention
* Progressive disclosure
* Timeline-based scheduling
* Smart warning states
* Automatic calculations

---

## Avoid

* Large single forms
* Heavy drag-and-drop systems
* Full calendar libraries initially
* Separate exam creation per year
* Manual attendance calculations
* Manual subject duplication
