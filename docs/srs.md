# Software Requirements Specification (SRS)

**Product:** CoachingOS  
**Document Version:** 1.0  
**Status:** Draft (Phase 1 Frozen)  
**Prepared By:** Product & Engineering  
**Audience:** Founders, Product, Engineering, Future Team Members

---

## Table of Contents

### Chapter 1 — Product Foundation & Business Requirements

1. [Document Control](#1-document-control)
2. [Executive Summary](#2-executive-summary)
3. [Vision & Mission](#3-vision--mission)
4. [Problem Statement](#4-problem-statement)
5. [Product Scope](#5-product-scope)
6. [Goals](#6-goals)
7. [Success Metrics](#7-success-metrics)
8. [Industry Analysis](#8-industry-analysis)
9. [Target Customer (ICP)](#9-target-customer-icp)
10. [Stakeholders](#10-stakeholders)
11. [User Personas](#11-user-personas)
12. [Product Principles](#12-product-principles)
13. [Product Boundaries](#13-product-boundaries)
14. [Assumptions](#14-assumptions)
15. [Constraints](#15-constraints)
16. [Risks](#16-risks)

### Chapter 2 — Business Domain Specification

1. [Purpose](#chapter-2--business-domain-specification)
2. [Business Domain](#2-business-domain)
3. [Canonical Business Vocabulary](#3-canonical-business-vocabulary)
4. [Domain Model](#4-domain-model)
5. [Business Workflows](#5-business-workflows)
6. [Entity Lifecycles](#6-entity-lifecycles)
7. [Functional Requirements](#7-functional-requirements)
8. [Non-Functional Requirements](#8-non-functional-requirements)
9. [Business Event Catalog](#9-business-event-catalog)
10. [Acceptance Criteria](#10-acceptance-criteria)

---

# Chapter 1 — Product Foundation & Business Requirements

---

## 1. Document Control

| Item     | Value                               |
| -------- | ----------------------------------- |
| Product  | CoachingOS (Working Name)           |
| Document | Software Requirements Specification |
| Version  | 1.0                                 |
| Status   | Draft                               |
| Audience | Founders, Product, Engineering      |
| Scope    | MVP + Product Roadmap               |

---

## 2. Executive Summary

### Purpose

This document defines the functional and business requirements for a SaaS platform designed specifically for founder-led coaching institutes.

The document serves as the single source of truth for product decisions before implementation begins.

### Vision

Create the operating system for coaching institutes that simplifies daily operations while increasing transparency for parents.

### Product Positioning

This product is **not** a school ERP.  
This product is **not** an LMS.  
This product is **not** an accounting platform.

Instead, it focuses on **operational excellence for coaching institutes**.

### Target Customer

| Attribute     | Value                                                                                     |
| ------------- | ----------------------------------------------------------------------------------------- |
| Customer Type | Founder-led coaching institutes                                                           |
| Typical Size  | 50–500 students                                                                           |
| Examples      | Maths Classes, NEET Academy, JEE Coaching, Language Institutes, Competitive Exam Coaching |

---

## 3. Vision & Mission

### Vision

Build the most trusted operating system for founder-led coaching institutes.

### Mission

- Reduce operational complexity.
- Increase parent trust.
- Give every coaching institute the experience of owning a professional digital platform.

---

## 4. Problem Statement

The following problems were identified during the discovery phase.

### Problem 1 — Attendance Management

**Current Process:**

```
Teacher → Register → Manual Attendance → Parent Calls → Teacher Checks Register
```

**Problems:**

- Time consuming
- Error prone
- Parents lack visibility

---

### Problem 2 — Fee Management

**Current Process:**

```
Cash / UPI → Notebook → Excel → Receipt
```

**Problems:**

- Difficult reconciliation
- Pending fee tracking is unreliable
- Manual reminders required

---

### Problem 3 — Communication

**Current Methods:** WhatsApp Groups, Individual Messages, SMS

**Problems:**

- Mixed communication channels
- No history
- High manual effort

---

### Problem 4 — Academic Transparency

Parents repeatedly ask:

- Was my child present?
- What homework is pending?
- What marks did they get?
- When is the next test?

These questions consume significant teacher time with no scalable solution.

---

### Problem 5 — Professional Branding

Small coaching institutes cannot justify the cost of custom mobile applications, yet still require a professional digital identity.

---

## 5. Product Scope

### Included

| Domain         |
| -------------- |
| Identity       |
| Academics      |
| Billing        |
| Communication  |
| Administration |
| Parent Portal  |

### Excluded

| Domain          |
| --------------- |
| Online Classes  |
| Library         |
| Hostel          |
| Payroll         |
| Accounting      |
| Transport       |
| Marketing       |
| CRM             |
| Website Builder |
| Payment Gateway |

---

## 6. Goals

### Business Goals

- Reduce manual work.
- Improve parent communication.
- Increase operational efficiency.
- Provide professional branding.
- Create recurring SaaS revenue.

### Product Goals

| Action                  | Target       |
| ----------------------- | ------------ |
| Attendance completion   | < 2 minutes  |
| Homework publishing     | < 30 seconds |
| Announcement publishing | < 30 seconds |
| Student search          | < 5 seconds  |
| Fee recording           | < 30 seconds |

### Engineering Goals

- Single codebase
- Modular architecture
- Multi-tenant
- Responsive
- Scalable
- Maintainable

---

## 7. Success Metrics

### Product Metrics

| Metric                             | Target   |
| ---------------------------------- | -------- |
| Average attendance completion time | < 2 min  |
| Homework publishing time           | < 30 sec |
| Announcement publishing time       | < 30 sec |
| Parent login success rate          | ≥ 95%    |
| Search response time               | < 500 ms |

### Business Metrics

- Monthly Active Institutes
- Monthly Active Parents
- Retention Rate
- Monthly Recurring Revenue (MRR)
- Average Daily Active Users (DAU)

---

## 8. Industry Analysis

### Existing Market

#### Large Enterprise Players

| Player    | Strengths        | Weaknesses                                         |
| --------- | ---------------- | -------------------------------------------------- |
| Classplus | Large ecosystems | Expensive, complex, overbuilt for small institutes |
| Proctur   | Large ecosystems | Expensive, complex, overbuilt for small institutes |

#### Manual Operations

Current tools: Registers, Excel, WhatsApp, SMS

Problems:

- Time consuming
- No transparency
- No centralized records

### Positioning

CoachingOS targets the gap between **manual operations** and **enterprise ERP** — a segment that is underserved and price-sensitive.

---

## 9. Target Customer (ICP)

### Primary ICP

**Founder-led coaching institutes**

Characteristics:

- 50–500 students
- Teaches offline
- Uses WhatsApp for communication today
- Wants better operations
- Wants a professional image

### Secondary ICP

Growing academies with 1000+ students, multiple teachers and assistants, still founder-managed.

### Not Targeting

- Schools
- Colleges
- Universities
- Large enterprise coaching chains

---

## 10. Stakeholders

### Primary Stakeholders

| Role    | Description    |
| ------- | -------------- |
| Founder | Business Owner |

### Secondary Stakeholders

| Role      |
| --------- |
| Assistant |
| Teacher   |
| Parent    |
| Student   |

### Internal Stakeholders (Future)

| Role        |
| ----------- |
| Engineering |
| Support     |
| Sales       |

---

## 11. User Personas

### Founder

| Attribute   | Detail                                                                             |
| ----------- | ---------------------------------------------------------------------------------- |
| Goals       | Run coaching efficiently, track fees, track attendance, communicate professionally |
| Pain Points | Manual work, repeated parent calls, messy fee records                              |

### Assistant

| Attribute | Detail                                         |
| --------- | ---------------------------------------------- |
| Goals     | Admissions, attendance, fees, daily operations |

### Teacher

| Attribute | Detail                                               |
| --------- | ---------------------------------------------------- |
| Goals     | Teach, upload homework, enter marks, avoid paperwork |

### Parent

| Attribute | Detail                                                                     |
| --------- | -------------------------------------------------------------------------- |
| Goals     | Know whether child attended, view marks, receive announcements, track fees |

### Student

| Attribute | Detail                         |
| --------- | ------------------------------ |
| Goals     | Homework, marks, announcements |

---

## 12. Product Principles

These principles are immutable and govern all product decisions.

| ID     | Principle                                           |
| ------ | --------------------------------------------------- |
| PP-001 | Software must save time.                            |
| PP-002 | Teachers teach. Software should stay invisible.     |
| PP-003 | Everything revolves around batches.                 |
| PP-004 | Enrollment is the operational entity — not Student. |
| PP-005 | Configuration over customization.                   |
| PP-006 | Every action updates every dependent workflow.      |
| PP-007 | Communication should justify its cost.              |
| PP-008 | Desktop and Mobile provide equivalent capabilities. |
| PP-009 | Every institute is isolated. Always.                |
| PP-010 | Workflow first. Screens second.                     |

---

## 13. Product Boundaries

The following are intentionally **not supported** in MVP:

- Online Learning
- Video Streaming
- Accounting
- Payroll
- Marketing Automation
- CRM
- Payment Gateway
- AI features

These are deferred to future roadmap phases.

---

## 14. Assumptions

- Coaching institutes already use smartphones.
- Parents have mobile numbers.
- Most parents use WhatsApp.
- Internet is available during operations.
- Payment collection already exists outside the system.
- Institutes primarily require operational software rather than educational content delivery.

---

## 15. Constraints

### Technical Constraints

| Constraint          | Detail                                   |
| ------------------- | ---------------------------------------- |
| Team size           | Single engineering team (initially solo) |
| Infrastructure      | Budget-conscious                         |
| Codebase            | Single codebase                          |
| Multi-tenancy model | Shared database                          |

### Business Constraints

| Constraint      | Detail                                |
| --------------- | ------------------------------------- |
| Domain          | Coaching only                         |
| Customer type   | Founder-led institutes only           |
| Operation model | Offline-first with digital management |

---

## 16. Risks

| Risk                       | Mitigation                                             |
| -------------------------- | ------------------------------------------------------ |
| Feature creep              | Strict MVP scope                                       |
| High messaging costs       | Priority-based notifications and configurable channels |
| Complex permissions        | Permission templates + fine-grained authorization      |
| Domain expansion too early | Focus exclusively on coaching until PMF                |
| Over-engineering           | Modular monolith, not microservices                    |

---

_End of Chapter 1_

---

# Chapter 2 — Business Domain Specification

---

## 1. Purpose

This chapter formally defines the business domain of CoachingOS.

The objective is to create a shared language between product, engineering, and future team members.

Every database table, API endpoint, UI screen, and business rule must originate from this document.

---

## 2. Business Domain

CoachingOS is a multi-tenant SaaS platform designed specifically for founder-led coaching institutes.

The platform digitizes operational workflows while intentionally avoiding areas outside the coaching domain such as accounting, payroll, LMS, and school ERP functionality.

The platform consists of five core business capabilities:

| Capability     |
| -------------- |
| Identity       |
| Academics      |
| Billing        |
| Communication  |
| Administration |

---

## 3. Canonical Business Vocabulary

This vocabulary is mandatory throughout the product.

### Institute

A coaching business using the platform.

**Examples:** Sharma Physics Academy, Apex NEET Institute, Bright Maths Classes

Every business entity belongs to exactly one institute.

---

### Program _(Optional)_

An optional grouping mechanism.

**Examples:** 11th Science, 12th Commerce, Foundation

Programs exist only for organization and reporting. Programs never become mandatory.

---

### Subject

An academic subject taught by an institute.

**Examples:** Mathematics, Physics, Chemistry, Biology, English

A subject may exist without belonging to a Program.

---

### Batch

A scheduled learning group for a subject. A batch represents:

- One subject
- One schedule
- One group of students

**Examples:** Physics Morning Batch, Physics Evening Batch, Maths Weekend Batch

Everything operational revolves around batches.

---

### Student

A learner enrolled in one or more batches. A student is a person. The student itself contains no operational information such as fee status.

---

### ParentIdentity _(Global — Platform Layer)_

A globally unique parent record anchored to a phone number. Exists at the platform level, not within any single institute.

Stores:

- Phone (globally unique)
- Authentication state
- Push notification tokens

One `ParentIdentity` spans all coaching institutes the parent is connected to.

> See ADR-001 for the full rationale behind the two-layer parent model.

---

### InstituteParent _(Tenant — Institute Layer)_

The institute-scoped parent record. Belongs to exactly one institute.

Stores:

- Primary Phone
- Secondary Phone _(optional)_
- Name

`InstituteParent` is what the coaching institute creates and manages. It is linked to a `ParentIdentity` through an `InstituteMembership` record, resolved at login time.

---

### ChildProfile _(Global — Platform Layer, Personal)_

A parent-created label for organizing their children across institutes. Invisible to institutes.

**Examples:** "Rahul", "Priya"

Stores:

- Name
- Avatar _(optional)_

`ChildProfile` is personal organization — not identity matching. The parent creates these, not the platform. Institute data is never modified by a `ChildProfile`.

---

### StudentLink

Maps a `ChildProfile` to a specific `Student` record within an institute. The join between the personal layer and the tenant layer.

A parent links institute enrollments to their child profiles manually. The platform may suggest possible matches but never auto-merges.

---

### Enrollment

Represents a student's participation in a batch. Enrollment is the **operational entity**.

Contains:

- Join Date
- Status
- Discount
- BillingPlan

Enrollment answers:

- Which batch?
- Since when?
- Is the student active?
- What is the fee structure?

---

### User

Internal staff member.

**Examples:** Founder, Teacher, Assistant, Reception

Permissions define access — not job titles.

---

### Attendance

Attendance recorded for a student's participation in a batch session.

> **Updated per domain review.** Attendance now references a `BatchSession` rather than a raw date. This enables session cancellations, extra classes, and richer analytics without schema changes.

Supported sources:

- Manual
- RFID

Future:

- QR Code

---

### Schedule _(replaces Timetable)_

The recurring weekly rule defining when a batch meets.

> **Renamed from Timetable per domain review.** A Schedule is the _plan_ — what should happen every week.

Stores:

- Days of week
- Start Time
- End Time
- Assigned Teacher

Does not include rooms or advanced scheduling in MVP.

---

### BatchSession

A generated occurrence of a batch class on a specific date.

> **New entity per domain review.** A Session is the _reality_ — what actually happened (or was cancelled) on a specific date. Attendance is recorded against a Session, not a raw date.

Stores:

- Batch reference
- Date
- Start / End Time
- Status: `scheduled`, `completed`, `cancelled`
- Attendance taken flag
- Source (Manual / RFID)

**Future scenarios enabled without schema changes:** cancelled classes, extra classes, holidays, attendance reopen, substitute teacher, session notes.

---

### Homework

Academic work assigned to an entire batch. Homework is never assigned individually in MVP.

---

### Test

Any assessment conducted for a batch.

**Examples:** Weekly Test, Unit Test, Monthly Test, Mock Test, Full Syllabus Test

The platform treats every assessment uniformly.

---

### Marks

Score obtained by a student in a test.

---

### BillingPlan _(replaces Fee Plan)_

The billing agreement for an enrollment. Stores how invoices are generated — the schedule, the rules, the contract.

> **Renamed from Fee Plan per domain review.** BillingPlan is the _contract_. It never changes because of payments. Invoices are generated from it.

Supported types:

- Monthly
- One-time
- Installments

Stores:

- Amount
- Billing type
- Discount type + value
- Billing start date _(may differ from join date — handles late joins)_
- First invoice amount override _(optional — for pro-rata cases)_

---

### Invoice

A payment request generated from a BillingPlan.

---

### Receipt

Proof of payment. Generated from a Payment — not an Invoice.

One Payment → One Receipt. Receipt contains: Receipt Number, Institute Branding, Payment details, Generated At.

---

A record of money received. This is **not** an online payment transaction.

Payment may be received through:

- Cash
- UPI
- Bank Transfer

---

### Announcement

Communication targeted to:

- Entire Institute
- Specific Batch

---

### Notification

A delivery generated from a business event.

Channels:

- In-App
- WhatsApp
- SMS

---

## 4. Domain Model

```
PLATFORM LAYER (Global — owned by CoachingOS)
─────────────────────────────────────────────
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
├── Program (Optional)
│
├── Subject
│      │
│      └── Batch
│             │
│             ├── Schedule (recurring rule)
│             ├── BatchSession (generated occurrence)
│             │      └── Attendance
│             ├── Homework
│             ├── Tests
│             │      └── Marks
│             ├── Announcements
│             └── Enrollments
│
├── Students
├── InstituteParents
├── Users
├── Branding
└── Settings


Enrollment
│
├── Student
├── Batch
├── BillingPlan
└── Status


BillingPlan
│
└── Invoice
        │
        ├── Payments
        │      └── Receipt
        └── (status: pending / partial / paid)
```

The two layers meet only through the parent's own organization via `StudentLink`. Institutes remain completely isolated from one another.

---

## 5. Business Workflows

### Workflow 1 — Student Admission

**Goal:** Register a new student and make them operational.

```
Parent Information
      ↓
Student Created
      ↓
Subject Selected
      ↓
Batch Selected
      ↓
Enrollment Created
      ↓
Fee Plan Assigned
      ↓
Student Active
```

**Output:**

- Student exists
- Parent linked
- Enrollment active
- Fee plan ready

---

### Workflow 2 — Attendance

**Goal:** Record attendance with minimum effort.

```
Open Batch
      ↓
Choose Attendance Source
      ↓
Manual / RFID
      ↓
Attendance Saved
      ↓
AttendanceRecorded Event
      ↓
Notifications → Reports → Analytics
```

---

### Workflow 3 — Homework

```
Teacher Opens Batch
      ↓
Create Homework
      ↓
Publish
      ↓
Students View / Parents View
```

---

### Workflow 4 — Test & Marks

```
Teacher Creates Test
      ↓
Students Attempt
      ↓
Marks Entered
      ↓
Publish
      ↓
Parents Notified
```

---

### Workflow 5 — Fee Management

```
Enrollment
      ↓
Fee Plan
      ↓
Invoice Generated
      ↓
Payment Recorded
      ↓
Receipt Generated
```

> Online payment gateway is intentionally outside MVP.

---

### Workflow 6 — Announcement

```
Create Announcement
      ↓
Institute or Batch Target
      ↓
Publish
      ↓
Notification Sent
```

---

## 6. Entity Lifecycles

### Student

```
Created → Admitted → Enrolled → Active → Completed / Left → Archived
```

> Students are never physically deleted.

---

### Batch

```
Draft → Open → Running → Completed → Archived
```

---

### Enrollment

```
Pending → Active → Completed → Cancelled
```

---

### Invoice

```
Generated → Pending → Partially Paid → Paid
```

---

### Test

```
Draft → Scheduled → Marks Entered → Published
```

---

## 7. Functional Requirements

### Identity

| ID     | Requirement                                                              |
| ------ | ------------------------------------------------------------------------ |
| FR-001 | The system shall allow an institute to manage students.                  |
| FR-002 | The system shall allow linking one parent with multiple students.        |
| FR-003 | The system shall support two parent contact numbers.                     |
| FR-004 | The system shall support optional Programs.                              |
| FR-005 | The system shall allow creation of multiple subjects.                    |
| FR-006 | The system shall support multiple batches per subject.                   |
| FR-007 | The system shall allow a student to have multiple enrollments over time. |

---

### Attendance & Sessions

| ID     | Requirement                                                                      |
| ------ | -------------------------------------------------------------------------------- |
| FR-020 | The system shall support manual attendance recording.                            |
| FR-021 | The system shall support RFID attendance recording.                              |
| FR-022 | The system shall create BatchSessions to represent individual class occurrences. |
| FR-023 | Attendance shall be recorded against a BatchSession, not a raw date.             |
| FR-024 | Only one attendance record shall exist per enrollment per session.               |
| FR-025 | A BatchSession may be marked as cancelled (holiday, teacher absent, etc.).       |
| FR-026 | Attendance shall automatically update attendance statistics.                     |

---

### Homework

| ID     | Requirement                                         |
| ------ | --------------------------------------------------- |
| FR-030 | Teachers shall create homework for an entire batch. |
| FR-031 | Homework may include text and file attachments.     |

---

### Tests & Marks

| ID     | Requirement                     |
| ------ | ------------------------------- |
| FR-040 | Teachers shall create tests.    |
| FR-041 | Teachers shall record marks.    |
| FR-042 | Teachers shall publish results. |

---

### Billing _(formerly Finance)_

> **Module renamed per domain review.** The module is called Billing internally. UI may say "Fees".

| ID     | Requirement                                                                                |
| ------ | ------------------------------------------------------------------------------------------ |
| FR-050 | The system shall support monthly billing plans.                                            |
| FR-051 | The system shall support one-time billing plans.                                           |
| FR-052 | The system shall support installment billing plans.                                        |
| FR-053 | The system shall support discounts on billing plans (percentage and fixed).                |
| FR-054 | The system shall support a billing start date independent of the enrollment join date.     |
| FR-055 | The system shall support a first invoice amount override for late-join and pro-rata cases. |
| FR-056 | The system shall generate invoices from billing plans.                                     |
| FR-057 | The system shall record manual payments (cash, UPI, bank transfer).                        |
| FR-058 | The system shall support partial payments against an invoice.                              |
| FR-059 | The system shall generate a receipt per payment.                                           |
| FR-060 | Receipts shall be printable and include institute branding.                                |

---

### Communication

| ID     | Requirement                                                        |
| ------ | ------------------------------------------------------------------ |
| FR-070 | Institutes shall publish announcements.                            |
| FR-071 | Announcements may target the entire institute or a specific batch. |
| FR-072 | Critical events shall generate notifications.                      |

---

### Parent Portal

> **Superseded by ADR-001.** The Parent Portal is now two surfaces: **Parent Hub** (global) and **Coaching Workspace** (tenant). See ADR-001 for full detail.

#### Parent Hub (Platform Layer — Global)

| ID     | Requirement                                                                                         |
| ------ | --------------------------------------------------------------------------------------------------- |
| FR-080 | Parents shall authenticate using OTP tied to their phone number (ParentIdentity).                   |
| FR-081 | Parents shall see all coaching institutes they are connected to in a single hub.                    |
| FR-082 | Parents shall create ChildProfiles to organize their children (e.g. "Rahul", "Priya").              |
| FR-083 | Parents shall link institute enrollments to a ChildProfile manually.                                |
| FR-084 | The platform may suggest possible ChildProfile matches based on name similarity — never auto-merge. |
| FR-085 | Parents shall switch between ChildProfiles to view each child's cross-institute summary.            |

#### Coaching Workspace (Institute Layer — Tenant)

| ID     | Requirement                                                                        |
| ------ | ---------------------------------------------------------------------------------- |
| FR-086 | Parents shall view attendance for their child within a specific institute.         |
| FR-087 | Parents shall view homework published to their child's batch.                      |
| FR-088 | Parents shall view published marks for their child.                                |
| FR-089 | Parents shall view fee status and invoice history.                                 |
| FR-090 | Parents shall download receipts.                                                   |
| FR-091 | Parents shall view announcements targeted to their child's batch or the institute. |

---

## 8. Non-Functional Requirements

### Performance

| Requirement                | Target                                          |
| -------------------------- | ----------------------------------------------- |
| Student search             | Instantaneous for normal institute sizes        |
| Attendance recording       | Completes quickly even for large batches        |
| Parent dashboard load time | Within a few seconds on average mobile networks |

### Security

- Every request is tenant-scoped.
- Permission checks are mandatory on all operations.
- Audit trail for important actions.
- No institute's data is ever exposed to another institute.

### Availability

Target availability suitable for continuous daily coaching operations.

### Scalability

Architecture must support thousands of institutes on the same platform.

### Maintainability

Business logic shall remain modular and independently testable.

---

## 9. Business Event Catalog

The following are first-class domain events. Each event triggers downstream actions such as notifications, reporting, and audit logging.

| Event                 | Description                              |
| --------------------- | ---------------------------------------- |
| StudentEnrolled       | A student is enrolled in a batch         |
| AttendanceRecorded    | Attendance is saved for a batch session  |
| HomeworkPublished     | Homework is published to a batch         |
| TestCreated           | A new test is created for a batch        |
| MarksPublished        | Test results are published               |
| InvoiceGenerated      | An invoice is created for an enrollment  |
| PaymentRecorded       | A payment is recorded against an invoice |
| AnnouncementPublished | An announcement is published             |
| UserInvited           | A new user is invited to the institute   |

---

## 10. Acceptance Criteria

The MVP is considered complete when all of the following are verifiable:

- [ ] Institutes can create subjects and batches.
- [ ] Students and parents can be onboarded.
- [ ] Enrollments can be created with fee plans assigned.
- [ ] Attendance can be recorded manually or via RFID.
- [ ] Homework can be created and published to batches.
- [ ] Tests can be created and marks recorded.
- [ ] Marks can be published and parents notified.
- [ ] Fees can be tracked through invoices and payment records.
- [ ] Printable receipts can be generated.
- [ ] Parents can access attendance, marks, homework, announcements and fee status via the Parent Portal.
- [ ] Branding and permissions are configurable per institute.
- [ ] All business data is isolated per institute with no cross-tenant data leakage.

---

_Chapter 2 Status: Draft Complete_

_This chapter freezes the business domain and functional behaviour. Future engineering work — ERD, database schema, APIs, and UI — must conform to these definitions._

---

---

# Chapter 3 — Product Definition & MVP Specification

---

## 1. Purpose

This chapter defines the final product scope for Version 1.

It answers one question: **What exactly are we building?**

Everything outside this document is considered out of scope unless explicitly approved for a future release.

---

## 2. Product Structure

The platform consists of five business capabilities.

```
Identity
│
├── Institute
├── Users
├── Students
├── Parents
├── Subjects
├── Batches
└── Enrollment

Academics
│
├── Attendance
├── Homework
├── Tests
├── Marks
└── Timetable

Finance
│
├── Fee Plans
├── Invoices
├── Payment Records
└── Receipts

Communication
│
├── Announcements
└── Notifications

Administration
│
├── Branding
├── Settings
├── Reports
└── Permissions
```

---

## 3. MVP Scope

The MVP solves one complete operational cycle for a coaching institute.

```
Admission
    ↓
Enrollment
    ↓
Attendance
    ↓
Homework
    ↓
Tests
    ↓
Marks
    ↓
Fees
    ↓
Parent Visibility
```

If this cycle works end-to-end, the institute can operate daily using CoachingOS.

---

## 4. Screen Specifications

### 4.1 Authentication

#### Staff Login

| Attribute | Detail                                           |
| --------- | ------------------------------------------------ |
| Purpose   | Authenticate institute staff                     |
| Features  | Login, Forgot Password / OTP, Session Management |

#### Parent Login

| Attribute | Detail                                                |
| --------- | ----------------------------------------------------- |
| Purpose   | Parent Hub access — global layer                      |
| Features  | Mobile Number, OTP Verification, Persistent Session   |
| Resolves  | ParentIdentity → InstituteMemberships → ChildProfiles |

> Parents log in once and see all connected coaching institutes. No separate login per institute.

---

### 4.2 Dashboard

#### Founder Dashboard

**Displays:**

- Today's Attendance
- Pending Fees
- Today's Classes
- Today's Tests
- Recent Announcements
- Quick Actions

**Quick Actions:**

- Attendance
- Add Student
- Record Fee
- Create Homework
- Create Announcement
- Create Test

#### Teacher Dashboard

**Displays:**

- Today's Batches
- Pending Homework
- Upcoming Tests

#### Parent Hub (Global Dashboard)

**Displays:**

- Child Profiles (Rahul, Priya)
- All connected coaching institutes per child
- Cross-institute attendance summary per child
- Unified notifications

**Supports:**

- Multiple ChildProfiles
- Multiple Coaching Institutes per child

#### Coaching Workspace (Per-Institute View)

**Displays:**

- Attendance
- Homework
- Latest Marks
- Pending Fees
- Announcements

> Fully tenant-isolated. One coaching's data is never visible from another coaching's workspace.

---

## 5. Identity Module

### Institute

| Function         |
| ---------------- |
| Create Institute |
| Branding         |
| Settings         |

### Student

| Function |
| -------- |
| Create   |
| Edit     |
| Archive  |
| Search   |

### Parent

| Function       |
| -------------- |
| Create         |
| Link Student   |
| Update Contact |

### Subject

| Function |
| -------- |
| Create   |
| Edit     |
| Archive  |

### Batch

| Function       |
| -------------- |
| Create         |
| Assign Subject |
| Assign Teacher |
| Timetable      |
| Active Status  |

### Enrollment

| Function        |
| --------------- |
| Enroll Student  |
| Change Status   |
| Assign Fee Plan |
| Apply Discount  |

---

## 6. Academics Module

### Attendance

**Supported Sources:** Manual, RFID

| Feature               |
| --------------------- |
| Mark Present          |
| Mark Absent           |
| Mark Late             |
| Monthly Calendar View |
| Attendance Percentage |

**Reports:**

| Report  |
| ------- |
| Daily   |
| Batch   |
| Student |

### Homework

| Feature         |
| --------------- |
| Create          |
| Edit            |
| Publish         |
| Attach Files    |
| Batch Targeting |

### Tests

| Feature       |
| ------------- |
| Create Test   |
| Edit          |
| Maximum Marks |
| Publish       |

### Marks

| Feature             |
| ------------------- |
| Bulk Entry          |
| Edit Before Publish |
| Publish             |
| Parent Visibility   |

### Schedule _(recurring rule — replaces Timetable)_

| Stores       |
| ------------ |
| Days of week |
| Start Time   |
| End Time     |
| Teacher      |

> No room scheduling in MVP.

### BatchSession _(generated occurrence)_

| Stores                                     |
| ------------------------------------------ |
| Date                                       |
| Start / End Time                           |
| Status (scheduled / completed / cancelled) |
| Attendance taken flag                      |
| Source (manual / rfid)                     |

> Attendance is recorded against a BatchSession, not a raw date.

---

## 7. Billing Module _(formerly Finance)_

> **Module renamed per domain review.** UI shows "Fees". Codebase uses `billing`.

### BillingPlan _(replaces Fee Plan)_

| Supported Type | Notes                        |
| -------------- | ---------------------------- |
| Monthly        | Invoice generated each month |
| One-Time       | Single invoice on creation   |
| Installments   | N invoices based on schedule |

**Additional fields:**

| Field                         | Purpose                                  |
| ----------------------------- | ---------------------------------------- |
| Discount type + value         | Inherited by all invoices from this plan |
| Billing start date            | May differ from enrollment join date     |
| First invoice amount override | For late-join / pro-rata cases           |

### Invoice

| Function       |
| -------------- |
| Generate       |
| View           |
| Pending Status |
| Partial Status |
| Paid Status    |

### Payment Record

**Supported Methods:** Cash, UPI, Bank Transfer

| Feature         |
| --------------- |
| Partial Payment |
| Remarks         |
| Collected By    |

### Receipt

> One Payment → One Receipt. Generated from Payment, not Invoice.

Generated receipt contains:

| Field              |
| ------------------ |
| Institute Branding |
| Receipt Number     |
| Student            |
| Amount             |
| Payment Mode       |
| Date               |

---

## 8. Communication Module

### Announcements

| Target           |
| ---------------- |
| Entire Institute |
| Specific Batch   |

### Notifications

**Priority Levels:**

| Level         | Events                                                |
| ------------- | ----------------------------------------------------- |
| Critical      | Absent, Fee Due, Fee Received, Test Result, Emergency |
| Important     | Homework, Timetable Change                            |
| Informational | General Updates                                       |

**Delivery Channels:**

| Channel  | Status         |
| -------- | -------------- |
| In-App   | MVP            |
| WhatsApp | Future rollout |
| SMS      | Optional       |

---

## 9. Administration Module

### Branding

| Field               |
| ------------------- |
| Institute Logo      |
| Primary Color       |
| Institute Name      |
| Contact Information |
| Receipt Branding    |

### Settings

| Setting                  |
| ------------------------ |
| Attendance Method        |
| Notification Preferences |
| Academic Year            |
| Institute Details        |

### Reports

| Report          |
| --------------- |
| Attendance      |
| Fee Collection  |
| Pending Fees    |
| Student Summary |
| Batch Summary   |

### Users

**Managed Roles:** Founder, Teacher, Assistant

Permissions determine capabilities.

---

## 10. User Stories

| Persona   | Story                                                                                                                 |
| --------- | --------------------------------------------------------------------------------------------------------------------- |
| Founder   | "As a founder, I want to manage attendance, fees, homework, tests and announcements from one system."                 |
| Teacher   | "As a teacher, I want to complete my academic work quickly so I can focus on teaching."                               |
| Assistant | "As an assistant, I want to manage admissions and fees without accessing sensitive institute settings."               |
| Parent    | "As a parent, I want to know my child's attendance, homework, marks and fee status without contacting the institute." |

---

## 11. MVP Acceptance Criteria

### Identity

- [ ] Institute created
- [ ] Staff invited
- [ ] Students created
- [ ] Parents linked
- [ ] Subjects created
- [ ] Batches created
- [ ] Enrollment completed

### Academics

- [ ] Attendance works
- [ ] Homework published
- [ ] Tests created
- [ ] Marks published
- [ ] Timetable visible

### Finance

- [ ] Fee Plans created
- [ ] Invoices generated
- [ ] Payments recorded
- [ ] Receipts generated

### Communication

- [ ] Announcements published
- [ ] Notifications generated

### Parent Portal

- [ ] OTP Login
- [ ] Attendance visible
- [ ] Homework visible
- [ ] Marks visible
- [ ] Fees visible
- [ ] Receipts downloadable

### Administration

- [ ] Branding configurable
- [ ] Reports available
- [ ] Permission templates working

---

## 12. Out of Scope (MVP)

The following features are intentionally excluded from MVP:

| Feature                |
| ---------------------- |
| Online Classes         |
| Video Streaming        |
| LMS                    |
| Website Builder        |
| CRM                    |
| Marketing Automation   |
| Accounting             |
| Payroll                |
| Library                |
| Hostel                 |
| Transport              |
| QR Attendance          |
| Face Recognition       |
| AI Features            |
| Online Payment Gateway |
| Multi Branch           |

---

## 13. Product Roadmap

### MVP

| Capability     |
| -------------- |
| Identity       |
| Academics      |
| Finance        |
| Communication  |
| Administration |
| Parent Portal  |

### Version 1

| Feature                       |
| ----------------------------- |
| Admissions Pipeline           |
| Study Material                |
| Attendance Analytics          |
| Batch Transfer                |
| Export (PDF / Excel)          |
| Improved WhatsApp Integration |

### Version 2

| Feature                 |
| ----------------------- |
| Payment Gateway         |
| AI Reports              |
| CRM                     |
| Multi Branch            |
| Website Builder         |
| Marketing Tools         |
| Face Recognition        |
| QR Attendance           |
| Accounting Integrations |

---

## 14. Deferred Decisions

The following decisions are intentionally postponed until implementation:

| Decision                                                |
| ------------------------------------------------------- |
| Staff authentication method (password vs OTP vs hybrid) |
| Background job implementation                           |
| Queue technology                                        |
| WhatsApp provider                                       |
| SMS provider                                            |
| Receipt numbering strategy                              |
| Academic year handling                                  |
| Data archival policy                                    |

---

## 15. Traceability Matrix

| Business Goal                 | MVP Feature                     |
| ----------------------------- | ------------------------------- |
| Reduce manual attendance      | Attendance Module               |
| Improve parent trust          | Parent Portal                   |
| Reduce fee disputes           | Finance Module                  |
| Professional institute image  | Branding                        |
| Faster communication          | Announcements + Notifications   |
| Better operational visibility | Reports                         |
| Lower onboarding friction     | OTP Login                       |
| Flexible institute structure  | Subjects + Batches + Enrollment |

---

## 16. Product Freeze

The following decisions are frozen for Version 1. Changes require explicit architectural review.

| Decision                       |
| ------------------------------ |
| Coaching institutes only       |
| Founder-led institutes         |
| Modular Monolith Architecture  |
| Multi-tenant SaaS              |
| Shared PostgreSQL Database     |
| Batch-centric Domain Model     |
| Enrollment-centric Operations  |
| Responsive Web Application     |
| PWA-first Strategy             |
| Manual + RFID Attendance       |
| Manual Payment Recording       |
| Permission-based Authorization |
| Event-driven Business Logic    |

---

## 17. SRS Completion

With Chapters 1–3 complete, the Software Requirements Specification is considered complete.

This document now defines:

| Area                        |
| --------------------------- |
| Product Vision              |
| Business Domain             |
| Business Rules              |
| Business Vocabulary         |
| User Personas               |
| Functional Requirements     |
| Non-functional Requirements |
| Product Scope               |
| MVP                         |
| Roadmap                     |
| Acceptance Criteria         |

---

> **The SRS is the authoritative reference for all future engineering work.**
>
> No implementation should contradict this specification without updating the SRS first.

---

_End of Chapter 3 — SRS v1.0 Complete_
