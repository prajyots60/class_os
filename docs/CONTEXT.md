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
- **[ADR-0004: Testing Database & Isolation Strategy](file:///home/supra/Desktop/class_os/docs/adr/0004-testing-database-strategy.md)**
- **[ADR-0005: GitHub Actions Continuous Integration Strategy](file:///home/supra/Desktop/class_os/docs/adr/0005-ci-strategy.md)**
- **[Phase 1 Domain & Architecture Contract](file:///home/supra/Desktop/class_os/docs/phases/phase1.md)**
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
  └── Phase 0.11 — Production Deployment               ✅ COMPLETED
                                                        ↓
                                                  PHASE 0 GATE (PASSED)

PHASE 1 — IDENTITY MODULE                             🚧 NOW ACTIVE
  ├── Phase 1.1 — Institute Tenant Core                 ✅ COMPLETED
  └── Phase 1.2 — Users & Memberships                   ✅ COMPLETED
    ↓
PHASE 2  Academics Module                             ⏳ UPCOMING
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

## 4. Next Milestone Roadmap

### 🚧 PHASE 1 — IDENTITY MODULE (NOW ACTIVE)

- **Domain Contract Specification:** Documented in [docs/phases/phase1.md](file:///home/supra/Desktop/class_os/docs/phases/phase1.md) (Phase 1.0 Architecture Freeze) and [docs/phases/phase1.3-rbac.md](file:///home/supra/Desktop/class_os/docs/phases/phase1.3-rbac.md) (Phase 1.3.0 RBAC Architecture Freeze).
- **Subphase Tracking Rule:** Subphases are added to the tracker in `docs/CONTEXT.md` as each subphase is approved and implemented.
- **Phase 1 Implementation Map:**
  - **Phase 1.0:** Domain & Architecture Contract Freeze ✅
  - **Phase 1.1:** Institute Tenant Core ✅
  - **Phase 1.2:** Users & Memberships ✅
  - **Phase 1.3:** Capability-Based RBAC 🚧 (NOW ACTIVE)
    - **Phase 1.3.0:** RBAC Architecture & Capability Matrix ✅ (Freeze)
    - **Phase 1.3.1:** Capability Taxonomy & Strongly-Typed Enums ✅
    - **Phase 1.3.2:** Role → Capability Resolver Engine ✅
    - **Phase 1.3.3:** Authorization Engine & Assertion Guards ✅
    - **Phase 1.3.4:** Tenant-Scoped Capability Evaluation (Next)
    - **Phase 1.3.5:** Resource-Scoped Filtering Helpers (Parent/Teacher)
    - **Phase 1.3.6:** Identity Use Case Integration
    - **Phase 1.3.7:** Security & RBAC Test Matrix
    - **Phase 1.3.8:** Phase 1.3 Acceptance Gate
  - **Phase 1.4:** Institute Onboarding Workflow
  - **Phase 1.5:** Institute Settings & White-Label Branding
  - **Phase 1.6:** Global ParentIdentity Platform Layer
  - **Phase 1.7:** Tenant InstituteParent CRM Layer
  - **Phase 1.8:** Student Admission & Profile Core
  - **Phase 1.9:** Guardian & Student Links
  - **Phase 1.10:** Academic Hierarchy (Programs, Subjects, Batches)
  - **Phase 1.11:** Student Enrollment Lifecycle
  - **Phase 1.12:** Protected Identity APIs (`/api/v1/...`)
  - **Phase 1.13:** Staff UI & Onboarding Workflows
  - **Phase 1.14:** Multi-Tenant Cross-Tenant Access Security Hardening
  - **Phase 1.15:** Phase 1 Acceptance Gate
