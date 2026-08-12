# ADR-0017: Multi-Tenant Cross-Tenant Access Security Hardening

- **Status**: APPROVED
- **Date**: 2026-08-12
- **Authors**: Senior Staff Architecture & Security Team
- **Deciders**: Product & Engineering Core

---

## 1. Context & Problem Statement

CoachingOS is an enterprise multi-tenant platform where multiple coaching institutes share the same physical application infrastructure and PostgreSQL database.

The non-negotiable security invariant for CoachingOS is:

> **A principal authenticated in Institute A must never be able to read, mutate, infer, enumerate, or indirectly access resources belonging to Institute B.**

While individual feature phases (Phase 1.10 through Phase 1.13) implemented capability-based RBAC and basic tenant filters, defense in depth requires systematic cross-tenant security hardening across all layers of the architecture (Authentication -> Session -> Context -> Authorization -> Application -> Repository -> Database -> API).

---

## 2. Server-Authoritative Trust Hierarchy

Client-controlled HTTP data is untrusted:
- ❌ `instituteId` in JSON request bodies
- ❌ `instituteId` in URL query parameters
- ❌ `x-institute-id`, `x-role`, `x-user-id` headers
- ❌ Client-side state or local storage tokens

Tenant authorization MUST be resolved strictly on the server:

```text
                    TRUSTED BOUNDARY
                          │
                Authenticated Session
                          │
                          ▼
              ResolveInstituteMembership
                          │
                          ▼
                    TenantContext
                          │
                          ▼
                 AuthorizationEngine
                          │
                          ▼
          Tenant-Scoped Query (id + instituteId)
                          │
                          ▼
                     PostgreSQL
```

---

## 3. Tenant-Scoped Resource Matrix

| Resource | Tenant Key | Cross-Tenant GET | Cross-Tenant Mutation | Persistence Boundary Guard |
| :--- | :--- | :--- | :--- | :--- |
| **Institute** | `id` | `404 NOT_FOUND` | `404 NOT_FOUND` | Verified via `TenantContext.instituteId` |
| **User** | `id` (Global) / `instituteId` | Redacted DTO | Fail closed | `User.instituteId` matching `TenantContext` |
| **InstituteMembership** | `instituteId` | `404 NOT_FOUND` | `404 NOT_FOUND` | `(id, instituteId)` query lock + self-mutation guard |
| **Student** | `instituteId` | `404 NOT_FOUND` | `404 NOT_FOUND` | `(id, instituteId)` mandatory in repo queries |
| **InstituteParent** | `instituteId` | `404 NOT_FOUND` | `404 NOT_FOUND` | `(id, instituteId)` mandatory in repo queries |
| **InstituteParentStudent**| `instituteId` | `404 NOT_FOUND` | `404 NOT_FOUND` | Verified target student & guardian `instituteId` |
| **Program** | `instituteId` | `404 NOT_FOUND` | `404 NOT_FOUND` | `(id, instituteId)` mandatory in update/query |
| **Subject** | `instituteId` | `404 NOT_FOUND` | `404 NOT_FOUND` | `(id, instituteId)` mandatory in update/query |
| **ProgramSubject** | `instituteId` | `404 NOT_FOUND` | `404 NOT_FOUND` | Verified program & subject `instituteId` match |
| **Batch** | `instituteId` | `404 NOT_FOUND` | `404 NOT_FOUND` | `(id, instituteId)` mandatory in update/query |
| **Enrollment** | `instituteId` | `404 NOT_FOUND` | `404 NOT_FOUND` | Verified student, source batch & target batch `instituteId` |

---

## 4. Error Semantics & Resource Existence Disclosure Prevention

To prevent attackers from enumerating resources across tenant boundaries through error message subtle differences or status code variations:

1. **Fail-Closed 404 NOT_FOUND**: When a tenant requests a resource ID belonging to another institute, the API MUST return `404 NOT_FOUND` ("Resource not found") instead of `403 FORBIDDEN` or `409 CONFLICT`.
2. **Identical Error Payloads**: The error message and structure for a cross-tenant resource request MUST be identical to the error message for a non-existent UUID.
3. **No Foreign Existence Disclosure**: Attempting to link, transfer, or map a foreign tenant entity MUST fail with `404 NOT_FOUND` referencing the foreign target ID, revealing zero details about the foreign entity's existence or state.

---

## 5. Security Threat Matrix (`TENANT-01` to `TENANT-32`)

### 5.1 Direct Resource Lookup Attacks (`TENANT-01` .. `TENANT-08`)
- **TENANT-01**: Cross-tenant Student lookup (`GET /api/v1/students/[id]`) returns `404`.
- **TENANT-02**: Cross-tenant Guardian lookup (`GET /api/v1/guardians/[id]`) returns `404`.
- **TENANT-03**: Cross-tenant Staff lookup (`GET /api/v1/staff/[id]`) returns `404`.
- **TENANT-04**: Cross-tenant Enrollment lookup (`GET /api/v1/enrollments/[id]`) returns `404`.
- **TENANT-05**: Cross-tenant Batch lookup (`GET /api/institute/batches/[id]`) returns `404`.
- **TENANT-06**: Cross-tenant Subject lookup (`GET /api/institute/subjects/[id]`) returns `404`.
- **TENANT-07**: Cross-tenant Program lookup (`GET /api/institute/programs/[id]`) returns `404`.
- **TENANT-08**: Cross-tenant Relationship lookup (`GET /api/v1/guardians/[id]/students`) returns `404`.

### 5.2 Cross-Tenant Mutation Attacks (`TENANT-09` .. `TENANT-16`)
- **TENANT-09**: Cross-tenant Student update (`PATCH /api/v1/students/[id]`) returns `404`.
- **TENANT-10**: Cross-tenant Staff role update (`PATCH /api/v1/staff/[id]/role`) returns `404`.
- **TENANT-11**: Cross-tenant Staff suspension (`POST /api/v1/staff/[id]/suspend`) returns `404`.
- **TENANT-12**: Cross-tenant Batch archive (`POST /api/institute/batches/[id]/archive`) returns `404`.
- **TENANT-13**: Cross-tenant Enrollment cancel/withdraw (`POST /api/institute/enrollments/[id]/cancel`) returns `404`.
- **TENANT-14**: Cross-tenant Enrollment transfer (`POST /api/institute/enrollments/[id]/transfer`) returns `404`.
- **TENANT-15**: Cross-tenant Guardian status update (`PATCH /api/v1/guardians/[id]`) returns `404`.
- **TENANT-16**: Cross-tenant Relationship archive (`POST /api/institute/parent-student/[id]/archive`) returns `404`.

### 5.3 Injection Attacks (`TENANT-17` .. `TENANT-22`)
- **TENANT-17**: `instituteId` injected in request body is rejected or stripped by Zod `.strict()`.
- **TENANT-18**: `instituteId` injected in query params does not override session `TenantContext`.
- **TENANT-19**: Spoofed `x-institute-id` header is completely ignored by server context resolution.
- **TENANT-20**: Spoofed `x-role` header is ignored by `AuthorizationEngine`.
- **TENANT-21**: Spoofed `x-user-id` header is ignored by session resolver.
- **TENANT-22**: Forged or synthetic `membershipId` in URL or body is rejected.

### 5.4 Existence Disclosure & Enumeration Attacks (`TENANT-23` .. `TENANT-26`)
- **TENANT-23**: Searching student/staff collection with foreign ID returns empty array (`200 OK` with `data: []`).
- **TENANT-24**: Attempting to enroll a student in another institute's batch returns `404 NOT_FOUND` (no 409 conflict leak).
- **TENANT-25**: Attempting duplicate enrollment on foreign tenant returns `404 NOT_FOUND`.
- **TENANT-26**: Pagination totals and counts on tenant collections reflect strictly target tenant data.

### 5.5 Relationship Traversal Attacks (`TENANT-27` .. `TENANT-32`)
- **TENANT-27**: Linking Tenant A Student to Tenant B Guardian returns `404 NOT_FOUND`.
- **TENANT-28**: Enrolling Tenant A Student in Tenant B Batch returns `404 NOT_FOUND`.
- **TENANT-29**: Transferring Tenant A Student to Tenant B Batch returns `404 NOT_FOUND`.
- **TENANT-30**: Mapping Tenant A Program to Tenant B Subject returns `404 NOT_FOUND`.
- **TENANT-31**: Assigning Tenant A Staff as Teacher to Tenant B Batch returns `404 NOT_FOUND`.
- **TENANT-32**: Requesting Student guardians for foreign student returns `404 NOT_FOUND`.

---

## 6. Architecture Compliance Rules

1. **No Client Tenant Data Authority**: Repositories and Use Cases must require explicit `instituteId` parameter originating from `TenantContext`.
2. **Double-Sided Traversal Verification**: Use cases manipulating relationships must verify that BOTH entities belong to `TenantContext.instituteId`.
3. **Immutability of Frozen Contracts**: Phases 1.10, 1.11, 1.12, and 1.13 remain frozen and immutable.
