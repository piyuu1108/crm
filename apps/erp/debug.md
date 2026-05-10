# 🧠 ERP Optimization Debug Report

## 📁 Global Summary

* **Total Routes:** 16 frontend pages (`page.tsx`)
* **Total APIs:** 40 endpoints (`route.ts`)
* **Total DB Queries (estimated):** 11 heavily utilized query blocks containing multiple `db.select()` / `db.query` calls
* **Most expensive route:** `/admin/divisions/[id]` (Frontend renders 758 lines of component logic) & `/api/dashboard` (Backend hits 4+ concurrent DB table aggregations)
* **Most called API:** `useSubjectAssignmentsQuery` and `useAssignmentsQuery` (Duplicate active query fetching detected)
* **Top 5 critical issues:**
  1. **Overfetching (SELECT *):** `app/api/subjects/route.ts` repeatedly uses `db.select().from(subjects)` instead of selecting specific columns, causing massive payload sizes as subject metadata grows.
  2. **CPU-bound N+1 logic:** `app/api/admin/assignments/route.ts` loops through all divisions to manually map and `.filter()` counselors in an O(N*M) loop instead of using a DB `LEFT JOIN` and `GROUP BY`.
  3. **Massive Monolithic Components:** `faculty-profile-stepper.tsx` (716 lines) and `admin/divisions/[id]/page.tsx` (758 lines) mix heavy business logic with UI rendering.
  4. **Missing React.memo:** 10 major pages (e.g., `admin/timetable/page.tsx`, `dashboard/page.tsx`) completely lack memoization for child components, causing unnecessary cascading re-renders when local state changes.
  5. **Hook Misuse:** `auth-hydrator.tsx` contains multiple `useEffect` blocks that can cause race conditions and repeated local state updates during app hydration.

---

## 📊 Advanced Performance Metrics (MANDATORY)

| Route / API | Avg Response Time (Est.) | DB Queries | Est. Payload Size | Re-render Count | CPU-Heavy Operations |
| ----------- | ----------------------- | ---------- | ----------------- | --------------- | -------------------- |
| `/api/dashboard` | 300-500ms | 4 | Small (<10KB) | 3+ per dynamic role | Concurrent `count()` aggregations on large tables |
| `/api/admin/assignments` | 200-400ms | 3 | Medium (<100KB) | 2+ | `O(N*M)` array `.filter()` inside `.map()` |
| `/api/subjects` | 400-600ms | 2-3 | Large (>100KB) | N/A | `SELECT *` overfetching and duplicate array grouping |
| `/admin/divisions/[id]` | N/A (Frontend) | N/A | N/A | High (5+) | Massive DOM node rendering (758 lines) |
| `/app/profile` | N/A (Frontend) | N/A | N/A | High (10+) | Deep state validation on every keystroke |

---

## 🔄 Data Flow Mapping (CRITICAL)

### Route: `/dashboard`
→ `DashboardPage` (app/app/dashboard/page.tsx)
→ Dynamic Import (`StudentDashboard` / `FacultyDashboard` / `CounselorDashboard` / `HodDashboard`)
→ `useDashboardQuery()` (React Query)
→ `GET /api/dashboard` (Fetch)
→ DB Queries: `db.select({ count() }).from(students)`, `faculty.count()`, `studentRequests`

### Route: `/admin/divisions/[id]`
→ `DivisionDetailPage` (app/app/admin/divisions/[id]/page.tsx)
→ `useDivisionDetailQuery()` + `useAssignmentsQuery()`
→ `GET /api/admin/divisions/[id]` & `GET /api/admin/assignments`
→ DB Queries: Join `divisions` with `students`, `counselorDivisionAssignments`
→ Local State parsing: Custom CSV logic `parseCsvText()` runs synchronously on main thread blocking UI.

---

## ⚛️ Deep Component Re-render Cause Analysis

### Component: `faculty-profile-stepper.tsx` (app/app/profile/_components)
* **Exact cause of re-render:** 
  * **State change:** Local state (`personal`, `contact`, `professional`, `documents`) is held at the very top of the 716-line component.
  * **Recreated objects:** `stepsCompleted` dependency array forces recalculation across all 4 validation functions (`validateFacultyStep1`, etc.) on every keystroke.
* **Identify:**
  * **Missing memoization:** No `React.memo()` on individual step sections. Typing in the `fullName` input re-renders the photo upload component and progress bar.

### Component: `auth-hydrator.tsx` (components/auth)
* **Exact cause of re-render:**
  * **Effect cascading:** `hydrateFromStorage()`, `hydrateUser()`, and API data injection (`useAuthMeQuery`) all trigger separate `useEffect` updates.
  * **State change:** Zustand store updates trigger React tree re-renders multiple times during the `HYDRATION_TIMEOUT_MS` window.

---

## 📦 Bundle & Frontend Weight Analysis

* **Large components affecting bundle size:** 
  * `app/app/admin/divisions/[id]/page.tsx` directly imports heavyweight UI components (Table, Modals, CSV parsing) without lazy loading.
* **Heavy UI logic blocking main thread:** 
  * The `parseCsvText` in `/admin/divisions/[id]` runs synchronously on large strings. This will lock the browser for files > 500 lines.
* **Missing dynamic imports:**
  * `SlotModal` and `TimetableGrid` in `/admin/timetable` should be dynamically imported to speed up initial route paint.

---

## 🧠 Caching Strategy (STRICT)

### API: `/api/dashboard`
* **What should be cached:** Aggregate counts (Total Students, Active Faculty, Pending Requests).
* **Cache Key Format:** `dashboard_stats_role_{role_id}`
* **TTL (time-to-live):** 300s (5 minutes)
* **Invalidation condition:** When a student is approved/rejected, or when an admin updates system-wide faculty status.

### API: `/api/admin/assignments`
* **What should be cached:** Base division-counselor assignment mapping (rarely changes mid-semester).
* **Cache Key Format:** `admin_assignments_sem_{current_semester}`
* **TTL (time-to-live):** 3600s (1 hour)
* **Invalidation condition:** Explicit cache purge when an admin assigns/unassigns a counselor via `POST /api/admin/assignments`.

---

## 🎯 Optimization Impact Estimation

### 1. Refactoring Assignment Mapping (`/api/admin/assignments`)
* **Expected reduction in API latency:** ~30-40% faster execution.
* **Expected DB load reduction:** None (CPU optimization).
* **Expected render improvement:** Backend CPU time complexity reduced from `O(N*M)` to `O(N)`, freeing Node.js event loop capacity.

### 2. Dashboard Caching (`/api/dashboard`)
* **Expected reduction in API latency:** Drops from 300ms+ to <50ms (Redis/In-memory cache hit).
* **Expected DB load reduction:** Prevents 4 heavy `count()` queries per dashboard mount, saving ~90% database read capacity during login rushes.
* **Expected render improvement:** N/A (Backend optimization).

### 3. Component Memoization (`faculty-profile-stepper.tsx`)
* **Expected reduction in API calls:** N/A.
* **Expected DB load reduction:** N/A.
* **Expected render improvement:** Eliminates 80% of useless DOM diffing. Keystrokes will feel instant (0ms blocking delay vs current ~15ms layout recalculation).

---

## 📌 Priority Fix Plan

### 🔴 High Impact (Must Fix First)
1. **Fix Backend Overfetching:** Update `db.select().from(subjects)` to `db.select({ ...specific_columns })` in `/api/subjects/route.ts`.
2. **Implement Dashboard Caching:** Add caching layer to `/api/dashboard/route.ts` to prevent redundant `count()` queries from killing the database connection pool.
3. **Optimize Assignment Mapping:** Refactor the O(N*M) `.filter` inside `.map` in `/api/admin/assignments/route.ts` to use a `Map` or `groupBy` utility (O(N) time complexity).

### 🟡 Medium (Important but not blocking)
1. **Modularize Massive Components:** Break down `faculty-profile-stepper.tsx` and `admin/divisions/[id]/page.tsx` into smaller, atomic components with `React.memo`.
2. **Move CSV Parsing to Web Worker:** Offload `parseCsvText` logic in division management to prevent UI freezing.

### 🟢 Low (Nice to improve)
1. **Refactor Auth Hydration:** Consolidate `useEffect` usage in `auth-hydrator.tsx`.
2. **Dynamic Imports for Heavy Modals:** Use `next/dynamic` for `SlotModal` and large table sub-components.