# 🚀 CoachingOS Milestone Roadmap v1.0

> **Philosophy**
>
> Optimized for a solo founder building a **modular monolith**.
>
> Replaces arbitrary week-based estimates with milestone-based execution gates. Every phase ends with a deployable, functional slice of the product.

---

## Roadmap Overview

```text
Phase 0  → Engineering Foundation
Phase 1  → Identity Module
Phase 2  → Academics Module
Phase 3  → Billing Module
Phase 4  → Communication Module
Phase 5  → Parent PWA
Phase 6  → Staff Dashboard Polish
Phase 7  → Production & Beta Readiness
```

---

## Phase 0 — Engineering Foundation

**Goal:** Create the core engineering infrastructure once.

### 1. Repository & Monorepo

- Monorepo setup (Turborepo + pnpm)
- GitHub repository configuration
- Branch strategy (`main`, `develop`, `feature/*`, `fix/*`)
- Conventional commits enforcement
- CI pipeline (linting, typechecks, Vitest)

### 2. Backend Infrastructure

- Next.js 16 (App Router)
- Prisma ORM
- PostgreSQL database integration
- Better Auth wrapper & authentication pipeline
- Zod schema validation
- Async event pipeline contracts (ADR-0003 engine evaluation deferred)
- Pino logging configuration
- Environment variable management

### 3. Frontend Foundation

- Tailwind CSS v4 setup
- shadcn/ui component library
- React Hook Form
- TanStack Query (server state)
- Zustand (UI state only)

### 4. Shared Utilities & Tokens

- Design system tokens
- Theme system (light/dark & institute customization support)
- Lucide React icon set
- Date formatting utilities (`date-fns`)
- Common UI primitives

### Phase 0 Deliverable

```text
Application boots → Authentication works → Database connected → CI passes → Deployment works
```

---

## Phase 1 — Identity Module

**Goal:** Establish foundational business entities, multi-tenancy, and permissions.

### 1. Institute Management

- Create institute tenant
- Institute branding configuration
- Global institute settings

### 2. User & Access Control

- User roles (Owner/Founder, Teacher, Assistant)
- Permission definitions & atomic checks
- Permission middleware & request context resolution

### 3. Parent Identity (Two-Layer Model)

- `ParentIdentity` (Global platform layer)
- `InstituteMembership` & `InstituteParent` (Tenant layer)
- `ChildProfile` (Personal parent organization)

### 4. Student Management

- Student creation & profile management
- `InstituteParentStudent` guardian linking

### 5. Academic Organization Structure

- Subjects
- Batches
- Enrollments (`Student` + `Batch` operational entity)

### Phase 1 Deliverable

```text
Create Institute → Invite Teacher → Create Batch → Create Student → Link Parent → Enroll Student
```

---

## Phase 2 — Academics Module

**Goal:** Support daily offline coaching operations.

### 1. Scheduling & Sessions

- `Schedule` (recurring weekly rules)
- `BatchSession` (generated daily class occurrences)

### 2. Attendance Management

- Manual attendance recording against `BatchSession`
- Attendance statistics & status updates (Present, Absent, Late)
- (RFID device integration deferred to sub-phase)

### 3. Homework Workflow

- Create & publish batch-targeted homework
- File attachment support

### 4. Assessment & Marks

- Create tests (Weekly, Unit, Mock)
- Bulk marks entry & publication

### Phase 2 Deliverable

```text
Teacher opens Today's Session → Record Attendance → Publish Homework → Create Test → Enter & Publish Marks
```

---

## Phase 3 — Billing Module

**Goal:** Manage institute fee contracts, invoicing, payments, and receipts.

### 1. Billing Plans

- Monthly recurring billing
- Installment schedules
- One-time fee structures
- Discount rules (percentage and fixed)

### 2. Invoicing

- Invoice generation from `BillingPlan`
- Status tracking (`pending`, `partial`, `paid`)

### 3. Payments

- Record manual payments (Cash, UPI, Bank Transfer)
- Partial payment handling & balance updates

### 4. Receipts

- Automated receipt generation (1 Payment = 1 Receipt)
- Printable receipt templates with institute branding

### Phase 3 Deliverable

```text
Assistant records fee → Invoice status updates → Receipt generated → Parent sees updated status
```

---

## Phase 4 — Communication Module 🟢 (ACCEPTED & FROZEN)

**Goal:** Event-driven notification pipeline and parent activity updates.

### 1. Announcements

- Institute-wide announcements
- Batch-targeted announcements

### 2. Notification Pipeline

- In-app notification delivery
- Event-driven background queue workers (ADR-0003 engine evaluation)

### 3. WhatsApp Integration

- Automated WhatsApp delivery for critical business events:
  - Attendance (Absent alert)
  - Fees (Due / Payment receipt)
  - Test Marks published
  - Emergency announcements

### 4. Activity Timeline

- Parent chronological feed of child events

### Phase 4 Deliverable

```text
Attendance recorded → Event published → Notification created → WhatsApp queued → Activity visible in timeline
```

---

## Phase 5 — Parent PWA 🟢 (ACCEPTED & FROZEN)

**Goal:** Provide parents with a seamless cross-coaching portal. (Phase 5.12 Accepted & Frozen)

### 1. Authentication

- Mobile phone number + OTP login via `ParentIdentity`

### 2. Child Profiles

- Parent-managed child grouping (`ChildProfile`) spanning multiple coaching institutes via `StudentLink`

### 3. Parent Views

- Today's Activity Dashboard
- Attendance calendar & statistics
- Pending & completed homework
- Published marks & test performance
- Fee status, invoice history, and receipt downloads
- Unified cross-institute timeline

### Phase 5 Deliverable

```text
Parent monitors all children across different coaching institutes in one unified mobile PWA.
```

---

## Phase 6 — Staff Dashboard & UX Polish 🟡 IN EXECUTION (Phase 6.0 ACCEPTED & FROZEN, Phase 6.1 COMPLETED & VERIFIED)

**Goal:** Role-tailored dashboards and administrative refinement. (Phase 6.0 Accepted & Frozen, Phase 6.1 Completed & Verified)

### 1. Role-Specific Dashboards

- **Founder/Owner Dashboard:** Attendance trends, pending fee summary, today's schedule, quick actions.
- **Teacher Dashboard:** Today's classes, pending homework, upcoming tests.
- **Assistant Dashboard:** Daily admissions, fee recording, pending receipts.

### 2. Administrative Tools

- Global search (Students, Batches, Invoices)
- Multi-criteria filtering & data tables (TanStack Table)
- Operational reporting (Attendance reports, fee collection reports)
- Advanced settings UI

### Phase 6 Deliverable

```text
Complete, high-polish SaaS management interface ready for daily institute operations.
```

---

## Phase 7 — Production & Beta Readiness

**Goal:** Hardening, security, monitoring, and launch.

### 1. Performance Optimization

- Database index audit & query optimization (eliminate N+1)
- Route caching & static generation where appropriate
- Client bundle optimization & lazy-loading admin modules

### 2. Security & Hardening

- Rate limiting on sensitive endpoints (Auth, OTP, API routes)
- Comprehensive audit logging for sensitive actions
- Input validation review & CORS / Security headers setup

### 3. Observability & Infrastructure

- Structured logging (Pino) & Error tracking (Sentry)
- Health check endpoints
- Automated database backups & disaster recovery verification
- Vercel + Neon + Cloudflare R2 production deployment

### 4. Beta Onboarding

- Deploy to production domain
- Onboard 3–5 founder-led beta coaching institutes
- Feedback collection & rapid iteration

---

## Validation Gates

Phase progression is governed strictly by operational business validation, not just code completion:

| Gate       | Business Validation Criteria                                              | Status  |
| ---------- | ------------------------------------------------------------------------- | ------- |
| **Gate 1** | Can a coaching institute admit a student end-to-end?                      | Pending |
| **Gate 2** | Can a teacher complete one full day's teaching workflow?                  | Pending |
| **Gate 3** | Can an assistant manage fees, issue receipts, and track pending payments? | Pending |
| **Gate 4** | Can a parent use the mobile PWA without any training?                     | Pending |
| **Gate 5** | Would a coaching owner pay for this operating system?                     | Pending |

---

## Feature Freeze (Pre-Beta Non-Goals)

The following features are explicitly **deferred** until post-beta customer validation:

- Online payment gateway integration
- Study material LMS & video streaming
- AI features or automated reporting
- Multi-branch management
- Payroll & accounting modules
- Marketing automation / CRM tools

---

## Success Criteria for MVP

The MVP is complete when:

- ✅ Owner can onboard their institute in minutes.
- ✅ Teacher can record batch attendance in under **30 seconds**.
- ✅ Assistant can record a fee payment in under **1 minute**.
- ✅ Parent can check today's attendance & activity in under **10 seconds**.
- ✅ Owner no longer requires paper registers or Excel for daily operations.

---

## Day 1 Execution Checklist

1. Initialize Turborepo monorepo with pnpm.
2. Set up Next.js App Router, Tailwind CSS v4, shadcn/ui, Prisma, and PostgreSQL.
3. Configure ESLint, Prettier, Husky, and Conventional Commits.
4. Establish modular package architecture (`apps/web`, `packages/identity`, etc.).
5. Implement authentication pipeline.
6. Begin Phase 1 (Identity Module) implementation.
