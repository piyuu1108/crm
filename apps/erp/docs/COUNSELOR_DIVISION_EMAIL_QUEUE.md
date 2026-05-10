# Counselor Division Email Queue

Added counselor-side password resend actions with a queue-ready architecture:

- Added row and bulk action menus to the counselor division students list using HeroUI components.
- Added multi-select with `Select All` and per-row checkbox support for scalable bulk actions.
- Added direct single-email API flow for immediate feedback (`send-password-email`).
- Added bulk enqueue API flow with Upstash QStash in batches of 10 (`send-password-email/bulk`).
- Added Redis-backed job tracking (`jobId`, `total`, `sent`, `failed`, `status`) with polling endpoint for progress visibility.

Implementation split:

- UI layer: selection/action menus and progress display in counselor division page.
- API layer: single send, bulk enqueue, and job-status endpoints.
- Email service layer: provider abstraction (`app/lib/email/service.ts`) decoupled from UI and transport details.
