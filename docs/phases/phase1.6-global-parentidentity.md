# Phase 1.6 — Global ParentIdentity Platform Layer Specification & Architecture Contract

> **Phase Status:** 🟢 **ACCEPTED & FROZEN** (Phase 1.6.0 Baseline)  
> **Milestone:** Phase 1.6.0 — Architecture & Contract Freeze  
> **Author:** Antigravity (Google DeepMind Agentic Pair Programmer)  
> **Date:** August 11, 2026  

---

## 1. Executive Summary & Purpose

Phase 1.6 defines the core domain, data classification, security threat model, and platform architecture for the **Global `ParentIdentity` Platform Layer** within CoachingOS.

In founder-led coaching institute ecosystems, a real-world parent is not inherently owned by a single coaching institute. A parent may have multiple children enrolled in different coaching institutes, or a child concurrently attending specialized coaching institutes (e.g. Mathematics at Institute A, NEET Preparation at Institute B).

This specification establishes the authoritative two-layer identity architecture separating **Global `ParentIdentity`** (phone-anchored platform profile owned by CoachingOS) from **Tenant `InstituteParent`** (institute-scoped CRM contact record owned by a specific coaching institute), while maintaining absolute multi-tenant data isolation, capability-based RBAC, and server-controlled session security.

---

## 2. Repository Audit Findings & Baseline State

### 2.1 Physical Schema Baseline (`infrastructure/database/prisma/schema.prisma`)
The PostgreSQL schema (Prisma ORM baseline created in Phase 0.4) already models the two-layer architecture:

1. **`ParentIdentity` (`parent_identities`)**:
   - `id` (`Uuid`, PK, dbgenerated)
   - `phone` (`VarChar(20)`, `@unique`) — E.164 phone anchor
   - `createdAt`, `updatedAt`
   - Relations: `memberships InstituteMembership[]`, `childProfiles ChildProfile[]`

2. **`InstituteMembership` (`institute_memberships`)**:
   - `id` (`Uuid`, PK)
   - `parentIdentityId` (`Uuid`, FK -> `ParentIdentity.id`)
   - `instituteId` (`Uuid`, FK -> `Institute.id`)
   - `instituteParentId` (`Uuid`, FK -> `InstituteParent.id`)
   - Composite Unique Constraint: `@@unique([parentIdentityId, instituteId])`

3. **`ChildProfile` (`child_profiles`)**:
   - `id` (`Uuid`, PK)
   - `parentIdentityId` (`Uuid`, FK -> `ParentIdentity.id`)
   - `name` (`VarChar(100)`)
   - `avatar` (`VarChar(255)`, nullable)
   - Relations: `studentLinks StudentLink[]`

4. **`StudentLink` (`student_links`)**:
   - `id` (`Uuid`, PK)
   - `childProfileId` (`Uuid`, FK -> `ChildProfile.id`)
   - `studentId` (`Uuid`, FK -> `Student.id`)
   - `instituteId` (`Uuid`, FK -> `Institute.id`)
   - Composite Unique Constraint: `@@unique([childProfileId, studentId])`

5. **`InstituteParent` (`institute_parents`)**:
   - `id` (`Uuid`, PK)
   - `instituteId` (`Uuid`, FK -> `Institute.id`)
   - `name` (`VarChar(255)`)
   - `primaryPhone` (`VarChar(20)`)
   - `secondaryPhone` (`VarChar(20)`, nullable)
   - Composite Unique Constraint: `@@unique([primaryPhone, instituteId])`

6. **`InstituteParentStudent` (`institute_parent_students`)**:
   - `instituteParentId` (`Uuid`), `studentId` (`Uuid`)
   - `relation` (`Relation` enum: `mother`, `father`, `guardian`, `other`)
   - Composite Primary Key: `@@id([instituteParentId, studentId])`

### 2.2 Domain Test Verification (`packages/identity/src/parent-identity.test.ts`)
Existing integration tests prove that:
- A single `ParentIdentity` cleanly links to multiple `ChildProfile` records and across multiple `InstituteMembership` records.
- Cross-tenant queries are blocked at the repository layer (e.g. Institute A querying `Student` records cannot access Student B in Institute B).

---

## 3. Conceptual Architecture & Identity Hierarchy

```text
                  Better Auth User (Authentication Authority)
                                     │
                                     │ 1:1 Identity Mapping
                                     ▼
            ParentIdentity (Global Platform Layer — Phone Anchored)
                                     │
                ┌────────────────────┴────────────────────┐
                ▼                                         ▼
      InstituteMembership (Inst A)              InstituteMembership (Inst B)
                │                                         │
                ▼                                         ▼
     InstituteParent (Inst A CRM)              InstituteParent (Inst B CRM)
                │                                         │
                ▼                                         ▼
  InstituteParentStudent (Relation)         InstituteParentStudent (Relation)
                │                                         │
                ▼                                         ▼
          Student (Inst A)                          Student (Inst B)
```

Parallel Global Child Mapping:
```text
                          ParentIdentity
                                │
                                ▼
                           ChildProfile
                                │
                 ┌──────────────┴──────────────┐
                 ▼                             ▼
         StudentLink (Inst A)          StudentLink (Inst B)
                 │                             │
                 ▼                             ▼
          Student (Inst A)              Student (Inst B)
```

---

## 4. Data Reconciliation & Classification

| Field / Attribute | Classification | Domain Layer | Mutability | Scope & Ownership |
|:---|:---|:---|:---|:---|
| `phone` | Identity Anchor | `ParentIdentity` | Immutable (via verification) | Global Platform |
| `createdAt` / `updatedAt` | Lifecycle Audit | `ParentIdentity` | Immutable | Global Platform |
| `name` (Parent Display) | Global Profile | `ParentIdentity` | Editable by Parent | Global Platform |
| `avatar` | Visual Profile | `ParentIdentity` | Editable by Parent | Global Platform |
| `name` (CRM Display) | Contact Profile | `InstituteParent` | Editable by Staff | Tenant Scoped (`Institute`) |
| `primaryPhone` | Contact Phone | `InstituteParent` | Editable by Staff | Tenant Scoped (`Institute`) |
| `secondaryPhone` | Contact Phone | `InstituteParent` | Editable by Staff | Tenant Scoped (`Institute`) |
| `occupation` / `address` | CRM Profile | `InstituteParent` | Editable by Staff | Tenant Scoped (`Institute`) |
| `notes` / `tags` | Operational Notes | `InstituteParent` | Staff Only | Tenant Scoped (`Institute`) |
| `relation` (`father`/`mother`) | Relationship | `InstituteParentStudent` | Editable by Staff | Tenant Scoped (`Institute`) |
| `childName` | Child Identity | `ChildProfile` | Editable by Parent | Global Platform |
| `studentId` Link | Academic Link | `StudentLink` | System / Verification | Tenant Scoped (`Institute`) |

---

## 5. Authentication vs ParentIdentity Relationship

### 5.1 Architecture Decision (ADR-0009 Alignment)
Better Auth `User` and `ParentIdentity` are **separate entities linked by a 1:1 identity mapping**:

- **Better Auth `User`**: Acts strictly as the authentication authority (manages email/password credentials, OTP verifications, session cookies, rate-limiting, and account recovery).
- **`ParentIdentity`**: Acts as the domain parent entity across CoachingOS.
- **Session Resolution Rule**:
  ```text
  Session Cookie → Better Auth User (userId) → ParentIdentity (phone / userId) → InstituteMembership[]
  ```

### 5.2 Rationale
1. Keeps Better Auth tables clean of domain CRM logic or student relationship links.
2. Prevents duplicating authentication systems.
3. Allows institute staff/owners (`User` with `instituteId`) and parents (`User` mapped to `ParentIdentity`) to share the same secure authentication foundation while retaining distinct authorization lifecycles.

---

## 6. Multi-Institute Membership & Cross-Tenant Boundary

A single `ParentIdentity` can interact with multiple coaching institutes:

```text
ParentIdentity (ID: P-100, Phone: +919876543210)
  ├── InstituteMembership A (instituteId: Inst-A, instituteParentId: IP-1)
  └── InstituteMembership B (instituteId: Inst-B, instituteParentId: IP-2)
```

### Isolation Invariants:
1. **Institute Staff Boundary**:
   - Staff at Institute A querying `/api/v1/institutes/Inst-A/parents` receive ONLY `InstituteParent` records where `instituteId === 'Inst-A'`.
   - Institute A CANNOT inspect `InstituteMembership` rows pointing to Institute B.
   - Institute A CANNOT infer or discover that Parent P-100 also has memberships or children in Institute B.

2. **Parent PWA Boundary**:
   - When Parent P-100 logs into the Parent PWA, the server resolves `ParentIdentity`.
   - The parent chooses an active institute context (`Inst-A` or `Inst-B`).
   - Requests made within `Inst-A` operate under `TenantContext('Inst-A')` and pass through `requireCapability(tenantContext, 'parent:read')`.

---

## 7. Parent ↔ Student Relationship Contract (Phase 1.9 Boundary)

Phase 1.6 establishes the platform data models and domain contracts. **Phase 1.9** will execute the full implementation of Guardian & Student links.

### Boundary Definitions for Phase 1.9:
1. **Tenant Relationship (`InstituteParentStudent`)**:
   - Maps `InstituteParent` to `Student` in a specific institute with enum `relation` (`mother`, `father`, `guardian`, `other`).
   - Owned by tenant staff; used for attendance SMS alerts, fee receipts, and parent-teacher meetings.

2. **Global Relationship (`StudentLink`)**:
   - Maps global `ChildProfile` to tenant `Student`.
   - Used by the Parent PWA to present academic marks, attendance, and fee invoices to the authenticated parent across multiple institutes.

---

## 8. Multi-Tenant Security Threat Matrix

| Threat ID | Threat Vector | Architectural Mitigation Mechanism |
|:---|:---|:---|
| **PARENT-01** | Cross-tenant ParentIdentity enumeration | Staff APIs query `InstituteParent` filtered strictly by `instituteId === tenantContext.instituteId`. Direct queries to `parent_identities` table are forbidden in tenant APIs. |
| **PARENT-02** | Parent attempts to inject `instituteId` | Server ignores client body/header `instituteId`. Active `instituteId` is derived strictly from verified session `TenantContext`. |
| **PARENT-03** | Parent accesses another institute's child | Authorization guard checks `StudentLink` where `childProfileId IN (parent.childProfiles) AND studentId = targetStudentId AND instituteId = tenantContext.instituteId`. |
| **PARENT-04** | Cross-tenant data leakage for multi-institute parent | All tenant queries append mandatory `WHERE institute_id = :tenantId`. Database repository abstraction automatically enforces tenant scoping. |
| **PARENT-05** | Same phone exists across multiple institutes | Phone is global key on `ParentIdentity`. Both institutes link to the SAME `ParentIdentity`, but maintain distinct, isolated `InstituteParent` records. |
| **PARENT-06** | Duplicate ParentIdentity creation | Database enforces `@unique` on `ParentIdentity.phone`. System uses atomic `upsertParentIdentityByPhone()` logic. |
| **PARENT-07** | Unauthorized parent membership creation | Creating an `InstituteMembership` requires `institute_parent:manage` capability or verified OTP invitation token. |
| **PARENT-08** | Revoked institute membership | Deleting or suspending `InstituteMembership` immediately revokes tenant access without affecting global `ParentIdentity` or other institute memberships. |
| **PARENT-09** | User session exists but `ParentIdentity` missing | API returns `403 PARENT_IDENTITY_REQUIRED`, triggering parent profile onboarding workflow. |
| **PARENT-10** | Deactivated `ParentIdentity` | Server session resolution checks `ParentIdentity.status`. If deactivated, all parent portal requests return `401 UNAUTHENTICATED`. |
| **PARENT-11** | Staff attempts to access global parent data | API DTO transformers return only `InstituteParentDTO` fields. `memberships` across other institutes are excluded from DTO outputs. |
| **PARENT-12** | Institute A modifies parent data for Institute B | Staff edits mutate ONLY `InstituteParent` for `activeInstituteId`. Inst A cannot mutate Inst B's `InstituteParent` row. |
| **PARENT-13** | Parent portal authorization boundary breach | Parent requests resolve session to `ParentIdentity`, then filter data strictly by active verified `InstituteMembership`. |
| **PARENT-14** | Identifier enumeration via API error responses | API responses return generic error messages (`404 Not Found` instead of `403 Belongs To Another Tenant`). |
| **PARENT-15** | Bulk export / search leakage | Bulk queries add mandatory `instituteId` filter in SQL/Prisma WHERE clauses before performing pagination or search indexing. |

---

## 9. Data Ownership & Mutation Invariants Contract

| Data Element | Owner Entity | Storage Scope | Who May Read | Who May Modify |
|:---|:---|:---|:---|:---|
| Auth Credentials / Email | `User` / `Account` | Global Platform | Account Owner | Account Owner (via Auth Flow) |
| Global Phone Anchor | `ParentIdentity` | Global Platform | Parent / System | System (via Verified OTP) |
| Global Child Profile | `ChildProfile` | Global Platform | Parent | Parent (via Parent PWA) |
| Tenant Parent Display Name | `InstituteParent` | Tenant Scoped | Tenant Staff & Parent | Tenant Staff |
| Tenant Parent Phone | `InstituteParent` | Tenant Scoped | Tenant Staff | Tenant Staff |
| Tenant Parent Address / Notes | `InstituteParent` | Tenant Scoped | Tenant Staff | Tenant Staff |
| Tenant Parent ↔ Student Relation | `InstituteParentStudent` | Tenant Scoped | Tenant Staff | Tenant Staff |
| Child ↔ Student Link | `StudentLink` | Tenant / Platform Bridge | Parent & Tenant Staff | System (via Invitation Verification) |

---

## 10. Duplicate Identity Detection & Linking Strategy

1. **Primary Matching Key**: E.164 formatted Phone number (e.g., `+919876543210`).
2. **Staff Onboarding Flow**:
   - When Institute A staff adds a parent contact with phone `+919876543210`:
     1. Search `ParentIdentity` by `phone`.
     2. If found, reuse existing `ParentIdentity.id`.
     3. If not found, atomically create `ParentIdentity(phone = '+919876543210')`.
     4. Create tenant-scoped `InstituteParent(instituteId = Inst-A, primaryPhone = '+919876543210')`.
     5. Create `InstituteMembership(parentIdentityId, instituteId = Inst-A, instituteParentId)`.
3. **Safety Invariants**:
   - Names are NEVER used as identity keys.
   - Unverified emails do NOT automatically merge identity rows.
   - Identity merging requires verified phone OTP or signed invitation tokens.

---

## 11. Privacy & Visibility Boundaries

```text
┌───────────────────────────────────────────────────────────────────────────┐
│                           PRIVACY BOUNDARY MAP                            │
├───────────────────────┬───────────────────────┬───────────────────────────┤
│ Scope                 │ Visible To            │ Hidden From               │
├───────────────────────┼───────────────────────┼───────────────────────────┤
│ Global ParentIdentity │ Parent (Self)         │ Institute Staff           │
│ Tenant InstituteParent│ Institute Staff & Self│ Other Institutes          │
│ ChildProfile          │ Parent (Self)         │ Institute Staff           │
│ Student Record        │ Inst Staff & Parent   │ Other Institutes          │
│ Institute Memberships │ Parent (Self)         │ All Institutes            │
└───────────────────────┴───────────────────────┴───────────────────────────┘
```

---

## 12. Authorization & Capability Taxonomy Integration

Phase 1.6 integrates with the Phase 1.3 Capability System (`packages/identity/src/authorization`):

### 12.1 New Capability Identifiers (Contract Reservation)
- `PARENT_IDENTITY_READ` (`parent_identity:read`) — Read global parent profile
- `PARENT_IDENTITY_UPDATE` (`parent_identity:update`) — Update global parent profile
- `INSTITUTE_PARENT_READ` (`institute_parent:read`) — Read institute parent CRM contacts
- `INSTITUTE_PARENT_MANAGE` (`institute_parent:manage`) — Create/edit institute parent contacts
- `GUARDIAN_LINK_READ` (`guardian_link:read`) — Read student-guardian relationships
- `GUARDIAN_LINK_MANAGE` (`guardian_link:manage`) — Link/unlink student to parent

### 12.2 Role Mapping Rules
- `owner` & `admin`: Possess `INSTITUTE_PARENT_*`, `GUARDIAN_LINK_*`. Denied global `PARENT_IDENTITY_UPDATE`.
- `teacher`: Possesses `INSTITUTE_PARENT_READ`, `GUARDIAN_LINK_READ`.
- `parent`: Possesses `PARENT_IDENTITY_READ`, `PARENT_IDENTITY_UPDATE` (own identity only), and tenant `parent:read` capability.

---

## 13. Repository & Package Boundary (`packages/identity`)

```text
packages/identity/
├── src/
│   ├── domain/
│   │   ├── entities/
│   │   │   ├── parent-identity.entity.ts
│   │   │   ├── child-profile.entity.ts
│   │   │   └── institute-membership.entity.ts
│   │   ├── value-objects/
│   │   │   └── phone-number.vo.ts
│   │   └── repositories/
│   │       ├── parent-identity.repository.ts
│   │       └── institute-parent.repository.ts
│   ├── application/
│   │   ├── use-cases/
│   │   │   ├── get-parent-identity.use-case.ts
│   │   │   ├── create-parent-identity.use-case.ts
│   │   │   └── link-parent-to-institute.use-case.ts
│   │   └── dto/
│   │       ├── parent-identity.dto.ts
│   │       └── institute-parent.dto.ts
│   └── authorization/
```

---

## 14. Database Schema Contract (Prisma Analysis)

No schema changes or migrations are required for Phase 1.6.0. The physical tables (`parent_identities`, `institute_memberships`, `child_profiles`, `student_links`, `institute_parents`, `institute_parent_students`) are already provisioned and validated in PostgreSQL.

---

## 15. Future API Boundary Specifications

### 15.1 Parent Portal Global APIs (`/api/v1/parent/...`)
- `GET /api/v1/parent/profile` — Fetch global parent profile
- `GET /api/v1/parent/institutes` — List authorized institute memberships
- `GET /api/v1/parent/children` — List global child profiles across institutes

### 15.2 Institute Staff Tenant APIs (`/api/v1/institutes/:instituteId/parents/...`)
- `GET /api/v1/institutes/:instituteId/parents` — List institute CRM parents
- `POST /api/v1/institutes/:instituteId/parents` — Add new parent contact to institute
- `GET /api/v1/institutes/:instituteId/parents/:parentId` — Fetch parent CRM details

---

## 16. Parent Portal & PWA Architecture Readiness

The architecture ensures future Parent PWA readiness:
1. **Multi-Institute Switcher**: Parent logs in once -> server returns list of `InstituteMembership` records -> parent selects active institute -> session sets `tenantContext`.
2. **Multi-Child Switcher**: Parent selects `ChildProfile` -> client queries `StudentLink` for active institute -> fetches marks/attendance for linked `studentId`.

---

## 17. Observability, Event & Audit Logging Contract

Standard structured log events (`packages/observability`):
- `identity.parent.created`: Logged when a new `ParentIdentity` is created.
- `identity.parent.linked`: Logged when `InstituteMembership` is established.
- `identity.parent.updated`: Logged when parent updates global profile.
- **PII Logging Prohibition**: Raw phone numbers, passwords, and addresses MUST NEVER be logged in structured log attributes. Only `parentIdentityId` and `instituteId` UUIDs are permitted.

---

## 18. Failure Scenarios & State Machine Lifecycle

### Lifecycle States:
- `ParentIdentity`: `active` | `deactivated`
- `InstituteMembership`: `invited` | `active` | `suspended` | `revoked`

### State Transitions & Failure Behavior:
1. **Membership Revocation**: Revoking `InstituteMembership` in Inst A blocks Inst A access immediately, but leaves Inst B membership active.
2. **Identity Deactivation**: Deactivating `ParentIdentity` blocks access across all institutes immediately.

---

## 19. Explicit Non-Goals & Phase Boundary

Phase 1.6 explicitly **DOES NOT**:
- ❌ Modify Prisma schema or execute database migrations.
- ❌ Implement Student Admission Core (Phase 1.8).
- ❌ Implement Guardian & Student Links Service (Phase 1.9).
- ❌ Build Parent CRM Staff UI (Phase 1.7 / 1.13).
- ❌ Build Parent PWA or UI screens (Phase 5).
- ❌ Expose HTTP API routes.

---

## 20. Subphase Implementation Plan

```text
Phase 1.6.0 — Architecture & Contract Freeze 🟢 (ACCEPTED & FROZEN)
    ↓
Phase 1.6.1 — ParentIdentity Domain Entities & Value Objects 🟢 (COMPLETED)
    ↓
Phase 1.6.2 — ParentIdentity Repository & Persistence Layer 🟢 (COMPLETED)
    ↓
Phase 1.6.3 — ParentIdentity Application Use Cases ⏳ (NEXT)
    ↓
Phase 1.6.4 — Parent Identity ↔ Authentication Integration
    ↓
Phase 1.6.5 — Multi-Tenant Security & Authorization Matrix
    ↓
Phase 1.6.6 — Phase 1.6 Acceptance Gate
```

---

## 20.1 Subphase Execution Log: Phase 1.6.1 & 1.6.2 Completion

### Phase 1.6.1 — ParentIdentity Domain Entities & Value Objects (COMPLETED)
- **`PhoneNumber` Value Object (`packages/identity/src/domain/value-objects/phone-number.vo.ts`)**:
  - Implements E.164 normalization, whitespace/formatting stripping, +91 default for 10-digit Indian numbers, and value equality comparison.
  - Unit tests: `packages/identity/src/domain/value-objects/phone-number.vo.test.ts` (8/8 passing).
- **`ParentIdentityEntity` Domain Entity (`packages/identity/src/domain/entities/parent-identity.entity.ts`)**:
  - Implements framework-independent entity with canonical E.164 phone anchor, display `name`, `avatar`, and state machine `status` (`active` <-> `suspended` -> `deactivated` terminal state).
  - Enforces zero tenant properties (`instituteId`).
  - Unit tests: `packages/identity/src/domain/entities/parent-identity.entity.test.ts` (8/8 passing).

### Phase 1.6.2 — ParentIdentity Repository & Persistence Layer (COMPLETED)
- **`ParentIdentityRepository` Interface (`packages/identity/src/domain/repositories/parent-identity.repository.ts`)**:
  - Defines `create`, `findById`, `findByPhone`, `existsByPhone`, `update`, and `delete`. Operates purely on domain objects without tenant parameters.
- **Database Schema Migration (`infrastructure/database/prisma/migrations/20260811100000_add_parent_identity_fields`)**:
  - Added `ParentIdentityStatus` enum, `name` (VarChar 255), `avatar` (Text), `status` (ParentIdentityStatus), and `@@index([status])` on `parent_identities`.
  - Schema validated with `pnpm db:validate`, migration deployed to Postgres, and verified 100% drift-free with `pnpm db:drift:check`.
- **`PrismaParentIdentityRepository` (`packages/identity/src/infrastructure/repositories/prisma-parent-identity.repository.ts`)**:
  - Implements PostgreSQL persistence adapter, handling P2002 duplicate key constraint (`ConflictError`) and P2025 (`NotFoundError`).
  - Integration test suite: `packages/identity/src/infrastructure/repositories/prisma-parent-identity.repository.integration.test.ts` (11/11 passing against real PostgreSQL database).

---

## 21. Acceptance Criteria & Quality Gates

1. **Architecture Contract Documentation**: Complete and frozen in `docs/phases/phase1.6-global-parentidentity.md`.
2. **ADR Alignment**: `ADR-0009` created and accepted.
3. **Repository Verification**:
   - `pnpm typecheck`: 0 errors.
   - `pnpm test`: 100% unit/integration tests pass.
   - `git status`: Clean working directory state.

---

## 22. Architectural Invariants (Non-Negotiable Rules)

1. **Phone-Anchored Global Identity**: `ParentIdentity` is globally unique by `phone`.
2. **Two-Layer Separation**: `ParentIdentity` (Global) and `InstituteParent` (Tenant) MUST remain separate models.
3. **Better Auth Decoupling**: `User` handles authentication; `ParentIdentity` handles domain parent entity.
4. **Tenant Isolation**: Institute staff NEVER query the global `parent_identities` table directly.
5. **No Schema Changes in Phase 1.6.0**: Physical tables already exist in Prisma schema baseline.

---

## 23. References & Artifact Traceability

- **ADR-0006**: Two-Layer Parent Identity Architecture
- **ADR-0009**: Global ParentIdentity vs Tenant Identity Architecture
- **Phase 1.0**: Domain & Architecture Contract Freeze (`docs/phases/phase1.md`)
- **Phase 1.3**: Capability-Based RBAC (`docs/phases/phase1.3-rbac.md`)
- **Phase 1.5**: Institute Settings & White-Label Branding (`docs/phases/phase1.5-institute-settings-branding.md`)
- **Domain Test Suite**: `packages/identity/src/parent-identity.test.ts`
