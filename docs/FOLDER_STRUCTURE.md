# 📁 CoachingOS Repository Directory Structure

> **Architectural Type**: Modular Monolith  
> **Workspace Manager**: pnpm Workspaces + Turborepo  
> **Framework Boundary**: Strict layered dependency invariants (`Presentation` → `Application` → `Domain` ← `Infrastructure Adapters`)

---

## 1. High-Level Monorepo Overview

```text
coaching-os/
├── apps/                         ← Next.js Web Application & API Route Adapters
│   └── web/                      ← Main Web Portal (App Router, UI Pages, Route Handlers, E2E)
│
├── packages/                     ← Isolated Modular Domain Packages
│   ├── identity/                 ← Institute Tenants, Users, Memberships, Capability RBAC
│   ├── academics/                ← Schedules, Sessions, Batches, Attendance, Homework
│   ├── billing/                  ← Fee Structures, Invoices, Receipts, Payments
│   ├── communication/            ← Announcements, Notifications, WhatsApp Triggers
│   ├── administration/           ← Staff Management & System Configuration
│   ├── audit/                    ← Event Tracking & Audit Logging
│   ├── shared/                   ← Error Taxonomy, Domain Events, Common Utilities
│   └── ui/                       ← Token-Driven UI Primitives (Button, Card, Input, Theme)
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
    ├── adr/                      ├── Architecture Decision Records (ADR 0001 - 0007)
    └── phases/                   └── Phase Contracts (Phase 1.0, 1.3 RBAC, 1.4 Onboarding)
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
│   ├── onboarding.spec.ts        ← Institute Onboarding & Tenant Context flow suite
│   └── rbac.spec.ts              ← Capability-based RBAC browser evaluation tests
├── public/                       ← Static public assets (SVG icons, branding placeholders)
├── src/
│   ├── app/                      ← Next.js 16 App Router structure
│   │   ├── api/                  ← HTTP Route Handler Adapters
│   │   │   ├── auth/             ← Better Auth catch-all route (`/api/auth/[...all]`)
│   │   │   ├── dashboard/        ← Server tenant context handler (`GET /api/dashboard/context`)
│   │   │   ├── health/           ← System baseline health endpoint (`GET /api/health`)
│   │   │   └── onboarding/       ← Institute onboarding endpoint (`POST /api/onboarding/institute`)
│   │   ├── dashboard/            ← Authenticated tenant dashboard page (`page.tsx`)
│   │   ├── onboarding/           ← Institute setup onboarding form page (`page.tsx`)
│   │   ├── error.tsx             ← Global Next.js error boundary
│   │   ├── globals.css           ← Global styles & CSS variables
│   │   ├── layout.tsx            ← Root application layout
│   │   ├── loading.tsx           ← Loading spinner fallback
│   │   ├── not-found.tsx         ← 404 Not Found page
│   │   └── page.tsx              ← Landing page showcase
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
│   ├── application/              ← Application Use Cases
│   │   └── use-cases/
│   │       ├── institute.use-cases.ts      ← Institute CRUD & query orchestration
│   │       ├── membership.use-cases.ts     ← Membership resolution & context builder
│   │       └── onboarding.use-cases.ts     ← Institute onboarding orchestration
│   ├── authorization/            ← Capability-Based RBAC Engine
│   │   ├── authorization-engine.ts         ← Dynamic capability evaluation & guards
│   │   ├── capabilities.ts                 ← Capability taxonomy enum (49 capabilities)
│   │   ├── resource-scope.ts               ← Resource filtering & parent/teacher scopes
│   │   └── role-capabilities.ts            ← Role → Capability map (Owner, Teacher, Assistant, Parent)
│   ├── domain/                   ← Framework-Independent Business Domain
│   │   ├── entities/
│   │   │   ├── institute.entity.ts         ← Institute domain entity & status invariants
│   │   │   └── institute-membership.entity.ts ← Membership domain entity & role invariants
│   │   └── repositories/
│   │       ├── institute.repository.ts     ← Institute persistence interface
│   │       ├── institute-membership.repository.ts ← Membership repository interface
│   │       └── institute-onboarding.repository.ts ← Atomic onboarding unit of work interface
│   ├── infrastructure/           ← Prisma Persistence Implementations
│   │   └── repositories/
│   │       ├── prisma-institute.repository.ts ← PostgreSQL Institute repository
│   │       ├── prisma-institute-membership.repository.ts ← PostgreSQL Membership repository
│   │       ├── prisma-onboard-institute.repository.ts    ← PostgreSQL $transaction atomic bootstrapper
│   │       ├── prisma-rbac-role-capability.repository.ts ← Role-capability resolver adapter
│   │       └── prisma-user.repository.ts   ← PostgreSQL User repository
│   ├── presentation/             ← Presentation Validators
│   │   └── validators/
│   │       ├── institute.validator.ts      ← Institute input schemas (Zod)
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
        ├── components/           ← Reusable UI components (Button, Input, Card, Modal)
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
│   ├── 0002-database-schema-reconciliation.md
│   ├── 0003-async-workflow-engine-strategy.md
│   ├── 0004-testing-database-strategy.md
│   ├── 0005-ci-strategy.md
│   ├── 0006-observability-strategy.md
│   └── 0007-production-deployment-strategy.md
├── phases/                       ← Authoritative Phase Contracts & Architecture Freezes
│   ├── phase1.md                 ← Phase 1.0 Architecture Freeze
│   ├── phase1.3-rbac.md          ← Phase 1.3 Capability-Based RBAC Architecture Freeze
│   └── phase1.4-onboarding.md    ← Phase 1.4 Institute Onboarding Workflow Freeze
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
| `@coaching-os/web` | Application | Presentation UI & API Route Handlers | Next.js 16, React 19, Tailwind CSS v4 |
| `@coaching-os/identity` | Package | Multi-tenant Identity, Memberships & RBAC | TypeScript, Zod, Vitest |
| `@coaching-os/academics` | Package | Batches, Schedules, Attendance, Homework | TypeScript, Zod |
| `@coaching-os/billing` | Package | Fees, Invoices, Receipts, Payments | TypeScript, Zod |
| `@coaching-os/communication` | Package | Announcements & WhatsApp Messaging | TypeScript, Zod |
| `@coaching-os/administration` | Package | System Settings & Staff Administration | TypeScript, Zod |
| `@coaching-os/audit` | Package | Audit Log & Security Tracing Contracts | TypeScript |
| `@coaching-os/shared` | Package | Error Taxonomy, Result Helpers & Common Types | TypeScript |
| `@coaching-os/ui` | Package | Design System Tokens & Primitive Components | Tailwind CSS v4, React 19 |
| `@coaching-os/database` | Infrastructure | Prisma ORM 7, PostgreSQL Client Adapter | Prisma 7, pg.Pool, `@prisma/adapter-pg` |
| `@coaching-os/auth` | Infrastructure | Better Auth Session & Membership Adapter | Better Auth 1.6, Web Crypto |
| `@coaching-os/observability` | Infrastructure | Pino Logging, PII Redaction & Error Reporting | Pino, Node performance API |
| `@coaching-os/config` | Infrastructure | Environment Variable Schema & Validator | Zod, dotenv |
