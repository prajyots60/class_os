# Phase 1.10 — Academic Hierarchy (Programs, Subjects, Batches) Specification

- **Status**: 🟢 **Phase 1.10.0 — ACCEPTED & FROZEN**
- **Date**: 2026-08-12
- **Authors**: Senior Staff Architecture & Identity Team
- **Deciders**: Product & Engineering Core

---

## 1. Phase Objective

Phase 1.10 establishes the **Academic Hierarchy Layer** for CoachingOS.

It defines and models an institute's core academic hierarchy:
- **`Program`**: Institute-defined academic course or category (e.g. JEE 2027, NEET 2027, Class 10 Foundation).
- **`Subject`**: Institute-level reusable subject catalog (e.g. Physics, Chemistry, Mathematics, Biology).
- **`ProgramSubject`**: Explicit join mapping linking Subjects to Programs within an institute.
- **`Batch`**: Operational teaching group belonging to a Subject and optional Program, with a lean assigned teacher link.

### HARD BOUNDARY RULE
> **Phase 1.10 owns ONLY the Academic Hierarchy.**
> 
> **Phase 1.11 owns Student Enrollment Lifecycle.**
> 
> Phase 1.10 MUST NOT contain student enrollment fields (`studentId`, `batchId` on student, `enrollments` table) or student roster management.

---

## 2. Existing Architecture Dependencies

Phase 1.10 builds directly upon the following frozen architectural milestones:
- **Phase 1.1 / ADR-0001**: Institute Tenant Core (`Institute` entity and multi-tenant scoping).
- **Phase 1.2 & 1.3 / ADR-0001 & Phase 1.3**: Institute Memberships (`InstituteMembership`) and Capability-Based RBAC engine (`AuthorizationEngine`).
- **Phase 1.8 / ADR-0011**: Student Admission & Profile Core (`Student` entity — to be linked in Phase 1.11).
- **Phase 0.7**: Framework-Independent Error Taxonomy & Pino Observability (`@coaching-os/shared`, `@coaching-os/observability`).

---

## 3. Conceptual Model & Architecture

```text
                        INSTITUTE TENANT
                              │
         ┌────────────────────┼────────────────────┐
         │ 1:N                │ 1:N                │ 1:N
         ▼                    ▼                    ▼
      Program              Subject               Batch
  (Course Category)    (Subject Catalog)    (Teaching Group)
         │                    │                    │
         └─────────┐ ┌────────┘                    │
                   ▼ ▼                             │
             ProgramSubject                        │
             (Join Mapping)                        │
                                                   │
  Subject ─────────────────────────────────────────┼───► Batch
  Program (Optional) ──────────────────────────────┼───► Batch
  Teacher Membership (Optional) ───────────────────┘
```

---

## 4. Domain Invariants & Rules

### 1. Multi-Tenant Scoping Invariant
- Every `Program`, `Subject`, `ProgramSubject`, and `Batch` entity is **strictly tenant-scoped** by `instituteId`.
- Server-authoritative `TenantContext.instituteId` MUST be used across all domain repository calls.
- Query params, headers, or client request payload overrides of `instituteId` are strictly rejected.

### 2. Option B — Institute-Level Reusable Subject Model
- `Subject` belongs directly to `Institute` (`Institute ─── N Subject`).
- A `Program` maps to multiple `Subjects` via `ProgramSubject`.
- A `Subject` can map to multiple `Programs` within the same institute.
- Cross-institute program-subject mapping is strictly prohibited (`program.instituteId === subject.instituteId`).

### 3. Batch Hierarchy Invariants
- Each `Batch` MUST belong to a valid `Subject` within the same institute (`batch.subjectId`).
- If `Batch.programId` is specified, it MUST reference a valid `Program` within the same institute, AND `programId` + `subjectId` MUST exist in `ProgramSubject` mapping.
- If `Batch.teacherId` is specified, it MUST reference an active `InstituteMembership` in the same institute with staff/teacher authority (`role === 'owner' || role === 'teacher' || role === 'assistant'`).

### 4. Code & Name Uniqueness Invariants
- `Program`: `UNIQUE(instituteId, code)` and `UNIQUE(instituteId, name)` (case-insensitive, trimmed).
- `Subject`: `UNIQUE(instituteId, code)` and `UNIQUE(instituteId, name)` (case-insensitive, trimmed).
- `Batch`: `UNIQUE(instituteId, code)` and `UNIQUE(instituteId, subjectId, name)` (case-insensitive, trimmed).

---

## 5. Program Entity Contract & State Machine

### Entity Properties:
```typescript
export type ProgramStatus = 'draft' | 'active' | 'archived';

export interface ProgramProps {
  id: string;
  instituteId: string;
  name: string;
  code: string;
  description?: string | null;
  status: ProgramStatus;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}
```

### State Machine:
```text
  draft ──► active ──► archived
```
- `draft`: Program defined by staff, subjects being assigned.
- `active`: Operational program, open for batch creation.
- `archived`: Soft-archived program; immutable.

---

## 6. Subject Entity Contract & State Machine

### Entity Properties:
```typescript
export type SubjectStatus = 'draft' | 'active' | 'archived';

export interface SubjectProps {
  id: string;
  instituteId: string;
  name: string;
  code: string;
  description?: string | null;
  status: SubjectStatus;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}
```

### State Machine:
```text
  draft ──► active ──► archived
```
- `draft`: Subject defined in catalog.
- `active`: Active subject, available for program mapping and batch creation.
- `archived`: Soft-archived subject; cannot be mapped to new batches or programs.

---

## 7. ProgramSubject Join Mapping Contract

### Entity Properties:
```typescript
export interface ProgramSubjectProps {
  id: string;
  instituteId: string;
  programId: string;
  subjectId: string;
  createdAt: Date;
}
```

### Invariants:
- `UNIQUE(instituteId, programId, subjectId)`.
- Rejects mapping if `program.instituteId !== subject.instituteId`.

---

## 8. Batch Entity Contract & State Machine

### Entity Properties:
```typescript
export type BatchStatus = 'draft' | 'open' | 'running' | 'completed' | 'archived';

export interface BatchProps {
  id: string;
  instituteId: string;
  subjectId: string;
  programId?: string | null;
  teacherId?: string | null;
  name: string;
  code: string;
  capacity?: number | null;
  status: BatchStatus;
  startDate?: Date | null;
  endDate?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}
```

### State Machine:
```text
  draft ──► open ──► running ──► completed ──► archived
```
- `draft`: Batch being set up by staff.
- `open`: Ready for student enrollments (Phase 1.11).
- `running`: Classes currently active.
- `completed`: Term concluded; no new enrollments.
- `archived`: Soft-archived historical batch.

---

## 9. Teacher Assignment Boundary & Rules

1. `Batch.teacherId` is a single nullable reference to `InstituteMembership.id`.
2. The referenced member must be active (`status === 'active'`) and belong to `instituteId`.
3. Changing `teacherId` generates an audit event (`identity.batch.teacher_assigned`).
4. Complex multi-teacher scheduling, substitutions, and timetable slots are deferred to Phase 2+.

---

## 10. Database Schema Contract (Prisma Blueprint)

> **NOTE: Blueprint for Phase 1.10.2. DO NOT apply or modify schema in Phase 1.10.0.**

```prisma
enum ProgramStatus {
  draft
  active
  archived
}

enum SubjectStatus {
  draft
  active
  archived
}

enum BatchStatus {
  draft
  open
  running
  completed
  archived
}

model Program {
  id          String        @id @default(uuid())
  instituteId String        @map("institute_id")
  name        String        @db.VarChar(100)
  code        String        @db.VarChar(50)
  description String?       @db.VarChar(500)
  status      ProgramStatus @default(draft)
  createdAt   DateTime      @default(now()) @map("created_at")
  updatedAt   DateTime      @updatedAt @map("updated_at")
  deletedAt   DateTime?     @map("deleted_at")

  institute   Institute     @relation(fields: [instituteId], references: [id], onDelete: Restrict)
  subjects    ProgramSubject[]
  batches     Batch[]

  @@unique([instituteId, code])
  @@unique([instituteId, name])
  @@index([instituteId, status])
  @@map("programs")
}

model Subject {
  id          String        @id @default(uuid())
  instituteId String        @map("institute_id")
  name        String        @db.VarChar(100)
  code        String        @db.VarChar(50)
  description String?       @db.VarChar(500)
  status      SubjectStatus @default(draft)
  createdAt   DateTime      @default(now()) @map("created_at")
  updatedAt   DateTime      @updatedAt @map("updated_at")
  deletedAt   DateTime?     @map("deleted_at")

  institute   Institute     @relation(fields: [instituteId], references: [id], onDelete: Restrict)
  programs    ProgramSubject[]
  batches     Batch[]

  @@unique([instituteId, code])
  @@unique([instituteId, name])
  @@index([instituteId, status])
  @@map("subjects")
}

model ProgramSubject {
  id          String   @id @default(uuid())
  instituteId String   @map("institute_id")
  programId   String   @map("program_id")
  subjectId   String   @map("subject_id")
  createdAt   DateTime @default(now()) @map("created_at")

  institute   Institute @relation(fields: [instituteId], references: [id], onDelete: Restrict)
  program     Program   @relation(fields: [programId], references: [id], onDelete: Cascade)
  subject     Subject   @relation(fields: [subjectId], references: [id], onDelete: Cascade)

  @@unique([instituteId, programId, subjectId])
  @@index([instituteId, programId])
  @@index([instituteId, subjectId])
  @@map("program_subjects")
}

model Batch {
  id          String      @id @default(uuid())
  instituteId String      @map("institute_id")
  subjectId   String      @map("subject_id")
  programId   String?     @map("program_id")
  teacherId   String?     @map("teacher_id")
  name        String      @db.VarChar(100)
  code        String      @db.VarChar(50)
  capacity    Int?
  status      BatchStatus @default(draft)
  startDate   DateTime?   @map("start_date")
  endDate     DateTime?   @map("end_date")
  createdAt   DateTime    @default(now()) @map("created_at")
  updatedAt   DateTime    @updatedAt @map("updated_at")
  deletedAt   DateTime?   @map("deleted_at")

  institute   Institute            @relation(fields: [instituteId], references: [id], onDelete: Restrict)
  subject     Subject              @relation(fields: [subjectId], references: [id], onDelete: Restrict)
  program     Program?             @relation(fields: [programId], references: [id], onDelete: SetNull)
  teacher     InstituteMembership? @relation(fields: [teacherId], references: [id], onDelete: SetNull)

  @@unique([instituteId, code])
  @@unique([instituteId, subjectId, name])
  @@index([instituteId, status])
  @@index([instituteId, subjectId])
  @@index([instituteId, programId])
  @@index([instituteId, teacherId])
  @@map("batches")
}
```

---

## 11. Capability Taxonomy & Role Matrix

Phase 1.10 introduces **14 new granular capabilities**, raising total capabilities from 58 to **72**:

```text
program:read, program:create, program:update, program:archive
subject:read, subject:create, subject:update, subject:archive
batch:read, batch:create, batch:update, batch:archive, batch:status, batch:teacher
```

### Role Authorization Matrix:

| Role | Program Capabilities | Subject Capabilities | Batch Capabilities | Total Capabilities |
| :--- | :--- | :--- | :--- | :--- |
| **Owner** | All (`read`, `create`, `update`, `archive`) | All (`read`, `create`, `update`, `archive`) | All (`read`, `create`, `update`, `archive`, `status`, `teacher`) | **72** |
| **Teacher** | `read` | `read` | `read`, `update` (assigned batches), `status` | **32** |
| **Assistant**| `read` | `read` | `read`, `create`, `update` | **23** |
| **Parent** | `read` (when enrolled in Phase 1.11) | `read` (when enrolled) | `read` (when enrolled) | **10** |

---

## 12. Threat Matrix

| Threat ID | Category | Attack Vector | Security Countermeasure |
| :--- | :--- | :--- | :--- |
| **ACADEMIC-01** | Unauthenticated | Direct call to `/api/institute/programs` without session | `requireAuthSession` hard guard returning HTTP 401. |
| **ACADEMIC-02** | Authorization | Assistant trying to archive a Program | Capability guard `requireCapability('program:archive')` throws 403. |
| **ACADEMIC-03** | Cross-Tenant | Passing `programId` from Tenant B in Tenant A request | Repository enforces `where: { id: programId, instituteId }`, returning 404. |
| **ACADEMIC-04** | Cross-Tenant | Mapping Tenant B `subjectId` to Tenant A `programId` | Validation guard verifies `subject.instituteId === tenantContext.instituteId`. |
| **ACADEMIC-05** | Cross-Tenant | Assigning `teacherId` from Tenant B to Tenant A batch | Validation guard verifies `teacher.instituteId === tenantContext.instituteId`. |
| **ACADEMIC-06** | Injection | Body injection of `instituteId: "other"` | Zod DTO `.strict()` stripping/rejecting `instituteId`. |
| **ACADEMIC-07** | Integrity | Duplicate program code `"JEE-2027"` in same institute | PostgreSQL `@unique([instituteId, code])` throws 409 Conflict. |
| **ACADEMIC-08** | Integrity | Invalid batch state transition (`archived` ──► `running`) | Domain entity state machine guard throws `ValidationError`. |
| **ACADEMIC-09** | Integrity | Assigning non-existent `subjectId` to Batch | Foreign key `onDelete: Restrict` and pre-check return 404/400. |
| **ACADEMIC-10** | Race Condition | Concurrent batch creation with same code | PostgreSQL atomic transaction lock enforces single success. |
| **ACADEMIC-11** | Boundary Leak | Client injecting `studentId` into Batch creation | Batch DTO rejects student fields; enrollment deferred to Phase 1.11. |
| **ACADEMIC-12** | Info Leak | Exposing internal stack trace on DB constraint failure | Central `toErrorResponse` catches error and logs via Pino. |
| **ACADEMIC-13** | Soft-Delete | Mutating an archived Program or Subject | Repository/entity rejects updates on `status === 'archived'`. |
| **ACADEMIC-14** | Foreign Hierarchy | Batch referencing Program not containing Batch's Subject | Domain validator verifies `ProgramSubject` linkage exists. |

---

## 13. DTO Boundary Specifications

### 1. `ProgramDTO`
```typescript
export interface ProgramDTO {
  id: string;
  instituteId: string;
  name: string;
  code: string;
  description?: string | null;
  status: ProgramStatus;
  subjectCount?: number;
  batchCount?: number;
  createdAt: string;
  updatedAt: string;
}
```

### 2. `SubjectDTO`
```typescript
export interface SubjectDTO {
  id: string;
  instituteId: string;
  name: string;
  code: string;
  description?: string | null;
  status: SubjectStatus;
  programCount?: number;
  batchCount?: number;
  createdAt: string;
  updatedAt: string;
}
```

### 3. `BatchDTO`
```typescript
export interface BatchDTO {
  id: string;
  instituteId: string;
  subjectId: string;
  subjectName?: string;
  programId?: string | null;
  programName?: string | null;
  teacherId?: string | null;
  teacherName?: string | null;
  name: string;
  code: string;
  capacity?: number | null;
  status: BatchStatus;
  startDate?: string | null;
  endDate?: string | null;
  createdAt: string;
  updatedAt: string;
}
```

---

## 14. Observability Taxonomy

```text
identity.program.create.success
identity.program.update.success
identity.program.archive.success

identity.subject.create.success
identity.subject.update.success
identity.subject.archive.success

identity.program_subject.map.success
identity.program_subject.unmap.success

identity.batch.create.success
identity.batch.update.success
identity.batch.status_changed
identity.batch.teacher_assigned
identity.batch.archive.success
```

---

## 15. Hard Boundary Separation — Phase 1.11

```text
Phase 1.10 (THIS PHASE)                     Phase 1.11 (NEXT PHASE)
┌─────────────────────────┐               ┌─────────────────────────┐
│ Program                 │               │ Student (Phase 1.8)     │
│ Subject                 │               │           │             │
│ ProgramSubject          │               │           ▼             │
│ Batch                   │ ◄──────────── │       Enrollment        │
│ Teacher Link            │               │           │             │
└─────────────────────────┘               └─────────────────────────┘
```

---

## 16. Out of Scope

- Student Enrollment (Phase 1.11)
- Attendance tracking (Phase 2+)
- Fees & Billing (Phase 3+)
- Timetable & Scheduling (Phase 2+)
- Public API `/api/v1` (Phase 1.12)

---

## 17. Acceptance Criteria Checklist for Phase 1.10.0

- [x] Program definition & state machine frozen.
- [x] Option B Institute-level reusable Subject model frozen.
- [x] Batch entity, state machine, and lean primary teacher assignment frozen.
- [x] Capability matrix updated (14 new capabilities, 72 total).
- [x] Threat matrix (ACADEMIC-01 .. 14) documented.
- [x] DTO & Observability contracts defined.
- [x] Hard separation from Phase 1.11 Student Enrollment frozen.
- [x] Zero runtime code or schema modifications made during Phase 1.10.0.

---

## 18. Phase 1.10 Execution Roadmap

```text
Phase 1.10.0 — Architecture & Contract Freeze       🟢 ACCEPTED & FROZEN
Phase 1.10.1 — Domain Entities & Value Objects       🟢 COMPLETED
Phase 1.10.2 — Repository & PostgreSQL Persistence    🟢 COMPLETED
Phase 1.10.3 — Application Use Cases & Lifecycle      🟢 COMPLETED
Phase 1.10.4 — API Boundary & Validators              🟢 COMPLETED
Phase 1.10.5 — Security & Tenant Isolation E2E Matrix  🟢 COMPLETED
Phase 1.10.6 — Staff Academic Workspace UI            🟢 COMPLETED
Phase 1.10.7 — UX, Accessibility & Workflow Testing    🟢 COMPLETED
                 ↓
Phase 1.10.8 — Phase 1.10 Acceptance Gate & Freeze
                 ↓
             PHASE 1.11
      Student Enrollment Lifecycle
```
