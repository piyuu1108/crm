# API-First Architecture Review

The ERP is engineered with a strict **API-First Paradigm**, treating the Next.js frontend simply as one of many potential consumers. 

The architecture strictly avoids tying database logic (`drizzle-orm`) into React Server Components. Instead, all business logic, validation, and data mutations are firmly walled behind the `/api` directory. This is an exceptional foundation for a multi-platform ecosystem. The frontend behaves exactly as a mobile app or third-party integration would: by resolving JWT/session state and interacting exclusively through REST-style endpoints.

---

# Frontend/Backend Decoupling Score
**Score: 9.5/10**

* **Database Isolation:** 100%. There are zero instances of SQL or ORM usage leaking into UI components.
* **Contract Enforcement:** The frontend strictly relies on predefined JSON shapes.
* **Microservice Readiness:** Because all data operations live inside `/api` route handlers, extracting a module (e.g., internal-exams) into a standalone Go or Node microservice would require zero changes to the frontend React components, only a URL base shift.

---

# Mobile-App Readiness
**Score: 9/10**

If a **React Native (Expo)** app were spun up tomorrow, the transition would be virtually seamless:
1. **Query Portability:** The entire `app/lib/queries/*` folder (TanStack Query hooks and keys) can be copy-pasted directly into a React Native project.
2. **State Portability:** The global state (`zustand` in `lib/store/`) is entirely decoupled from the DOM and can be reused verbatim.
3. **HTTP Wrapping:** The `fetchWithTimeout` wrapper in `app/lib/http.ts` standardizes how requests are serialized and how errors are thrown, serving as a perfect blueprint for mobile networking.

---

# Query Layer Consistency
**Score: 9/10**

Your implementation of TanStack (React) Query is enterprise-grade.
* **Key Management:** You are utilizing query key factories (e.g., `workflowKeys.requestsList(...)`) rather than hardcoding string arrays, preventing cache collisions and making invalidation predictable.
* **Separation of Concerns:** Fetcher functions are cleanly separated from the Hook wrappers. 
* **Mutation Standards:** Mutations are correctly tied into `queryClient.invalidateQueries`, ensuring that the API-driven CSR always remains perfectly synchronized with the server state without requiring manual page reloads.

---

# API Scalability Analysis

The `/api` layer is well-structured for scale:
* **Pagination & Filtering:** Standardized URL `searchParams` (e.g., `?limit=15&offset=0&status=pending`) are implemented cleanly, shifting the computational load to the database rather than the client.
* **Audit & Telemetry:** Endpoints leverage an `AuditLogger` abstraction, ensuring that regardless of which client (web or mobile) invokes the API, traceability is maintained.
* **Error Modeling:** Backend errors follow a predictable `{ success: false, error: "..." }` schema, which the frontend unpacks natively.

---

# Rendering Strategy Review

**Client-Side Rendering (CSR) is Intentional and Correct.**
In an API-first paradigm, CSR is not a flaw—it is a requirement for portability. By utilizing TanStack Query for data hydration rather than Next.js `getServerSideProps` or async RSCs, you guarantee that:
1. The web client and mobile client share the exact same loading, error, and caching UI states.
2. The server's compute is spent entirely on JSON serialization, not HTML generation.
3. Personalized, highly dynamic, role-based ERP data is not accidentally cached in the CDN.

React Server Components (RSCs) are appropriately utilized for structural layouts, static navigation, and localized wrappers (constituting ~61% of your files), ensuring initial page loads remain lightweight.

---

# Hydration & Client Boundary Analysis

* **Hydration Cost:** Very reasonable. The `"use client"` boundaries are drawn tightly around interactive widgets, dashboards, and data tables.
* **Suspense & Fallbacks:** By pushing data-fetching to the client via React Query, the application naturally leverages React's suspense and local loading spinners (e.g., `<Skeleton>` or `<Spinner>`), preventing massive full-page waterfall blockers.

---

# Bundle Optimization Opportunities

Even within an API-first system, minimizing client JavaScript is critical:

1. **Purge `lucide-react` (~40-60KB)**
   * Currently, both `lucide-react` (14 files) and `@gravity-ui/icons` (42 files) are in use. Standardize entirely on `@gravity-ui/icons` to avoid bundling two massive SVG libraries.
2. **Purge `radix-ui` / `shadcn` (~20KB)**
   * `shadcn` is only used for a single `<TooltipProvider>`. Remove it and use HeroUI's native Tooltip to drop the Radix primitives.
3. **Remove Dead Dependencies**
   * `@tiptap/pm` remains in `package.json` despite the rich text editor being purged.

---

# Remaining Legacy Patterns

* **Raw Fetch Calls:** There are still a handful of components (`circulars/page.tsx`, `admin/subjects/page.tsx`, etc.) executing raw `fetch()` calls inside `useEffect`. While they obey the API-first rule, they bypass the TanStack Query caching layer, leading to duplicate network requests and inconsistent error handling.

---

# Recommended Improvements

1. **Dependency Consolidation (High Priority):** Remove `lucide-react` and `radix-ui`. This is a strict bundle win with zero architectural downside.
2. **Eradicate Legacy Fetches (Medium Priority):** Audit the remaining raw `fetch()` instances in the admin UI and wrap them into `lib/queries/` to ensure 100% caching compliance.
3. **Extract API SDK (Future Architecture):** For ultimate mobile readiness, consider extracting `app/lib/queries` and `app/lib/http.ts` into a standalone internal Monorepo package (e.g., `@erp/api-client`). This allows both the Next.js app and a future React Native app to literally `npm install` the exact same data-fetching logic.
