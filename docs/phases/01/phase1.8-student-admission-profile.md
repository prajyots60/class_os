# Phase 1.8 — Student Admission & Profile Core

- **Status**: 🟢 **Phase 1.8 — COMPLETED, ACCEPTED & FROZEN**
- **Date**: 2026-08-11
- **Authors**: Senior Staff Architecture & Identity Team

---

## 1. Problem Definition & Context

Coaching institutes operate on student admissions, profiles, and academic tracking. A **Student** is the central learner aggregate within a coaching institute.

However, in a multi-tenant coaching SaaS architecture, managing student identity requires strict boundaries:
1. **Tenant Isolation**: A Student belongs strictly to one `Institute` (`instituteId`). Students are tenant-scoped, not platform-global.
2. **Separation from Global Identity**: A Student is distinct from global `ParentIdentity` (phone-anchored platform identity) and user authentication (`Better Auth User`).
3. **Separation from Guardian Relationships**: Guardian linking (`InstituteParentStudent` / `StudentLink`) belongs to **Phase 1.9**. Student profiles must not embed hardcoded parent fields (`fatherName`, `motherPhone`) as primary identity structures.
4. **Separation from Academic Enrollment**: Academic participation (`Enrollment`, `Program`, `Batch`, `Subject`) belongs to **Phase 1.10 & 1.11**. A Student aggregate represents the admitted learner entity, not their academic batch assignments or fee structures.

Phase 1.8 establishes the authoritative domain, persistence, security, and contract model for the **Student Admission & Profile Core**.

---

## 2. Existing Repository Audit Findings

### 2.1 Existing Tenant Architecture
- **TenantContext**: Resolved via session cookie and `@coaching-os/identity` use cases (`ResolveInstituteMembershipUseCase`). Contains trusted `instituteId`, `userId`, `role`, and evaluated capabilities.
- **RBAC & Capability Engine**: 53 registered capabilities. Capability taxonomy includes resource actions (`parent:read`, `settings:update`, etc.). Phase 1.8 introduces `student:read`, `student:create`, `student:update`, and `student:archive`.
- **Database Baseline (`infrastructure/database/prisma/schema.prisma`)**:
  - `Student` model exists with fields: `id`, `instituteId`, `admissionNumber`, `firstName`, `lastName`, `dateOfBirth`, `status` (`active`, `archived`), `createdAt`, `updatedAt`, `deletedAt`.
  - Missing in baseline schema: `middleName`, `gender`, `email`, `phone`, `address`, `city`, `state`, `postalCode`, `admissionDate`, `admissionStatus`, `notes`, and database constraint `@@unique([instituteId, admissionNumber])`.
  - Related models present: `InstituteParentStudent` (linking `InstituteParent` to `Student`), `StudentLink` (linking `ChildProfile` to `Student`), `Enrollment` (linking `Student` to `Batch`).

---

## 3. Core Student Concept & Boundary Model

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
       ┌───────┴───────┐                           ┌───────┴───────┐
       ▼               ▼                           ▼               ▼
InstituteParent     Student                 InstituteParent     Student
  (CRM Record)    (Learner A1)                (CRM Record)    (Learner B1)
```

### Distinction Table

| Dimension | `Better Auth User` | `ParentIdentity` (Phase 1.6) | `InstituteParent` (Phase 1.7) | `Student` (Phase 1.8) |
| :--- | :--- | :--- | :--- | :--- |
| **Scope** | Global (Auth) | Platform Global | Tenant-scoped (`Institute`) | Tenant-scoped (`Institute`) |
| **Primary Identifier** | `user.id` (UUID) | E.164 `phone` | `(instituteId, parentIdentityId)` | `student.id` (UUID) |
| **Human ID** | Email / User ID | E.164 Phone Number | N/A | `admissionNumber` (Tenant-scoped) |
| **Domain Role** | Credentials / Session | Global Parent Person | Institute Parent CRM Record | Institute Admitted Learner |
| **Authority** | Better Auth Engine | Global Identity Authority | Institute Staff CRM Authority | Institute Academic/Staff Authority |
| **Lifecycle** | `active`, `suspended` | `active`, `suspended`, `deactivated` | `active`, `inactive` | `admitted`, `active`, `inactive`, `archived` |

---

## 4. Student Aggregate Boundary & Field Classification

The `Student` aggregate represents the admitted learner entity within an institute.

```text
Student Aggregate Root
 ├── Identity (id, instituteId, admissionNumber)
 ├── Personal Profile (firstName, middleName, lastName, displayName, dateOfBirth, gender)
 ├── Contact & Address (phone, email, address, city, state, postalCode)
 ├── Admission Information (admissionDate, admissionStatus)
 └── Lifecycle (status, createdAt, updatedAt, deletedAt)
```

### Field Classification

1. **Identity & Tenant Scope**:
   - `id`: UUID (Primary Key, immutable).
   - `instituteId`: UUID (Foreign Key to `Institute.id`, mandatory, immutable).
   - `admissionNumber`: String (Tenant-scoped human identifier, e.g., `ADM-2026-001`, unique per institute).

2. **Personal Profile**:
   - `firstName`: String (1-100 chars, required).
   - `middleName`: String (Optional, 1-100 chars).
   - `lastName`: String (1-100 chars, required).
   - `displayName`: Computed getter (`firstName + " " + lastName`).
   - `dateOfBirth`: Date (Optional ISO Date string, e.g. `2010-05-15`).
   - `gender`: Enum (`male`, `female`, `other`, `prefer_not_to_say`, optional).

3. **Contact & Address** (Direct learner contact information):
   - `phone`: String (Optional E.164 format, e.g. `+919876543210`).
   - `email`: String (Optional lowercase email address).
   - `address`: String (Optional street address).
   - `city`: String (Optional city name).
   - `state`: String (Optional state name).
   - `postalCode`: String (Optional PIN/Zip code).

4. **Admission Details**:
   - `admissionDate`: Date (ISO Date, default `today`).
   - `admissionStatus`: Enum (`pending`, `admitted`, `rejected`, `cancelled`).

5. **Lifecycle**:
   - `status`: Enum (`active`, `inactive`, `archived`).
   - `createdAt`: DateTime (Timestamp).
   - `updatedAt`: DateTime (Timestamp).
   - `deletedAt`: DateTime (Optional timestamp for soft archiving).

---

## 5. Explicit Domain Separations

### 5.1 Separation from Academic Enrollment (Phase 1.10 & 1.11)
- `Student` does **NOT** contain `programId`, `batchId`, `subjectId`, or `academicYearId`.
- Academic enrollment is managed via the separate `Enrollment` aggregate (`studentId ➔ batchId`). A student can exist in an institute prior to or independent of active batch enrollments.

### 5.2 Separation from Guardian Links (Phase 1.9)
- `Student` does **NOT** contain `fatherId`, `motherId`, `guardianId`, or `parentId`.
- Guardian relationships are managed in Phase 1.9 via junction entities (`InstituteParentStudent` and `StudentLink`). This ensures a student can be associated with multiple parents/guardians without corrupting the core Student aggregate.

---

## 6. Admission vs Student Lifecycle State Machines

```text
Admission Lifecycle:   [PENDING] ────> [ADMITTED] ───> [REJECTED / CANCELLED]
                                           │
                                           ▼
Student Lifecycle:                     [ACTIVE] <───> [INACTIVE]
                                           │
                                           ▼
                                       [ARCHIVED]
```

- **Admission Status (`admissionStatus`)**: Tracks the administrative onboarding state (`pending` ➔ `admitted` / `rejected` / `cancelled`).
- **Student Status (`status`)**: Tracks standing after admission (`active` ➔ `inactive` ➔ `archived`).
- **Invariant**: Only students with `admissionStatus == 'admitted'` can transition to `status == 'active'`.

---

## 7. Admission Number Architecture

1. **Format**: Human-readable string configured per institute or auto-formatted (e.g. `STU-2026-0104`).
2. **Uniqueness**: Uniquely constrained per institute in PostgreSQL:
   ```sql
   @@unique([instituteId, admissionNumber], name: "student_admission_number_unique")
   ```
3. **Immutability & Scope**: `admissionNumber` can be supplied by staff or auto-generated. Once assigned, modifications are audited. Archived students retain their `admissionNumber` to prevent historic audit trail corruption.

---

## 8. Duplicate Student Detection Strategy

- **Hard Identity Constraint**: `UNIQUE(instituteId, admissionNumber)`.
- **Soft Duplicate Warning Signals**:
  - Exact match on `(instituteId, phone)` when phone is provided.
  - Exact match on `(instituteId, firstName, lastName, dateOfBirth)`.
- **Policy**: Duplicate soft signals raise warnings/confirmation prompts during UI admission, while duplicate `admissionNumber` produces a hard `ConflictError` (409 status).

---

## 9. Privacy & Security Classification

| Data Category | Fields | Access Level | Log Policy |
| :--- | :--- | :--- | :--- |
| **Public** | None | N/A | N/A |
| **Tenant Staff** | `id`, `admissionNumber`, `firstName`, `lastName`, `status` | Authorized Staff (`student:read`) | Standard UUID logging |
| **Sensitive Profile** | `phone`, `email`, `dateOfBirth`, `address` | Authorized Staff (`student:read`) | **PII Redacted** in Pino logs |
| **Audit Metadata** | `createdAt`, `updatedAt`, `deletedAt` | System / Staff | Standard logging |

---

## 10. Multi-Tenant Security & TenantContext Contract

1. **Session Scope Invariant**: All Student operations execute under:
   ```text
   Session ➔ InstituteMembership ➔ TenantContext ➔ Capability Guard ➔ Student Use Case
   ```
2. **Header/Query Parameter Untrust Mandate**: `instituteId` from query params, body payloads, or headers (`x-institute-id`) is **strictly ignored**. Server-resolved `TenantContext.instituteId` is the single source of truth.
3. **Cross-Tenant Barrier**: Querying or mutating a `studentId` belonging to another institute returns a tenant-safe `404 Not Found` (never 403, preventing resource existence enumeration).

---

## 11. Authorization Architecture & Capabilities

Phase 1.8 registers 4 new strongly-typed capabilities in `@coaching-os/identity`:

```ts
export const CAPABILITIES = {
  // Existing 53 capabilities...
  STUDENT_READ: 'student:read',
  STUDENT_CREATE: 'student:create',
  STUDENT_UPDATE: 'student:update',
  STUDENT_ARCHIVE: 'student:archive',
} as const;
```

### Role Authorization Matrix

| Capability | Owner | Admin | Teacher | Assistant | Parent / Student |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `student:read` | ✅ | ✅ | ✅ (Resource Scoped) | ✅ | ❌ (Staff CRM only) |
| `student:create` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `student:update` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `student:archive` | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 12. Threat Matrix (STUDENT-01 through STUDENT-18)

| Threat ID | Threat Description | Attack Vector | Expected Mitigation | Architectural Defense |
| :--- | :--- | :--- | :--- | :--- |
| `STUDENT-01` | Unauthenticated Access | Anonymous request to `/students` | Returns 401 Unauthorized | Better Auth Session Guard |
| `STUDENT-02` | Unauthorized Role Access | Parent user attempting staff admission API | Returns 403 Forbidden | Capability Engine (`student:create`) |
| `STUDENT-03` | Cross-Tenant Lookup | Tenant A staff accessing Tenant B student ID | Returns 404 Not Found | Tenant-scoped SQL query filter |
| `STUDENT-04` | `instituteId` Body Injection | Client sends alien `instituteId` in payload | Field ignored / Zod `.strict()` | `TenantContext.instituteId` override |
| `STUDENT-05` | Query Parameter Spoofing | Request with `?instituteId=<other>` | Parameter ignored | Server session resolution |
| `STUDENT-06` | Header Spoofing | Spoofed `x-role` or `x-institute-id` header | Headers ignored | Session cookie context resolution |
| `STUDENT-07` | `studentId` Manipulation | Iterating UUIDs in URL paths | Returns 404 for alien UUIDs | Scope validation on DB lookup |
| `STUDENT-08` | Admission Number Scan | Scanning `admissionNumber` across tenants | Scoped to caller tenant | `WHERE institute_id = :tenantId` |
| `STUDENT-09` | Sensitive Field Leakage | Exposing student PII in public logs | Automatic log inspection | Pino redaction (`phone`, `email`, `address`) |
| `STUDENT-10` | Unauthorized Mutation | Assistant mutating student record | Returns 403 Forbidden | Capability Engine (`student:update`) |
| `STUDENT-11` | Cross-Tenant Update | PATCH request targeting alien student ID | Returns 404 Not Found | Scoped UPDATE statement |
| `STUDENT-12` | Cross-Tenant Archive | DELETE request targeting alien student ID | Returns 404 Not Found | Scoped archive operation |
| `STUDENT-13` | Duplicate Admission No. | Creating student with existing admission number | Returns 409 Conflict | `@@unique([instituteId, admissionNumber])` |
| `STUDENT-14` | Race Condition | Concurrent creation of same admission number | DB unique constraint error | Caught and converted to `ConflictError` |
| `STUDENT-15` | Audit Traceability | Mutating student without log traceability | System audit check | Pino structured observability logging (`@coaching-os/observability`) |
| `STUDENT-16` | Identity Leakage | Exposing parent identity in student DTO | Inspecting Student DTO | Zero parent fields in `StudentDTO` |
| `STUDENT-17` | Guardian Leakage | Leaking unlinked guardian records | Inspecting student details | Link check enforced in Phase 1.9 |
| `STUDENT-18` | Enrollment Leakage | Leaking batch enrollment in profile DTO | Inspecting student DTO | Enrollment boundary isolated to Phase 1.11 |

> [!NOTE]
> **Audit Traceability Clarification (`STUDENT-15`)**: Phase 1.8 enforces structured application and observability logging (`logger.info` via `@coaching-os/observability`) across all 10 student use cases, recording `actorUserId`, `instituteId`, `studentId`, `admissionNumber`, and `operation` while redacting PII. Durable domain audit trail persistence via the dedicated `@coaching-os/audit` package is distinct from observability logging and is scheduled for system-wide audit event integration.

---

## 13. Future API & UI Boundary Specifications (Conceptual)

### 13.1 Conceptual API Boundary (`apps/web/src/app/api/institute/students/`)
- `GET /api/institute/students`: List paginated students for active tenant.
- `POST /api/institute/students`: Admit/Create student record for active tenant.
- `GET /api/institute/students/[id]`: Retrieve detailed student record.
- `PATCH /api/institute/students/[id]`: Update student profile details.
- `DELETE /api/institute/students/[id]`: Soft archive student record.

### 13.2 Conceptual UI Feature Boundary (`apps/web/src/features/student/`)
- `StudentList`: Container component managing filters, search, pagination.
- `StudentTable`: Desktop presentation table for student list.
- `StudentCard`: Mobile card layout for viewports < 768px.
- `StudentDetailsModal`: Dialog displaying student profile.
- `StudentFormModal`: Accessible modal for student admission & edits.
- `StudentStatusBadge`: Semantic status indicator badge.

---

## 14. Explicit Non-Goals for Phase 1.8

The following functionality is explicitly excluded from Phase 1.8:
- ❌ Guardian management & `InstituteParentStudent` linking (Phase 1.9).
- ❌ Academic hierarchy: Programs, Subjects, Batches (Phase 1.10).
- ❌ Academic Enrollment & Batch Assignments (Phase 1.11).
- ❌ Public / Protected `/api/v1/students` external APIs (Phase 1.12).
- ❌ Student PWA portal or self-service login.
- ❌ Parent portal student view.
- ❌ Attendance, Fees, Marks, Messaging, SMS, or Notifications.

---

## 15. Phase 1.8 Subphase Implementation Sequence

```text
Phase 1.8.0 — Architecture & Contract Freeze 🟢 (ACCEPTED & FROZEN)
    ↓
Phase 1.8.1 — Student Domain Entity & Value Objects 🟢 (COMPLETED)
Phase 1.8.2 — Student Repository & PostgreSQL Persistence Layer 🟢 (COMPLETED)
    ↓
Phase 1.8.3 — Student Application Use Cases 🟢 (COMPLETED)
Phase 1.8.4 — Student Admission & Lifecycle Rules 🟢 (COMPLETED)
    ↓
Phase 1.8.5 — Student API Boundary & Validators 🟢 (COMPLETED)
Phase 1.8.6 — Student Security / Tenant E2E Matrix 🟢 (COMPLETED)
    ↓
Phase 1.8.7 — Student Staff UI / Admission Feature 🟢 (COMPLETED)
Phase 1.8.8 — UX, Accessibility & Admission Workflow Testing 🟢 (COMPLETED)
    ↓
Phase 1.8.9 — Phase 1.8 Acceptance Gate 🟢 (ACCEPTED & FROZEN)
```

---

## 16. Acceptance Criteria for Phase 1.8.0

Phase 1.8.0 is ACCEPTED & FROZEN when:
1. Architectural distinction between `Better Auth User`, `ParentIdentity`, `InstituteParent`, and `Student` is documented.
2. Tenant-scoped aggregate boundary (`instituteId`) and field classifications are defined.
3. Separation from Academic Enrollment (Phase 1.11) and Guardian Links (Phase 1.9) is frozen.
4. Admission and Student lifecycle state machines are defined.
5. Admission number uniqueness contract `UNIQUE(instituteId, admissionNumber)` is specified.
6. Threat Matrix (`STUDENT-01` to `STUDENT-18`) is documented.
7. ADR-0011 is written and accepted.
8. `docs/CONTEXT.md` is updated.
9. **Zero runtime code, schema migrations, API routes, or UI components were created in Phase 1.8.0**.
10. All existing tests, typecheck, lint, build, and verification scripts pass cleanly.
