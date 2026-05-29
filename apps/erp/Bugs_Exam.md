# Exam Wizard Bug-Fix Implementation Plan

---

## BUG 1 — Step 2 Summary Shows Incorrect Data

**Root Cause:** The Step 2 frontend (`step2-target-scope.tsx`) fetches divisions from `/api/admin/divisions?limit=500`. This API requires `admin.divisions` permission — not `exams.manage`. The HOD role may have `exams.manage` but the divisions endpoint uses a different permission gate. Additionally, the divisions API returns `studentCount` as a subquery count, but the frontend maps it as `d.studentCount || 0` — this works only if the response key matches. The real issue is the data mapping in the `useMemo`:

- Line 70-78: `divisionsData.divisions` maps `d.studentCount` — but the API returns it via SQL alias `student_count` which Drizzle serializes as `studentCount`. This should work.
- **Actual root cause**: The `/api/admin/divisions` endpoint scopes to `courseId` via `requireCourseId()`. If the HOD has no `courseId` in session, the WHERE clause is empty and returns ALL divisions across all courses — or returns nothing.
- The summary panel shows `summary.totalStudents` which sums `d.studentCount`. If the fetch fails silently (permission error), `divisionsData` is `undefined`, and `divisions` array is empty → `totalStudents = 0`, `divisionCount = 0`.
- The `00000000000` placeholder likely comes from the `studentCount` being displayed without proper data — possibly a rendering issue where the value is `undefined` and falls through.

**Affected Files:**
- `step2-target-scope.tsx` lines 53-66 (fetch), lines 68-79 (mapping), lines 258-289 (summary panel)
- `/api/admin/divisions/route.ts` (permission gate, response shape)

**Fix Plan:**
1. Step 2 should NOT call `/api/admin/divisions`. Instead, create a dedicated endpoint `/api/exam-wizard/[id]/scope-data` (or a query-param mode on the existing wizard route) that returns active divisions filtered by the HOD's courseId, using `exams.manage` permission.
2. The new endpoint should return: `id`, `displayName`, `semesterNo`, `batchYear`, `specialization`, `studentCount` (via subquery), `yearLabel` (computed as `Math.ceil(semesterNo/2)`).
3. Fix the summary panel to display `summary.divisionCount` (currently correct) and `summary.totalStudents` (needs the new endpoint to return proper counts).
4. Fix "Years Included" chips — currently uses `summary.years` which maps from `selectedDivs.map(d => d.yearLabel)`. This works IF `yearLabel` is correctly derived. Verify the mapping.

**Testing:**
- Create exam → go to Step 2 → verify divisions load
- Select divisions → verify summary panel shows correct student count, division count, and year chips
- Save and reload → verify selections persist

---

## BUG 2 — Step 4 Shows Every Subject in System

**Root Cause:** Step 4 (`step4-subjects.tsx`) line 58 calls `/api/subjects?divisionIds=1,2,3`. But the `/api/subjects/route.ts` GET handler does NOT read `divisionIds` from query params. It uses role-based filtering:
- HOD branch (line 119-169): queries ALL subjects where `courseId` matches — ignoring divisionIds entirely.
- The endpoint returns every subject in the course, not just those assigned to the selected exam scope divisions.

**Affected Files:**
- `step4-subjects.tsx` lines 55-66 (fetch call)
- `/api/subjects/route.ts` lines 119-169 (HOD branch — no divisionIds filter)

**Fix Plan:**
1. Create a new endpoint: `GET /api/exam-wizard/[id]/available-subjects` that:
   - Reads the exam's saved scopes (`exam_scopes` → `division_id`)
   - Fetches `faculty_subject_assignments` for those division IDs (joined with current semester)
   - Joins `subjects` table to get `code`, `shortCode`, `name`, `subjectType`, `credit`, `semester`
   - Deduplicates by `subject.id`, aggregating `divisionName` as an array
   - Returns only subjects linked to selected divisions
2. Update `step4-subjects.tsx` to call this new endpoint instead of `/api/subjects?divisionIds=...`
3. The response shape must include: `id`, `name`, `code`, `shortCode`, `subjectType`, `credit`, `semester`, `divisionNames[]`

**Testing:**
- Select 2 divisions in Step 2 → save → go to Step 4 → verify only subjects from those 2 divisions appear
- Verify deduplication: same subject in 2 divisions appears once with 2 assignment chips
- Verify credit and semester are displayed per subject row

---

## BUG 3 — Duration Configuration Missing

**Root Cause:** The duration `Select` dropdown in `step4-subjects.tsx` lines 236-258 renders only when `isSelected` is true. The Select component uses:
```tsx
selectedKey={String(selectedSubjects.get(sub.subjectId) || 60)}
onSelectionChange={(key) => setDuration(sub.subjectId, parseInt(String(key)))}
```

This should work IF the Select renders. The issue is likely that the Select is rendering but may have a HeroUI v3 API issue — specifically, the `className="w-32 shrink-0"` on Select might not be sizing it properly, or the `Select.Trigger` with `className="h-8 text-xs"` may be collapsing.

**However**, the more critical issue is that the duration value is saved in the payload but the Zod schema (`ExamSubjectItemSchema`) has `durationMinutes: z.number().int().min(15).max(360).default(60)`. If the frontend sends `durationMinutes` as a string (from Select's `key` which is always string), Zod will reject it because `z.number()` does not coerce strings. This would cause Step 4 save to fail silently.

**Affected Files:**
- `step4-subjects.tsx` lines 126-148 (save handler, payload construction)
- `app/lib/validations/schemas/exam-wizard.ts` line 48 (`durationMinutes` schema)
- `step4-subjects.tsx` lines 236-258 (duration Select UI)

**Fix Plan:**
1. In `exam-wizard.ts` schema line 48, change `z.number()` to `z.coerce.number()` for `durationMinutes` — OR ensure frontend sends `parseInt()` (which it already does at line 241, but double-check the save payload at line 134).
2. Verify the payload at line 134 sends `durationMinutes` as a number (it reads from the Map which stores `number` values — looks correct).
3. Verify the Select UI actually renders and is functional by testing in browser.
4. Add `z.coerce.number()` to `subjectId` in `ExamSubjectItemSchema` too, since it comes from a Map key which could be a string.

**Testing:**
- Select a subject → verify duration dropdown appears
- Change duration to "2 Hours" → verify it sticks
- Save → verify API returns success (check Network tab for 400 errors)

---

## BUG 4 — Credit and Semester Not Displayed

**Root Cause:** The `GET /api/exam-wizard/[id]` route (lines 89-107) enriches exam subjects with subject master data. It fetches `subjects` table and maps `credit` and `semester`:
```ts
credit: sub?.credit || 0,
semester: sub?.semester || 0,
```

This should work. But the issue is on the frontend — the enriched subjects are typed as `ExamSubjectItem` in `exam-wizard.ts` (lines 45-56). This type includes `credit` and `semester` fields. The Step 4 UI at lines 213-215 displays them:
```tsx
<span>Credit: {sub.credit}</span>
<span>Sem {sub.semester}</span>
```

But this only shows for `uniqueSubjects` (the fetched available subjects), NOT for the saved subjects. The saved `ExamSubjectItem` from the API includes these fields. The available subjects from `/api/subjects` might not include `credit` and `semester` (the HOD branch at line 121-135 does select `subjects.id`, `code`, `name`, `subjectType` but does NOT select `credit` or `semester`).

**Affected Files:**
- `/api/subjects/route.ts` lines 121-135 (HOD select — missing `credit`, `semester`, `shortCode`)
- `step4-subjects.tsx` lines 71-95 (dedup mapping — reads `s.credit`, `s.semester`)

**Fix Plan:**
1. This is resolved by Bug 2 fix — the new `/api/exam-wizard/[id]/available-subjects` endpoint will return `credit` and `semester` from the `subjects` table.
2. Alternatively, if keeping the existing `/api/subjects` endpoint, add `credit: subjects.credit` and `semester: subjects.semester` and `shortCode: subjects.shortCode` to the HOD select at line 121-135.

**Testing:**
- Go to Step 4 → verify each subject row shows "Credit: X" and "Sem Y"
- Verify shortCode appears in the code chip

---

## BUG 5 — Eligibility Page Missing Approval Date

**Root Cause:** The docs specify three fields per year: Minimum Attendance (slider), Allow Approval Override (toggle), and **Approval Last Date** (date picker). The current implementation in `step3-eligibility.tsx` has all three — lines 164-169 (Switch), lines 173-186 (date input shown when `allowApprovalOverride` is true). However, the docs also require **Eligibility Indicators**:
```
Estimated Eligible: 420
Need Approval: 62
Blocked Students: 38
```
These are NOT implemented.

**Current gap analysis:**
1. **Approval Date**: ✅ Implemented (line 179 `<input type="date">`) but only shown when toggle is on — per spec, this is correct behavior.
2. **Eligibility Indicators (Estimated Eligible, Need Approval, Blocked)**: ❌ NOT implemented. These require querying attendance data for students in selected divisions and comparing against the `minAttendancePercent` threshold.
3. **Approval Date in Review (Step 7)**: Need to verify Step 7 displays approval deadline per year.
4. **Schema/DB**: `approvalDeadline` column exists in `exam_eligibility_rules` table (DATE type). Zod schema has `approvalDeadline: DateStringSchema.optional().or(z.literal(""))`. API saves it as `r.approvalDeadline || null`. This is correct.
5. **Load on edit**: The `useEffect` at line 46-57 hydrates from `rules` prop. The `approvalDeadline` field maps from `existing?.approvalDeadline ?? ""`. This works.

**Affected Files:**
- `step3-eligibility.tsx` — missing eligibility indicator section
- No API exists to calculate eligible/need-approval/blocked counts based on attendance
- `step7-review.tsx` — verify approval deadline is shown

**Fix Plan:**
1. Add an eligibility stats section below each year card showing "Estimated Eligible", "Need Approval", "Blocked" counts.
2. Create endpoint or extend scope-data to return attendance summary per division (total students, students meeting threshold, students below threshold but within override window).
3. For now, since attendance analytics may not exist in sufficient detail, show the indicators as "—" with a note "Calculated after attendance sync" to avoid blocking the workflow.
4. Verify Step 7 Review displays approval deadline for each year that has override enabled.

**Testing:**
- Go to Step 3 → set 75% for Year 1 → verify slider shows 75%
- Enable override → verify date picker appears
- Set date → save → reload → verify date persists
- Check Step 7 → verify eligibility summary shows rules and deadlines

---

## BUG 6 — Cannot Save Step 4 / Navigation Blocked

**Root Cause (HIGH PRIORITY):** Step 4 save (`handleSave` at line 126-148) calls `saveMutation.mutateAsync(payload)` where payload is:
```js
{ subjects: [{ subjectId, durationMinutes }] }
```

The `useSaveStepMutation(examId, "subjects")` calls `PUT /api/exam-wizard/${examId}/subjects`. The API at `subjects/route.ts` validates with `ExamWizardStep4Schema` which expects:
```
{ subjects: [{ subjectId: number, durationMinutes: number }] }
```

**Potential failure points:**
1. **`/api/subjects?divisionIds=...` returns no data** (Bug 2) → `uniqueSubjects` is empty → user can't select anything → can't save
2. **Permission mismatch**: Step 4's fetch uses `/api/subjects` which requires `subjects.view_course` or `subjects.view_own` — NOT `exams.manage`. If the HOD doesn't have `subjects.view_course`, the fetch fails → no subjects → can't save.
3. **Zod validation failure**: If `subjectId` is coming from a Map key that's a number but gets serialized oddly, Zod's `IdSchema` (which is `z.number().int().positive()`) would reject it if it's a string.
4. **The `divisionIds` query param is ignored** — so even if subjects load, they're ALL course subjects (Bug 2), and the user might select subjects that don't belong to any scoped division. This shouldn't prevent save though.

**The actual blocker is most likely Bug 2** — if `/api/subjects?divisionIds=X` fails (permission error or returns wrong shape), `uniqueSubjects` is empty, and the save button is disabled (`isDisabled={selectedSubjects.size === 0}`).

**Affected Files:**
- `step4-subjects.tsx` lines 55-66 (fetch)
- `/api/subjects/route.ts` (permission gate)
- `exam-wizard.ts` schema validation
- `create/page.tsx` line 90-93 (`canNavigateTo` — blocks navigation to step 5 if `completedStep < 4`)

**Fix Plan:**
1. Fix Bug 2 first (create proper endpoint for exam subjects).
2. Verify Zod schema uses `z.coerce.number()` where needed.
3. Add error boundary/toast in Step 4 if the fetch fails so the user sees why.
4. After save succeeds, verify `completedStep` is updated to >= 4 so navigation to Step 5 is unlocked.
5. Test the full flow: select subjects → set durations → save → verify Step 5 accessible.

**Testing:**
- Open browser DevTools Network tab → go to Step 4
- Verify the API call returns 200 with subjects
- Select 2 subjects, set durations → click Save
- Verify PUT request succeeds (200)
- Verify "Next" button becomes enabled
- Click Next → verify Step 5 loads

---

## BUG 7 — Full Create Flow Audit

### Step 1 (Basic Details)
- **Doc fields**: Exam Name, Exam Number, Description, Academic Year (auto-selected), Exam Type
- **Implementation**: `step1-basic-details.tsx` — has all fields
- **Gap**: "Academic Year" field should be auto-selected from active semester but no visible display of current academic year. The `academicYearId` is not shown in the UI — it's optional in the schema and the API defaults it to null. Need to auto-resolve and display it.
- **Issue**: `createdByFacultyId` is `.notNull()` in schema but the API sets it from `auth.userId`. If `userId` maps to a different table (users vs faculty), this could fail on insert.

### Step 2 (Target Scope)
- **Doc requirement**: "Display only active running classes" — current impl fetches all divisions (no active filter). Need `isActive` or status filter.
- **Doc requirement**: DataTable with columns: Class Names, Semester, Student Count, Year Label — current impl uses checkbox cards, not a DataTable. Acceptable UX difference but missing columns.
- **Doc requirement**: "Unique Subjects: 23" in summary — NOT implemented. Summary only shows Target Students, Selected Divisions, Years. Need to add unique subject count by querying `faculty_subject_assignments` for selected divisions.
- **Gap**: The division data is fetched from admin endpoint with wrong permissions (see Bug 1).

### Step 3 (Eligibility)
- **Doc requirement**: Eligibility Indicators (Estimated Eligible, Need Approval, Blocked) — NOT implemented.
- **Fields**: All three fields exist (attendance %, override toggle, approval date).
- **Gap**: No real-time attendance calculation.

### Step 4 (Subjects)
- **Doc requirement**: Table columns: Select, Code, Short Name, Subject Name, Semester, Credit, Assignments, Duration — current impl shows all except "Assignments" column uses `divisionNames` which may be empty (Bug 2).
- **Doc requirement**: "Remaining Subjects" in summary — ✅ implemented.
- **Major bug**: Wrong data source (Bug 2), causing empty list or all-course subjects.

### Step 5 (Schedule)
- **Doc requirement**: Left Side date list + Calendar view, Right Side time slot management — current impl has a simpler date+time row builder. No calendar view.
- **Doc requirement**: Multi-subject same slot for different years — current impl allows one subject per schedule slot (`examSubjectId` is singular). The schema `exam_schedules` has a unique index on `(exam_id, exam_subject_id)` — one schedule per subject. But the doc says multiple subjects can share the same time slot (e.g., FY Maths + SY DBMS at 9:30 AM). This IS supported since each subject gets its own row with the same date/time.
- **Doc requirement**: Conflict prevention (block duplicate scheduling) — need to verify UI prevents scheduling same subject twice.
- **Gap**: No timeline visualization.

### Step 6 (Hall Allocation)
- **Doc requirement**: Room Name, Capacity, Bench Capacity, Estimated Filled %, Remaining Seats — current impl shows these via `classrooms` and `classroomBenches` queries.
- **Gap**: "Estimated Filled Percentage" requires knowing total eligible students — this comes from Step 2 scopes' student counts. Need to pass `summary.totalStudents` to the hall allocation view.
- **Gap**: Warning states (seats still required, room unavailable) — partially implemented.

### Step 7 (Review & Publish)
- **Doc requirement**: Final Actions: Save Draft, Publish Exam, Generate Seating, Generate Timetable PDF — current impl only has Publish. Missing: Generate Seating, Generate Timetable PDF buttons.
- **Gap**: Verify all summary sections display correctly with data from all previous steps.

### Data Persistence Between Steps
- **Pattern**: Each step does atomic `DELETE + INSERT` in a transaction, then updates `completedStep` via `GREATEST()`. This ensures idempotency.
- **Issue**: Going back to Step 2 and changing divisions should cascade-invalidate Steps 3-6 (eligibility rules for removed years, subjects from removed divisions, schedules for removed subjects). Currently, Step 2 save only deletes/re-inserts scopes — it does NOT cascade to eligibility, subjects, or schedules. This means stale data persists.

### Page Refresh Behavior
- URL params `?examId=X&step=Y` are synced. On refresh, `useExamWizardDetailQuery(examId)` reloads all data. This should work correctly.

### Edit Mode / Draft Recovery
- Clicking "Continue Setup" from listing passes `?examId=X`. The wizard loads the draft and jumps to `completedStep + 1`. This works.
- **Gap**: No confirmation dialog when navigating away with unsaved changes.

---

## Priority Order for Fixes

1. **P0 — Bug 6/2/3 (Step 4 blocked)**: Create `/api/exam-wizard/[id]/available-subjects` endpoint, fix Step 4 to use it, verify save flow works end-to-end.
2. **P0 — Bug 1 (Step 2 data)**: Create `/api/exam-wizard/[id]/scope-data` or fix Step 2 to use proper permission-scoped division endpoint.
3. **P1 — Bug 4 (Credit/Semester)**: Resolved by P0 fix — new endpoint includes these fields.
4. **P1 — Bug 5 (Eligibility indicators)**: Add placeholder indicators, wire up approval date display in Step 7.
5. **P1 — Cascade invalidation**: When Step 2 scope changes, cascade-clean Steps 3-6 stale data.
6. **P2 — Step 7 actions**: Add Generate Seating and Generate Timetable PDF buttons (can be stubs initially).
7. **P2 — Step 2 summary "Unique Subjects" count**: Query and display.
8. **P3 — Academic Year auto-display in Step 1.

---

## Dependency Map

```
Bug 2 fix (new subjects endpoint)
  └─→ Bug 3 fix (duration saves correctly)
  └─→ Bug 4 fix (credit/semester displayed)
  └─→ Bug 6 fix (Step 4 save unblocked → Step 5+ accessible)

Bug 1 fix (scope-data endpoint)
  └─→ Bug 7 Step 2 summary fix

Bug 5 fix (eligibility indicators)
  └─→ Standalone, no dependencies
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `app/api/exam-wizard/[id]/available-subjects/route.ts` | **CREATE** — new endpoint for Step 4 subjects |
| `app/api/exam-wizard/[id]/scope-data/route.ts` | **CREATE** — new endpoint for Step 2 divisions |
| `step2-target-scope.tsx` | **MODIFY** — use new scope-data endpoint, add "Unique Subjects" to summary |
| `step4-subjects.tsx` | **MODIFY** — use new available-subjects endpoint |
| `step3-eligibility.tsx` | **MODIFY** — add eligibility indicator section |
| `step7-review.tsx` | **MODIFY** — verify approval deadlines shown, add action buttons |
| `app/lib/validations/schemas/exam-wizard.ts` | **MODIFY** — add `z.coerce.number()` where needed |
| `app/api/exam-wizard/[id]/scope/route.ts` | **MODIFY** — cascade-clean downstream data when scope changes |

---

## End-to-End Verification Checklist

- [ ] Step 1: Create draft → verify examId assigned, URL updated, step 2 accessible
- [ ] Step 2: Load divisions (correct course, active only) → select → verify summary (students, divisions, years) → save → reload → verify selections persist
- [ ] Step 3: Load year cards from Step 2 scopes → set attendance %, enable override, set deadline → save → reload → verify all values persist
- [ ] Step 4: Load only scoped subjects with credit/semester → select subjects, set durations → save → verify success → step 5 accessible
- [ ] Step 5: Load selected subjects → add date/time slots → assign subjects → save → verify no duplicates allowed
- [ ] Step 6: Load classrooms with bench capacity → select and order rooms → verify capacity bars → save
- [ ] Step 7: All sections display correct data → publish → status changes to "scheduled"
- [ ] Refresh at any step → data loads correctly from URL params
- [ ] Go back to Step 2, change scope → verify Steps 3-6 data is cascade-cleaned
- [ ] Delete draft from listing → verify cascade deletes all related data

Ready for your approval before implementation.