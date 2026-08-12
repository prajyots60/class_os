# ADR 0014: Student Enrollment Lifecycle Architecture

- **Status**: 🟢 **ACCEPTED & FROZEN** (Phase 1.11.0 Baseline)
- **Date**: 2026-08-12
- **Authors**: Senior Staff Architecture & Identity Team
- **Deciders**: Product & Engineering Core
- **Consulted**: SRS, SDD, DADD, ADR-0001, ADR-0010, ADR-0011, ADR-0012, ADR-0013
- **Informed**: All Implementation Engineers

---

## 1. Context & Problem Statement

CoachingOS has established foundational tenant identity, staff membership, parent CRM, student learner profiles, guardian-student relationships, and academic hierarchy aggregates across earlier phases (Phases 1.1–1.10):
1. **`Institute` (Phase 1.1 / ADR-0001)**: Multi-tenant organizational boundary.
2. **`InstituteMembership` (Phase 1.2 & 1.3 / ADR-0001 & Phase 1.3)**: Staff users, roles (`owner`, `teacher`, `assistant`), and capability RBAC.
3. **`ParentIdentity` & `InstituteParent` (Phases 1.6 & 1.7 / ADR-0009 & ADR-0010)**: Global parent platform identity and tenant CRM records.
4. **`Student` (Phase 1.8 / ADR-0011)**: Admitted learner profile and admission lifecycle state machine.
5. **`InstituteParentStudent` (Phase 1.9 / ADR-0012)**: First-class guardian-student relationship aggregate.
6. **`Program`, `Subject`, `ProgramSubject`, `Batch` (Phase 1.10 / ADR-0013)**: Tenant-scoped academic catalog, reusable subject mappings, and operational teaching batches.

To link admitted learners (`Student`) to operational teaching groups (`Batch`), CoachingOS requires an explicit **Student Enrollment Lifecycle Layer** (Phase 1.11).

### Key Architectural Challenges:
1. **First-Class Aggregate vs. Trivial Join Table**: Should Enrollment be modeled as a simple foreign key join or a dedicated, first-class domain aggregate with its own identity, tenant scope, lifecycle state machine, and audit trail?
2. **Separation of Lifecycles**: How to strictly decouple Student Admission (`Student.admissionStatus`), Batch Operational Status (`Batch.status`), and Enrollment Status (`Enrollment.status`) so that changes in one domain do not cause destructive implicit mutations in another?
3. **Multiple Enrollments & Re-enrollment**: How to support legitimate coaching scenarios where a student participates in multiple batches simultaneously (e.g. Physics Batch A and Math Batch B) or rejoins a batch after withdrawal without violating uniqueness or destroying history?
4. **Batch Transfer & Audit Trail Preservation**: How to handle student transfers between batches while preserving 100% of historical participation history (avoiding destructive overwrites of `batchId`)?
5. **Capacity & Concurrency Control**: How to enforce optional batch capacity limits (`Batch.capacity`) in a multi-tenant, concurrent SaaS environment without race conditions or naive `COUNT` + `INSERT` anti-patterns?
6. **Strict Boundary Enforcement**: Ensuring Phase 1.11 strictly limits scope to the operational membership link (`Student ─── Enrollment ─── Batch`) and excludes billing/fees (Phase 3+), attendance (Phase 2+), timetable, scheduling, exams, marks, messaging (Phase 4+), and parent portal behaviors (Phase 5+).

---

## 2. Architectural Decisions

### Decision 1: First-Class Tenant-Scoped Enrollment Aggregate

CoachingOS models **`Enrollment`** as a **first-class tenant-scoped aggregate root** in the domain layer.

`Enrollment` represents **"a student's operational participation in a specific teaching batch within an institute."**

```text
                       INSTITUTE TENANT
                              │
       ┌──────────────────────┼──────────────────────┐
       │                      │                      │
       ▼                      ▼                      ▼
    Student                 Batch                Enrollment
  (Learner)             (Teaching Group)    (Operational Link)
       │                      │                      │
       └───────────► ◄────────┴───────────► ◄────────┘
```

#### Aggregate Properties:
- **Identity**: `id` (UUID, primary key).
- **Tenant Scope**: `instituteId` (UUID, mandatory, server-derived from `TenantContext`).
- **Student Reference**: `studentId` (UUID, immutable link to admitted `Student`).
- **Batch Reference**: `batchId` (UUID, link to target operational `Batch`).
- **Lifecycle Status**: `status` (`pending`, `active`, `completed`, `withdrawn`, `transferred`, `cancelled`).
- **Lifecycle Timestamps**: `enrolledAt` (date of joining), `completedAt?`, `withdrawnAt?`, `transferredAt?`.
- **Transfer Audit References**: `transferredToEnrollmentId?` (link to new enrollment upon batch transfer), `transferredToBatchId?`.

#### Non-Responsibilities (Decoupling):
- `Enrollment` does **NOT** own billing plans, discounts, invoice schedules, or payment tracking (decoupled to Phase 3 Billing).
- `Enrollment` does **NOT** own attendance records, RFID scans, or absence tracking (decoupled to Phase 2+).
- `Enrollment` does **NOT** own parent identities, guardian contacts, or parent portal access rules (derived via `InstituteParentStudent` → `Student` → `Enrollment`).
- `Enrollment` does **NOT** assign staff teachers (teachers are assigned to `Batch` via Phase 1.10).

---

### Decision 2: Tripartite Lifecycle Separation

CoachingOS enforces strict separation across three distinct lifecycle state machines:

```text
1. Student Admission Lifecycle:   [PENDING] ──> [ADMITTED] ──> [REJECTED / CANCELLED]
                                                    │
2. Student Standing Lifecycle:                  [ACTIVE] <──> [INACTIVE] ──> [ARCHIVED]
                                                    │
                                                    ▼
3. Batch Operational Lifecycle:   [DRAFT] ──> [OPEN] ──> [RUNNING] ──> [COMPLETED] ──> [ARCHIVED]
                                                    │
                                                    ▼
4. Enrollment Lifecycle:          [PENDING] ──> [ACTIVE] ──> [COMPLETED]
                                                    │
                                                    ├──> [WITHDRAWN]
                                                    └──> [TRANSFERRED]
```

#### Lifecycle Interaction Rules:
1. **Student Admission Requirement**: An `Enrollment` can only be created if `Student.admissionStatus == 'admitted'` AND `Student.status == 'active'`. Students in `pending`, `rejected`, `cancelled`, `inactive`, or `archived` states cannot be newly enrolled.
2. **Batch Operational Requirement**: An `Enrollment` can only be created if `Batch.status == 'open'` OR `Batch.status == 'running'` (if mid-term enrollments are allowed by institute policy). Enrollments are **FORBIDDEN** for batches in `draft`, `completed`, or `archived` state.
3. **Independent Transitions**: Changing an `Enrollment.status` (e.g. `withdrawn` or `completed`) does **NOT** alter the `Student.status` or `Batch.status`. Conversely, archiving a `Batch` or `Student` does not physically erase past `Enrollment` records.

---

### Decision 3: Multiple Enrollments & Uniqueness Invariants

#### A. Multiple Batch Participation
A single `Student` **MAY** hold multiple active enrollments across different batches within the same institute (e.g., enrolled in *Physics Batch 2026-A* and *Mathematics Batch 2026-B* simultaneously).

#### B. Duplicate Enrollment Constraint
A `Student` **CANNOT** hold more than one `active` or `pending` enrollment in the **SAME** `Batch` at any given time.

#### Conceptual Database Constraint:
```sql
-- Partial unique index ensuring single active/pending enrollment per student per batch
CREATE UNIQUE INDEX "enrollment_active_student_batch_unique" 
ON "enrollments" ("institute_id", "student_id", "batch_id") 
WHERE "status" IN ('pending', 'active') AND "deleted_at" IS NULL;
```

#### C. Re-enrollment Policy
If a student withdraws (`status = 'withdrawn'`) or completes (`status = 'completed'`) a batch, and later rejoins the same batch:
- The system does **NOT** overwrite or mutate the historical `withdrawn`/`completed` record.
- The system creates a **NEW** `Enrollment` entity with `status = 'active'`, preserving full historical auditability of prior participation.

---

### Decision 4: Batch Transfer Policy (Option B — Historical Preservation)

Student batch transfer is a first-class atomic domain operation.

CoachingOS adopts **Option B — Atomic Historical Preservation** for batch transfers:

```text
BEFORE TRANSFER:
Enrollment A: { id: "enr-1", studentId: "stu-10", batchId: "batch-101", status: "active" }

AFTER ATOMIC TRANSFER (From Batch 101 to Batch 102):
Enrollment A (Preserved): { 
  id: "enr-1", 
  studentId: "stu-10", 
  batchId: "batch-101", 
  status: "transferred", 
  transferredAt: "2026-08-12T12:00:00Z",
  transferredToBatchId: "batch-102",
  transferredToEnrollmentId: "enr-2" 
}

Enrollment B (Created): { 
  id: "enr-2", 
  studentId: "stu-10", 
  batchId: "batch-102", 
  status: "active", 
  enrolledAt: "2026-08-12T12:00:00Z" 
}
```

#### Transfer Invariants:
1. **Source Enrollment Requirements**: Source enrollment must be in `active` state.
2. **Destination Batch Requirements**: Destination batch must be in `open` or `running` state and belong to the same institute (`instituteId`).
3. **Destination Capacity**: Destination batch capacity must be verified before transfer execution.
4. **Atomicity**: The source status transition to `transferred` and destination enrollment creation execute inside a single database transaction. If destination validation or creation fails, the entire transfer rolls back cleanly.
5. **Zero History Destruction**: Mutating `batchId` on an existing active enrollment is **STRICTLY FORBIDDEN**.

---

### Decision 5: Capacity & Concurrency Control Policy

Phase 1.10 introduced optional **`Batch.capacity`** (integer representing maximum allowed students).

#### A. Active Capacity Counting Formula
Only enrollments in **`active`** and **`pending`** states count toward batch capacity:
$$\text{Current Occupancy} = \text{COUNT}(\text{Enrollments WHERE } \text{batchId} = B \text{ AND } \text{status} \in ['pending', 'active'] \text{ AND } \text{deletedAt IS NULL})$$

`withdrawn`, `transferred`, `completed`, and `cancelled` enrollments do **NOT** consume capacity.

#### B. Concurrency Strategy (Atomic Enforcement)
To prevent race conditions during high-volume concurrent enrollment (e.g. two staff members enrolling the 30th student into a 30-capacity batch simultaneously), CoachingOS prohibits naive `SELECT COUNT` followed by `INSERT`.

**Production Concurrency Contract**:
Enrollment creation executes inside a Prisma `$transaction` with PostgreSQL row-level pessimistic locking on the `batches` table:
```ts
await prisma.$transaction(async (tx) => {
  // 1. Lock the batch row for update
  const [batch] = await tx.$queryRaw<Array<{ capacity: number | null; status: string }>>`
    SELECT capacity, status FROM batches 
    WHERE id = ${batchId}::uuid AND institute_id = ${tenantId}::uuid 
    FOR UPDATE
  `;

  if (!batch || (batch.status !== 'open' && batch.status !== 'running')) {
    throw new DomainError('BATCH_NOT_ELIGIBLE_FOR_ENROLLMENT');
  }

  if (batch.capacity !== null) {
    const activeCount = await tx.enrollment.count({
      where: {
        instituteId: tenantId,
        batchId,
        status: { in: ['pending', 'active'] },
        deletedAt: null,
      },
    });

    if (activeCount >= batch.capacity) {
      throw new DomainError('BATCH_CAPACITY_EXCEEDED');
    }
  }

  // 2. Create enrollment safely
  return await tx.enrollment.create({ ... });
});
```

---

### Decision 6: Tenant Isolation & Cross-Tenant Security Posture

1. **Server-Derived Scope**: All enrollment operations require `TenantContext.instituteId`, derived strictly from trusted session cookies (`ResolveInstituteMembershipUseCase`).
2. **Untrusted Client Inputs**: Request body, query parameters, or headers containing `instituteId`, `tenantId`, or `x-institute-id` are **strictly ignored or rejected**.
3. **Cross-Tenant Entity Verification**:
   - Creating an enrollment requires verifying that both `student.instituteId === TenantContext.instituteId` AND `batch.instituteId === TenantContext.instituteId`.
   - Accessing or mutating an `enrollmentId`, `studentId`, or `batchId` belonging to another institute returns a tenant-safe **`404 Not Found`** (never 403 or 409), preventing resource existence enumeration across tenants.

---

### Decision 7: Conceptual Authorization & Capability Matrix

Phase 1.11 defines the future enrollment capability taxonomy conceptually (to be registered in runtime during Phase 1.11.1+):

| Capability | Role: Owner | Role: Admin | Role: Teacher | Role: Assistant | Role: Parent |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `enrollment:read` | ✅ | ✅ | ✅ (Assigned Batches Only) | ✅ | ❌ (Derived via Child Link) |
| `enrollment:create` | ✅ | ✅ | ❌ | ✅ | ❌ |
| `enrollment:update` | ✅ | ✅ | ❌ | ✅ | ❌ |
| `enrollment:status` | ✅ | ✅ | ❌ | ✅ | ❌ |
| `enrollment:transfer` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `enrollment:archive` | ✅ | ❌ | ❌ | ❌ | ❌ |

#### Teacher Resource Scoping:
Teachers possess read access (`enrollment:read`) **ONLY** for batches where `batch.teacherId === membership.id`. Teachers cannot query or view student enrollments for unassigned batches across the institute.

#### Parent Derived Access:
Parents do **NOT** possess staff capabilities. Parent access to student enrollments is derived via:
$$\text{ParentIdentity} \xrightarrow{\text{Auth}} \text{InstituteParent} \xrightarrow{\text{CRM Link}} \text{InstituteParentStudent} \xrightarrow{\text{Student Link}} \text{Student} \xrightarrow{\text{Enrollment Link}} \text{Enrollment}$$
Parents may view read-only enrollment summaries for their linked children only.

---

### Decision 8: DTO Boundary & Anti-Recursion Rules

To prevent circular dependency serialization bugs and accidental data leakage:

1. **`EnrollmentDTO`**: Flat aggregate presentation structure.
   ```ts
   interface EnrollmentDTO {
     id: string;
     instituteId: string;
     studentId: string;
     batchId: string;
     status: 'pending' | 'active' | 'completed' | 'withdrawn' | 'transferred' | 'cancelled';
     enrolledAt: string; // ISO Date
     completedAt: string | null;
     withdrawnAt: string | null;
     transferredAt: string | null;
     transferredToBatchId: string | null;
     transferredToEnrollmentId: string | null;
     createdAt: string;
     updatedAt: string;
   }
   ```
2. **`StudentEnrollmentSummaryDTO`**: Exposes lightweight batch details (`batchId`, `batchName`, `batchCode`, `subjectName`, `programName`, `status`, `enrolledAt`) embedded inside student views.
3. **`BatchEnrollmentSummaryDTO`**: Exposes lightweight student details (`studentId`, `admissionNumber`, `firstName`, `lastName`, `status`, `enrolledAt`) embedded inside batch views.
4. **Anti-Recursion Mandate**: `StudentEnrollmentSummaryDTO` must **NEVER** contain nested student arrays, parent arrays, or full batch entities. `BatchEnrollmentSummaryDTO` must **NEVER** contain nested batch arrays or teacher aggregate graphs.

---

### Decision 9: Future API Boundary Specification (Conceptual)

The future API routes for Phase 1.11 (to be built in Phase 1.11.4) are defined as follows:

```text
POST   /api/institute/enrollments                - Create new student batch enrollment
GET    /api/institute/enrollments                - List paginated tenant enrollments (with filters)
GET    /api/institute/enrollments/[id]           - Retrieve detailed enrollment by ID
PATCH  /api/institute/enrollments/[id]           - Update non-lifecycle enrollment details
POST   /api/institute/enrollments/[id]/activate  - Transition enrollment from pending to active
POST   /api/institute/enrollments/[id]/withdraw  - Transition enrollment to withdrawn
POST   /api/institute/enrollments/[id]/complete  - Transition enrollment to completed
POST   /api/institute/enrollments/[id]/transfer  - Execute atomic batch transfer
DELETE /api/institute/enrollments/[id]           - Soft archive enrollment record

GET    /api/institute/students/[id]/enrollments - List enrollments for specific student
GET    /api/institute/batches/[id]/enrollments  - List student roster for specific batch
```

---

### Decision 10: PostgreSQL Database Schema Specification (Conceptual)

The future PostgreSQL schema contract for `enrollments` (to be updated in `schema.prisma` during Phase 1.11.2) is defined as:

```prisma
enum EnrollmentStatus {
  pending
  active
  completed
  withdrawn
  transferred
  cancelled
}

model Enrollment {
  id                        String           @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  instituteId               String           @map("institute_id") @db.Uuid
  studentId                 String           @map("student_id") @db.Uuid
  batchId                   String           @map("batch_id") @db.Uuid
  status                    EnrollmentStatus @default(pending)
  enrolledAt                DateTime         @default(now()) @map("enrolled_at") @db.Date
  completedAt               DateTime?        @map("completed_at")
  withdrawnAt               DateTime?        @map("withdrawn_at")
  transferredAt             DateTime?        @map("transferred_at")
  transferredToBatchId      String?          @map("transferred_to_batch_id") @db.Uuid
  transferredToEnrollmentId String?          @map("transferred_to_enrollment_id") @db.Uuid
  createdAt                 DateTime         @default(now()) @map("created_at")
  updatedAt                 DateTime         @updatedAt @map("updated_at")
  deletedAt                 DateTime?        @map("deleted_at")

  institute              Institute   @relation(fields: [instituteId], references: [id], onDelete: Cascade)
  student                Student     @relation(fields: [studentId], references: [id], onDelete: Restrict)
  batch                  Batch       @relation(fields: [batchId], references: [id], onDelete: Restrict)
  transferredToBatch     Batch?      @relation("TransferredToBatch", fields: [transferredToBatchId], references: [id], onDelete: SetNull)
  transferredToEnrollment Enrollment? @relation("TransferredToEnrollment", fields: [transferredToEnrollmentId], references: [id], onDelete: SetNull)
  previousEnrollments    Enrollment[] @relation("TransferredToEnrollment")

  @@index([instituteId, status])
  @@index([instituteId, studentId])
  @@index([instituteId, batchId])
  @@map("enrollments")
}
```

#### Cascade & Soft Deletion Policy:
- `instituteId`: `onDelete: Cascade` (Deleting an institute cleans up all child tenant records).
- `studentId`: `onDelete: Restrict` (Physical deletion of a student is blocked while enrollment records exist, preserving historical auditability).
- `batchId`: `onDelete: Restrict` (Physical deletion of a batch is blocked while active/historical enrollments exist).
- **Soft Archiving**: Enrollment records are soft-archived via `deletedAt` timestamps. Physical `DELETE` statements are prohibited in production runtime.

---

## 3. Threat Matrix (ENROLLMENT-01 through ENROLLMENT-24)

| Threat ID | Threat Description | Attack Vector | Expected Mitigation | Architectural Defense |
| :--- | :--- | :--- | :--- | :--- |
| `ENROLLMENT-01` | Unauthenticated Access | Anonymous request to `/api/institute/enrollments` | Returns 401 Unauthorized | Better Auth Session Guard |
| `ENROLLMENT-02` | Unauthorized Capability | Teacher attempting to create arbitrary enrollment | Returns 403 Forbidden | Capability Engine (`enrollment:create`) |
| `ENROLLMENT-03` | Cross-Tenant Lookup | Tenant A staff querying Tenant B enrollment ID | Returns 404 Not Found | Tenant-scoped SQL query filter (`WHERE institute_id = :tenantId`) |
| `ENROLLMENT-04` | Cross-Tenant Student Injection | Enrolling Tenant B student into Tenant A batch | Returns 404 Not Found | Scoped student existence check under caller `instituteId` |
| `ENROLLMENT-05` | Cross-Tenant Batch Injection | Enrolling Tenant A student into Tenant B batch | Returns 404 Not Found | Scoped batch existence check under caller `instituteId` |
| `ENROLLMENT-06` | Cross-Tenant Enrollment ID Injection | Mutating alien `enrollmentId` | Returns 404 Not Found | Scoped lookup on mutation statement |
| `ENROLLMENT-07` | `instituteId` Payload Spoofing | Client sends alien `instituteId` in JSON payload | Field ignored / Zod `.strict()` | `TenantContext.instituteId` server override |
| `ENROLLMENT-08` | Role / Header Spoofing | Request with spoofed `x-role` or `x-institute-id` | Headers ignored | Trusted server session cookie context resolution |
| `ENROLLMENT-09` | Duplicate Active Enrollment | Enrolling student into same batch twice | Returns 409 Conflict | Domain validation + Unique DB index |
| `ENROLLMENT-10` | Invalid Lifecycle Transition | Activating a completed/withdrawn enrollment | Returns 400 Bad Request | Domain aggregate transition state machine guard |
| `ENROLLMENT-11` | Invalid Student Admission State | Enrolling student with `admissionStatus = pending` | Returns 422 Unprocessable | Eligibility guard check (`student.admissionStatus === 'admitted'`) |
| `ENROLLMENT-12` | Invalid Student Standing State | Enrolling student with `status = archived` | Returns 422 Unprocessable | Eligibility guard check (`student.status === 'active'`) |
| `ENROLLMENT-13` | Invalid Batch Lifecycle State | Enrolling student into `draft` or `archived` batch | Returns 422 Unprocessable | Eligibility guard check (`batch.status IN ['open', 'running']`) |
| `ENROLLMENT-14` | Capacity Race Condition | Concurrent requests enrolling 31st student into 30-cap batch | Returns 409 Conflict / Capacity Exceeded | PostgreSQL `FOR UPDATE` row lock inside transaction |
| `ENROLLMENT-15` | Unauthorized Batch Transfer | Assistant executing batch transfer without transfer capability | Returns 403 Forbidden | Capability Engine (`enrollment:transfer`) |
| `ENROLLMENT-16` | Transfer History Destruction | Overwriting `batchId` directly via PATCH payload | Field immutable / Zod `.strict()` | Transfer Use Case enforced (creates new record) |
| `ENROLLMENT-17` | Recursive DTO Leakage | DTO exposing infinite nested aggregate trees | Serializer inspection | Flat `EnrollmentDTO` & summary DTOs only |
| `ENROLLMENT-18` | PII Leakage | Logging student contact details during enrollment | Pino log inspection | Pino redaction of student phone/email |
| `ENROLLMENT-19` | Parent Access Escalation | Parent attempting staff enrollment mutation | Returns 403 Forbidden | Capability check (`enrollment:create` absent for parent) |
| `ENROLLMENT-20` | Teacher Scope Escalation | Teacher viewing enrollments for unassigned batch | Returns 404 / Empty list | Resource-scoped query filter (`batch.teacherId == membership.id`) |
| `ENROLLMENT-21` | Enrollment Status Spoofing | Injecting `status = 'completed'` on creation payload | Field ignored / Zod `.strict()` | Default state `pending` / `active` set by use case |
| `ENROLLMENT-22` | Deleted / Archived Entity Misuse | Enrolling student into soft-deleted batch | Returns 404 Not Found | Filter `WHERE deleted_at IS NULL` |
| `ENROLLMENT-23` | Phase 1.12+ API Leakage | Exposing `/api/v1/enrollments` public route | Route absent | Excluded until Phase 1.12 |
| `ENROLLMENT-24` | Phase 2+ Feature Leakage | Accepting attendance or fee inputs in enrollment creation | Fields ignored / Zod `.strict()` | Excluded from Phase 1.11 domain model |

---

## 4. Observability & Logging Contract

All enrollment actions record Pino structured logs via `@coaching-os/observability`:

1. **Log Events**:
   - `identity.enrollment.create.success`
   - `identity.enrollment.activate.success`
   - `identity.enrollment.withdraw.success`
   - `identity.enrollment.complete.success`
   - `identity.enrollment.transfer.success`
   - `security.enrollment.authorization_denied`
   - `security.enrollment.cross_tenant_attempt`
2. **Log Metadata**: `actorUserId`, `instituteId`, `studentId`, `batchId`, `enrollmentId`, `operation`.
3. **PII Redaction Mandate**: Student phone, email, date of birth, address, and CRM notes are **STRICTLY REDACTED** from all log streams.

---

## 5. Explicit Exclusions (Phase Boundary)

The following features are **STRICTLY EXCLUDED** from Phase 1.11:
- ❌ Fee structures, billing plans, discounts, payment plans, invoices, receipts (Phase 3 Billing).
- ❌ Attendance marking, RFID integration, session attendance reports (Phase 2+).
- ❌ Class schedules, timetable generation, room allocation (Phase 2+).
- ❌ Examinations, tests, marks entry, report cards (Phase 2+).
- ❌ Messaging, SMS notifications, WhatsApp templates (Phase 4).
- ❌ Student PWA portal or parent portal self-enrollment (Phase 5).

---

## 6. Consequences & Impact Analysis

### Positive:
- Establishes a clean, immutable, and auditable history of student batch participation.
- Prevents data corruption during batch transfers and high-concurrency enrollment surges.
- Maintains 100% strict tenant isolation and default-deny capability authorization.
- Eliminates circular DTO recursion bugs before UI implementation.

### Negative / Trade-offs:
- Requires atomic transaction overhead for batch transfers and capacity checking.
- Requires multi-step query resolution for parent portal access in future phases (justified by domain decoupling).

---

## 7. Phase 1.11.0 Acceptance Criteria

Phase 1.11.0 is **ACCEPTED & FROZEN** when:
1. `ADR-0014` is completed, accepted, and stored in `docs/adr/0014-student-enrollment-lifecycle-architecture.md`.
2. `phase1.11-student-enrollment.md` is completed and stored in `docs/phases/phase1.11-student-enrollment.md`.
3. `docs/CONTEXT.md` is updated marking Phase 1.11.0 as `🟢 ACCEPTED & FROZEN`.
4. Threat Matrix (`ENROLLMENT-01` through `ENROLLMENT-24`) is documented.
5. **Zero runtime code, schema migrations, API routes, or UI components were created in Phase 1.11.0**.
6. All existing monorepo verification suites (`typecheck`, `test`, `lint`, `build`, `db:validate`, `db:health`, `db:drift:check`) pass 100%.
