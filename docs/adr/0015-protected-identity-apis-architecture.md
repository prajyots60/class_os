# ADR-0015: Protected Identity APIs Architecture (`/api/v1/...`)

- **Status**: 🟢 **ACCEPTED & FROZEN**
- **Date**: 2026-08-12
- **Authors**: Senior Staff Architecture & Identity Team
- **Deciders**: Product & Engineering Core
- **Consulted**: SRS, SDD, DADD, ADR-0001, ADR-0010, ADR-0011, ADR-0012, ADR-0013, ADR-0014

---

## 1. Context & Problem Statement

CoachingOS has established formal domain aggregates for Tenants (`Institute`), Users & RBAC (`User`, `InstituteMembership`), Parent Identity & CRM (`ParentIdentity`, `InstituteParent`), Student Admissions (`Student`), Guardian Relationships (`InstituteParentStudent`), Academic Hierarchy (`Program`, `Subject`, `Batch`), and Student Enrollment (`Enrollment`).

Until now, HTTP access was handled exclusively via internal Next.js application routes (`/api/institute/...`). While these internal routes serve the web frontend workspace effectively, CoachingOS requires a **protected, stable, versioned public API surface (`/api/v1/...`)** for enterprise integrations, mobile client applications, external identity consumers, and partner webhooks.

We must define the architectural contract, security model, versioning rules, tenant isolation invariants, authentication boundaries, DTO schemas, and error taxonomy for `/api/v1/...` before any API implementation begins.

---

## 2. Decision Outcome & Architectural Principles

### 2.1 Internal vs. Protected API Boundary

We establish a strict architectural boundary between internal application routes and protected versioned APIs:

| Dimension | Internal Staff Routes (`/api/institute/...`) | Protected Versioned APIs (`/api/v1/...`) |
| :--- | :--- | :--- |
| **Primary Consumer** | Internal Next.js Web Application Pages | Mobile Apps, External Integrations, Enterprise Clients |
| **Versioning** | Unversioned, evolves dynamically with UI | Explicit Path Versioning (`/api/v1/...`), Additive Guarantee |
| **Response Format** | Direct DTO / Page-specific view models | Standardized JSON Envelope (`data`, `pagination`, `meta`) |
| **Stability Guarantee** | Internal implementation detail | Backwards-Compatible Stable API Contract |
| **Domain Layer Access** | Application Use Cases via Server Actions / Routes | Application Use Cases via Presentation Handlers |

**CRITICAL RULE**: Handlers in `/api/v1/...` are **thin presentation adapters**. They MUST delegate 100% of domain logic, state machine execution, and persistence operations to the existing application use cases (`packages/identity`, `@coaching-os/academics`). The API layer MUST NEVER contain inline SQL, Prisma queries, or duplicate domain logic.

---

## 3. Versioning & Contract Strategy

### 3.1 Path Versioning
All protected identity routes are mounted under `/api/v1/...`.

### 3.2 Additive Non-Breaking Change Policy
- **Permitted in v1**: Adding new optional query parameters, adding new response DTO fields, introducing new resource endpoints.
- **Prohibited in v1**: Removing or renaming existing fields, altering response structure, changing HTTP status codes for existing error conditions, requiring new mandatory payload fields.
- **Breaking Changes**: Any breaking change requires a formal deprecation lifecycle and major version increment (`/api/v2/...`).

---

## 4. Authentication & Tenant Context Resolution

```text
Incoming HTTP Request (/api/v1/...)
                 │
                 ▼
   Better Auth Session Cookie / Bearer Token
                 │
                 ▼
   ResolveInstituteMembershipUseCase (Server-Authoritative)
                 │
                 ├─────────────────────────┐
                 ▼                         ▼
      Valid Session/Token          Invalid / Missing
                 │                         │
                 ▼                         ▼
        TenantContext Built       HTTP 401 Unauthorized
   (instituteId, userId, role)
                 │
                 ▼
   Capability Authorization Check (AuthorizationEngine)
```

### 4.1 Server-Authoritative Principles
1. Callers authenticate via Better Auth session cookies (`auth_session`) or `Authorization: Bearer <session_token>`.
2. `TenantContext` (`instituteId`, `userId`, `role`, `membershipId`) is resolved strictly on the server by verifying the authenticated session against `InstituteMembership`.
3. Client-supplied `instituteId`, `userId`, `role`, or custom tenant headers (`x-institute-id`) are **STRICTLY REJECTED / IGNORED** via Zod `.strict()` validation schemas.
4. If a caller requests a resource belonging to a different tenant, the request MUST fail with **`HTTP 404 Not Found`** to prevent cross-tenant resource existence disclosure.

---

## 5. Authorization & Capability Model

`/api/v1/...` reuses the existing `@coaching-os/identity` `AuthorizationEngine` without duplication.

### 5.1 Identity Capability Mappings

| Resource Endpoint | Action | Required Capability |
| :--- | :--- | :--- |
| `GET /api/v1/students` | List Students | `student:read` |
| `GET /api/v1/students/:id` | Get Student Profile | `student:read` |
| `POST /api/v1/students` | Create Student | `student:create` |
| `PATCH /api/v1/students/:id` | Update Student Profile | `student:update` |
| `DELETE /api/v1/students/:id` | Soft Archive Student | `student:archive` |
| `GET /api/v1/guardians` | List Guardians / Parents | `guardian:read` |
| `GET /api/v1/guardians/:id` | Get Guardian Profile | `guardian:read` |
| `POST /api/v1/guardians` | Create Guardian | `guardian:create` |
| `PATCH /api/v1/guardians/:id` | Update Guardian Profile | `guardian:update` |
| `DELETE /api/v1/guardians/:id` | Archive Guardian | `guardian:archive` |
| `GET /api/v1/memberships` | List Staff / Memberships | `staff:read` |
| `GET /api/v1/memberships/:id` | Get Staff Member | `staff:read` |
| `PATCH /api/v1/memberships/:id` | Update Staff Role/Status | `staff:role_change` / `staff:update` |
| `GET /api/v1/enrollments` | List Enrollments | `enrollment:read` |
| `GET /api/v1/enrollments/:id` | Get Enrollment Record | `enrollment:read` |
| `POST /api/v1/enrollments` | Create Enrollment | `enrollment:create` |
| `POST /api/v1/enrollments/:id/transfer` | Batch Transfer | `enrollment:transfer` |

### 5.2 Role & Resource Scoping Rules
- **Owner**: Full access to all `/api/v1/...` endpoints.
- **Teacher**: Scoped strictly to students enrolled in batches assigned to that teacher (`resource-scope.ts`).
- **Assistant**: Read/write access within granted operational capabilities (`student:read`, `student:create`, `enrollment:read`).
- **Parent**: Strictly read-only access scoped exclusively to linked active student dependents via `InstituteParentStudent` junction records.

---

## 6. Resource Inclusion & Exclusion Matrix

| Resource Domain | Included Fields | Excluded / Redacted Fields |
| :--- | :--- | :--- |
| **Student** | `id`, `instituteId`, `admissionNumber`, `firstName`, `lastName`, `email`, `phone`, `gender`, `dob`, `admissionStatus`, `status`, `createdAt`, `updatedAt` | Password hashes, session tokens, audit internals |
| **Guardian / Parent** | `id`, `instituteId`, `parentIdentityId`, `firstName`, `lastName`, `phone`, `email`, `relationshipType`, `isPrimary`, `status`, `createdAt`, `updatedAt` | Internal CRM notes (except staff), auth credentials |
| **Relationship** | `id`, `studentId`, `instituteParentId`, `relationshipType`, `isPrimary`, `status`, `createdAt`, `updatedAt` | System internal flags |
| **Staff / Membership** | `id`, `instituteId`, `userId`, `role`, `status`, `createdAt`, `updatedAt`, `user: { name, email }` | Passwords, MFA keys, OAuth tokens, session secrets |
| **Enrollment** | `id`, `instituteId`, `studentId`, `batchId`, `status`, `enrolledAt`, `completedAt`, `withdrawnAt`, `transferredAt` | Direct internal database FK graphs |

---

## 7. Response DTO & Error Envelope Specifications

### 7.1 Standardized Single Resource Envelope
```json
{
  "success": true,
  "data": {
    "id": "e9b8f2c3-4d5e-6f7a-8b9c-0d1e2f3a4b5c",
    "admissionNumber": "ADM-2026-001",
    "firstName": "Aarav",
    "lastName": "Sharma",
    "status": "active"
  },
  "meta": {
    "requestId": "1749d056-b8d8-4883-8f19-d6e03e4d1b49",
    "timestamp": "2026-08-12T14:17:27.000Z"
  }
}
```

### 7.2 Standardized Collection Envelope
```json
{
  "success": true,
  "data": [ /* Array of DTO objects */ ],
  "pagination": {
    "cursor": "e9b8f2c3-4d5e-6f7a-8b9c-0d1e2f3a4b5c",
    "nextCursor": "f1a2b3c4-5d6e-7f8a-9b0c-1d2e3f4a5b6c",
    "hasMore": true,
    "pageSize": 20,
    "total": 145
  },
  "meta": {
    "requestId": "1749d056-b8d8-4883-8f19-d6e03e4d1b49",
    "timestamp": "2026-08-12T14:17:27.000Z"
  }
}
```

### 7.3 Standardized Error Envelope
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Admission number format is invalid.",
    "details": [
      { "field": "admissionNumber", "issue": "Must match pattern ADM-YYYY-XXX" }
    ]
  },
  "meta": {
    "requestId": "1749d056-b8d8-4883-8f19-d6e03e4d1b49",
    "timestamp": "2026-08-12T14:17:27.000Z"
  }
}
```

---

## 8. Security Threat Matrix (`IDENTITY-01` to `IDENTITY-24`)

| Threat ID | Description | Mitigation Strategy | HTTP Response |
| :--- | :--- | :--- | :---: |
| `IDENTITY-01` | Unauthenticated access | Better Auth Session / Bearer Guard | 401 |
| `IDENTITY-02` | Invalid or revoked session | Token validity check against DB session store | 401 |
| `IDENTITY-03` | Capability escalation | `AuthorizationEngine.assertHasCapability()` | 403 |
| `IDENTITY-04` | Role spoofing | Context derived strictly from server session | 401 / 403 |
| `IDENTITY-05` | Tenant ID payload injection | Zod `.strict()` strips client `instituteId` | 400 / Ignored |
| `IDENTITY-06` | Cross-tenant student access | `WHERE institute_id = :tenantId` SQL clause | 404 |
| `IDENTITY-07` | Cross-tenant guardian access | `WHERE institute_id = :tenantId` SQL clause | 404 |
| `IDENTITY-08` | Cross-tenant membership access| `WHERE institute_id = :tenantId` SQL clause | 404 |
| `IDENTITY-09` | Client `instituteId` query injection | Server context overrides query params | 400 / Ignored |
| `IDENTITY-10` | Client `userId` payload injection | Server context overrides `userId` | 400 / Ignored |
| `IDENTITY-11` | Client `role` payload injection | Zod `.strict()` rejects injected role fields | 400 |
| `IDENTITY-12` | Unauthorized identity status change| Capability check (`staff:role_change` / status guard) | 403 / 422 |
| `IDENTITY-13` | Sensitive security field exposure | Excluded from Response DTO types | N/A |
| `IDENTITY-14` | Unbounded pagination memory leak | Page size hard capped to maximum 100 items | 400 |
| `IDENTITY-15` | SQL injection in search params | Parameterized SQL via Prisma client | 400 |
| `IDENTITY-16` | Rate-limit bypass attempt | IP & Session token bucket rate limiting | 429 |
| `IDENTITY-17` | Error stack trace disclosure | Production log redaction & sanitized JSON errors | 500 / Sanitized |
| `IDENTITY-18` | Mass assignment attack | Strict Zod payload validation (`.strict()`) | 400 |
| `IDENTITY-19` | Sequential ID enumeration | Random UUIDv4 primary keys for all resources | 404 |
| `IDENTITY-20` | Unsupported API version request | Router 404 for non-existent API versions | 404 |
| `IDENTITY-21` | Parent privilege escalation | Parent capability check & dependent resource filter | 403 |
| `IDENTITY-22` | Teacher scope escalation | Teacher batch assignment verification | 404 |
| `IDENTITY-23` | Staff self-role escalation | Prevent self-mutation of `role` in membership | 403 |
| `IDENTITY-24` | Audit log PII exposure | Pino redaction for phone, email, dob, passwords | N/A |

---

## 9. Subphase Implementation Roadmap (1.12.0 to 1.12.8)

```text
Phase 1.12.0 — Architecture & Contract Freeze 🟢 (ACCEPTED & FROZEN)
    ↓
Phase 1.12.1 — Protected Identity API Domain/Application Contracts ⏳ (UPCOMING)
Phase 1.12.2 — API Infrastructure & Persistence Adapters ⏳ (UPCOMING)
    ↓
Phase 1.12.3 — API Boundary & Presentation Validators ⏳ (UPCOMING)
Phase 1.12.4 — Authentication, Authorization & Tenant Isolation ⏳ (UPCOMING)
    ↓
Phase 1.12.5 — Security & Adversarial E2E Audit ⏳ (UPCOMING)
Phase 1.12.6 — Protected Identity API Integration / Staff Consumption ⏳ (UPCOMING)
    ↓
Phase 1.12.7 — API UX / Developer Experience / Documentation ⏳ (UPCOMING)
Phase 1.12.8 — Final Acceptance Gate & Freeze ⏳ (UPCOMING)
```
