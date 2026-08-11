# Phase 1.7 — Tenant InstituteParent CRM Layer

- **Status**: 🟢 **Phase 1.7.0 ACCEPTED & FROZEN**
- **Date**: 2026-08-11
- **Authors**: Senior Staff Identity & CRM Architecture Team

---

## 1. Problem Definition & Context

Coaching institutes require a tenant-scoped Customer Relationship Management (CRM) representation of parents enrolled in their institute. Staff members need to store internal operational notes, track institute-specific enrollment status, maintain local contact details, and associate parents with students within their institute scope.

However, as established in **ADR-0009** and **Phase 1.6**, real-world parents often have children enrolled across multiple coaching institutes. Global identity (`ParentIdentity`) is platform-scoped and anchored by a canonical E.164 phone number.

Phase 1.7 introduces `InstituteParent`—the tenant-scoped CRM object that bridges global identity into a specific coaching institute without corrupting multi-tenant isolation or global identity continuity.

---

## 2. ParentIdentity vs InstituteParent Boundary

```text
                  Better Auth User (Authentication Authority)
                                     │
                                     │ 1:1 Identity Mapping
                                     ▼
           ParentIdentity (Global Platform Layer — Phone Anchored)
                        "Who is this parent globally?"
                                     │
               ┌─────────────────────┴─────────────────────┐
               ▼                                           ▼
     Institute A (Tenant A)                      Institute B (Tenant B)
               │                                           │
               ▼                                           ▼
      InstituteParent (CRM)                       InstituteParent (CRM)
   "How Inst A knows this parent"              "How Inst B knows this parent"
```

| Dimension | `ParentIdentity` (Phase 1.6) | `InstituteParent` (Phase 1.7) |
| :--- | :--- | :--- |
| **Scope** | Platform-wide (Global) | Tenant-specific (`Institute`) |
| **Identity Anchor** | Canonical E.164 Phone Number (`phone`) | Composite Foreign Key `(instituteId, parentIdentityId)` |
| **Data Owned** | Global name, global avatar, global phone, global status | Internal CRM notes, institute status, tenant metadata |
| **Tenant Access** | Zero `instituteId` field | Strictly bounded by `TenantContext` |
| **Lifecycle** | `active`, `suspended`, `deactivated` (terminal) | `active`, `inactive` (tenant-local) |
| **Authority** | Platform Identity Authority | Institute Tenant CRM Authority |

---

## 3. Domain Boundary

`InstituteParent` exists strictly within `@coaching-os/identity` package as a tenant CRM aggregate.

```text
packages/identity/
├── src/
│   ├── domain/
│   │   ├── entities/
│   │   │   ├── parent-identity.entity.ts      (Phase 1.6 — Global Identity)
│   │   │   └── institute-parent.entity.ts     (Phase 1.7 — Tenant CRM Entity)
│   │   ├── repositories/
│   │   │   ├── parent-identity.repository.ts  (Phase 1.6)
│   │   │   └── institute-parent.repository.ts(Phase 1.7 — Tenant CRM Repository)
```

---

## 4. Entity Ownership Matrix

| Field | Owned By | Reason |
| :--- | :--- | :--- |
| `phone` | `ParentIdentity` | Canonical platform identifier anchored globally |
| `name` (Display Name) | `ParentIdentity` | Global parent display name across platform |
| `avatar` | `ParentIdentity` | Global profile image URL |
| `status` (Global) | `ParentIdentity` | Platform-wide account standing (`active`, `suspended`, `deactivated`) |
| `notes` (Staff CRM Notes) | `InstituteParent` | Confidential operational notes written by institute staff |
| `status` (Tenant Local) | `InstituteParent` | Institute-specific enrollment standing (`active`, `inactive`) |
| `createdAt` / `updatedAt` | Both | Locally tracked persistence timestamps |

---

## 5. Relationship & Cardinality Model

- **Cardinality**:
  - One `ParentIdentity` ➔ Many `InstituteParent` records across different institutes.
  - One `Institute` ➔ Max 1 `InstituteParent` per `ParentIdentity`.
- **Database Unique Constraint**:
  ```sql
  @@unique([instituteId, parentIdentityId], name: "institute_parent_unique")
  ```

---

## 6. Lifecycle Design

`InstituteParent` manages tenant-local standing independent of global identity status.

```text
      ┌──────────┐  inactivate()   ┌──────────┐
      │  ACTIVE  │ ──────────────> │ INACTIVE │
      └──────────┘ <────────────── └──────────┘
                    reactivate()
```

- **`active`**: Parent is currently active in the institute's CRM.
- **`inactive`**: Parent is soft-archived / no longer actively enrolled in this institute.
- **Independence Invariant**: Changing `InstituteParent.status` in Institute A does NOT affect `InstituteParent.status` in Institute B, nor does it alter global `ParentIdentity.status`.

---

## 7. Deletion & Archiving Strategy

- **Soft Archiving**: `InstituteParent` records are soft-archived via `status: 'inactive'`. Physical deletion is disabled to preserve fee audit records and communication logs.
- **Isolation Invariant**: Removing or archiving an `InstituteParent` record MUST NEVER delete or alter the underlying `ParentIdentity` entity.

---

## 8. Tenant Isolation Contract

- Every repository and use-case execution involving `InstituteParent` MUST execute under trusted server-side `TenantContext`.
- Client parameter injection (`instituteId` in query, body, or headers) is strictly ignored by server resolution boundaries.

---

## 9. Authorization Contract

Governed by existing capability-based RBAC engine (`packages/identity/src/authorization`):

| Action | Capability Identifier | Owner | Teacher | Assistant | Parent |
| :--- | :--- | :---: | :---: | :---: | :---: |
| Read Parent CRM | `parent:read` | ✅ | ✅ | ✅ | ❌ |
| Create Parent CRM | `parent:create` | ✅ | ✅ | ❌ | ❌ |
| Update Parent CRM | `parent:update` | ✅ | ✅ | ❌ | ❌ |
| Archive Parent CRM | `parent:archive` | ✅ | ❌ | ❌ | ❌ |

---

## 10. Privacy & DTO Boundary

- **`InstituteParentDTO`**:
  ```typescript
  export interface InstituteParentDTO {
    id: string;
    instituteId: string;
    parentIdentityId: string;
    notes: string | null;
    status: 'active' | 'inactive';
    parentIdentity: ParentIdentityDTO;
    createdAt: string;
    updatedAt: string;
  }
  ```
- **Privacy Rule**: `InstituteParentDTO` is exposed exclusively to authorized institute staff. Global `ParentIdentity` endpoints NEVER return `InstituteParentDTO` fields or staff notes.

---

## 11. Audit & Observability Contract

Structured audit events logged via `@coaching-os/observability`:
- `parent_crm.created`
- `parent_crm.updated`
- `parent_crm.status_changed`

Logged payloads contain safe identifiers (`requestId`, `actorUserId`, `instituteId`, `parentIdentityId`, `instituteParentId`). Secrets, passwords, and sensitive notes are strictly redacted.

---

## 12. Database Contract (Prisma Target Specification)

Target model for Phase 1.7.2 implementation:

```prisma
enum InstituteParentStatus {
  active
  inactive
}

model InstituteParent {
  id               String                @id @default(uuid()) @db.Uuid
  instituteId      String                @map("institute_id") @db.Uuid
  parentIdentityId String                @map("parent_identity_id") @db.Uuid
  notes            String?               @db.Text
  status           InstituteParentStatus @default(active)
  createdAt        DateTime              @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt        DateTime              @updatedAt @map("updated_at") @db.Timestamptz(6)

  institute        Institute             @relation(fields: [instituteId], references: [id], onDelete: Cascade)
  parentIdentity   ParentIdentity        @relation(fields: [parentIdentityId], references: [id], onDelete: Restrict)

  @@unique([instituteId, parentIdentityId], name: "institute_parent_unique")
  @@index([instituteId])
  @@index([parentIdentityId])
  @@index([instituteId, status])
  @@map("institute_parents")
}
```

*(Note: Schema definition frozen; migration will be executed in Phase 1.7.2).*

---

## 13. Repository Contract

`InstituteParentRepository` abstraction (`packages/identity/src/domain/repositories/institute-parent.repository.ts`):

```typescript
export interface InstituteParentRepository {
  create(instituteParent: InstituteParentEntity): Promise<InstituteParentEntity>;
  findById(instituteId: string, id: string): Promise<InstituteParentEntity | null>;
  findByParentIdentityId(instituteId: string, parentIdentityId: string): Promise<InstituteParentEntity | null>;
  listByInstitute(instituteId: string, options?: { status?: 'active' | 'inactive'; page?: number; limit?: number }): Promise<InstituteParentEntity[]>;
  update(instituteParent: InstituteParentEntity): Promise<InstituteParentEntity>;
  exists(instituteId: string, parentIdentityId: string): Promise<boolean>;
}
```

---

## 14. Application Use Case Boundary

Future use cases to implement in Phase 1.7.3 / 1.7.4:
1. `CreateInstituteParentUseCase`: Creates tenant CRM record, resolving or auto-linking global `ParentIdentity`.
2. `GetInstituteParentUseCase`: Retrieves single `InstituteParentDTO` under trusted `TenantContext`.
3. `ListInstituteParentsUseCase`: Paginated listing of institute parents for staff dashboard.
4. `UpdateInstituteParentUseCase`: Mutates tenant notes or contact metadata.
5. `ChangeInstituteParentStatusUseCase`: Manages tenant-local `active` / `inactive` lifecycle.

---

## 15. Parent Identity Auto-Linking Policy

1. Staff submits parent details (phone, name, optional notes) within staff portal.
2. System normalizes phone to canonical E.164 (`PhoneNumber` VO).
3. System executes `ResolveParentIdentityForUserUseCase` / `CreateParentIdentityUseCase` to resolve or construct global `ParentIdentity`.
4. System creates `InstituteParent` linking `instituteId` and `parentIdentityId`.
5. Database `UNIQUE(instituteId, parentIdentityId)` constraint prevents duplicate CRM records.

---

## 16. Comprehensive Threat Matrix (`PARENT-CRM-01` to `PARENT-CRM-15`)

| Threat ID | Category | Attack Vector | Expected Behavior | Architectural Mitigation |
| :--- | :--- | :--- | :--- | :--- |
| `PARENT-CRM-01` | Unauthenticated Access | Request `GET /api/v1/parents` without session cookie | Return 401 `AuthenticationError` | Server requires active Better Auth session |
| `PARENT-CRM-02` | Cross-Tenant Parent Lookup | Request `InstituteParent` belonging to Institute B while in Inst A context | Return 404 / 403 error | Repository queries enforce `where: { id, instituteId }` composite key |
| `PARENT-CRM-03` | Injected `instituteId` | Supply `instituteId: "other"` in body or `x-institute-id` header | Server ignores parameter; uses session `TenantContext` | Request context derives `instituteId` from verified session membership |
| `PARENT-CRM-04` | Injected `parentIdentityId` | Supply client `parentIdentityId` to hijack victim CRM link | Server validates identity via canonical phone resolution | Linking logic requires server-controlled phone normalization lookup |
| `PARENT-CRM-05` | Injected Role Header | Inject header `x-role: owner` to gain CRM write capability | Header ignored; server queries DB `InstituteMembership` | Capability assertions evaluate trusted database role |
| `PARENT-CRM-06` | Cross-Tenant CRM Update | Attempt `PATCH /parents/:id` targeting another institute's parent | Reject with 403/404 error | Update use case validates `instituteId` match under `TenantContext` |
| `PARENT-CRM-07` | Cross-Tenant Deletion | Attempt archiving another institute's CRM record | Reject with 403/404 error | Repository update/delete scoped strictly to `instituteId` |
| `PARENT-CRM-08` | Duplicate CRM Creation | Create duplicate `InstituteParent` for same parent in same institute | Throws `ConflictError` | PostgreSQL `@@unique([instituteId, parentIdentityId])` index |
| `PARENT-CRM-09` | Phone Enumeration API | Public API scan for phone numbers | Endpoint returns 401/403 | Phone lookup restricted to authenticated staff CRM use cases |
| `PARENT-CRM-10` | Unauthorized Staff Access | Assistant role attempting `parent:archive` operation | Throws `AuthorizationError` (403 status) | Capability engine checks `CAPABILITIES.PARENT_ARCHIVE` |
| `PARENT-CRM-11` | Parent User Self-Access | Parent user attempting to read another parent's staff notes | Throws `AuthorizationError` (403 status) | Staff CRM endpoints check staff capabilities (`parent:read`) |
| `PARENT-CRM-12` | Unintended Cascade Delete | Removing `InstituteParent` deletes global `ParentIdentity` | Global `ParentIdentity` remains active | Foreign key configured with `onDelete: Restrict` |
| `PARENT-CRM-13` | Status Corruption | Inactivating `InstituteParent` in Inst A deactivates global parent | Inst B & global identity remain unchanged | Status fields decoupled between `ParentIdentity` & `InstituteParent` |
| `PARENT-CRM-14` | CRM Data Leakage | Query global `ParentIdentity` expecting institute staff notes | Notes field absent from global DTO | `ParentIdentityDTO` contains zero tenant CRM properties |
| `PARENT-CRM-15` | Audit Log PII Leakage | Inspection of audit log outputs | Passwords/secrets redacted; UUIDs logged | Loggers use Pino redaction rules from `@coaching-os/observability` |

---

## 17. Explicit Non-Goals

Phase 1.7.0 MUST NOT expand into:
- `Student` entity or admission workflow (Phase 1.8).
- `Guardian` / `StudentLink` relationships (Phase 1.9).
- Academic hierarchy (Programs, Batches) (Phase 1.10).
- Student enrollment lifecycle (Phase 1.11).
- Protected public `/api/v1/parents` endpoints (Phase 1.12).
- Notification / SMS / Messaging integration.
- Parent PWA portal.

---

## 18. Phase 1.7 Subphase Implementation Sequence

```text
Phase 1.7.0 — Architecture & Contract Freeze 🟢 (ACCEPTED & FROZEN)
    ↓
Phase 1.7.1 — InstituteParent Domain Entity & Value Objects
Phase 1.7.2 — InstituteParent Repository & PostgreSQL Persistence Layer
    (Implement together)
    ↓
Phase 1.7.3 — InstituteParent Application Use Cases
Phase 1.7.4 — ParentIdentity ↔ InstituteParent Linking & Authorization
    (Implement together)
    ↓
Phase 1.7.5 — InstituteParent API Boundary & Validators ✅ COMPLETED
Phase 1.7.6 — InstituteParent Security / Privacy E2E Matrix ✅ COMPLETED
    (Implemented together)
    ↓
Phase 1.7.7 — InstituteParent Staff UI / CRM Feature
Phase 1.7.8 — UX, Accessibility & Tenant-Scoped Workflow Testing
    (Implement together)
    ↓
Phase 1.7.9 — Phase 1.7 Acceptance Gate
```

---

## 19. Acceptance Criteria & Quality Gates

Phase 1.7.0 is accepted when:
1. `ParentIdentity` vs `InstituteParent` architectural boundary is unambiguous and documented.
2. Tenant ownership and `UNIQUE(instituteId, parentIdentityId)` invariant is frozen.
3. Lifecycle independence (`active` / `inactive`) is defined.
4. Soft archiving strategy is defined.
5. Authorization model maps to existing capability RBAC engine.
6. Threat matrix (`PARENT-CRM-01` to `PARENT-CRM-15`) is documented.
7. Database model and repository contracts are frozen.
8. Zero runtime code, database migrations, or schema mutations were made in Phase 1.7.0.
9. `pnpm typecheck` and `pnpm test` pass cleanly.
10. Working tree is clean after git commit.
