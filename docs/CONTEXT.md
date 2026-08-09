# 🗺️ CoachingOS Project Context & Phase Progress Tracker

> **Authoritative Context Document**
>
> This document maintains the complete execution history, verified architecture state, completed milestone summaries, and upcoming phase roadmap for CoachingOS.

---

## 1. Project Overview & Architecture

CoachingOS is a multi-tenant SaaS operating system built for founder-led coaching institutes (50–500 students).

### Core Architectural Mandates
- **Architecture:** Modular Monolith inside a pnpm + Turborepo monorepo.
- **Multi-Tenancy:** Shared PostgreSQL database with automatic `institute_id` row-level scoping at the repository layer.
- **Two-Layer Parent Identity (ADR-006):** Separates global `ParentIdentity` (phone anchor) and parent-managed `ChildProfile` from tenant-scoped `InstituteParent` and `Student` records.
- **Operational Entity:** `Enrollment` (not Student) owns fee structures, status, and batch participation.
- **Session-Driven Academics:** Attendance is recorded against generated `BatchSession` records rather than raw dates.
- **Token-Driven White-Label UI:** One codebase supports many coaching identities via CSS variable tokens (`var(--color-primary)`, `var(--radius-card)`), avoiding custom CSS or separate apps.

### Authoritative Architecture Specifications
- **[Software Requirements Specification (SRS)](file:///home/supra/Desktop/class_os/docs/srs.md)**
- **[System Design Document (SDD)](file:///home/supra/Desktop/class_os/docs/sdd.md)**
- **[Database & API Design Document (DADD)](file:///home/supra/Desktop/class_os/docs/dadd.md)**
- **[Engineering Playbook](file:///home/supra/Desktop/class_os/docs/ENGINEERING_PLAYBOOK.md)**
- **[Milestone Roadmap](file:///home/supra/Desktop/class_os/docs/ROADMAP.md)**
- **[ADR-0001: Monorepo Architecture Strategy](file:///home/supra/Desktop/class_os/docs/adr/0001-monorepo-architecture.md)**
- **[ADR-0002: Physical Database Schema Reconciliation](file:///home/supra/Desktop/class_os/docs/adr/0002-database-schema-reconciliation.md)**
- **[Engineering Backlog](file:///home/supra/Desktop/class_os/docs/BACKLOG.md)**

---

## 2. Phase Execution Tracker

```text
Phase 0.1 — Repository Initialization          ✅ COMPLETED
Phase 0.2 — Monorepo Architecture              ✅ COMPLETED
Phase 0.3 — Web Application Foundation         ✅ COMPLETED
Phase 0.4 — Database + Prisma Foundation        ✅ COMPLETED
Phase 0.5 — Environment & Configuration         🚧 NEXT
Phase 0.6 — Authentication Foundation          ⏳ PENDING
Phase 0.7 — Shared Engineering Infrastructure  ⏳ PENDING
Phase 0.8 — Testing Infrastructure              ⏳ PENDING
Phase 0.9 — Git & CI Pipelines                 ⏳ PENDING
Phase 0.10 — Observability Setup                ⏳ PENDING
Phase 0.11 — Production Deployment             ⏳ PENDING
                                                ↓
                                          PHASE 0 GATE
```

---

## 3. Completed Phase Overviews

### ✅ Phase 0.1 — Repository Initialization
- **Goal:** Establish a runnable pnpm + Turborepo monorepo skeleton.
- **What Was Built:** Initialized workspace (`pnpm-workspace.yaml`, `turbo.json`, `package.json`, `tsconfig.json`), Next.js 16 App Router app (`apps/web`), TypeScript strict config, Tailwind CSS v4, ESLint, Prettier, `.editorconfig`, `.gitignore`.

### ✅ Phase 0.2 — Monorepo Architecture
- **Goal:** Establish strictly governed workspace package graph.
- **What Was Built:** Renamed Next.js app to `@coaching-os/web`, explicit `"exports"` manifests (`src/index.ts`) in 8 packages, framework-independent domain boundaries (`identity`, `academics`, `billing`, `communication`, `administration`, `audit`), `ADR-0001`.

### ✅ Phase 0.3 — Web Application Foundation
- **Goal:** Build white-label design system, UI component library, and frontend infrastructure.
- **What Was Built:** Token-driven theme system (`ThemeConfig`, `THEME_PRESETS`), `@coaching-os/ui` primitives (`Button`, `Input`, `Card`, `Badge`), Google fonts (`Inter`, `Manrope`, `Poppins`, `Nunito`), Provider tree (`QueryProvider` + `ThemeProvider`), Zustand UI store (`useUIStore`), system routes (`loading`, `error`, `not-found`), Design Showcase Page (`apps/web/src/app/page.tsx`).

### ✅ Phase 0.4 — Database + Prisma Foundation
- **Goal:** Establish production-quality PostgreSQL and Prisma ORM 7 foundation.
- **What Was Built:**
  - Prisma ORM 7.9.1 with `@prisma/adapter-pg` driver adapter and `pg.Pool`.
  - Modern `prisma.config.ts` CLI configuration (datasource URL, schema path, migrations path).
  - Modern generator (`provider = "prisma-client"`) exporting client to `infrastructure/database/src/generated/client`.
  - Centralized single Prisma Client export via `infrastructure/database/src/index.ts`.
  - Canonical Prisma schema (`schema.prisma`) mapping all 27 domain models with UUID primary keys, Decimal money types, soft-delete support, and tenant isolation (`institute_id`).
  - Source Reconciliation Rules enforced: `BatchSession` attendance, `BillingPlan` for invoices, `(institute_id, subject_id, name)` batch uniqueness, optional `Program`, NO room model, NO `attendance_date`.
  - Deterministic development seed script (`prisma/seed.ts`).
  - CLI database health check script (`src/health.ts`).
  - Baseline `.env.example` file.
  - `ADR-0002: Physical Database Schema Reconciliation` in `docs/adr/0002-database-schema-reconciliation.md`.

---

## 4. Next Milestone Roadmap

### 🚧 Phase 0.5 — Environment & Configuration
- Build strongly typed environment configuration package in `packages/shared` or `infrastructure/config` using Zod schema validation.
- Validate `DATABASE_URL`, server runtime variables, and environment modes (`development`, `test`, `production`).
