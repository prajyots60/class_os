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
  ├── Phase 0.11 — Production Deployment               ✅ COMPLETED
  └── Phase 0.12 — Public & Authentication UX          🚧 NOW ACTIVE
        ├── Phase 0.12.0 — Architecture & UX Contract Freeze 🟢 (Freeze)
        ├── Phase 0.12.1 — UI Foundation & Design System Audit ✅
        ├── Phase 0.12.2 — Public Landing Page 🚧
        │     ├── 0.12.2.0 — UX & Content Contract 🟢 (Freeze)
        │     ├── 0.12.2.1 — Marketing Layout Shell ✅
        │     ├── 0.12.2.2 — Hero Section ✅
        │     ├── 0.12.2.3 — Product Workflow Section ✅
        │     ├── 0.12.2.4 — Core Capabilities Section ✅
        │     ├── 0.12.2.5 — Roles & Value Section ✅
        │     ├── 0.12.2.6 — Trust & Security Section ✅
        │     ├── 0.12.2.7 — Final CTA Section (Next)
        │     ├── 0.12.2.8 — Responsive, SEO & Accessibility Audit
        │     └── 0.12.2.9 — Landing Page Acceptance Gate
        ├── Phase 0.12.3 — Authentication Layout & Shared Components
        ├── Phase 0.12.4 — Sign Up UI
        ├── Phase 0.12.5 — Sign In UI
        ├── Phase 0.12.6 — Password Recovery UI (Deferred)
        ├── Phase 0.12.7 — Session & Route Guards
        ├── Phase 0.12.8 — Authenticated Application Shell
        ├── Phase 0.12.9 — Full Browser Journey Integration
        ├── Phase 0.12.10 — Security & UX Test Matrix
        └── Phase 0.12.11 — Phase 0.12 Acceptance Gate
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
- **Phase 0.11 (Production Deployment Strategy)**: Established production deployment strategy in `docs/adr/0007-production-deployment-strategy.md` and `docs/DEPLOYMENT.md`.

### 🚧 Phase 0.12 — Public & Authentication UX (In Progress)

- **Phase 0.12.0 (Architecture & UX Contract Freeze)**: Conducted complete repository and authentication backend audit. Defined authoritative frontend architecture in `docs/phases/phase0.12-public-auth-ux.md`, establishing route groups (`(marketing)`, `(auth)`, `(app)`), thin App Router page composition boundaries (< 30 lines per `page.tsx`), component ownership boundaries (`components/ui`, `features/auth`, `features/marketing`, `features/onboarding`, `features/dashboard`), authentication state machine, and Phase 0.12 implementation roadmap.
- **Phase 0.12.1 (UI Foundation & Design System Audit)**: Established the UI foundation in `@coaching-os/ui` and `apps/web`. Retained existing primitives (`Button`, `Input`, `Card`, `Badge`), created missing primitives (`Label`, `Textarea`, `Alert`, `Spinner`, `Skeleton`, `Separator`), created web brand (`CoachingOSLogo`) and layout (`Container`, `Section`) primitives, created unit test suite (`ui-primitives.test.ts`), and verified zero backend/auth/onboarding contract regressions.
- **Phase 0.12.2.0 (Landing Page UX & Content Contract Freeze)**: Created authoritative landing page UX and content contract in `docs/phases/phase0.12.2-landing-page.md`. Frozen target audience (institute owners/founders), core positioning ("Run your coaching institute from one place"), primary CTA (`"Get Started"` -> `/sign-up`), secondary CTA (`"Sign In"` -> `/sign-in`), 8-section vertical information architecture, component hierarchy under `apps/web/src/components/marketing/`, factual trust/security boundaries (zero fake claims), and non-goals. Zero code modifications introduced during contract freeze.
- **Phase 0.12.2.1 (Marketing Layout Shell)**: Implemented Next.js route group layout `app/(marketing)/layout.tsx` rendering `MarketingHeader` + `<main>` + `MarketingFooter`, created `(marketing)/page.tsx` composition placeholder serving `/`, built `MarketingHeader` with desktop anchor links and `<MobileNav />` client toggle, built `MarketingFooter` with dynamic copyright and system status badge, removed obsolete flat `app/page.tsx`, and verified zero database/auth/RBAC dependencies in marketing components.
- **Phase 0.12.2.2 (Hero Section Component)**: Implemented 100% Server Component `<HeroSection />` (`hero-section.tsx`) and `<HeroProductPreview />` (`hero-product-preview.tsx`), strictly adhering to Section 7.2 of frozen UX contract (H1 headline *"Run your coaching institute from one place."*, supporting copy, eyebrow badge, primary CTA `/sign-up`, secondary CTA `/sign-in`, multi-tenant trust micro-copy, and realistic React/CSS institute workspace dashboard preview). Composed in `app/(marketing)/page.tsx` and verified zero DB/auth/RBAC dependencies.
- **Phase 0.12.2.3 (Product Workflow Section)**: Implemented 100% Server Component `<WorkflowSection />` (`workflow-section.tsx`) rendering a 4-step operational progression (`STEP 01`: Set Up Your Institute, `STEP 02`: Add Team & Students, `STEP 03`: Run Daily Operations, `STEP 04`: Stay in Total Control). Composed in `app/(marketing)/page.tsx` with zero DB/auth dependencies.
- **Phase 0.12.2.4 (Core Capabilities Section)**: Implemented 100% Server Component `<CapabilitiesSection />` (`capabilities-section.tsx`) rendering an 8-card domain grid (Student Management, Academic Operations, Attendance Tracking, Homework & Tasks, Tests & Marks, Fees & Billing, Staff & Role Control, Institute Announcements). Composed in `app/(marketing)/page.tsx` with zero DB/auth dependencies.
- **Phase 0.12.2.5 (Roles & Value Section)**: Implemented 100% Server Component `<RolesSection />` (`roles-section.tsx`) rendering 4 canonical role cards (Institute Owner, Teacher, Assistant, Parent & Student) highlighting role-specific operational value propositions. Composed in `app/(marketing)/page.tsx` with zero DB/auth dependencies.
- **Phase 0.12.2.6 (Trust / Security Section)**: Implemented 100% Server Component `<TrustSection />` (`trust-section.tsx`) rendering 4 technical security concept cards (Row-Level Tenant Isolation, Capability RBAC, Server Sessions, Audit Logging) strictly grounded in existing codebase architecture. Composed in `app/(marketing)/page.tsx` with zero DB/auth dependencies.

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
  - **Phase 1.5:** Institute Settings & White-Label Branding (Next)
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
