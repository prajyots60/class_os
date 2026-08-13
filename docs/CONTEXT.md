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

- **[Master System Overview & Phase Progression](file:///home/supra/Desktop/class_os/docs/SYSTEM_OVERVIEW.md)**
- **[Software Requirements Specification (SRS)](file:///home/supra/Desktop/class_os/docs/srs.md)**
- **[System Design Document (SDD)](file:///home/supra/Desktop/class_os/docs/sdd.md)**
- **[Database & API Design Document (DADD)](file:///home/supra/Desktop/class_os/docs/dadd.md)**
- **[Engineering Playbook](file:///home/supra/Desktop/class_os/docs/ENGINEERING_PLAYBOOK.md)**
- **[Milestone Roadmap](file:///home/supra/Desktop/class_os/docs/ROADMAP.md)**
- **[ADR-0001: Monorepo Architecture Strategy](file:///home/supra/Desktop/class_os/docs/adr/0001-monorepo-architecture.md)**
- **[ADR-0002: Physical Database Schema Reconciliation](file:///home/supra/Desktop/class_os/docs/adr/0002-database-schema-reconciliation.md)**
- **[ADR-0003: Asynchronous Workflow Engine Strategy](file:///home/supra/Desktop/class_os/docs/adr/0003-async-workflow-engine-strategy.md)**
- **[ADR-0004: Testing Database & Isolation Strategy](file:///home/supra/Desktop/class_os/docs/adr/0004-testing-database-strategy.md)**
- **[ADR-0005: GitHub Actions Continuous Integration Strategy](file:///home/supra/Desktop/class_os/docs/adr/0005-ci-strategy.md)**
- **[ADR-0008: Brand Identity & Template Engine Architecture (Future Roadmap)](file:///home/supra/Desktop/class_os/docs/adr/0008-brand-identity-template-architecture.md)**
- **[ADR-0017: Multi-Tenant Cross-Tenant Access Security Hardening](file:///home/supra/Desktop/class_os/docs/adr/0017-multi-tenant-cross-tenant-security-hardening.md)**
- **[Phase 1 Domain & Architecture Contract](file:///home/supra/Desktop/class_os/docs/phases/phase1.md)**
- **[Phase 2 Academics Architecture & Domain Contract](file:///home/supra/Desktop/class_os/docs/phases/02/phase2-academics-contract.md)**
- **[Phase 1.14 Specification](file:///home/supra/Desktop/class_os/docs/phases/phase1.14-cross-tenant-security-hardening.md)**
- **[Engineering Backlog](file:///home/supra/Desktop/class_os/docs/BACKLOG.md)**

---

## 2. Phase Execution Tracker

```text
================================================================================
                       COACHINGOS PHASE EXECUTION TRACKER
================================================================================

PHASE 0 — ENGINEERING FOUNDATION                      ✅ COMPLETED
  ├── Phase 0.1  — Repository Initialization            ✅ COMPLETED
  ├── Phase 0.2  — Monorepo Architecture                ✅ COMPLETED
  ├── Phase 0.3  — Web Application Foundation           ✅ COMPLETED
  ├── Phase 0.4  — Database + Prisma Foundation          ✅ COMPLETED
  ├── Phase 0.5  — Environment & Configuration           ✅ COMPLETED
  ├── Phase 0.6  — Authentication Foundation            ✅ COMPLETED
  ├── Phase 0.7  — Shared Engineering Infrastructure    ✅ COMPLETED
  ├── Phase 0.8  — Testing Infrastructure                ✅ COMPLETED
  ├── Phase 0.9  — Git & CI Pipelines                   ✅ COMPLETED
  ├── Phase 0.10 — Observability Setup                  ✅ COMPLETED
  ├── Phase 0.11 — Production Deployment               ✅ COMPLETED
  └── Phase 0.12 — Public & Authentication UX          ✅ COMPLETED & FROZEN
        ├── Phase 0.12.0 — Architecture & UX Contract Freeze 🟢 (Freeze)
        ├── Phase 0.12.1 — UI Foundation & Design System Audit ✅
        ├── Phase 0.12.2 — Public Landing Page 🟢 (FROZEN)
        │     ├── 0.12.2.0 — UX & Content Contract 🟢 (Freeze)
        │     ├── 0.12.2.1 — Marketing Layout Shell ✅
        │     ├── 0.12.2.2 — Hero Section ✅
        │     ├── 0.12.2.3 — Product Workflow Section ✅
        │     ├── 0.12.2.4 — Core Capabilities Section ✅
        │     ├── 0.12.2.5 — Roles & Value Section ✅
        │     ├── 0.12.2.6 — Trust & Security Section ✅
        │     ├── 0.12.2.7 — Final CTA Section ✅
        │     ├── 0.12.2.8 — Responsive, SEO & Accessibility Audit ✅
        │     └── 0.12.2.9 — Landing Page Acceptance Gate 🟢 (ACCEPTED)
        ├── Phase 0.12.3 — Authentication Layout & Shared Components ✅
        ├── Phase 0.12.4 — Sign Up UI & Registration Flow ✅
        ├── Phase 0.12.5 — Sign In UI & Authentication Flow ✅
        ├── Phase 0.12.6 — Password Recovery ⏸ DEFERRED
        ├── Phase 0.12.7 — Session & Route Guards ✅
        ├── Phase 0.12.8 — Authenticated Application Shell ✅
        ├── Phase 0.12.9 — Full Browser Journey Integration ✅
        ├── Phase 0.12.10 — Security & UX Test Matrix ✅
        └── Phase 0.12.11 — Phase 0.12 Acceptance Gate 🟢 (ACCEPTED & FROZEN)
                                                        ↓
                                                  PHASE 0 GATE (PASSED)

PHASE 1 — FOUNDATION & IDENTITY MODULE               🟢 ACCEPTED & FROZEN
  ├── Phase 1.0 — Identity Domain Contract Freeze       ✅ COMPLETED (FROZEN)
  ├── Phase 1.1 — Institute Tenant Core                 ✅ COMPLETED
  ├── Phase 1.2 — Users & Memberships                   ✅ COMPLETED
  ├── Phase 1.3 — Capability-Based RBAC                 ✅ COMPLETED & FROZEN
  ├── Phase 1.4 — Institute Onboarding Workflow          ✅ COMPLETED & FROZEN
  ├── Phase 1.5 — Institute Settings & Branding          ✅ COMPLETED & FROZEN
  │     ├── Phase 1.5.0 — Architecture & Contract Freeze 🟢 (ACCEPTED & FROZEN)
  │     ├── Phase 1.5.1 — Settings Domain Use Cases & Auth ✅ COMPLETED
  │     ├── Phase 1.5.2 — Settings API & Validators ✅ COMPLETED
  │     ├── Phase 1.5.3 — Settings UI Feature ✅ COMPLETED
  │     └── Phase 1.5.4 — Security E2E & Acceptance Gate 🟢 (ACCEPTED & FROZEN)
  ├── Phase 1.6 — Global ParentIdentity Platform Layer  ✅ COMPLETED & FROZEN
  │     ├── Phase 1.6.0 — Architecture & Contract Freeze 🟢 (ACCEPTED & FROZEN)
  │     ├── Phase 1.6.1 — ParentIdentity Domain Entities & Value Objects ✅ COMPLETED
  │     ├── Phase 1.6.2 — ParentIdentity Repository & Persistence Layer ✅ COMPLETED
  │     ├── Phase 1.6.3 — ParentIdentity Application Use Cases ✅ COMPLETED
  │     ├── Phase 1.6.4 — Better Auth Identity Integration ✅ COMPLETED
  │     ├── Phase 1.6.5 — Multi-Tenant Security & Authorization Matrix ✅ COMPLETED
  │     └── Phase 1.6.6 — Phase 1.6 Acceptance Gate 🟢 (ACCEPTED & FROZEN)
  └── Phase 1.7 — Tenant InstituteParent CRM Layer      🟢 COMPLETED & FROZEN
        ├── Phase 1.7.0 — Architecture & Contract Freeze 🟢 (ACCEPTED & FROZEN)
        ├── Phase 1.7.1 — InstituteParent Domain Entity & Value Objects ✅ COMPLETED
        ├── Phase 1.7.2 — InstituteParent Repository & PostgreSQL Persistence Layer ✅ COMPLETED
        ├── Phase 1.7.3 — InstituteParent Application Use Cases ✅ COMPLETED
        ├── Phase 1.7.4 — ParentIdentity ↔ InstituteParent Linking & Authorization ✅ COMPLETED
        ├── Phase 1.7.5 — InstituteParent API Boundary & Validators ✅ COMPLETED
        ├── Phase 1.7.6 — InstituteParent Security / Privacy E2E Matrix ✅ COMPLETED
        ├── Phase 1.7.7 — InstituteParent Staff UI / CRM Feature ✅ COMPLETED
        ├── Phase 1.7.8 — UX, Accessibility & Tenant-Scoped Workflow Testing ✅ COMPLETED
  └── Phase 1.8 — Student Admission & Profile Core      🟢 COMPLETED & FROZEN
        ├── Phase 1.8.0 — Architecture & Contract Freeze 🟢 (ACCEPTED & FROZEN)
        ├── Phase 1.8.1 — Student Domain Entity & Value Objects ✅ COMPLETED
        ├── Phase 1.8.2 — Student Repository & PostgreSQL Persistence Layer ✅ COMPLETED
        ├── Phase 1.8.3 — Student Application Use Cases ✅ COMPLETED
        ├── Phase 1.8.4 — Student Admission & Lifecycle Rules ✅ COMPLETED
        ├── Phase 1.8.5 — Student API Boundary & Validators ✅ COMPLETED
        ├── Phase 1.8.6 — Student Security / Tenant E2E Matrix ✅ COMPLETED
        ├── Phase 1.8.7 — Student Staff UI / Admission Feature ✅ COMPLETED
        ├── Phase 1.8.8 — UX, Accessibility & Admission Workflow Testing ✅ COMPLETED
        └── Phase 1.8.9 — Phase 1.8 Acceptance Gate 🟢 (ACCEPTED & FROZEN)
  └── Phase 1.9 — Guardian / Student Relationship Layer 🟢 COMPLETED & FROZEN
        ├── Phase 1.9.0 — Architecture & Contract Freeze 🟢 (ACCEPTED & FROZEN)
        ├── Phase 1.9.1 — Relationship Domain Entity & Value Objects ✅ COMPLETED
        ├── Phase 1.9.2 — Relationship Repository & PostgreSQL Persistence Layer ✅ COMPLETED
        ├── Phase 1.9.3 — Relationship Application Use Cases ✅ COMPLETED
        ├── Phase 1.9.4 — Guardian/Student Linking & Authorization ✅ COMPLETED
        ├── Phase 1.9.5 — Relationship API Boundary & Validators ✅ COMPLETED
        ├── Phase 1.9.6 — Relationship Security / Privacy E2E Matrix ✅ COMPLETED
        ├── Phase 1.9.7 — Staff Guardian / Relationship UI ✅ COMPLETED
        ├── Phase 1.9.8 — UX, Accessibility & Workflow Testing ✅ COMPLETED
        └── Phase 1.9.9 — Phase 1.9 Acceptance Gate 🟢 (ACCEPTED & FROZEN)
  └── Phase 1.10 — Academic Hierarchy (Programs, Subjects, Batches) 🟢 COMPLETED & FROZEN
        ├── Phase 1.10.0 — Architecture & Contract Freeze 🟢 (ACCEPTED & FROZEN)
        ├── Phase 1.10.1 — Academic Hierarchy Domain Entities & Value Objects ✅ COMPLETED
        ├── Phase 1.10.2 — Repository & PostgreSQL Persistence Layer ✅ COMPLETED
        ├── Phase 1.10.3 — Application Use Cases & State Machine Rules ✅ COMPLETED
        ├── Phase 1.10.4 — API Boundary & Presentation Validators ✅ COMPLETED
        ├── Phase 1.10.5 — Security & Tenant Isolation E2E Matrix ✅ COMPLETED
        ├── Phase 1.10.6 — Staff Academic Workspace UI ✅ COMPLETED
        ├── Phase 1.10.7 — UX, Accessibility & Workflow Testing ✅ COMPLETED
        └── Phase 1.10.8 — Phase 1.10 Acceptance Gate & Freeze 🟢 (ACCEPTED & FROZEN)
  └── Phase 1.11 — Student Enrollment Lifecycle 🟢 COMPLETED & FROZEN
        ├── Phase 1.11.0 — Architecture & Contract Freeze 🟢 (ACCEPTED & FROZEN)
        ├── Phase 1.11.1 — Enrollment Domain Entity & Value Objects ✅ COMPLETED
        ├── Phase 1.11.2 — Repository & PostgreSQL Persistence ✅ COMPLETED
        ├── Phase 1.11.3 — Application Use Cases & Enrollment Lifecycle ✅ COMPLETED
        ├── Phase 1.11.4 — API Boundary & Presentation Validators ✅ COMPLETED
        ├── Phase 1.11.5 — Security & Tenant Isolation E2E Matrix ✅ COMPLETED
        ├── Phase 1.11.6 — Staff Enrollment UI ✅ COMPLETED
        ├── Phase 1.11.7 — UX, Accessibility & Workflow Testing ✅ COMPLETED
        └── Phase 1.11.8 — Phase 1.11 Acceptance Gate & Freeze 🟢 (ACCEPTED & FROZEN)
  └── Phase 1.12 — Protected Identity APIs (`/api/v1/...`) 🟢 ACCEPTED & FROZEN
        ├── Phase 1.12.0 — Architecture & Contract Freeze 🟢 (ACCEPTED & FROZEN)
        ├── Phase 1.12.1 — Protected Identity API Domain/Application Contracts ✅ COMPLETED
        ├── Phase 1.12.2 — API Infrastructure & Persistence Adapters ✅ COMPLETED
        ├── Phase 1.12.3 — API Boundary & Presentation Validators ✅ COMPLETED
        ├── Phase 1.12.4 — Authentication, Authorization & Tenant Isolation ✅ COMPLETED
        ├── Phase 1.12.5 — Security & Adversarial E2E Audit ✅ COMPLETED
        ├── Phase 1.12.6 — Protected Identity API Integration / Staff Consumption ✅ COMPLETED
        ├── Phase 1.12.7 — API UX / Developer Experience / Documentation ✅ COMPLETED
        └── Phase 1.12.8 — Final Acceptance Gate & Freeze 🟢 (ACCEPTED & FROZEN)
  └── Phase 1.13 — Staff UI & Onboarding Workflows 🟢 COMPLETED & FROZEN
        ├── Phase 1.13.0 — Architecture & Contract Freeze 🟢 (ACCEPTED & FROZEN)
        ├── Phase 1.13.1 — Staff Domain & Application Layer ✅ COMPLETED
        ├── Phase 1.13.2 — Staff API & Validators ✅ COMPLETED
        ├── Phase 1.13.3 — Staff Security & E2E Matrix ✅ COMPLETED
        ├── Phase 1.13.4 — Staff Workspace UI Feature ✅ COMPLETED
        ├── Phase 1.13.5 — UX, Accessibility & Workflow Testing ✅ COMPLETED
        └── Phase 1.13.6 — Phase 1.13 Acceptance Gate & Freeze 🟢 (ACCEPTED & FROZEN)
  └── Phase 1.14 — Multi-Tenant Cross-Tenant Security Hardening 🟢 COMPLETED & FROZEN
        ├── Phase 1.14.0 — Security Architecture & Threat Model 🟢 (ACCEPTED & FROZEN)
        ├── Phase 1.14.1 — Repository & Application Hardening 🟢 (ACCEPTED & FROZEN)
        ├── Phase 1.14.2 — API Boundary Hardening 🟢 (ACCEPTED & FROZEN)
        ├── Phase 1.14.3 — Adversarial Security E2E Matrix 🟢 (ACCEPTED & FROZEN)
        └── Phase 1.14.4 — Phase 1.14 Acceptance Gate & Freeze 🟢 (ACCEPTED & FROZEN)
  └── Phase 1.15 — Final Phase 1 Acceptance Gate & Freeze 🟢 (ACCEPTED & FROZEN)
                                                        ↓
                                                  PHASE 1 GATE (PASSED & FROZEN)
PHASE 2 — ACADEMICS MODULE                             🟡 IN EXECUTION
  ├── Phase 2.0 — Architecture & Contract Freeze              🟢 ACCEPTED & FROZEN
  ├── Phase 2.1 — Scheduling & Session Engine (`Schedule` & `BatchSession`) 🟢 ACCEPTED & COMPLETED
  ├── Phase 2.2 — Session Attendance Core (`Attendance`)       🟢 ACCEPTED & COMPLETED
  ├── Phase 2.3 — Homework Workflow (`Homework`)               🟢 ACCEPTED & COMPLETED
  ├── Phase 2.4 — Assessment & Bulk Marks Engine (`Test` & `Marks`) ⏳ UPCOMING
  ├── Phase 2.5 — Protected Academics APIs (`/api/v1/academics/...`) ⏳ UPCOMING
  ├── Phase 2.6 — Staff Academic Workspace UI (Teacher & Staff Workspaces) ⏳ UPCOMING
  ├── Phase 2.7 — UX / Accessibility & Security E2E Matrix     ⏳ UPCOMING
  └── Phase 2.8 — Phase 2 Acceptance Gate & Milestone Freeze   ⏳ UPCOMING
                                                        ↓
PHASE 3  Billing Module                               ⏳ UPCOMING
    ↓
PHASE 4  Communication Module                         ⏳ UPCOMING
    ↓
PHASE 5  Parent PWA                                   ⏳ UPCOMING
    ↓
PHASE 6  Staff Dashboard & UX                         ⏳ UPCOMING
    ↓
PHASE 7  Production & Beta Readiness                  ⏳ UPCOMING
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

- Better Auth `1.6.25` in `@coaching-os/auth`, mapped user model to `users` table, removed legacy `password_hash`, UUID v4 generation, rate limiting (`/sign-in/email`, `/sign-up/email`), server session & tenant context helpers (`requireInstituteMembership`).

### ✅ Phase 0.7 — Shared Engineering Infrastructure

- Pino `9.6.0` logger abstraction (`@coaching-os/observability`), sensitive path redaction (24 paths), framework-independent error taxonomy (`@coaching-os/shared`), hardened server-side request ID generation (`crypto.randomUUID()`), `toErrorResponse` HTTP boundary, `ADR-0003`.

### ✅ Phase 0.8 — Testing Infrastructure

- Established Vitest `4.1.10` for unit and integration testing and Playwright `1.62.1` for browser E2E testing (Chromium).
- Configured dedicated PostgreSQL test database `TEST_DATABASE_URL` (`coachingos_test`) with fail-closed safety guard `validateTestEnvironment()`. Zero SQLite substitute mocking.
- Synchronized table truncation strategy `cleanTestDatabase()` via `db.$executeRawUnsafe`.
- Created deterministic data factories (`createTestInstitute`, `createTestUser`, `createTestStudent`, `createTestBatch`, `createTestEnrollment`, `createTestParentIdentity`, `createTestChildProfile`).
- Multi-tenant data isolation suite (`tenant-isolation.test.ts`), ParentIdentity two-layer architecture suite (`parent-identity.test.ts`), Better Auth session suite (`auth.test.ts`), Error taxonomy & Pino security suite (`logger.test.ts`, `errors.test.ts`).
- Playwright E2E smoke suite (`smoke.spec.ts`) with semantic selectors.
- Zero Prisma schema changes or fake migrations created. `ADR-0004`.

### ✅ Phase 0.9 — Git & CI Pipelines

- Configured GitHub Actions CI workflow (`.github/workflows/ci.yml`) featuring 4 pipeline jobs (`quality`, `database-and-tests`, `e2e`, `build`).
- Implemented PostgreSQL 17 service container (`postgres:17-alpine`) in CI with `pg_isready` readiness checks and disposable CI credentials (`coachingos_ci`).
- Enforced `pnpm install --frozen-lockfile` dependency installation under Node.js 24 LTS and pnpm 11.x (`pnpm@11.15.0`).
- Validated Prisma 7 migration deployment (`pnpm db:migrate:deploy`) and schema drift detection (`pnpm db:status`).
- Configured Playwright Chromium E2E browser test execution in CI with automated failure artifact upload (`upload-artifact@v4`, 7-day retention).
- Formally declared `engines` in root `package.json` (`node >=24.0.0`, `pnpm >=11.0.0`).
- Documented Git branch strategy, Conventional Commits format, PR quality rules, and branch protection expectations in `ENGINEERING_PLAYBOOK.md` and `ADR-0005`.

### ✅ Phase 0.10 — Observability Setup

- Evaluated error tracking vendors (Sentry vs Better Stack vs Pino) through documented research (Date: August 9, 2026).
- Built vendor-neutral `ErrorReporter` interface (`captureException`, `captureMessage`, `setUser`, `setContext`) and `PinoErrorReporter` implementation in `@coaching-os/observability`.
- Enforced automated redaction of 24 sensitive field paths and expected business error filtering (`ValidationError`, `NotFoundError`, `ConflictError` mapped to `info`/`warn` without external error reports).
- Implemented high-precision monotonic request timing using `performance.now()` with configurable slow request thresholds (`< 500ms` info, `500ms - 2000ms` warn, `> 2000ms` critical slow).
- Standardized structured security and auth event logging using `domain.action.result` conventions (`auth.sign_in.success`, `security.authorization.denied`).
- Created `/api/health` application and database readiness endpoint (`NextResponse.json`, `db.$queryRaw\`SELECT 1\``) returning HTTP 200 OK or 503 Service Unavailable without leaking internal stack traces or connection strings.
- Added Playwright E2E health check suite (`health.spec.ts`) and `pnpm verify:observability` CLI script.
- Documented `ADR-0006` and updated `ENGINEERING_PLAYBOOK.md` Section 16.

### ✅ Phase 0.11 — Production Deployment

- Evaluated managed PostgreSQL options (Neon vs Prisma Postgres vs Supabase) as of August 9, 2026.
- Selected Neon PostgreSQL for instant copy-on-write database branching (10 free branches/project) and native PgBouncer connection pooling without 7-day inactivity database pauses.
- Configured dual database connection strategy: pooled `DATABASE_URL` for serverless application routes and direct `DIRECT_URL` for Prisma CLI migrations (`prisma migrate deploy`).
- Enforced 4 isolated environment trust boundaries (Development, Test, Preview, Production).
- Created production deployment playbook in `docs/DEPLOYMENT.md` detailing pre-deployment, deployment, post-deployment, and rollback checklists.
- Documented `ADR-0007` (Production Deployment Strategy) and updated `ENGINEERING_PLAYBOOK.md` Section 17.
- **Phase 0.11 (Production Deployment Strategy)**: Established production deployment strategy in `docs/adr/0007-production-deployment-strategy.md` and `docs/DEPLOYMENT.md`.

### 🚧 Phase 0.12 — Public & Authentication UX (In Progress)

- **Phase 0.12.0 (Architecture & UX Contract Freeze)**: Conducted complete repository and authentication backend audit. Defined authoritative frontend architecture in `docs/phases/phase0.12-public-auth-ux.md`, establishing route groups (`(marketing)`, `(auth)`, `(app)`), thin App Router page composition boundaries (< 30 lines per `page.tsx`), component ownership boundaries (`components/ui`, `features/auth`, `features/marketing`, `features/onboarding`, `features/dashboard`), authentication state machine, and Phase 0.12 implementation roadmap.
- **Phase 0.12.1 (UI Foundation & Design System Audit)**: Established the UI foundation in `@coaching-os/ui` and `apps/web`. Retained existing primitives (`Button`, `Input`, `Card`, `Badge`), created missing primitives (`Label`, `Textarea`, `Alert`, `Spinner`, `Skeleton`, `Separator`), created web brand (`CoachingOSLogo`) and layout (`Container`, `Section`) primitives, created unit test suite (`ui-primitives.test.ts`), and verified zero backend/auth/onboarding contract regressions.
- **Phase 0.12.2.0 (Landing Page UX & Content Contract Freeze)**: Created authoritative landing page UX and content contract in `docs/phases/phase0.12.2-landing-page.md`. Frozen target audience (institute owners/founders), core positioning ("Run your coaching institute from one place"), primary CTA (`"Get Started"` -> `/sign-up`), secondary CTA (`"Sign In"` -> `/sign-in`), 8-section vertical information architecture, component hierarchy under `apps/web/src/components/marketing/`, factual trust/security boundaries (zero fake claims), and non-goals. Zero code modifications introduced during contract freeze.
- **Phase 0.12.2.1 (Marketing Layout Shell)**: Implemented Next.js route group layout `app/(marketing)/layout.tsx` rendering `MarketingHeader` + `<main>` + `MarketingFooter`, created `(marketing)/page.tsx` composition placeholder serving `/`, built `MarketingHeader` with desktop anchor links and `<MobileNav />` client toggle, built `MarketingFooter` with dynamic copyright and system status badge, removed obsolete flat `app/page.tsx`, and verified zero database/auth/RBAC dependencies in marketing components.
- **Phase 0.12.2.2 (Hero Section Component)**: Implemented 100% Server Component `<HeroSection />` (`hero-section.tsx`) and `<HeroProductPreview />` (`hero-product-preview.tsx`), strictly adhering to Section 7.2 of frozen UX contract (H1 headline _"Run your coaching institute from one place."_, supporting copy, eyebrow badge, primary CTA `/sign-up`, secondary CTA `/sign-in`, multi-tenant trust micro-copy, and realistic React/CSS institute workspace dashboard preview). Composed in `app/(marketing)/page.tsx` and verified zero DB/auth/RBAC dependencies.
- **Phase 0.12.2.3 (Product Workflow Section)**: Implemented 100% Server Component `<WorkflowSection />` (`workflow-section.tsx`) rendering a 4-step operational progression (`STEP 01`: Set Up Your Institute, `STEP 02`: Add Team & Students, `STEP 03`: Run Daily Operations, `STEP 04`: Stay in Total Control). Composed in `app/(marketing)/page.tsx` with zero DB/auth dependencies.
- **Phase 0.12.2.4 (Core Capabilities Section)**: Implemented 100% Server Component `<CapabilitiesSection />` (`capabilities-section.tsx`) rendering an 8-card domain grid (Student Management, Academic Operations, Attendance Tracking, Homework & Tasks, Tests & Marks, Fees & Billing, Staff & Role Control, Institute Announcements). Composed in `app/(marketing)/page.tsx` with zero DB/auth dependencies.
- **Phase 0.12.2.5 (Roles & Value Section)**: Implemented 100% Server Component `<RolesSection />` (`roles-section.tsx`) rendering 4 canonical role cards (Institute Owner, Teacher, Assistant, Parent & Student) highlighting role-specific operational value propositions. Composed in `app/(marketing)/page.tsx` with zero DB/auth dependencies.
- **Phase 0.12.2.6 (Trust / Security Section)**: Implemented 100% Server Component `<TrustSection />` (`trust-section.tsx`) rendering 4 technical security concept cards (Row-Level Tenant Isolation, Capability RBAC, Server Sessions, Audit Logging) strictly grounded in existing codebase architecture. Composed in `app/(marketing)/page.tsx` with zero DB/auth dependencies.
- **Phase 0.12.2.7 (Final CTA Section)**: Implemented 100% Server Component `<CTASection />` (`cta-section.tsx`) rendering a conversion panel (`id="get-started"`) with primary CTA `/sign-up`, secondary CTA `/sign-in`, and trust micro-copy. Composed in `app/(marketing)/page.tsx` with zero DB/auth dependencies.
- **Phase 0.12.2.8 (Responsive, SEO & Accessibility Audit)**: Completed audit pass across all marketing components. Verified 5 responsive viewports (`320px` to `1280px+`), applied `scroll-mt-16` across all landmarks, enforced 1 H1 page hierarchy, added Open Graph & Twitter metadata in `app/(marketing)/layout.tsx`, and verified zero presentation boundary leaks.
- **Phase 0.12.2.9 (Phase 0.12.2 Acceptance Gate)**: Completed formal acceptance audit of Phase 0.12.2 landing page. Verified route resolution (`/`), 6 section sequence, navigation anchor targets (`#features`, `#workflow`, `#roles`, `#security`, `#get-started`), 40 unit tests passing, zero backend/database/auth dependencies in marketing components, and explicit deferrals of Auth UI. **Phase 0.12.2 ACCEPTED & FROZEN.**
- **Phase 0.12.3 (Authentication Layout & Shared Components)**: Established the authentication UI foundation. Created route group layout `app/(auth)/layout.tsx` serving `/sign-in` and `/sign-up` without URL prefixes, built reusable auth components under `apps/web/src/features/auth/` (`AuthLayoutShell`, `AuthBranding`, `AuthCard`, `AuthHeader`, `AuthField`, `AuthError`, `AuthFooter`), created minimal placeholder routes, and verified presentation boundary isolation with zero prohibited server/DB/auth dependencies.

### ✅ Phase 0.12.4 — Sign Up UI & Registration Flow (COMPLETED)

- **Sign Up Domain & UI Implementation**: Created `/sign-up` public registration page and client component `SignUpForm` in `apps/web/src/features/auth/sign-up`.
- **Form Validation & UX State**: Implemented Zod validation schema `signUpSchema` (name, email, password min 8, password matching) and robust state handling with `@hookform/resolvers/zod`. Added password visibility toggles (`Eye` / `EyeOff`), loading state with `Spinner`, and `AuthError` alerts.
- **Better Auth Client Integration**: Connected `SignUpForm` directly to `@coaching-os/auth/client` (`signUp.email`), ensuring authentication sessions are established automatically upon successful registration.
- **Server Identity Boundary Invariants**: Verified that zero identity attributes (`userId`, `instituteId`, `membershipId`, `role`, `status`, `tenantId`) are accepted from client request payloads. Automatically redirects authenticated users away from `/sign-up` to `/onboarding`.

### ✅ Phase 0.12.5 — Sign In UI & Authentication Flow (COMPLETED)

- **Sign In Feature Architecture**: Created `/sign-in` page (`app/(auth)/sign-in/page.tsx`) as a thin composition boundary (< 30 lines) embedding `<SignInForm />` inside `<React.Suspense>`.
- **Form Validation & UX State**: Implemented `signInSchema` (`sign-in-schema.ts`), `SignInState` state machine, and `SignInPayload` DTO in `apps/web/src/features/auth/sign-in`. Built `SignInForm` with `react-hook-form` and `@hookform/resolvers/zod` with `mode: 'onSubmit'`. Features interactive password visibility toggle (`Eye` / `EyeOff`), loading state with `Spinner`, and safe user-facing error mapping (`mapSignInError`).
- **Better Auth Integration & Session Routing**: Connected `SignInForm` directly to `signIn.email()` from `@coaching-os/auth/client`. On successful authentication, queries `/api/dashboard/context` server-side to resolve tenant association, navigating users with an active institute to `/dashboard` (or safe `callbackUrl`) and users without an institute to `/onboarding`.
- **Security Invariants & Callback URL Sanitization**: Built `sanitizeCallbackUrl` helper to sanitize `callbackUrl` query parameters, strictly enforcing single relative internal paths (e.g. `/dashboard`) and rejecting external phishing URLs (e.g. `https://evil.com`). Payload contains ONLY `email` and `password`. Zero raw Prisma errors or tracebacks exposed.
- **Testing & Verification**: Created unit test suites `sign-in-schema.test.ts` (7/7 passed) and `sign-in-form.test.ts` (17/17 passed). Built Playwright E2E suite `apps/web/e2e/sign-in.spec.ts` (8/8 passed in 8.2s). Verified 100% monorepo build, lint, typecheck, environment, database, auth, and observability checks.

- **Phase 0.12.5 Sign In Security**: `sanitizeCallbackUrl` previously embedded inline in `sign-in-form.tsx` has been extracted to canonical shared module `apps/web/src/features/auth/utils/sanitize-callback-url.ts` and imported by both sign-in and server-side guards.

### ⏸ Phase 0.12.6 — Password Recovery (DEFERRED)

- **Status:** ⏸ **DEFERRED**
- **Reason:** Transactional email infrastructure/provider is not yet configured.
- **Existing Groundwork:**
  - Better Auth password recovery configuration groundwork exists in `infrastructure/auth/src/auth.ts`.
  - Relevant rate-limit rules exist (`/forget-password`, `/reset-password`).
  - No production email delivery workflow has been implemented.
- **Important Note:** This phase is intentionally incomplete and must be resumed later. Do not mark Password Recovery as completed merely because Phase 0.12 itself is accepted and frozen.
- **Resume Condition:** Transactional email infrastructure is available and verified.
- **Expected Scope When Resumed:**
  ```text
  Forgot Password UI → Request reset → Transactional email → Secure reset token/link → Reset Password UI → Password update → Session/security handling → E2E + security verification
  ```

### ✅ Phase 0.12.7 — Session & Route Guards (COMPLETED)

- **Architectural Decision — No Middleware**: Confirmed and documented decision to use Server Component server-side guards instead of Next.js middleware. Tenant resolution requires DB lookups, which belong closer to the application/domain boundary than the edge. Security chain: `Better Auth session → server identity → tenant membership → RBAC → domain operation`.
- **`auth-guards.ts` Server Guard Module**: Created `apps/web/src/lib/auth-guards.ts` providing `requireAuthSession(callbackPath)` (hard-redirects to `/sign-in?callbackUrl=<sanitized>` if no session) and `resolveServerTenantContext(userId)` returning `ServerTenantState` discriminated union (`hasTenant: false` | `hasTenant: true; tenantContext: TenantContext; institute: ServerInstituteDisplay`).
- **Direct Domain Use-Case Invocation**: `resolveServerTenantContext` calls `GetUserMembershipsUseCase` → `ResolveInstituteMembershipUseCase` directly — no HTTP self-call to `/api/dashboard/context`. Eliminates server-to-server HTTP round-trip.
- **`/dashboard` Converted to Server Component**: Replaced client-component with async Server Component. Server authenticates session and resolves tenant state before any HTML is sent. Unauthenticated → `/sign-in?callbackUrl=%2Fdashboard`. No tenant → `/onboarding`. Dashboard client UI extracted to `DashboardContent` client component receiving only minimum presentation data (no raw session, no TenantContext).
- **`/onboarding` Converted to Server Component**: Replaced client-component with async Server Component. Unauthenticated → `/sign-in?callbackUrl=%2Fonboarding`. Has tenant → `/dashboard` (prevents duplicate onboarding). Form UI extracted to `OnboardingContent` client component.
- **`sanitizeCallbackUrl` Canonical Shared Utility**: Extracted from `sign-in-form.tsx` to `apps/web/src/features/auth/utils/sanitize-callback-url.ts`. Both sign-in and server-side guards use the same implementation. Prevents open-redirect bugs from implementation divergence.
- **Sign-Up Redirect Fixed**: `SignUpForm` now calls `/api/dashboard/context` before redirecting authenticated users — routes to `/dashboard` if tenant exists, `/onboarding` if not.
- **Route Security Matrix Frozen**:
  - `/dashboard` — unauthenticated → `/sign-in`, no-tenant → `/onboarding`, has-tenant → render
  - `/onboarding` — unauthenticated → `/sign-in`, has-tenant → `/dashboard`, no-tenant → render
  - `/sign-in` / `/sign-up` — has-tenant → `/dashboard`
- **Build Output Confirms Server Rendering**: `/dashboard` and `/onboarding` appear as `ƒ` (Dynamic, server-rendered on demand) in Next.js build output.
- **Unit Tests**: `sanitize-callback-url.test.ts` (22 tests), `auth-guards.test.ts` (11 tests). All 122 web unit tests passing.
- **E2E Test Suite**: Created `apps/web/e2e/route-guards.spec.ts` with fixture-based approach (3 independent fixtures: anonymous, noTenant, tenant). Tests cover full route security matrix, redirect loop protection, session lifecycle (cookie removal, sign-out), callback URL security (external phishing, protocol-relative, javascript:), API protection (401 responses), and tenant manipulation rejection.
- **Verification**: `pnpm env:check` ✅, `pnpm db:validate` ✅, `pnpm db:health` ✅, `pnpm test (122/122)` ✅, `pnpm typecheck` ✅, `pnpm lint` ✅, `pnpm build` ✅.
- **Commit**: `feat(web): phase 0.12.7 — server-side session & route guards` (`c836c98`)

### ✅ Phase 0.12.8 — Authenticated Application Shell (COMPLETED)

- **2-Level Layout Hierarchy (`apps/web/src/app/(app)/`)**:
  - `(app)/layout.tsx`: Authenticated session guard (`requireAuthSession`). Protects all app routes without duplicating session calls.
  - `(app)/onboarding/page.tsx`: Standalone setup page (`/onboarding`) rendered for authenticated users with no institute (`hasTenant: false`).
  - `(app)/(workspace)/layout.tsx`: Workspace layout (`/dashboard`, etc.). Resolves server tenant context, redirects users without an institute to `/onboarding`, and wraps workspace pages in `<AppShell>`.
- **App Shell Feature Architecture (`apps/web/src/features/app-shell/`)**:
  - `AppShell` (`components/app-shell.tsx`): Root presentation container rendering desktop sidebar, header, and main content area (`<main className="max-w-7xl">`).
  - `AppSidebar` (`components/app-sidebar.tsx`): Desktop fixed sidebar (`w-64`) rendering `InstituteIdentity`, filtered navigation sections, and footer.
  - `AppHeader` (`components/app-header.tsx`): Sticky top header (`h-16`) with mobile hamburger toggle, `Breadcrumbs`, and `UserMenu`.
  - `MobileSidebar` (`components/mobile-sidebar.tsx`): Accessible slide-over drawer (< 768px viewports) with Escape listener, backdrop overlay, focus management, ARIA attributes (`role="dialog"`, `aria-modal="true"`), and auto-close on route change.
  - `InstituteIdentity` (`components/institute-identity.tsx`): Institute logo or deterministic 2-letter initials avatar badge, institute name, and role badge.
  - `UserMenu` (`components/user-menu.tsx`): Dropdown menu displaying user name, email, role badge, profile/settings links (future/disabled), and functional `SignOutButton`.
  - `SignOutButton` (`components/sign-out-button.tsx`): Client component calling `signOut()` from `@coaching-os/auth/client` with loading state and redirect to `/sign-in`.
  - `Breadcrumbs` (`components/breadcrumbs.tsx`): Semantic navigation (`aria-label="Breadcrumb"`) with chevron separators and `aria-current="page"`.
  - `PageHeader` (`components/page-header.tsx`): Reusable title, description, and action slots header for workspace pages.
- **Capability-Aware Navigation Architecture**:
  - `navigation-config.ts`: Centralized navigation configuration grouped into Overview, Management, Academics, Finance, Communication sections. Items marked `isImplemented: false` render with clear "Coming Soon" badges without dead links.
  - `navigation-visibility.ts`: `filterNavigationByRole(role)` filters sections/items using `getCapabilitiesForRole(role)` from `@coaching-os/identity`. Evaluated server-side in `(workspace)/layout.tsx`.
- **Testing & Verification**:
  - Unit tests: `navigation.test.ts` (5 tests) and `app-shell.test.tsx` (2 tests). Total web unit tests: 129/129 passed.
  - Playwright E2E suite: `apps/web/e2e/app-shell.spec.ts` (5 scenarios passed: desktop workspace shell, mobile drawer, tenant isolation, no-tenant redirect, sign-out).
  - Full monorepo verification: `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm env:check`, `pnpm db:validate`, `pnpm db:health` (100% passed).

### ✅ Phase 0.12.9 — Full Browser Journey Integration (COMPLETED)

- **Canonical E2E Suite (`apps/web/e2e/full-browser-journey.spec.ts`)**: Built comprehensive Playwright automated suite covering Journeys A through F (unauthenticated → sign-up → onboarding → institute setup → tenant workspace → refresh persistence → sign-out → returning sign-in → no-tenant guard → existing tenant guard → auth page guards).
- **Security & Boundary Hardening**: Verified callback URL sanitization (`https://evil.example.com` blocked), server session revocation, browser-side tenant isolation (User A vs User B data boundary), back-button cache protection, and mobile drawer accessibility (`< 768px`).
- **Complete Test Verification**: 67/67 Playwright E2E tests passed; 129/129 unit/integration tests passed; 100% monorepo build, lint, typecheck, environment, database, auth, and observability checks passed cleanly across 13 packages.

### ✅ Phase 0.12.10 — Security & UX Test Matrix (COMPLETED)

- **Security & UX Hardening Suite (`apps/web/e2e/security-ux-matrix.spec.ts`)**: Built regression suite verifying double-submission button disabling, duplicate institute prevention under rapid enter clicks, protocol-relative / encoded callback URL phishing sanitization, zero error stack trace leakage in API responses, mobile viewport responsiveness (320px, 375px, 768px), and ARIA validation states.
- **Production Rate-Limit Protection**: Enforced mandatory rate-limiting under `NODE_ENV === 'production'` in `infrastructure/auth/src/auth.ts` regardless of test environment bypass flags.
- **Complete Test Verification**: 73/73 Playwright E2E tests passed; 130/130 unit/integration tests passed; 100% monorepo build, lint, typecheck, environment, database, auth, and observability checks passed cleanly across 13 packages.

### 🟢 Phase 0.12.11 — Phase 0.12 Acceptance Gate & Milestone Freeze (ACCEPTED & FROZEN)

- **Independent Repository & Security Audit**: Audited route composition, Server Component auth/tenant guards, `sanitizeCallbackUrl()` open-redirect defense, clean client/server component separation, and production rate-limit enforcement. Zero architectural or security regressions found.
- **Full Suite Verification (100% Passed)**:
  - Playwright E2E Suite: 73/73 passed across 8 spec files.
  - Unit & Integration Suite: 130/130 passed across monorepo.
  - Typecheck, Lint & Build: 100% clean across all 13 packages.
  - Infrastructure Checks: `pnpm env:check`, `pnpm db:validate`, `pnpm db:health`, `pnpm db:drift:check`, `pnpm verify:auth`, `pnpm verify:observability` passed 100%.
- **Formal Decision**: **Phase 0.12 — Public & Authentication UX is formally ACCEPTED and FROZEN.**

### ✅ Phase 1.1 — Institute Tenant Core

- Established framework-independent `InstituteEntity` in `@coaching-os/identity` with slug normalization, validation, and status lifecycle transition rules (`active`, `suspended`, `archived`).
- Defined `InstituteRepository` contract and built `PrismaInstituteRepository` mapping Prisma `Institute` models to domain entities and translating constraint failures (`P2002` -> `ConflictError`, `P2025` -> `NotFoundError`).
- Implemented `CreateInstituteUseCase`, `GetInstituteUseCase`, `UpdateInstituteUseCase`, and `ChangeInstituteStatusUseCase` with Zod presentation validators (`createInstituteSchema`, `updateInstituteSchema`, `changeInstituteStatusSchema`).
- Integrated structured observability events (`identity.institute.create.success`, `identity.institute.update.success`, `identity.institute.status_changed`).
- Created unit tests and real PostgreSQL integration suite verifying persistence, duplicate slug conflict mapping, missing record handling, and cross-tenant security isolation. Zero Prisma schema changes or migrations.

### ✅ Phase 1.2 — Users & Memberships

- Established framework-independent `InstituteMembershipEntity` in `@coaching-os/identity` defining organizational roles (`owner`, `teacher`, `assistant`, `parent`) and statuses (`active`, `suspended`, `removed`).
- Defined `InstituteMembershipRepository` contract and built `PrismaInstituteMembershipRepository` bridging direct staff user relations (`User.instituteId`) and parent identity memberships (`InstituteMembership`).
- Implemented application use cases (`CreateInstituteMembershipUseCase`, `GetUserMembershipsUseCase`, `GetInstituteMembersUseCase`, `GetInstituteMembershipUseCase`, `ChangeMembershipStatusUseCase`, `ResolveInstituteMembershipUseCase`) with Zod presentation validators.
- Built central server-side `ResolveInstituteMembershipUseCase` enforcing trusted `TenantContext` resolution for authenticated requests and rejecting unauthorized/cross-tenant attempts with `AuthorizationError`.
- Integrated structured observability events (`identity.membership.create.success`, `identity.membership.status_changed`, `identity.membership.resolve.success`, `security.membership.authorization_denied`).
- Created unit tests and real PostgreSQL integration suite verifying persistence, duplicate membership protection (`ConflictError`), status transitions, and mandatory multi-tenant security isolation. Zero Prisma schema changes or migrations.

### ✅ Phase 1.3 — Capability-Based RBAC (Subphases 1.3.0 – 1.3.8 ACCEPTED 🟢)

- **Phase 1.3.0 (RBAC Architecture & Capability Matrix Freeze)**: Established and froze the authoritative RBAC architecture contract in `docs/phases/phase1.3-rbac.md`, defining capability-based authorization internally (`resource:action`), role identity externally (`owner`, `teacher`, `assistant`, `parent`), and the 6-step decision pipeline.
- **Phase 1.3.1 (Capability Taxonomy & Strongly-Typed Enums)**: Implemented canonical 49-capability registry (`CAPABILITIES`), strongly-typed `Capability`, `CapabilityResource`, and `CapabilityAction` types, and `isCapability` runtime validation guards in `@coaching-os/identity`.
- **Phase 1.3.2 (Role → Capability Resolver Engine)**: Implemented pure, framework-independent `ROLE_CAPABILITIES` mapping for all 4 canonical roles (`owner: 49`, `teacher: 27`, `assistant: 19`, `parent: 10`) returning immutable `ReadonlySet<Capability>` and deny-by-default behavior for unknown roles.
- **Phase 1.3.3 (Authorization Engine & Assertion Guards)**: Built central `AuthorizationEngine` (`hasCapability`, `hasAllCapabilities`, `hasAnyCapability`, `requireCapability`, `requireAllCapabilities`, `requireAnyCapability`) and assertion guards throwing `AuthorizationError` (`403`) with safe `security.authorization.denied` event logging.
- **Phase 1.3.4 (Tenant-Scoped Capability Evaluation)**: Hardened tenant-scoped evaluation requiring server-resolved trusted `TenantContext` (`userId`, `instituteId`, `membershipId`, `role`, `status`), proving zero cross-tenant capability leakage across multi-tenant user memberships and defending against context substitution attacks.
- **Phase 1.3.5 (Resource-Scoped Filtering Helpers)**: Implemented pure Layer 2 resource scope policy helpers (`canParentAccessStudent`, `filterStudentsForParent`, `canTeacherAccessBatch`, `canTeacherAccessStudent`, `canAccessStudent`, `requireStudentAccess`) linking capability authorization with parent child links and teacher batch assignments. Verified zero database queries, zero external dependencies, and zero Prisma schema changes.
- **Phase 1.3.6 (Identity Use Case Integration)**: Integrated `requireCapability` authorization into all identity domain application use cases (`GetInstituteUseCase`, `UpdateInstituteUseCase`, `ChangeInstituteStatusUseCase`, `GetInstituteMembersUseCase`, `GetInstituteMembershipUseCase`, `CreateInstituteMembershipUseCase`, `UpdateMembershipRoleUseCase`, `ChangeMembershipStatusUseCase`). Enforced authorization checks BEFORE repository persistence operations and built owner escalation protection.
- **Phase 1.3.7 (Security & RBAC Test Matrix)**: Built adversarial security matrix test suite in `packages/identity/src/authorization/rbac-security-matrix.test.ts` executing 28 comprehensive security scenarios verifying contract consistency, parameterized role capability resolution across 196 combinations, context substitution attacks, cross-tenant resource attacks, tenant context forgery, membership status lifecycle defense, role escalation prevention, layer bypass isolation, and repository mutation prevention.
- **Phase 1.3.8 (Phase 1.3 Acceptance Gate)**: Completed final architectural audit, capability/role matrix verification, tenant isolation review, full pipeline verification suite execution, and formal Phase 1.3 acceptance gate approval.

### 🚧 Phase 1.4 — Institute Onboarding Workflow (In Progress)

- **Phase 1.4.0 (Architecture & Workflow Contract Freeze)**: Defined authoritative onboarding architecture contract in `docs/phases/phase1.4-onboarding.md`, establishing atomic tenant bootstrap (`Institute` + `Owner Membership`), derived onboarding state, server trust boundaries, and bootstrap authorization exemption.
- **Phase 1.4.1 (Onboarding Domain & Application Orchestration)**: Implemented framework-independent `OnboardInstituteUseCase`, `InstituteOnboardingRepository` contract interface, `onboardInstituteSchema` Zod presentation validator, and unit test suite verifying server-controlled owner invariants (`role === 'owner'`, `status === 'active'`), input validation, fail-fast slug collision handling, and `ResolveInstituteMembershipUseCase` compatibility. Zero Prisma/HTTP/React imports in domain layer.
- **Phase 1.4.2 (Atomic Institute + Owner Bootstrap Transaction)**: Implemented `PrismaOnboardInstituteRepository` executing atomic PostgreSQL `$transaction` creating `Institute` and linking `User` as owner. Created real PostgreSQL integration test suite verifying atomic transaction persistence, zero orphaned institutes on membership/user failure, database `@unique` slug constraint enforcement, and clean staff identity isolation (zero synthetic parent data).
- **Phase 1.4.3 (Idempotency & Conflict Handling)**: Hardened onboarding transaction with atomic same-user double onboarding protection (`tx.user.updateMany({ where: { id: user.id, instituteId: null } })`), pre-existing tenant association checks, and database slug `@unique` race-condition protection. Real PostgreSQL race-condition test suite verifies 100% atomic rollbacks, zero orphaned institutes on concurrent same-user and same-slug onboarding, and clean rejection of retry attempts.
- **Phase 1.4.4 (Onboarding API Boundary)**: Implemented `POST /api/onboarding/institute` presentation route adapter with Better Auth session authentication, `onboardInstituteSchema` Zod input validation, server-controlled identity authority (`authenticatedUserId = session.user.id`), `OnboardInstituteUseCase` & `ResolveInstituteMembershipUseCase` orchestration, standard 201 DTO responses, canonical error response taxonomy, Pino logging, `x-request-id` correlation tracking, and Playwright E2E test coverage.
- **Phase 1.4.5 (Onboarding UI Flow)**: Implemented `/onboarding` Client Component page (institute setup form with required name/phone/email, optional slug/timezone/logoUrl/primaryColor, real-time slug preview, `useSession()` auth guard, double-submission protection, 400/401/409/500 error state mapping) and `/dashboard` post-onboarding landing page. Built with `@coaching-os/ui` primitives, `@coaching-os/auth/client` session hook, and `useRouter()` for navigation. Presentation boundary strictly maintained: client payload sends zero identity/role/status fields. Full E2E flow (sign-up ──► /onboarding ──► submit ──► /dashboard) verified with Playwright.
- **Phase 1.4.6 (Tenant Context Resolution & Post-Onboarding Redirect)**: Implemented `GET /api/dashboard/context` route establishing single authoritative server-side tenant context resolution (session → `GetUserMembershipsUseCase` → `ResolveInstituteMembershipUseCase` → `TenantContext`). Enhanced `/dashboard` page guard to resolve real server tenant context and redirect to `/onboarding` if no active tenant exists. Enhanced `/onboarding` tenant guard to redirect already-onboarded users to `/dashboard`. Verified active, suspended, and removed membership lifecycle handling, tenant parameter injection resistance, browser refresh persistence, and 4 Playwright E2E scenarios.
- **Phase 1.4.7 (End-to-End Security & Failure Testing)**: Conducted comprehensive adversarial security verification, fault injection testing, and high-concurrency race condition hardening. Extended `PrismaOnboardInstituteRepository` integration suite with 5-way simultaneous same-user and same-slug race tests, verifying atomic PostgreSQL lock & rollback guarantees. Hardened API boundary with input attack matrix (invalid email/phone/oversized inputs), payload identity injection resistance (`userId`, `role`, `status` overrides), header/query injection resistance (`x-institute-id`, `x-role`), replay conflict enforcement, and response data leakage audit (zero secrets/tokens/stack traces leaked). Extended Playwright E2E security matrix (12/12 passed). Verified 100% Phase 1.3 RBAC capability preservation (178/178 unit tests passed).
- **Phase 1.4.8 (Phase 1.4 Acceptance Gate)**: Conducted formal independent audit and verification of the complete Institute Onboarding Workflow contract. Verified atomic tenant bootstrap, server-controlled identity authority, PostgreSQL lock atomicity, zero synthetic parent records, 100% Phase 1.3 RBAC capability preservation (49 capabilities), full monorepo typecheck/lint/build, and Playwright E2E suite (12/12 passed). Zero unresolved BLOCKER/HIGH defects. Phase 1.4 formally ACCEPTED and FROZEN.

### 🟢 Phase 1.5 — Institute Settings & White-Label Branding (ACCEPTED & FROZEN)

- **Architecture & Use Cases (`packages/identity`)**: Implemented domain use cases `GetInstituteSettingsUseCase` and `UpdateInstituteSettingsUseCase` enforcing strict capability authorization (`settings:read`, `settings:update`), audit logging, and domain entity invariants.
- **API Boundary (`/api/institute/settings`)**: Built production-grade GET and PATCH endpoints with Next.js App Router, Zod validation, HTTP status mapping, request correlation headers (`x-request-id`), method guards (POST/PUT/DELETE return 405 with `Allow` header), and strict protection of immutable fields (`id`, `slug`, `status`, `role`).
- **UI & Theme Propagation (`/settings`)**: Built responsive, accessible settings page (`InstituteSettingsContent`) with real-time brand color preview, non-HTTPS logo validation, client-side input sanitization, and live CSS `--primary` variable injection into `AppShell` with `router.refresh()`.
- **Security & Multi-Tenant E2E Verification (`apps/web/e2e/institute-settings-security.spec.ts`)**: Built 15 Playwright security E2E scenarios verifying unauthenticated 401 protection, RBAC 403 authorization guards, multi-tenant scope isolation, parameter/header spoofing defense, CSS/XSS injection defense for HEX colors and URLs, and workspace theme persistence across page reloads and internal navigation.
- **Formal Decision**: **Phase 1.5 — Institute Settings & White-Label Branding is formally ACCEPTED and FROZEN.**

### 🟢 Phase 1.6 — Global ParentIdentity Platform Layer (ACCEPTED & FROZEN)

- **Architecture & Domain Boundary (ADR-0009)**: Established the global identity platform layer (`ParentIdentity`) anchored by canonical E.164 phone numbers (`PhoneNumber` Value Object). Decoupled global parent identity from tenant-scoped CRM data (`InstituteParent`), ensuring parents with children in multiple coaching institutes maintain a single platform identity without cross-tenant data leakage.
- **Domain Entity & Persistence (`packages/identity`)**: Implemented `ParentIdentityEntity` and `PrismaParentIdentityRepository` mapping PostgreSQL `@unique` phone number index. Supports platform standing lifecycle (`active`, `suspended`, `deactivated`).
- **Application Use Cases**: Implemented `CreateParentIdentityUseCase`, `GetParentIdentityUseCase`, `ListParentIdentitiesUseCase`, `UpdateParentIdentityUseCase`, and `ChangeParentIdentityStatusUseCase` enforcing capability guards (`PARENT_READ`, `PARENT_CREATE`, `PARENT_UPDATE`, `PARENT_ARCHIVE`) and audit logging.
- **Better Auth Integration**: Built `ResolveParentIdentityForUserUseCase` auto-linking Better Auth phone users to global `ParentIdentity` upon authentication/signup while preserving identity sovereignty.
- **Security & Acceptance Gate**: Verified multi-tenant isolation, parameter injection protection, and global identity invariants across unit, integration, and Playwright E2E suites (`parent-identity-security.spec.ts`). **Phase 1.6 formally ACCEPTED and FROZEN.**

### 🟢 Phase 1.7 — Tenant InstituteParent CRM Layer (ACCEPTED & FROZEN)

- **Architecture & Domain Contract (ADR-0010 & Phase 1.7.0)**: Defined the tenant-scoped CRM aggregate `InstituteParent` bridging global `ParentIdentity` into specific coaching institutes. Enforced database composite uniqueness `UNIQUE(instituteId, parentIdentityId)` and tenant-local lifecycle standing (`active`, `inactive`).
- **Domain Entity & Repository (Phase 1.7.1 & 1.7.2)**: Implemented `InstituteParentEntity` with state mutation methods (`updateNotes`, `inactivate`, `activate`, `changeStatus`) and `PrismaInstituteParentRepository` enforcing mandatory `instituteId` scoping across all query paths.
- **Use Cases & Linking (Phase 1.7.3 & 1.7.4)**: Implemented `CreateInstituteParentUseCase`, `GetInstituteParentUseCase`, `ListInstituteParentsUseCase`, `UpdateInstituteParentUseCase`, and `ArchiveInstituteParentUseCase`. Integrated race-condition-safe canonical phone normalization (`PhoneNumber` VO) and auto-linking to `ParentIdentity`. Registered parent capabilities (`PARENT_READ`, `PARENT_CREATE`, `PARENT_UPDATE`, `PARENT_ARCHIVE`) and updated RBAC matrix (53 total capabilities).
- **API Boundary & Validators (Phase 1.7.5)**: Implemented Next.js App Router handlers (`/api/institute/parents` and `/api/institute/parents/[id]`) with strict Zod presentation validators (`createInstituteParentSchema`, `updateInstituteParentSchema`, `listInstituteParentsQuerySchema`, `instituteParentParamsSchema`). Rejects client identity injection attempts via `.strict()` schemas. Enforced HTTP method safety (405 Method Not Allowed with `Allow` headers).
- **Security & E2E Test Matrix (Phase 1.7.6)**: Developed 14-scenario Vitest route integration test suite (`route.test.ts`) and 10-scenario Playwright E2E security matrix (`institute-parent-security.spec.ts`) verifying unauthenticated 401 guards, header/body parameter injection defenses, cross-tenant 404 barriers, soft archiving invariants, and zero database stack leaks.
- **Staff UI / CRM Feature (Phase 1.7.7)**: Built responsive, accessible staff CRM interface (`/parents`) with desktop table and mobile card views, dynamic capability-driven action visibility, header controls (search & status filter), and accessible dialog modals for Add, Edit, Archive, and Global Identity vs. Tenant CRM details separation.
- **UX & Accessibility Audit (Phase 1.7.8)**: Conducted full browser workflow and keyboard accessibility pass. Resolved React 19 cascading render warnings in form state reset callbacks. Ensured `Escape` key closes dialogs and focus restoration is maintained.
- **Acceptance Gate (Phase 1.7.9)**: Verified complete pipeline (`env:check`, `db:validate`, `db:health`, `db:drift:check`, `verify:auth`, `verify:infra`, `verify:observability`, `lint`, `typecheck`, `test`, `build`, `test:e2e`). **Phase 1.7 formally ACCEPTED and FROZEN.**

### 🟢 Phase 1.8 — Student Admission & Profile Core (ACCEPTED & FROZEN)

- **Architecture & Domain Boundary (ADR-0011 & Phase 1.8.0)**: Defined the tenant-scoped student learner aggregate (`Student`) decoupled from global identity (`ParentIdentity`), academic enrollment (Phase 1.10/1.11), and guardian links (Phase 1.9). Enforced database composite uniqueness `UNIQUE(instituteId, admissionNumber)` and dual lifecycle state machines (`admissionStatus`: `pending`, `admitted`, `rejected`, `cancelled`; standing `status`: `active`, `inactive`, `archived`).
- **Domain Entity & Persistence (Phase 1.8.1 & 1.8.2)**: Implemented `StudentEntity` with state machine transition guards (`admit`, `reject`, `cancel`, `deactivate`, `reactivate`, `archive`) and `PrismaStudentRepository` enforcing strict `instituteId` tenant-scoping across all query and mutation paths.
- **Use Cases & Lifecycle Rules (Phase 1.8.3 & 1.8.4)**: Implemented `CreateStudentUseCase`, `GetStudentUseCase`, `ListStudentsUseCase`, `UpdateStudentProfileUseCase`, `AdmitStudentUseCase`, `RejectStudentUseCase`, `CancelStudentUseCase`, `DeactivateStudentUseCase`, `ReactivateStudentUseCase`, and `ArchiveStudentUseCase`. Enforced capability authorization guards (`STUDENT_READ`, `STUDENT_CREATE`, `STUDENT_UPDATE`, `STUDENT_ARCHIVE`).
- **API Boundary & Validators (Phase 1.8.5)**: Implemented Next.js App Router handlers (`/api/institute/students`, `/api/institute/students/[id]`, and lifecycle routes `/admit`, `/reject`, `/cancel`, `/deactivate`, `/activate`) with strict Zod validators (`createStudentSchema`, `updateStudentSchema`, `listStudentsQuerySchema`). Enforced HTTP 405 Method Not Allowed guards and strict rejection of client identity injection via `.strict()` schemas.
- **Security & E2E Matrix (Phase 1.8.6)**: Developed 21-scenario Vitest route suite and 11-scenario Playwright E2E security suite (`student-security.spec.ts`) verifying unauthenticated 401 guards, tenant-safe 404 barriers for cross-tenant access, duplicate admission number 409 conflict protection, and parameter injection defenses.
- **Staff UI & CRM Feature (Phase 1.8.7)**: Built responsive, accessible staff Student workspace (`/students`) with table and mobile card views, dynamic capability-driven controls, header filters (search, admission status, standing status), and interactive dialog modals for Create, Edit, View Details, and State Transitions.
- **UX & Accessibility Audit (Phase 1.8.8)**: Conducted 20-scenario Playwright E2E audit suite (`student-workflow.spec.ts`) verifying focus management, ARIA error attributes, Escape key dismissal, 375px mobile viewport rendering, and state transition integrity.
- **Acceptance Gate (Phase 1.8.9)**: Verified complete build pipeline (`lint`, `typecheck`, `test`, `build`, `test:e2e`). **Phase 1.8 formally ACCEPTED and FROZEN.**

### 🟢 Phase 1.9 — Guardian & Student Relationship Layer (ACCEPTED & FROZEN)

- **Architecture & Domain Boundary (ADR-0012 & Phase 1.9.0)**: Defined the first-class tenant aggregate `InstituteParentStudent` establishing bidirectional relationships between tenant-local `InstituteParent` CRM records and `Student` aggregates. Enforced PostgreSQL partial unique constraint `(instituteId, studentId) WHERE is_primary = true AND status = 'active'` ensuring single primary guardian invariant per student.
- **Domain Entity & Persistence (Phase 1.9.1 & 1.9.2)**: Implemented `InstituteParentStudentEntity` with value objects `GuardianRelationshipType` (father, mother, guardian, stepfather, stepmother, grandparent, sibling, other) and `GuardianRelationshipStatus` (active, archived), and built `PrismaInstituteParentStudentRepository` enforcing strict tenant-scoping across all query and mutation paths.
- **Application Use Cases & Security (Phase 1.9.3 & 1.9.4)**: Implemented `LinkGuardianToStudentUseCase`, `UpdateGuardianRelationshipUseCase`, `SetPrimaryGuardianUseCase`, `ArchiveGuardianRelationshipUseCase`, `ListStudentGuardiansUseCase`, and `ListParentStudentsUseCase`. Registered capabilities (`guardian:read`, `guardian:create`, `guardian:update`, `guardian:archive`, `guardian:primary`) into capability registry (58 total capabilities).
- **API Boundary & Validators (Phase 1.9.5)**: Built Next.js App Router handlers (`/api/institute/parent-student/[id]`, `/api/institute/parent-student/[id]/primary`, `/api/institute/parent-student/[id]/archive`, `/api/institute/students/[studentId]/guardians`, and `/api/institute/parents/[parentId]/students`) with strict Zod validators, HTTP 405 method guards, and identity spoofing rejection.
- **Security E2E Matrix (Phase 1.9.6)**: Built Playwright E2E security suite (`guardian-student-security.spec.ts`) verifying unauthenticated 401 guards, tenant-safe 404 barriers, duplicate link 409 conflict responses, header/query parameter spoofing defenses, and anti-recursion DTO boundaries.
- **Staff UI & Feature Components (Phase 1.9.7)**: Built responsive, accessible staff UI components in `apps/web/src/features/guardian/` (`StudentGuardiansList`, `AddGuardianModal`, `EditGuardianModal`, `PrimaryReplacementModal`, `ArchiveGuardianModal`, `GuardianPrimaryBadge`, `GuardianRelationshipStatusBadge`). Integrated bidirectional links into `StudentDetailsModal` and `InstituteParentDetailsModal`.
- **UX & Accessibility Testing (Phase 1.9.8)**: Implemented Playwright E2E workflow suite (`guardian-student-workflow.spec.ts`, scenarios `REL-UI-01` through `20`) verifying keyboard navigation, focus restoration, ARIA attributes, Escape key handling, 375px mobile responsiveness, and primary replacement confirmation dialogues.
- **Acceptance Gate & Freeze (Phase 1.9.9)**: Verified complete pipeline (`env:check`, `db:validate`, `db:health`, `db:drift:check`, `verify:auth`, `verify:infra`, `verify:observability`, `lint`, `typecheck`, `test`, `build`, `test:e2e`). **Phase 1.9 formally ACCEPTED and FROZEN.**

### 🟢 Phase 1.10 — Academic Hierarchy (Programs, Subjects, Batches) (ACCEPTED & FROZEN)

- **Architecture & Domain Boundary (ADR-0013 & Phase 1.10.0)**: Defined the tenant-scoped Academic Hierarchy layer comprising `Program`, `Subject` (Option B institute-level reusable catalog), `ProgramSubject` (explicit join mapping), and `Batch` (operational teaching group with lean primary teacher assignment). Enforced strict multi-tenant scoping, compound unique constraints, and dual lifecycle state machines. Hard boundary isolation strictly prohibits Phase 1.11 Student Enrollment features (`studentId` roster, `Enrollment` tables).
- **Domain Entity & Persistence (Phase 1.10.1 & 1.10.2)**: Implemented `ProgramEntity`, `SubjectEntity`, `ProgramSubjectEntity`, and `BatchEntity` with state machine transition guards, `AcademicCode` / `AcademicName` VOs, and `PrismaProgramRepository`, `PrismaSubjectRepository`, `PrismaProgramSubjectRepository`, `PrismaBatchRepository` enforcing mandatory `instituteId` tenant-scoping.
- **Application Use Cases & State Machines (Phase 1.10.3)**: Implemented 14 use cases covering full CRUD, lifecycle state machine transitions (`draft` → `open` → `running` → `completed` → `archived`), teacher assignment, program-subject join mappings, and capability authorization guards.
- **API Boundary & Presentation Validators (Phase 1.10.4)**: Built Next.js App Router handlers (`/api/institute/programs`, `/api/institute/subjects`, `/api/institute/program-subjects`, `/api/institute/batches`, and associated `/[id]`, `/status`, `/teacher`, `/archive` sub-routes) with strict Zod validators, HTTP 405 method guards, and parameter spoofing rejection.
- **Security & E2E Matrix (Phase 1.10.5)**: Developed Vitest security suite (`academic-security-e2e.test.ts`) verifying unauthenticated 401 guards, tenant-safe 404 barriers for cross-tenant lookups, duplicate code/name 409 conflict protection, and parameter injection defenses.
- **Staff Academic Workspace UI (Phase 1.10.6)**: Built responsive, accessible staff Academic workspace (`/academics`) with tabbed sub-views for Programs, Subjects, Subject-Program Mappings, and Batches, dynamic capability-driven controls, header search/filters, and interactive dialog modals for Create, Edit, Details, Teacher Assignment, and Status Transitions.
- **UX, Accessibility & Workflow Testing (Phase 1.10.7)**: Conducted Playwright E2E workflow & regression suite (`academic-workflow.spec.ts`, 58/58 passed across all 6 monorepo E2E specs) verifying focus management, ARIA error attributes, Escape key dismissal, 375px mobile viewport rendering, and state transition integrity.
- **Acceptance Gate & Freeze (Phase 1.10.8)**: Verified complete build pipeline (`env:check`, `db:validate`, `db:health`, `db:drift:check`, `verify:auth`, `verify:infra`, `verify:observability`, `lint`, `typecheck`, `test`, `build`, `test:e2e`). **Phase 1.10 formally ACCEPTED and FROZEN.**

### 🟢 Phase 1.11 — Student Enrollment Lifecycle (ACCEPTED & FROZEN)

- **Architecture & Domain Boundary (ADR-0014 & Phase 1.11.0)**: Defined the tenant-scoped student enrollment aggregate (`Enrollment`) bridging admitted students into active academic teaching batches with strict status lifecycle transitions (`pending` → `active` → `completed` / `withdrawn` / `cancelled`, soft `archived`). Enforced database composite uniqueness `UNIQUE(instituteId, studentId, batchId) WHERE status IN ('pending', 'active')` and pessimistic locking capacity validation.
- **Domain Entity & Persistence (Phase 1.11.1 & 1.11.2)**: Implemented `EnrollmentEntity` with state machine transition guards and `PrismaEnrollmentRepository` with pessimistic row-level locking capacity checks and atomic batch transfer creation (`transferToBatch`).
- **Application Use Cases & Rules (Phase 1.11.3)**: Implemented `CreateEnrollmentUseCase`, `GetEnrollmentUseCase`, `ListEnrollmentsUseCase`, `ActivateEnrollmentUseCase`, `CompleteEnrollmentUseCase`, `WithdrawEnrollmentUseCase`, `CancelEnrollmentUseCase`, `TransferEnrollmentUseCase`, and `ArchiveEnrollmentUseCase`. Registered capabilities (`enrollment:read`, `enrollment:create`, `enrollment:update`, `enrollment:status`, `enrollment:transfer`, `enrollment:archive`) into RBAC capability registry (64 total capabilities).
- **API Boundary & Presentation Validators (Phase 1.11.4)**: Built Next.js App Router handlers (`/api/institute/enrollments`, `/api/institute/enrollments/[id]`, and sub-routes `/activate`, `/complete`, `/withdraw`, `/cancel`, `/transfer`, `/archive`) with strict Zod validators (`createEnrollmentSchema`, `transferEnrollmentSchema`, `listEnrollmentsQuerySchema`), HTTP 405 method guards, and strict parameter injection rejection.
- **Security & Multi-Tenant E2E Matrix (Phase 1.11.5)**: Developed Vitest security suite (`enrollment-security.test.ts`) and route test coverage verifying unauthenticated 401 guards, multi-tenant 404 barriers for cross-tenant lookups, duplicate active enrollment 409 conflict protection, and role-based access boundaries.
- **Staff Enrollment UI (Phase 1.11.6)**: Built responsive, accessible staff Student Enrollment workspace (`/enrollments`) with desktop table and mobile card views, dynamic capability-driven lifecycle controls, status badge indicators, header search & filters, and accessible dialog modals for Add Enrollment, View Details, Batch Transfer, and Confirmation Dialogs.
- **UX, Accessibility & Workflow Testing (Phase 1.11.7)**: Developed comprehensive Playwright E2E matrix (`enrollment-workflow.spec.ts`, 18/18 scenarios passed) verifying focus management, ARIA error attributes, Escape key dismissal, 375px mobile viewport rendering, batch transfers, status state transitions, and cross-tenant isolation boundaries.
- **Acceptance Gate & Freeze (Phase 1.11.8)**: Verified complete pipeline (`env:check`, `db:validate`, `db:health`, `db:drift:check`, `verify:auth`, `verify:infra`, `verify:observability`, `lint`, `typecheck`, `test`, `build`, `test:e2e`). **Phase 1.11 formally ACCEPTED and FROZEN.**

### 🟢 Phase 1.12 — Protected Identity APIs (`/api/v1/...`) (ACCEPTED & FROZEN)

- **Architecture & Contract Freeze (ADR-0015 & Phase 1.12.0)**: Established authoritative architecture and contract freeze for `/api/v1/...`. Defined distinct boundary separating internal staff UI routes (`/api/institute/...`) from protected versioned integration APIs (`/api/v1/...`). Enforced server-authoritative tenant resolution (`ResolveInstituteMembershipUseCase`), capability-based RBAC, path versioning, standardized JSON envelopes (`data`, `pagination`, `meta`), cursor-based pagination, rate-limiting policy (100 reads / 30 mutations per minute), error taxonomy (`UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `CONFLICT`, `INVALID_STATE_TRANSITION`, `RATE_LIMITED`, `INTERNAL_ERROR`), PII redaction, and `IDENTITY-01` to `IDENTITY-24` security threat matrix. **Phase 1.12.0 ACCEPTED & FROZEN.**
- **Application Contracts & Infrastructure Adapters (Phase 1.12.1 & 1.12.2)**: Established reusable application DTOs and filters (`StaffMembershipDTO`, `PaginatedResult<T>`, `PaginationOptions`, `StudentListFilter`, `GuardianListFilter`, `StaffListFilter`, `EnrollmentListFilter`) in `packages/identity`. Reused existing domain aggregates (`StudentEntity`, `InstituteParentEntity`, `InstituteParentStudentEntity`, `InstituteMembershipEntity`, `EnrollmentEntity`) and Prisma repositories (`PrismaStudentRepository`, `PrismaInstituteParentRepository`, `PrismaInstituteParentStudentRepository`, `PrismaInstituteMembershipRepository`, `PrismaEnrollmentRepository`). Enforced PII redaction and client bundle boundary safety (`@coaching-os/identity/client` type-only DTO exports). Unit tests added and verified (53 test files, 525 tests passing). **Phase 1.12.1 & 1.12.2 COMPLETED.**
- **Presentation Boundary & Validators (Phase 1.12.3)**: Built strict Zod presentation schemas (`v1-validators.ts`) using `.strict()` for all `/api/v1` resources (`Student`, `Guardian`, `Staff`, `Enrollment`), explicitly blocking mass-assignment injection of sensitive identity fields (`instituteId`, `userId`, `role`, `membershipId`, `tenantId`). Implemented 10 Next.js route handlers across `/students`, `/students/[id]`, `/students/[id]/guardians`, `/guardians`, `/guardians/[id]`, `/guardians/[id]/students`, `/staff`, `/staff/[id]`, `/enrollments`, and `/enrollments/[id]`. Unit test suite (`v1-validators.test.ts`) verifies 60+ validation and security boundary scenarios. **Phase 1.12.3 COMPLETED.**
- **Authentication, Authorization & Tenant Isolation (Phase 1.12.4)**: Implemented `rate-limiter.ts` providing in-memory token-bucket rate limiting (100 READ / 30 MUTATION per minute per `userId` key with dynamic `Retry-After` header) and `v1-guard.ts` providing server-authoritative context resolution (`withV1ReadGuard`, `withV1MutationGuard`), fail-closed 401/403 execution guards, 404 cross-tenant resource masking (preventing resource enumeration), `StaffMembershipDTO` PII redaction, and standardized JSON envelopes (`apiSuccess`, `apiCollection`, `handleV1Error`). Unit test suite (`rate-limiter.test.ts`) verifies bucket isolation and limit enforcement. **Phase 1.12.4 COMPLETED.**
- **Security & Adversarial E2E Audit (Phase 1.12.5)**: Executed rigorous adversarial security audit verifying all 24 threat vectors (`IDENTITY-01` to `IDENTITY-24`) in `v1-security.test.ts` (24/24 passing). Hardened multi-dimensional pre-auth rate limiting (`user:<userId>:ip:<ip>`) and verified cross-tenant `404 NOT_FOUND` resource existence masking. **Phase 1.12.5 COMPLETED.**
- **Staff Consumption Adapter & Client SDK (Phase 1.12.6)**: Built `V1IdentityApiClient` pure client SDK (`packages/identity/src/client/v1-identity-api-client.ts`) with typed namespaces (`students`, `guardians`, `staff`, `enrollments`) and `apps/web/src/lib/v1-api-client.ts` web workspace singleton. Verified unwrapping of ADR-0015 envelopes and `V1ApiError` normalization across SDK unit tests (`v1-identity-api-client.test.ts`) and web integration tests (`v1-api-client.test.ts`). **Phase 1.12.6 COMPLETED.**
- **Developer Documentation & DX (Phase 1.12.7)**: Created canonical developer-facing API specification `docs/api/protected-identity-api-v1.md` documenting overview, authentication, envelopes, error taxonomy, cursor pagination, rate-limiting, tenant isolation, endpoint matrix, capability scoping, and `V1IdentityApiClient` SDK usage. **Phase 1.12.7 COMPLETED.**
- **Final Acceptance Gate & Freeze (Phase 1.12.8)**: Verified 100% ADR-0015 compliance across architectural, security, RBAC, tenant isolation, rate-limit, privacy, SDK, DB integrity, and quality gates (`pnpm typecheck` 0 errors, `pnpm lint` 0 errors/warnings, `pnpm build` clean, 531 `@coaching-os/identity` tests + 351 `@coaching-os/web` tests passing). **Phase 1.12 formally ACCEPTED and FROZEN.**

### 🟢 Phase 1.13 — Staff UI & Onboarding Workflows (ACCEPTED & FROZEN)

- **Architecture & Contract Freeze (ADR-0016 & Phase 1.13.0)**: Established authoritative architecture freeze for Staff Management & Staff Onboarding Workflow. Defined `InstituteMembershipEntity` staff aggregate, capability assertions (`staff:read`, `staff:invite`, `staff:update`, `staff:remove`, `staff:role_change`), self-mutation defense rules, and `STAFF-SEC-01..24` threat matrix. **Phase 1.13.0 ACCEPTED & FROZEN.**
- **Staff Domain & Application Layer (Phase 1.13.1)**: Implemented domain entity methods (`updateRole`, `activate`, `suspend`, `remove`), PostgreSQL repository adapter (`PrismaInstituteMembershipRepository`), and 6 application use cases (`ListStaffMembershipsUseCase`, `GetStaffMembershipUseCase`, `InviteStaffMemberUseCase`, `UpdateStaffRoleUseCase`, `SuspendStaffMemberUseCase`, `RemoveStaffMemberUseCase`). Covered by 545 passing unit tests. **Phase 1.13.1 COMPLETED.**
- **Staff API Boundary & Presentation Validators (Phase 1.13.2)**: Built strict Zod presentation validators (`v1InviteStaffSchema`, `v1UpdateStaffRoleSchema`, `v1ListStaffQuerySchema`) blocking mass-assignment overrides. Implemented RESTful Next.js route handlers (`GET /api/v1/staff`, `POST /api/v1/staff/invite`, `GET /api/v1/staff/[id]`, `PATCH /api/v1/staff/[id]/role`, `POST /api/v1/staff/[id]/activate`, `POST /api/v1/staff/[id]/suspend`, `DELETE /api/v1/staff/[id]`). **Phase 1.13.2 COMPLETED.**
- **Staff Security Threat Matrix (Phase 1.13.3)**: Built `staff-security.test.ts` verifying all 24 security threat vectors (`STAFF-SEC-01..24` - unauthenticated block, RBAC capability enforcement, tenant isolation, rate limiting, self-demotion prevention, PII redaction). 24/24 threat tests passing cleanly. **Phase 1.13.3 COMPLETED.**
- **Staff Workspace UI Feature (Phase 1.13.4)**: Built responsive client workspace (`/staff`) in `apps/web/src/features/staff/` featuring role/status filters, real-time search, registered email address resolution, desktop table, 375px mobile card view, loading skeleton, empty state, toast notifications, and 5 interactive modal dialogs (Invite, Details, Role Change, Status Change, Remove). Fixed React 19 infinite re-render loop across modal state synchronization. **Phase 1.13.4 COMPLETED.**
- **UX, Accessibility & Workflow Matrix (Phase 1.13.5)**: Implemented automated Playwright E2E suites (`staff-workflow.spec.ts` & `staff-accessibility.spec.ts`, 10/10 scenarios passed) proving end-to-end multi-tenant staff management, WAI-ARIA `role="dialog"` modal semantics, Escape key dismissal, focus trap management, explicit filter `aria-label` attributes, and 375px mobile viewport rendering without horizontal scroll overflow. **Phase 1.13.5 COMPLETED.**
- **Final Acceptance Gate & Freeze (Phase 1.13.6)**: Verified 100% ADR-0016 compliance across domain, RBAC, tenant isolation, security (`STAFF-SEC-01..24`), Playwright E2E matrix, accessibility, mobile layout, DB integrity, and quality gates (`pnpm typecheck` 0 errors, `pnpm lint` 0 errors/warnings, `pnpm build` clean, 87 unit tests + 10 E2E tests passing). **Phase 1.13 formally ACCEPTED and FROZEN.**

## 4. Next Milestone Roadmap

### 🚧 PHASE 1 — IDENTITY MODULE (NOW ACTIVE)

- **Domain Contract Specification:** Documented in [docs/phases/phase1.md](file:///home/supra/Desktop/class_os/docs/phases/phase1.md) (Phase 1.0 Architecture Freeze), [docs/phases/phase1.3-rbac.md](file:///home/supra/Desktop/class_os/docs/phases/phase1.3-rbac.md) (Phase 1.3.0 RBAC Architecture Freeze), and [docs/phases/phase1.4-onboarding.md](file:///home/supra/Desktop/class_os/docs/phases/phase1.4-onboarding.md) (Phase 1.4.0 Onboarding Architecture Freeze).
- **Subphase Tracking Rule:** Subphases are added to the tracker in `docs/CONTEXT.md` as each subphase is approved and implemented.
- **Phase 1 Implementation Map:**
  - **Phase 1.0:** Domain & Architecture Contract Freeze ✅
  - **Phase 1.1:** Institute Tenant Core ✅
  - **Phase 1.2:** Users & Memberships ✅
  - **Phase 1.3:** Capability-Based RBAC ✅ (ACCEPTED 🟢)
    - **Phase 1.3.0:** RBAC Architecture & Capability Matrix ✅ (Freeze)
    - **Phase 1.3.1:** Capability Taxonomy & Strongly-Typed Enums ✅
    - **Phase 1.3.2:** Role → Capability Resolver Engine ✅
    - **Phase 1.3.3:** Authorization Engine & Assertion Guards ✅
    - **Phase 1.3.4:** Tenant-Scoped Capability Evaluation ✅
    - **Phase 1.3.5:** Resource-Scoped Filtering Helpers (Parent/Teacher) ✅
    - **Phase 1.3.6:** Identity Use Case Integration ✅
    - **Phase 1.3.7:** Security & RBAC Test Matrix ✅
    - **Phase 1.3.8:** Phase 1.3 Acceptance Gate ✅ (ACCEPTED 🟢)
  - **Phase 1.4:** Institute Onboarding Workflow ✅ (ACCEPTED 🟢)
    - **Phase 1.4.0:** Architecture & Workflow Contract Freeze 🟢 (Freeze)
    - **Phase 1.4.1:** Onboarding Domain & Application Orchestration ✅
    - **Phase 1.4.2:** Atomic Institute + Owner Bootstrap Transaction ✅
    - **Phase 1.4.3:** Idempotency & Conflict Handling ✅
    - **Phase 1.4.4:** Onboarding API Boundary ✅
    - **Phase 1.4.5:** Onboarding UI Flow ✅
    - **Phase 1.4.6:** Tenant Context Resolution & Post-Onboarding Redirect ✅
    - **Phase 1.4.7:** End-to-End Security & Failure Testing ✅
    - **Phase 1.4.8:** Phase 1.4 Acceptance Gate ✅ (ACCEPTED 🟢)
  - **Phase 1.5:** Institute Settings & White-Label Branding ✅ (ACCEPTED 🟢)
    - **Phase 1.5.0:** Architecture & Contract Freeze 🟢 (ACCEPTED & FROZEN)
    - **Phase 1.5.1:** Settings Domain Use Cases & Authorization ✅ COMPLETED
    - **Phase 1.5.2:** Settings API & Validators ✅ COMPLETED
    - **Phase 1.5.3:** Settings UI Feature ✅ COMPLETED
    - **Phase 1.5.4:** Security E2E & Acceptance Gate 🟢 (ACCEPTED & FROZEN)
  - **Phase 1.6:** Global ParentIdentity Platform Layer 🟢 (ACCEPTED & FROZEN)
    - **Phase 1.6.0:** Architecture & Contract Freeze 🟢 (ACCEPTED & FROZEN)
    - **Phase 1.6.1:** ParentIdentity Domain Entities & Value Objects ✅ COMPLETED
    - **Phase 1.6.2:** ParentIdentity Repository & Persistence Layer ✅ COMPLETED
    - **Phase 1.6.3:** ParentIdentity Application Use Cases ✅ COMPLETED
    - **Phase 1.6.4:** Parent Identity ↔ Authentication Integration ✅ COMPLETED
    - **Phase 1.6.5:** Multi-Tenant Security & Authorization Matrix ✅ COMPLETED
    - **Phase 1.6.6:** Phase 1.6 Acceptance Gate 🟢 (ACCEPTED & FROZEN)
  - **Phase 1.7:** Tenant InstituteParent CRM Layer 🟢 (ACCEPTED & FROZEN)
    - **Phase 1.7.0:** Architecture & Contract Freeze 🟢 (ACCEPTED & FROZEN)
    - **Phase 1.7.1:** InstituteParent Domain Entity & Value Objects ✅ COMPLETED
    - **Phase 1.7.2:** InstituteParent Repository & PostgreSQL Persistence Layer ✅ COMPLETED
    - **Phase 1.7.3:** InstituteParent Application Use Cases ✅ COMPLETED
    - **Phase 1.7.4:** ParentIdentity ↔ InstituteParent Linking & Authorization ✅ COMPLETED
    - **Phase 1.7.5:** InstituteParent API Boundary & Validators ✅ COMPLETED
    - **Phase 1.7.6:** InstituteParent Security / Privacy E2E Matrix ✅ COMPLETED
    - **Phase 1.7.7:** InstituteParent Staff UI / CRM Feature ✅ COMPLETED
    - **Phase 1.7.8:** UX, Accessibility & Tenant-Scoped Workflow Testing ✅ COMPLETED
    - **Phase 1.7.9:** Phase 1.7 Acceptance Gate 🟢 (ACCEPTED & FROZEN)
  - **Phase 1.8:** Student Admission & Profile Core 🟢 (ACCEPTED & FROZEN)
    - **Phase 1.8.0:** Architecture & Contract Freeze 🟢 (ACCEPTED & FROZEN)
    - **Phase 1.8.1:** Student Domain Entity & Value Objects ✅ COMPLETED
    - **Phase 1.8.2:** Student Repository & PostgreSQL Persistence Layer ✅ COMPLETED
    - **Phase 1.8.3:** Student Application Use Cases ✅ COMPLETED
    - **Phase 1.8.4:** Student Admission & Lifecycle Rules ✅ COMPLETED
    - **Phase 1.8.5:** Student API Boundary & Validators ✅ COMPLETED
    - **Phase 1.8.6:** Student Security / Tenant E2E Matrix ✅ COMPLETED
    - **Phase 1.8.7:** Student Staff UI / Admission Feature ✅ COMPLETED
    - **Phase 1.8.8:** UX, Accessibility & Admission Workflow Testing ✅ COMPLETED
  - **Phase 1.9:** Guardian & Student Links 🟢 (COMPLETED & FROZEN)
    - **Phase 1.9.0:** Architecture & Contract Freeze 🟢 (ACCEPTED & FROZEN)
    - **Phase 1.9.1:** Relationship Domain Entity & Value Objects 🟢 COMPLETED
    - **Phase 1.9.2:** Relationship Repository & PostgreSQL Persistence 🟢 COMPLETED
    - **Phase 1.9.3:** Relationship Application Use Cases 🟢 COMPLETED
    - **Phase 1.9.4:** Guardian/Student Linking & Authorization 🟢 COMPLETED
    - **Phase 1.9.5:** Relationship API Boundary & Validators 🟢 COMPLETED
    - **Phase 1.9.6:** Relationship Security / Privacy E2E Matrix 🟢 COMPLETED
    - **Phase 1.9.7:** Staff Guardian/Relationship UI 🟢 COMPLETED
    - **Phase 1.9.8:** UX, Accessibility & Workflow Testing 🟢 COMPLETED
    - **Phase 1.9.9:** Phase 1.9 Acceptance Gate 🟢 ACCEPTED & FROZEN
  - **Phase 1.10:** Academic Hierarchy (Programs, Subjects, Batches) 🟢 (ACCEPTED & FROZEN)
    - **Phase 1.10.0:** Architecture & Contract Freeze 🟢 (ACCEPTED & FROZEN)
    - **Phase 1.10.1:** Academic Hierarchy Domain Entities & Value Objects 🟢 COMPLETED
    - **Phase 1.10.2:** Repository & PostgreSQL Persistence Layer 🟢 COMPLETED
    - **Phase 1.10.3:** Application Use Cases & State Machine Rules 🟢 COMPLETED
    - **Phase 1.10.4:** API Boundary & Presentation Validators 🟢 COMPLETED
    - **Phase 1.10.5:** Security & Tenant Isolation E2E Matrix 🟢 COMPLETED
    - **Phase 1.10.6:** Staff Academic Workspace UI 🟢 COMPLETED
    - **Phase 1.10.7:** UX, Accessibility & Workflow Testing 🟢 COMPLETED
    - **Phase 1.10.8:** Phase 1.10 Acceptance Gate & Freeze 🟢 ACCEPTED & FROZEN
  - **Phase 1.11:** Student Enrollment Lifecycle 🟢 (ACCEPTED & FROZEN)
    - **Phase 1.11.0:** Architecture & Contract Freeze 🟢 (ACCEPTED & FROZEN)
    - **Phase 1.11.1:** Enrollment Domain Entity & Value Objects 🟢 COMPLETED
    - **Phase 1.11.2:** Repository & PostgreSQL Persistence Layer 🟢 COMPLETED
    - **Phase 1.11.3:** Application Use Cases & Enrollment Lifecycle 🟢 COMPLETED
    - **Phase 1.11.4:** API Boundary & Presentation Validators 🟢 COMPLETED
    - **Phase 1.11.5:** Security & Tenant Isolation E2E Matrix 🟢 COMPLETED
    - **Phase 1.11.6:** Staff Enrollment UI 🟢 COMPLETED
    - **Phase 1.11.7:** UX, Accessibility & Workflow Testing 🟢 COMPLETED
    - **Phase 1.11.8:** Phase 1.11 Acceptance Gate & Freeze 🟢 ACCEPTED & FROZEN
  - **Phase 1.12:** Protected Identity APIs (`/api/v1/...`) 🟢 (ACCEPTED & FROZEN)
    - **Phase 1.12.0:** Architecture & Contract Freeze 🟢 (ACCEPTED & FROZEN)
    - **Phase 1.12.1:** Protected Identity API Domain/Application Contracts 🟢 COMPLETED
    - **Phase 1.12.2:** API Infrastructure & Persistence Adapters 🟢 COMPLETED
    - **Phase 1.12.3:** API Boundary & Presentation Validators 🟢 COMPLETED
    - **Phase 1.12.4:** Authentication, Authorization & Tenant Isolation 🟢 COMPLETED
    - **Phase 1.12.5:** Security & Adversarial E2E Audit 🟢 COMPLETED
    - **Phase 1.12.6:** Protected Identity API Integration / Staff Consumption 🟢 COMPLETED
    - **Phase 1.12.7:** API UX / Developer Experience / Documentation 🟢 COMPLETED
    - **Phase 1.12.8:** Final Acceptance Gate & Freeze 🟢 (ACCEPTED & FROZEN)
  - **Phase 1.13:** Staff UI & Onboarding Workflows 🟢 (ACCEPTED & FROZEN)
    - **Phase 1.13.0:** Staff Management Architecture & Contract Freeze 🟢 (ACCEPTED & FROZEN)
    - **Phase 1.13.1:** Staff Management Domain & Application Layer 🟢 COMPLETED
    - **Phase 1.13.2:** Staff Management API & Validators 🟢 COMPLETED
    - **Phase 1.13.3:** Staff Management Security & E2E Matrix 🟢 COMPLETED
    - **Phase 1.13.4:** Staff Workspace UI Feature 🟢 COMPLETED
    - **Phase 1.13.5:** UX, Accessibility & Workflow Testing 🟢 COMPLETED
    - **Phase 1.13.6:** Phase 1.13 Acceptance Gate & Freeze 🟢 (ACCEPTED & FROZEN)
  - **Phase 1.14:** Multi-Tenant Cross-Tenant Access Security Hardening 🟢 (ACCEPTED & FROZEN)
    - **Phase 1.14.0:** Security Architecture & Threat Model 🟢 (ACCEPTED & FROZEN)
    - **Phase 1.14.1:** Repository & Application Hardening 🟢 (ACCEPTED & FROZEN)
    - **Phase 1.14.2:** API Boundary Hardening 🟢 (ACCEPTED & FROZEN)
    - **Phase 1.14.3:** Adversarial Security E2E Matrix 🟢 (ACCEPTED & FROZEN)
    - **Phase 1.14.4:** Phase 1.14 Acceptance Gate & Freeze 🟢 (ACCEPTED & FROZEN)
  - **Phase 1.15:** Phase 1 Acceptance Gate 🟢 (ACCEPTED & FROZEN)
