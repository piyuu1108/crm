# Zod Validation — Phased Implementation Plan

## Current State Summary

**What exists today:**
- **Zod v4.4.3** already in `package.json` ✅
- **1 Zod schema** exists: `app/lib/integration/timetable-validator.ts` (integration API)
- **3 hand-rolled validation files** in `app/lib/validations/` — `profile.ts`, `faculty-profile.ts`, `subject.ts` — all use manual `required()` / `isValidPhone()` helpers, returning `{ valid, errors }` format
- **~48 mutation endpoints** (POST/PUT/PATCH/DELETE) across 20 API modules
- **Zero Zod usage** in any route handler except the integration timetable publish route

**How validation works now:**
- Most routes do inline `if (!field || typeof field !== "string")` checks after `await req.json()`
- Profile routes use the shared manual validators (called from both client + server)
- Admin subjects route uses `validateSubjectForm()` from shared validators
- No standardized error format — mix of `err("message", 400)` and `audit.error("message", undefined, 400)`
- Body is always destructured raw with no type safety: `const { field1, field2 } = body`

**Auth/Permissions pattern (DO NOT TOUCH):**
- `getAuthContext()` / `requirePermission()` / `requireAnyPermission()` — already solid
- `AuthContext` interface is well-typed
- Role-based branching in routes works well

**Response format (consistent):**
```ts
{ success: true, data: ... }           // success
{ success: false, error: "..." }       // failure
{ success: false, error: "...", errors: {...} }  // validation (admin/subjects only)
```

---

## Recommended Folder Structure

```
app/lib/
├── validations/           # ← EXISTS, keep expanding here
│   ├── schemas/           # NEW — Zod schemas organized by domain
│   │   ├── common.ts      # IDs, pagination, dates, enums, phone, pincode
│   │   ├── auth.ts         # login, set-password
│   │   ├── circular.ts     # create circular
│   │   ├── request.ts      # student request, faculty request
│   │   ├── exam.ts         # internal exam, marks, evaluation
│   │   ├── attendance.ts   # attendance save
│   │   ├── timetable.ts    # timetable bulk save
│   │   ├── subject.ts      # subject create/update (replace manual validator)
│   │   ├── profile.ts      # student + faculty profile (replace manual validators)
│   │   ├── classroom.ts    # classroom create
│   │   ├── approval.ts     # approval submit, action
│   │   └── admin.ts        # promotion, assignments, faculty CRUD
│   ├── validate.ts        # NEW — safeParse wrapper utility
│   ├── profile.ts         # EXISTS — keep until Phase 3 migration
│   ├── faculty-profile.ts # EXISTS — keep until Phase 3 migration
│   └── subject.ts         # EXISTS — keep until Phase 3 migration
```

**Naming convention:** Schema files export named schemas like `CreateCircularSchema`, `SaveAttendanceSchema`. Types are inferred via `z.infer<typeof Schema>`.

---

## Phase 1 — Foundation (Low risk, ~1 day)

**Create `validate.ts` wrapper + `schemas/common.ts`**

`validate.ts` — a single `validateBody()` helper that:
1. Calls `schema.safeParse(body)`
2. On failure, returns a formatted `NextResponse` with `{ success: false, error: "Validation failed", errors: [...] }` — compatible with existing `audit.error()` pattern
3. On success, returns the typed, parsed data

`schemas/common.ts` — reusable atomic schemas:
- `IdSchema` — `z.number().int().positive()`
- `OptionalIdSchema` — `z.number().int().positive().optional()`
- `PaginationSchema` — `{ limit, offset }` with defaults
- `PhoneSchema` — `z.string().regex(/^\d{10}$/)`
- `PincodeSchema` — `z.string().regex(/^\d{6}$/)`
- `AadhaarSchema` — `z.string().regex(/^\d{12}$/)`
- `DateStringSchema` — `z.string().date()` or ISO validation
- `NonEmptyString` — `z.string().trim().min(1)`
- `StatusEnumSchema` — `z.enum(["pending", "approved", "rejected"])`
- `TargetTypeSchema` — `z.enum(["ALL", "FACULTY", "YEAR", "DIVISION"])`
- `GenderSchema`, `BloodGroupSchema`, `CategorySchema`, `BoardSchema`

| Metric | Value |
|---|---|
| Complexity | Low |
| Risk | Zero — no existing code changes |
| Impact | Foundation for all phases |
| Benefit | Reusable atoms, type-safe parse utility |

---

## Phase 2 — Critical Mutation APIs (~3-4 days)

Migrate **highest-risk POST routes** first. These accept complex bodies and directly mutate the database.

**Priority order:**

| # | Route | Why first |
|---|---|---|
| 1 | `POST /api/attendance/save` | Bulk mutation, array records, status enum validation |
| 2 | `POST /api/internal-exams` | Creates exam definitions, enum `targetType`, conditional fields |
| 3 | `POST /api/internal-exams/marks` | Bulk upsert marks, raw SQL, `records[]` array |
| 4 | `POST /api/internal-evaluation` | Bulk upsert evaluations, same pattern as marks |
| 5 | `POST /api/requests` | Student requests — string fields, targetFacultyId |
| 6 | `POST /api/faculty/circulars` | Complex conditional validation (YEAR/DIVISION branching) |
| 7 | `POST /api/classes` | Simple — 3 required fields |
| 8 | `POST /api/auth/login` | Auth-critical — identifier + password |
| 9 | `POST /api/set-password` | Auth-critical — token + passwords |

**Migration pattern per route:**
1. Create schema in `schemas/<domain>.ts`
2. Replace raw `const body = await req.json()` → `const parsed = validateBody(body, Schema)`
3. Remove inline `if (!field)` checks
4. Keep everything else (auth, RBAC, audit, cache) untouched

| Metric | Value |
|---|---|
| Complexity | Medium |
| Risk | Low — validation-only changes, same logic |
| Impact | Covers ~60% of mutation risk surface |
| Benefit | Type-safe bodies, no more `typeof x !== "number"` checks |

---

## Phase 3 — Replace Hand-Rolled Validators (~2 days)

Rewrite existing `app/lib/validations/{profile,faculty-profile,subject}.ts` as Zod schemas.

**Key concern:** These are **shared between client and server** (imported by frontend stepper components). Zod works fine in both — just ensure the frontend imports the Zod schema version.

| File | Replaces | Shared? |
|---|---|---|
| `schemas/profile.ts` | `validations/profile.ts` (323 lines) | Yes — client+server |
| `schemas/profile.ts` | `validations/faculty-profile.ts` (158 lines) | Yes — client+server |
| `schemas/subject.ts` | `validations/subject.ts` (152 lines) | Yes — client+server |

**Benefits:** Eliminates ~630 lines of manual validation code. Cross-field validation (e.g., passing marks ≤ total marks) becomes `.refine()` or `.superRefine()`.

| Metric | Value |
|---|---|
| Complexity | Medium — must verify frontend imports |
| Risk | Medium — shared code, test both sides |
| Impact | Removes all manual validation infrastructure |
| Benefit | Single source of truth, `z.infer<>` for types |

---

## Phase 4 — Remaining Mutation APIs (~2-3 days)

| Route | Notes |
|---|---|
| `POST /api/approvals/submit` | Complex — proxies array, conditional proxy validation |
| `POST /api/approvals/action` | Action enum, proxyOverrides array |
| `POST /api/admin/timetable` | Bulk entries array, nested entry shape |
| `POST /api/admin/promotion` | sourceDivisionId, targetDivisionId, optional studentIds[] |
| `POST /api/admin/subjects` | Already uses manual validator — swap to Zod |
| `PUT/PATCH /api/admin/subjects/[id]` | Subject update |
| `PUT/PATCH /api/admin/faculty/[id]` | Faculty update |
| `PUT/PATCH /api/requests/[id]` | Request review (status change) |
| `POST /api/internal-exams/marks/visibility` | Marks visibility toggle |
| `POST /api/internal-evaluation/finalize` | Finalization |
| `POST /api/student/profile/submit` | Profile submit |
| `POST /api/faculty/profile/submit` | Faculty profile submit |
| `POST /api/admin/divisions/[id]/students/send-password-email` | Email jobs |
| All remaining mutations | Password emails, upload URLs, etc. |

| Metric | Value |
|---|---|
| Complexity | Medium-High (approvals/timetable are complex) |
| Risk | Medium — approval workflow is tightly coupled |
| Impact | Full mutation coverage |

---

## Phase 5 — GET Query Param Validation (Optional, ~1-2 days)

Only after all mutations are stable. Target the complex ones:

- `GET /api/circulars` — `limit`, `offset` params
- `GET /api/internal-exams` — `semesterId` param
- `GET /api/internal-exams/marks` — `examId`, `assignmentId` params
- `GET /api/admin/timetable` — `divisionId` param
- `GET /api/requests` — `status`, `limit`, `offset` params

Use `PaginationSchema` from common. Low risk, low reward.

---

## Phase 6 — Frontend Shared Contracts (Future)

- Export Zod schemas from a shared location
- Frontend forms use same schemas for client-side validation
- `z.infer<typeof Schema>` replaces manual TypeScript interfaces
- Eliminates all `ValidationError` / `ValidationResult` custom interfaces

---

## APIs to NOT touch first

| Route | Reason |
|---|---|
| `POST /api/integration/timetable/publish` | **Already uses Zod** — done ✅ |
| `POST /api/approvals/action` | 366 lines, complex multi-step workflow with proxy overrides — migrate last |
| `POST /api/admin/timetable` | Bulk replace-all transaction with slot resolution — high coupling |
| `POST /api/auth/login` | 366 lines, 3 login paths (admin/faculty/student) — works fine, low priority |

## Where Zod may hurt readability

- Routes with **conditional field requirements** based on `targetType` (circulars, internal-exams) — use `.discriminatedUnion()` or `.superRefine()` carefully
- Routes with **role-based body differences** — don't try to encode RBAC into schemas, keep that in route logic
- **Bulk array operations** with per-record validation — keep `.array()` schemas simple, don't over-constrain

---

## Quick Wins (Can start immediately)

1. **Create `validate.ts`** — zero risk, pure addition
2. **Create `schemas/common.ts`** — zero risk, pure addition  
3. **Migrate `POST /api/classes`** — simplest route (3 fields), great proof-of-concept
4. **Migrate `POST /api/requests`** — simple body, good test case
5. **Migrate `POST /api/attendance/save`** — highest-risk, biggest safety win

---