# ADR 0010: Tenant InstituteParent CRM Architecture

- **Status**: Accepted & Frozen (Phase 1.7.0 Baseline)
- **Date**: 2026-08-11
- **Authors**: Senior Staff Architecture & Security Team
- **Deciders**: Product & Engineering Core

---

## Context & Problem Statement

In Phase 1.6, CoachingOS established the **Global ParentIdentity Platform Layer** (`ParentIdentity`), anchoring real-world parent identity across the platform using a canonical E.164 phone number.

While `ParentIdentity` answers *"Who is this parent globally on CoachingOS?"*, individual coaching institutes require a tenant-scoped CRM representation to record institute-specific administrative information, staff notes, local operational status, and custom contact metadata.

If CoachingOS attached tenant CRM fields directly to `ParentIdentity`, data leakage across institutes would occur (e.g. Institute A staff seeing internal notes or fee classifications created by Institute B staff).

Conversely, if CoachingOS created isolated parent records without linking them to `ParentIdentity`, parents would lose single sign-on continuity, multi-student visibility, and cross-institute profile management.

We require a formal architectural decision to freeze the **`InstituteParent` Tenant CRM Architecture**, defining entity boundaries, cardinality, tenant isolation, lifecycle independence, authorization rules, and privacy contracts.

---

## Architecture & Design Decisions

### 1. Architectural Distinction: Global Identity vs Tenant CRM

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

1. **`ParentIdentity` (Global Platform Authority)**:
   - Owns global identity: canonical E.164 phone, global parent display name, global avatar, and global lifecycle status (`active`, `suspended`, `deactivated`).
   - Globally accessible across CoachingOS platform.
   - Zero tenant fields (`instituteId`, `membershipId`, staff CRM notes).

2. **`InstituteParent` (Tenant CRM Authority)**:
   - Owned strictly by a specific `Institute`.
   - References `ParentIdentity` via `parentIdentityId`.
   - Owns tenant-local CRM fields: institute-specific status (`active`, `inactive`), internal staff notes, institute-local relationship metadata, and timestamps.
   - Strictly isolated to the parent institute's `TenantContext`.

---

### 2. Cardinality & Uniqueness Invariant

- **One-to-Many Across Platform**: One global `ParentIdentity` can be linked to multiple `InstituteParent` records across different institutes.
- **One-to-One Within Institute**: One global `ParentIdentity` can have at most **ONE** `InstituteParent` record within a single institute.
- **Database Invariant**:
  ```sql
  UNIQUE(institute_id, parent_identity_id)
  ```

---

### 3. Tenant Isolation Contract

- All `InstituteParent` operations MUST be authorized under trusted server-side `TenantContext`.
- The server ignores all client-supplied tenant identifiers (`instituteId` in query, body, or `x-institute-id` headers).
- Resolution chain:
  ```text
  Session Cookie ➔ Better Auth Session ➔ User ➔ InstituteMembership ➔ TenantContext ➔ Capability Assertion ➔ InstituteParent Operation
  ```

---

### 4. Lifecycle & Deletion Independence

- **Independent Status Machine**: `InstituteParent.status` (`active`, `inactive`) is managed independently per institute. A parent may be `active` in Institute A while `inactive` in Institute B.
- **Deletion Strategy**: Removing or inactivating an `InstituteParent` record soft-archives local CRM metadata and **MUST NEVER** mutate or delete the global `ParentIdentity` entity.

---

### 5. Authorization Boundary

- Governed by existing capability-based RBAC (`parent:read`, `parent:create`, `parent:update`, `parent:archive`).
- **Staff CRM Access**: Staff members (Owners, Teachers, Assistants) access `InstituteParent` records via tenant-scoped staff capabilities.
- **Parent Portal Self-Access**: Parents accessing their own student/fee records perform operations via future dedicated parent portal APIs, distinct from staff CRM workflows.

---

## Consequences

### Positive
- Strict cross-tenant isolation guarantees zero data leakage of internal staff notes between institutes.
- Unambiguous boundary between global identity and tenant CRM operations.
- Clean database schema enforcement via PostgreSQL unique constraints.

### Negative / Trade-offs
- Creating a tenant parent requires resolving or auto-linking a global `ParentIdentity` first.
- Requires dual DTO mapping (Global `ParentIdentityDTO` vs Tenant `InstituteParentDTO`).
