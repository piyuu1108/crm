# ERP Audit Logging Implementation Plan

This implementation plan details the strategy for integrating a comprehensive, decoupled, and highly performant audit logging system across the ERP workspace.

---

## 1. Objectives & Guidelines

* **Comprehensive Auditing**: Every data-modifying (`POST`, `PUT`, `PATCH`, `DELETE`) route representing a business-level action must be captured in the logs.
* **Compact JSON Format**: Logs use storage-efficient, shortened keys suitable for structured logging pipelines (e.g. Axiom, Datadog).
* **Decoupled Architecture**: Log collection is encapsulated in a central helper class `AuditLogger`. The route handlers call simple API methods, insulating them from future transport changes.
* **Traceability & Diagnostics**: Every tracked request generates or forwards a unique `Trace ID` (UUID), calculates its processing duration automatically, and attaches the Trace ID to response headers for client debugging.
* **Robust Error Path Auditing**: Any exceptions thrown inside the handlers must be caught, recorded with level `error`, and gracefully returned to the user without masking original details.

---

## 2. Standardized Compact JSON Schema

Audit logs outputted to `console.log` follow this precise schema structure:

```json
{
  "ts": "ISO-Date String",
  "lvl": "info | warn | error",
  "tid": "UUID (Trace ID)",
  "env": "prod | dev",
  "evt": {
    "act": "noun.verb (e.g., circulars.create)",
    "cat": "category_name (e.g., circulars)",
    "s": 1 | 0,
    "dur": 150
  },
  "usr": {
    "uid": "user_id",
    "rl": "active_role",
    "cid": "tenant_id / course_id"
  },
  "req": {
    "m": "POST | PUT | PATCH | DELETE",
    "p": "/api/...",
    "code": 200,
    "ip": "1.1.1.1"
  },
  "biz": {
    "sum": "Human readable summary of the event",
    "did": "division_id",
    "what": "target_entity_type",
    "eid": "target_entity_id"
  }
}
```

### Business Context Shortened Keys inside `biz`
To maintain storage efficiency, dynamic payload details will use abbreviated keys in the `biz` object:
* `sid`: Student ID
* `fid`: Faculty ID
* `sub`: Subject Code/ID
* `exid`: Exam ID
* `reqid`: Request ID
* `err`: Error Message
* `recs`: Record count / updated counts

---

## 3. Central Service Architecture: `AuditLogger`

We will create a centralized helper file `app/lib/audit-logger.ts` containing the `AuditLogger` and `AuditTracker` classes.

### How to use `AuditTracker` inside API Route Handlers

API route handlers will use a uniform try-catch pattern to perform automatic duration calculations and ensure consistent logging:

```typescript
import { AuditLogger } from "@/app/lib/audit-logger";

export async function POST(req: NextRequest) {
  // 1. Authenticate user
  const auth = await requirePermission(req, "circulars.create");
  if (auth instanceof NextResponse) return auth;

  // 2. Initialize the audit tracker
  const audit = AuditLogger.start(req, auth, {
    action: "circulars.create",
    category: "circulars",
    summary: "Creating a new circular",
    entityType: "circular"
  });

  try {
    const body = await req.json();
    // ... business logic ...
    
    // 3. Mark success and return the response
    const data = { id: newCircular.id };
    return audit.success(NextResponse.json({ success: true, data }), { eid: String(newCircular.id) });
  } catch (error) {
    // 4. Mark failure and return an error response
    return audit.error(error);
  }
}
```

---

## 4. API Routes to Receive Audit Logging

We will audit all data-modifying endpoints. The table below outlines the specific endpoints and their mapping parameters:

| Route Pattern | Method | Action Name (`evt.act`) | Category (`evt.cat`) | Entity Type (`biz.what`) | Business Summary & Context Keys |
| :--- | :---: | :--- | :--- | :--- | :--- |
| `/api/faculty/circulars` | POST | `circulars.create` | `circulars` | `circular` | "Created new circular" |
| `/api/faculty/circulars/[slug]` | PUT | `circulars.update` | `circulars` | `circular` | "Updated circular metadata" (`slug`) |
| `/api/faculty/circulars/[slug]` | DELETE | `circulars.delete` | `circulars` | `circular` | "Deleted circular" (`slug`) |
| `/api/requests` | POST | `requests.create` | `requests` | `student_request` | "Submitted student request" |
| `/api/requests/[id]` | PATCH | `requests.review` | `requests` | `student_request` | "Faculty reviewed student request" (`status`, `remarks`, `sid`) |
| `/api/attendance/save` | POST | `attendance.save` | `attendance` | `attendance_ledger` | "Saved student attendance records" (`recs`, `did`) |
| `/api/attendance/sessions` | POST | `attendance.session.create` | `attendance` | `attendance_ledger` | "Created new attendance session" (`did`, `sub`) |
| `/api/internal-exams/marks` | POST | `marks.save` | `exams` | `exam_marks` | "Uploaded/updated internal exam marks" (`recs`, `exid`) |
| `/api/internal-exams/marks/visibility` | PUT | `marks.visibility.toggle` | `exams` | `exam_marks` | "Toggled internal exam marks visibility" (`exid`, `status`) |
| `/api/internal-exams` | POST | `exams.create` | `exams` | `internal_exam` | "Created new internal exam schedule" |
| `/api/internal-exams/[id]` | PUT | `exams.update` | `exams` | `internal_exam` | "Updated internal exam details" |
| `/api/internal-exams/[id]` | DELETE | `exams.delete` | `exams` | `internal_exam` | "Deleted internal exam schedule" |
| `/api/internal-evaluation` | POST | `evaluation.generate` | `evaluation` | `internal_evaluation` | "Generated internal evaluations" (`recs`) |
| `/api/internal-evaluation/finalize` | PUT | `evaluation.finalize` | `evaluation` | `internal_evaluation` | "Finalized internal evaluations" (`recs`) |
| `/api/student/profile/submit` | POST | `profile.student.submit` | `profile` | `student_profile` | "Submitted student profile details" |
| `/api/student/profile` | PUT | `profile.student.update` | `profile` | `student_profile` | "Updated student profile details" |
| `/api/faculty/profile/submit` | POST | `profile.faculty.submit` | `profile` | `faculty_profile` | "Submitted faculty profile details" |
| `/api/faculty/profile` | PUT | `profile.faculty.update` | `profile` | `faculty_profile` | "Updated faculty profile details" |
| `/api/admin/divisions` | POST | `divisions.create` | `admin` | `division` | "Created new division" |
| `/api/admin/divisions/[id]` | PUT | `divisions.update` | `admin` | `division` | "Updated division details" |
| `/api/admin/faculty` | POST | `faculty.create` | `admin` | `faculty` | "Created new faculty account" |
| `/api/admin/faculty/[id]` | PUT | `faculty.update` | `admin` | `faculty` | "Updated faculty metadata" |
| `/api/admin/subjects` | POST | `subjects.create` | `admin` | `subject` | "Created new subject" |
| `/api/admin/subjects/[id]` | PUT | `subjects.update` | `admin` | `subject` | "Updated subject parameters" |
| `/api/admin/subject-assignments` | POST | `assignments.subject.create` | `admin` | `subject_assignment` | "Assigned subject to faculty" |
| `/api/admin/promotion` | POST | `students.promote` | `admin` | `student` | "Bulk promoted students to next semester" (`recs`) |
| `/api/counselor/divisions/[id]/students` | POST | `students.create` | `counselor` | `student` | "Counselor created student account" |
| `/api/admin/faculty/send-password-email` | POST | `faculty.email.invite` | `admin` | `faculty` | "Sent single password setup invite" |
| `/api/admin/faculty/send-password-email/bulk` | POST | `faculty.email.invite_bulk` | `admin` | `faculty` | "Triggered bulk password invites" (`recs`) |
| `/api/counselor/divisions/[id]/students/send-password-email` | POST | `students.email.invite` | `counselor` | `student` | "Sent password setup email to student" |
| `/api/counselor/divisions/[id]/students/send-password-email/bulk` | POST | `students.email.invite_bulk` | `counselor` | `student` | "Triggered bulk password setup emails" (`recs`) |
| `/api/classes` | POST | `classrooms.create` | `classes` | `classroom` | "Created new classroom" |
| `/api/classes/[slug]` | PUT | `classrooms.update` | `classes` | `classroom` | "Updated classroom metadata" |
| `/api/classes/[slug]/layout` | PUT | `classrooms.layout.update` | `classes` | `classroom` | "Updated classroom seating benches layout" |
| `/api/approvals/submit` | POST | `approvals.submit` | `approvals` | `faculty_request` | "Submitted faculty leave/WFH request" |
| `/api/approvals/action` | POST | `approvals.action` | `approvals` | `faculty_request` | "HOD/Principal actioned faculty request" (`status`, `fid`) |

---

## 5. Phased Integration Plan

1. **Phase 1: Create Central Helper**
   * Write `app/lib/audit-logger.ts`.
   * Standardize typing interface and class structure.
   
2. **Phase 2: Integrate Core Workflow Routes**
   * Add to `/api/requests/[id]` (approval/rejection) and `/api/requests` (request submissions).
   * Add to `/api/faculty/circulars` and sub-routes.
   
3. **Phase 3: Integrate Academic & Grading Routes**
   * Add to `/api/attendance/save` and `/api/attendance/sessions`.
   * Add to `/api/internal-exams/marks` and `/api/internal-exams/marks/visibility`.
   * Add to `/api/internal-evaluation` and `/api/internal-evaluation/finalize`.

4. **Phase 4: Integrate Administrative & User Management Routes**
   * Add to `/api/admin/promotion`, `/api/admin/faculty`, `/api/admin/divisions`, `/api/admin/subjects`, and `/api/admin/subject-assignments`.
   * Add to email invite triggers for both student and faculty invite systems.
   * Add to `/api/classes` and seating configuration endpoints.
   * Add to `/api/approvals/submit` and `/api/approvals/action`.

5. **Phase 5: Consistency Audit & Validation**
   * Remove any inconsistent historical `console.log` statements in modified routes.
   * Verify all logs adhere to the compact structure.
