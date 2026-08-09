# Database & API Design Document (DADD)

**Product:** CoachingOS  
**Document Version:** 1.0  
**Status:** Draft  
**Prepared By:** Engineering  
**Audience:** Backend Engineers, Frontend Engineers, Architects

> This document defines the persistence layer and API contracts for CoachingOS.  
> The SRS defines _what_ to build. The SDD defines _how_ to architect it. This document defines _how to store and expose data_.

---

## Table of Contents

### Chapter 1 — Database Architecture & Domain Model

1. [Purpose](#1-purpose)
2. [Database Design Principles](#2-database-design-principles)
3. [Canonical Entity Relationship](#3-canonical-entity-relationship)
4. [Core Tables](#4-core-tables)
5. [Index Strategy](#5-index-strategy)
6. [Constraints](#6-constraints)
7. [Naming Standards](#7-naming-standards)
8. [API Design Principles](#8-api-design-principles)
9. [API Response Envelope](#9-api-response-envelope)
10. [Pagination Standard](#10-pagination-standard)
11. [Filtering Standard](#11-filtering-standard)

### Chapter 2 — Physical Database Design & Persistence Strategy

1. [Purpose](#1-purpose-1)
2. [Database Conventions](#2-database-conventions)
3. [Entity Groups](#3-entity-groups)
4. [Relationship Rules](#4-relationship-rules)
5. [Lifecycle & Deletion Policy](#5-lifecycle--deletion-policy)
6. [Cascade Policy](#6-cascade-policy)
7. [Enum Definitions](#7-enum-definitions)
8. [Constraints](#8-constraints)
9. [Index Strategy](#9-index-strategy)
10. [Repository Guidelines](#10-repository-guidelines)
11. [Transaction Boundaries](#11-transaction-boundaries)
12. [Migration Strategy](#12-migration-strategy)
13. [Seed Strategy](#13-seed-strategy)
14. [Data Integrity Rules](#14-data-integrity-rules)
15. [Future Schema Compatibility](#15-future-schema-compatibility)
16. [Implementation Checklist](#16-implementation-checklist)

### Chapter 3 — Backend API Contract

1. [Purpose](#1-purpose-2)
2. [API Standards](#2-api-standards)
3. [Standard Response Format](#3-standard-response-format)
4. [HTTP Status Codes](#4-http-status-codes)
5. [Identity APIs](#5-identity-apis)
6. [Academic APIs](#6-academic-apis)
7. [Finance APIs](#7-finance-apis)
8. [Communication APIs](#8-communication-apis)
9. [Parent APIs](#9-parent-apis)
10. [Administration APIs](#10-administration-apis)
11. [RFID Integration](#11-rfid-integration)
12. [File Upload Flow](#12-file-upload-flow)
13. [Pagination](#13-pagination)
14. [Filtering](#14-filtering)
15. [Idempotency](#15-idempotency)
16. [Error Catalog](#16-error-catalog)
17. [Rate Limits](#17-rate-limits)
18. [API Versioning](#18-api-versioning)
19. [Security Requirements](#19-security-requirements)
20. [Implementation Checklist](#20-implementation-checklist)

---

# Chapter 1 — Database Architecture & Domain Model

---

## 1. Purpose

This document defines the persistence layer and API contracts for CoachingOS.

| Objective                                  |
| ------------------------------------------ |
| Design a normalized relational database    |
| Preserve business rules defined in the SRS |
| Provide a scalable multi-tenant model      |
| Define API standards                       |
| Minimize future schema migrations          |
| Keep implementation independent from UI    |

This document is the primary reference for implementing PostgreSQL, Prisma, REST APIs, and future integrations.

---

## 2. Database Design Principles

### DB-001 — Tenant Isolation

Every business-owned table contains `institute_id`.

| Rule                                                           |
| -------------------------------------------------------------- |
| Tenant scoping is mandatory on every query                     |
| Repositories must automatically filter by `institute_id`       |
| Application code must **never** manually append tenant filters |

### DB-002 — Normalization

Target: **Third Normal Form (3NF)**

Avoid duplicated business data across tables.

| Wrong                              | Correct                              |
| ---------------------------------- | ------------------------------------ |
| Student table contains fee amount  | Fee amount belongs to Enrollment     |
| Batch table contains student count | Count derived from Enrollments query |

### DB-003 — Soft Deletes

Business entities are archived rather than physically removed.

| Column       | Purpose                          |
| ------------ | -------------------------------- |
| `deleted_at` | Timestamp of archival            |
| `deleted_by` | User ID who performed the action |

Historical records remain available for auditing and reporting.

### DB-004 — UUID Primary Keys

Every externally exposed entity uses UUID as its primary key.

| Reason                                  |
| --------------------------------------- |
| Non-sequential — harder to enumerate    |
| Safer API surface                       |
| Easier data merging across environments |
| No information leakage through IDs      |

### DB-005 — Auditability

Every important record includes standard audit columns.

| Column       | Required When               |
| ------------ | --------------------------- |
| `created_at` | All tables                  |
| `updated_at` | All tables                  |
| `created_by` | Business entity tables      |
| `updated_by` | Where mutations are audited |

---

## 3. Canonical Entity Relationship

```
PLATFORM LAYER (Global — owned by CoachingOS)
──────────────────────────────────────────────
ParentIdentity
│
├── InstituteMembership → Institute
│
└── ChildProfile
        │
        └── StudentLink → Student (institute-scoped)


INSTITUTE LAYER (Tenant — owned by each institute)
───────────────────────────────────────────────────
Institute
│
├── Users
├── InstituteParents
├── Students
├── Subjects
│      └── Batches
│              ├── Schedule (recurring rule)
│              ├── BatchSession (generated occurrence)
│              │       └── Attendance
│              ├── Homework
│              ├── Tests
│              │       └── Marks
│              ├── Attendance
│              ├── Announcements
│              └── Enrollments
│
└── Settings


Enrollment
│
├── Student
├── Batch
├── FeePlan
│       └── Invoice
│               └── Payment
└── Discount
```

> See ADR-001 for full rationale. The two layers meet only through `StudentLink` — institutes never see `ChildProfile` or `ParentIdentity` directly.

---

## 4. Core Tables

### `institutes`

Represents a coaching institute tenant.

| Column          | Type      | Notes                             |
| --------------- | --------- | --------------------------------- |
| `id`            | UUID      | Primary key                       |
| `name`          | String    | Institute display name            |
| `slug`          | String    | Unique URL-safe identifier        |
| `phone`         | String    | Contact number                    |
| `email`         | String    | Contact email                     |
| `logo_url`      | String    | Object storage reference          |
| `primary_color` | String    | Hex color for branding            |
| `timezone`      | String    | e.g. `Asia/Kolkata`               |
| `status`        | Enum      | `active`, `suspended`, `archived` |
| `created_at`    | Timestamp |                                   |
| `updated_at`    | Timestamp |                                   |

**Relationships:**

```
Institute → Many Users
Institute → Many Students
Institute → Many Parents
Institute → Many Subjects
Institute → Many Batches
```

---

### `users`

Represents internal staff members (Founder, Teacher, Assistant, Reception).

| Column          | Type      | Notes                               |
| --------------- | --------- | ----------------------------------- |
| `id`            | UUID      | Primary key                         |
| `institute_id`  | UUID      | FK → institutes                     |
| `name`          | String    |                                     |
| `phone`         | String    |                                     |
| `email`         | String    | Used for login                      |
| `password_hash` | String    | Nullable — if password auth is used |
| `status`        | Enum      | `active`, `invited`, `suspended`    |
| `created_at`    | Timestamp |                                     |
| `updated_at`    | Timestamp |                                     |
| `deleted_at`    | Timestamp | Soft delete                         |

> Users do not contain permissions directly. Permissions are assigned through role templates and individual overrides.

---

### `parent_identities` _(Platform Layer — Global)_

> **New table per ADR-001.** Global parent record anchored to a phone number. Exists once per phone across all institutes.

| Column       | Type      | Notes                                 |
| ------------ | --------- | ------------------------------------- |
| `id`         | UUID      | Primary key                           |
| `phone`      | String    | Globally unique — the identity anchor |
| `created_at` | Timestamp |                                       |
| `updated_at` | Timestamp |                                       |

**No `institute_id`** — this record is platform-scoped, not tenant-scoped.

---

### `institute_memberships` _(Platform Layer — Global)_

> **New table per ADR-001.** Links a `ParentIdentity` to a specific institute and its tenant-scoped parent record.

| Column                | Type | Notes                                      |
| --------------------- | ---- | ------------------------------------------ |
| `id`                  | UUID | Primary key                                |
| `parent_identity_id`  | UUID | FK → parent_identities                     |
| `institute_id`        | UUID | FK → institutes                            |
| `institute_parent_id` | UUID | FK → institute_parents (the tenant record) |

**Unique constraint:** `(parent_identity_id, institute_id)` — one membership per parent per institute.

---

### `institute_parents` _(Institute Layer — Tenant, formerly `parents`)_

> **Renamed per ADR-001.** This is the tenant-scoped parent record — what the coaching institute creates and manages. Previously named `parents`.

| Column            | Type      | Notes                             |
| ----------------- | --------- | --------------------------------- |
| `id`              | UUID      | Primary key                       |
| `institute_id`    | UUID      | FK → institutes                   |
| `name`            | String    |                                   |
| `primary_phone`   | String    | Contact number for this institute |
| `secondary_phone` | String    | Optional                          |
| `created_at`      | Timestamp |                                   |
| `updated_at`      | Timestamp |                                   |
| `deleted_at`      | Timestamp | Soft delete                       |

**Relationship:** One `InstituteParent` → Many Students (via `institute_parent_students`)

---

### `institute_parent_students` _(Institute Layer — Tenant, formerly `parent_students`)_

> **Renamed per ADR-001.** Tenant-scoped join table linking institute parents to students within the same institute.

| Column                | Type | Notes                                   |
| --------------------- | ---- | --------------------------------------- |
| `institute_parent_id` | UUID | FK → institute_parents                  |
| `student_id`          | UUID | FK → students                           |
| `relation`            | Enum | `mother`, `father`, `guardian`, `other` |

---

### `child_profiles` _(Platform Layer — Personal)_

> **New table per ADR-001.** Parent-created labels for organizing children across institutes. Invisible to institutes.

| Column               | Type      | Notes                                     |
| -------------------- | --------- | ----------------------------------------- |
| `id`                 | UUID      | Primary key                               |
| `parent_identity_id` | UUID      | FK → parent_identities                    |
| `name`               | String    | Parent-chosen label e.g. "Rahul", "Priya" |
| `avatar`             | String    | Optional emoji or image reference         |
| `created_at`         | Timestamp |                                           |
| `updated_at`         | Timestamp |                                           |

**No `institute_id`** — personal, not tenant-scoped. Institutes never read this table.

---

### `student_links` _(Platform Layer — Personal)_

> **New table per ADR-001.** Maps a `ChildProfile` to a specific `Student` record within an institute.

| Column             | Type | Notes                                         |
| ------------------ | ---- | --------------------------------------------- |
| `id`               | UUID | Primary key                                   |
| `child_profile_id` | UUID | FK → child_profiles                           |
| `student_id`       | UUID | FK → students (institute-scoped)              |
| `institute_id`     | UUID | FK → institutes (denormalized for query ease) |

**Unique constraint:** `(child_profile_id, student_id)` — a student can only be linked to one ChildProfile once.

> This is the **only join point** between the platform layer and the institute layer. Institutes never query this table.

Learner identity record. Contains no operational data.

| Column             | Type      | Notes                       |
| ------------------ | --------- | --------------------------- |
| `id`               | UUID      | Primary key                 |
| `institute_id`     | UUID      | FK → institutes             |
| `admission_number` | String    | Optional, institute-defined |
| `first_name`       | String    |                             |
| `last_name`        | String    |                             |
| `date_of_birth`    | Date      | Optional                    |
| `status`           | Enum      | `active`, `archived`        |
| `created_at`       | Timestamp |                             |
| `updated_at`       | Timestamp |                             |
| `deleted_at`       | Timestamp | Soft delete                 |

> Student contains identity only. No fee information. No attendance. Those belong to Enrollment.

---

### `parent_students`

Join table supporting many-to-many parent–student relationships.

| Column       | Type | Notes                                   |
| ------------ | ---- | --------------------------------------- |
| `parent_id`  | UUID | FK → institute_parents                  |
| `student_id` | UUID | FK → students                           |
| `relation`   | Enum | `mother`, `father`, `guardian`, `other` |

> **Note:** This table is now named `institute_parent_students` in the updated schema (see ADR-001). The columns above reflect the renamed version.

**Supports:**

- One parent linked to multiple children
- One child linked to multiple guardians (mother + father)

---

### `programs`

Optional grouping mechanism. Not required for MVP.

| Column         | Type      | Notes               |
| -------------- | --------- | ------------------- |
| `id`           | UUID      | Primary key         |
| `institute_id` | UUID      | FK → institutes     |
| `name`         | String    | e.g. `11th Science` |
| `created_at`   | Timestamp |                     |

---

### `subjects`

Academic subjects taught by an institute.

| Column         | Type      | Notes                    |
| -------------- | --------- | ------------------------ |
| `id`           | UUID      | Primary key              |
| `institute_id` | UUID      | FK → institutes          |
| `program_id`   | UUID      | FK → programs — nullable |
| `name`         | String    | e.g. `Physics`, `Maths`  |
| `created_at`   | Timestamp |                          |
| `updated_at`   | Timestamp |                          |
| `deleted_at`   | Timestamp | Soft delete              |

**Relationship:** One Subject → Many Batches

---

### `batches`

The operational heart of the system. All academic activity is batch-scoped.

| Column         | Type      | Notes                                               |
| -------------- | --------- | --------------------------------------------------- |
| `id`           | UUID      | Primary key                                         |
| `institute_id` | UUID      | FK → institutes                                     |
| `subject_id`   | UUID      | FK → subjects                                       |
| `teacher_id`   | UUID      | FK → users — nullable                               |
| `name`         | String    | e.g. `Physics Morning Batch`                        |
| `capacity`     | Integer   | Optional max enrollment                             |
| `status`       | Enum      | `draft`, `open`, `running`, `completed`, `archived` |
| `created_at`   | Timestamp |                                                     |
| `updated_at`   | Timestamp |                                                     |
| `deleted_at`   | Timestamp | Soft delete                                         |

**Relationships:**

```
Batch → Homework
Batch → Tests
Batch → Attendance (via Enrollments → BatchSessions)
Batch → Enrollments
Batch → Announcements
Batch → Schedule
Batch → BatchSessions
```

---

### `enrollments`

The operational entity. Represents a student's active participation in a batch.

| Column           | Type      | Notes                                         |
| ---------------- | --------- | --------------------------------------------- |
| `id`             | UUID      | Primary key                                   |
| `institute_id`   | UUID      | FK → institutes                               |
| `student_id`     | UUID      | FK → students                                 |
| `batch_id`       | UUID      | FK → batches                                  |
| `joined_on`      | Date      | Enrollment start date                         |
| `status`         | Enum      | `pending`, `active`, `completed`, `cancelled` |
| `discount_type`  | Enum      | `none`, `percentage`, `fixed` — nullable      |
| `discount_value` | Decimal   | Nullable                                      |
| `created_at`     | Timestamp |                                               |
| `updated_at`     | Timestamp |                                               |

**Relationships:**

```
Enrollment → Fee Plan → Invoices → Payments
Enrollment → Attendance
Enrollment → Marks
```

---

### `attendance`

Attendance record per enrollment per batch session.

> **Updated per domain review.** Attendance now references a `BatchSession` instead of a raw date. This enables session cancellations, extra classes, and richer analytics.

| Column          | Type      | Notes                       |
| --------------- | --------- | --------------------------- |
| `id`            | UUID      | Primary key                 |
| `institute_id`  | UUID      | FK → institutes             |
| `session_id`    | UUID      | FK → batch_sessions         |
| `enrollment_id` | UUID      | FK → enrollments            |
| `status`        | Enum      | `present`, `absent`, `late` |
| `created_at`    | Timestamp |                             |
| `updated_at`    | Timestamp |                             |

**Unique constraint:** `(session_id, enrollment_id)` — one attendance record per student per session.

---

### `homework`

Academic work assigned to an entire batch.

| Column           | Type      | Notes                         |
| ---------------- | --------- | ----------------------------- |
| `id`             | UUID      | Primary key                   |
| `institute_id`   | UUID      | FK → institutes               |
| `batch_id`       | UUID      | FK → batches                  |
| `title`          | String    |                               |
| `description`    | Text      | Nullable                      |
| `attachment_url` | String    | Object storage ref — nullable |
| `published_at`   | Timestamp | Null = draft                  |
| `created_at`     | Timestamp |                               |
| `updated_at`     | Timestamp |                               |

---

### `tests`

Any assessment conducted for a batch.

| Column           | Type      | Notes                                              |
| ---------------- | --------- | -------------------------------------------------- |
| `id`             | UUID      | Primary key                                        |
| `institute_id`   | UUID      | FK → institutes                                    |
| `batch_id`       | UUID      | FK → batches                                       |
| `title`          | String    | e.g. `Unit Test 1`, `Mock Test`                    |
| `maximum_marks`  | Integer   |                                                    |
| `scheduled_date` | Date      | Nullable                                           |
| `status`         | Enum      | `draft`, `scheduled`, `marks_entered`, `published` |
| `created_at`     | Timestamp |                                                    |
| `updated_at`     | Timestamp |                                                    |

---

### `marks`

Score obtained by a student in a test.

| Column           | Type      | Notes            |
| ---------------- | --------- | ---------------- |
| `id`             | UUID      | Primary key      |
| `institute_id`   | UUID      | FK → institutes  |
| `test_id`        | UUID      | FK → tests       |
| `enrollment_id`  | UUID      | FK → enrollments |
| `marks_obtained` | Decimal   |                  |
| `created_at`     | Timestamp |                  |
| `updated_at`     | Timestamp |                  |

**Unique constraint:** `(test_id, enrollment_id)` — one mark entry per student per test.

---

### `schedules`

Recurring weekly rule defining when a batch meets.

> **Renamed from `timetables` per domain review.** A Schedule is the _plan_ — what should happen every week. BatchSession (below) is the _reality_ — what actually happened on a specific date.

| Column        | Type      | Notes                           |
| ------------- | --------- | ------------------------------- |
| `id`          | UUID      | Primary key                     |
| `batch_id`    | UUID      | FK → batches                    |
| `day_of_week` | Enum      | `monday`, `tuesday`, … `sunday` |
| `start_time`  | Time      |                                 |
| `end_time`    | Time      |                                 |
| `teacher_id`  | UUID      | FK → users — nullable           |
| `created_at`  | Timestamp |                                 |

No room scheduling in MVP.

---

### `batch_sessions`

A generated occurrence of a batch class on a specific date.

> **New table per domain review.** Represents a single real or planned class occurrence. Attendance is recorded against a session, not a raw date. Enables cancellations, extra classes, holiday handling, and richer analytics without schema changes.

| Column                  | Type      | Notes                                                 |
| ----------------------- | --------- | ----------------------------------------------------- |
| `id`                    | UUID      | Primary key                                           |
| `institute_id`          | UUID      | FK → institutes                                       |
| `batch_id`              | UUID      | FK → batches                                          |
| `date`                  | Date      | Date of this session                                  |
| `start_time`            | Time      | Nullable — inherits from Schedule if not overridden   |
| `end_time`              | Time      | Nullable — inherits from Schedule if not overridden   |
| `status`                | Enum      | `scheduled`, `completed`, `cancelled`                 |
| `attendance_taken`      | Boolean   | Default false                                         |
| `source`                | Enum      | `manual`, `rfid` — nullable until attendance is taken |
| `substitute_teacher_id` | UUID      | FK → users — nullable                                 |
| `created_at`            | Timestamp |                                                       |
| `updated_at`            | Timestamp |                                                       |

**Future scenarios enabled without schema changes:**

| Scenario             | How it works                               |
| -------------------- | ------------------------------------------ |
| Cancelled class      | `status = cancelled`                       |
| Extra class          | Create new session outside normal schedule |
| Holiday              | `status = cancelled`                       |
| Attendance reopen    | Reopen by session ID                       |
| Substitute teacher   | `substitute_teacher_id` set                |
| QR / RFID attendance | `source` field already present             |

---

### `announcements`

Communication targeted to an institute or a specific batch.

| Column         | Type      | Notes                       |
| -------------- | --------- | --------------------------- |
| `id`           | UUID      | Primary key                 |
| `institute_id` | UUID      | FK → institutes             |
| `batch_id`     | UUID      | FK → batches — **nullable** |
| `title`        | String    |                             |
| `body`         | Text      |                             |
| `published_at` | Timestamp | Null = draft                |
| `created_at`   | Timestamp |                             |
| `updated_at`   | Timestamp |                             |

> `batch_id` nullable = institute-wide announcement. `batch_id` set = batch-specific announcement.

---

### `billing_plans`

Defines the billing agreement for an enrollment. Stores rules — not invoices.

> **Renamed from `fee_plans` per domain review.** "Billing Plan" makes explicit that this entity defines _how invoices are generated_ — the schedule, rules, and agreement. It is the contract. It never changes because of payments.

| Column                          | Type      | Notes                                             |
| ------------------------------- | --------- | ------------------------------------------------- |
| `id`                            | UUID      | Primary key                                       |
| `enrollment_id`                 | UUID      | FK → enrollments                                  |
| `type`                          | Enum      | `monthly`, `one_time`, `installment`              |
| `amount`                        | Decimal   | Base billing amount                               |
| `discount_type`                 | Enum      | `none`, `percentage`, `fixed` — nullable          |
| `discount_value`                | Decimal   | Nullable                                          |
| `billing_start_date`            | Date      | When billing begins — may differ from join date   |
| `first_invoice_amount_override` | Decimal   | Optional override for late-join or pro-rata cases |
| `created_at`                    | Timestamp |                                                   |
| `updated_at`                    | Timestamp |                                                   |

> Discounts live on BillingPlan and are inherited by all generated invoices.  
> Outstanding amount is computed (`invoice.amount - SUM(payments.amount)`), never stored.

---

### `invoices`

A payment request generated from a fee plan.

| Column        | Type      | Notes                        |
| ------------- | --------- | ---------------------------- |
| `id`          | UUID      | Primary key                  |
| `fee_plan_id` | UUID      | FK → billing_plans           |
| `amount`      | Decimal   | Amount due for this invoice  |
| `due_date`    | Date      |                              |
| `status`      | Enum      | `pending`, `partial`, `paid` |
| `created_at`  | Timestamp |                              |
| `updated_at`  | Timestamp |                              |

---

### `payments`

A record of money received against an invoice.

| Column         | Type      | Notes                                 |
| -------------- | --------- | ------------------------------------- |
| `id`           | UUID      | Primary key                           |
| `invoice_id`   | UUID      | FK → invoices                         |
| `amount`       | Decimal   | Amount received in this payment       |
| `payment_mode` | Enum      | `cash`, `upi`, `bank_transfer`        |
| `received_on`  | Date      |                                       |
| `collected_by` | UUID      | FK → users — who recorded the payment |
| `remarks`      | Text      | Nullable                              |
| `created_at`   | Timestamp |                                       |

> Multiple payments may exist per invoice — supports partial payments.

---

### `receipts`

A record of proof of payment. Generated from a Payment — not from an Invoice.

> One Payment → One Receipt. Even if an invoice has multiple payments, each payment gets its own receipt.

| Column           | Type      | Notes                              |
| ---------------- | --------- | ---------------------------------- |
| `id`             | UUID      | Primary key                        |
| `institute_id`   | UUID      | FK → institutes                    |
| `payment_id`     | UUID      | FK → payments — unique             |
| `receipt_number` | String    | Institute-scoped sequential number |
| `generated_at`   | Timestamp |                                    |

**Unique constraint:** `payment_id` — one receipt per payment.

---

### `settings`

Per-institute configuration store.

| Column            | Type      | Notes                    |
| ----------------- | --------- | ------------------------ |
| `id`              | UUID      | Primary key              |
| `institute_id`    | UUID      | FK → institutes — unique |
| `attendance_mode` | Enum      | `manual`, `rfid`         |
| `academic_year`   | String    | e.g. `2025-26`           |
| `notify_absent`   | Boolean   |                          |
| `notify_fee_due`  | Boolean   |                          |
| `updated_at`      | Timestamp |                          |

---

## 5. Index Strategy

### Standard Indexes

Apply to all tenant-scoped queries.

| Column            | Applies To                           |
| ----------------- | ------------------------------------ |
| `institute_id`    | All tenant-owned tables              |
| `student_id`      | `enrollments`, `attendance`, `marks` |
| `enrollment_id`   | `attendance`, `marks`, `fee_plans`   |
| `batch_id`        | `enrollments`, `homework`, `tests`   |
| `attendance_date` | `attendance`                         |
| `due_date`        | `invoices`                           |
| `status`          | `enrollments`, `batches`, `invoices` |

### Composite Indexes

For common multi-column query patterns.

| Index                         | Query It Supports                     |
| ----------------------------- | ------------------------------------- |
| `(institute_id, status)`      | Filter active students / batches      |
| `(institute_id, batch_id)`    | All enrollments in a batch            |
| `(institute_id, created_at)`  | Time-ordered institute data           |
| `(session_id, enrollment_id)` | Unique constraint + attendance lookup |
| `(batch_id, date)`            | Sessions for a batch on a given date  |
| `(test_id, enrollment_id)`    | Unique constraint on marks            |

### Search Indexes

| Column          | Table      | Purpose             |
| --------------- | ---------- | ------------------- |
| `first_name`    | `students` | Student name search |
| `last_name`     | `students` | Student name search |
| `primary_phone` | `parents`  | Parent phone lookup |
| `name`          | `batches`  | Batch name search   |

---

## 6. Constraints

### Unique Constraints

| Constraint                      | Table               | Purpose                                       |
| ------------------------------- | ------------------- | --------------------------------------------- |
| `(institute_id, slug)`          | `institutes`        | Unique institute slug                         |
| `(institute_id, name)`          | `subjects`          | No duplicate subject names per institute      |
| `(institute_id, name)`          | `batches`           | No duplicate batch names per institute        |
| `(primary_phone, institute_id)` | `institute_parents` | One parent record per phone per institute     |
| `(session_id, enrollment_id)`   | `attendance`        | One attendance record per student per session |
| `(test_id, enrollment_id)`      | `marks`             | One mark entry per student per test           |
| `institute_id`                  | `settings`          | One settings record per institute             |
| `payment_id`                    | `receipts`          | One receipt per payment                       |

### Foreign Key Constraints

Every relationship is enforced at the database level. Application logic alone is never sufficient for referential integrity.

---

## 7. Naming Standards

| Element      | Convention           | Example                           |
| ------------ | -------------------- | --------------------------------- |
| Tables       | Plural `snake_case`  | `billing_plans`, `batch_sessions` |
| Columns      | `snake_case`         | `first_name`, `created_at`        |
| Primary Key  | `id`                 | All tables                        |
| Foreign Keys | `entity_id`          | `institute_id`, `batch_id`        |
| Timestamps   | `_at` suffix         | `created_at`, `deleted_at`        |
| Booleans     | `is_` or verb prefix | `is_active`, `notify_absent`      |
| Enum values  | `lowercase_snake`    | `marks_entered`, `bank_transfer`  |

---

## 8. API Design Principles

Resource-oriented REST APIs. HTTP verbs communicate intent.

### URL Conventions

| Method  | URL                        | Action                        |
| ------- | -------------------------- | ----------------------------- |
| `GET`   | `/students`                | List students                 |
| `POST`  | `/students`                | Create student                |
| `GET`   | `/students/{id}`           | Get student detail            |
| `PATCH` | `/students/{id}`           | Update student                |
| `GET`   | `/batches`                 | List batches                  |
| `POST`  | `/batches/{id}/attendance` | Record attendance for a batch |
| `GET`   | `/batches/{id}/homework`   | List homework for a batch     |
| `PATCH` | `/payments/{id}`           | Update payment record         |

### Avoid Action-Based URLs

| Wrong                    | Correct                           |
| ------------------------ | --------------------------------- |
| `POST /createStudent`    | `POST /students`                  |
| `POST /updateAttendance` | `PATCH /attendance/{id}`          |
| `POST /publishMarks`     | `PATCH /tests/{id}/marks/publish` |

### Delete Behaviour

`DELETE` operations archive the record (set `deleted_at`). Physical deletion is only permitted where explicitly defined in the SRS.

---

## 9. API Response Envelope

All responses follow a consistent structure.

### Success Response

```json
{
  "data": {},
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150
  },
  "links": {
    "next": "/students?page=2",
    "prev": null
  }
}
```

### Error Response

```json
{
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "You do not have permission to perform this action."
  }
}
```

> Error `code` values are stable and machine-readable. Messages may be localized. Clients should depend on `code`, not `message`.

### Standard Error Codes

| Code                | HTTP Status | Scenario                               |
| ------------------- | ----------- | -------------------------------------- |
| `UNAUTHORIZED`      | 401         | No valid session                       |
| `PERMISSION_DENIED` | 403         | Authenticated but lacks permission     |
| `NOT_FOUND`         | 404         | Resource does not exist                |
| `VALIDATION_ERROR`  | 422         | Request schema or business rule failed |
| `CONFLICT`          | 409         | Duplicate resource (e.g. attendance)   |
| `INTERNAL_ERROR`    | 500         | Unexpected server error                |

---

## 10. Pagination Standard

All collection endpoints support consistent pagination parameters.

| Parameter | Type    | Default | Description                        |
| --------- | ------- | ------- | ---------------------------------- |
| `page`    | Integer | 1       | Page number                        |
| `limit`   | Integer | 20      | Records per page (max 100)         |
| `sort`    | String  | varies  | Field to sort by e.g. `created_at` |
| `order`   | String  | `desc`  | `asc` or `desc`                    |
| `search`  | String  | —       | Full-text search where supported   |

Future: cursor-based pagination may be introduced for large datasets (e.g. attendance history).

---

## 11. Filtering Standard

Filtering is additive and composable. All filter parameters are optional.

### Example — `GET /students`

| Filter           | Type   | Description                           |
| ---------------- | ------ | ------------------------------------- |
| `batch_id`       | UUID   | Students enrolled in a specific batch |
| `status`         | Enum   | `active`, `archived`                  |
| `search`         | String | Match on name or admission number     |
| `enrolled_after` | Date   | Students enrolled after a given date  |

### Example — `GET /invoices`

| Filter       | Type | Description                   |
| ------------ | ---- | ----------------------------- |
| `status`     | Enum | `pending`, `partial`, `paid`  |
| `due_before` | Date | Invoices due before a date    |
| `batch_id`   | UUID | Invoices for a specific batch |

---

_Chapter 1 Status: Complete_

_This chapter freezes the relational model and database design principles. Implementation — Prisma schema, migrations, repositories — must conform to these definitions._

---

# Chapter 2 — Physical Database Design & Persistence Strategy

---

## 1. Purpose

This chapter converts the logical domain model into a physical relational design.

| Goal                           |
| ------------------------------ |
| Define table structure         |
| Define relationships           |
| Define constraints             |
| Define lifecycle rules         |
| Define migration strategy      |
| Define persistence conventions |

This chapter is intentionally ORM-agnostic, but is designed to map cleanly to **PostgreSQL + Prisma**.

---

## 2. Database Conventions

### Primary Keys

Every business entity uses UUID.

```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
```

| Reason                          |
| ------------------------------- |
| Prevents identifier enumeration |
| Simplifies future integrations  |
| Safe for public-facing APIs     |

### Timestamp Convention

| Column        | Required                  | Generated By           |
| ------------- | ------------------------- | ---------------------- |
| `created_at`  | All tables                | Database / application |
| `updated_at`  | All tables                | Database / application |
| `deleted_at`  | Where soft delete applies | Application            |
| `archived_at` | Where archival applies    | Application            |

> Timestamps must **never** be supplied by the client.

### Tenant Convention

Every tenant-owned table includes `institute_id` as a non-nullable foreign key.

This column is mandatory except for purely system-level tables (e.g. migrations, feature flags).

### Status Convention

Prefer an explicit `status` column over multiple boolean flags.

| Preferred              | Avoid                 |
| ---------------------- | --------------------- |
| `status = 'active'`    | `is_active = true`    |
| `status = 'cancelled'` | `is_cancelled = true` |
| `status = 'completed'` | `is_completed = true` |

A single `status` column makes lifecycle transitions explicit and queryable.

---

## 3. Entity Groups

The database is organized into two layers and five bounded contexts matching the product modules.

> **Updated per ADR-001.** Identity now spans a Platform Layer (global) and an Institute Layer (tenant).

### Platform Layer (Global — owned by CoachingOS)

| Table                   | Purpose                                |
| ----------------------- | -------------------------------------- |
| `parent_identities`     | Global phone-anchored parent records   |
| `institute_memberships` | Links ParentIdentity → Institute       |
| `child_profiles`        | Parent-created child labels (personal) |
| `student_links`         | Maps ChildProfile → institute Student  |

### Identity (Institute Layer — Tenant)

| Table                       |
| --------------------------- |
| `institutes`                |
| `users`                     |
| `institute_parents`         |
| `institute_parent_students` |
| `students`                  |
| `programs`                  |
| `subjects`                  |
| `batches`                   |
| `enrollments`               |

### Academics

| Table            | Notes                                      |
| ---------------- | ------------------------------------------ |
| `schedules`      | Renamed from `timetables` — recurring rule |
| `batch_sessions` | New — generated class occurrence           |
| `attendance`     | Updated — references session, not date     |
| `homework`       |                                            |
| `tests`          |                                            |
| `marks`          |                                            |

### Billing _(formerly Finance)_

| Table           | Notes                           |
| --------------- | ------------------------------- |
| `billing_plans` | Renamed from `fee_plans`        |
| `invoices`      | FK updated to `billing_plan_id` |
| `payments`      |                                 |
| `receipts`      | New — one per payment           |

### Communication

| Table               | Status |
| ------------------- | ------ |
| `announcements`     | MVP    |
| `notifications`     | Future |
| `notification_logs` | Future |

### Administration

| Table           | Status |
| --------------- | ------ |
| `settings`      | MVP    |
| `branding`      | MVP    |
| `audit_logs`    | MVP    |
| `feature_flags` | Future |

---

## 4. Relationship Rules

```
PLATFORM LAYER
──────────────
ParentIdentity  1 → N  InstituteMembership
ParentIdentity  1 → N  ChildProfile
ChildProfile    1 → N  StudentLink
InstituteMembership → Institute (tenant reference)
StudentLink         → Student   (tenant reference)

INSTITUTE LAYER
───────────────
Institute  1 → N  Users
Institute  1 → N  Students
Institute  1 → N  InstituteParents
Institute  1 → N  Subjects
Institute  1 → N  Batches
Institute  1 → N  Announcements

Subject    1 → N  Batches

Batch      1 → N  Enrollments
Batch      1 → N  Homework
Batch      1 → N  Tests
Batch      1 → N  Announcements
Batch      1 → N  Schedules
Batch      1 → N  BatchSessions

BatchSession  1 → N  Attendance

Student    1 → N  Enrollments

InstituteParent  N ↔ N  Student  (via institute_parent_students)

Enrollment 1 → 1  BillingPlan
BillingPlan 1 → N  Invoices
Invoice    1 → N  Payments
Payment    1 → 1  Receipt

Test       1 → N  Marks
```

---

## 5. Lifecycle & Deletion Policy

### Never Physically Delete

The following records must **never** be hard-deleted:

| Entity        | Reason                                       |
| ------------- | -------------------------------------------- |
| `students`    | Historical enrollment and attendance records |
| `parents`     | Linked to active student records             |
| `enrollments` | Fee and attendance history depends on them   |
| `payments`    | Financial audit trail                        |
| `invoices`    | Financial audit trail                        |
| `attendance`  | Academic history                             |
| `marks`       | Academic history                             |

### Archive Instead of Delete

| Entity     | Terminal State |
| ---------- | -------------- |
| Student    | `archived`     |
| Enrollment | `completed`    |
| Batch      | `completed`    |
| Institute  | `inactive`     |

### Safe to Physically Delete

Temporary objects with no historical value may be hard-deleted:

| Object               | Condition       |
| -------------------- | --------------- |
| Draft announcements  | Never published |
| Unpublished homework | Never published |

---

## 6. Cascade Policy

Avoid aggressive cascade deletes. Use explicit archival workflows instead.

| Action                | Preferred Behaviour                               |
| --------------------- | ------------------------------------------------- |
| Institute deactivated | Background archival policy — not `DELETE CASCADE` |
| Parent removed        | Archive — never delete                            |
| Student removed       | Archive — never delete                            |
| Enrollment cancelled  | Set `status = cancelled` — never delete           |
| Invoice disputed      | Flag status — never delete                        |

Relationship integrity is maintained through FK constraints and archival policies, not cascading destructive operations.

---

## 7. Enum Definitions

### User Status

| Value       |
| ----------- |
| `active`    |
| `invited`   |
| `suspended` |

### Batch Status

| Value       |
| ----------- |
| `draft`     |
| `open`      |
| `running`   |
| `completed` |
| `archived`  |

### Enrollment Status

| Value       |
| ----------- |
| `pending`   |
| `active`    |
| `completed` |
| `cancelled` |

### Attendance Status

| Value     |
| --------- |
| `present` |
| `absent`  |
| `late`    |

### Attendance Source

| Value    |
| -------- |
| `manual` |
| `rfid`   |

### Test Status

| Value           |
| --------------- |
| `draft`         |
| `scheduled`     |
| `marks_entered` |
| `published`     |

### Invoice Status

| Value     |
| --------- |
| `pending` |
| `partial` |
| `paid`    |
| `overdue` |

### Payment Mode

| Value           |
| --------------- |
| `cash`          |
| `upi`           |
| `bank_transfer` |

---

## 8. Constraints

### Student

- Belongs to exactly one institute.
- `institute_id` is non-nullable.

### Subject

- Subject names must be unique within an institute.
- `UNIQUE (institute_id, name)`

### Batch

- Batch names must be unique within the same subject.
- `UNIQUE (institute_id, subject_id, name)`

### Enrollment

- One student cannot have two `active` enrollments in the same batch simultaneously.
- Historical `completed` enrollments are permitted.
- Enforced at the application layer with a unique partial index.

```sql
CREATE UNIQUE INDEX unique_active_enrollment
ON enrollments (student_id, batch_id)
WHERE status = 'active';
```

### Attendance

- One attendance record per enrollment per date.
- `UNIQUE (enrollment_id, attendance_date)`

### Marks

- One marks record per test per enrollment.
- `UNIQUE (test_id, enrollment_id)`

### Fee Plan

- Exactly one active fee plan per enrollment.
- Enforced at the application layer.

---

## 9. Index Strategy

### Primary Indexes

| Column         | Tables                               |
| -------------- | ------------------------------------ |
| `institute_id` | All tenant-owned tables              |
| `status`       | `enrollments`, `batches`, `invoices` |
| `created_at`   | All business tables                  |

### Composite Indexes

| Index                              | Purpose                                |
| ---------------------------------- | -------------------------------------- |
| `(institute_id, status)`           | Filter active records per institute    |
| `(batch_id, status)`               | Active enrollments in a batch          |
| `(student_id, status)`             | Active enrollments for a student       |
| `(attendance_date, batch_id)`      | Daily attendance view for a batch      |
| `(enrollment_id, attendance_date)` | Unique constraint + date range queries |
| `(test_id, enrollment_id)`         | Unique constraint + marks lookup       |

### Search Indexes

| Column                    | Table      | Purpose                 |
| ------------------------- | ---------- | ----------------------- |
| `first_name`, `last_name` | `students` | Student name search     |
| `primary_phone`           | `parents`  | Parent phone lookup     |
| `due_date`                | `invoices` | Overdue invoice queries |

---

## 10. Repository Guidelines

One repository per aggregate root.

| Repository             | Aggregate  |
| ---------------------- | ---------- |
| `StudentRepository`    | Student    |
| `EnrollmentRepository` | Enrollment |
| `AttendanceRepository` | Attendance |
| `InvoiceRepository`    | Invoice    |
| `HomeworkRepository`   | Homework   |
| `TestRepository`       | Test       |

### Method Conventions

Repositories should expose **business-oriented methods**, not generic CRUD.

| Preferred                | Avoid                              |
| ------------------------ | ---------------------------------- |
| `findActiveEnrollment()` | `findById()`                       |
| `recordAttendance()`     | `create()`                         |
| `findOverdueInvoices()`  | `findWhere({ status: 'overdue' })` |
| `getAttendanceSummary()` | `findMany()`                       |

Repositories must never expose internal persistence details (Prisma client, raw SQL) to the application layer.

---

## 11. Transaction Boundaries

Each transaction represents exactly one business operation.

### Admission

```
BEGIN TRANSACTION
  ├── Create Student
  ├── Create or link Parent
  ├── Create parent_students record
  ├── Create Enrollment
  └── Create Fee Plan
COMMIT
→ Publish StudentEnrolled event
```

### Attendance Recording

```
BEGIN TRANSACTION
  └── Create Attendance record
COMMIT
→ Publish AttendanceRecorded event
```

### Marks Entry & Publication

```
BEGIN TRANSACTION
  ├── Upsert Marks records
  └── Update Test status → published
COMMIT
→ Publish MarksPublished event
```

### Payment Recording

```
BEGIN TRANSACTION
  ├── Create Payment record
  └── Update Invoice status (pending → partial → paid)
COMMIT
→ Publish PaymentRecorded event
```

> Events are **always published after** a successful `COMMIT` — never inside the transaction.

---

## 12. Migration Strategy

### Rules

| Rule                                                                                  |
| ------------------------------------------------------------------------------------- |
| Never modify production schema manually                                               |
| Every schema change uses a versioned migration file                                   |
| Forward-only migrations preferred — avoid destructive rollbacks                       |
| Data migrations are separated from schema migrations where possible                   |
| Each migration is atomic — partial migrations must not leave the DB in a broken state |

### Naming Convention

```
YYYYMMDD_NNN_description_of_change

Examples:
20260101_001_create_institutes
20260101_002_create_students
20260215_003_add_fee_plan_discount
20260310_004_add_attendance_source_rfid
```

---

## 13. Seed Strategy

| Environment | Strategy                                                                  |
| ----------- | ------------------------------------------------------------------------- |
| Development | Full demo dataset — institute, founder, teachers, students, batches, fees |
| Testing     | Minimal deterministic dataset — predictable IDs and states for assertions |
| Production  | No automatic seed beyond initial system setup configuration               |

### Development Seed Includes

| Entity              |
| ------------------- |
| Demo Institute      |
| Founder User        |
| Teacher User        |
| Assistant User      |
| Sample Parents      |
| Sample Students     |
| Subjects            |
| Batches             |
| Enrollments         |
| Attendance records  |
| Homework            |
| Tests + Marks       |
| Invoices + Payments |

---

## 14. Data Integrity Rules

The database layer enforces structural integrity. The application layer enforces business logic.

### Database Enforces

| Rule                        |
| --------------------------- |
| Foreign key relationships   |
| Unique constraints          |
| Required (NOT NULL) columns |
| Valid enum values           |

### Application Layer Computes

Business calculations must **not** be stored unless optimization is justified by measurement.

| Calculation             | Computed By                 |
| ----------------------- | --------------------------- |
| Attendance percentage   | Application on read         |
| Outstanding fee balance | Application on read         |
| Student rank in batch   | Application on read         |
| Invoice overdue status  | Application / scheduled job |

---

## 15. Future Schema Compatibility

The schema is designed to accommodate future features without requiring redesign of core tables.

| Future Feature  | Extension Strategy                               |
| --------------- | ------------------------------------------------ |
| Multi-branch    | Add `branch_id` to institutes — nullable in MVP  |
| Payment gateway | Add `gateway_reference` to payments — nullable   |
| Study material  | New `study_materials` table linked to batches    |
| AI insights     | New analytics tables — no changes to core schema |
| QR attendance   | Add `qr` to attendance `source` enum             |
| Webhooks        | New `webhook_subscriptions` table                |
| Public APIs     | Add API key table — no core schema changes       |

> Future features should **extend** existing entities rather than replace them.

---

## 16. Implementation Checklist

Before implementing any table or migration:

| Check                                       | Verified |
| ------------------------------------------- | -------- |
| Owning module identified                    | ☐        |
| Business rules verified against SRS         | ☐        |
| Tenant scope (`institute_id`) included      | ☐        |
| Status lifecycle defined                    | ☐        |
| Constraints reviewed (unique, FK, not null) | ☐        |
| Indexes reviewed for query patterns         | ☐        |
| Audit implications considered               | ☐        |
| Migration file planned and named            | ☐        |

---

_Chapter 2 Status: Complete_

_The persistence model is now frozen. Prisma models, migrations, and repositories must directly implement this design without introducing additional business concepts._

---

# Chapter 3 — Backend API Contract

---

## 1. Purpose

This chapter defines the REST API contract between the frontend and backend.

Every endpoint follows the same principles:

| Principle                      |
| ------------------------------ |
| RESTful resource design        |
| Multi-tenant isolation         |
| Permission-based authorization |
| Consistent response format     |
| Stable error codes             |
| Predictable validation         |

---

## 2. API Standards

### Base URL

```
/api/v1
```

Future breaking changes require a new version prefix (e.g. `/api/v2`). Minor additions remain backward compatible within the same version.

### Content Type

```
Content-Type: application/json
```

File uploads use `multipart/form-data`.

### Authentication

| Surface     | Mechanism        |
| ----------- | ---------------- |
| Staff APIs  | Cookie / Session |
| Parent APIs | Cookie / Session |

> Clients **never** send `institute_id`. Tenant context is always resolved server-side from the authenticated session.

---

## 3. Standard Response Format

### Success Response

```json
{
  "success": true,
  "data": {},
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150
  }
}
```

### Validation Error Response

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request.",
    "details": [{ "field": "name", "message": "Name is required." }]
  }
}
```

### Permission Error Response

```json
{
  "success": false,
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "Permission denied."
  }
}
```

> Error `code` values are stable across versions. Clients must depend on `code`, not `message`.

---

## 4. HTTP Status Codes

| Status | Meaning                 |
| ------ | ----------------------- |
| 200    | Success                 |
| 201    | Created                 |
| 204    | No Content              |
| 400    | Validation Error        |
| 401    | Unauthenticated         |
| 403    | Forbidden               |
| 404    | Not Found               |
| 409    | Conflict                |
| 422    | Business Rule Failed    |
| 429    | Rate Limited            |
| 500    | Unexpected Server Error |

---

## 5. Identity APIs

### Institute

#### `GET /api/v1/institute`

Returns the current authenticated institute's profile.

| Property   | Value               |
| ---------- | ------------------- |
| Permission | Authenticated staff |

#### `PATCH /api/v1/institute`

Updates institute profile and branding.

| Property   | Value             |
| ---------- | ----------------- |
| Permission | `branding.update` |

---

### Students

#### `GET /api/v1/students`

Returns paginated student list.

| Feature       | Supported                 |
| ------------- | ------------------------- |
| Pagination    | Yes                       |
| Search        | By name, admission number |
| Status filter | `active`, `archived`      |
| Batch filter  | By `batch_id`             |

| Property   | Value          |
| ---------- | -------------- |
| Permission | `student.view` |

#### `POST /api/v1/students`

Creates a new student.

| Validation Rule                      |
| ------------------------------------ |
| `name` is required                   |
| Parent must be linked                |
| `institute_id` inferred from session |

| Property   | Value            |
| ---------- | ---------------- |
| Permission | `student.create` |

#### `GET /api/v1/students/{id}`

Returns complete student profile.

**Includes:**

- Parent details
- Enrollments
- Fee summary
- Attendance summary

#### `PATCH /api/v1/students/{id}`

Updates editable student information.

| Property   | Value            |
| ---------- | ---------------- |
| Permission | `student.update` |

#### `DELETE /api/v1/students/{id}`

Archives the student. **Never a physical delete.**

| Property   | Value             |
| ---------- | ----------------- |
| Permission | `student.archive` |

---

### Parents

| Method  | Endpoint        | Action              |
| ------- | --------------- | ------------------- |
| `GET`   | `/parents`      | List parents        |
| `POST`  | `/parents`      | Create parent       |
| `GET`   | `/parents/{id}` | Get parent detail   |
| `PATCH` | `/parents/{id}` | Update contact info |

---

### Subjects

| Method  | Endpoint         | Action         |
| ------- | ---------------- | -------------- |
| `GET`   | `/subjects`      | List subjects  |
| `POST`  | `/subjects`      | Create subject |
| `PATCH` | `/subjects/{id}` | Update subject |

---

### Batches

#### `GET /api/v1/batches`

Returns batch list.

| Filter    | Description            |
| --------- | ---------------------- |
| `subject` | Filter by subject ID   |
| `teacher` | Filter by teacher ID   |
| `status`  | Filter by batch status |

#### `POST /api/v1/batches`

Creates a new batch.

| Validation Rule                    |
| ---------------------------------- |
| Subject must exist                 |
| Name must be unique within subject |

#### `PATCH /api/v1/batches/{id}`

Updates batch details.

#### `GET /api/v1/batches/{id}`

Returns batch detail.

**Includes:**

- Enrolled students
- Timetable
- Assigned teacher
- Summary statistics

---

### Enrollments

#### `POST /api/v1/enrollments`

Creates an enrollment with a fee plan in a single transaction.

| Business Rule                                  |
| ---------------------------------------------- |
| Student must be `active`                       |
| Batch must be `open` or `running`              |
| No duplicate `active` enrollment in same batch |

#### `PATCH /api/v1/enrollments/{id}`

Updates enrollment.

| Editable Fields  |
| ---------------- |
| `status`         |
| `discount_type`  |
| `discount_value` |

---

## 6. Academic APIs

### Attendance

#### `POST /api/v1/attendance`

Records attendance for a batch session.

| Property        | Value                              |
| --------------- | ---------------------------------- |
| Supports        | `manual`, `rfid`                   |
| Validation      | One record per enrollment per date |
| Publishes event | `AttendanceRecorded`               |
| Permission      | `attendance.create`                |

#### `GET /api/v1/attendance`

Returns attendance records.

| Filter       | Description             |
| ------------ | ----------------------- |
| `date`       | Specific date           |
| `batch_id`   | All students in a batch |
| `student_id` | One student's history   |

#### `PATCH /api/v1/attendance/{id}`

Edits an existing attendance record.

| Property        | Value                                  |
| --------------- | -------------------------------------- |
| Restriction     | Only before configured cutoff (future) |
| Publishes event | `AttendanceUpdated`                    |
| Permission      | `attendance.update`                    |

---

### Homework

| Method   | Endpoint         | Notes                             |
| -------- | ---------------- | --------------------------------- |
| `GET`    | `/homework`      | List with batch filter            |
| `POST`   | `/homework`      | Create homework                   |
| `PATCH`  | `/homework/{id}` | Edit before publication           |
| `DELETE` | `/homework/{id}` | Only permitted before publication |

---

### Tests

| Method  | Endpoint              | Action                          |
| ------- | --------------------- | ------------------------------- |
| `POST`  | `/tests`              | Create assessment               |
| `GET`   | `/tests`              | List tests for a batch          |
| `PATCH` | `/tests/{id}`         | Update test details             |
| `POST`  | `/tests/{id}/publish` | Publish test (marks entry open) |

---

### Marks

#### `POST /api/v1/tests/{id}/marks`

Bulk marks entry for all enrolled students.

| Property   | Value          |
| ---------- | -------------- |
| Permission | `marks.create` |

#### `PATCH /api/v1/marks/{id}`

Edit an individual mark.

| Property    | Value                             |
| ----------- | --------------------------------- |
| Restriction | Only permitted before publication |
| Permission  | `marks.update`                    |

#### `POST /api/v1/tests/{id}/publish-results`

Publishes marks to students and parents.

| Property        | Value            |
| --------------- | ---------------- |
| Publishes event | `MarksPublished` |
| Permission      | `marks.publish`  |

---

### Timetable

| Method  | Endpoint          | Action                 |
| ------- | ----------------- | ---------------------- |
| `GET`   | `/timetable`      | List timetable entries |
| `POST`  | `/timetable`      | Create timetable entry |
| `PATCH` | `/timetable/{id}` | Update timetable entry |

---

## 7. Finance APIs

### Fee Plans

| Method  | Endpoint          | Action          |
| ------- | ----------------- | --------------- |
| `GET`   | `/fee-plans`      | List fee plans  |
| `POST`  | `/fee-plans`      | Create fee plan |
| `PATCH` | `/fee-plans/{id}` | Update fee plan |

---

### Invoices

| Method | Endpoint         | Action                     |
| ------ | ---------------- | -------------------------- |
| `GET`  | `/invoices`      | List invoices with filters |
| `POST` | `/invoices`      | Generate invoice manually  |
| `GET`  | `/invoices/{id}` | Get invoice detail         |

---

### Payments

#### `POST /api/v1/payments`

Records a payment against an invoice.

| Validation Rule      |
| -------------------- |
| Invoice must exist   |
| `amount` must be > 0 |

| Property        | Value             |
| --------------- | ----------------- |
| Publishes event | `PaymentRecorded` |
| Permission      | `payment.record`  |

#### `GET /api/v1/payments`

Returns payment records.

| Filter       | Description            |
| ------------ | ---------------------- |
| `date`       | Payment date           |
| `batch_id`   | Payments for a batch   |
| `student_id` | Payments for a student |

---

### Receipts

#### `GET /api/v1/receipts/{id}`

Returns receipt metadata. Download handled via signed URL.

| Property | Value                                  |
| -------- | -------------------------------------- |
| Response | Receipt metadata + signed download URL |

---

## 8. Communication APIs

### Announcements

| Method   | Endpoint              | Notes                               |
| -------- | --------------------- | ----------------------------------- |
| `GET`    | `/announcements`      | List — filter by institute or batch |
| `POST`   | `/announcements`      | Create announcement                 |
| `PATCH`  | `/announcements/{id}` | Edit before publication             |
| `DELETE` | `/announcements/{id}` | Only draft announcements            |

**Targeting:**

| `batch_id` value  | Audience            |
| ----------------- | ------------------- |
| `null`            | Entire institute    |
| Set to batch UUID | Specific batch only |

---

### Notifications

#### `GET /api/v1/notifications`

Returns in-app notifications for the authenticated user.

**Supports:** Read / Unread state management.

| Method  | Endpoint                   | Action             |
| ------- | -------------------------- | ------------------ |
| `GET`   | `/notifications`           | List notifications |
| `PATCH` | `/notifications/{id}/read` | Mark as read       |
| `PATCH` | `/notifications/read-all`  | Mark all as read   |

---

## 9. Parent APIs

> **Updated per ADR-001.** Parent APIs are now split across two surfaces: **Parent Hub** (platform layer, global) and **Coaching Workspace** (institute layer, tenant-isolated).

Parent endpoints expose **only data linked to the authenticated parent's children**. No staff data is ever accessible. Tenant isolation is preserved at all times.

### Parent Hub APIs _(Platform Layer)_

#### `GET /api/v1/parent/hub`

Returns the global parent view — all connected institutes and child profiles.

**Includes:**

- ChildProfiles (Rahul, Priya)
- All connected coaching institutes per child
- Unread notification count per institute
- Pending fee alerts across all institutes

#### `GET /api/v1/parent/profiles`

Returns the parent's ChildProfiles.

#### `POST /api/v1/parent/profiles`

Creates a new ChildProfile.

| Field    | Notes                   |
| -------- | ----------------------- |
| `name`   | Required — e.g. "Rahul" |
| `avatar` | Optional                |

#### `POST /api/v1/parent/profiles/{id}/links`

Links a ChildProfile to a student in an institute.

| Field        | Notes                                                                   |
| ------------ | ----------------------------------------------------------------------- |
| `student_id` | Must be a student linked to this parent via `institute_parent_students` |

#### `GET /api/v1/parent/suggestions`

Returns possible ChildProfile merge suggestions (name + age similarity).

| Rule                                                    |
| ------------------------------------------------------- |
| Suggestions are informational only — never auto-applied |
| Parent must explicitly confirm any link                 |

---

### Coaching Workspace APIs _(Institute Layer — Tenant)_

#### `GET /api/v1/parent/institutes/{institute_id}/dashboard`

Returns a consolidated view for a specific coaching institute.

**Includes:**

- Child's attendance
- Pending homework
- Latest marks
- Pending fee balances
- Recent announcements

---

### Child Profile

#### `GET /api/v1/parent/students/{id}`

Returns the profile of a specific linked child within an institute.

| Rule                                                                  |
| --------------------------------------------------------------------- |
| Parent must be linked to this student via `institute_parent_students` |
| Returns `403` if not linked                                           |

---

### Child-Scoped Endpoints

| Method | Endpoint                           | Returns                     |
| ------ | ---------------------------------- | --------------------------- |
| `GET`  | `/parent/students/{id}/attendance` | Attendance history          |
| `GET`  | `/parent/students/{id}/homework`   | Homework list with status   |
| `GET`  | `/parent/students/{id}/marks`      | Published marks by test     |
| `GET`  | `/parent/students/{id}/fees`       | Invoice and payment history |

All child-scoped endpoints verify parent–student linkage via `institute_parent_students` before returning any data.

---

## 10. Administration APIs

All administration endpoints require elevated permissions.

| Resource             | Endpoints              | Permission Required  |
| -------------------- | ---------------------- | -------------------- |
| Branding             | `GET`, `PATCH`         | `branding.update`    |
| Settings             | `GET`, `PATCH`         | `settings.update`    |
| Reports              | `GET`                  | `reports.view`       |
| Users                | `GET`, `POST`, `PATCH` | `users.manage`       |
| Permission Templates | `GET`, `POST`, `PATCH` | `permissions.manage` |

---

## 11. RFID Integration

### Endpoint

```
POST /api/v1/integrations/rfid/events
```

### Authentication

API Key (device-level, not user session)

### Request Payload

```json
{
  "device_id": "device-uuid",
  "card_id": "rfid-card-identifier",
  "timestamp": "2026-08-08T09:15:00Z"
}
```

### Processing Flow

```
Receive RFID event
      ↓
Validate API key + device
      ↓
Lookup student by card_id
      ↓
Resolve active enrollment
      ↓
Check for duplicate (idempotency)
      ↓
Record attendance
      ↓
Publish AttendanceRecorded event
```

> **Idempotency is required.** Duplicate RFID events for the same card on the same date must not create duplicate attendance records.

---

## 12. File Upload Flow

No application server proxies large files. All binary uploads go directly to object storage.

```
Step 1  Client requests upload permission
           ↓
Step 2  Server validates request + permissions
           ↓
Step 3  Server returns signed upload URL
           ↓
Step 4  Client uploads file directly to object storage
           ↓
Step 5  Client confirms upload completion to server
           ↓
Step 6  Server records file metadata in database
```

| Rule                                                   |
| ------------------------------------------------------ |
| No binary data passes through the application server   |
| Signed URLs are short-lived (e.g. 15 minutes)          |
| File size and MIME type validated before URL is issued |

---

## 13. Pagination

All list endpoints support consistent pagination parameters.

| Parameter | Type    | Default | Max | Description      |
| --------- | ------- | ------- | --- | ---------------- |
| `page`    | Integer | 1       | —   | Page number      |
| `limit`   | Integer | 20      | 100 | Records per page |
| `sort`    | String  | varies  | —   | Sort field       |
| `order`   | String  | `desc`  | —   | `asc` or `desc`  |
| `search`  | String  | —       | —   | Full-text search |

Future: cursor-based pagination for large datasets (e.g. attendance history).

---

## 14. Filtering

All list endpoints support composable, additive filters. All filter parameters are optional.

### Students

| Filter           | Type   | Description                  |
| ---------------- | ------ | ---------------------------- |
| `batch_id`       | UUID   | Students enrolled in a batch |
| `status`         | Enum   | `active`, `archived`         |
| `search`         | String | Name or admission number     |
| `enrolled_after` | Date   | Enrolled after a given date  |

### Attendance

| Filter       | Type | Description                |
| ------------ | ---- | -------------------------- |
| `batch_id`   | UUID | All attendance for a batch |
| `date`       | Date | Specific session date      |
| `student_id` | UUID | One student's history      |

### Invoices

| Filter       | Type | Description                             |
| ------------ | ---- | --------------------------------------- |
| `status`     | Enum | `pending`, `partial`, `paid`, `overdue` |
| `due_before` | Date | Invoices due before a date              |
| `batch_id`   | UUID | Invoices for a batch                    |

---

## 15. Idempotency

The following operations require idempotency guarantees:

| Operation          | Rule                                                       |
| ------------------ | ---------------------------------------------------------- |
| Payment recording  | Same payment reference must not create duplicate payment   |
| RFID events        | Same card + same date must not create duplicate attendance |
| External callbacks | Repeated delivery must produce the same outcome            |

Clients may optionally send an `Idempotency-Key` header for payment endpoints.

---

## 16. Error Catalog

Error codes are stable across API versions. Messages may change or be localized — clients must use `code`.

| Code                      | HTTP | Scenario                                    |
| ------------------------- | ---- | ------------------------------------------- |
| `AUTHENTICATION_REQUIRED` | 401  | No valid session                            |
| `PERMISSION_DENIED`       | 403  | Authenticated but lacks required permission |
| `STUDENT_NOT_FOUND`       | 404  | Student does not exist in this institute    |
| `BATCH_NOT_FOUND`         | 404  | Batch does not exist in this institute      |
| `INVALID_ENROLLMENT`      | 422  | Enrollment business rule violated           |
| `DUPLICATE_ATTENDANCE`    | 409  | Attendance already recorded for this date   |
| `INVOICE_ALREADY_PAID`    | 409  | Payment attempted on a fully paid invoice   |
| `INVALID_PAYMENT`         | 422  | Payment amount or reference invalid         |
| `TEST_ALREADY_PUBLISHED`  | 409  | Test already in published state             |
| `MARKS_ALREADY_PUBLISHED` | 409  | Marks already published                     |
| `FEATURE_DISABLED`        | 403  | Feature flag is off for this institute      |
| `TENANT_MISMATCH`         | 403  | Resource belongs to a different institute   |
| `VALIDATION_ERROR`        | 400  | Request schema validation failed            |
| `INTERNAL_ERROR`          | 500  | Unexpected server error                     |

---

## 17. Rate Limits

| Endpoint Category | Limit Profile                           |
| ----------------- | --------------------------------------- |
| Authentication    | Strict — brute force protection         |
| Attendance APIs   | Moderate                                |
| Parent APIs       | Moderate                                |
| File uploads      | Strict — per user per minute            |
| RFID events       | High throughput — API key authenticated |

Rate limit responses return HTTP `429` with a `Retry-After` header.

---

## 18. API Versioning

| Version | Status  | Notes                              |
| ------- | ------- | ---------------------------------- |
| `v1`    | Current | All endpoints under `/api/v1`      |
| `v2`    | Future  | Required only for breaking changes |

**Rules:**

- Minor additions (new optional fields, new endpoints) are backward compatible within `v1`.
- Endpoints must not change semantics within the same major version.
- Deprecated endpoints will be announced before removal.

---

## 19. Security Requirements

Every endpoint must complete the full security pipeline before executing:

```
1. Authenticate request
2. Resolve tenant from session
3. Check feature flag
4. Check permission
5. Validate input
6. Execute business rules
7. Publish domain events
8. Audit sensitive operations
```

> Sensitive endpoints (payment, marks publication, permission changes) require enhanced audit logging with user, timestamp, and entity reference.

---

## 20. Implementation Checklist

Before marking any endpoint as complete:

| Check                                       | Verified |
| ------------------------------------------- | -------- |
| Resource ownership defined                  | ☐        |
| Permission identified and enforced          | ☐        |
| Validation rules documented and implemented | ☐        |
| Business rules enforced                     | ☐        |
| Tenant isolation guaranteed                 | ☐        |
| Domain events published where required      | ☐        |
| Audit logging reviewed                      | ☐        |
| Error codes documented                      | ☐        |
| Tests implemented                           | ☐        |

---

_Chapter 3 Status: Complete_

_DADD v1.0 — All chapters complete._

---

**Document Completion Summary**

Combined with Chapters 1 and 2, the Database & API Design Document now defines:

| Area                  |
| --------------------- |
| Database architecture |
| Persistence model     |
| Entity relationships  |
| Constraints           |
| API conventions       |
| REST resources        |
| Validation rules      |
| Security requirements |
| Integration contracts |
| Versioning strategy   |

> This document is the implementation reference for backend development and must remain synchronized with the SRS and SDD throughout the product lifecycle.
