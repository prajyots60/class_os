# 🎓 CoachingOS Phase 2 — Academics Module Architecture & Domain Contract

> **Status:** 🟢 ARCHITECTURE & CONTRACT SPECIFICATION (ACCEPTED & FROZEN)  
> **Authoritative Specification Document**  
> **Target Scope:** Daily Offline Coaching Operations (Scheduling, Sessions, Attendance, Homework, Tests & Marks)  
> **Dependencies:** Phase 0 (Engineering Foundation) & Phase 1 (Identity, Multi-Tenancy & Academic Hierarchy)

---

## 1. Executive Summary & Core Objective

Phase 2 transitions CoachingOS from an **administrative identity platform** into an **active daily operational engine**.

While Phase 1 established *who* operates in an institute (Users, Parents, Students) and *how* academic structures are configured (Programs, Subjects, Batches, Enrollments), Phase 2 powers what happens on **Monday morning when classes begin**.

### The North Star Teacher Operating Loop

```text
                        TEACHER'S DAILY WORKDAY
                                   │
                                   ▼
                            Today's Sessions
                                   │
                 ┌─────────────────┴─────────────────┐
                 ▼                                   ▼
            Attendance                            Homework
        (Record in <30s)                     (Batch-Targeted)
                 │                                   │
                 └─────────────────┬─────────────────┘
                                   ▼
                              Assessments
                          (Weekly / Unit / Mock)
                                   │
                                   ▼
                              Enter Marks
                          (Bulk Score Entry)
                                   │
                                   ▼
                            Publish Results
                         (Triggers Events)
```

The official Phase 2 deliverable is:
> **Teacher opens Today's Session → Record Attendance → Publish Homework → Create Assessment → Enter & Publish Marks.**

---

## 2. Phase 1 Boundary & Consumption Contracts

Phase 2 **does not recreate or redefine** core identity and organizational entities. It strictly consumes existing domain abstractions from Phase 1:

```text
Consumed from Phase 1:
  - Institute (Tenant context)
  - Staff & Users (Authenticated identities)
  - Students & InstituteParents (CRM records)
  - Program & Subject (Academic taxonomy)
  - Batch & Enrollment (Operational relationship connecting Student → Batch)
  - Authorization Engine & Capabilities (Capability-based RBAC)
```

### Domain Relationship Model

```text
Institute
   └── Subject
          └── Batch
                 ├── Schedule (Recurring weekly blueprint rule)
                 ├── BatchSession (Concrete calendar class occurrence)
                 │      └── Attendance (Anchored to BatchSession + Enrollment)
                 ├── Homework (Batch-targeted task)
                 └── Test (Assessment)
                        └── Marks (Anchored to Test + Enrollment)
```

---

## 3. The Core Architectural Decision: `Schedule` ≠ `BatchSession`

### 3.1 Schedule (The Recurring Blueprint)
- **`Schedule`** represents the recurring weekly blueprint (e.g., *"Class 10 Physics meets every Monday & Wednesday from 5:00 PM to 6:30 PM with Teacher X"*).
- Answers: *"When does this batch normally meet?"*
- Does **not** represent a class that actually occurred.

### 3.2 BatchSession (The Concrete Class Occurrence)
- **`BatchSession`** represents an actual calendar occurrence (e.g., *"Physics Class on Monday, Aug 17, 2026, 5:00 PM - 6:30 PM"*).
- Attendance, homework notes, substitute teachers, and session completion status belong to the **`BatchSession`**, not the abstract schedule.

```text
                    ┌─────────────────────────┐
                    │        Schedule         │
                    │ (Weekly Recurring Rule) │
                    └────────────┬────────────┘
                                 │
                                 ▼ [Session Generator]
      ┌──────────────────────────┼──────────────────────────┐
      ▼                          ▼                          ▼
BatchSession (Aug 17)      BatchSession (Aug 19)      BatchSession (Aug 24)
  Status: Completed          Status: Scheduled          Status: Cancelled
  AttendanceTaken: true      AttendanceTaken: false     SubstituteTeacher: Y
```

---

## 4. Operational Feature Specifications

### 4.1 Scheduling & Session Generation Engine

#### Session Lifecycle States
- **`scheduled`**: Initial state of a generated or manually created class session.
- **`completed`**: Session conducted successfully; attendance recorded.
- **`cancelled`**: Session cancelled (e.g., holiday or emergency).

#### Invariants & Rules
1. **Idempotent Session Generation:** Generating sessions for `(batchId, startDate, endDate)` multiple times returns existing sessions without duplicating records.
2. **Historical Preservation:** Updating or replacing a recurring `Schedule` affects future session generation ONLY. Historical generated `BatchSession` records remain immutable.
3. **Cancellation Invariant:** A session with status `cancelled` CANNOT receive attendance.
4. **Substitute Teacher:** A `substituteTeacherId` can override the default schedule teacher for a specific `BatchSession` without modifying the underlying weekly `Schedule`.

---

### 4.2 Session-Driven Attendance Core

#### The Operational Entity Relationship

```text
Institute
   └── Batch
        └── BatchSession (Date: Aug 17)
                 │
                 ├── Enrollment A (Student A)  ──► Attendance: PRESENT
                 ├── Enrollment B (Student B)  ──► Attendance: ABSENT
                 └── Enrollment C (Student C)  ──► Attendance: LATE
```

#### Key Attendance Rules
1. **Enrollment-Scoped:** Attendance is tied to `(sessionId, enrollmentId)`. If a student transfers out of a batch later, historical attendance remains correctly attached to their previous enrollment.
2. **Active Enrollment Boundary:** Only enrollments with status `active` at the time of the session are eligible for attendance.
3. **Atomic Bulk Submission (`RecordSessionAttendance`):** Attendance for a session is saved as a single atomic batch operation. Updating attendance updates records inside a single transaction and sets `batchSessions.attendanceTaken = true`.
4. **Attendance States:** `present`, `absent`, `late`.
5. **Source Extensibility:** MVP supports `manual`. The `rfid` enum value is preserved for future extension, but RFID hardware integration is strictly out of scope for Phase 2.

---

### 4.3 Batch-Targeted Homework Workflow

#### Lifecycle & States
- **`DRAFT`** (`publishedAt == null`): Created and editable by staff/teacher; hidden from parents/students.
- **`PUBLISHED`** (`publishedAt != null`): Finalized and published to the batch; triggers `academics.homework.published` event.

#### Invariants
1. Homework is batch-targeted (`batchId`). Individual student targeting is out of scope for MVP.
2. Attachment references use a storage abstraction link (`attachmentUrl`), preserving domain independence from specific storage providers.

---

### 4.4 Assessment & Bulk Marks Engine

#### Test Lifecycle State Machine

```text
    ┌─────────┐
    │  DRAFT  │ ──► Created by teacher; title & maxMarks defined.
    └────┬────┘
         │ publish schedule
         ▼
  ┌───────────┐
  │ SCHEDULED │ ──► Scheduled date confirmed; test announced.
  └──────┬────┘
         │ enter marks
         ▼
┌─────────────────┐
│ MARKS_ENTERED   │ ──► Marks submitted in bulk; undergoing review.
└────────┬────────┘
         │ approve & publish
         ▼
  ┌───────────┐
  │ PUBLISHED │ ──► Published; visible in parent/student reports.
  └───────────┘
```

#### Marks Business Invariants
1. **Numeric Bound:** `0 <= marksObtained <= test.maximumMarks`. Supported up to 2 decimal places.
2. **Batch Ownership Verification:** Every `enrollmentId` in a marks submission MUST belong to an active enrollment within `test.batchId`. Submissions containing cross-batch or cross-tenant enrollments are rejected with `ValidationError` / `AuthorizationError`.
3. **Bulk Marks Command (`EnterTestMarks`):** Marks are submitted via a single bulk payload and executed inside an atomic transaction.
4. **Explicit Publication (`PublishTestResults`):** Transitioning a test to `published` is an explicit domain command that emits `academics.test.published`. Published marks cannot be mutated silently.

---

## 5. Frozen Academic Domain Invariants (ACADEMIC-001 – ACADEMIC-015)

```text
ACADEMIC-001  Schedule represents a recurring weekly blueprint.
ACADEMIC-002  BatchSession represents an actual concrete class occurrence.
ACADEMIC-003  Attendance belongs strictly to (BatchSession + Enrollment).
ACADEMIC-004  Attendance never references a raw date or direct Student entity.
ACADEMIC-005  Submitted Enrollment must belong to the session's/test's target Batch.
ACADEMIC-006  All academic resources are tenant-scoped (WHERE institute_id = $1).
ACADEMIC-007  Client-supplied institute identity is never trusted for authorization.
ACADEMIC-008  A student receives academic records only through a valid active Enrollment.
ACADEMIC-009  Cancelled sessions (status = cancelled) cannot receive attendance.
ACADEMIC-010  Marks must satisfy: 0 <= marksObtained <= test.maximumMarks.
ACADEMIC-011  Published test results require an explicit PublishTestResults domain command.
ACADEMIC-012  Session generation (Schedule → BatchSessions) must be idempotent.
ACADEMIC-013  Schedule modifications do not rewrite historical generated sessions.
ACADEMIC-014  Academic domain code has ZERO imports from Next.js, Prisma, or storage SDKs.
ACADEMIC-015  Phase 2 explicitly excludes RFID hardware, WhatsApp, billing, Parent PWA,
              online exams, auto-grading, and room management.
```

---

## 6. Capability-Based Authorization Matrix

| Capability Resource | Action | Role: Owner | Role: Teacher | Role: Assistant | Role: Parent / Student |
| :--- | :--- | :---: | :---: | :---: | :---: |
| `academics:schedule` | `create` / `update` / `delete` | ✅ | ✅ (Assigned) | ❌ | ❌ |
| `academics:schedule` | `read` | ✅ | ✅ | ✅ | ✅ (Enrolled) |
| `academics:session` | `create` / `cancel` | ✅ | ✅ (Assigned) | ✅ | ❌ |
| `academics:session` | `read` | ✅ | ✅ | ✅ | ✅ |
| `academics:attendance` | `record` / `update` | ✅ | ✅ (Assigned) | ✅ | ❌ |
| `academics:attendance` | `read` | ✅ | ✅ | ✅ | ✅ (Own Child) |
| `academics:homework` | `create` / `publish` / `delete` | ✅ | ✅ (Assigned) | ✅ | ❌ |
| `academics:homework` | `read` | ✅ | ✅ | ✅ | ✅ (Enrolled) |
| `academics:test` | `create` / `update` / `delete` | ✅ | ✅ (Assigned) | ❌ | ❌ |
| `academics:marks` | `enter` / `update` | ✅ | ✅ (Assigned) | ✅ | ❌ |
| `academics:marks` | `publish` | ✅ | ✅ (Assigned) | ❌ | ❌ |
| `academics:marks` | `read` | ✅ | ✅ | ✅ | ✅ (Own Child) |

---

## 7. Structured Observability Events

Following standard `domain.action.result` conventions:

```text
academics.schedule.create.success
academics.session.generated.success
academics.session.cancelled.success
academics.attendance.recorded.success
academics.homework.published.success
academics.test.created.success
academics.marks.recorded.success
academics.marks.published.success
security.academics.authorization_denied
```

---

## 8. Subphase Implementation Roadmap for Phase 2

```text
PHASE 2 — ACADEMICS MODULE EXECUTION ROADMAP
  ├── Phase 2.0 — Architecture & Contract Freeze              🟢 ACCEPTED & FROZEN
  ├── Phase 2.1 — Scheduling & Session Engine (`Schedule` & `BatchSession`) 🟢 ACCEPTED & COMPLETED
  ├── Phase 2.2 — Session Attendance Core (`Attendance`)       🟢 ACCEPTED & COMPLETED
  ├── Phase 2.3 — Homework Workflow (`Homework`)               🟢 ACCEPTED & COMPLETED
  ├── Phase 2.4 — Assessment & Bulk Marks Engine (`Test` & `Marks`) 🟢 ACCEPTED & COMPLETED
  ├── Phase 2.5 — Protected Academics APIs (`/api/v1/academics/...`) 🟢 ACCEPTED & COMPLETED
  ├── Phase 2.6 — Staff Academic Workspace UI (Teacher & Staff Workspaces) ⏳ UPCOMING
  ├── Phase 2.7 — UX / Accessibility & Security E2E Matrix     ⏳ UPCOMING
  └── Phase 2.8 — Phase 2 Acceptance Gate & Milestone Freeze   ⏳ UPCOMING
```

---

## 9. Explicit Non-Goals for Phase 2

The following features are **strictly out of scope** for Phase 2:
- ❌ **Hardware RFID Device Integration** (Deferred to post-Phase 2).
- ❌ **Student Homework File Uploads & Online Submissions** (Out of scope for offline coaching).
- ❌ **AI Automated Test Grading / OCR Sheet Scanning** (Post-beta feature).
- ❌ **Video Streaming & LMS Content Hosting** (Explicit non-goal).
- ❌ **Parent PWA Views** (Handled in Phase 5).
- ❌ **Room Management & Complex Recurrence Rules** (Excluded from MVP).
