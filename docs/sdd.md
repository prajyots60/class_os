# System Design Document (SDD)

**Product:** CoachingOS  
**Document Version:** 1.0  
**Status:** Draft  
**Prepared By:** Engineering  
**Audience:** Engineering, Founders, Future Contributors

> This document defines **how CoachingOS is engineered**.
> The SRS defines _what_ to build. This document defines _how_ to build it.

---

## Table of Contents

### Chapter 1 — Architecture Foundation

1. [Purpose](#1-purpose)
2. [Architecture Goals](#2-architecture-goals)
3. [Architectural Principles](#3-architectural-principles)
4. [High-Level Architecture](#4-high-level-architecture)
5. [Context Diagram](#5-context-diagram)
6. [Modular Architecture](#6-modular-architecture)
7. [Dependency Rules](#7-dependency-rules)
8. [Multi-Tenant Architecture](#8-multi-tenant-architecture)
9. [Request Lifecycle](#9-request-lifecycle)
10. [Transaction Strategy](#10-transaction-strategy)
11. [Domain Events](#11-domain-events)
12. [Background Processing](#12-background-processing)
13. [Authentication Architecture](#13-authentication-architecture)
14. [Authorization Model](#14-authorization-model)
15. [Security Architecture](#15-security-architecture)
16. [Failure Handling](#16-failure-handling)
17. [Architecture Decision Records (ADRs)](#17-architecture-decision-records-adrs)
18. [Engineering Quality Standards](#18-engineering-quality-standards)

### Chapter 2 — Engineering Architecture & Development Standards

1. [Purpose](#1-purpose-1)
2. [Engineering Philosophy](#2-engineering-philosophy)
3. [Package Structure](#3-package-structure)
4. [Internal Module Structure](#4-internal-module-structure)
5. [Layer Responsibilities](#5-layer-responsibilities)
6. [Repository Pattern](#6-repository-pattern)
7. [Application Services](#7-application-services)
8. [Domain Services](#8-domain-services)
9. [Transaction Strategy](#9-transaction-strategy)
10. [Event Architecture](#10-event-architecture)
11. [Background Jobs](#11-background-jobs)
12. [Notification Pipeline](#12-notification-pipeline)
13. [Configuration Management](#13-configuration-management)
14. [Feature Flags](#14-feature-flags)
15. [Error Handling](#15-error-handling)
16. [Logging Strategy](#16-logging-strategy)
17. [Observability](#17-observability)
18. [Caching Strategy](#18-caching-strategy)
19. [API Standards](#19-api-standards)
20. [Validation Standards](#20-validation-standards)
21. [Security Standards](#21-security-standards)
22. [File Storage](#22-file-storage)
23. [Coding Standards](#23-coding-standards)
24. [Testing Strategy](#24-testing-strategy)
25. [Code Review Checklist](#25-code-review-checklist)
26. [Engineering Checklist](#26-engineering-checklist)
27. [Future Evolution](#27-future-evolution)
28. [Engineering Constitution](#28-engineering-constitution)

### Chapter 3 — Production Infrastructure, Security & Operations

1. [Purpose](#1-purpose-2)
2. [Production Architecture](#2-production-architecture)
3. [Environment Strategy](#3-environment-strategy)
4. [Configuration Management](#4-configuration-management-1)
5. [Database Strategy](#5-database-strategy)
6. [Storage Strategy](#6-storage-strategy)
7. [Background Processing](#7-background-processing-1)
8. [Scheduled Jobs](#8-scheduled-jobs)
9. [Security Architecture](#9-security-architecture-1)
10. [Data Protection](#10-data-protection)
11. [Transport Security](#11-transport-security)
12. [Input Validation](#12-input-validation-1)
13. [Output Security](#13-output-security)
14. [Audit Logging](#14-audit-logging-1)
15. [Rate Limiting](#15-rate-limiting)
16. [Threat Model](#16-threat-model)
17. [Logging Strategy](#17-logging-strategy-1)
18. [Monitoring](#18-monitoring)
19. [Backups](#19-backups)
20. [Disaster Recovery](#20-disaster-recovery)
21. [Performance Targets](#21-performance-targets)
22. [Scalability Roadmap](#22-scalability-roadmap)
23. [CI/CD Recommendations](#23-cicd-recommendations)
24. [Production Readiness Checklist](#24-production-readiness-checklist)
25. [Final Architecture Decisions](#25-final-architecture-decisions)
26. [Future Architecture](#26-future-architecture)
27. [System Design Completion](#27-system-design-completion)

---

# Chapter 1 — Architecture Foundation

---

## 1. Purpose

This document defines **how CoachingOS is engineered**.

While the SRS defines **what** the system should do, this document defines:

| Concern                 |
| ----------------------- |
| Software architecture   |
| Module boundaries       |
| Security model          |
| Scalability strategy    |
| Deployment architecture |
| Engineering standards   |
| Technical trade-offs    |

This document is the **authoritative engineering reference** for implementation.

---

## 2. Architecture Goals

### AG-001 — Simplicity

The platform should remain understandable by a small engineering team.

Complexity must only be introduced when justified by measurable business needs.

### AG-002 — Scalability

Support thousands of coaching institutes from a single codebase.

Scaling should primarily be horizontal at the application layer rather than by increasing architectural complexity.

### AG-003 — Maintainability

Business logic shall be organized by business capability rather than technical layer.

### AG-004 — Security

Tenant isolation is non-negotiable.

Every request, query, and business operation must be evaluated within the authenticated institute context.

### AG-005 — Reliability

Operations such as attendance and payment recording must succeed independently of external services such as WhatsApp or SMS providers.

### AG-006 — Extensibility

Future modules (Study Material, Multi-Branch, AI Reports) should integrate without major architectural changes.

---

## 3. Architectural Principles

### AP-001 — Business Before Technology

Business rules are the primary design driver.

Technology choices exist to implement business requirements — not the opposite.

### AP-002 — Modular Monolith

The application shall be implemented as a modular monolith.

Each module owns:

- Business logic
- Validation
- Persistence
- Events
- Authorization rules

Modules communicate through well-defined interfaces and domain events.

### AP-003 — Domain Ownership

Every business concept has exactly one owning module.

No duplicate business logic is permitted across modules.

### AP-004 — Explicit Boundaries

Modules may expose services.

They must **never** expose internal persistence implementation.

### AP-005 — Event-Oriented Design

Business actions publish domain events.

Consumers react asynchronously where appropriate.

### AP-006 — Secure by Default

Every endpoint requires:

1. Authentication (where applicable)
2. Tenant resolution
3. Permission evaluation
4. Business validation

...before business logic executes.

---

## 4. High-Level Architecture

```
                   Browser (PWA)
                        │
                  HTTPS / REST API
                        │
        ┌───────────────┴────────────────┐
        │                                │
  Parent Hub API                  Staff API
  (Platform Layer)           (Institute Layer)
  ParentIdentity               Tenant Resolution
  ChildProfile                 Permission Check
        │                                │
        └───────────────┬────────────────┘
                        │
          Permission & Policy Evaluation
                        │
   ┌────────────────────────────────────────┐
   │          Modular Application           │
   │                                        │
   │  Identity (Platform + Institute)       │
   │  Academics                             │
   │  Finance                               │
   │  Communication                         │
   │  Administration                        │
   └────────────────────────────────────────┘
                        │
               PostgreSQL Database
               (Platform tables + Tenant tables)
                        │
     Object Storage          Background Workers
          │                         │
          └──── Notifications / Reports ────┘
```

**Two API surfaces, one application:**

| Surface        | Layer     | Auth Resolves                                             |
| -------------- | --------- | --------------------------------------------------------- |
| Parent Hub API | Platform  | `ParentIdentity` → `InstituteMembership` → `ChildProfile` |
| Staff API      | Institute | Session → `institute_id` → Permission                     |

---

## 5. Context Diagram

### External Actors

| Actor     | Role                                   |
| --------- | -------------------------------------- |
| Founder   | Primary operator and owner             |
| Assistant | Daily operations — admissions and fees |
| Teacher   | Academic operations                    |
| Parent    | Read-only visibility via Parent Portal |
| Student   | Passive — data subject                 |

### External Systems

| System                 | Status   |
| ---------------------- | -------- |
| RFID Attendance Device | MVP      |
| WhatsApp Provider      | Future   |
| SMS Provider           | Optional |
| Object Storage         | MVP      |
| Email Provider         | Future   |
| Payment Gateway        | V2       |

The core application remains the **system of record** for all business data.

---

## 6. Modular Architecture

The platform is divided into bounded business contexts. Each module is a self-contained unit with its own responsibilities.

### Identity Module

> **Updated per ADR-001.** Identity now spans two layers — Platform and Institute.

**Platform Layer (Global — owned by CoachingOS):**

- `ParentIdentity` — global phone-anchored parent record
- `ChildProfile` — parent-created child labels (personal, invisible to institutes)
- `StudentLink` — maps ChildProfile → institute Student
- `InstituteMembership` — links ParentIdentity to an institute

**Institute Layer (Tenant — owned by each institute):**

- Institute
- Users
- `InstituteParent` — tenant-scoped parent record
- Students
- Enrollment

**Does NOT manage:** Attendance, Fees, Homework

---

### Academics Module

**Owns:**

- Subjects
- Batches
- Attendance
- Homework
- Tests
- Marks
- Timetable

---

### Finance Module

**Owns:**

- Fee Plans
- Invoices
- Payment Records
- Receipts

---

### Communication Module

**Owns:**

- Announcements
- Notifications
- Delivery Adapters

---

### Administration Module

**Owns:**

- Branding
- Settings
- Reports
- Permission Templates

---

### Shared Module

Contains **only** cross-cutting concerns.

| Allowed Contents       |
| ---------------------- |
| Database client        |
| Authentication helpers |
| Logging                |
| Utilities              |
| Error types            |
| Common UI primitives   |
| Shared validation      |

> Business logic is **prohibited** inside the Shared module.

---

## 7. Dependency Rules

### Allowed Dependencies

```
Identity   ←   Academics
Identity   ←   Finance
Identity   ←   Communication
Identity   ←   Administration
Shared     ←   All modules
```

### Forbidden Dependencies

| Forbidden Action                                | Reason                    |
| ----------------------------------------------- | ------------------------- |
| Finance directly modifying Academic data        | Violates module ownership |
| Communication directly updating Finance         | Violates module ownership |
| Administration directly changing Academic state | Violates module ownership |

Inter-module interaction must occur through **published interfaces** or **domain events** only.

---

## 8. Multi-Tenant Architecture

### Chosen Strategy

**Shared PostgreSQL database with tenant scoping.**

| Design Decision      | Value                                                       |
| -------------------- | ----------------------------------------------------------- |
| Isolation mechanism  | `institute_id` column on every tenant-owned table           |
| Institute resolution | Server-side only — client never provides institute identity |
| Scope enforcement    | Repository layer — automatic on every query                 |

### Tenant Resolution Flow

```
1. User authenticates
2. Session contains user identity
3. Middleware resolves institute_id
4. Institute context becomes immutable for the request
5. Repository layer automatically scopes every query
```

This pattern eliminates an entire class of cross-tenant data leakage vulnerabilities.

---

## 9. Request Lifecycle

Every authenticated request follows the same pipeline — no exceptions.

```
HTTP Request
      │
Authentication
      │
Tenant Resolution
      │
Permission Evaluation
      │
Input Validation
      │
Business Service
      │
Database Transaction
      │
Publish Domain Events
      │
HTTP Response
      │
Background Processing
```

> External integrations (WhatsApp, SMS) **never** block the HTTP response.

---

## 10. Transaction Strategy

Transactions represent **business operations** — not database convenience.

| Business Operation   | Transaction Boundary                                   |
| -------------------- | ------------------------------------------------------ |
| Student Admission    | Student + Parent Link + Enrollment + Fee Plan (atomic) |
| Attendance Recording | Attendance record (separate transaction)               |
| Payment Recording    | Payment + Invoice update (separate transaction)        |

Transactions should be scoped to the minimum necessary to maintain consistency.

---

## 11. Domain Events

Business events are **immutable facts** published after a successful transaction.

| Event                 | Trigger                                   |
| --------------------- | ----------------------------------------- |
| StudentEnrolled       | Enrollment created and activated          |
| AttendanceRecorded    | Attendance saved for a batch session      |
| HomeworkPublished     | Homework published to a batch             |
| TestCreated           | A test is created for a batch             |
| MarksPublished        | Test results are published                |
| InvoiceGenerated      | Invoice created from a fee plan           |
| PaymentRecorded       | Payment recorded against an invoice       |
| AnnouncementPublished | Announcement published to institute/batch |
| UserInvited           | A staff user is invited to the institute  |

Events enable downstream consumers — notifications, analytics, audit — without coupling modules.

---

## 12. Background Processing

Background workers process **non-critical, non-blocking** operations.

| Operation             | Notes                        |
| --------------------- | ---------------------------- |
| WhatsApp delivery     | Retried on provider failure  |
| SMS delivery          | Optional channel             |
| Receipt generation    | PDF produced asynchronously  |
| Analytics aggregation | Attendance and fee summaries |
| Audit processing      | Append-only write            |
| Scheduled reminders   | Fee due, upcoming tests      |

> Business operations must **never fail** because an external provider is unavailable.

---

## 13. Authentication Architecture

### Staff Authentication

| Property | Value                                                          |
| -------- | -------------------------------------------------------------- |
| Method   | Email + Password (preferred)                                   |
| Future   | OTP (optional addition)                                        |
| Reason   | Staff require convenient repeated access on desktop and mobile |

### Parent Authentication

> **Updated per ADR-001.** Parent authentication now resolves through the two-layer model.

| Property | Value                                                                |
| -------- | -------------------------------------------------------------------- |
| Method   | Mobile Number + OTP                                                  |
| Resolves | `ParentIdentity` (global) → `InstituteMembership` → `ChildProfile`   |
| Reason   | Lowest onboarding friction. One login spans all coaching institutes. |

**Parent Authentication Flow:**

```
Parent enters phone number
      ↓
OTP sent and verified
      ↓
ParentIdentity resolved (or created on first login)
      ↓
InstituteMemberships loaded  → all connected institutes
      ↓
ChildProfiles loaded         → personal child organization
      ↓
Parent Hub shown             → global cross-institute view
      ↓
Parent selects an institute  → Coaching Workspace (tenant-isolated)
```

> A parent logs in **once** and sees all coaching institutes they are connected to. There is no separate login per institute.

### Session Strategy

| Property         | Value                              |
| ---------------- | ---------------------------------- |
| Web storage      | Secure HTTP-only cookies           |
| Session lifetime | Short-lived access sessions        |
| Refresh          | Handled by authentication provider |
| Invalidation     | On logout or credential changes    |

---

## 14. Authorization Model

Authorization is **permission-based**, not role-based alone.

```
Roles are permission templates.
Permissions are atomic capabilities.
```

### Example Permissions

| Permission        | Capability                |
| ----------------- | ------------------------- |
| attendance.create | Record attendance         |
| attendance.update | Edit attendance records   |
| marks.publish     | Publish test results      |
| invoice.create    | Generate invoices         |
| payment.record    | Record payment            |
| branding.update   | Modify institute branding |

### Authorization Pipeline

```
1. User authenticated
2. Tenant resolved
3. Feature enabled for institute?
4. Permission granted to user?
5. Business rule satisfied?
      ↓
   Action proceeds
```

All five gates must pass before any action executes.

---

## 15. Security Architecture

### Security Objectives

| Objective       | Description                                        |
| --------------- | -------------------------------------------------- |
| Confidentiality | Data is only accessible to authorized principals   |
| Integrity       | Data cannot be tampered with undetected            |
| Availability    | System is reliably accessible for daily operations |
| Auditability    | All security-sensitive actions are traceable       |

### Security Principles

| Principle        | Application                                      |
| ---------------- | ------------------------------------------------ |
| Least privilege  | Users have only the permissions they need        |
| Defense in depth | Multiple layers of validation and control        |
| Secure defaults  | Features default to restricted, not open         |
| Fail closed      | Deny on ambiguity — never permit on error        |
| Immutable audit  | Audit logs are append-only and cannot be altered |

### Tenant Isolation

- Every repository automatically scopes queries by `institute_id`.
- Manual filtering inside business logic is **prohibited**.
- The client never provides or influences institute context.

### Input Validation

All incoming requests undergo:

1. Schema validation
2. Type validation
3. Business validation

Unknown fields are rejected where appropriate.

### Output Validation

Responses must **never** expose:

- Password hashes or authentication secrets
- Internal system identifiers unnecessarily
- Another institute's records
- Stack traces or internal error details

### Audit Logging

The following actions are always audited:

| Category       | Actions                                           |
| -------------- | ------------------------------------------------- |
| Identity       | User creation, permission changes, login failures |
| Academics      | Attendance edits, marks publication               |
| Finance        | Payment modifications                             |
| Administration | Branding changes, security-sensitive settings     |

> Audit logs are **append-only**. No record is ever modified or deleted.

---

## 16. Failure Handling

### Business Failures

Domain-specific errors are returned for expected business failures.

| Error                       | Scenario                                |
| --------------------------- | --------------------------------------- |
| `StudentAlreadyEnrolled`    | Duplicate enrollment attempt            |
| `BatchClosed`               | Action attempted on a closed batch      |
| `InvoiceAlreadyPaid`        | Payment recorded against a paid invoice |
| `PermissionDenied`          | User lacks required permission          |
| `AttendanceAlreadyRecorded` | Duplicate attendance submission         |

### Unexpected Failures

- Logged with a correlation identifier for tracing.
- Internal implementation details are **never** exposed to clients.
- Generic error responses are returned to the client.

---

## 17. Architecture Decision Records (ADRs)

### ADR-001 — Modular Monolith

| Field    | Value                                                                                                 |
| -------- | ----------------------------------------------------------------------------------------------------- |
| Decision | Implement as a modular monolith                                                                       |
| Reason   | Simpler operations, easier development for a small team, natural migration path to services if needed |
| Rejected | Microservices — premature complexity for current scale                                                |

---

### ADR-002 — Shared PostgreSQL Database

| Field    | Value                                                                         |
| -------- | ----------------------------------------------------------------------------- |
| Decision | Single shared PostgreSQL database with `institute_id` scoping                 |
| Reason   | Operational simplicity, lower infrastructure cost, easier backups             |
| Rejected | Database-per-tenant (too expensive), Schema-per-tenant (migration complexity) |

---

### ADR-003 — Enrollment as Operational Entity

| Field    | Value                                                                                      |
| -------- | ------------------------------------------------------------------------------------------ |
| Decision | Enrollment is the operational entity — not Student                                         |
| Reason   | Supports multiple batch enrollments, historical records, and per-enrollment fee structures |

---

### ADR-004 — Batch-Centric Academic Model

| Field    | Value                                                                  |
| -------- | ---------------------------------------------------------------------- |
| Decision | All academic operations (attendance, homework, tests) are batch-scoped |
| Reason   | Matches real coaching institute workflows exactly                      |

---

### ADR-005 — Permission-Based Authorization

| Field    | Value                                                                             |
| -------- | --------------------------------------------------------------------------------- |
| Decision | Authorization uses atomic permissions, not hardcoded roles                        |
| Reason   | Avoids rigid role assumptions; supports institute-specific staff responsibilities |

---

### ADR-006 — Two-Layer Parent Identity Architecture

| Field    | Value                                                                                                                                                                                      |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Decision | Separate global `ParentIdentity` (platform layer) from tenant-scoped `InstituteParent`                                                                                                     |
| Reason   | Automatic cross-institute identity matching is unreliable — names differ per institute. Parent controls their own child organization via `ChildProfile`. Institutes remain fully isolated. |
| Rejected | Single global student identity (unreliable auto-merge), fully tenant-scoped parent with no cross-institute view (poor parent UX)                                                           |
| Detail   | See `adr-001-parent-identity.md` for full decision record                                                                                                                                  |

---

## 18. Engineering Quality Standards

Every new feature must satisfy all of the following before being considered complete:

| Standard                    | Requirement                                          |
| --------------------------- | ---------------------------------------------------- |
| Module ownership            | Feature belongs to exactly one module                |
| Business rule documentation | Business rule is documented before implementation    |
| Permission evaluation       | All actions check permissions before executing       |
| Tenant scoping              | Every query is scoped to the authenticated institute |
| Audit consideration         | Sensitive actions are audited                        |
| Domain events               | Events are published where applicable                |
| Tests                       | Feature has appropriate test coverage                |
| Documentation               | SDD is updated if architectural behavior changes     |

---

_Chapter 1 Status: Complete_

_This chapter establishes the architectural foundation for CoachingOS. Subsequent chapters build on these principles without contradicting them._

_Future architectural changes must be recorded as new ADRs rather than silently modifying existing decisions._

---

# Chapter 2 — Engineering Architecture & Development Standards

---

## 1. Purpose

This chapter establishes engineering conventions for CoachingOS.

Its objectives are:

| Objective                                        |
| ------------------------------------------------ |
| Keep the codebase maintainable                   |
| Prevent architectural drift                      |
| Make onboarding future engineers straightforward |
| Ensure consistency across every module           |

Every implementation should follow this document unless an Architecture Decision Record (ADR) explicitly supersedes it.

---

## 2. Engineering Philosophy

### EP-001 — Business First

Business rules are the most important part of the system.

Business logic must never depend on UI implementation.

### EP-002 — Module Ownership

Every feature belongs to exactly one business module.

| Feature    | Owner Module |
| ---------- | ------------ |
| Attendance | Academics    |
| Invoices   | Finance      |
| Students   | Identity     |

Finance never implements attendance logic. Academics never implements fee logic.

### EP-003 — Explicit Dependencies

Dependencies must always point inward.

```
Presentation
      ↓
Application
      ↓
Domain
      ↓
Infrastructure
```

The reverse direction is never permitted.

### EP-004 — Small Components

Prefer many small, focused services over large "God Services".

Avoid classes responsible for unrelated business concerns.

---

## 3. Package Structure

Recommended monorepo workspace layout:

```
apps/
└── web/

packages/
├── identity/
├── academics/
├── finance/
├── communication/
├── administration/
├── shared/
└── ui/
```

Each package in `packages/` is a self-contained business module with its own dependencies and boundaries.

---

## 4. Internal Module Structure

Every module follows the same internal layout.

```
<module>/
│
├── domain/
│   ├── entities/
│   ├── value-objects/
│   ├── events/
│   └── policies/
│
├── application/
│   ├── commands/
│   ├── queries/
│   ├── services/
│   └── dto/
│
├── infrastructure/
│   ├── repository/
│   ├── persistence/
│   └── integrations/
│
└── presentation/
    ├── routes/
    └── validators/
```

This structure creates consistency and predictability across all modules. A contributor working in any module immediately knows where to find business rules, queries, and endpoints.

---

## 5. Layer Responsibilities

### Domain Layer

| Contains          | Does NOT contain     |
| ----------------- | -------------------- |
| Business entities | SQL / Prisma queries |
| Business rules    | HTTP concerns        |
| Domain events     | External API calls   |
| Policies          |                      |
| Value Objects     |                      |

The Domain layer is the most protected layer. It has zero external dependencies.

### Application Layer

Coordinates business use cases.

**Examples:** `RecordAttendance`, `PublishMarks`, `GenerateInvoice`

**Responsibilities:**

- Input validation
- Transaction management
- Calling repositories
- Publishing domain events

### Infrastructure Layer

Responsible for implementation details that can change without affecting business rules.

**Examples:** Prisma, Object Storage, WhatsApp, SMS, Redis, External APIs

### Presentation Layer

**Responsibilities:**

- REST endpoint definitions
- Authentication
- Request validation
- Response mapping

> Business logic must **not** live in the presentation layer.

---

## 6. Repository Pattern

Repositories represent collections of domain entities.

**Example — `AttendanceRepository`**

| Responsibility   |
| ---------------- |
| Find attendance  |
| Save attendance  |
| Query attendance |

Repositories must not contain business decisions. They are data access abstractions only.

---

## 7. Application Services

Application Services orchestrate business workflows.

**Example — `RecordAttendanceService`**

| Step | Action                             |
| ---- | ---------------------------------- |
| 1    | Validate request                   |
| 2    | Verify permissions                 |
| 3    | Start transaction                  |
| 4    | Store attendance via repository    |
| 5    | Publish `AttendanceRecorded` event |

Application Services **coordinate**. They do not own business rules — those live in the Domain layer.

---

## 8. Domain Services

Domain Services contain business logic that does not naturally belong to a single entity.

| Domain Service                   | Responsibility                           |
| -------------------------------- | ---------------------------------------- |
| `AttendancePercentageCalculator` | Compute attendance % for a student/batch |
| `FeeScheduleGenerator`           | Generate invoice schedule from fee plan  |
| `RankCalculator`                 | Compute student rank within a batch      |

Domain Services must remain **deterministic** and **side-effect free** wherever possible.

---

## 9. Transaction Strategy

Every transaction represents exactly one business operation.

| Business Operation   | Transaction Boundary                          |
| -------------------- | --------------------------------------------- |
| Student Admission    | Student + Parent Link + Enrollment + Fee Plan |
| Attendance Recording | Attendance record + Domain Event              |
| Payment Recording    | Payment record + Invoice status update        |

Do not create transactions that span unrelated modules.

---

## 10. Event Architecture

Every important business action produces a Domain Event.

**Example — `AttendanceRecorded`**

| Consumer             | Action                         |
| -------------------- | ------------------------------ |
| Notification Service | Sends absent notification      |
| Analytics            | Updates attendance aggregates  |
| Audit Logger         | Writes audit trail entry       |
| Future integrations  | Extensible without code change |

> Events are published **only after** a successful transaction commit.

---

## 11. Background Jobs

Background workers process slow or external operations that must not block the HTTP response.

| Job                    | Notes                         |
| ---------------------- | ----------------------------- |
| WhatsApp delivery      | Retried on provider failure   |
| SMS delivery           | Optional channel              |
| Receipt PDF generation | Produced asynchronously       |
| Scheduled reminders    | Fee due dates, upcoming tests |
| Analytics aggregation  | Attendance and fee summaries  |

> Background workers must be **idempotent** so retries are always safe.

---

## 12. Notification Pipeline

```
Business Event
      ↓
Notification Builder
      ↓
Channel Resolver
      ↓
Provider (In-App / WhatsApp / SMS)
      ↓
Delivery Log
```

| Channel  | MVP Status |
| -------- | ---------- |
| In-App   | MVP        |
| WhatsApp | Future     |
| SMS      | Optional   |

Adding a new channel (e.g. Email) must not require changes to business logic — only a new provider adapter.

---

## 13. Configuration Management

Configuration is separated into three levels.

### System Configuration

Infrastructure-level settings managed via environment variables.

| Examples         |
| ---------------- |
| Database URL     |
| Storage endpoint |
| Queue URL        |
| API keys         |

### Institute Configuration

Per-institute settings stored in the database.

| Examples                 |
| ------------------------ |
| Branding                 |
| Attendance mode          |
| Notification preferences |

### User Preferences

Per-user settings (minimal in MVP).

| Examples          |
| ----------------- |
| Theme             |
| Language (future) |

> Configuration values must **never** be hardcoded inside business services.

---

## 14. Feature Flags

Feature flags enable or disable capabilities without code changes.

| Flag                | Controls             |
| ------------------- | -------------------- |
| `rfid_attendance`   | RFID attendance mode |
| `homework_module`   | Homework feature     |
| `sms_notifications` | SMS delivery channel |

Feature flag evaluation occurs **before** permission evaluation in the request pipeline.

---

## 15. Error Handling

### Business Errors

Business failures must produce explicit, named domain errors.

| Error                       | Scenario                        |
| --------------------------- | ------------------------------- |
| `StudentAlreadyEnrolled`    | Duplicate enrollment attempted  |
| `BatchClosed`               | Action on a closed batch        |
| `InvoiceNotFound`           | Invoice does not exist          |
| `PermissionDenied`          | User lacks required permission  |
| `AttendanceAlreadyRecorded` | Duplicate attendance submission |

### Unexpected Errors

- Logged with a **correlation ID** for tracing.
- Generic response returned to the client.
- Stack traces are **never** exposed to clients.

---

## 16. Logging Strategy

Three distinct log categories.

### Application Logs

System lifecycle information: startup, shutdown, request handling.

### Audit Logs

Security and business-sensitive events.

| Examples                  |
| ------------------------- |
| Payment modified          |
| Attendance record changed |
| Permission updated        |
| Login failure             |

Audit logs are **append-only** and must never be modified.

### Infrastructure Logs

External system interactions: database queries, storage operations, queue messages, external API calls.

> Structured logging (JSON) is preferred over plain text for all categories.

---

## 17. Observability

The system should expose the following signals for operational visibility.

| Signal                        | Purpose                   |
| ----------------------------- | ------------------------- |
| Request duration              | API performance tracking  |
| Error rate                    | Failure detection         |
| Background job failures       | Worker health             |
| Notification delivery success | Communication reliability |
| Database query latency        | Persistence performance   |

Future metrics may be exported to a dedicated monitoring platform.

---

## 18. Caching Strategy

| Phase  | Strategy                                                     |
| ------ | ------------------------------------------------------------ |
| MVP    | No distributed cache                                         |
| Future | Redis for sessions, rate limiting, expensive reports, queues |

> Caching should solve **measured** bottlenecks, not anticipated ones.

---

## 19. API Standards

Resource-oriented REST APIs.

### URL Conventions

| Method | Example                  | Purpose             |
| ------ | ------------------------ | ------------------- |
| GET    | `/students`              | List students       |
| POST   | `/attendance`            | Record attendance   |
| PATCH  | `/payments/{id}`         | Update payment      |
| GET    | `/batches/{id}/homework` | List batch homework |

### Delete Behaviour

`DELETE` operations should generally **archive** rather than permanently remove data.

Physical deletion is only permitted where explicitly defined in the SRS.

### Response Envelope

API responses follow a consistent envelope structure for predictability across all endpoints.

---

## 20. Validation Standards

Validation occurs in three sequential stages.

| Stage | Type                    | Example                                  |
| ----- | ----------------------- | ---------------------------------------- |
| 1     | Request schema          | Required fields, types, formats          |
| 2     | Business rule           | Student already enrolled, batch closed   |
| 3     | Persistence constraints | Database-level unique and FK constraints |

> Never rely solely on database constraints for business rules. Business validation belongs in the Application or Domain layer.

---

## 21. Security Standards

Every request follows this exact pipeline:

```
Authentication
      ↓
Tenant Resolution
      ↓
Feature Flag Evaluation
      ↓
Permission Check
      ↓
Business Validation
      ↓
Execution
      ↓
Audit
```

### Sensitive Data Rules

The following must **never** appear in logs:

| Sensitive Data |
| -------------- |
| Passwords      |
| OTPs           |
| API secrets    |
| Auth tokens    |

---

## 22. File Storage

| Rule                          | Detail                                         |
| ----------------------------- | ---------------------------------------------- |
| Binary files → Object Storage | Logos, Homework PDFs, Receipt PDFs             |
| Database stores metadata only | File name, path, MIME type, upload timestamp   |
| Access via signed URLs        | Time-limited, authenticated URLs for downloads |

Direct public URLs to storage buckets are not permitted.

---

## 23. Coding Standards

| Standard                                                           |
| ------------------------------------------------------------------ |
| Prefer composition over inheritance                                |
| Keep functions focused on a single responsibility                  |
| Avoid circular dependencies between modules                        |
| Avoid static mutable state                                         |
| Use immutable DTOs where practical                                 |
| Prefer descriptive names over abbreviations                        |
| Name classes and functions using Canonical Vocabulary from the SRS |

---

## 24. Testing Strategy

### Unit Tests

Target the most business-critical code.

| Test Target       |
| ----------------- |
| Business rules    |
| Domain Services   |
| Utility functions |

### Integration Tests

Verify that components work correctly together.

| Test Target           |
| --------------------- |
| Repositories          |
| Application Services  |
| Database interactions |

### End-to-End Tests

Cover critical user-facing workflows.

| Workflow             |
| -------------------- |
| Student Admission    |
| Attendance Recording |
| Fee Recording        |
| Parent Login         |

---

## 25. Code Review Checklist

Every Pull Request must verify all of the following before approval:

| Check                               | Verified |
| ----------------------------------- | -------- |
| Business rule correctly implemented | ☐        |
| Permission enforced                 | ☐        |
| Tenant isolation preserved          | ☐        |
| Input validation complete           | ☐        |
| Tests added                         | ☐        |
| Logging appropriate (no secrets)    | ☐        |
| Documentation updated if required   | ☐        |

---

## 26. Engineering Checklist

Before merging any feature branch:

| Check                                             | Verified |
| ------------------------------------------------- | -------- |
| Module ownership confirmed                        | ☐        |
| No cross-module business logic                    | ☐        |
| Transactions scoped to one business operation     | ☐        |
| Domain events published where required            | ☐        |
| Audit implications reviewed                       | ☐        |
| Security pipeline respected                       | ☐        |
| Performance acceptable for target institute sizes | ☐        |
| Naming consistent with Canonical Vocabulary (SRS) | ☐        |

---

## 27. Future Evolution

The modular monolith is intentionally designed so that individual modules can later become independent services if scale justifies it.

| Principle                                                             |
| --------------------------------------------------------------------- |
| No module assumes it will always execute in the same process          |
| Module boundaries are respected today to enable extraction tomorrow   |
| Future migration paths remain open without premature complexity today |

When a module needs to be extracted, the interfaces and events already define the contract. The work becomes an infrastructure concern, not a business logic rewrite.

---

## 28. Engineering Constitution

A permanent, non-negotiable set of rules that keeps the codebase consistent as it grows. Every engineer — current and future — must follow these without exception. Deviations require a formal ADR.

> The Engineering Constitution is short by design. Twenty rules that prevent the most expensive classes of mistakes.

| Code   | Rule                                   | Detail                                                                                                                                                            |
| ------ | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EC-001 | Repository Boundary                    | Never bypass repositories. All database access goes through the repository layer.                                                                                 |
| EC-002 | Module Isolation                       | Never access another module's tables directly. Cross-module access uses published interfaces or domain events only.                                               |
| EC-003 | Authorization is Mandatory             | Every endpoint requires authentication, tenant resolution, and permission evaluation before business logic executes. No exceptions, including internal APIs.      |
| EC-004 | Tenant Scope is Automatic              | Repositories automatically scope every query by `institute_id`. Manual tenant filtering inside business services is prohibited.                                   |
| EC-005 | Domain Layer Independence              | Business rules live in the domain layer. The domain layer has zero knowledge of HTTP, Prisma, or external APIs.                                                   |
| EC-006 | No Business Logic in Components        | No business logic inside React components or API route handlers. Components render. Handlers route. Business logic belongs in services.                           |
| EC-007 | Migrations for Every Schema Change     | Every database change uses a versioned migration file. No manual changes to production schema. Ever.                                                              |
| EC-008 | Tests for Every Feature                | Every new feature must include tests. Business rules get unit tests. Workflows get integration tests. Critical paths get end-to-end tests.                        |
| EC-009 | Audit Sensitive Actions                | Every security-sensitive or financially-sensitive action is audited. Audit logs are append-only and never modified.                                               |
| EC-010 | Events After Commit                    | Domain events are published only after a successful transaction commit. Never inside the transaction.                                                             |
| EC-011 | No Internal IDs in Responses           | Never return internal database identifiers unnecessarily in API responses. Use UUIDs for public-facing references.                                                |
| EC-012 | No Secrets in Logs                     | Passwords, OTPs, API keys, and authentication tokens must never appear in any log.                                                                                |
| EC-013 | Canonical Vocabulary                   | All code, variables, and documentation must use the canonical vocabulary from the SRS. No local synonyms or abbreviations that conflict with the domain language. |
| EC-014 | Soft Delete by Default                 | Business entities are archived — never hard-deleted — unless the SRS explicitly permits physical deletion for that entity.                                        |
| EC-015 | Configuration Over Hardcoding          | No business configuration values are hardcoded inside services. All configuration comes from environment variables or the database settings layer.                |
| EC-016 | Idempotent Workers                     | All background workers and scheduled jobs must be idempotent. Retrying a job must never produce duplicate business effects.                                       |
| EC-017 | Forward-Only Migrations                | Migrations are forward-only. Destructive rollbacks require an explicit ADR. Data migrations are separated from schema migrations.                                 |
| EC-018 | One Transaction Per Business Operation | A database transaction represents exactly one business operation. Transactions must not span unrelated business concerns or multiple modules.                     |
| EC-019 | External Calls Never Block Responses   | External integrations (WhatsApp, SMS, storage) are always handled asynchronously via background workers. They never block an HTTP response.                       |
| EC-020 | Feature Flags Before Permissions       | Feature flag evaluation occurs before permission evaluation in every request pipeline.                                                                            |

> The full Engineering Constitution with rationale is in `phase3-execution-plan.md`. This table is the authoritative quick-reference.

---

_Chapter 2 Status: Complete_

_This chapter defines how engineering work is organized and implemented. Future contributors must follow these conventions to maintain architectural consistency as the platform evolves._

---

# Chapter 3 — Production Infrastructure, Security & Operations

---

## 1. Purpose

This chapter defines the production architecture and operational standards required to run CoachingOS safely and reliably.

| Focus Area            |
| --------------------- |
| Production deployment |
| Infrastructure        |
| Security              |
| Disaster recovery     |
| Monitoring            |
| Scalability           |
| Production readiness  |

---

## 2. Production Architecture

### Target Architecture

```
                    Internet
                        │
             Cloudflare (DNS / CDN)
                        │
                  HTTPS (TLS)
                        │
        Reverse Proxy / Load Balancer
                        │
           Next.js Application Server
              ┌─────────┴─────────┐
              │                   │
    Background Workers     Scheduled Jobs
              │                   │
              └─────────┬─────────┘
                        │
              PostgreSQL Database
                        │
           Object Storage (R2 / B2)
```

Initial deployment may run on a single server. The architecture supports horizontal scaling later without changes to business logic.

---

## 3. Environment Strategy

Four isolated environments — no secrets shared between them.

| Environment | Database        | Logging | Integrations      | Data              |
| ----------- | --------------- | ------- | ----------------- | ----------------- |
| Development | Local           | Debug   | Mock              | Seed / local      |
| Testing     | Separate DB     | Debug   | Test credentials  | Seeded            |
| Staging     | Production-like | Info    | Safe integrations | Realistic dataset |
| Production  | Hardened        | Error   | Live              | Real — backups on |

> No production secrets may exist in any non-production environment.

---

## 4. Configuration Management

All configuration comes from environment variables or a secure configuration service. Nothing is hardcoded.

### System Configuration

| Example                |
| ---------------------- |
| Database URL           |
| Storage credentials    |
| Authentication secrets |

### External Services

| Example          |
| ---------------- |
| WhatsApp API key |
| SMS provider key |
| Email provider   |

### Application Configuration

| Example            |
| ------------------ |
| Session duration   |
| File upload limits |
| Rate limits        |

> Secrets must **never** be committed to version control.

---

## 5. Database Strategy

### Engine

**PostgreSQL**

| Reason                   |
| ------------------------ |
| Mature and battle-tested |
| ACID compliant           |
| Excellent indexing       |
| Full-text search         |
| Strong ecosystem         |

### Multi-Tenant Strategy

Shared database with `institute_id` scoping on every tenant-owned table.

- Repositories automatically scope all queries.
- Application code must **never** manually append institute filters — the repository layer owns this.

### Primary Keys

Use UUIDs for all external-facing entities.

| Advantage                          |
| ---------------------------------- |
| No predictable sequential IDs      |
| Easier data merging across tenants |
| Better API security                |

### Foreign Keys

Enforce FK constraints at the database level throughout. Application logic alone is not sufficient for referential integrity.

### Soft Deletes

Business entities support archival rather than physical deletion.

| Field        | Purpose                       |
| ------------ | ----------------------------- |
| `deleted_at` | Timestamp of archival         |
| `deleted_by` | User who performed the action |

Historical records remain available for auditing indefinitely.

---

## 6. Storage Strategy

Binary files are stored in object storage. The database stores metadata only.

### File Types

| File Type            | Storage Location |
| -------------------- | ---------------- |
| Institute logos      | Object Storage   |
| Homework attachments | Object Storage   |
| Receipt PDFs         | Object Storage   |

### Metadata Stored in Database

| Field       |
| ----------- |
| File ID     |
| Storage Key |
| MIME Type   |
| Size        |
| Uploaded By |
| Created At  |

> File access must use **short-lived signed URLs**. Direct public bucket URLs are not permitted.

---

## 7. Background Processing

Background jobs execute outside the HTTP request lifecycle and must never block responses.

| Job                     | Notes                        |
| ----------------------- | ---------------------------- |
| WhatsApp delivery       | Retried on provider failure  |
| SMS delivery            | Optional channel             |
| Receipt PDF generation  | Produced asynchronously      |
| Scheduled fee reminders | Triggered by fee due dates   |
| Daily report generation | Attendance and fee summaries |

> Workers must be **idempotent**. Retries must never duplicate business effects.

---

## 8. Scheduled Jobs

| Frequency | Jobs                                      |
| --------- | ----------------------------------------- |
| Daily     | Attendance summary, reminder generation   |
| Weekly    | Report generation                         |
| Monthly   | Fee invoice generation, payment reminders |

> Scheduled jobs must be resumable after failures. Partial runs must not leave data in inconsistent states.

---

## 9. Security Architecture

### Authentication

| Actor  | Method              | Additional Rules                           |
| ------ | ------------------- | ------------------------------------------ |
| Staff  | Email + Password    | Strong password policy, session expiration |
| Parent | Mobile Number + OTP | Short-lived OTP, one-time use              |

### Session Properties

| Property   | Value                              |
| ---------- | ---------------------------------- |
| Storage    | Secure HTTP-only cookies           |
| SameSite   | Strict                             |
| Rotation   | After every authentication event   |
| Expiration | Short-lived with refresh mechanism |

### Authorization Pipeline

```
Authentication
      ↓
Tenant Resolution
      ↓
Feature Flag Evaluation
      ↓
Permission Check
      ↓
Business Rule Validation
      ↓
Execution
```

> Permission checks are mandatory even for internal APIs.

---

## 10. Data Protection

The following data is sensitive and must be handled accordingly:

| Data                  | Rule                                             |
| --------------------- | ------------------------------------------------ |
| Password hashes       | Never logged, never returned to clients          |
| Authentication tokens | Never logged, stored securely                    |
| OTP codes             | Never logged, single-use, short expiry           |
| API secrets           | Never logged, never committed to version control |

Personally identifiable information (PII) must be exposed only when strictly necessary for the operation.

---

## 11. Transport Security

| Rule                                     |
| ---------------------------------------- |
| All communication over HTTPS             |
| HTTP disabled in production              |
| Cookies: Secure + HTTP-only + SameSite   |
| TLS managed via Cloudflare or equivalent |

---

## 12. Input Validation

Every incoming request passes through three sequential stages:

```
Schema Validation (types, required fields, formats)
      ↓
Business Validation (domain rules)
      ↓
Database Constraints (referential integrity)
```

Unknown request fields are rejected where practical. Database constraints are a safety net — not the primary validation mechanism.

---

## 13. Output Security

Responses must **never** include:

| Prohibited Content                            |
| --------------------------------------------- |
| Stack traces                                  |
| Internal error messages                       |
| Database error details                        |
| Secrets or tokens                             |
| Another institute's data                      |
| Internal system identifiers (where avoidable) |

---

## 14. Audit Logging

### Audited Events

| Category       | Events                                         |
| -------------- | ---------------------------------------------- |
| Identity       | User login, login failures, permission changes |
| Academics      | Attendance edits, marks publication            |
| Finance        | Payment modifications                          |
| Administration | Branding updates, settings changes             |

### Audit Record Structure

| Field          | Description              |
| -------------- | ------------------------ |
| `user_id`      | Who performed the action |
| `institute_id` | Which institute          |
| `timestamp`    | When it occurred (UTC)   |
| `action`       | What was done            |
| `entity`       | Which entity type        |
| `entity_id`    | Which specific record    |

> Audit logs are **append-only**. No record is ever modified or deleted.

---

## 15. Rate Limiting

| Endpoint Category | Limit Profile |
| ----------------- | ------------- |
| Authentication    | Strict        |
| Attendance APIs   | Moderate      |
| Parent APIs       | Moderate      |
| File uploads      | Conservative  |
| Public endpoints  | Conservative  |

Rate limits must be configurable per environment and adjustable without code deployment.

---

## 16. Threat Model

| Threat                   | Mitigation                                                 |
| ------------------------ | ---------------------------------------------------------- |
| Cross-tenant data access | Automatic `institute_id` scoping in every repository query |
| Broken authorization     | Central permission evaluation — no bypass paths            |
| Credential theft         | Secure sessions, expiration, HTTP-only cookies             |
| OTP replay attacks       | Short-lived OTPs, single-use verification                  |
| File abuse               | Signed URLs, file size limits, MIME type validation        |
| Denial of Service        | Rate limiting, monitoring, Cloudflare layer                |

---

## 17. Logging Strategy

| Category            | Content                                            | Format                  |
| ------------------- | -------------------------------------------------- | ----------------------- |
| Application Logs    | Business lifecycle events, request handling        | Structured              |
| Infrastructure Logs | DB queries, storage ops, queue, external API calls | Structured              |
| Audit Logs          | Security and business-sensitive mutations          | Structured, append-only |

Every log entry includes a **correlation ID** to trace a request across all layers.

> Sensitive data (passwords, OTPs, secrets, tokens) must **never** appear in any log.

---

## 18. Monitoring

| Layer         | Signals to Monitor                       |
| ------------- | ---------------------------------------- |
| Application   | Response time, error rate                |
| Database      | Slow queries, connection pool usage      |
| Workers       | Failed jobs, retry counts, queue depth   |
| Notifications | Delivery success rate, provider failures |
| Storage       | Upload failures, download failures       |

Alerts should be configured for error rate spikes, worker failures, and slow query thresholds.

---

## 19. Backups

| Asset          | Strategy                                                     |
| -------------- | ------------------------------------------------------------ |
| PostgreSQL     | Automated daily backup + point-in-time recovery if supported |
| Object Storage | Versioning enabled where supported                           |

> Backups must be **periodically tested** by restoring to a non-production environment. An untested backup is not a backup.

---

## 20. Disaster Recovery

### Recovery Priority Order

| Priority | Asset          |
| -------- | -------------- |
| Highest  | Database       |
| Medium   | Uploaded files |
| Lower    | Cached data    |

Recovery procedures must be:

- Documented before production launch
- Periodically validated with practice drills

---

## 21. Performance Targets

| Operation             | Target   |
| --------------------- | -------- |
| Student search        | < 500 ms |
| Attendance submission | < 2 sec  |
| Dashboard load        | < 3 sec  |
| Parent login          | < 5 sec  |

> These targets must be validated using production telemetry — not assumptions.

---

## 22. Scalability Roadmap

### Stage 1 — Early Launch

```
Single application instance
Single PostgreSQL
```

Suitable for early customers. No additional infrastructure needed.

### Stage 2 — Growth

```
Multiple application instances
Shared PostgreSQL
Background workers separated from app
```

### Stage 3 — Scale

```
Read replicas
Redis (sessions, rate limiting, queues)
Dedicated worker cluster
```

### Stage 4 — Selective Extraction

```
Extract high-load modules into independent services
only if justified by operational metrics
```

> Microservices are **not a goal**. Business value is. Each stage requires measured justification before proceeding.

---

## 23. CI/CD Recommendations

### Pipeline Stages

| Stage             | Description                                    |
| ----------------- | ---------------------------------------------- |
| Lint              | Code style and formatting checks               |
| Type Check        | Static type analysis                           |
| Unit Tests        | Business rule verification                     |
| Integration Tests | Repository and service layer verification      |
| Build             | Application compilation                        |
| Security Scan     | Dependency vulnerability scan                  |
| Deploy to Staging | Automated staging deployment                   |
| Smoke Tests       | Critical workflow verification on staging      |
| Manual Approval   | Human gate before production                   |
| Production Deploy | Gated production release with rollback support |

> Production deployments must support **one-step rollback**.

---

## 24. Production Readiness Checklist

### Infrastructure

- [ ] HTTPS enabled with valid certificate
- [ ] Monitoring configured and alerting active
- [ ] Automated backups configured and tested
- [ ] Secrets secured via environment variables or secret manager

### Application

- [ ] Authentication tested end-to-end
- [ ] Authorization tested for all permission levels
- [ ] Tenant isolation verified (no cross-tenant data leakage)
- [ ] Audit logging enabled and verified

### Database

- [ ] Indexes reviewed for common query patterns
- [ ] Foreign key constraints enabled throughout
- [ ] Backup restore tested in non-production environment

### Operations

- [ ] Incident contact documented
- [ ] Deployment process documented
- [ ] Recovery process documented and tested

---

## 25. Final Architecture Decisions

The following decisions are frozen for Version 1. Changes require a formal Architecture Decision Record (ADR).

| Decision                                     |
| -------------------------------------------- |
| Modular Monolith                             |
| Shared PostgreSQL                            |
| Multi-tenant via `institute_id`              |
| Batch-centric academic model                 |
| Enrollment-centric operations                |
| Permission-based authorization               |
| Event-driven business workflows              |
| REST API                                     |
| Background workers for external integrations |
| Object storage for binary files              |
| Responsive PWA                               |
| Coaching domain only                         |

---

## 26. Future Architecture

Potential additions in future versions — each must respect the architectural principles established in this document.

| Feature                     | Release Target |
| --------------------------- | -------------- |
| Payment gateway integration | V2             |
| Multi-branch architecture   | V2             |
| AI insights and reports     | V2             |
| QR code attendance          | V1+            |
| Face recognition            | V2+            |
| Public APIs                 | Future         |
| Webhooks                    | Future         |
| Event streaming             | Future         |

---

## 27. System Design Completion

With Chapters 1–3 complete, the System Design Document is now complete.

This document defines:

| Area                  |
| --------------------- |
| Architecture          |
| Module boundaries     |
| Engineering standards |
| Security model        |
| Infrastructure        |
| Operations            |
| Scalability strategy  |
| Production readiness  |

> **This document is the engineering blueprint for CoachingOS.**
>
> All future implementation must conform to these architectural decisions unless superseded by a documented ADR.

---

_Chapter 3 Status: Complete_

_SDD v1.0 — All chapters complete._
