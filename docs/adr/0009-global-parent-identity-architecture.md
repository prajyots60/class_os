# ADR 0009: Global ParentIdentity vs Tenant Identity Architecture

- **Status**: Accepted & Frozen (Phase 1.6.0 Baseline)
- **Date**: 2026-08-11
- **Authors**: Senior Staff Architecture Team
- **Deciders**: Product & Engineering Core

---

## Context & Problem Statement

In traditional single-tenant or naive multi-tenant software, a "parent" record is strictly owned by a single coaching institute. However, in the Indian coaching institute ecosystem, a real-world parent often has:
1. Multiple children enrolled in different coaching institutes (e.g., Child A in a JEE institute, Child B in a NEET institute).
2. The same child enrolled in multiple coaching institutes concurrently (e.g., Mathematics at Institute A, Physics at Institute B).
3. A single mobile phone number (`+91...`) used for all communication, notifications, and fee receipts across all institutes.

If CoachingOS treated parents purely as tenant-owned database rows, a parent with children across three institutes would have 3 distinct logins, 3 isolated accounts, and zero consolidated visibility into their children's academic schedules, fee receipts, or attendance records.

Conversely, if CoachingOS blindly merged parent data globally, Institute A staff could gain unauthorized access to parent notes, fee structures, or child enrollments belonging to Institute B, violating strict multi-tenant privacy boundaries.

We require an authoritative architectural decision for the **Global ParentIdentity Platform Layer** that balances cross-tenant parent continuity with absolute multi-tenant data isolation.

---

## Architecture & Design Decisions

### 1. Two-Layer Parent Identity Model

CoachingOS establishes a strict **Two-Layer Architecture** for parent identity:

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

1. **Global Platform Layer (`ParentIdentity`)**:
   - Platform-owned entity representing the real-world parent person.
   - Anchored globally by unique E.164 phone number (`phone`).
   - Owns global `ChildProfile` entities (representing the parent's children across all institutes).
   - Independent of any individual coaching institute's operational database scope.

2. **Institute Tenant Layer (`InstituteParent`)**:
   - Tenant-scoped CRM record owned strictly by a specific `Institute`.
   - Holds institute-specific contact information, emergency contacts, local address, staff notes, and local custom tags.
   - Linked to local `Student` records via `InstituteParentStudent` relation.

3. **Multi-Tenant Bridge (`InstituteMembership`)**:
   - Connects `ParentIdentity` + `Institute` + `InstituteParent`.
   - Explicitly establishes that a global parent is authorized to interact with a specific institute tenant.

---

## 2. Decoupling Better Auth User from ParentIdentity

CoachingOS explicitly decouples system authentication from domain parent identity:

- **Better Auth `User`**: Handles credentials, session tokens, password hashes, email verification, and rate limiting.
- **`ParentIdentity`**: Represents the domain identity of the parent person across CoachingOS.
- **Identity Mapping**:
  - `User.email` / `User.phone` maps to `ParentIdentity.phone` during authenticated session resolution.
  - Staff and institute owners possess `User` records with staff roles (`owner`, `teacher`). Parents possess `User` records mapped to `ParentIdentity`.
  - Avoids polluting authentication tables with domain CRM, student relationship links, or academic data.

---

## 3. Strict Multi-Tenant Isolation Invariants

1. **Tenant API Boundary**:
   - Institute staff querying `/api/v1/institutes/:instituteId/parents` can ONLY read and mutate `InstituteParent` records where `instituteId === activeInstituteId`.
   - Institute staff NEVER query the global `parent_identities` table directly.
   - Institute A cannot discover whether a parent also belongs to Institute B.

2. **Parent PWA Boundary**:
   - When a parent logs into the Parent PWA, the server resolves their session to `ParentIdentity`.
   - The parent receives a list of their authorized `InstituteMembership` options.
   - Access to any tenant endpoint (`/api/v1/parent/institutes/:instituteId/...`) requires active `TenantContext` verification for that specific `instituteId`.

3. **Child Isolation**:
   - Global `ChildProfile` is mapped to a tenant `Student` via `StudentLink(childProfileId, studentId, instituteId)`.
   - Institute A can only query `Student` records where `instituteId === 'inst-A'`.

---

## Strategic Consequences & Status

- **Status**: 🟢 **ACCEPTED & FROZEN** (Baseline for Phase 1.6–1.9)
- **Downstream Phase Alignment**:
  - Phase 1.6 implements `ParentIdentity` domain entities and repositories in `packages/identity`.
  - Phase 1.7 implements `InstituteParent` CRM application logic for institute staff.
  - Phase 1.8 & 1.9 implement `Student` admission and `StudentLink` guardian relationships.
