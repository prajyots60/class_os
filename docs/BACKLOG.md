# 📋 CoachingOS Engineering Backlog & Future Optimizations

> **Purpose**
>
> This document tracks technical debt, design refinements, performance optimizations, and future roadmap enhancements for CoachingOS.
>
> Items here are approved engineering observations to be addressed before production release.

---

## 🎨 UI & Design System Backlog

### UI-001 — Move ThemeConfig & Presets from Shared to UI Package

- **Status:** ✅ Completed (Phase 0.3 Refactoring)
- **Description:** `ThemeConfig` and `THEME_PRESETS` originally resided in `@coaching-os/shared`. Because theme configuration is fundamentally a presentation/UI concern, it was refactored into `@coaching-os/ui` under `packages/ui/src/theme/{types, presets}` to keep `@coaching-os/shared` strictly reserved for cross-cutting non-UI primitives.
- **Location:** `packages/ui/src/theme/`

### UI-002 — Dynamic Font Loading Optimization

- **Status:** ⏳ Pending (Pre-Production Optimization Gate)
- **Description:** During Phase 0.3 design showcase, Google Fonts (`Inter`, `Manrope`, `Poppins`, `Nunito`) were loaded in `RootLayout` so any preset theme could be demonstrated live. Before production deployment, optimize font loading so the application loads **only** the active institute's chosen font family dynamically:
  ```text
  Institute Context → Selected Font → Load/Inject only target font
  ```
  This avoids downloading unused font weights globally on client devices.

---

## 🔐 Authentication & Security Backlog

### SEC-002 — Trusted Proxy & IP Spoofing Prevention

- **Status:** ⏳ Scheduled (Phase 0.11 Deployment)
- **Description:** Better Auth's IP detection relies on proxy headers such as `X-Forwarded-For`. Blindly trusting forwarded headers without explicit proxy trust configuration can allow header spoofing. During Phase 0.11 Deployment, properly configure the proxy boundary:
  ```text
  Browser → Trusted Proxy / Vercel → Next.js → Better Auth
  ```
  Enforce explicit trusted proxy configurations so rate limiting and IP audit logs use authentic client IP addresses.

### AUTH-001 — Distributed Rate Limiting Storage

- **Status:** ⏳ Scheduled (Pre-Horizontal Scaling Gate / Phase 0.11)
- **Description:** Phase 0.6 uses Better Auth's default memory-backed rate limiter (`100/min` global, stricter endpoint rules). Memory storage is suitable for single-instance development/MVP. Prior to horizontal scaling across multiple web instances, transition rate-limit persistence to Redis or secondary database storage.

### AUTH-002 — Authentication Feature Phasing Baseline

| Authentication Area                 | Status                 | Notes                                           |
| ----------------------------------- | ---------------------- | ----------------------------------------------- |
| Institute email/password foundation | ✅ Completed           | Staff dev baseline (`rakesh@sharmaclasses.com`) |
| Sessions                            | ✅ Completed           | Database-backed, secure cookies, `HttpOnly`     |
| Tenant membership                   | ✅ Completed           | `requireInstituteMembership()` DB lookup        |
| Owner / Teacher / Assistant roles   | ✅ Completed           | Resolved from `User` & `InstituteMembership`    |
| ParentIdentity architecture         | ✅ Completed           | Global phone anchor + `StudentLink`             |
| Parent actual login UX              | ⏳ Later               | Deferred to parent PWA phase                    |
| Phone OTP                           | ⏳ Later               | Deferred until OTP provider selection           |
| SMS provider                        | ⏳ Later               | Cost-controlled phase decision                  |
| WhatsApp provider                   | ⏳ Later               | Cost-controlled phase decision                  |
| Student authentication              | ❌ Not planned for MVP | Students do not log in                          |
| OAuth (Google / Apple)              | ⏳ Later               | Future enhancement                              |
| 2FA / Passkeys                      | ⏳ Later               | Future enhancement                              |
| Password Recovery (Phase 0.12.6)    | ⏸ DEFERRED            | Deferred until transactional email provider set |

### AUTH-003 — Phase 0.12.6 Password Recovery Workflow

- **Status:** ⏸ **DEFERRED**
- **Reason:** Transactional email infrastructure/provider is not yet configured.
- **Existing Groundwork:**
  - Better Auth password recovery configuration groundwork exists in `infrastructure/auth/src/auth.ts`.
  - Relevant rate-limit configuration exists (`/forget-password`, `/reset-password`).
  - No production email delivery workflow has been implemented.
- **Important Note:** This phase is intentionally incomplete and must be resumed later. Do not mark Password Recovery as completed merely because Phase 0.12 itself is accepted and frozen.
- **Resume Condition:** Transactional email infrastructure is available and verified.
- **Expected Scope When Resumed:**
  ```text
  Forgot Password UI → Request reset → Transactional email → Secure reset token/link → Reset Password UI → Password update → Session/security handling → E2E + security verification
  ```

---

## 🏗️ Architecture & Infrastructure Backlog

### INF-001 — Database Migration Pipeline & Prisma Schema Scaffolding

- **Status:** ✅ Completed (Phase 0.4 & 0.6)
- **Description:** Established PostgreSQL connection adapter (`@prisma/adapter-pg`), canonical 31-table Prisma schema, and migrations.

### INF-002 — Multi-Channel Notification Background Queue

- **Status:** ⏳ Scheduled (Phase 4 / Phase 0.7)
- **Description:** Configure background job workers for WhatsApp Cloud API & SMS delivery retry queues, decoupled from HTTP request loops.

### INF-003 — Shared Infrastructure & Telemetry Stack Strategy

- **Status:** 🚧 Active (Phase 0.7 Strategy)
- **Tooling Decisions:**
  - **Logging Library:** **Pino** (Structured JSON logging to stdout, zero SaaS cost, fast Node ecosystem standard).
  - **Error Monitoring:** **Sentry** (Application exception capture, stack traces, release tracking for Next.js).
  - **Workflow Engine / Async Platform Mandate:**
    > _"CoachingOS will use a managed durable workflow platform when asynchronous workloads become necessary. The initial candidate is Inngest for event-driven workflows and Trigger.dev for long-running/compute-heavy workflows. The final platform will be selected when the first real asynchronous workload is implemented."_
  - **Infrastructure Principles:**
    1. **No Premature Workflow Engine:** Do NOT install Trigger.dev or Inngest in Phase 0.7 before actual background jobs exist.
    2. **No Redis / BullMQ Operational Overhead:** Do NOT operate Redis + worker processes during Phase 0 MVP.
    3. **Phase 0.7 Core Focus:** Establish structured logging (Pino), correlation IDs (`x-request-id`), standardized error handling, log data redaction, event contract principles, and async work abstraction.

---

## 🔒 Performance & Audit Backlog

### SEC-001 — Endpoint Rate Limiting & Audit Middleware

- **Status:** ✅ Completed for Auth (Phase 0.6) / ⏳ General API (Phase 7)
- **Description:** Endpoint rate limiting active on `/sign-in/email`, `/sign-up/email`, etc. Expand audit logging to sensitive data mutations in Phase 7.

### PERF-001 — Database Index Audit & Query Scoping

- **Status:** ⏳ Scheduled (Phase 7)
- **Description:** Audit PostgreSQL composite indexes for frequent tenant queries (`(institute_id, status)`, `(session_id, enrollment_id)`) and eliminate N+1 query patterns before beta release.

---

## 🔑 Identity & API Idempotency Backlog

### ID-001 — Business Duplicate Protection vs. Stripe-Style HTTP Idempotency

- **Status:** ℹ️ Architectural Design Note (Phase 1.4.3 / Phase 1.4.4)
- **Description:** Phase 1.4.3 enforces **business-level duplicate protection** and **transactional database atomicity** via `$transaction` and atomic row locks. If an already onboarded user submits a second onboarding request, the server rejects it cleanly with `ConflictError`.
- **API Network Retry Distinction:** If an HTTP request succeeds and commits in PostgreSQL, but the network connection drops before the HTTP response reaches the browser:
  - A standard HTTP retry will hit the business duplicate check and receive `409 ConflictError` (`User is already associated with an institute`).
  - If Stripe-style HTTP idempotency is desired in the future (where repeating a request with an `Idempotency-Key` header returns the original cached `201 Created` JSON payload without error), that behavior MUST be implemented deliberately at the presentation/API layer (e.g., API gateway / middleware caching), NOT hidden inside the domain repository layer.

