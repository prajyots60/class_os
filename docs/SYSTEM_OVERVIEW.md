# 🏛️ CoachingOS — Master System Overview & Phase Progression

> **Authoritative Technical & Product Summary Document**  
> **Target Audience:** Engineering Staff, Product Lead, Architecture Reviewers, Onboarding Engineers  
> **Status:** Phase 0 (ACCEPTED & FROZEN) | Phase 1 (ACCEPTED & FROZEN) | Phase 2 (ACCEPTED & FROZEN)  
> **Updated:** August 14, 2026

---

## 1. Executive Summary & Core Mission

**CoachingOS** is a multi-tenant SaaS operating system purpose-built for **founder-led coaching institutes (50–500 students)**.

Unlike generic school ERPs, LMS platforms, or enterprise software, CoachingOS is engineered around the daily operational realities of coaching institutes: fast batch-based class workflows, rapid attendance recording, clear assessment reporting, and parent transparency without phone calls.

### Key Product & Architecture Invariants

- **Architecture:** Modular Monolith inside a pnpm + Turborepo workspace.
- **Multi-Tenancy:** Shared PostgreSQL database with explicit `institute_id` row-level scoping at the repository & application layer.
- **Clean Architecture Boundaries:** Presentation → Application → Domain (100% Framework Independent) ← Infrastructure.
- **Operational Entity:** `Enrollment` (not Student) is the primary relationship entity owning batch participation, attendance, marks, and billing plans.
- **Session-Driven Academics:** Attendance and homework attach to generated `BatchSession` calendar occurrences, not raw schedules.
- **Two-Layer Parent Model (ADR-001):** Global `ParentIdentity` (phone-anchored platform identity) separated from tenant-scoped `InstituteParent` and parent-managed `ChildProfile`.
- **Capability-Based RBAC:** Centralized `AuthorizationEngine` evaluating fine-grained resource capabilities (`resource:action`) rather than hardcoded string roles.

---

## 2. Overall Roadmap Progression

```text
========================================================================================
                               COACHINGOS ROADMAP PROGRESSION
========================================================================================

PHASE 0 — ENGINEERING FOUNDATION                         ✅ ACCEPTED & FROZEN
  └── Build the production-grade engineering machine (Monorepo, Clean Architecture,
      Prisma 7 + Postgres 17, Better Auth, Testing, CI, Observability, Shell & UX).

PHASE 1 — IDENTITY & ORGANIZATIONAL MODULE               ✅ ACCEPTED & FROZEN
  └── Build multi-tenancy, capability RBAC, institute onboarding, settings,
      two-layer ParentIdentity, Student CRM, Guardians, Academic Hierarchy & Enrollment.

PHASE 2 — ACADEMICS OPERATIONAL ENGINE                   ✅ ACCEPTED & FROZEN
  └── Build daily operational workflows (Weekly Schedules, Generated BatchSessions,
      Bulk Attendance, Batch Homework, Tests & Bulk Marks Entry).

PHASE 3 — BILLING MODULE                                 ⏳ UPCOMING
  └── Billing Plans, Monthly/Installment Invoices, Payment Receipts & Balance Tracking.

PHASE 4 — COMMUNICATION MODULE                           ⏳ UPCOMING
  └── Announcements, Notification Pipeline & Event-Driven WhatsApp Delivery.

PHASE 5 — PARENT PWA                                     ⏳ UPCOMING
  └── Mobile-first Parent Portal across multi-institute child profiles.

PHASE 6 — STAFF DASHBOARD POLISH                         ⏳ UPCOMING
  └── Founder, Teacher, and Assistant role-tailored dashboards and analytics.

PHASE 7 — PRODUCTION & BETA READINESS                    ⏳ UPCOMING
  └── Performance tuning, rate limiting, security audit & beta institute onboarding.
========================================================================================
```

---

## 3. What We Implemented & Achieved in Phase 0 (Engineering Foundation)

Phase 0 established the complete technical infrastructure, architecture, security rules, CI/CD pipeline, and design system before product features were built.

### 0.1 Monorepo & Folder Structure
- Initialized pnpm + Turborepo monorepo with 1 Next.js 16 App Router application (`apps/web`), 6 domain packages (`packages/*`), and 4 infrastructure packages (`infrastructure/*`).
- Framework-independent domain boundary enforced across all domain packages.

### 0.2 Clean Architectural Boundaries
- Established non-negotiable dependency direction:  
  `Presentation (web) → Application Use Cases → Domain Entities ← Infrastructure Adapters (database/auth)`.
- Domain entities expose domain methods (`updateDetails`, `archive`, `suspend`) and contain zero imports from Prisma, Next.js, React, or HTTP objects.

### 0.3 Web & UI Design System
- Modern token-driven CSS system (`var(--color-primary)`, `var(--radius-card)`), custom dark/light theme engine, Google Fonts (`Inter`, `Manrope`, `Poppins`, `Nunito`).
- Atomic `@coaching-os/ui` component library (`Button`, `Input`, `Card`, `Badge`, `Label`, `Textarea`, `Alert`, `Spinner`, `Skeleton`, `Separator`).

### 0.4 Database & Persistence
- Integrated PostgreSQL 17 + Prisma ORM 7.9.1 with `@prisma/adapter-pg` driver.
- Configured dual connection strategy: pooled `DATABASE_URL` via PgBouncer for serverless application routes and direct `DIRECT_URL` for Prisma CLI migrations.
- Established baseline migration schema with 27 models and deterministic CLI health checks.

### 0.5 Authentication & Session Management
- Integrated Better Auth `1.6.25` behind an infrastructure wrapper (`@coaching-os/auth`).
- Mapped authentication users to PostgreSQL `users` table with UUID v4 generation and rate-limiting (`/sign-in`, `/sign-up`).
- Built server session & tenant resolution guards (`requireAuthSession`, `resolveServerTenantContext`).

### 0.6 Shared Observability & Security Infrastructure
- Pino `9.6.0` structured logging abstraction (`@coaching-os/observability`) with automatic redaction of 24 sensitive PII/credential paths.
- Domain error taxonomy (`ValidationError`, `AuthenticationError`, `AuthorizationError`, `NotFoundError`, `ConflictError`, `RateLimitError`, `InternalError`).
- Server-side generated monotonic request IDs (`crypto.randomUUID()`) for request tracing.
- `/api/health` application and database readiness endpoint.

### 0.7 Testing & CI Infrastructure
- **3-Tier Testing Architecture:** Vitest unit tests, Vitest + PostgreSQL integration tests against real PostgreSQL test database (`coachingos_test`), and Playwright Chromium E2E browser tests. Zero SQLite substitute mocking.
- Automated GitHub Actions CI pipeline (`.github/workflows/ci.yml`) executing 4 sequential jobs: `quality`, `database-and-tests`, `e2e`, `build`.

### 0.8 Public & Authentication UX
- Public landing page with conversion sections (`app/(marketing)`).
- Authentication layout and forms (`/sign-in`, `/sign-up`) with interactive password toggles, loading state management, and `sanitizeCallbackUrl` open-redirect security defense.
- Authenticated App Shell layout (`apps/web/src/features/app-shell/`) with desktop sidebar, mobile responsive drawer, user menu, and role-aware navigation filtering.

---

## 4. What We Implemented & Achieved in Phase 1 (Identity & Organizational Module)

Phase 1 established the identity, organizational structure, tenant security boundaries, and staff management capabilities of CoachingOS.

```text
                               PHASE 1 DOMAIN GRAPH
                                        │
                                   Institute (Tenant)
                                        │
           ┌────────────────────────────┼────────────────────────────┐
           ▼                            ▼                            ▼
  Users & Memberships            Parent Architecture            Student CRM
(User, InstituteMembership)    (ParentIdentity, ChildProfile,   (Student, InstituteParentStudent)
           │                   InstituteParent, StudentLink)         │
           └────────────────────────────┬────────────────────────────┘
                                        ▼
                               Academic Hierarchy
                          (Program, Subject, Batch)
                                        │
                                        ▼
                                   Enrollment
                       (Student ↔ Batch Operational Link)
```

### 1.1 Institute Tenant Core
- `InstituteEntity` in `@coaching-os/identity` with slug normalization, validation, and lifecycle transitions (`active`, `suspended`, `archived`).
- `PrismaInstituteRepository` with explicit error translation (Prisma `P2002` → `ConflictError`, `P2025` → `NotFoundError`).
- Application use cases (`CreateInstituteUseCase`, `UpdateInstituteUseCase`, `ChangeInstituteStatusUseCase`) and structured audit events (`identity.institute.create.success`).

### 1.2 Users & Memberships
- `InstituteMembershipEntity` supporting 4 core organizational roles (`owner`, `teacher`, `assistant`, `parent`).
- Server-side trusted tenant context resolver (`ResolveInstituteMembershipUseCase`) ensuring session identities map directly to tenant memberships.

### 1.3 Capability-Based RBAC Architecture
- Defined central 49-capability registry (`CAPABILITIES`, e.g., `institute:update`, `student:admit`, `academics:attendance:record`).
- Implemented `AuthorizationEngine` evaluating fine-grained capabilities:
  - `owner`: 49 capabilities
  - `teacher`: 27 capabilities
  - `assistant`: 19 capabilities
  - `parent`: 10 capabilities
- Layer 2 resource scope assertion guards (`canParentAccessStudent`, `filterStudentsForParent`, `canTeacherAccessBatch`).

### 1.4 Institute Onboarding & Branding Settings
- Atomic onboarding workflow (`OnboardInstituteUseCase`) creating Institute + Owner membership inside a single database transaction.
- Institute settings and white-label branding configuration (`logoUrl`, `primaryColor`, `secondaryColor`, `fontFamily`, `radiusStyle`).

### 1.5 Two-Layer Parent Identity Architecture (ADR-001)
- **Platform Layer:** Global `ParentIdentity` anchored to unique phone numbers, personal parent-created `ChildProfile` records, and `StudentLink` mapping.
- **Tenant Layer:** Tenant-scoped `InstituteParent` CRM entity allowing a parent identity to interact with multiple independent coaching institutes without cross-tenant data merging.

### 1.6 Student CRM & Guardian Linkage
- `StudentEntity` supporting admission numbers, student profile data, admission status (`pending`, `admitted`, `rejected`), and student status (`active`, `inactive`, `archived`).
- `InstituteParentStudent` guardian relationship entity supporting relationship types (`father`, `mother`, `guardian`, `sibling`) and primary contact flags.

### 1.7 Academic Hierarchy & Student Enrollment
- Organizational hierarchy: `Program` → `Subject` → `Batch`.
- `EnrollmentEntity` as the central operational entity connecting `Student` to `Batch`. Manages enrollment status (`pending`, `active`, `completed`, `withdrawn`, `transferred`).

### 1.8 Protected Identity APIs & Cross-Tenant Security Hardening (Phase 1.14)
- Hardened protected REST APIs under `/api/v1/identity/...` with strict Zod validation, authentication session guards, and tenant context verification.
- **Cross-Tenant Security Hardening:** Comprehensive adversarial security audit verifying that any attempt by `Institute A` users to read, mutate, or access `Institute B` data results in HTTP 403 `AuthorizationError` or HTTP 404 `NotFoundError`.

---

## 5. What We Implemented & Achieved in Phase 2 (Academics Operational Engine)

Phase 2 established the **daily operational engine** of CoachingOS. While Phase 0 built the machine and Phase 1 built the identity foundation, Phase 2 answered:

> **"What happens on Monday morning when the teacher actually starts teaching?"**

```text
                        TEACHER'S DAILY OPERATIONAL LOOP
                                       │
         ┌─────────────────────────────┼─────────────────────────────┐
         ▼                             ▼                             ▼
 1. Today's Sessions           2. Record Attendance          3. Publish Homework
 (Schedule → Session)          (Enrollment-Scoped)            (Batch-Targeted)
         │                             │                             │
         └─────────────────────────────┼─────────────────────────────┘
                                       ▼
                                4. Conduct Test
                              (Weekly/Unit/Mock)
                                       │
                                       ▼
                               5. Enter Bulk Marks
                               (0 <= Marks <= Max)
                                       │
                                       ▼
                               6. Publish Results
```

---

### Core Areas & Business Rules of Phase 2

#### 1. Scheduling & Sessions Engine (`Schedule` & `BatchSession`)
- **Rule:** `Schedule` represents the recurring weekly blueprint (e.g., *Physics every Mon/Wed at 5 PM*). `BatchSession` represents a concrete calendar occurrence (e.g., *Session on Monday, Aug 17*).
- **Rule:** Attendance, homework, and test activities attach to the **`BatchSession`**, not the abstract schedule.
- **Capabilities:** Generation window engine, ad-hoc session creation, session cancellation, substitute teacher assignment.

#### 2. Session-Driven Attendance Core (`Attendance`)
- **Rule:** Attendance is recorded against `(batchSessionId, enrollmentId)`.
- **Rule:** Only `active` enrollments are eligible for attendance.
- **Rule:** Target operational execution: Teachers record batch attendance in under **30 seconds**.
- **Rule:** Submitting attendance updates `batchSessions.attendanceTaken = true` and emits `academics.attendance.recorded`.

#### 3. Homework Workflow (`Homework`)
- **Rule:** Homework is batch-targeted (`batchId`) and created by authorized teachers/staff.
- **Rule:** Supports state transitions (`draft` → `published`) and optional attachment links. Once published, title, description, attachments, and timestamps are strictly immutable.

#### 4. Assessment & Marks Engine (`Test` & `Marks`)
- **Rule:** Test state machine: `draft` → `scheduled` → `marks_entered` → `published`.
- **Rule:** Marks validation: `0 <= marksObtained <= test.maximumMarks` (decimal precision up to 2 places).
- **Rule:** Every submitted enrollment MUST belong to an active enrollment in `test.batchId`.
- **Rule:** Single transaction bulk mark recording (`$transaction`). Published test results are strictly immutable.

---

### 5.1 Subphase Execution & Summary

- **Phase 2.0 — Architecture & Contract Freeze**: Specified and froze authoritative Phase 2 Academics contract (`docs/phases/02/phase2-academics-contract.md`), operational local time date semantics, same-batch ownership boundaries, homework/test publication immutability, and atomic bulk operations.
- **Phase 2.1 — Scheduling & Session Engine**: Built `ScheduleEntity`, `BatchSessionEntity`, value objects (`DayOfWeek`, `TimeOfDay`), pure `ScheduleGeneratorService`, Prisma repositories, and 8 application use cases.
- **Phase 2.2 — Session Attendance Core**: Built `AttendanceEntity` anchored to `(batchSessionId, enrollmentId)` pair, enforcing active enrollment requirement (`ACADEMIC-008`), cancelled session attendance rejection, atomic bulk transaction execution, and idempotent upserts.
- **Phase 2.3 — Homework Workflow**: Built `HomeworkEntity` targeted to a `Batch`, state transitions (`draft` → `published`), explicit publication dialogs, and strict publication immutability.
- **Phase 2.4 — Assessment & Bulk Marks Engine**: Built `TestEntity` state machine (`draft` → `scheduled` → `marks_entered` → `published`) and `MarksEntity` (`0 <= marks <= maxMarks`, max 2 decimal places). Implemented single-transaction bulk mark recording with atomic rollback and immutable published test results.
- **Phase 2.5 — Protected Academics APIs**: Exposed 15 versioned REST API endpoints under `/api/v1/academics/...` with server-authoritative tenant context resolution (`resolveV1TenantContext`), RBAC capability guards (`withV1ReadGuard`, `withV1MutationGuard`), fail-closed 404 cross-tenant resource masking, and strict Zod validation.
- **Phase 2.6 — Staff Academic Workspace UI**: Built responsive, accessible tabbed workspace `/academics` with 6 sub-views (`Today's Work`, `Sessions & Schedules`, `Attendance`, `Homework`, `Assessments & Marks`, `Programs & Batches`) and strongly-typed `v1AcademicsClient`.
- **Phase 2.7 — UX / Accessibility & Security E2E Matrix**: Built `academics-adversarial-security.test.ts` (30+ threat scenarios verifying `ACADEMIC-001..015`) and Playwright E2E suite `academic-workspace-e2e.spec.ts` (verifying workspace navigation, schedule generation, bulk attendance, homework publication, assessment marks entry, screen reader ARIA semantics, and 375px mobile responsiveness).
- **Phase 2.8 — Phase 2 Acceptance Gate & Milestone Freeze**: Executed full quality gate verification (`env:check`, `db:validate`, `db:health`, `typecheck`, `test`, `lint`, `build`). Formally ACCEPTED and FROZEN Phase 2 — Academics Module (`docs/phases/02/phase2-final-acceptance.md`).

---

### Phase 2 Implementation Subphase Roadmap

```text
PHASE 2 — ACADEMICS MODULE EXECUTION ROADMAP
  ├── Phase 2.0 — Architecture & Contract Freeze              🟢 ACCEPTED & FROZEN
  ├── Phase 2.1 — Scheduling & Session Engine (`Schedule` & `BatchSession`) 🟢 ACCEPTED & FROZEN
  ├── Phase 2.2 — Session Attendance Core (`Attendance`)       🟢 ACCEPTED & FROZEN
  ├── Phase 2.3 — Homework Workflow (`Homework`)               🟢 ACCEPTED & FROZEN
  ├── Phase 2.4 — Assessment & Bulk Marks Engine (`Test` & `Marks`) 🟢 ACCEPTED & FROZEN
  ├── Phase 2.5 — Protected Academics APIs (`/api/v1/academics/...`) 🟢 ACCEPTED & FROZEN
  ├── Phase 2.6 — Staff Academic Workspace UI (Teacher & Staff Workspaces) 🟢 ACCEPTED & FROZEN
  ├── Phase 2.7 — UX / Accessibility & Security E2E Matrix     🟢 ACCEPTED & FROZEN
  └── Phase 2.8 — Phase 2 Acceptance Gate & Milestone Freeze   🟢 ACCEPTED & FROZEN
                                                        ↓
                                                  PHASE 2 GATE (PASSED & FROZEN)
```

---

## 6. Verification & Quality Standards Summary

Every phase and subphase in CoachingOS is governed by strict senior staff engineering standards defined in `AGENTS.md` and `ENGINEERING_PLAYBOOK.md`:

```bash
pnpm env:check          # Validate environment variable configurations
pnpm db:validate        # Validate Prisma schema against database standard
pnpm db:health          # Verify PostgreSQL database connection health
pnpm test               # Run unit & integration tests across 13 monorepo packages
pnpm typecheck          # Run strict TypeScript typecheck
pnpm lint               # Run ESLint across workspace
pnpm build              # Run Next.js App Router & package builds
```

---

## 7. Future Horizons (Phases 3 – 7 Overview)

| Phase | Core Focus | Key Deliverables |
| :--- | :--- | :--- |
| **Phase 3** | **Billing Module** | Fee structures, billing plans, monthly/installment invoices, manual payments (Cash/UPI/Bank), receipts. |
| **Phase 4** | **Communication Module** | Announcements, notification engine, automated WhatsApp alerts for absence, fees, and marks. |
| **Phase 5** | **Parent PWA** | Mobile parent portal for attendance, homework, marks, fee history, and child profiles across institutes. |
| **Phase 6** | **Staff Dashboard Polish** | Role-tailored dashboards for Founder/Owner, Teacher, and Assistant with operational analytics. |
| **Phase 7** | **Beta & Production** | Query performance tuning, rate-limiting, security audits, and onboarding 3–5 beta institutes. |
