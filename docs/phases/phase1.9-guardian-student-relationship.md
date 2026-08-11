# Phase 1.9 — Guardian / Student Relationship Layer Specification

- **Status**: 🟢 **Phase 1.9.0 — ACCEPTED & FROZEN**
- **Date**: 2026-08-11
- **Authors**: Senior Staff Architecture & Identity Team
- **Deciders**: Product & Engineering Core

---

## 1. Phase Objective

Phase 1.9 establishes the **Guardian & Student Relationship Layer** for CoachingOS.

It defines and implements the tenant-scoped domain relationship aggregate (`InstituteParentStudent`) connecting an institute's parent CRM records (`InstituteParent`) with learner profiles (`Student`).

This layer enables coaching institute staff to manage student family links, designate primary guardians, maintain emergency contact relationships, and track guardian historical associations while strictly preserving multi-tenant security, capability-based RBAC, privacy boundaries, and global identity sovereignty.

---

## 2. Existing Architecture Dependencies

Phase 1.9 builds directly upon the following frozen architectural milestones:
- **Phase 1.6 / ADR-0009**: Global `ParentIdentity` Platform Layer (phone-anchored platform identity).
- **Phase 1.7 / ADR-0010**: Tenant `InstituteParent` CRM Layer (tenant parent CRM record & staff notes).
- **Phase 1.8 / ADR-0011**: Tenant `Student` Admission & Profile Core (tenant learner profile & state machines).
- **Phase 1.3**: Capability-Based RBAC Engine (`@coaching-os/identity`).
- **Phase 0.7**: Framework-Independent Error Taxonomy & Pino Observability (`@coaching-os/shared`, `@coaching-os/observability`).

---

## 3. Conceptual Model & Architecture

```text
                               GLOBAL PLATFORM LAYER
                                         │
                                   ParentIdentity
                                   (Phone-Anchored)
                                         │
                                         │ 1:N Link Across Institutes
                                         ▼
                              INSTITUTE TENANT LAYER
                                  InstituteParent
                             (Institute CRM & Staff Notes)
                                         │
                                         │ 1:N
                                         ▼
                               InstituteParentStudent
                             (Tenant Relationship Aggregate)
                                         ▲
                                         │ N:1
                                         │
                                      Student
                             (Learner Admission & Profile)
```

### Scope Partitioning:
- `ParentIdentity` = **GLOBAL** (Platform-owned)
- `InstituteParent` = **TENANT** (Institute CRM record)
- `Student` = **TENANT** (Institute learner aggregate)
- `InstituteParentStudent` = **TENANT** (Institute relationship aggregate)

---

## 4. Domain Contract & Invariants

1. **No Direct Entity Foreign Key Leaks**:
   - `Student` aggregates MUST NOT contain `parentId`, `parentIdentityId`, or `guardianId` fields.
   - `InstituteParent` aggregates MUST NOT contain `studentId` or `students[]` arrays.
   - `ParentIdentity` aggregates MUST NOT contain tenant student reference arrays.
2. **Tenant Scoping Requirement**:
   - Every `InstituteParentStudent` record MUST possess a non-null `instituteId` matching both the `InstituteParent.instituteId` and `Student.instituteId`.
3. **Cross-Tenant Linking Prohibition**:
   - An `InstituteParent` from Tenant A MUST NEVER be linked to a `Student` from Tenant B under any circumstance.
4. **Primary Guardian Invariant**:
   - A `Student` may have at most ONE primary guardian (`isPrimary === true` and `status === 'active'`) within a single institute tenant.

---

## 5. Relationship Entity Contract (`InstituteParentStudentEntity`)

The conceptual domain entity encapsulates all relationship properties and invariants:

```typescript
export interface InstituteParentStudentProps {
  id: string;
  instituteId: string;
  instituteParentId: string;
  studentId: string;
  relationshipType: GuardianRelationshipType;
  isPrimary: boolean;
  status: GuardianRelationshipStatus;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}
```

### State Mutation Methods:
- `setPrimary(isPrimary: boolean)`: Updates primary status.
- `updateRelationshipType(type: GuardianRelationshipType)`: Changes relationship taxonomy type.
- `archive()`: Transitions relationship status to `archived` and sets `deletedAt`.
- `reactivate()`: Transitions relationship status back to `active`.

---

## 6. Field Classification & Ownership Matrix

| Field | Aggregate Owner | Scope | Mutability | Privacy Boundary |
| :--- | :--- | :--- | :--- | :--- |
| `phone`, `globalName`, `avatar` | `ParentIdentity` | **GLOBAL** | Global Self-Service / Auth | Masked in staff CRM unless authorized |
| `staffNotes`, `crmStatus` | `InstituteParent` | **TENANT** | Institute Staff | Internal staff only; never leaked to parent |
| `admissionNumber`, `studentName` | `Student` | **TENANT** | Institute Staff | Internal staff & assigned guardians |
| `relationshipType`, `isPrimary`, `status` | `InstituteParentStudent` | **TENANT** | Institute Staff | Shared with staff & assigned guardians |

---

## 7. Relationship Types & Taxonomy

CoachingOS establishes a controlled, strongly-typed relationship taxonomy:

```typescript
export type GuardianRelationshipType =
  | 'father'
  | 'mother'
  | 'guardian'
  | 'stepfather'
  | 'stepmother'
  | 'grandparent'
  | 'sibling'
  | 'other';
```

### Taxonomy Rules:
1. **Controlled Vocabulary**: Free-text string inputs for relationship type are strictly rejected to ensure analytics consistency, UI localization, and reporting integrity.
2. **Extensibility**: Additional platform relationship types can be added to the domain union type without breaking existing database schemas or DTO contracts.
3. **No Automatic Authority Assumption**: `relationshipType === 'guardian'` does NOT automatically confer financial responsibility, pickup authority, or portal access rights.

---

## 8. Cardinality Invariants

1. **Parent ➔ Students (1:N)**: An `InstituteParent` can be linked to multiple `Student` records in the same institute.
2. **Student ➔ Parents (N:1)**: A `Student` can be linked to multiple `InstituteParent` records in the same institute.
3. **Pair Uniqueness**: A specific `(instituteParentId, studentId)` pair can have at most **ONE** relationship record within an institute tenant.
   ```sql
   UNIQUE(institute_id, institute_parent_id, student_id)
   ```

---

## 9. Lifecycle State Machine

Relationship lifecycle status is independent of parent/student aggregate statuses:

```text
             ┌──────────────┐
             │    active    │
             └──────┬───────┘
                    │
            archive()│  reactivate()
                    ▼
             ┌──────────────┐
             │   archived   │
             └──────────────┘
```

### Status Definitions:
- `active`: Operational relationship. Eligible for notification routing, staff CRM display, and primary contact designation.
- `archived`: Soft-deleted / historical relationship record. Retained for audit logging and past administrative history.

---

## 10. Primary Guardian Rules & Operations

### Invariants:
1. **At Most One Primary**: A student may have 0 or 1 active primary guardian (`isPrimary = true`).
2. **Setting New Primary**: When a staff member marks Relationship B as primary for a student, the server atomically clears `isPrimary = false` on any existing primary relationship for that student within the same transaction.
3. **Archiving Primary**: If a primary guardian relationship is archived, `isPrimary` is cleared (`false`). The student remains with 0 primary guardians until staff explicitly designates a new primary guardian.

---

## 11. Tenant Security Invariants

1. **Server-Authoritative Context**:
   - `TenantContext.instituteId` resolved from the session cookie is the sole authority for tenant boundary enforcement.
   - Client requests attempting to override `instituteId` via headers, body, or URL parameters are rejected.
2. **Dual-Record Tenant Verification**:
   - Before creating an `InstituteParentStudent` link, the system MUST verify that BOTH `instituteParentId` and `studentId` belong to `TenantContext.instituteId`.
   - If either record belongs to a different institute, the request MUST fail with `NotFoundError` (`404`) to prevent cross-tenant ID discovery.

---

## 12. Authorization Matrix (Capability-Based RBAC)

Governed by existing capabilities in `@coaching-os/identity`:

### Capabilities:
- `guardian:read`: View guardian relationships and student links.
- `guardian:create`: Link an `InstituteParent` to a `Student`.
- `guardian:update`: Change relationship type or primary guardian status.
- `guardian:archive`: Soft-archive a parent-student relationship link.

### Role Mapping:

| Role | `guardian:read` | `guardian:create` | `guardian:update` | `guardian:archive` |
| :--- | :---: | :---: | :---: | :---: |
| `owner` | ✅ | ✅ | ✅ | ✅ |
| `teacher` | ✅ | ❌ | ❌ | ❌ |
| `assistant` | ✅ | ✅ | ✅ | ❌ |
| `parent` | ❌ | ❌ | ❌ | ❌ |

*(Note: Parents possess zero staff CRM capabilities. Parent PWA self-service is governed by dedicated Phase 5+ contracts.)*

---

## 13. DTO Boundaries & Anti-Recursion Rules

To prevent infinite nested JSON serialization loops (`Student ➔ Parent ➔ Students ➔ Parents`):

### 1. `StudentGuardianSummaryDTO` (Embedded in `StudentDTO`)
```typescript
export interface StudentGuardianSummaryDTO {
  relationshipId: string;
  instituteParentId: string;
  parentIdentityId: string;
  relationshipType: GuardianRelationshipType;
  isPrimary: boolean;
  parentName: string;
  parentPhone: string;
}
```

### 2. `ParentStudentSummaryDTO` (Embedded in `InstituteParentDTO`)
```typescript
export interface ParentStudentSummaryDTO {
  relationshipId: string;
  studentId: string;
  relationshipType: GuardianRelationshipType;
  isPrimary: boolean;
  studentName: string;
  admissionNumber: string;
  admissionStatus: string;
}
```

### 3. `InstituteParentStudentDTO` (Dedicated Endpoint Response)
```typescript
export interface InstituteParentStudentDTO {
  id: string;
  instituteId: string;
  instituteParentId: string;
  studentId: string;
  relationshipType: GuardianRelationshipType;
  isPrimary: boolean;
  status: GuardianRelationshipStatus;
  createdAt: string;
  updatedAt: string;
}
```

---

## 14. Repository Contract Interface (`InstituteParentStudentRepository`)

```typescript
export interface InstituteParentStudentRepository {
  findById(instituteId: string, id: string): Promise<InstituteParentStudentEntity | null>;
  findByPair(instituteId: string, instituteParentId: string, studentId: string): Promise<InstituteParentStudentEntity | null>;
  listByStudentId(instituteId: string, studentId: string): Promise<InstituteParentStudentEntity[]>;
  listByInstituteParentId(instituteId: string, instituteParentId: string): Promise<InstituteParentStudentEntity[]>;
  save(entity: InstituteParentStudentEntity): Promise<InstituteParentStudentEntity>;
  setPrimaryGuardian(instituteId: string, studentId: string, relationshipId: string): Promise<void>;
  archive(instituteId: string, id: string): Promise<void>;
}
```

---

## 15. Database Contract & Schema Evolution Specification

During Phase 1.9.2 runtime implementation, `schema.prisma` will be updated from the join table placeholder to a full relationship model:

```prisma
model InstituteParentStudent {
  id                String                   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  instituteId       String                   @map("institute_id") @db.Uuid
  instituteParentId String                   @map("institute_parent_id") @db.Uuid
  studentId         String                   @map("student_id") @db.Uuid
  relationshipType  GuardianRelationshipType @default(father) @map("relationship_type")
  isPrimary         Boolean                  @default(false) @map("is_primary")
  status            GuardianRelationshipStatus @default(active)
  createdAt         DateTime                 @default(now()) @map("created_at")
  updatedAt         DateTime                 @updatedAt @map("updated_at")
  deletedAt         DateTime?                @map("deleted_at")

  institute       Institute       @relation(fields: [instituteId], references: [id], onDelete: Cascade)
  instituteParent InstituteParent @relation(fields: [instituteParentId], references: [id], onDelete: Cascade)
  student         Student         @relation(fields: [studentId], references: [id], onDelete: Cascade)

  @@unique([instituteId, instituteParentId, studentId], name: "institute_parent_student_unique")
  @@index([instituteId, studentId])
  @@index([instituteId, instituteParentId])
  @@index([instituteId, status])
  @@map("institute_parent_students")
}
```

---

## 16. Index Strategy

1. `UNIQUE(institute_id, institute_parent_id, student_id)` — Prevents duplicate links for the same parent-student pair.
2. `INDEX(institute_id, student_id)` — Fast lookup of all guardians for a specific student.
3. `INDEX(institute_id, institute_parent_id)` — Fast lookup of all students linked to a specific parent.
4. `INDEX(institute_id, status)` — Fast filtered list queries.

---

## 17. Threat Matrix (`REL-01` to `REL-16`)

| ID | Threat Vector | Attack Scenario | Expected Outcome | Mitigation Layer |
| :--- | :--- | :--- | :--- | :--- |
| **REL-01** | Unauthenticated Access | Anonymous request to link parent & student | `401 Unauthorized` | Auth Guard (`requireAuthSession`) |
| **REL-02** | Unauthorized Role | Assistant attempts to archive guardian link | `403 Forbidden` | RBAC Assertion Guard (`guardian:archive`) |
| **REL-03** | Cross-Tenant Lookup | Tenant A attempts to fetch Tenant B relationship ID | `404 Not Found` | Repository `instituteId` Scope Barrier |
| **REL-04** | Cross-Tenant Mutation | Tenant A attempts to update Tenant B relationship | `404 Not Found` | Repository `instituteId` Scope Barrier |
| **REL-05** | Body `instituteId` Injection | Request body includes foreign `instituteId` | Value Ignored | Server `TenantContext` Authority |
| **REL-06** | Query `instituteId` Injection | Query string includes `?instituteId=...` | Value Ignored | Server `TenantContext` Authority |
| **REL-07** | `x-institute-id` Header Spoofing| Custom HTTP header spoofing institute | Header Ignored | Server `TenantContext` Authority |
| **REL-08** | `x-role` Header Spoofing | Header claiming `role=owner` | Header Ignored | Server Session Authority |
| **REL-09** | Foreign Parent ID Injection | Linking Tenant A Student to Tenant B Parent | `404 Not Found` | Dual Tenant ID Verification |
| **REL-10** | Foreign Student ID Injection | Linking Tenant A Parent to Tenant B Student | `404 Not Found` | Dual Tenant ID Verification |
| **REL-11** | Pairing Enumeration | Sequentially probing relationship UUIDs | Rate-limited + `404` | Generic 404 Error Taxonomy |
| **REL-12** | Duplicate Creation | Creating 2nd link for same parent & student | `409 Conflict` | Composite Unique Index Constraint |
| **REL-13** | Primary Race Condition | Concurrent requests to set primary guardian | Atomic Transaction | DB Transaction + Partial Index |
| **REL-14** | Archived Entity Manipulation| Linking an archived Student to a Parent | `400 Bad Request` | Domain Entity Invariant Guard |
| **REL-15** | Staff-Note Leakage | DTO exposing internal staff notes to parent | Excluded from DTO | Strict DTO Mapper Boundary |
| **REL-16** | ParentIdentity Leakage | Leaking cross-tenant parent associations | Isolated DTO | Strict DTO Mapper Boundary |

---

## 18. Privacy Requirements & Data Leakage Protection

1. **Zero Cross-Tenant Association Discovery**: Staff in Institute A must never be able to discover if an `InstituteParent` is also linked to students in Institute B.
2. **DTO Field Redaction**: Internal CRM notes (`InstituteParent.notes`) are strictly excluded from relationship DTOs exposed to non-staff endpoints.
3. **Structured Log Sanitization**: PII fields (`phone`, `email`, `address`, `dateOfBirth`, `notes`) MUST be excluded from observability logs.

---

## 19. Audit & Observability Logging Events

All relationship mutations produce structured observability log events via `@coaching-os/observability`:

```text
identity.guardian_relationship.created
identity.guardian_relationship.updated
identity.guardian_relationship.primary_changed
identity.guardian_relationship.archived
```

### Log Payload Structure:
- `actorUserId`: UUID of performing user.
- `instituteId`: UUID of active tenant.
- `relationshipId`: UUID of relationship record.
- `instituteParentId`: UUID of parent CRM record.
- `studentId`: UUID of student record.
- `requestId`: Correlation ID (`x-request-id`).

---

## 20. API Expectations (Endpoints & Zod Validators)

### Endpoints (Presentation Layer):
- `POST /api/institute/students/[id]/guardians` — Link an `InstituteParent` to a `Student`.
- `GET /api/institute/students/[id]/guardians` — List all guardians linked to a student.
- `PATCH /api/institute/guardians/[id]` — Update relationship type or set as primary.
- `DELETE /api/institute/guardians/[id]` — Archive relationship link.

### Zod Schema Boundaries:
- `createGuardianRelationshipSchema.strict()`: Validates `instituteParentId`, `relationshipType`, `isPrimary`.
- `updateGuardianRelationshipSchema.strict()`: Validates `relationshipType`, `isPrimary`.

---

## 21. UI Expectations (Staff Workspace Features)

- **Student Details Drawer / Tab**: "Guardians & Family" tab rendering list of linked parents with relationship badge, primary indicator, phone number, and action menu.
- **Add Guardian Modal**: Searchable dropdown of institute parents with relationship type selector and "Set as Primary Guardian" checkbox.
- **Set Primary Action**: Quick toggle button to promote a guardian to primary contact with confirmation state.

---

## 22. Explicit Non-Goals & Deferred Functionality

- Parent Portal self-service features (Phase 5).
- Student Portal features (Phase 5).
- SMS, WhatsApp, email notifications (Phase 4).
- Pickup authorization or legal custody management.
- Fee invoice assignment or billing responsibility (Phase 3).
- Academic batch/program enrollment (Phase 1.10 & 1.11).

---

## 23. Subphase Implementation Sequence

```text
Phase 1.9.0 — Architecture & Contract Freeze 🟢 (ACCEPTED & FROZEN)
    ↓
Phase 1.9.1 — Relationship Domain Entity & Value Objects
Phase 1.9.2 — Relationship Repository & PostgreSQL Persistence
    ↓
Phase 1.9.3 — Relationship Application Use Cases
Phase 1.9.4 — Guardian/Student Linking & Authorization
    ↓
Phase 1.9.5 — Relationship API Boundary & Validators
Phase 1.9.6 — Relationship Security / Privacy E2E Matrix
    ↓
Phase 1.9.7 — Staff Guardian/Relationship UI
Phase 1.9.8 — UX, Accessibility & Workflow Testing
    ↓
Phase 1.9.9 — Phase 1.9 Acceptance Gate
```

---

## 24. Acceptance Criteria for Phase 1.9.0

Phase 1.9.0 is **ACCEPTED & FROZEN** when:
1. `ADR-0012` is written and accepted.
2. Architecture document (`phase1.9-guardian-student-relationship.md`) is written and accepted.
3. Domain aggregate boundary (`InstituteParentStudent`) and ownership matrix are frozen.
4. Relationship taxonomy and authority separation are specified.
5. Cardinality, primary guardian invariants, and pair uniqueness contract are defined.
6. Threat matrix (`REL-01` to `REL-16`) and tenant isolation contract are frozen.
7. Capability RBAC matrix (`guardian:read`, `guardian:create`, `guardian:update`, `guardian:archive`) is defined.
8. Anti-recursion DTO boundaries are specified.
9. `docs/CONTEXT.md` is updated.
10. **Zero runtime code, schema migrations, API routes, or UI components were modified in Phase 1.9.0**.
11. All existing test suites, typechecks, lint checks, builds, and infrastructure verifications pass cleanly.
