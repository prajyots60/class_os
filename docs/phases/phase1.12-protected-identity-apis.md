# Phase 1.12 — Protected Identity APIs (`/api/v1/...`) Specification

- **Status**: 🟢 **Phase 1.12.0 FROZEN \| Phase 1.12.1, 1.12.2, 1.12.3 & 1.12.4 COMPLETED**
- **Date**: 2026-08-12
- **Authors**: Senior Staff Architecture & Identity Team
- **Deciders**: Product & Engineering Core
- **Consulted**: SRS, SDD, DADD, ADR-0001, ADR-0010, ADR-0011, ADR-0012, ADR-0013, ADR-0014, ADR-0015

---

## 1. Phase Objective

Phase 1.12 introduces the **Protected Identity APIs (`/api/v1/...`)** layer to CoachingOS. This phase provides a stable, production-grade, versioned public API surface for identity resources including `Student`, `InstituteParent`, `InstituteParentStudent`, `InstituteMembership`, `Enrollment`, and academic references (`Program`, `Subject`, `Batch`).

These APIs enable mobile client applications, enterprise integrations, and multi-tenant portal experiences while enforcing strict tenant isolation, server-authoritative authentication, capability-based RBAC, cursor-based pagination, rate-limiting, and zero stack trace disclosures.

---

## 2. Current Architecture Context & Frozen Dependencies

Phase 1.12 builds upon 11 formally completed and frozen phases:
- **Phase 1.1 (Institute)**: Multi-tenant organizational baseline (`instituteId`).
- **Phase 1.2 & 1.3 (Users & RBAC)**: Capability-based authorization engine (64 capabilities registered to date).
- **Phase 1.6 & 1.7 (Parent Platform & CRM)**: Global `ParentIdentity` and tenant `InstituteParent` CRM records.
- **Phase 1.8 (Student Core / ADR-0011)**: Admitted learner aggregate (`Student`) and admission state machine.
- **Phase 1.9 (Guardian Relationships / ADR-0012)**: `InstituteParentStudent` junction aggregate.
- **Phase 1.10 (Academic Hierarchy / ADR-0013)**: `Program`, `Subject`, `ProgramSubject`, and `Batch`.
- **Phase 1.11 (Student Enrollment / ADR-0014)**: `Enrollment` aggregate, state machine, capacity enforcement, and transfer lineage.

---

## 3. Core Architectural Decisions (ADR-0015 Summary)

### 3.1 Architectural Separation
- `/api/institute/...`: Internal UI routes for web app pages. Dynamic, session-bound, unversioned.
- `/api/v1/...`: Protected versioned APIs for mobile, integration, and portal consumption. Stable JSON envelope format (`data`, `pagination`, `meta`), path-versioned.

### 3.2 Server-Authoritative Identity & Tenant Context
- Caller context (`TenantContext`) is derived 100% on the server by checking session cookies or `Authorization: Bearer <token>` against `InstituteMembership`.
- Client payloads, headers (`x-institute-id`), or query parameters injecting `instituteId`, `userId`, or `role` are stripped/rejected via Zod `.strict()`.
- Cross-tenant requests produce **`HTTP 404 Not Found`** to prevent resource existence disclosure.

---

## 4. Resource API Endpoints & Capabilities Matrix

### 4.1 Student APIs (`/api/v1/students`)

| Method | Endpoint Path | Description | Required Capability | HTTP Success |
| :--- | :--- | :--- | :--- | :---: |
| `GET` | `/api/v1/students` | List/search students (paginated) | `student:read` | 200 |
| `GET` | `/api/v1/students/:id` | Get student profile details | `student:read` | 200 |
| `POST` | `/api/v1/students` | Register new student admission | `student:create` | 201 |
| `PATCH` | `/api/v1/students/:id` | Update allowed student profile fields | `student:update` | 200 |
| `DELETE` | `/api/v1/students/:id` | Soft archive student record | `student:archive` | 200 |

### 4.2 Guardian / Parent APIs (`/api/v1/guardians`)

| Method | Endpoint Path | Description | Required Capability | HTTP Success |
| :--- | :--- | :--- | :--- | :---: |
| `GET` | `/api/v1/guardians` | List/search institute parent records | `guardian:read` / `parent:read` | 200 |
| `GET` | `/api/v1/guardians/:id` | Get guardian profile details | `guardian:read` / `parent:read` | 200 |
| `POST` | `/api/v1/guardians` | Add new institute parent record | `guardian:create` / `parent:create` | 201 |
| `PATCH` | `/api/v1/guardians/:id` | Update guardian CRM details | `guardian:update` / `parent:update` | 200 |
| `DELETE` | `/api/v1/guardians/:id` | Archive guardian record | `guardian:archive` / `parent:archive` | 200 |

### 4.3 Student ↔ Guardian Relationship APIs (`/api/v1/relationships`)

| Method | Endpoint Path | Description | Required Capability | HTTP Success |
| :--- | :--- | :--- | :--- | :---: |
| `GET` | `/api/v1/students/:id/guardians` | Get student's linked guardians | `relationship:read` | 200 |
| `POST` | `/api/v1/relationships` | Link guardian to student | `relationship:create` | 201 |
| `PATCH` | `/api/v1/relationships/:id` | Update relationship type / primary flag | `relationship:update` / `primary` | 200 |
| `DELETE` | `/api/v1/relationships/:id` | Soft-archive relationship link | `relationship:archive` | 200 |

### 4.4 Staff / Membership APIs (`/api/v1/memberships`)

| Method | Endpoint Path | Description | Required Capability | HTTP Success |
| :--- | :--- | :--- | :--- | :---: |
| `GET` | `/api/v1/memberships` | List institute staff members | `staff:read` | 200 |
| `GET` | `/api/v1/memberships/:id` | Get staff member details | `staff:read` | 200 |
| `PATCH` | `/api/v1/memberships/:id` | Update staff role or status | `staff:role_change` / `staff:update` | 200 |

### 4.5 Enrollment Reference APIs (`/api/v1/enrollments`)

| Method | Endpoint Path | Description | Required Capability | HTTP Success |
| :--- | :--- | :--- | :--- | :---: |
| `GET` | `/api/v1/enrollments` | List enrollments (filterable) | `enrollment:read` | 200 |
| `GET` | `/api/v1/enrollments/:id` | Get enrollment record details | `enrollment:read` | 200 |
| `POST` | `/api/v1/enrollments` | Enroll student into batch | `enrollment:create` | 201 |
| `POST` | `/api/v1/enrollments/:id/transfer` | Execute atomic batch transfer | `enrollment:transfer` | 200 |

---

## 5. Standardized Envelope Formats & Taxonomy

### 5.1 Success Response Envelope (Single Item)
```json
{
  "success": true,
  "data": { /* Resource DTO */ },
  "meta": {
    "requestId": "UUID",
    "timestamp": "ISO-8601"
  }
}
```

### 5.2 Success Response Envelope (Collection)
```json
{
  "success": true,
  "data": [ /* Array of DTOs */ ],
  "pagination": {
    "cursor": "string | null",
    "nextCursor": "string | null",
    "hasMore": boolean,
    "pageSize": number,
    "total": number
  },
  "meta": {
    "requestId": "UUID",
    "timestamp": "ISO-8601"
  }
}
```

### 5.3 Error Taxonomy & HTTP Status Code Standard
- `UNAUTHENTICATED`: HTTP 401 Unauthorized
- `FORBIDDEN`: HTTP 403 Forbidden
- `NOT_FOUND`: HTTP 404 Not Found
- `VALIDATION_ERROR`: HTTP 400 Bad Request
- `CONFLICT`: HTTP 409 Conflict
- `INVALID_STATE_TRANSITION`: HTTP 422 Unprocessable Entity
- `RATE_LIMITED`: HTTP 429 Too Many Requests
- `INTERNAL_ERROR`: HTTP 500 Internal Server Error

---

## 6. Rate Limiting, Observability & Security Matrix

### 6.1 Rate Limiting Policy
- **Read Requests**: 100 requests / minute per IP / Session token.
- **Mutation Requests**: 30 requests / minute per IP / Session token.
- Exceeding limit returns `HTTP 429 Too Many Requests` with `Retry-After` header.

### 6.2 Observability & PII Redaction
- Server generates canonical UUID for `X-Request-ID`.
- Log redaction filters 24 sensitive fields (`phone`, `email`, `dob`, `password`, `ssn`, `token`, etc.).

---

## 7. Explicit Non-Goals & Deferrals

The following domains are **EXPLICITLY EXCLUDED** from Phase 1.12:
- ❌ Fee structures, invoices, payments, billing (Phase 3).
- ❌ Attendance tracking, RFID logs (Phase 2+).
- ❌ Timetables, schedules, room allocations (Phase 2+).
- ❌ Examinations, marks, report cards (Phase 2+).
- ❌ SMS / WhatsApp / Email messaging dispatch (Phase 4).
- ❌ Staff UI onboarding workflows (Phase 1.13).
- ❌ Cross-tenant access security hardening (Phase 1.14).

---

## 8. Subphase Execution Roadmap

```text
Phase 1.12.0 — Architecture & Contract Freeze 🟢 (ACCEPTED & FROZEN)
    ↓
Phase 1.12.1 — Protected Identity API Domain/Application Contracts 🟢 (COMPLETED)
Phase 1.12.2 — API Infrastructure & Persistence Adapters 🟢 (COMPLETED)
    ↓
Phase 1.12.3 — API Boundary & Presentation Validators 🟢 (COMPLETED)
Phase 1.12.4 — Authentication, Authorization & Tenant Isolation 🟢 (COMPLETED)
    ↓
Phase 1.12.5 — Security & Adversarial E2E Audit 🟢 (COMPLETED)
Phase 1.12.6 — Protected Identity API Integration / Staff Consumption 🟢 (COMPLETED)
    ↓
Phase 1.12.7 — API UX / Developer Experience / Documentation ⏳ (UPCOMING)
Phase 1.12.8 — Final Acceptance Gate & Freeze ⏳ (UPCOMING)
```

---

## 9. Implementation Progress Log

### Phase 1.12.1 & 1.12.2 Implementation Summary (2026-08-12)
- **Files Created**:
  - `packages/identity/src/application/dto/membership.dto.ts` (`StaffMembershipDTO`, `toStaffMembershipDTO`)
  - `packages/identity/src/application/dto/pagination.dto.ts` (`PaginatedResult<T>`, `PaginationOptions`, `StudentListFilter`, `GuardianListFilter`, `StaffListFilter`, `EnrollmentListFilter`)
  - `packages/identity/src/application/dto/membership.dto.test.ts` (Unit testing for safe staff membership DTO & PII redaction)
  - `packages/identity/src/application/dto/pagination.dto.test.ts` (Unit testing for pagination contracts and typed filters)
- **Contracts & Repositories Reused**:
  - Reused `StudentDTO` and `toStudentDTO` (`packages/identity/src/application/dto/student.dto.ts`)
  - Reused `InstituteParentDTO` and `toInstituteParentDTO` (`packages/identity/src/application/dto/institute-parent.dto.ts`)
  - Reused `InstituteParentStudentDTO` and `toInstituteParentStudentDTO` (`packages/identity/src/application/dto/institute-parent-student.dto.ts`)
  - Reused `EnrollmentDTO` and `toEnrollmentDTO` (`packages/identity/src/application/dto/enrollment.dto.ts`)
  - Reused `PrismaStudentRepository`, `PrismaInstituteParentRepository`, `PrismaInstituteParentStudentRepository`, `PrismaInstituteMembershipRepository`, and `PrismaEnrollmentRepository`.
- **Client Bundle Safety**:
  - Updated `packages/identity/src/client.ts` with type-only exports for `StaffMembershipDTO`, `EnrollmentDTO`, `PaginatedResult`, `PaginationOptions`, and filter interfaces. Verified zero leak of Prisma or server-only dependencies into client exports.
- **Verification**:
  - `@coaching-os/identity` test suite: 53 test files passed (525 total tests).

### Phase 1.12.3 & 1.12.4 Implementation Summary (2026-08-12, Commit: 94db861)

- **Core Guard Infrastructure**:
  - `apps/web/src/app/api/v1/_lib/rate-limiter.ts` — in-process token-bucket rate limiter (100 read / 30 mutation per minute per userId key)
  - `apps/web/src/app/api/v1/_lib/v1-guard.ts` — server-authoritative tenant resolver + `withV1ReadGuard`/`withV1MutationGuard` HOFs + canonical ADR-0015 response envelopes
  - `apps/web/src/app/api/v1/_lib/v1-validators.ts` — strict Zod schemas (`.strict()`) for all 5 resource collections; blocks instituteId/userId/role/membershipId/tenantId injection

- **Route Handlers (10 files)**:
  - `GET /api/v1/students` — tenant-scoped student list with cursor pagination
  - `GET/PATCH /api/v1/students/[id]` — single student read & profile update (admissionNumber immutable)
  - `GET /api/v1/students/[id]/guardians` — student guardian relationship list
  - `GET /api/v1/guardians` — guardian list (active/inactive filter)
  - `GET /api/v1/guardians/[id]` — single guardian read
  - `GET /api/v1/guardians/[id]/students` — guardian linked student list
  - `GET /api/v1/staff` — staff list → `StaffMembershipDTO` (PII/credential redaction enforced)
  - `GET /api/v1/staff/[id]` — single staff membership read → `StaffMembershipDTO`
  - `GET /api/v1/enrollments` — enrollment list (teacher resource scope, parent denied)
  - `GET /api/v1/enrollments/[id]` — single enrollment read (teacher scope)

- **Tests (80+ tests across 2 files)**:
  - `v1-validators.test.ts` — 60+ tests including mass-assignment attack vectors
  - `rate-limiter.test.ts` — 20+ tests including bucket isolation and Retry-After validation

- **Security Invariants Verified**:
  - Cross-tenant access returns `404` (not `403`) — resource enumeration protection
  - `TenantContext` derived exclusively from DB-verified session + InstituteMembership
  - `.strict()` on all Zod schemas — unknown fields rejected with `400`
  - `StaffMembershipDTO` strips all auth credentials
  - Max page size capped at `100`
  - Rate-limit buckets are isolated by `userId` (prevents cross-user interference)

- **Quality Gate Results**:
  - `@coaching-os/web` test suite: 33 test files, 324 tests ✅
  - TypeCheck: 13/13 packages ✅
  - Lint: 0 errors ✅
  - Build: all 10 `/api/v1/*` routes compiled as dynamic server routes ✅

### Phase 1.12.5 & 1.12.6 Implementation Summary (2026-08-12)

- **Phase 1.12.5 Security Audit Execution (`v1-security.test.ts`)**:
  - Validated 24/24 threat vectors (`IDENTITY-01` through `IDENTITY-24`) defined in ADR-0015.
  - Hardened pre-auth rate-limiting assertions in `withV1ReadGuard` and `withV1MutationGuard` to protect DB connection pools.
  - Configured multi-dimensional rate-limiter bucket keys (`user:<userId>:ip:<ip>`).
  - Standardized cross-tenant lookup error shapes (`404 NOT_FOUND`) to prevent ID enumeration.

- **Phase 1.12.6 Staff Integration Adapter (`V1IdentityApiClient`)**:
  - Created `packages/identity/src/client/v1-identity-api-client.ts` client SDK adapter with typed namespaces (`students`, `guardians`, `staff`, `enrollments`).
  - Created `packages/identity/src/application/dto/api-v1-response.dto.ts` for ADR-0015 response envelope unwrapping and `V1ApiError` normalization.
  - Created `apps/web/src/lib/v1-api-client.ts` singleton instance with `same-origin` credential forwarding for staff web application views.
  - Verified client consumption & error unwrapping with unit test suite (`v1-identity-api-client.test.ts`) and web integration test suite (`v1-api-client.test.ts`).

