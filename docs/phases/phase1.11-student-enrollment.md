# Phase 1.11 — Student Enrollment Lifecycle Specification

- **Status**: 🟢 **Phase 1.11.0 — ACCEPTED & FROZEN**
- **Date**: 2026-08-12
- **Authors**: Senior Staff Architecture & Identity Team
- **Deciders**: Product & Engineering Core
- **Consulted**: SRS, SDD, DADD, ADR-0001, ADR-0010, ADR-0011, ADR-0012, ADR-0013, ADR-0014

---

## 1. Phase Objective

Phase 1.11 introduces the **Student Enrollment Lifecycle Layer** to CoachingOS, enabling coaching institutes to enroll admitted students (`Student`) into operational teaching groups (`Batch`).

Enrollment is modeled as a **first-class tenant-scoped aggregate** (`Enrollment`) with an explicit lifecycle state machine, historical preservation on batch transfers, strict multi-tenant isolation, capacity race-condition protection, and default-deny capability authorization.

---

## 2. Current Architecture Context & Frozen Dependencies

Phase 1.11 builds upon 10 formally completed and frozen phases:
- **Phase 1.1 (Institute)**: Multi-tenant organizational baseline (`instituteId`).
- **Phase 1.2 & 1.3 (Users & RBAC)**: Capability-based authorization engine (72 capabilities registered to date).
- **Phase 1.6 & 1.7 (Parent Platform & CRM)**: Global `ParentIdentity` and tenant `InstituteParent` CRM records.
- **Phase 1.8 (Student Core / ADR-0011)**: Admitted learner aggregate (`Student`) and admission state machine (`pending` → `admitted` / `rejected` / `cancelled`).
- **Phase 1.9 (Guardian Relationships / ADR-0012)**: `InstituteParentStudent` junction aggregate.
- **Phase 1.10 (Academic Hierarchy / ADR-0013)**: `Program`, `Subject` (reusable catalog), `ProgramSubject`, and `Batch` (teaching groups).

---

## 3. Domain Model & Enrollment Aggregate

### 3.1 Domain Diagram

```text
                  Better Auth User (Authentication Authority)
                                     │
                                     ▼
           ParentIdentity (Global Platform Layer — Phone Anchored)
                                     │
               ┌─────────────────────┴─────────────────────┐
               ▼                                           ▼
     Institute A (Tenant A)                      Institute B (Tenant B)
               │                                           │
       ┌───────┼───────┐                           ┌───────┼───────┐
       ▼       ▼       ▼                           ▼       ▼       ▼
   Student   Batch  Enrollment                 Student   Batch  Enrollment
  (Admitted)(Group)  (Link A1)                (Admitted)(Group)  (Link B1)
```

### 3.2 Aggregate Field Classification

| Field | Type | Ownership | Mutability | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | UUID | System | Immutable | Aggregate Primary Key |
| `instituteId` | UUID | System (TenantContext) | Immutable | Mandatory Tenant Identifier |
| `studentId` | UUID | Client (Validated) | Immutable | Reference to admitted `Student` |
| `batchId` | UUID | Client (Validated) | Immutable | Reference to target `Batch` |
| `status` | Enum | Domain Use Case | State Machine | `pending`, `active`, `completed`, `withdrawn`, `transferred`, `cancelled` |
| `enrolledAt` | Date | Client/Server | Mutable (Admin) | Official date of enrollment |
| `completedAt` | DateTime? | Use Case | State Machine | Timestamp when batch completed |
| `withdrawnAt` | DateTime? | Use Case | State Machine | Timestamp when student withdrew |
| `transferredAt` | DateTime? | Use Case | State Machine | Timestamp when student transferred |
| `transferredToBatchId` | UUID? | Use Case | State Machine | Target batch ID upon transfer |
| `transferredToEnrollmentId` | UUID? | Use Case | State Machine | Target enrollment ID upon transfer |
| `createdAt` | DateTime | System | Immutable | Creation timestamp |
| `updatedAt` | DateTime | System | State Machine | Update timestamp |
| `deletedAt` | DateTime? | System | Use Case | Soft archive timestamp |

---

## 4. Enrollment Lifecycle & Transition Machine

```text
               ┌───────────────┐
               │    PENDING    │
               └───────┬───────┘
                       │ Activate
                       ▼
┌─────────────┐   Activate    ┌───────────────┐   Complete   ┌───────────────┐
│  CANCELLED  │ ◄──────────── │    ACTIVE     │ ───────────► │   COMPLETED   │
└─────────────┘               └───────┬───────┘              └───────────────┘
                                      │
                                      ├── Withdraw ───────►  ┌───────────────┐
                                      │                      │   WITHDRAWN   │
                                      │                      └───────────────┘
                                      └── Transfer ───────►  ┌───────────────┐
                                                             │  TRANSFERRED  │
                                                             └───────────────┘
```

### 4.1 Legal State Transitions

| From State | Trigger Action | To State | Mandatory Fields Updated |
| :--- | :--- | :--- | :--- |
| `pending` | `ActivateEnrollmentUseCase` | `active` | `enrolledAt = now()` |
| `pending` | `CancelEnrollmentUseCase` | `cancelled` | `updatedAt = now()` |
| `active` | `CompleteEnrollmentUseCase` | `completed` | `completedAt = now()` |
| `active` | `WithdrawEnrollmentUseCase` | `withdrawn` | `withdrawnAt = now()` |
| `active` | `TransferStudentBatchUseCase` | `transferred` | `transferredAt = now()`, `transferredToBatchId`, `transferredToEnrollmentId` |

### 4.2 Terminal & Invalid Transitions
- `completed`, `withdrawn`, `transferred`, and `cancelled` are **terminal states** for that specific enrollment record.
- Attempting to transition out of a terminal state raises `INVALID_ENROLLMENT_STATE_TRANSITION` (HTTP 400).
- If a student rejoins a batch after withdrawal, a **NEW** `Enrollment` instance is created with `status = 'active'`.

---

## 5. Domain Invariants & Business Rules

### 5.1 Student Eligibility Guards
1. **Admission Status Guard**: `student.admissionStatus` MUST be `admitted`. Pending, rejected, or cancelled students cannot be enrolled.
2. **Standing Status Guard**: `student.status` MUST be `active`. Inactive or archived students cannot be enrolled.

### 5.2 Batch Eligibility Guards
1. **Batch Status Guard**: `batch.status` MUST be `open` or `running`. Batches in `draft`, `completed`, or `archived` status reject enrollment attempts.
2. **Tenant Scoping Guard**: `student.instituteId` AND `batch.instituteId` MUST match the caller's `TenantContext.instituteId`.

### 5.3 Duplicate Enrollment Policy
- A student cannot hold more than one `active` or `pending` enrollment in the **SAME** `Batch` simultaneously.
- Attempting to double-enroll produces a `DUPLICATE_ENROLLMENT_CONFLICT` (HTTP 409).

### 5.4 Capacity & Concurrency Policy
- Active and pending enrollments count toward `Batch.capacity`.
- Enrollment creation executes inside a PostgreSQL `FOR UPDATE` row lock transaction to prevent concurrent over-enrollment race conditions.

### 5.5 Batch Transfer Policy (Historical Preservation)
- Executing a transfer atomically transitions the source enrollment to `transferred` and creates a new `active` enrollment in the target batch.
- Overwriting `batchId` on an existing active enrollment is strictly prohibited.

---

## 6. Multi-Tenant Security & Authorization Contract

### 6.1 Tenant Isolation Invariants
- `instituteId` is server-derived from trusted session cookies (`ResolveInstituteMembershipUseCase`).
- Client payloads, headers (`x-institute-id`), or query parameters claiming an `instituteId` are ignored/rejected via Zod `.strict()`.
- Cross-tenant lookups on `studentId`, `batchId`, or `enrollmentId` return `404 Not Found`.

### 6.2 Capability Matrix (Conceptual for Phase 1.11)

| Capability | Name | Description |
| :--- | :--- | :--- |
| `enrollment:read` | View Enrollments | View student batch enrollment lists and details |
| `enrollment:create` | Create Enrollment | Enroll an admitted student into an open batch |
| `enrollment:update` | Update Enrollment | Update non-lifecycle enrollment attributes |
| `enrollment:status` | Change Enrollment Status | Activate, withdraw, or complete an enrollment |
| `enrollment:transfer` | Transfer Batch | Execute atomic student batch transfer |
| `enrollment:archive` | Archive Enrollment | Soft-archive an enrollment record |

---

## 7. DTO Boundary & Presentation Specifications

### 7.1 `EnrollmentDTO`
```ts
export interface EnrollmentDTO {
  id: string;
  instituteId: string;
  studentId: string;
  batchId: string;
  status: 'pending' | 'active' | 'completed' | 'withdrawn' | 'transferred' | 'cancelled';
  enrolledAt: string;
  completedAt: string | null;
  withdrawnAt: string | null;
  transferredAt: string | null;
  transferredToBatchId: string | null;
  transferredToEnrollmentId: string | null;
  createdAt: string;
  updatedAt: string;
}
```

### 7.2 Anti-Recursion Rule
DTO serialization must remain flat. Nested relations (e.g. embedding full Student objects containing enrollment arrays) are prohibited to prevent memory leaks and circular reference errors.

---

## 8. Security Threat Matrix (ENROLLMENT-01 to ENROLLMENT-24)

| Threat ID | Description | Mitigation Strategy | HTTP Response |
| :--- | :--- | :--- | :---: |
| `ENROLLMENT-01` | Unauthenticated access | Better Auth Session Guard | 401 |
| `ENROLLMENT-02` | Unauthorized capability | Capability Engine check (`enrollment:create`) | 403 |
| `ENROLLMENT-03` | Cross-tenant lookup | SQL filter `WHERE institute_id = :tenantId` | 404 |
| `ENROLLMENT-04` | Cross-tenant student injection | Scoped lookup under caller `instituteId` | 404 |
| `ENROLLMENT-05` | Cross-tenant batch injection | Scoped lookup under caller `instituteId` | 404 |
| `ENROLLMENT-06` | Cross-tenant enrollment mutation | Scoped lookup on update query | 404 |
| `ENROLLMENT-07` | `instituteId` payload spoofing | Server session override + Zod `.strict()` | 400 / Ignored |
| `ENROLLMENT-08` | Role / Header spoofing | Session cookie context resolution | 401 / 403 |
| `ENROLLMENT-09` | Duplicate enrollment | Unique partial index + domain check | 409 |
| `ENROLLMENT-10` | Invalid state transition | State machine transition guard | 400 |
| `ENROLLMENT-11` | Unadmitted student enrollment | Eligibility check (`admissionStatus == admitted`) | 422 |
| `ENROLLMENT-12` | Inactive student enrollment | Eligibility check (`status == active`) | 422 |
| `ENROLLMENT-13` | Draft/Archived batch enrollment | Eligibility check (`batch.status IN [open, running]`) | 422 |
| `ENROLLMENT-14` | Capacity race condition | PostgreSQL `FOR UPDATE` lock inside transaction | 409 |
| `ENROLLMENT-15` | Unauthorized transfer | Capability Engine check (`enrollment:transfer`) | 403 |
| `ENROLLMENT-16` | History destruction | Atomic transfer pattern (creates new record) | N/A |
| `ENROLLMENT-17` | DTO circular recursion | Flat DTO serializers only | N/A |
| `ENROLLMENT-18` | Log PII leakage | Pino log redaction (`phone`, `email`, `dob`) | N/A |
| `ENROLLMENT-19` | Parent capability escalation | Default-deny parent capability checks | 403 |
| `ENROLLMENT-20` | Teacher scope escalation | Teacher resource scoping filter | 404 / Empty |
| `ENROLLMENT-21` | Status payload spoofing | Status set by server use case only | Ignored |
| `ENROLLMENT-22` | Soft-deleted entity misuse | Filter `WHERE deleted_at IS NULL` | 404 |
| `ENROLLMENT-23` | Public API leakage | Exclude `/api/v1` routes until Phase 1.12 | 404 |
| `ENROLLMENT-24` | Future phase feature leakage | Exclude fees, attendance, timetable fields | Ignored |

---

## 9. Phase Boundary & Explicit Non-Goals

The following functionality is **EXPLICITLY DEFERRED**:
- ❌ Fee structures, billing plans, invoice generation (Phase 3).
- ❌ Attendance tracking, RFID logs (Phase 2+).
- ❌ Timetables, schedules, room assignments (Phase 2+).
- ❌ Exams, test marks, report cards (Phase 2+).
- ❌ SMS, WhatsApp notifications, messaging (Phase 4).
- ❌ Parent portal self-enrollment (Phase 5).

---

## 10. Subphase Implementation Roadmap

```text
Phase 1.11.0 — Architecture & Contract Freeze 🟢 (ACCEPTED & FROZEN)
    ↓
Phase 1.11.1 — Enrollment Domain Entity & Value Objects 🟢 (COMPLETE)
Phase 1.11.2 — Repository & PostgreSQL Persistence 🟢 (COMPLETE)
    ↓
Phase 1.11.3 — Application Use Cases & Enrollment Lifecycle 🟢 (COMPLETE)
Phase 1.11.4 — API Boundary & Presentation Validators 🟢 (COMPLETE)
    ↓
Phase 1.11.5 — Security / Tenant Isolation E2E Matrix 🟢 (COMPLETE)
Phase 1.11.6 — Staff Enrollment UI ⏳ (UPCOMING)
    ↓
Phase 1.11.7 — UX / Accessibility / Workflow Testing ⏳ (UPCOMING)
Phase 1.11.8 — Phase 1.11 Acceptance Gate ⏳ (UPCOMING)
```
