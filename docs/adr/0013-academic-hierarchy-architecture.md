# ADR 0013: Academic Hierarchy Architecture (Programs, Subjects, Batches)

- **Status**: 🟢 **ACCEPTED & FROZEN** (Phase 1.10.0 Baseline)
- **Date**: 2026-08-12
- **Authors**: Senior Staff Architecture & Identity Team
- **Deciders**: Product & Engineering Core
- **Consulted**: SRS, SDD, DADD, ADR-0001, ADR-0009, ADR-0010, ADR-0011, ADR-0012
- **Informed**: All Implementation Engineers

---

## 1. Context & Problem Statement

CoachingOS has established foundational tenant identity, staff membership, parent CRM, student learner profiles, and guardian-student relationship aggregates across earlier phases (Phases 1.1–1.9):
1. **`Institute` (Phase 1.1 / ADR-0001)**: Multi-tenant organizational boundary.
2. **`InstituteMembership` (Phase 1.2 & 1.3 / ADR-0001 & Phase 1.3)**: Staff users, roles (`owner`, `teacher`, `assistant`), and capability RBAC.
3. **`ParentIdentity` & `InstituteParent` (Phases 1.6 & 1.7 / ADR-0009 & ADR-0010)**: Global parent platform identity and tenant CRM records.
4. **`Student` (Phase 1.8 / ADR-0011)**: Learner profile and admission lifecycle state machine.
5. **`InstituteParentStudent` (Phase 1.9 / ADR-0012)**: First-class guardian-student relationship aggregate.

To enable academic operations—such as organizing courses, defining subjects, assigning teachers to teaching batches, and preparing for student course enrollments—CoachingOS requires an explicit **Academic Hierarchy Layer**.

### Key Architectural Challenges:
1. **Subject Reusability vs Program Coupling**: Should a `Subject` (e.g. Physics, Chemistry, Mathematics) be strictly owned by a single `Program`, or exist at the `Institute` level and be reusable across multiple programs?
2. **Batch Granularity & Teacher Assignment**: How should a teaching group (`Batch`) relate to subjects, programs, and staff teachers without prematurely introducing a full timetable/scheduling engine?
3. **Batch Lifecycle Independency**: How to model the operational state of a batch (drafting, opening for enrollment, actively running, completed, archived) independently of student rosters, before Student Enrollment (Phase 1.11) exists.
4. **Strict Boundary Separation**: Ensuring that Phase 1.10 owns *only* the academic hierarchy (Programs, Subjects, Batches, Teacher Links) and strictly excludes Student Enrollment (Phase 1.11), attendance (Phase 2+), fees (Phase 3+), and timetable/scheduling.

---

## 2. Architectural Decisions

### Decision 1: Multi-Tenant Academic Boundary Isolation

All academic entities (`Program`, `Subject`, `Batch`, `ProgramSubject`) are **strictly tenant-scoped** by `instituteId`. 

There is **zero global shared academic catalog** across coaching institutes in CoachingOS.

```text
                       INSTITUTE TENANT
                              │
       ┌──────────────────────┼──────────────────────┐
       │                      │                      │
       ▼                      ▼                      ▼
  Program Aggregate      Subject Aggregate      Batch Aggregate
 (Institute-Scoped)     (Institute-Scoped)     (Institute-Scoped)
```

#### Boundary Invariants:
- Tenant context is always derived server-side via trusted `TenantContext.instituteId`.
- API endpoints and repositories reject client-provided `instituteId`, `tenantId`, `x-institute-id`, or query parameters.
- Cross-tenant lookups or cross-tenant entity references return `404 Not Found`.

---

### Decision 2: Institute-Level Reusable Subject Model (`Institute ─── N Subject`)

CoachingOS adopts **Option B — Institute-Level Reusable Subject Model**.

Rather than forcing `Subject` to be hard-bound to a single `Program` (`Program 1 ─── N Subject`), `Subject` is modeled as an **independent aggregate belonging directly to the Institute** (`Institute 1 ─── N Subject`).

Programs link to Subjects through an explicit, tenant-scoped join model (`ProgramSubject`):

```text
               Institute
                   │
         ┌─────────┴─────────┐
         │ 1:N               │ 1:N
         ▼                   ▼
      Program             Subject
         │                   │
         └───────► ◄─────────┘
             ProgramSubject
            (Join Mapping)
```

#### Architectural Rationale:
- In coaching institutes, core subjects like *Physics*, *Chemistry*, *Mathematics*, or *Biology* are taught across multiple course offerings (e.g., *JEE 2027*, *NEET 2027*, *Class 11 Foundation*).
- Hard-coupling `Subject` to `Program` would force institutes to create duplicate records ("Physics - JEE", "Physics - NEET"), fragmenting future question banks, assessment analytics, and teacher assignment reporting.
- An institute creates its canonical subject catalog once (`Subject`), then associates subjects with programs via `ProgramSubject`.

---

### Decision 3: Batch Aggregate & Subject Linkage

A `Batch` represents an operational teaching group within an institute. 

Each `Batch` is a **first-class aggregate root** that belongs directly to a single `Subject` (`subjectId`) and optionally references a `Program` (`programId`):

```text
Program (Optional) ◄──────┐
                          │
Subject ──────────────────┼───► Batch (Operational Teaching Group)
                          │
Teacher (User/Membership) ◄┘
```

#### Invariants & Cardinality:
1. `Batch` ──► `Subject`: Required 1:1 link (`subjectId`). A batch must be associated with a valid, active Subject in the same institute.
2. `Batch` ──► `Program`: Optional 1:1 link (`programId`). If specified, `programId` must be valid, active, and linked to the batch's `subjectId` via `ProgramSubject`.
3. `Batch` ──► `Institute`: Required 1:1 link (`instituteId`).

---

### Decision 4: Lean Primary Teacher Assignment Link

To keep Phase 1.10 focused while providing clear teacher accountability, a `Batch` includes a **lean primary teacher reference** (`teacherId?: string`).

```text
Batch.teacherId ──► InstituteMembership (role = 'owner' | 'teacher')
```

#### Invariants & Rules:
1. `teacherId` references a valid, active `InstituteMembership` record within the **same institute**.
2. The referenced member must possess teacher/staff authority (`role === 'owner' || role === 'teacher' || role === 'assistant'`).
3. Multi-teacher co-teaching lists, assistant teacher rosters, substitution tracking, and timetable schedules are explicitly **deferred** to Phase 2+ (Timetable & Scheduling).

---

### Decision 5: Operational Batch State Machine

The `Batch` aggregate defines an independent operational state machine governing class lifecycle before and after student enrollment:

```text
             ┌─────────┐
             │  draft  │ (Configuring batch details & teacher)
             └────┬────┘
                  │
                  ▼
             ┌─────────┐
             │  open   │ (Open for prospective enrollment - Phase 1.11)
             └────┬────┘
                  │
                  ▼
             ┌─────────┐
             │ running │ (Classes actively underway)
             └────┬────┘
                  │
                  ▼
             ┌─────────┐
             │completed│ (Coursework finished; no new enrollments)
             └────┬────┘
                  │
                  ▼
             ┌─────────┐
             │archived │ (Soft-archived historical record)
             └─────────┘
```

#### State Transition Rules:
- `draft` ──► `open`: Configuration complete; ready for student enrollment.
- `open` ──► `running`: Classes have commenced.
- `running` ──► `completed`: Coursework concluded.
- `*` ──► `archived`: Soft-archived for record preservation.
- **Terminal States**: `archived` states cannot be mutated back to `running` or `draft`.

---

### Decision 6: Hard Separation from Student Enrollment (Phase 1.11 Boundary)

Phase 1.10 **STRICTLY PROHIBITS** any student enrollment data structures.

There are:
- NO `studentId` fields in `Batch`.
- NO `batchId` fields in `Student`.
- NO `Enrollment`, `StudentBatch`, or `BatchStudent` models in Phase 1.10.

Phase 1.11 will introduce the `Enrollment` aggregate bridging `Student` to `Batch`:

```text
Student (Phase 1.8) ───► Enrollment (Phase 1.11) ───► Batch (Phase 1.10)
```

---

### Decision 7: Restrict Delete & Soft-Archive Preservation

Academic records carry long-term compliance, historical, and future financial audit significance.

1. **Program / Subject Deletion**: Hard deletion is forbidden if dependent `ProgramSubject` mappings, active `Batch` records, or future `Enrollment` records exist. Soft-archiving (`status = 'archived'`) must be used.
2. **Batch Deletion**: Hard deletion is forbidden once a Batch transitions beyond `draft` state or has linked historical data.

---

## 3. Summary Matrix of Entities

| Entity Name | Aggregate Type | Key Fields | Primary Unique Constraints | Soft-Delete / Lifecycle |
| :--- | :--- | :--- | :--- | :--- |
| **`Program`** | Root Aggregate | `id`, `instituteId`, `name`, `code`, `status` | `UNIQUE(instituteId, code)`, `UNIQUE(instituteId, name)` | `status`: `draft`, `active`, `archived` |
| **`Subject`** | Root Aggregate | `id`, `instituteId`, `name`, `code`, `status` | `UNIQUE(instituteId, code)`, `UNIQUE(instituteId, name)` | `status`: `draft`, `active`, `archived` |
| **`ProgramSubject`** | Child Join Entity | `id`, `instituteId`, `programId`, `subjectId` | `UNIQUE(instituteId, programId, subjectId)` | Hard deleted on disassociation |
| **`Batch`** | Root Aggregate | `id`, `instituteId`, `subjectId`, `programId?`, `teacherId?`, `name`, `code`, `capacity`, `status`, `startDate`, `endDate` | `UNIQUE(instituteId, code)`, `UNIQUE(instituteId, subjectId, name)` | `status`: `draft`, `open`, `running`, `completed`, `archived` |

---

## 4. Consequences & Status

- **Status**: 🟢 **ACCEPTED & FROZEN** (Phase 1.10.0 Baseline)
- **Runtime Code Impact**: `0 lines modified` (Architecture Freeze Phase).
- **Next Phase**: Phase 1.10.1 (Academic Hierarchy Domain Entity & Value Objects).
