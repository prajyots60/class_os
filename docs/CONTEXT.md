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
- **[ADR-0003: Asynchronous Workflow Engine Strategy](file:///home/supra/Desktop/class_os/docs/adr/0003-async-workflow-engine-strategy.md)**
- **[Engineering Backlog](file:///home/supra/Desktop/class_os/docs/BACKLOG.md)**

---

## 2. Phase Execution Tracker

```text
Phase 0.1 — Repository Initialization          ✅ COMPLETED
Phase 0.2 — Monorepo Architecture              ✅ COMPLETED
Phase 0.3 — Web Application Foundation         ✅ COMPLETED
Phase 0.4 — Database + Prisma Foundation        ✅ COMPLETED
Phase 0.5 — Environment & Configuration         ✅ COMPLETED
Phase 0.6 — Authentication Foundation          ✅ COMPLETED
Phase 0.7 — Shared Engineering Infrastructure  ✅ COMPLETED
Phase 0.8 — Testing Infrastructure              🚧 NEXT
Phase 0.9 — Git & CI Pipelines                 ⏳ PENDING
Phase 0.10 — Observability Setup                ⏳ PENDING
Phase 0.11 — Production Deployment             ⏳ PENDING
                                                ↓
                                          PHASE 0 GATE
```

---

## 3. Completed Phase Overviews

### ✅ Phase 0.1 — Repository Initialization
- Initialized monorepo workspace (`pnpm-workspace.yaml`, `turbo.json`, `package.json`, `tsconfig.json`), Next.js 16 App Router app (`apps/web`), TypeScript strict config, Tailwind CSS v4, ESLint, Prettier, `.editorconfig`, `.gitignore`.

### ✅ Phase 0.2 — Monorepo Architecture
- Renamed Next.js app to `@coaching-os/web`, explicit `"exports"` manifests (`src/index.ts`) in 8 packages, framework-independent domain boundaries (`identity`, `academics`, `billing`, `communication`, `administration`, `audit`), `ADR-0001`.

### ✅ Phase 0.3 — Web Application Foundation
- Token-driven theme system (`ThemeConfig`, `THEME_PRESETS`), `@coaching-os/ui` primitives (`Button`, `Input`, `Card`, `Badge`), Google fonts (`Inter`, `Manrope`, `Poppins`, `Nunito`), Provider tree (`QueryProvider` + `ThemeProvider`), Zustand UI store (`useUIStore`), system routes (`loading`, `error`, `not-found`), Design Showcase Page (`apps/web/src/app/page.tsx`).

### ✅ Phase 0.4 — Database + Prisma Foundation
- Prisma ORM 7.9.1 with `@prisma/adapter-pg` driver adapter, modern `prisma.config.ts`, canonical schema (27 models), initial migration `20260809052250_init_coachingos_schema`, deterministic development seed (`seed.ts`), CLI health check (`src/health.ts`), `ADR-0002`.

### ✅ Phase 0.5 — Environment & Configuration Foundation
- Zod-validated configuration package `@coaching-os/config` (`infrastructure/config`), server/client boundary separation (`serverConfig` & `clientConfig`), redacted log error formatting, CLI check script (`pnpm env:check`).

### ✅ Phase 0.6 — Authentication Foundation
- Better Auth `1.6.26` in `@coaching-os/auth`, mapped user model to `users` table, removed legacy `password_hash`, UUID v4 generation, rate limiting (`/sign-in/email`, `/sign-up/email`), server session & tenant context helpers (`requireInstituteMembership`).

### ✅ Phase 0.7 — Shared Engineering Infrastructure
- Created `@coaching-os/observability` with structured Pino logger abstraction (`logger.info`, `logger.error`, `logger.child`), standard metadata (`timestamp`, `level`, `service`, `environment`), automated redaction for 24 sensitive field paths, and Error object serialization (`serializers: { err: pino.stdSerializers.err }`).
- Created framework-independent Application Error Taxonomy in `@coaching-os/shared` (`ValidationError`, `AuthenticationError`, `AuthorizationError`, `NotFoundError`, `ConflictError`, `RateLimitError`, `InternalError`) and stable error codes (`VALIDATION_ERROR`, `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `RATE_LIMITED`, `INTERNAL_ERROR`).
- Implemented `getOrCreateRequestId(headers)` (`crypto.randomUUID()`) and `toErrorResponse(error, requestId)` producing clean public JSON responses with `x-request-id` header without leaking stack traces or internal secrets.
- Defined Domain Event Contract Principles (`ApplicationEvent`, `DomainEventEnvelope`) in `@coaching-os/shared`.
- Authored `ADR-0003: Asynchronous Workflow Engine Strategy` (`docs/adr/0003-async-workflow-engine-strategy.md`) documenting zero workflow engine installation in Phase 0.7 and decision framework for Inngest vs Trigger.dev when real async workloads arrive.
- Zero database schema modifications or migrations.

---

## 4. Next Milestone Roadmap

### 🚧 Phase 0.8 — Testing Infrastructure
- Configure Vitest unit/integration testing framework, Playwright end-to-end testing setup, test DB isolation utilities, mock factories, and execution scripts (`pnpm test`, `pnpm test:e2e`).
