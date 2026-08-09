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

## 🏗️ Architecture & Infrastructure Backlog

### INF-001 — Database Migration Pipeline & Prisma Schema Scaffolding
- **Status:** 🔄 Scheduled (Phase 0.4)
- **Description:** Establish PostgreSQL connection pooling, Prisma ORM schema in `infrastructure/database`, and baseline migration scripts for `institutes`, `users`, `parent_identities`, `students`, etc.

### INF-002 — Multi-Channel Notification Background Queue
- **Status:** ⏳ Scheduled (Phase 4 / Phase 0.7)
- **Description:** Configure Trigger.dev workers for WhatsApp Cloud API & SMS delivery retry queues, decoupled from HTTP request loops.

---

## 🔒 Security & Performance Backlog

### SEC-001 — Endpoint Rate Limiting & Audit Middleware
- **Status:** ⏳ Scheduled (Phase 7)
- **Description:** Implement IP and tenant rate limiting on authentication routes (OTP & login) and attach immutable audit logging to all sensitive data mutations.

### PERF-001 — Database Index Audit & Query Scoping
- **Status:** ⏳ Scheduled (Phase 7)
- **Description:** Audit PostgreSQL composite indexes for frequent tenant queries (`(institute_id, status)`, `(session_id, enrollment_id)`) and eliminate N+1 query patterns before beta release.
