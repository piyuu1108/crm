# Timetable Generation — Constraint Specification

## 1. Time Slot Structure

Each day has **5 lecture slots** with a **10-minute break after Slot 2**.

This applies to **Monday – Saturday**.

| Slot | ExampleTime | Break Group |
| --- | --- | --- |
| 1 | 07:55 – 08:50 | A |
| 2 | 08:50 – 09:40 | A |
| — | 09:40 – 09:50 | ← BREAK → |
| 3 | 09:50 – 10:40 | B |
| 4 | 10:40 – 11:30 | B |
| 5 | 11:30 – 12:20 | B |

Break Group A = [Slot 1, Slot 2]

Break Group B = [Slot 3, Slot 4, Slot 5]

Multi-slot labs must stay within ONE break group.

---

## 2. Weekly Capacity Model

Each lab has:

```
5 slots/day × 6 days/week = 30 total weekly slots
```

Therefore:

```
Maximum weekly capacity per lab = 30 slots
```

Important:

- A 2-slot continuous lab consumes 2 slots.
- A 3-slot lab consumes 3 slots.
- Weekly lab utilisation is calculated using actual occupied slots.

Example:

```
2 lab sessions/week
×
2-slot duration
=
4 occupied weekly slots
```

---

## 3. Hard Constraints

These rules must **never** be violated. A timetable that breaks any hard

constraint is considered **invalid** and must be rejected or regenerated.

---

### HC-1 — Faculty Conflict

A faculty member **cannot** be assigned to more than one lecture

at the same slot on the same day, across any class or division.

```
CHECK: (faculty_id, day, slot) → must be unique
```

---

### HC-2 — Lab Room Conflict

The same lab room **cannot** be assigned to multiple classes

at the same slot on the same day.

```
CHECK: (lab_id, day, slot) → must be unique
```

---

### HC-3 — Class Daily Slot Limit

Each class can have a **maximum of 5 lecture slots per day**

(Mon – Sat).

```
CHECK: count(slots per class per day) ≤ 5
```

---

### HC-4 — No Lab Spanning the Break

A multi-slot lab **cannot** span across Slot 2 and Slot 3.

These slots are separated by a 10-minute break and are

**not consecutive** for scheduling purposes.

```
INVALID placements for a 2-slot lab:
✗ Slots [2,3]

VALID:
✓ [1,2]
✓ [3,4]
✓ [4,5]
```

---

### HC-5 — Lab Slots Must Be Consecutive

All slots occupied by a single lab session must be

**adjacent and within the same break group**.

```
Duration 1 slot  → [1] [2] [3] [4] [5]

Duration 2 slots → [1,2] [3,4] [4,5]

Duration 3 slots → [3,4,5]
```

---

### HC-6 — Lab Credit Hour Counting

A lab session with duration N slots occupies **N timetable slots**

but counts as only **1 lab session/credit unit**.

Example:

```
lab_count = 2
lab_duration_slots = 2

Weekly slot usage:
2 × 2 = 4 occupied slots
```

---

## 4. Soft Constraints

These are **preferences**. Violations are allowed when no valid

alternative exists, but each violation adds a penalty score.

The scheduler minimises total penalty.

---

### SC-1 — Avoid Consecutive Faculty Lectures

A faculty member should **not** teach 3 or more consecutive slots

on the same day.

| Violation | Penalty |
| --- | --- |
| 3 consecutive slots | –20 |
| 4 consecutive slots | –50 |

---

### SC-2 — Faculty Daily Load Balance

A faculty member should ideally teach a **maximum of 4 lectures/day**.

| Faculty lectures/day | Penalty |
| --- | --- |
| 1 – 4 | 0 |
| 5 | –50 |

---

### SC-3 — Morning Preference for 4-Credit Subjects

Subjects with **4 credit hours** should prefer:

```
Slot 1
Slot 2
Slot 3
```

Avoid:

```
Slot 4
Slot 5
```

| Violation | Penalty |
| --- | --- |
| Slot 4 or 5 | –10 |

---

### SC-4 — Daily Subject Balance

Avoid filling an entire day with only heavy/core subjects.

| Violation | Penalty |
| --- | --- |
| All slots are 4-credit subjects | –15 |

---

### SC-5 — Max 2 Lab Sessions Per Class Per Day

A class should not have **3 or more lab sessions**

in one day.

| Violation | Penalty |
| --- | --- |
| 3rd lab session | –30 |
| Additional labs | –30 each |

---

### SC-6 — Saturday Lecture Load

Saturday also supports full scheduling capacity:

```
Maximum Saturday capacity = 5 slots
```

However lighter Saturdays are preferred.

| Saturday Slot Count | Penalty |
| --- | --- |
| 3 slots | 0 |
| 4 slots | –5 |
| 5 slots | –12 |

---

### SC-7 — Distribute Short Days Across Week

Short academic days should be distributed across different classes.

| Violation | Penalty |
| --- | --- |
| >50% classes share same short day | –25 |

---

### SC-8 — Prefer 1-Slot Labs at Last Slot

Single-slot labs should prefer Slot 5.

| Violation | Penalty |
| --- | --- |
| Slot 1/2/3 placement | –8 |

---

### SC-9 — Same Subject Once Per Day

Avoid scheduling same theory subject twice/day.

| Violation | Penalty |
| --- | --- |
| Same theory subject repeated | –12 |

---

### SC-10 — Preferred Lab Allocation ← NEW

Each subject may define:

- preferred lab
- fallback labs

The scheduler should always try preferred labs first.

Fallback labs are allowed when preferred lab placement

creates conflicts or impossible states.

This is a **soft preference**, not a hard restriction.

Example:

```
Preferred:
LAB-1

Fallback:
LAB-2
LAB-3
```

| Placement Type | Penalty |
| --- | --- |
| Preferred lab used | 0 |
| Fallback lab used | –6 |

Why?

This improves timetable solvability and prevents

edge-capacity deadlocks when labs approach full utilisation.

---

## 5. Lab Data Model

All values are pre-configured by admin before generation.

```tsx
Subject {
  id                     : string
  name                   : string
  code                   : string

  credit_hours           : number

  theory_per_week        : number

  lab_count              : number
  lab_duration_slots     : number

  lab_credit_per_session : number

  preferred_lab_id       : string|null
  fallback_lab_ids       : string[]

  faculty_id             : string
  class_id               : string
}
```

---

## 6. Valid Lab Placement Reference

```
Duration 1 slot:
[1] [2] [3] [4] [5]

Duration 2 slots:
[1,2]
[3,4]
[4,5]

✗ [2,3]

Duration 3 slots:
[3,4,5]

✗ [1,2,3]
✗ [2,3,4]
```

---

## 7. Scheduling Priority Order

Hardest-to-place items must be scheduled first.

```
Priority 1 → Multi-slot labs (duration ≥ 2)

Priority 2 → Shared/preferred lab allocations

Priority 3 → Single-slot labs

Priority 4 → 4-credit theory subjects

Priority 5 → 2-credit / low-credit theory subjects

Priority 6 → Remaining / elective lectures
```

---

## 8. Output Slot Format

```
Theory:
{CODE}-{SHORT_NAME}({FACULTY_INITIALS})

Example:
304-OOPS&DS(YP)
```

```
Lab:
LAB-{ROOM} {CODE}-{SHORT_NAME}({FACULTY_INITIALS})

Example:
LAB-3 303-PYTHON(NSP)
```

Multi-slot labs are rendered as merged timetable cells.

---

## 9. Constraint Summary Table

| ID | Type | Description | Penalty |
| --- | --- | --- | --- |
| HC-1 | Hard | No faculty double-booking | Invalid |
| HC-2 | Hard | No lab room double-booking | Invalid |
| HC-3 | Hard | Max 5 class slots/day | Invalid |
| HC-4 | Hard | No lab crossing break | Invalid |
| HC-5 | Hard | Consecutive same-group lab slots | Invalid |
| HC-6 | Hard | Lab slot usage ≠ lab credits | Invalid |
| SC-1 | Soft | Avoid consecutive faculty lectures | –20 / –50 |
| SC-2 | Soft | Prefer max 4 faculty lectures/day | –50 |
| SC-3 | Soft | 4-credit subjects prefer morning | –10 |
| SC-4 | Soft | Daily subject balance | –15 |
| SC-5 | Soft | Max 2 labs/day/class | –30 |
| SC-6 | Soft | Prefer lighter Saturdays | –5 / –12 |
| SC-7 | Soft | Spread short days | –25 |
| SC-8 | Soft | 1-slot labs prefer Slot 5 | –8 |
| SC-9 | Soft | Same subject once/day | –12 |
| SC-10 | Soft | Prefer assigned lab before fallback | –6 |

# New Hard Rule:
# HARD CONSTRAINT: NO INTERNAL GAPS BETWEEN LECTURES

A class timetable must NOT contain empty slots between scheduled lectures within the same day.

This is a STRICT HARD CONSTRAINT.

---

## RULE

If a class has lectures scheduled in a day:

- all lectures must be continuous/compact
- no empty slot is allowed between first and last lecture
- breaks officially defined by institute are allowed
- free slots only allowed:
  - before first lecture
  - after last lecture

---

## VALID EXAMPLES

### VALID

[ Lecture ][ Lecture ][ Lecture ][ Empty ][ Empty ]

Reason:
Free slots are only after last lecture.

---

### VALID

[ Empty ][ Empty ][ Lecture ][ Lecture ]

Reason:
Free slots are before first lecture.

---

### VALID

[ Lecture ][ Lecture ][ BREAK ][ Lecture ]

Reason:
Official institute break is allowed.

---

## INVALID EXAMPLES

### INVALID

[ Lecture ][ Empty ][ Lecture ]

Reason:
Gap exists between lectures.

---

### INVALID

[ Lecture ][ Lecture ][ Empty ][ Lecture ]

Reason:
Internal empty slot exists.

---

### INVALID

[ Empty ][ Lecture ][ Empty ][ Lecture ]

Reason:
Disconnected lecture blocks.

---

# IMPLEMENTATION REQUIREMENT

For each class and each day:

1. Find first occupied slot
2. Find last occupied slot
3. Every slot between them must contain:
   - lecture
   - lab
   - official break

No normal empty slot is allowed inside this range.

---

# PENALTY RULE

This is NOT a soft preference.

Any internal gap makes timetable INVALID.

Generator must retry/backtrack until gap-free schedule is produced.

---

# NOTE

Official institute breaks are exempted and should not be treated as gaps.