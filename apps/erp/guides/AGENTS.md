

# FOlow this first !important:Don’t jump directly to fetching components from MCP. First, review existing .tsx files (such as dashboard and table implementations) to check if the required functionality already exists. Only if the requirement is not met there, then proceed to fetch the necessary components.

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# 🧠 VTCBCSR ERP — AGENTS GUIDE (FINAL)

> Single source of truth for all architecture, frontend, backend, and infrastructure decisions.  
> This guide must be followed strictly for consistency, scalability, and production readiness.

---

# ⚠️ Core Principle

The system is:

- **Edge-first**
- **Serverless**
- **Stateless**
- **Decoupled**

Any decision that introduces:
- tight coupling  
- server state  
- long-running processes  

→ is **incorrect by design**

---

# 🏗️ Architecture Overview

Based on system spec fileciteturn2file0

- Frontend = **CSR (Client Side Rendering only)**
- Backend = **Stateless API layer**
- Database = **HTTP-based serverless PostgreSQL (Neon)**
- Storage = **Direct-to-object storage (R2)**
- Edge = **Security + rate limiting + request validation**
- Cache = **Upstash Redis**
- Logs = **Axiom**

---

# 🎨 Frontend Rules

## Rendering

- Always use **CSR**
- No SSR for dashboard routes
- API is the only data source

---

## UI System

- Use **HeroUI components**
- look at guides/herov2tov3.md for more detail
- Maintain consistency
- Avoid unnecessary customization

---

## Theme System

- Single source: `ThemeConfigProvider`
- Never duplicate theme state
- Never use external theme libraries

---

## Global State

Use Zustand ONLY for:
- UI state (modals, toggles, sidebar)

Do NOT use for:
- API data  
- server state  

---

# 📡 API Layer Rules

## Design

- Strict REST structure
- Resource-based endpoints
- Predictable naming

---

## Response Format (MANDATORY)

All APIs must return:

- success flag  
- data OR error  

Never return raw database responses.

---

## Error Handling

- No raw errors to client  
- Always sanitized response  
- Full error goes to logging system  

---

## Pagination (CRITICAL)

- All list endpoints must use pagination  
- No full-table reads allowed  

---

## Validation

- All inputs must be validated  
- Never trust client data  

---

# 🔐 Authentication & Authorization

## Edge Layer

- JWT verified at Edge
- Unauthorized requests blocked before API

---

## API Layer (MANDATORY DOUBLE CHECK)

Even after Edge validation:

- JWT must be re-verified in API routes  
- Prevent header spoofing attacks  

---

## RBAC

- Role is injected via headers from Edge  
- Backend must enforce role checks  

---

# ⚡ TanStack Query Rules

## Usage

- Mandatory for all API interactions  
- No direct fetch in components  

---

## Responsibilities

- Caching  
- Deduplication  
- Background refetching  
- Mutation handling  

---

## Structure

Each feature must have:

- API layer  
- Query layer  
- Mutation layer  

---

## Rules

- Never mix UI + API logic  
- Always invalidate cache after mutation  
- Use proper query keys  

---

# 🗄️ Database Rules (Neon + Drizzle)

## ORM

- Use Drizzle only  
- Avoid heavy ORMs  

---

## Connection

- Use HTTP driver (serverless-safe)  
- Never use direct TCP pooling  

---

## Schema Design

- Flat and optimized for reads  
- Avoid deep relational nesting  

---

## Migrations

- Must be separate from runtime  
- Executed via CI/CD pipeline  

---

# 📦 File Storage Rules

- Use **direct client upload to object storage (R2)**  
- Backend must NOT handle file uploads  
- Store only file references in DB  

---

# 🚀 Upstash Redis — Usage Rules

## Purpose

Used for:

- Rate limiting  
- Request tracking  
- Temporary data (short-lived)  

---

## What Redis SHOULD store

- IP request counters  
- Rate limit windows  
- Short TTL flags  
- Lightweight cache (optional)

---

## What Redis MUST NOT store

- Persistent business data  
- Critical system data  
- Large objects  

---

## Rate Limiting Strategy

- Sliding window algorithm  
- Global IP tracking  
- Applied at Edge  

---

## Important Reality

- Redis reduces abuse  
- Does NOT fully stop DDoS  

---

# 🛡️ Security Rules

- Never trust frontend  
- Always validate inputs  
- Always check roles  
- Sensitive operations must be logged  

---

## Security Logging

Must log:

- Failed authentication attempts  
- Rate limit violations  
- Unauthorized access attempts  

---

# ⚙️ Core Workflow Rule (Admissions)

## Shared Device Handling

- No long-term storage of draft data  
- Use session-based temporary storage  

---

## Transaction Integrity

- All related inserts must be atomic  
- If one fails → rollback entire transaction  

---

## Cleanup

- On success → clear client session data immediately  

---

# 📊 Logging & Observability (Axiom)

## Strategy

- Logging must be asynchronous  
- Never block user response  

---

## What to Log

- Critical actions only:
  - deletes  
  - updates  
  - admin changes  
  - lifecycle events  

---

## What NOT to Log

- frequent reads  
- normal usage events  

---

# ⚡ Performance Rules

- Always paginate  
- Avoid large payloads  
- Use caching aggressively  
- Avoid unnecessary re-renders  

---

# 🧱 Project Structure Rules

- All authenticated routes inside `/app`  
- Feature-based folder structure  
- Separate:
  - API  
  - UI  
  - state  

---

# 🚫 Anti-Patterns (STRICTLY FORBIDDEN)

- fetch inside components  
- storing server data in Zustand  
- skipping validation  
- bypassing pagination  
- mixing business logic in UI  
- writing logs to main DB  
- handling file uploads in backend  

---

# 📘 Documentation Rule

After any update:

- Create/update docs in `/docs` folder  
- Keep it concise but meaningful  

---

## Documentation Format (MANDATORY)

Always write like:

- “Added API for student creation with validation and transaction safety”
- “Integrated Redis for rate limiting using sliding window”
- “Implemented TanStack Query for students module with caching and invalidation”

Avoid vague notes.

---

# ✅ Final Rule

Code must be:

- predictable  
- debuggable  
- scalable  

If a solution feels:
- hacky  
- tightly coupled  
- hard to reason  

→ it is wrong and must be rewritten.

---

This is now **complete, production-grade, and aligned with your architecture doc**.