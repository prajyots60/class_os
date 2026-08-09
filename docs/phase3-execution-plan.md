# Phase 3 — Execution Plan & Schema Freeze Review

**Product:** CoachingOS  
**Status:** Active  
**Prepared By:** Product & Engineering  
**Audience:** Engineering, Founders

> Product Discovery is over. Architecture is frozen. This document governs how we move from documentation into a production-ready codebase.

---

## Table of Contents

1. [Execution Mode Declaration](#1-execution-mode-declaration)
2. [Current Status](#2-current-status)
3. [Phase 3 Implementation Order](#3-phase-3-implementation-order)
4. [Master ERD Plan](#4-master-erd-plan)
5. [Engineering Constitution](#5-engineering-constitution)
6. [Module Specification Structure](#6-module-specification-structure)
7. [Folder Structure](#7-folder-structure)
8. [Authentication — Open Decisions](#8-authentication--open-decisions)
9. [Schema Freeze Review](#9-schema-freeze-review)
10. [Schema Freeze Verdict](#10-schema-freeze-verdict)
11. [Phase 3 Milestones](#11-phase-3-milestones)

---

## 1. Execution Mode Declaration

**Product Discovery is over.**

| What is over                     | What begins           |
| -------------------------------- | --------------------- |
| "What if we add this feature?"   | Implementation design |
| Redesigning entities             | Freezing schema       |
| Changing workflows speculatively | Writing module specs  |

From this point forward, every technical decision must trace back to the SRS, SDD, or DADD. No new product ideas enter the system without a formal change to those documents first.

> **Rule:** If it isn't in the SRS, it isn't in the codebase.

---

## 2. Current Status

### Phase 1 — Product Discovery ✅ Complete

| Deliverable        | Status  |
| ------------------ | ------- |
| Vision             | ✅ Done |
| ICP                | ✅ Done |
| Product Principles | ✅ Done |
| User Personas      | ✅ Done |
| Business Workflows | ✅ Done |
| MVP Scope          | ✅ Done |
| V1 & V2 Roadmap    | ✅ Done |

### Phase 2 — Architecture ✅ Complete

| Deliverable         | Status  | Document                   |
| ------------------- | ------- | -------------------------- |
| Business Rules      | ✅ Done | SRS                        |
| Domain Model        | ✅ Done | SRS                        |
| ERD (logical)       | ✅ Done | DADD                       |
| Permission Model    | ✅ Done | SDD                        |
| SRS                 | ✅ Done | srs.md                     |
| SDD                 | ✅ Done | sdd.md                     |
| Database Design     | ✅ Done | dadd.md                    |
| API Contract        | ✅ Done | dadd.md                    |
| Parent Identity ADR | ✅ Done | adr-001-parent-identity.md |

### Phase 3 — Implementation Design 🔄 In Progress

See [Phase 3 Milestones](#11-phase-3-milestones).

---

## 3. Phase 3 Implementation Order

Implementation follows this exact sequence. Each step depends on the previous.

```
1. Master ERD (Physical)
        ↓
2. PostgreSQL Schema
        ↓
3. Prisma Models
        ↓
4. Folder Structure
        ↓
5. Auth Architecture (final decisions)
        ↓
6. Module Implementation Order
        ↓
7. REST APIs
        ↓
8. Frontend
```

### Why this order matters

| Step                 | Reason                                                        |
| -------------------- | ------------------------------------------------------------- |
| ERD first            | Architecture is cheap to change. Implementation is expensive. |
| Schema before Prisma | Prisma is generated from the ERD — not designed in Prisma     |
| Auth before modules  | Every module depends on the auth context                      |
| Modules before APIs  | APIs expose module behavior — they don't define it            |
| APIs before frontend | Frontend consumes the contract — doesn't dictate it           |

---

## 4. Master ERD Plan

The Master ERD is not a box-and-arrow diagram.

For every entity we define:

| Field          | Description                              |
| -------------- | ---------------------------------------- |
| Column name    | Exact snake_case name                    |
| Data type      | PostgreSQL type (UUID, VARCHAR, ENUM...) |
| Nullable       | NULL or NOT NULL                         |
| Default value  | Database or application default          |
| Constraints    | UNIQUE, CHECK                            |
| Foreign keys   | FK → table with cascade rule             |
| Indexes        | Which columns, composite or single       |
| Lifecycle      | Entity state transitions                 |
| Business notes | Why this field exists                    |

### Example Entity Specification

```
Student

id              UUID          PK    NOT NULL    DEFAULT gen_random_uuid()
institute_id    UUID          FK    NOT NULL    → institutes(id)
admission_number VARCHAR(50)        NULL
first_name      VARCHAR(100)        NOT NULL
last_name       VARCHAR(100)        NOT NULL
date_of_birth   DATE               NULL
status          ENUM               NOT NULL    DEFAULT 'active'
                                               ('active', 'archived')
created_at      TIMESTAMP          NOT NULL    DEFAULT now()
updated_at      TIMESTAMP          NOT NULL    DEFAULT now()
deleted_at      TIMESTAMP          NULL

Indexes:
  - institute_id
  - (institute_id, status)
  - (first_name, last_name)  ← search

Unique:
  - (institute_id, admission_number) WHERE admission_number IS NOT NULL

Business Notes:
  - Student contains identity only. No fees. No attendance.
  - Operational data lives in Enrollment.
  - Never physically deleted.
```

### Why not jump directly into Prisma

| ERD (Architecture)                  | Prisma (Implementation)       |
| ----------------------------------- | ----------------------------- |
| Cheap to change                     | Expensive to change           |
| Language-agnostic                   | Tied to Node.js ecosystem     |
| Forces explicit constraint thinking | Hides some PostgreSQL details |
| Reviewable by anyone                | Requires Prisma knowledge     |

Once the ERD is frozen, Prisma schema generation becomes nearly mechanical.

---

## 5. Engineering Constitution

A short, permanent set of rules that keeps the codebase consistent as it grows. Every engineer — current and future — must follow these. No exceptions without an ADR.

### EC-001 — Repository Boundary

Never bypass repositories. All database access goes through the repository layer.

### EC-002 — Module Isolation

Never access another module's tables directly. Cross-module data access uses published service interfaces or domain events only.

### EC-003 — Authorization is Mandatory

Every endpoint requires authentication, tenant resolution, and permission evaluation before business logic executes. No exceptions, including internal APIs.

### EC-004 — Tenant Scope is Automatic

Repositories automatically scope every query by `institute_id`. Manual tenant filtering inside business services is prohibited.

### EC-005 — Domain Layer Independence

Business rules live in the domain layer. The domain layer has zero knowledge of HTTP, Prisma, or external APIs.

### EC-006 — No Business Logic in Components

No business logic inside React components or API route handlers. Components render. Handlers route. Business logic belongs in services.

### EC-007 — Migrations for Every Schema Change

Every database change uses a versioned migration file. No manual changes to production schema. Ever.

### EC-008 — Tests for Every Feature

Every new feature must include tests. Business rules get unit tests. Workflows get integration tests. Critical paths get end-to-end tests.

### EC-009 — Audit Sensitive Actions

Every security-sensitive or financially-sensitive action is audited. Audit logs are append-only and never modified.

### EC-010 — Events After Commit

Domain events are published only after a successful transaction commit. Never inside the transaction.

### EC-011 — No Internal IDs in Responses

Never return internal database identifiers unnecessarily in API responses. Use UUIDs for public-facing references.

### EC-012 — No Secrets in Logs

Passwords, OTPs, API keys, and authentication tokens must never appear in any log — application, audit, or infrastructure.

### EC-013 — Canonical Vocabulary

All code, variables, function names, and documentation must use the canonical vocabulary defined in the SRS. No synonyms, abbreviations, or local naming conventions that conflict with the domain language.

### EC-014 — Soft Delete by Default

Business entities are archived — never hard-deleted — unless the SRS explicitly permits physical deletion for that entity.

### EC-015 — Configuration Over Hardcoding

No business configuration values are hardcoded inside services. All configuration comes from environment variables or the database settings layer.

### EC-016 — Idempotent Workers

All background workers and scheduled jobs must be idempotent. Retrying a job must never produce duplicate business effects.

### EC-017 — Forward-Only Migrations

Migrations are forward-only. Destructive rollbacks require an explicit ADR. Data migrations are separated from schema migrations.

### EC-018 — One Transaction Per Business Operation

A database transaction represents exactly one business operation. Transactions must not span unrelated business concerns or multiple modules.

### EC-019 — External Calls Never Block Responses

External integrations (WhatsApp, SMS, email, storage) are always handled asynchronously via background workers. They never block an HTTP response.

### EC-020 — Feature Flags Before Permissions

Feature flag evaluation occurs before permission evaluation in every request pipeline.

---

## 6. Module Specification Structure

Before implementing any module, a Module Specification is written. Every module spec follows this exact structure.

```
Module Name

Responsibilities     — What this module owns
Does NOT Own         — Explicit exclusions
Entities             — Tables owned by this module
Domain Events        — Events published
Repositories         — One per aggregate root
Services             — Application services (use cases)
Public API           — Endpoints exposed
Permissions          — Permission strings required
Background Jobs      — Async work triggered
Future Features      — Deferred capabilities
```

### Modules to specify

| Module         | Priority |
| -------------- | -------- |
| Identity       | 1st      |
| Academics      | 2nd      |
| Finance        | 3rd      |
| Communication  | 4th      |
| Administration | 5th      |

---

## 7. Folder Structure

Monorepo layout — not generic, exactly matching the architecture.

```
apps/
└── web/                        ← Next.js PWA

packages/
├── identity/
│   ├── domain/
│   │   ├── entities/
│   │   ├── value-objects/
│   │   ├── events/
│   │   └── policies/
│   ├── application/
│   │   ├── commands/
│   │   ├── queries/
│   │   ├── services/
│   │   └── dto/
│   ├── infrastructure/
│   │   ├── repository/
│   │   ├── persistence/
│   │   └── integrations/
│   └── presentation/
│       ├── routes/
│       └── validators/
│
├── academics/                  ← Same structure
├── finance/                    ← Same structure
├── communication/              ← Same structure
├── administration/             ← Same structure
│
├── shared/
│   ├── database/               ← Prisma client
│   ├── auth/                   ← Auth helpers
│   ├── errors/                 ← Error types
│   ├── events/                 ← Event bus
│   ├── logging/
│   └── utils/
│
└── ui/                         ← Shared component library
```

Every module has identical internal structure. A contributor working in any module immediately knows where to find everything.

---

## 8. Authentication — Open Decisions

The following authentication decisions are deferred from Phase 2 and must be finalized before module implementation begins.

| Decision                | Options                                 | Notes                                       |
| ----------------------- | --------------------------------------- | ------------------------------------------- |
| Staff login method      | Password vs OTP vs Hybrid               | Daily staff need convenient repeated access |
| Parent session duration | 30 days vs 90 days vs indefinite        | OTP-based — longer sessions reduce friction |
| Permission caching      | In-memory vs Redis vs none              | Relevant at scale — not needed in MVP       |
| Session storage         | HTTP-only cookie vs JWT                 | Cookie preferred for security               |
| Staff invite flow       | Email link vs OTP vs temporary password | Must work before email is confirmed         |
| Parent first-login flow | Auto-create vs explicit onboarding      | What happens when a new phone logs in first |

These are resolved in the Auth Architecture document (Phase 3.5).

---

## 9. Schema Freeze Review

Before writing the first migration, three domains were pressure-tested against real-world scenarios. The goal: find every design flaw before it becomes an expensive migration.

> **Question asked:** Can this business operate for 10 years on this schema?

---

### Review 1 — Identity Domain

#### Q1 — Should Batch own Students?

**Verdict: APPROVED — No change needed**

```
Student → Enrollment → Batch
```

Not `Batch → Students`. Enrollment is the relationship. A student can be enrolled in Physics Morning, then Physics Evening, then a Crash Course — the student record never changes. Only enrollments change.

---

#### Q2 — Should Student store current batch?

**Verdict: APPROVED — No change needed**

A student may be enrolled in Physics, Maths, Chemistry, and English simultaneously. Storing `current_batch` on Student is impossible. Batch context always comes through Enrollment.

---

#### Q3 — Should Parent own Student?

**Verdict: APPROVED — No change needed**

A student may have a mother, father, and guardian — all linked. The many-to-many `institute_parent_students` join table handles this correctly.

---

#### Q4 — Can one parent belong to multiple institutes?

**Verdict: REDESIGNED — See ADR-001**

The original single-layer parent model was insufficient. The final model separates global identity from institute membership:

```
ParentIdentity (phone — global)
      ↓
InstituteMembership
      ↓
InstituteParent (tenant-scoped)
      ↓
institute_parent_students
      ↓
Student
```

One OTP login. One Parent Hub. Multiple institutes. No duplicate authentication. Full tenant isolation.

---

#### Q5 — Should Student also become global?

**Verdict: APPROVED — Student stays institute-scoped**

Each institute manages its own roll numbers, attendance, fees, marks, and batch assignments. A global student would make ownership and privacy fundamentally harder. Parent identity is global. Student is not.

---

#### Q6 — Should User become global (cross-institute)?

**Verdict: APPROVED — User stays institute-scoped for MVP**

Teachers don't need cross-institute identity in MVP. If a teacher teaches at two institutes in the future, the same `ParentIdentity`-style membership model can be introduced. Don't optimize for this now.

---

### Identity Domain — Freeze Scorecard

| Entity     | Status                             |
| ---------- | ---------------------------------- |
| Student    | ✅ Frozen                          |
| Batch      | ✅ Frozen                          |
| Enrollment | ✅ Frozen                          |
| User       | ✅ Frozen                          |
| Subject    | ✅ Frozen                          |
| Parent     | ✅ Frozen (redesigned per ADR-001) |

---

### Review 2 — Finance Domain

**Pressure-test question:** Can the fee model handle monthly fees, installments, discounts, late joins, and future online payments without schema changes?

#### Fee Plan flexibility

The `fee_plans` table stores billing rules — not invoices. This separation means:

| Scenario               | Handled?                                                        |
| ---------------------- | --------------------------------------------------------------- |
| Monthly fees           | ✅ `type = monthly`                                             |
| One-time fees          | ✅ `type = one_time`                                            |
| Installments           | ✅ `type = installment`                                         |
| Discount on enrollment | ✅ `discount_type` + `discount_value` on Enrollment             |
| Late join (mid-month)  | ✅ Invoice `amount` is set at generation — can reflect pro-rata |
| Partial payment        | ✅ Multiple `payments` per `invoice`                            |
| Future payment gateway | ✅ Add `gateway_reference` to payments — no core schema change  |

**Verdict: APPROVED — Finance schema is sufficiently flexible**

---

### Review 3 — Permissions Domain

**Pressure-test question:** Can fine-grained permissions be implemented cleanly without making the database or UI cumbersome?

#### Permission model

Permissions are atomic strings (e.g. `attendance.create`, `marks.publish`). Roles are templates that bundle permissions. Institutes can override individual permissions per user.

| Scenario                                     | Handled?                                    |
| -------------------------------------------- | ------------------------------------------- |
| Founder has all permissions                  | ✅ Default template                         |
| Teacher can only manage own batch            | ✅ Permission scoping at application layer  |
| Assistant can manage fees but not settings   | ✅ Custom permission set                    |
| Permission added in future without migration | ✅ Permissions are strings — no enum change |
| Permission check is fast                     | ✅ Cached per session at application layer  |

**Verdict: APPROVED — Permission model is clean and extensible**

---

## 10. Schema Freeze Verdict

| Domain      | Result    | Notes                                         |
| ----------- | --------- | --------------------------------------------- |
| Identity    | ✅ Frozen | Parent redesigned per ADR-001                 |
| Academics   | ✅ Frozen | No issues found                               |
| Finance     | ✅ Frozen | Flexible enough for 10-year operation         |
| Permissions | ✅ Frozen | Atomic strings — extensible without migration |

**The schema is ready for Master ERD specification.**

No further domain redesigns are expected. Any future changes require a formal ADR.

---

## 11. Phase 3 Milestones

| Milestone | Deliverable                           | Status  |
| --------- | ------------------------------------- | ------- |
| Phase 3.1 | Master ERD — all entities, all fields | 🔄 Next |
| Phase 3.2 | PostgreSQL Schema                     | Pending |
| Phase 3.3 | Prisma Models                         | Pending |
| Phase 3.4 | Folder Structure                      | Pending |
| Phase 3.5 | Auth Architecture (final decisions)   | Pending |
| Phase 3.6 | Module Specifications (all 5)         | Pending |
| Phase 3.7 | REST API implementation               | Pending |
| Phase 3.8 | Frontend                              | Pending |

---

_Phase 3 Execution Plan — Version 1.0_  
_Schema Freeze Review — Complete_  
_Next: Phase 3.1 — Master ERD_
