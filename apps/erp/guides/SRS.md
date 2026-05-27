# Software Requirements Specification (SRS)

## College ERP System

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [User Roles](#2-user-roles)
3. [Registration Module](#3-registration-module)
4. [Faculty & Academic Assignment Management](#4-faculty--academic-assignment-management)
5. [Academic Structure Management](#5-academic-structure-management)
6. [Attendance Module](#6-attendance-module)
7. [Marks Management System](#7-marks-management-system)
8. [Student Dashboard](#8-student-dashboard)
9. [Student Request Module](#9-student-request-module)
10. [Timetable Module](#10-timetable-module)
11. [Leave & Proxy Management Module](#11-leave--proxy-management-module)
12. [Semester Management](#12-semester-management)
13. [Examination Seating & Eligibility Management](#13-examination-seating--eligibility-management)
14. [Secure Internal Examination Paper Generation](#14-secure-internal-examination-paper-generation)
15. [Internal Evaluation Calculation System](#15-internal-evaluation-calculation-system)
16. [Reports & Analytics](#16-reports--analytics)
17. [System Rules (Critical Summary)](#17-system-rules-critical-summary)
18. [Audit Logs Module](#18-audit-logs-module)

---

## 1. System Overview

The College ERP system manages the complete student lifecycle, academics, attendance, and administration. Students are onboarded by the HOD via CSV upload, and the system seamlessly handles:

- Academic structure (subjects, divisions, semesters)
- Role-based operations (Student, Faculty, Counselor, HOD)
- Marks, attendance, reports, and administrative requests
- **Both fresh admissions and lateral/direct entry students** joining at Semester 3 or Semester 5
- **ERP first-time setup** for colleges onboarding all existing students at once
- Leave and proxy management for faculty
- Examination seating, eligibility, and supervision
- Secure internal question paper generation and randomized selection
- Internal evaluation engine with immutable audit layer

---

## 2. User Roles

### 2.1 Primary Roles (Base Identity)

| Role | Description |
| --- | --- |
| **Student** | Access personal data, timetable, attendance, and requests. |
| **Faculty** | Conduct teaching, mark attendance, and enter marks. |

### 2.2 Secondary Roles (Additional Responsibilities)

| Role | Description |
| --- | --- |
| **Counselor** | Manages assigned division(s) and monitors students. |
| **HOD (Admin)** | Has full academic and administrative control. |

### 2.3 Role Rules

- Roles are **not** mutually exclusive.
- A faculty member can hold multiple roles simultaneously.

**Role Assignment Examples:**

| Faculty | Roles Assigned |
| --- | --- |
| Kajal Patel | Faculty |
| Priya Patel | Faculty + Counselor |
| Amit Patel | Faculty + Counselor + HOD |

### 2.4 Role Capabilities

#### Student

- Receive login credentials via email invite.
- Complete profile on first login.
- View profile, attendance, and timetable.
- Apply for requests (leave, bonafide, etc.).

#### Faculty (Subject)

- Mark attendance.
- Enter and update marks.
- View timetable and assigned classes.
- Submit leave requests with proxy assignments.
- Receive proxy lecture notifications and view proxy duties in timetable.

#### Counselor

- Manage one or more divisions.
- Monitor attendance and performance.
- Approve or reject student requests.
- Perform all Subject Faculty actions, limited to their assigned class.
- Generate reports and perform final evaluations.
- Create and manage division timetables.
- Review examination eligibility appeals from students.

#### HOD (Admin)

- Exercise full system control.
- Create divisions and upload students via CSV.
- Manage students, staff, and subjects.
- Assign divisions, counselors, and faculty.
- Promote students semester-wise.
- Generate comprehensive reports and timetables.
- Approve or override faculty leave requests and proxy assignments.
- Schedule examinations and manage seating arrangements.
- Trigger secure final paper generation with verification.
- Configure internal evaluation weightage.
- Perform all Faculty and Counselor actions.
- Teach subjects and act as a counselor if needed.

---

## 3. Registration Module

### 3.1 Student Onboarding — HOD-Driven (All Admissions)

This is the **only student registration flow**. Students do not self-register. All onboarding is initiated by the HOD.

---

#### Step 1: HOD Creates a Division

The HOD creates a division before uploading any students. Each division captures the following metadata at creation time:

| Field | Description | Example |
| --- | --- | --- |
| Batch Year | The admission year | `2026` |
| Semester No | Academic semester level (1–6) | `1` |
| Specialization | Course specialization | `AI`, `DS`, `REGULAR` |
| Division Number | Auto-assigned globally per year | `1`, `2`, `3`... |

**Division Naming Convention:**

- Format: `YY` + `BCA` + `SPECIALIZATION_CODE` + `DIV` + `NUMBER`
- Example: `26BCAAIDIV1`, `26BCADSDIV2`, `26BCAREGDIV3`
- The division number is **global per batch year** — it does not reset per specialization.
- Example sequence for batch 2026: AI gets `DIV1`, DS gets `DIV2`, REGULAR gets `DIV3`.
- The system **auto-assigns the next available division number** for that year; HOD does not pick it manually.
- **Division names are permanent** — the name never changes after creation. Only `semester_no` is updated internally during semester progression.

---

#### Step 2: HOD Uploads Students via CSV

After creating a division, the HOD uploads a CSV file containing the students to be placed in that division.

**CSV Format:**

| Column | Description |
| --- | --- |
| `id` | Pre-created Student ID (generated by HOD/Admission Office) |
| `name` | Full name of the student |
| `email` | Personal email address (used for invite only) |

**Student ID Format:**

- Format: `YY` + `COURSE_CODE` + `SPECIALIZATION_CODE` + `SEQUENCE_NUMBER`
- Example: `26BCAAI001`, `26BCADS086`, `26BCAREG146`
- The sequence number is **global per batch year** — it does not reset per specialization.
- Example: AI ends at `085` → DS starts from `086` → REGULAR starts from where DS ends.
- The system displays the **next available sequence number** before each upload so HOD knows the correct range.
- The system **validates ID format** on import and rejects malformed entries with a clear per-row error.

**System Actions on Upload:**

- Validates all rows before committing.
- Shows HOD a **preview table** of the data to confirm before final import.
- Runs **duplicate email and ID check** across all existing students.
- On confirmation, registers all students under the selected division with its semester, specialization, and batch year.
- Generates a **"Set Password" email** to each student's personal email with a secure time-limited link (48–72 hours expiry).

---

#### Step 3: Student First Login — Set Password

The student receives an email with a secure invite link.

- Student clicks the link and sets their password.
- Link expires after 48–72 hours; HOD can resend if needed.
- After setting the password, the student is redirected to complete their profile.

**Login Credentials (permanent after setup):**

| Field | Value |
| --- | --- |
| **Username** | Student ID (e.g., `26BCAAI001`) |
| **Password** | Self-set by student via email invite |

---

#### Step 4: Student Completes Profile

On first login, the student must complete their full profile before accessing any other ERP feature. Profile completion is mandatory and enforced by the system.

**Required Details:**

- Full Name, DOB, Gender, Blood Group
- Course and Category (SC / ST / OBC / Open)
- Address and Contact Numbers (Self, Parent, Optional)
- Personal Email (pre-filled, non-editable)
- Board (GSEB / CBSE / etc.), 12th Percentage and Stream
- School Name and UDISE Code
- Aadhaar (Student + Parent)

**Required Documents:**

- LC (Leaving Certificate)
- 10th and 12th Marksheets
- Profile Photo
- Caste Certificate (if applicable)
- Migration Certificate (if not GSEB)

> **Note:** Fields derived from division assignment — Student ID, Specialization, Division, Batch Year, Semester — are pre-filled and locked. Students cannot edit these.

---

### 3.2 Student Onboarding — ERP First-Time Setup (Existing Students)

This flow applies when the ERP system is introduced for the first time and students are **already enrolled in different semesters** within the college (e.g., some students are in Sem 3, some in Sem 5, etc.).

#### System Behavior

- The **same HOD-driven CSV upload flow** (Section 3.1) is used for all existing students.
- HOD creates the appropriate divisions first (with correct semester, specialization, and batch year reflecting the students' actual current position).
- HOD uploads CSV for each division — the system handles Sem 1, Sem 3, Sem 5, and all others identically.
- Students receive email invites, set passwords, and complete their profiles exactly as in Section 3.1.

#### Rules & Constraints

- Division metadata (semester, specialization, batch year) must accurately reflect the student's **current academic position** at the time of ERP setup.
- This is a **one-time setup process only**.
- After initial onboarding, semester progression is handled **only by the system (promotion module)**.

#### Data Handling

- No historical data (attendance / marks) is required for semesters prior to ERP setup.
- The system starts tracking attendance, marks, and reports **from the enrolled semester onwards**.

> **Design Note:** This is not lateral entry. This is a system initialization scenario. After setup, all future flows follow standard ERP rules.

---

### 3.3 Faculty Registration Module

#### Pre-Registration (Admin Controlled)

Faculty accounts are pre-created by the administration. Stored details include:

- Faculty ID
- Name
- Email (must be unique)
- Mobile Number
- Temporary Password (mandatory change on first login)

#### Profile Completion (After First Login)

Required details to complete the profile:

- Gender and Date of Birth
- Qualification (e.g., MSc, PhD)
- Experience (in years)
- Specialization
- Designation (Assistant Professor, Associate Professor, etc. — used for display)

#### Teaching Assignment Rule

Faculty members are not restricted to a single department. They can teach:

- Any department
- Any subject
- Any semester

> This is managed via dynamic mapping of subjects, departments, and semesters.

---

### 3.4 Login System

| User Type | Login Credentials |
| --- | --- |
| **Student** | Student ID + Password |
| **Faculty** | Email + Password |

---

## 4. Faculty & Academic Assignment Management

### 4.1 Overview

This module manages faculty responsibilities, role flexibility, and semester-based assignments, ensuring flexibility, non-redundancy, and scalability by separating roles from assignments.

### 4.2 Faculty Flexibility Rules

#### Multi-Subject Teaching

- A faculty member can teach multiple subjects (3–8 or more).
- A faculty member can teach the same subject across multiple divisions.
- *Example:* Kajal Patel teaches Java in SYBCADS DIV2 and IOT in TYBCA DIV1.

#### Counselor Assignment

- A faculty member can counsel one or more divisions.
- A class can have multiple counselors.
- Assignments are strictly semester-based with no strict limit on quantity.
- *Example:* Priya Patel is the counselor of FYAI DIV1 and SYBCADS DIV2.

#### HOD Flexibility

- An HOD can concurrently teach subjects and act as a counselor.

### 4.3 Semester-Based Assignment System

**Core Principle:** Roles are global (permanent), whereas assignments are semester-based (temporary).

#### Semester Entity Structure

| Field | Description |
| --- | --- |
| `id` | Unique semester ID |
| `name` | e.g., Sem 1 (2024) |
| `start_date` | Semester start date |
| `end_date` | Semester end date |
| `is_active` | Active semester flag |

> **Important Rule:** No assignment is permanent. Every assignment record **MUST** include `semester_id`.

### 4.4 Division as Core Entity

The Division acts as the central link between the semester and all academic activities.

#### Division Structure

| Field | Description |
| --- | --- |
| `id` | Division ID |
| `name` | e.g., `26BCADSDIV2` (permanent, never changes) |
| `course` | Course name |
| `specialization` | e.g., AI, DS, REGULAR |
| `batch_year` | e.g., 2026 |
| `semester_no` | Current academic semester level (1–6) — updated on promotion |
| `semester_id` | Time-based active semester reference (Foreign Key) |

### 4.5 Assignment Mapping Tables

#### Faculty–Subject Mapping

| Field | Description |
| --- | --- |
| `faculty_id` | Faculty reference |
| `subject_id` | Subject reference |
| `division_id` | Division reference |
| `semester_id` | Semester reference |

#### Counselor–Division Mapping

| Field | Description |
| --- | --- |
| `faculty_id` | Faculty reference |
| `division_id` | Division reference |
| `semester_id` | Semester reference |

### 4.6 Data Flow & Behavior Rules

- **Data Flow:** Semester → Division → Subjects / Faculty / Counselor / Timetable
- Assignments change every semester.
- Old assignment data is preserved (never overwritten).
- New semesters generate completely new mappings.

### 4.7 Design Constraints (Critical)

| Constraint | Rule | Status |
| --- | --- | --- |
| **Role storage** | Do NOT store roles as boolean flags (e.g., `is_counselor`). | ❌ Avoid |
| **Flexibility** | Use mapping tables for all assignments. | ✅ Required |
| **Semester linkage** | Always include `semester_id` in all academic data. | ✅ Required |
| **Role naming** | Avoid redundant role names (e.g., "SubjectTeacher", "ClassTeacher"). | ❌ Avoid |

> **Key Design Principle:** Roles define permissions; assignments define responsibilities.

---

## 5. Academic Structure Management

### 5.1 Course Master

Defines all courses offered by the institution.

| Field | Description |
| --- | --- |
| `id` | Unique course ID |
| `name` | Course name (e.g., BCA, BCAAI) |
| `code` | Short code (e.g., BCA, BCAAI) |

### 5.2 Student ID Generation

Student IDs are pre-created by the HOD/Admission Office and included in the CSV upload. The system validates the format on import.

**Format:** `YY` + `COURSE_CODE` + `SPECIALIZATION_CODE` + `SEQUENCE_NUMBER`

**Rules:**

- The sequence number is **global per batch year** — it does not reset when moving from one specialization to the next.
- Lateral and direct entry students receive IDs in the same format and sequence as fresh admission students.
- HODs can manually adjust IDs for edge cases after constraint verification.
- The system displays the **next available number** before each CSV upload.

### 5.3 Division Creation

Divisions are created by the HOD before uploading students. Divisions are course-specific, semester-based, and sized according to maximum capacity (e.g., 60–80 students).

**Division Naming Convention:**

- Format: `YY` + `BCA` + `SPECIALIZATION_CODE` + `DIV` + `NUMBER`
- Example: `26BCAAIDIV1`, `26BCADSDIV2`, `26BCAREGDIV3`

**Division Numbering Rule:**

- Numbering is **global per batch year** — it does not reset per specialization.
- The system auto-assigns the next available division number for that year.

**Division Name Permanence:**

- Division names are **permanent after creation** — they never change.
- Only `semester_no` is updated internally when students are promoted.

**UI Display Prefix (for readability only — not stored in DB):**

| Year Level | Semesters | Display Prefix |
| --- | --- | --- |
| First Year | Sem 1 or Sem 2 | FY |
| Second Year | Sem 3 or Sem 4 | SY |
| Third Year | Sem 5 or Sem 6 | TY |

**Lateral / Direct Entry and Divisions:**

- Lateral entry students (Sem 3) are placed directly into Second Year divisions (SY).
- Direct entry students (Sem 5) are placed directly into Third Year divisions (TY).
- If existing divisions have capacity, the HOD allocates the student there.
- If capacity is exceeded, the HOD may create a new division or merge students as appropriate.

### 5.4 Subject Allocation

#### Layer 1: Subject Master (Global with Marking Scheme)

The Subject Master includes both subject identity and its marking scheme. Each subject is defined once and reused across divisions.

| Field | Description |
| --- | --- |
| `subject_id` | Unique identifier |
| `subject_code` | Unique subject code (e.g., 101, BCA101) |
| `subject_name` | Name of the subject (e.g., Java) |
| `subject_type` | Theory / Practical / Both |
| `internal_theory_max` | Maximum internal theory marks |
| `external_theory_max` | Maximum external theory marks |
| `theory_passing_marks` | Minimum passing marks for theory |
| `internal_practical_max` | Maximum internal practical marks |
| `external_practical_max` | Maximum external practical marks |
| `practical_passing_marks` | Minimum passing marks for practical |

**Subject Rules:**

- A subject must be created in the Subject Master before assignment.
- Subject code must be **unique** across the system.
- Marking scheme is **globally defined per subject** and reused across all divisions.
- Fields required depend on subject type:
  - **Theory** → Only theory fields required
  - **Practical** → Only practical fields required
  - **Both** → All fields required

#### Layer 2: Division Subject & Faculty Assignment

| Field | Description |
| --- | --- |
| `id` | Unique identifier |
| `division_id` | Division reference |
| `subject_id` | Reference to Subject Master |
| `faculty_id` | Assigned faculty |
| `semester_id` | Semester reference |

**Assignment Rules:**

- A subject can be assigned to multiple divisions.
- Each subject in a division must have one assigned faculty.
- Duplicate assignment of the same subject to the same division is restricted.
- **Marking scheme is NOT stored here**; it is inherited from Subject Master.

> **Design Note:** This design centralizes the marking scheme within the Subject Master, assuming a consistent evaluation structure across all divisions and semesters for a given subject.

---

## 6. Attendance Module

### 6.1 Overview

Manages subject-wise attendance per division based dynamically on the timetable.

**Lecture Identification:** Each lecture instance is uniquely identified by `timetable_id` + `date`.

### 6.2 Attendance Entry & Controls

- Faculty mark attendance for each uniquely identified lecture.
- **"Drop Today's Class"** feature marks a lecture as cancelled — excludes it from percentage calculations without marking students absent.

### 6.3 Access Control

| Role | Permission |
| --- | --- |
| **Faculty** | Mark and update attendance for assigned lectures only. |
| **Counselor** | View and edit attendance for all lectures within assigned division(s). |
| **HOD** | Full access across the system. |
| **Student** | View own attendance only. |

### 6.4 Attendance and Lateral / Direct Entry Students

- Attendance records are created **only from the student's entry semester onwards**.
- No attendance records are generated for semesters prior to the entry point.
- Attendance percentage calculations are based entirely on lectures conducted **after** their enrollment date in the ERP.

### 6.5 Design Notes

- Do **NOT** store raw time in attendance (use `timetable_id`).
- `date` is mandatory.
- Calculated attendance percentages must dynamically exclude cancelled sessions.

---

## 7. Marks Management System

### 7.1 Access & Entry Rules

| Role | Permission |
| --- | --- |
| **Faculty** | Enter marks for assigned subjects only. |
| **Counselor** | Edit all marks within their division. |
| **HOD** | Full override access across the system. |

### 7.2 Marks Storage Design

Marks are stored as simple atomic components.

**Theory Subject Components:**

- `internal_theory`
- `external_theory`

**Practical Subject Components:**

- `internal_theory`
- `external_theory`
- `internal_practical`
- `external_practical`

### 7.3 Calculation Logic (Dynamic)

**Theory Subjects:**

```
Total = internal_theory + external_theory
```

**Practical Subjects:**

```
Total = internal_theory + external_theory + internal_practical + external_practical
```

### 7.4 Marks and Lateral / Direct Entry Students

- Marks are entered **only for semesters from the entry point onwards**.
- Previous semester marks from the prior institution are stored as reference documents only and are **not part of the ERP's marks computation**.
- Grade calculations, pass/fail status, and semester reports are generated only for semesters processed by this system.

### 7.5 System Features & Validations

- Marks must not exceed defined maximums and cannot be negative.
- Duplicate entries for the same component are blocked.
- System automatically calculates totals, percentages, grades, and pass/fail status dynamically.
- **Design Principle:** Do **NOT** store totals, percentages, or grades in the database.

---

## 8. Student Dashboard

The student interface includes the following elements:

- Profile details
- Real-time Attendance %
- Timetable
- Requests Management
- Examination eligibility status and notifications
- Internal evaluation scores (V2 layer)
- Exam Seating *(Optional feature)*

> **For lateral/direct entry students:** The dashboard displays data only from the entry semester onwards. Semesters prior to the entry point are not shown in the attendance or marks views.

---

## 9. Student Request Module

### 9.1 Overview & Types

Allows students to submit formal requests (Leave, Late Entry, Bonafide Certificates, ID Issues, Examination Eligibility Appeals) to assigned faculty or administration.

### 9.2 Request Structure

| Field | Description |
| --- | --- |
| `subject` | Short title of the request |
| `description` | Detailed explanation |
| `request_type` | Leave, bonafide, eligibility appeal, etc. |
| `target_faculty_id` | Assigned faculty/counselor |
| `supporting_documents` | Attachments (for eligibility appeals) |

### 9.3 Flow & Status

- Submitted requests start as **Pending**.
- Authorized users review and transition status to **Approved** or **Rejected** (with optional remarks).
- Requests **cannot** be edited by the student post-submission.

### 9.4 Access Control

| Role | Permission |
| --- | --- |
| **Student** | Create and view own requests. |
| **Faculty** | View and act on requests assigned to them. |
| **Counselor** | View and act on requests within their division. |
| **HOD** | Full access to all requests. |

---

## 10. Timetable Module

### 10.1 Timetable Creation (Division Level)

Counselors create the timetable for their assigned divisions per semester.

**Example: `26BCADSDIV2` Schedule**

| Time | Monday | Tuesday | Wednesday |
| --- | --- | --- | --- |
| 09:00–10:00 | Java (Kajal Patel) | MIL (Priya Patel) | Java (Kajal Patel) |
| 10:00–11:00 | Mathematics (Priyanka P.) | Mathematics (Priyanka P.) | — |
| 11:00–12:00 | IOT (Bhavin Rabbari) | — | — |

### 10.2 Faculty Timetable (Auto-Generated)

Faculty schedules are generated automatically by filtering division timetables and include proxy lecture indicators.

**Example: Priya Patel's Schedule**

| Time | Monday | Tuesday | Wednesday |
| --- | --- | --- | --- |
| 09:00–10:00 | 26BCADSDIV2 (Java) | TYBCA DIV4 (IOT) | 26BCADSDIV2 (Java) |
| 10:00–11:00 | 26BCAAIDIV1 (C++) | 26BCAAIDIV1 (C++) | — |

### 10.3 Handling Clashes & Access

- Faculty schedule clashes are technically allowed but trigger a warning pop-up (dual card) during creation.
- Counselors manage their division's timetable; HODs have full control; Faculty and Students have view-only access.

### 10.4 Proxy Lecture Display

- Approved proxy lectures appear in the assigned proxy faculty's timetable with a **special highlight**.
- The highlight clearly displays:
  - Label: **Proxy Lecture**
  - Class name (e.g., `24BCAAI1`)
  - Original faculty name (e.g., *for Priya Mam*)
- This applies to both the daily dashboard view and the full timetable view.

---

## 11. Leave & Proxy Management Module

### 11.1 Overview

This module enables faculty members to apply for leave and mandates proxy assignment for every lecture that would be missed. It ensures no class is left unattended and maintains continuity of academic delivery.

---

### 11.2 Leave Request Flow

#### Step 1: Faculty Initiates Leave Request

- Faculty opens the Leave page and selects a leave date (e.g., 13 July — Monday).
- The system automatically fetches **all lectures assigned to that faculty on that day** based on the timetable.

#### Step 2: Proxy Assignment (Mandatory per Lecture)

- For each lecture slot, the faculty must assign a proxy faculty member.
- The system displays a **dropdown of only free faculty members** for that specific time slot — i.e., faculty who have no existing lecture, proxy duty, or supervision assignment during that slot.
- This step is repeated for all lectures on the leave day.
- The leave request **cannot be submitted** until all lectures have an assigned proxy.

#### Step 3: Submission

- Faculty submits the leave request along with:
  - Leave reason
  - Leave type (e.g., medical, personal, official)
  - Proxy assignments for all impacted lectures

#### Step 4: HOD Approval

- The submitted request goes to the HOD for review.
- HOD can:
  - **Approve** the request as-is with all selected proxies.
  - **Override** any proxy assignment and select a different faculty before approving.
  - **Reject** the request with remarks.

#### Step 5: Notification on Approval

- Once the HOD approves the request, all faculty members assigned proxy lectures receive **in-app and email notifications**.
- On the day of the leave, proxy lectures appear in the assigned faculty's dashboard and timetable with the proxy highlight as described in Section 10.4.

---

### 11.3 Rules & Constraints

- A proxy assignment is **mandatory** for every affected lecture — partial submission is not allowed.
- Only faculty who are **free during the specific slot** appear in the proxy dropdown.
- HOD override of proxy is tracked separately.
- Proxy lectures are **not counted as actual scheduled lectures** for attendance purposes — they inherit the original timetable entry.
- Cancelled classes during leave (if the HOD rejects and no proxy is found) follow the standard **"Drop Today's Class"** flow.
- Leave requests are **immutable** after HOD action.

---

### 11.4 Access Control

| Role | Permission |
| --- | --- |
| **Faculty** | Submit leave requests; view own leave history. |
| **HOD** | Approve, reject, or override proxy assignments for all requests. |
| **Counselor** | View leave status of faculty within their division (read-only). |
| **Student** | No access. |

---

## 12. Semester Management

### 12.1 Promotion (Bulk Action)

The HOD promotes students via a single bulk action. This updates:

- `semester_no` on the division (the division name itself does not change)
- Division (optional reassignment of individual students)
- Subjects mapped
- Faculty & counselor reassignment (generating new semester-based mappings)

### 12.2 Handling Lateral / Direct Entry in Semester Management

- Lateral and direct entry students are **not promoted backwards** — they enter the promotion cycle from their entry semester.
- When a bulk promotion occurs, lateral entry students (who joined at Sem 3) will be promoted to Sem 4, then Sem 5, and so on — exactly like regular students from that point forward.
- The system must correctly interpret the student's `entry_semester_no` when determining promotion eligibility.
- Historical semesters (before entry) remain absent from the student's academic record and do **not** affect promotion logic.

---

## 13. Examination Seating & Eligibility Management

### 13.1 Overview

This is a highly sensitive module that manages mid-semester and end-semester examination scheduling, student eligibility determination, seating arrangement generation, and faculty supervision assignment. All processes are automated with configurable rules.

---

### 13.2 Examination Scheduling

The HOD configures examinations by selecting:

- Academic year
- Classes / Divisions included
- Examination dates
- Minimum attendance eligibility percentage (e.g., 70%)

---

### 13.3 Eligibility Determination

- The system automatically calculates each student's attendance percentage up to the exam date.
- Students meeting the minimum attendance threshold are marked **Eligible**.
- Students below the threshold are marked **Ineligible**.
- Ineligible students receive **automatic notifications** informing them of their status and the reason (low attendance).

**HOD Dashboard Report:**

- Class A → 74 eligible students
- Class B → 79 eligible students
- Total eligible students for the year
- Overall grand total

---

### 13.4 Eligibility Appeal Process

- The HOD defines an **appeal submission deadline** (typically 2–3 days after eligibility notification).
- During this period, ineligible students may submit an appeal with:
  - Written explanation
  - Supporting documents (medical certificates, official letters, etc.)
- Appeals are reviewed by the **HOD or the class counselor**.
- If approved → student's eligibility status is updated to **Eligible**.
- If rejected → student remains **Ineligible**.
- Post-deadline, no further appeals are accepted.

---

### 13.5 Seating Arrangement Generation

After the appeal deadline closes, the system automatically generates the complete seating arrangement.

#### Classroom & Bench Structure

- Classrooms are identified by college-standard codes: `G1`, `G2` (Ground Floor), `F1`, `F2` (First Floor), `S1`, `S2`, etc.
- Each classroom contains individually managed benches in a **visual layout (BookMyShow-style)**.
- The bench layout is pre-configured in the system by the HOD.

#### Seating Allocation Rules

- Students are allocated seats in **sequential student ID order**.
- Ineligible students are **skipped** — the next eligible student fills the seat.

  *Example: Students 1, 2, 3 are placed. Student 4 is ineligible → Student 5 is placed next.*

#### Anti-Cheating Seating Rules

- Each bench can contain only **one student from the same semester**.
- If only one semester has exams, one student may occupy a bench.
- If **multiple semesters** have exams simultaneously, benches may contain combinations such as:
  - 1st semester + 3rd semester ✅
  - 1st semester + 1st semester ❌ (not allowed)
- The system enforces these rules automatically during arrangement generation.

---

### 13.6 Faculty Supervision Assignment

After seating is generated, the system automatically assigns faculty as examination supervisors.

#### Assignment Rules

- Faculty must be **free during the exam slot** (normal lectures are considered cancelled during examinations).
- Supervision **workload must be distributed fairly** across all available faculty.
- Faculty should **not repeatedly supervise the same class or room**.
- Supervision duties must **rotate across examination days**.

#### Balance Enforcement

The system targets balanced distribution:

- ✅ Faculty A → 3 duties, Faculty B → 3 duties
- ❌ Faculty A → 5 duties, Faculty B → 1 duty

---

### 13.7 Access Control

| Role | Permission |
| --- | --- |
| **HOD** | Full access — schedule exams, configure appeals, view all reports. |
| **Counselor** | Review and resolve eligibility appeals for their division. |
| **Faculty** | View supervision assignments. |
| **Student** | View own eligibility status, submit appeals, view seating (post-generation). |

---

## 14. Secure Internal Examination Paper Generation

### 14.1 Overview

This is a **highly sensitive** module managing the creation, secure storage, and randomized selection of internal examination question papers. The design eliminates human bias and prevents advance knowledge of which paper will be used.

---

### 14.2 Paper Upload Process

- When an internal examination is scheduled for a subject (e.g., *Deep Learning*), the ERP identifies **all unique faculty members teaching that subject**, regardless of how many divisions they handle.
- Each identified faculty member must **upload exactly two (2) question papers** for that subject.

  *Example: If Deep Learning is taught by 2 faculty → 4 papers total are uploaded.*

- Uploaded papers are **completely hidden** from everyone immediately upon upload — including other faculty members, counselors, and the HOD.
- No one can access or preview uploaded papers before the finalization step.

---

### 14.3 Final Paper Generation

- Just before the examination, the HOD triggers **"Generate Final Paper"**.
- This action requires **multi-factor secure verification**:
  - Admin password
  - OTP verification (via registered mobile/email)
  - Or both, as configured
- Upon successful verification, the ERP **randomly selects one paper** from all submitted papers for that subject.
- Randomization is system-generated and opaque to all users — no one knows in advance which paper will be selected.
- The selected paper is **immediately locked** and becomes the official examination paper.
- The system automatically calculates the **required print count** based on the number of eligible students appearing for that subject.

---

### 14.4 Rules & Constraints

- Faculty must upload exactly **2 papers** each. Submission is incomplete until both are uploaded.
- Papers are **encrypted at rest** and accessible only during the final generation step.
- The random selection algorithm must be **auditable** — the generation log records which paper was selected and when.
- Print count is auto-calculated and presented to the HOD immediately after selection.
- After selection, the paper is locked and **cannot be changed** by anyone, including the HOD.

---

### 14.5 Access Control

| Role | Permission |
| --- | --- |
| **Faculty** | Upload own papers for assigned subjects only; confirm upload status. |
| **HOD** | Trigger final paper generation with secure verification; view print count. |
| **Counselor** | No access. |
| **Student** | No access. |

---

## 15. Internal Evaluation Calculation System

### 15.1 Overview

This module provides a configurable internal evaluation engine. The HOD defines evaluation weightage ratios, and the system automatically calculates each student's final internal evaluation score. Two immutable result layers ensure data integrity and operational flexibility.

---

### 15.2 Weightage Configuration

The HOD configures evaluation components and their percentage weightages per subject or semester.

**Example configuration:**

| Component | Weightage |
| --- | --- |
| Mid-Semester Examination | 70% |
| Attendance | 15% |
| Assignments | 15% |
| **Total** | **100%** |

- Different subjects or semesters can use **different evaluation patterns**.
- Weightage configurations are stored per subject + semester combination.
- The system validates that all component percentages sum to **100%** before saving.

---

### 15.3 Evaluation Components

| Component | Source |
| --- | --- |
| Mid-Semester Examination | Marks entered via Marks Management Module |
| Attendance | Calculated dynamically from Attendance Module |
| Assignments | Entered separately by faculty |

---

### 15.4 Calculation Logic

```
Internal Score = (Mid-Sem Marks / Mid-Sem Max) × 70
              + (Attendance % / 100) × 15
              + (Assignment Marks / Assignment Max) × 15
```

*(Using the example weightage above. Actual formula adjusts to configured weights.)*

---

### 15.5 Two-Layer Result System

#### V1 — Immutable Evaluation Layer

- The **original weighted evaluation** generated directly from configured rules and actual student data.
- **Permanently locked** immediately upon generation.
- **Cannot be modified** by anyone — faculty, counselor, or HOD.
- Acts as the **official source of truth** for audits, verification, and historical accuracy.

#### V2 — Operational / Published Result Layer

- Any **grace marks, moderation, rounding adjustments, or manual corrections** are applied exclusively in V2.
- V1 remains completely **untouched** regardless of V2 changes.
- **Students see V2** — this is the published result layer.
- Final grade sheets and reports use V2.
- V1 is preserved for **integrity and audit purposes only**.

---

### 15.6 Rules & Constraints

- V1 generation is a **one-time, irreversible action** per student per subject per semester.
- V2 always references a V1 record — V2 cannot exist without V1.
- If no manual adjustments are made, V2 defaults to V1 values.
- All V2 modifications are tracked with `modified_by` and `modified_at`.
- **Design Principle:** Do NOT overwrite V1 under any circumstances.

---

### 15.7 Access Control

| Role | Permission |
| --- | --- |
| **HOD** | Configure weightage; trigger V1 generation; apply V2 adjustments. |
| **Counselor** | View V1 and V2 for their division; apply V2 adjustments (if permitted by HOD). |
| **Faculty** | View own subject results for assigned divisions. |
| **Student** | View V2 (published result) only. |

---

## 16. Reports & Analytics

The system can generate:

- Student-wise academic/attendance reports
- Division performance metrics
- Overall attendance reports
- Category / Gender analytics
- Final evaluation reports (V2 layer)
- Internal evaluation summary (V1 vs V2 delta reports for auditors)
- Examination eligibility and appeal summary reports
- Faculty supervision duty reports
- Leave and proxy activity reports

> **Note for Lateral / Direct Entry Students:** All generated reports reflect only the semesters processed by this system. Reports clearly indicate the student's entry type and entry semester so reviewers are aware that prior-semester data originates from an external institution.

---

## 17. System Rules (Critical Summary)

- Role-based access is strictly enforced across all modules.
- Data changes must be tracked (audit logs required).
- **Students do not self-register.** All student onboarding is HOD-driven via CSV upload.
- Division is created by HOD before any student upload. Division names are permanent — only `semester_no` updates internally.
- Student IDs and Division numbers are globally incremental per batch year — sequence does not reset per specialization.
- The system auto-assigns division numbers; HOD does not pick them manually.
- Student ID is the permanent login username. Password is self-set via email invite.
- Student specialization is locked after admission — no transfers allowed.
- All assignments are semester-scoped; historical data is preserved and never overwritten.
- All academic records (attendance, marks, timetable, assignments) **MUST** carry a `semester_id` reference.
- Lateral entry students join at Semester 3; direct entry students join at Semester 5. Both use the same CSV upload flow.
- No academic data (attendance, marks, timetable) is generated for semesters prior to a student's entry semester.
- The `entry_type` and `entry_semester_no` fields are mandatory for all non-fresh-admission students and must be stored on the student profile.
- ERP first-time setup for existing students uses the same HOD CSV upload flow — no special registration path exists.
- Leave requests require proxy assignment for **every** impacted lecture before submission.
- Only faculty free during a specific slot appear in the proxy assignment dropdown.
- Examination question papers are encrypted at rest; no one can view uploaded papers until final generation.
- V1 evaluation results are permanently immutable. All adjustments (grace marks, moderation) are applied in V2 only.
- Examination seating enforces anti-cheating rules — no two students from the same semester may share a bench.
- Faculty supervision duty must be distributed equitably and rotated across examination days.

---

## 18. Audit Logs Module

### 18.1 Overview

The Audit Logs Module records important system actions to ensure **traceability and accountability**.

### 18.2 Purpose

- Track user activities.
- Maintain history of critical changes.
- Support monitoring and debugging.

### 18.3 Logged Actions

The system logs actions including:

- Student CSV upload (division, count, uploaded by)
- Password invite sent / resent
- Attendance marked or updated
- Marks entered or modified
- Timetable changes
- Request approval/rejection
- User and role updates
- Lateral/direct entry student registration
- Division creation and semester promotion
- Faculty leave request submitted, approved, rejected, or proxy overridden
- Examination scheduled, eligibility computed, appeal resolved
- Examination seating arrangement generated
- Examination paper uploaded, final paper generated and locked
- Internal evaluation V1 generated (immutable event)
- Internal evaluation V2 modified (with reason)

### 18.4 Rules

- Logs are created for **CREATE, UPDATE, DELETE, APPROVE** actions.
- Logs are **immutable** (cannot be edited or deleted).
- Logging must be **lightweight**.
- Do not store sensitive data (e.g., passwords, paper file contents).

#### Attendance Logging Rule (Important)

- Attendance logging must be **per lecture (class), not per student**.
- Only **one log entry** is created for:
  - Marking attendance for a class
  - Updating attendance for a class

**Example:**

```
"Attendance marked for 26BCADSDIV2 - Java on 2026-04-13"
```

### 18.5 Access Control

| Role | Permission |
| --- | --- |
| **HOD** | Full access |
| **Counselor** | Limited access *(optional)* |
| **Faculty** | No access |

### 18.6 Design Notes

- Logs are stored in a **separate table**.
- Logging should not affect main operations.
- Avoid excessive logs by logging **meaningful actions only**.

---

*End of Software Requirements Specification*