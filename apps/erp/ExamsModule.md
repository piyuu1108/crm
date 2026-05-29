Good point — let me check the dashboard and circulars pages to match their design quality:

Viewed page.tsx:1-177
Viewed page.tsx:1-617

Good, I can see the design patterns now — `Card` with `border border-divider/30 bg-surface rounded-2xl shadow-sm`, proper spacing, skeleton states, `cn()` utility. Let me also check the HodDashboard for KPI card patterns:

Viewed hod-dashboard.tsx:1-85

Now I have the design patterns clear. Let me create all 7 step components with premium UI matching the existing design system. Starting with Step 1:

Created step1-basic-details.tsx
Created step2-target-scope.tsx
Created step3-eligibility.tsx
Created step4-subjects.tsx
Created step5-schedule.tsx
Created step6-halls.tsx

Now the final Step 7 — Review & Publish:

Created step7-review.tsx

Now let me redesign the HOD Exam Management page to be premium quality like the dashboard and circulars:

Viewed hod-exam-management.tsx:1-50
Viewed hod-exam-management.tsx:50-382

Now I'll rewrite the HOD Exam Management page with premium design, integrating the new wizard workflow:

Edited hod-exam-management.tsx

Now let me verify the validation schemas reference the correct common schema imports:

Viewed common.ts:1-85

All schema imports (`IdSchema`, `NonEmptyString`, `DateStringSchema`, `TimeStringSchema`) are available in `common.ts`. Now let me check the validate helper:

Searched for "export function validateBody"
Viewed validate.ts:20-50

The `validateBody` returns `{ success: false, error: NextResponse }`. I see my API routes use `audit.error("msg", parsed.error)` where `parsed.error` is a `NextResponse`. Let me verify this works with the audit logger pattern:

Searched for "error\(.*parsed\.error"

The pattern is consistently used across the codebase. Now let me check the schema exports for `classroomBenches` and `attendanceAnalyticsSummary` to ensure my API imports don't reference non-existent exports:

Searched for "export const classroomBenches"
Searched for "export const attendanceAnalyticsSummary"

Those tables don't exist in schema.ts. I need to fix the imports in the API routes. Let me find the correct bench table name:

Searched for "export const.*bench|export const.*classroom"
Searched for "export const.*bench|classroom|Bench|Classroom"
Searched for "classrooms"
Searched for "pgTable(\"class"
Searched for "pgTable"
Searched for "= pgTable"
Viewed schema.ts:35-50
Searched for "classrooms"

The `classrooms` table is at line 679 and `classroomBenches` reference at line 696. Let me check:

Viewed schema.ts:679-709

Good — `classrooms` and `classroomBenches` both exist in the schema. The issue is that my `examHallAllocations` table references `classrooms` which is defined AFTER it in the file. Since Drizzle uses JS references (lambdas), forward references work fine.

Now the `classrooms` is at line 679 but `examHallAllocations` references it at line ~507. That should work because drizzle uses `() => classrooms.id` (lazy reference). Let me verify the import in the wizard route also works. Let me check the main `exam-wizard/route.ts` for unused imports:

Viewed route.ts:1-145

I see the route imports `attendanceAnalyticsSummary` which doesn't exist. Let me clean up unused imports:

Edited route.ts

Now clean up unused imports in the `[id]/route.ts` too:

Viewed route.ts:1-259

The `[id]/route.ts` needs `divisions`, `subjects`, `classrooms`, `classroomBenches`, and `students` — all valid. Just need to remove `facultySubjectAssignments` which is unused:

Edited route.ts

Now let me add the `"exams.manage"` permission if it doesn't exist:

Searched for "exams.manage"

Good, the permission already exists. Let me now run the dev server briefly to check for compilation errors:

Ran command: `npx tsc --noEmit --skipLibCheck 2>&1 | head -50`
Ran command: `npx tsc --noEmit --skipLibCheck 2>&1 | Select-Object -First 60`

Good — I can see the issues. The HeroUI v3 `Chip` uses different variant names. Let me fix these:

Searched for "variant="solid""
Searched for "variant=\"flat\""

The grep doesn't find them because of encoding. Let me check how Chip is used in circulars (which works):

Used MCP tool: heroui-react/get_component_docs
Viewed output.txt:1-327

So `Chip` variants are: `"primary" | "secondary" | "tertiary" | "soft"`. I used `"solid"`, `"flat"`, and `"outlined"` which are wrong. I need to fix all step components. Let me fix them all at once:

Ran command: `Get-ChildItem -Path "p:\02_projects\mono\apps\erp\app\app\academics\internal-exams" -Recurse -Filter "*.tsx" | ForEach-Object { $n=$_.FullName; $c = Get-Content $n -Raw; $changed=$false; if ($c -match 'variant="flat"' -or $c -match 'variant="solid"' -or $c -match 'variant="outlined"') { $c = $c -replace 'variant="flat"', 'variant="soft"'; $c = $c -replace 'variant="solid"', 'variant="primary"'; $c = $c -replace 'variant="outlined"', 'variant="secondary"'; Set-Content $n $c -NoNewline; Write-Host "Fixed: $n" } }`

Now fix the Switch `onChange` handler in step3 (TS error about `e.target`):

Used MCP tool: heroui-react/get_component_docs
Searched for "onChange"
Searched for "isSelected"

Let me look at how Switch is used in the existing codebase:

Searched for "Switch"
Viewed step3-eligibility.tsx:1-207

The Switch `onChange` callback in HeroUI v3 provides a `boolean` directly, not an event object. Let me fix:

Edited step3-eligibility.tsx

Now fix `Chip` variants in the other step files. Let me do a batch fix for all remaining files that might use `"flat"`, `"solid"`, or `"outlined"`:

Ran command: `Get-ChildItem -Path "p:\02_projects\mono\apps\erp\app\app\academics\internal-exams" -Recurse -Filter "*.tsx" | ForEach-Object { $n=$_.FullName; $c = Get-Content $n -Raw; if ($c -match 'variant="flat"' -or $c -match 'variant="solid"' -or $c -match 'variant="outlined"') { Write-Host "Still has issues: $n" } }`

No more issues in the create dir. Now let me check all the other step and HOD component files too:

Ran command: `Get-ChildItem -Path "p:\02_projects\mono\apps\erp\app\app\academics\internal-exams" -Recurse -Filter "*.tsx" | ForEach-Object { $n=$_.FullName; $c = Get-Content $n -Raw; $changed=$false; if ($c -match 'variant=.flat.' -or $c -match 'variant=.solid.' -or $c -match 'variant=.outlined.') { $c = $c -replace "variant=`"flat`"", "variant=`"soft`""; $c = $c -replace "variant=`"solid`"", "variant=`"primary`""; $c = $c -replace "variant=`"outlined`"", "variant=`"secondary`""; Set-Content $n $c -NoNewline; Write-Host "Fixed: $n" } }`

Now let me check for remaining TS errors in the step4/5/6/7 files that use `variant="flat"` or `variant="solid"` — but those were caught by the previous fix. Let me do a broader check:

Ran command: `npx tsc --noEmit --skipLibCheck 2>&1 | Select-Object -First 30`

Still one issue in step2. The ternary conditional produces "solid" | "outlined" strings. Let me view the problematic line:

Viewed step2-target-scope.tsx:1-311

I see line 197 still has `"solid"` | `"outlined"` — the PowerShell replace didn't catch the ternary expression. Fix it manually:

Edited step2-target-scope.tsx

Now let me check for the same issues across step4-7 and the hod component:

Ran command: `npx tsc --noEmit --skipLibCheck 2>&1 | Select-Object -First 40`

`Chip` doesn't have `onPress`. I need to wrap it in a button or use `onClick`:

Edited step2-target-scope.tsx
Ran command: `npx tsc --noEmit --skipLibCheck 2>&1 | Select-Object -First 40`

**TypeScript compiles cleanly.** Now let me verify the full file structure is correct:

Listed directory create
Listed directory components

Everything is in place. Let me verify the queries file has the types/hooks my step components reference:

Viewed exam-wizard.ts:1-50
Viewed exam-wizard.ts:50-140
Viewed exam-wizard.ts:140-276

Everything looks solid. The entire implementation is complete and compiles cleanly. Here's a summary:

---

## Summary

### What was built (Frontend — 9 files created/rewritten):

**1. Stepper Wizard Page** (`create/page.tsx`) — 7-step navigation shell with:
- URL parameter sync (`?examId=X&step=Y`) for bookmarkable/resumable drafts
- Save status indicator (saving → saved → error)
- Connected step icons with completion state tracking
- Step-to-step navigation with draft persistence

**2. Seven Step Components** (`create/components/step1-7.tsx`):

| Step | Component | Features |
|------|-----------|----------|
| 1 | `Step1BasicDetails` | TextField, Select, TextArea with Zod validation |
| 2 | `Step2TargetScope` | Year filter chips, division checkbox cards, sticky summary sidebar with student count |
| 3 | `Step3Eligibility` | Per-year cards with attendance slider, Switch toggle, date picker |
| 4 | `Step4Subjects` | Deduped subject list with duration dropdowns, type/division chips, summary sidebar |
| 5 | `Step5Schedule` | Date/time row builder, auto end-time calculation, unscheduled subjects tracker |
| 6 | `Step6Halls` | Click-to-add rooms, reorder ▲▼, sequential fill bars, capacity utilization |
| 7 | `Step7Review` | Readiness checklist, KPI summary, section summaries, AlertDialog publish confirmation |

**3. Redesigned HOD Exam Management** (`hod-exam-management.tsx`) — Premium UI with:
- KPI stat cards (total exams, drafts, scheduled, subjects)
- Exam grid cards with status chips, progress bars, action buttons
- Empty state with CTA
- AlertDialog delete confirmation
- Integrated marks management section

### Design Consistency:
- `rounded-2xl border border-divider/30 bg-surface shadow-sm` card pattern (matching dashboard/circulars)
- Skeleton loading states
- HeroUI v3 compound components (`Card.Content`, `AlertDialog.Header`, etc.)
- Lucide icons + existing color system (`accent`, `default-500`, etc.)

### Fixes applied:
- Removed unused schema imports (`attendanceAnalyticsSummary`, `facultySubjectAssignments`)
- Fixed `Chip` variants: `flat` → `soft`, `solid` → `primary`, `outlined` → `secondary`
- Fixed `Switch` `onChange` handler (HeroUI v3 passes `boolean`, not event)
- **TypeScript compiles with 0 errors** ✅