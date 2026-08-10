# 🛡️ CoachingOS Senior Staff Engineering Standards

> **Authoritative Agent Instructions & Quality Guidelines**  
> This file defines the non-negotiable engineering standards, architectural rules, security guardrails, and verification constraints for all AI coding agents working on CoachingOS.

---

## 1. Senior Staff Mindset & Engineering Philosophy

1. **Production-Grade Delivery Only**: Write software designed for high availability, enterprise multi-tenancy, and security. Never introduce temporary hacks, inline fallbacks, swallowed exceptions (`try {} catch {}` without logging/rethrowing), or hardcoded dummy values.
2. **Disciplined Scope Control**: Strictly adhere to the current active milestone specified in [docs/CONTEXT.md](file:///home/supra/Desktop/class_os/docs/CONTEXT.md). Do not pre-implement future subphases or introduce unapproved infrastructure dependencies (e.g., Redis, BullMQ, Sentry, Trigger.dev).
3. **Respect Authoritative Specifications**: Always consult authoritative project documentation before making architectural decisions:
   - **[Software Requirements Specification (SRS)](file:///home/supra/Desktop/class_os/docs/srs.md)**
   - **[System Design Document (SDD)](file:///home/supra/Desktop/class_os/docs/sdd.md)**
   - **[Database & API Design Document (DADD)](file:///home/supra/Desktop/class_os/docs/dadd.md)**
   - **[Engineering Playbook](file:///home/supra/Desktop/class_os/docs/ENGINEERING_PLAYBOOK.md)**
   - **[Phase Contracts](file:///home/supra/Desktop/class_os/docs/phases/)**
   - **[Architecture Decision Records (ADRs)](file:///home/supra/Desktop/class_os/docs/adr/)**

---

## 2. Monorepo Architecture & Dependency Boundaries

CoachingOS is structured as a **Modular Monolith** inside a pnpm + Turborepo workspace.

```text
apps/
  web/                     ← Next.js 16 App Router UI & Server Routes

packages/
  identity/                ← Identity, Tenant, User, Parent, Student, Academic Domain
  academics/               ← Schedules, Sessions, Attendance, Homework, Tests Domain
  billing/                 ← Fee Structures, Invoices, Payments, Receipts Domain
  communication/           ← Announcements, Notifications, WhatsApp Domain
  administration/          ← Staff Management & System Config Domain
  audit/                   ← Audit Logging & Event Tracking Domain
  shared/                  ← Error Taxonomy, Result Helpers, Shared Types
  ui/                      ← Token-Driven UI Primitives (Button, Card, Input, Theme)

infrastructure/
  database/                ← Prisma ORM 7, PostgreSQL Client Adapter & Test Factories
  auth/                    ← Better Auth Wrapper, Session & Membership Helpers
  observability/           ← Pino Logger, ErrorReporter, Request Timing & Event Tracing
  config/                  ← Zod-Validated Environment Configuration
```

### Dependency Direction (Non-Negotiable)

```text
Web / Presentation
       ↓
Application / Use Cases
       ↓
Domain Layer
       ↑ (implements interfaces)
Infrastructure Adapters
```

### Domain Layer Isolation Invariants

- The `domain/` directory inside domain packages (`packages/*`) **MUST remain 100% framework-independent**.
- **NEVER** import `PrismaClient`, `@prisma/client`, `Next.js`, `React`, `Better Auth`, `Pino`, or HTTP request/response objects inside `domain/`.
- Domain entities must expose business-oriented methods (`updateDetails`, `archive`, `suspend`) and encapsulate validation invariants.
- **Repository Abstraction**: Repositories must return domain entities (`InstituteEntity`), never raw Prisma models. Domain entities must not leak Prisma types outside `infrastructure/`.

---

## 3. Multi-Tenant Security & Tenant Scoping Rules

1. **Row-Level Scoping**: Every tenant-owned database operation MUST be explicitly scoped by `institute_id` at the repository/use-case layer.
2. **Never Trust Client Input as Authorization**:
   - **NEVER** accept `instituteId`, `userId`, `role`, or `parentIdentityId` passed from browser request bodies, query parameters, or headers as proof of authorization.
   - All tenant authorization MUST be resolved server-side using authenticated session context (`requireSession()`, `requireInstituteMembership()`).
3. **Safe Cross-Tenant Failure Mode**: When a user attempts to access an institute or entity outside their membership, return `AuthorizationError` or `NotFoundError` to prevent resource enumeration attacks.

---

## 4. Code Quality, DRY & Zero Redundancy

1. **Audit Before Reinventing**: Always check existing packages (`@coaching-os/shared`, `@coaching-os/database`, `@coaching-os/observability`, `@coaching-os/auth`) before writing custom helpers or utilities.
2. **Strict TypeScript Settings**:
   - `strict: true` across all packages.
   - Do NOT use `any`. Use generic constraints or `unknown` with type narrowing.
   - Do NOT suppress compiler errors with `@ts-ignore` or `@ts-nocheck`.
3. **Naming & File Conventions**:
   - File names: `kebab-case.ts` (e.g., `institute.entity.ts`, `prisma-institute.repository.ts`).
   - Component names: `PascalCase.tsx`.
   - Utility functions: `camelCase.ts`.
   - Exports: Use explicit barrel exports (`src/index.ts`) in each workspace package.

---

## 5. Database & Prisma Persistence Rules

1. **Schema Authority**: `infrastructure/database/prisma/schema.prisma` is authoritative. Do NOT alter `schema.prisma` without explicit requirement justification and architectural review.
2. **Prisma 7 Drivers**: Use `@prisma/adapter-pg` with `pg.Pool`. Always route CLI migrations via `DIRECT_URL` and app pooled queries via `DATABASE_URL`.
3. **Prisma Error Translation**: Map Prisma error codes at the infrastructure boundary:
   - `P2002` (Unique constraint failure) → `ConflictError`
   - `P2025` (Record not found) → `NotFoundError`
4. **No Schema Drift**: Always run `pnpm db:validate` and `pnpm db:status` to verify migration consistency.

---

## 6. Observability & Security Logging

1. **Pino Logger Abstraction**: Always use logger from `@coaching-os/observability`.
2. **Structured Event Naming**: Follow `domain.action.result` format:
   - `identity.institute.create.success`
   - `identity.institute.update.success`
   - `identity.institute.status_changed`
   - `security.authorization_denied`
3. **Strict PII & Credential Redaction**:
   - **NEVER** log passwords, OTPs, session tokens, auth cookies, database connection strings, or raw request payloads.
4. **Canonical Request Correlation**: Every log statement must include `requestId` generated server-side via `crypto.randomUUID()`. Never trust client-supplied `X-Request-ID` headers.

---

## 7. Testing & Verification Requirements

No code change is complete without passing the verification suite:

1. **Unit Tests**: Framework-independent tests for domain entities, invariants, slug normalization, status transitions, and use case orchestration.
2. **PostgreSQL Integration Tests**: Repository integration tests against real PostgreSQL test database (`TEST_DATABASE_URL`). Zero SQLite mocking.
3. **Tenant Security Tests**: Every tenant-owned repository must have explicit integration tests proving `Institute A` cannot read or mutate `Institute B` data.
4. **Mandatory Pre-Commit Verification Command Suite**:
   ```bash
   pnpm env:check          # Validate environment variables
   pnpm db:validate        # Validate Prisma schema
   pnpm db:health          # Verify PostgreSQL database connection health
   pnpm test               # Run all monorepo unit & integration tests
   pnpm typecheck          # Run TypeScript strict typecheck across all 13 packages
   pnpm lint               # Run ESLint across workspace
   pnpm build              # Run Next.js and package builds
   ```

---

## 8. Commit & Context Update Protocol

1. **Conventional Commits**: Format commit messages as `type(scope): description` (e.g., `feat(identity): establish institute tenant core`).
2. **Update Context Tracker**: After completing a subphase, update `docs/CONTEXT.md` to reflect completed items, verification results, and next active roadmap milestones.
