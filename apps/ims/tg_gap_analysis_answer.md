# TG.md Gap Analysis — What's Missing Before Timetable Generation

## Current State Summary

| Area | Status |
|------|--------|
| Subjects (code, name, credit, type, semester) | ✅ Done |
| Faculty (name, code, courseId) | ✅ Done |
| Classes (name, year, semester, division, course, spec) | ✅ Done |
| Assignments (subject + class → faculty) | ✅ Done |
| Rooms / Labs (name, isLab) | ✅ Done |
| Lab Sessions (assignmentId, sessionType, roomId, durationSlots) | ✅ Done |
| Lab Config UI (configure Theory/Lab sessions per assignment) | ✅ Done |
| Lab Schedule UI (placeholder timetable grid per lab) | ✅ Done |
| Lab Weights (see utilization per lab) | ✅ Done |

---

## Missing Items

### 1. `theory_per_week` field on subjects

> [!IMPORTANT]
> **TG.md §5 requires:** `theory_per_week : number`

Currently the `subjects` table only has `credit` (total credit hours). The scheduler needs to know how many **theory lectures per week** a subject requires, separately from lab sessions.

**Current:** `credit = 4` but no way to say "2 theory + 2 lab sessions"
**Needed:** Either a `theoryPerWeek` column on subjects, OR derive it automatically from:

```
theory_per_week = credit - count(lab_sessions for this subject+class)
```

**Verdict:** ⚠️ Can be **derived** at generation time from `lab_sessions` table. Each lab session row = 1 credit, so `theory_per_week = credit - count(lab_sessions)`. **No schema change needed** if you're okay computing it. But an explicit field would be safer for admin override.

---

### 2. `preferred_lab_id` and `fallback_lab_ids` (SC-10)

> [!WARNING]
> **TG.md §5 + SC-10 requires:** `preferred_lab_id` and `fallback_lab_ids`

Currently `lab_sessions.room_id` stores a single room per session. There is no concept of "preferred lab" vs "fallback labs" for soft constraint SC-10.

**What's needed:**
- Either add `is_preferred: boolean` column to `lab_sessions`
- Or add `preferred_room_id` + `fallback_room_ids` (JSON array) to the `assignments` or `subjects` table

**Impact:** Without this, the scheduler cannot evaluate SC-10 penalty (–6 per fallback usage).

**Difficulty:** Easy — schema + minor UI addition in Lab Config

---

### 3. `timetable_slots` output table (missing entirely)

> [!IMPORTANT]
> **The scheduler needs somewhere to WRITE its output.**

There is no table to store the generated timetable. You need:

```sql
CREATE TABLE timetable_slots (
  id          SERIAL PRIMARY KEY,
  class_id    INTEGER NOT NULL REFERENCES classes(id),
  day         INTEGER NOT NULL,       -- 0=Mon, 5=Sat
  slot        INTEGER NOT NULL,       -- 1-5
  subject_id  INTEGER NOT NULL REFERENCES subjects(id),
  faculty_id  INTEGER NOT NULL REFERENCES faculty(id),
  room_id     INTEGER REFERENCES rooms(id),  -- NULL for theory
  session_id  INTEGER REFERENCES lab_sessions(id),  -- links back to config
  is_lab      BOOLEAN NOT NULL DEFAULT false,
  span_slots  INTEGER NOT NULL DEFAULT 1,  -- 1 or 2 for merged cells
  UNIQUE(class_id, day, slot)
);
```

**Impact:** Critical — without this, there's nowhere to store or render generated timetables.

**Difficulty:** Easy — schema + migration

---

### 4. `duration_slots` max value should support 3

> [!NOTE]
> **TG.md §6 references duration 3 slots** (placement window `[3,4,5]`)

Current validator: `durationSlots: z.number().int().min(1).max(2)`
Current schema: `duration_slots INTEGER DEFAULT 1` (no max constraint)

The validator caps at 2 but TG.md supports 3-slot labs. The schema is fine but the **validator needs updating** to `.max(3)`, and the Lab Config UI duration selector needs a "3 Slots" option.

**Difficulty:** Trivial

---

### 5. No Timetable Generation Engine

> [!NOTE]
> This is intentionally not implemented yet per your instructions.

But the following backend pieces are needed before building it:
- Constraint checker functions (HC-1 through HC-6)
- Penalty calculator functions (SC-1 through SC-10)
- CSP/backtracking solver or heuristic placer
- API endpoint: `POST /api/timetable/generate`
- API endpoint: `GET /api/timetable?classId=X` and `GET /api/timetable?roomId=X`

**Difficulty:** Hard — this is the core algorithm

---

### 6. Lab Schedule page reads real data (currently mock)

The `getRoomTimetableMatrix()` in [room.service.ts](file:///p:/02_projects/ims/src/lib/services/room.service.ts) returns an **empty mock grid**. Once `timetable_slots` exists, it needs to query real data.

**Difficulty:** Easy (once timetable_slots table exists)

---

### 7. Class timetable view page (missing)

TG.md §8 output format implies per-class timetable views. Currently there's only a per-lab view (Lab Schedule). A per-class and per-faculty timetable view page will be needed to display generator output.

**Difficulty:** Medium — new page, but similar pattern to Lab Schedule

---

### 8. Generation trigger UI (missing)

No UI exists to trigger timetable generation or view results. Needed:
- "Generate Timetable" button in settings or dedicated page
- Progress/status indicator
- Penalty score display
- Conflict report view

**Difficulty:** Medium

---

## Priority Order for Remaining Work

| # | Item | Blocks Engine? | Difficulty |
|---|------|---------------|------------|
| 1 | `timetable_slots` table | **YES** | Easy |
| 2 | Preferred/fallback lab support (SC-10) | Soft — only 1 soft constraint | Easy |
| 3 | Duration 3-slot support | Only if curriculum needs it | Trivial |
| 4 | Theory-per-week derivation | Can compute at runtime | None (if derived) |
| 5 | Timetable generation engine | **THE ENGINE** | Hard |
| 6 | Wire Lab Schedule to real data | After engine | Easy |
| 7 | Class/Faculty timetable views | After engine | Medium |
| 8 | Generation trigger UI | After engine | Medium |

---

## Bottom Line

> **Items 1-4 are pre-engine prerequisites** (schema/data model completeness).
> **Item 5 is the engine itself.**
> **Items 6-8 are post-engine UI.**
>
> You're very close. The `timetable_slots` output table is the only **hard blocker**. Everything else is either trivial or can be built alongside the engine.
