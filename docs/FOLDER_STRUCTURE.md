# 📁 CoachingOS Repository Directory Structure

> **Architectural Type**: Modular Monolith  
> **Workspace Manager**: pnpm Workspaces + Turborepo  
> **Framework Boundary**: Strict layered dependency invariants (`Presentation` → `Application` → `Domain` ← `Infrastructure Adapters`)

---

## 1. High-Level Monorepo Overview

```text
coaching-os/
├── apps/                         ← Next.js Web Application & API Route Adapters
│   └── web/                      ← Main Web Portal (App Router, Feature Components, Route Handlers, E2E)
│
├── packages/                     ← Isolated Modular Domain Packages
│   ├── identity/                 ← Institute Tenants, Users, Memberships, Capability RBAC, Parents & Students
│   ├── academics/                ← Schedules, Sessions, Batches, Attendance, Homework
│   ├── billing/                  ← Fee Structures, Invoices, Receipts, Payments
│   ├── communication/            ← Announcements, Notifications, WhatsApp Triggers
│   ├── administration/           ← Staff Management & System Configuration
│   ├── audit/                    ← Event Tracking & Audit Logging
│   ├── shared/                   ← Error Taxonomy, Domain Events, Common Utilities
│   └── ui/                       ← Token-Driven UI Primitives (Button, Card, Input, Modal, Theme)
│
├── infrastructure/               ← Production Infrastructure & Framework Adapters
│   ├── database/                 ← Prisma 7 ORM, PostgreSQL Client, Migrations, Test Database
│   ├── auth/                     ← Better Auth Wrapper, Session Helpers, Client Auth Hook
│   ├── observability/            ← Pino Logger Abstraction, PII Redaction, Error Reporter
│   ├── config/                   ← Zod-Validated Environment Variable Schema & Checkers
│   ├── queue/                    ← Event Queue Contracts & Job Stubs
│   └── storage/                  ← Storage Service Interfaces & Asset Wrappers
│
└── docs/                         ← System Architecture Specifications, Phase Contracts & ADRs
    ├── adr/                      ├── Architecture Decision Records (ADR 0001 - 0011)
    └── phases/                   └── Phase Contracts (Phase 0.12, 1.0, 1.3 RBAC, 1.4 - 1.8 Core)
```

---

## 2. Dependency Direction Rules

```text
                 [ Presentation Layer ]
                ( apps/web, packages/ui )
                           │
                           ▼
                [ Application Layer ]
             ( Use Cases, DTOs, Commands )
                           │
                           ▼
                  [ Domain Layer ]
             ( Entities, Invariants, Repo Interfaces )
                           ▲
                           │ (implements interfaces)
               [ Infrastructure Layer ]
           ( Database, Auth, Observability, Config )
```

---

## 3. Comprehensive Directory Breakdown

### 3.1 Web Application (`apps/web`)
```text
apps/web/
├── e2e/                          ← Playwright End-to-End Test Suite
│   ├── app.spec.ts               ← Health check & Baseline UI smoke tests
│   ├── guardian-student-security.spec.ts ← Relationship API security & anti-spoofing matrix
│   ├── guardian-student-workflow.spec.ts ← Staff Guardian/Student UI workflow & accessibility
│   ├── institute-parent-security.spec.ts ← Parent CRM security test suite
│   ├── onboarding.spec.ts        ← Institute Onboarding & Tenant Context flow suite
│   ├── rbac.spec.ts              ← Capability-based RBAC browser evaluation tests
│   ├── student-security.spec.ts  ← Student admission security test suite
│   └── student-workflow.spec.ts  ← Student admission workflow test suite
├── public/                       ← Static public assets (SVG icons, branding placeholders)
├── src/
│   ├── app/                      ← Next.js 16 App Router structure
│   │   ├── api/                  ← HTTP Route Handler Adapters
│   │   │   ├── auth/             ← Better Auth catch-all route (`/api/auth/[...all]`)
│   │   │   ├── dashboard/        ← Server tenant context handler (`GET /api/dashboard/context`)
│   │   │   ├── health/           ← System baseline health endpoint (`GET /api/health`)
│   │   │   ├── institute/        ← Tenant settings, parents, students & guardian relationship endpoints
│   │   │   │   ├── parent-student/← Relationship management API (`/api/institute/parent-student/[id]`)
│   │   │   │   ├── parents/      ← InstituteParent API (`/api/institute/parents`, `/parents/[parentId]/students`)
│   │   │   │   ├── settings/     ← Institute settings API (`/api/institute/settings`)
│   │   │   │   └── students/     ← Student admission & guardians API (`/api/institute/students`, `/[studentId]/guardians`)
│   │   │   └── onboarding/       ← Institute onboarding endpoint (`POST /api/onboarding/institute`)
│   │   ├── dashboard/            ← Authenticated tenant dashboard pages & sub-views
│   │   ├── onboarding/           ← Institute setup onboarding form page (`page.tsx`)
│   │   ├── error.tsx             ← Global Next.js error boundary
│   │   ├── globals.css           ← Global styles & CSS variables
│   │   ├── layout.tsx            ← Root application layout
│   │   ├── loading.tsx           ← Loading spinner fallback
│   │   ├── not-found.tsx         ← 404 Not Found page
│   │   └── page.tsx              ← Landing page showcase
│   ├── components/               ← Shared UI layout & marketing presentation components
│   ├── features/                 ← Feature-driven application components
│   │   ├── app-shell/            ← Header, Navigation sidebar, Tenant Context Banner
│   │   ├── auth/                 ← Auth forms, login modals, session state components
│   │   ├── dashboard/            ← Authenticated staff dashboard components
│   │   ├── guardian/             ├── Staff Guardian management components, modals, badges, API client
│   │   ├── institute-parent/     ← Tenant Parent CRM UI components & modals
│   │   ├── institute-settings/   ← White-label settings & branding form UI components
│   │   ├── onboarding/           ← Multi-step institute setup onboarding wizard
│   │   ├── staff/                ← Staff management workspace components, table, card list & modals
│   │   └── student/              ← Student admission & profile UI components & modals
│   ├── lib/                      ← API clients, auth guards, fetch helpers
│   ├── providers/                ← Global React context providers (Auth, Query, UI)
│   └── stores/                   ← Client-side state management stores (Zustand)
├── eslint.config.mjs             ← ESLint configuration
├── next.config.ts                ← Next.js framework configuration
├── package.json                  ← Web app dependencies (`@coaching-os/*`)
├── playwright.config.ts          ← Playwright test runner configuration
├── tsconfig.json                 ← Web app TypeScript configuration
└── vitest.config.ts              ← Web API route unit test runner configuration
```

### 3.2 Workspace Packages (`packages/*`)

#### `packages/identity/` (Identity & Tenant Domain)
```text
packages/identity/
├── src/
│   ├── application/              ← Application DTOs & Use Cases
│   │   ├── dto/
│   │   │   ├── guardian-student-relationship.dto.ts ← Relationship DTOs & conversion helpers
│   │   │   ├── institute-parent.dto.ts     ← InstituteParent DTO & conversion helper
│   │   │   ├── parent-identity.dto.ts      ← ParentIdentity DTO & conversion helper
│   │   │   └── student.dto.ts              ← Student DTO & conversion helper
│   │   └── use-cases/
│   │       ├── guardian-student-relationship/ ← Relationship linking, update, primary & archive use cases
│   │       ├── institute.use-cases.ts      ← Institute CRUD & query orchestration
│   │       ├── institute-parent.use-cases.ts← InstituteParent CRM orchestration
│   │       ├── membership.use-cases.ts     ← Membership resolution & context builder
│   │       ├── onboarding.use-cases.ts     ← Institute onboarding orchestration
│   │       ├── parent-identity.use-cases.ts← Platform Global ParentIdentity orchestration
│   │       ├── settings.use-cases.ts       ← Institute Settings & Branding orchestration
│   │       └── student.use-cases.ts        ← Student admission, lifecycle & profile use cases
│   ├── authorization/            ← Capability-Based RBAC Engine
│   │   ├── authorization-engine.ts         ← Dynamic capability evaluation & guards
│   │   ├── capabilities.ts                 ← Capability taxonomy enum (58 capabilities)
│   │   ├── resource-scope.ts               ← Resource filtering & parent/teacher scopes
│   │   └── role-capabilities.ts            ← Role → Capability map (Owner, Assistant, Teacher, Parent)
│   ├── domain/                   ← Framework-Independent Business Domain
│   │   ├── entities/
│   │   │   ├── batch.entity.ts             ← Batch aggregate & state machine (Phase 1.11 isolated)
│   │   │   ├── institute.entity.ts         ← Institute domain entity & status invariants
│   │   │   ├── institute-membership.entity.ts ← Membership domain entity & role invariants
│   │   │   ├── institute-parent.entity.ts  ← Tenant-scoped parent CRM entity
│   │   │   ├── institute-parent-student.entity.ts ← Tenant-scoped guardian-student relationship entity
│   │   │   ├── parent-identity.entity.ts   ← Platform-global parent identity entity
│   │   │   ├── program.entity.ts           ← Program aggregate offering
│   │   │   ├── program-subject.entity.ts   ← Program ↔ Subject relationship aggregate
│   │   │   ├── student.entity.ts           ← Student learner aggregate & state machine
│   │   │   └── subject.entity.ts           ← Option B independent subject aggregate
│   │   ├── value-objects/
│   │   │   ├── batch-code.vo.ts            ← BatchCode value object validation
│   │   │   ├── date-of-birth.vo.ts         ← DateOfBirth value object validation
│   │   │   ├── guardian-relationship-status.vo.ts ← Relationship status VO (active, archived)
│   │   │   ├── guardian-relationship-type.vo.ts   ← Relationship taxonomy VO (father, mother, etc.)
│   │   │   ├── phone-number.vo.ts          ← E.164 PhoneNumber value object validation
│   │   │   ├── program-code.vo.ts          ← ProgramCode value object validation
│   │   │   └── subject-code.vo.ts          ← SubjectCode value object validation
│   │   └── repositories/
│   │       ├── batch.repository.ts         ← Batch repository interface
│   │       ├── institute.repository.ts     ← Institute persistence interface
│   │       ├── institute-membership.repository.ts ← Membership repository interface
│   │       ├── institute-onboarding.repository.ts ← Atomic onboarding unit of work interface
│   │       ├── institute-parent.repository.ts ← InstituteParent repository interface
│   │       ├── institute-parent-student.repository.interface.ts ← Relationship repository interface
│   │       ├── parent-identity.repository.ts  ← ParentIdentity repository interface
│   │       ├── program.repository.ts       ← Program repository interface
│   │       ├── program-subject.repository.ts ← ProgramSubject repository interface
│   │       ├── student.repository.ts        ← Student repository interface
│   │       └── subject.repository.ts        ← Subject repository interface
│   ├── infrastructure/           ← Prisma Persistence Implementations
│   │   └── repositories/
│   │       ├── prisma-batch.repository.ts  ← PostgreSQL Batch repository
│   │       ├── prisma-institute.repository.ts ← PostgreSQL Institute repository
│   │       ├── prisma-institute-membership.repository.ts ← PostgreSQL Membership repository
│   │       ├── prisma-institute-parent.repository.ts    ← PostgreSQL InstituteParent repository
│   │       ├── prisma-institute-parent-student.repository.ts ← PostgreSQL Relationship repository
│   │       ├── prisma-onboard-institute.repository.ts    ← PostgreSQL $transaction atomic bootstrapper
│   │       ├── prisma-parent-identity.repository.ts     ← PostgreSQL ParentIdentity repository
│   │       ├── prisma-rbac-role-capability.repository.ts ← Role-capability resolver adapter
│   │       └── prisma-student.repository.ts            ← PostgreSQL Student repository
│   ├── presentation/             ← Presentation Validators
│   │   └── validators/
│   │       ├── guardian-student-relationship.validator.ts ← Relationship input schemas (Zod)
│   │       ├── institute.validator.ts      ← Institute input schemas (Zod)
│   │       ├── institute-parent.validator.ts← InstituteParent CRM schemas (Zod)
│   │       ├── membership.validator.ts     ← Membership input schemas (Zod)
│   │       └── onboarding.validator.ts     ← Onboarding presentation schema (Zod)
│   └── index.ts                  ← Explicit barrel exports for package consumers
├── package.json                  ← `@coaching-os/identity` package configuration
├── tsconfig.json                 ← Strict TypeScript configuration
└── vitest.config.ts              ← Vitest unit & integration runner config
```

#### Other Domain & Shared Packages
```text
packages/
├── academics/                    ← Academic management domain (Schedules, Sessions, Batches)
├── administration/               ← System config & staff admin domain
├── audit/                        ← Audit logging domain contracts
├── billing/                      ← Billing, invoicing, & payments domain
├── communication/                ← WhatsApp, SMS, & announcement messaging domain
├── shared/                       ← Common utilities across monorepo
│   └── src/
│       ├── errors.ts             ← Standardized error taxonomy (ValidationError, ConflictError, etc.)
│       ├── events.ts             ← Domain event type definitions
│       └── index.ts              ← Barrel exports
└── ui/                           ← Shared UI token primitives
    └── src/
        ├── components/           ← Reusable UI components (Button, Input, Card, Modal, Form)
        ├── lib/                  ← UI class utility helpers (`cn()`)
        ├── theme/                ← Design tokens & theme provider
        └── index.ts              ← Primitive barrel exports
```

### 3.3 Infrastructure Packages (`infrastructure/*`)

```text
infrastructure/
├── auth/                         ← Better Auth Integration Adapter
│   ├── src/
│   │   ├── auth.ts               ← Server-side Better Auth instance setup
│   │   ├── auth-client.ts        ← Client-side Better Auth React hooks wrapper
│   │   ├── session.ts            ← Server session extraction & auth verification guards
│   │   ├── verify.ts             ← Auth pipeline verification script (`pnpm verify:auth`)
│   │   └── index.ts              ← Public auth exports
│   ├── package.json
│   └── tsconfig.json
├── config/                       ← Zod-Validated Environment Configuration
│   ├── src/
│   │   ├── check.ts              ← Environment check script (`pnpm env:check`)
│   │   ├── client.ts             ← Public client-safe environment variables
│   │   ├── server.ts             ← Server-only environment schema & validator
│   │   └── index.ts              ← Exported configuration object
│   ├── package.json
│   └── tsconfig.json
├── database/                     ← PostgreSQL Database Adapter & Prisma ORM
│   ├── prisma/
│   │   ├── migrations/           ← Standardized PostgreSQL migration files
│   │   ├── schema.prisma         ← Authoritative Prisma 7 database schema
│   │   └── seed.ts               ← Development environment database seeder
│   ├── src/
│   │   ├── generated/            ← Prisma generated client models & types
│   │   ├── testing/              ← Real PostgreSQL test database helpers & cleanup factories
│   │   ├── health.ts             ← Database health verification script (`pnpm db:health`)
│   │   └── index.ts              ← Database client exports (`db`, `PrismaClient`)
│   ├── package.json
│   ├── prisma.config.ts          ← Prisma CLI configuration (direct URL & driver adapter)
│   └── tsconfig.json
└── observability/                ← Production Logging & Diagnostics
    ├── src/
    │   ├── error-handler.ts      ← Normalized error translation middleware
    │   ├── error-reporter.ts     ← Error reporting & PII sanitization
    │   ├── events.ts             ← Structured logging event names
    │   ├── logger.ts             ← Pino logger instance with 24-field PII redaction rules
    │   ├── process-handlers.ts   ← Uncaught exception & unhandled rejection handlers
    │   ├── request-timing.ts     ← Request duration tracking utilities
    │   ├── verify.ts             ← Observability verification script (`pnpm verify:infra`)
    │   └── index.ts              ← Logger exports
    ├── package.json
    └── tsconfig.json
```

### 3.4 Documentation Directory (`docs/`)

```text
docs/
├── adr/                          ← Architecture Decision Records
│   ├── 0001-monorepo-architecture.md
│   ├── ...
│   └── 0015-protected-identity-apis-architecture.md
├── api/                          ← Public API Specifications
│   └── protected-identity-api-v1.md← Canonical Protected Identity API v1 Specification
├── phases/                       ← Authoritative Phase Contracts & Architecture Freezes
│   ├── phase0.12-public-auth-ux.md
│   ├── ...
│   └── phase1.12-protected-identity-apis.md ← Phase 1.12 Protected Identity APIs Freeze
├── BACKLOG.md                    ← Product backlog & future phase items
├── CONTEXT.md                    ← Active milestone tracker & phase history
├── ENGINEERING_PLAYBOOK.md       ← Monorepo development guidelines & rules
├── FOLDER_STRUCTURE.md           ← Authoritative repository directory reference (This File)
├── ROADMAP.md                    ← Versioned milestone roadmap (Phase 0 through Phase 7)
├── dadd.md                       ← Database & API Design Document
├── sdd.md                        ├── System Design Document
└── srs.md                        └── Software Requirements Specification
```

---

## 4. Summary Matrix of Workspace Packages

| Package / App | Category | Purpose | Core Tech Stack |
|---|---|---|---|
| `@coaching-os/web` | Application | Presentation UI & API Route Handlers | Next.js 16, React 19, Vanilla CSS (CSS Variables) |
| `@coaching-os/identity` | Package | Multi-tenant Identity, Memberships, RBAC, Parents & Students | TypeScript, Zod, Vitest |
| `@coaching-os/academics` | Package | Batches, Schedules, Attendance, Homework | TypeScript, Zod |
| `@coaching-os/billing` | Package | Fees, Invoices, Receipts, Payments | TypeScript, Zod |
| `@coaching-os/shared` | Package | Error Taxonomy, Result Helpers & Common Types | TypeScript |
| `@coaching-os/ui` | Package | Design System Tokens & Primitive Components | Vanilla CSS Tokens, React 19 |
| `@coaching-os/database` | Infrastructure | Prisma ORM 7, PostgreSQL Client Adapter | Prisma 7, pg.Pool, `@prisma/adapter-pg` |
| `@coaching-os/auth` | Infrastructure | Better Auth Session & Membership Adapter | Better Auth 1.6, Web Crypto |
| `@coaching-os/observability` | Infrastructure | Pino Logging, PII Redaction & Error Reporting | Pino, Node performance API |
| `@coaching-os/config` | Infrastructure | Environment Variable Schema & Validator | Zod, dotenv |
