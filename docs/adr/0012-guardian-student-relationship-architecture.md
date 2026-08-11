# ADR 0012: Guardian & Student Relationship Architecture

- **Status**: 🟢 **ACCEPTED & FROZEN** (Phase 1.9.0 Baseline)
- **Date**: 2026-08-11
- **Authors**: Senior Staff Architecture & Identity Team
- **Deciders**: Product & Engineering Core
- **Consulted**: SRS, SDD, DADD, ADR-0009, ADR-0010, ADR-0011
- **Informed**: All Implementation Engineers

---

## 1. Context & Problem Statement

CoachingOS has established three foundational identity and CRM aggregates across earlier phases:
1. **`ParentIdentity` (Phase 1.6 / ADR-0009)**: Global platform identity representing the real-world parent person anchored by canonical E.164 phone number.
2. **`InstituteParent` (Phase 1.7 / ADR-0010)**: Tenant-scoped parent CRM record containing institute-specific staff notes and local operational standing (`active`, `inactive`).
3. **`Student` (Phase 1.8 / ADR-0011)**: Tenant-scoped learner record containing learner profile details and admission/standing state machines (`admissionStatus`, `status`).

To support day-to-day coaching institute operations—such as identifying emergency contacts, primary guardians, billing recipients, and parent-student linkages—the system requires a formal relationship layer connecting parents and students.

### Key Architectural Challenges:
1. **Aggregate Isolation**: How to link parents and students without introducing direct foreign keys or state dependencies into `Student` (e.g. `student.parentId`) or `ParentIdentity` (e.g. `parent.studentId`).
2. **Multi-Tenant Boundaries**: Ensuring that relationships are strictly tenant-scoped (`instituteId`), preventing cross-tenant leakage or global relationship coupling.
3. **Relationship Taxonomy vs Institutional Authority**: Distinguishing family/biological relationships (e.g. `father`, `mother`, `guardian`) from institutional permissions (e.g. primary contact, portal access, pickup authorization).
4. **Cardinality & Primary Guardian Invariants**: Supporting N:M relationships (a parent can have multiple students; a student can have multiple guardians) while enforcing a strict single primary guardian invariant per student.

---

## 2. Architectural Decisions

### Decision 1: Dedicated Tenant-Scoped Junction Aggregate (`InstituteParentStudent`)

CoachingOS explicitly rejects attaching parent reference fields directly to `Student` or student reference arrays to `InstituteParent` / `ParentIdentity`. 

Instead, CoachingOS establishes `InstituteParentStudent` as a **first-class, tenant-scoped aggregate** bridging `InstituteParent` and `Student` within a specific institute:

```text
                     GLOBAL PLATFORM LAYER
                               │
                         ParentIdentity
                               │
                               │ 1:N Across Institutes
                               ▼
                    INSTITUTE TENANT LAYER
                        InstituteParent (CRM)
                               │
                               │ 1:N
                               ▼
                     InstituteParentStudent
                    (Tenant Relationship)
                               ▲
                               │ N:1
                               │
                            Student
```

#### Boundary Invariants:
- `ParentIdentity` remains 100% global and has zero knowledge of tenant relationships.
- `InstituteParent` remains tenant CRM data and does not hardcode student arrays.
- `Student` remains the learner aggregate and does not hardcode parent/guardian IDs.
- `InstituteParentStudent` owns all relationship metadata (`relationshipType`, `isPrimary`, `status`, `createdAt`, `updatedAt`, `deletedAt`).

---

### Decision 2: Entity & Field Ownership Matrix

To eliminate boundary confusion, field ownership is strictly partitioned:

| Domain Field | Entity / Aggregate Owner | Scope | Rationale / Boundary |
| :--- | :--- | :--- | :--- |
| `phone`, `globalName`, `avatar` | `ParentIdentity` | **GLOBAL** | Global parent identity; shared across institutes. |
| `staffNotes`, `tenantStatus` | `InstituteParent` | **TENANT** | Institute staff CRM record & internal notes. |
| `admissionNumber`, `firstName`, `dob`, `gender` | `Student` | **TENANT** | Learner identity & academic profile. |
| `relationshipType`, `isPrimary`, `status` | `InstituteParentStudent` | **TENANT** | Specific linkage between parent CRM & student. |

---

### Decision 3: Relationship Taxonomy vs Institutional Authority Separation

CoachingOS explicitly separates three distinct concepts:
1. **Family / Biological Relationship (`relationshipType`)**: Domain classification (`father`, `mother`, `guardian`, `stepfather`, `stepmother`, `grandparent`, `sibling`, `other`).
2. **Institutional Primary Contact (`isPrimary`)**: Boolean flag indicating the primary point of contact for institute notifications and administrative matters.
3. **Portal Access & Operational Permissions (Deferred)**: Access rights for the future Parent PWA (Phase 5+), pickup authorization, custody flags, and fee responsibility are explicitly **deferred** and must NOT be embedded in Phase 1.9.

---

### Decision 4: Cardinality & Uniqueness Invariants

1. **N:M Multi-Linking**:
   - One `InstituteParent` may be linked to multiple `Student` records within the same institute.
   - One `Student` may be linked to multiple `InstituteParent` records within the same institute.
2. **Single Relationship per Pair**:
   - An `InstituteParent` and a `Student` can have at most **ONE** relationship record between them.
   - Enforced by composite uniqueness: `UNIQUE(instituteId, instituteParentId, studentId)`.
3. **Single Primary Guardian per Student**:
   - A `Student` may have at most **ONE** primary guardian (`isPrimary === true`) within an institute.
   - Enforced by partial index / application invariant: `UNIQUE(instituteId, studentId) WHERE isPrimary = true AND status = 'active'`.

---

### Decision 5: Lifecycle Independence

The relationship aggregate maintains its own independent status lifecycle (`active`, `archived`):
- Archiving or inactivating an `InstituteParentStudent` relationship **MUST NEVER**:
  1. Deactivate or alter the global `ParentIdentity`.
  2. Inactivate or archive the `InstituteParent` CRM record.
  3. Deactivate, reject, or archive the `Student` aggregate.
- **Cross-Entity State Cascade Rules**:
  - If `InstituteParent` is archived, linked `InstituteParentStudent` relationships remain retained in database history but become non-operational / read-only.
  - If `Student` is archived, linked `InstituteParentStudent` relationships become non-operational / read-only.
  - If global `ParentIdentity` is suspended/deactivated, tenant access via memberships is revoked, but local `InstituteParentStudent` records are NOT deleted.

---

### Decision 6: Server-Authoritative Tenant Isolation

All relationship operations MUST be authorized under trusted server-side `TenantContext`.
- Client-supplied `instituteId`, `tenantId`, or role parameters in body payloads, query parameters, or HTTP headers are **strictly ignored**.
- All repository operations MUST require `instituteId` as their first parameter.
- Both `instituteParentId` and `studentId` passed during creation/modification MUST be validated to ensure they belong to the SAME `instituteId` resolved from `TenantContext`.

---

### Decision 7: Capability-Based Authorization (RBAC)

Relationship management is governed strictly by the existing CoachingOS capability engine (`@coaching-os/identity`):
- `guardian:read` — View parent-student relationships within tenant.
- `guardian:create` — Create parent-student relationships within tenant.
- `guardian:update` — Modify relationship metadata and primary guardian designation.
- `guardian:archive` — Soft-archive relationships within tenant.

#### Role Capability Matrix:
- `owner`: All 4 capabilities (`guardian:read`, `guardian:create`, `guardian:update`, `guardian:archive`).
- `teacher`: `guardian:read` only.
- `assistant`: `guardian:read`, `guardian:create`, `guardian:update`.
- `parent`: Zero staff CRM capabilities. (Parent self-service is handled via dedicated Parent PWA contracts in Phase 5+).

---

### Decision 8: Privacy & Anti-Recursion DTO Boundaries

To prevent infinite recursion and data leakage:
- `StudentDTO` may include a lightweight summary list of linked guardians (`StudentGuardianSummaryDTO[]`: `id`, `relationshipId`, `relationshipType`, `isPrimary`, `parentName`, `parentPhone`).
- `InstituteParentDTO` may include a lightweight summary list of linked students (`ParentStudentSummaryDTO[]`: `id`, `relationshipId`, `relationshipType`, `isPrimary`, `studentName`, `admissionNumber`).
- Dedicated relationship endpoints return `InstituteParentStudentDTO`.
- Recursive nested expansion (`Student ➔ Parent ➔ Students ➔ Parents`) is strictly prohibited.

---

## 3. Strategic Consequences

### Positive
- **Clean Architecture**: Preserves strict aggregate boundaries across `ParentIdentity`, `InstituteParent`, `Student`, and `InstituteParentStudent`.
- **Multi-Tenant Safety**: Guarantees zero cross-tenant data leakage or global aggregate mutation.
- **Operational Precision**: Disambiguates family relationship classification from primary contact authority.
- **Audit & Regulatory Compliance**: Maintains complete relational trail without destructive hard-deletions.

### Trade-offs & Mitigations
- **Database Schema Evolution**: Existing `schema.prisma` `InstituteParentStudent` model (which currently uses `@@id([instituteParentId, studentId])`) will need `id`, `instituteId`, `isPrimary`, `status`, `createdAt`, `updatedAt`, `deletedAt` added during runtime implementation (Phase 1.9.2).
- **Application Validation Overhead**: Creating a relationship requires verifying tenant ownership for both parent and student records within a single database transaction.

---

## 4. Explicit Non-Goals & Deferrals

The following are explicitly excluded from Phase 1.9:
- Parent Portal PWA access control or authentication logic (Phase 5).
- Student Portal access (Phase 5).
- Messaging, SMS, WhatsApp, or email notification triggers (Phase 4).
- Legal custody documentation or pickup authorization management.
- Fee responsibility, payment ownership, or invoice assignment (Phase 3).
- Academic batch/program enrollment management (Phase 1.10 & 1.11).

---

## 5. Decision Status

🟢 **ACCEPTED & FROZEN** — Authoritative baseline for Phase 1.9 implementation (Subphases 1.9.1 – 1.9.9).
