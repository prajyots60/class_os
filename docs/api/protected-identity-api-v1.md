# Protected Identity API v1 Developer Specification (`/api/v1/...`)

- **API Version**: `v1`
- **Status**: 🟢 **ACCEPTED & FROZEN** (Phase 1.12)
- **Base URI**: `/api/v1`
- **Authoritative Standard**: ADR-0015

---

## 1. Overview & Architecture

The **Protected Identity API v1** provides a versioned, secure, multi-tenant HTTP interface for enterprise clients, mobile applications, and internal staff portal consumption.

### Internal vs Protected API Boundary

| Dimension | Internal Application Routes (`/api/institute/...`) | Protected Versioned APIs (`/api/v1/...`) |
| :--- | :--- | :--- |
| **Consumer** | Web UI Pages / Server Components | Mobile Apps, Enterprise Integrations, Web Clients |
| **Versioning** | Unversioned (dynamic with UI) | Path Versioned (`/api/v1/...`), Additive Guarantees |
| **Envelope** | Direct JSON / View Models | Standardized JSON Envelope (`data`, `pagination`, `meta`) |
| **Stability** | Internal implementation detail | Backwards-Compatible Stable API Contract |
| **Scoping** | Session-bound | Server-Authoritative Scoped via `InstituteMembership` |

---

## 2. Authentication & Session Resolution

All calls to `/api/v1/...` require an active, authenticated identity session.

### Authentication Mechanisms

1. **Session Cookie**: Pass `auth_session` cookie in request headers (used automatically by browser apps or SDK with `credentials: 'same-origin'`).
2. **Bearer Token**: Pass `Authorization: Bearer <session_token>` header.

### Server-Authoritative Tenant Resolution

- `TenantContext` (`instituteId`, `userId`, `role`, `membershipId`) is resolved **strictly on the server** by matching the authenticated session against active `InstituteMembership` database records.
- Client headers (`x-institute-id`), query parameters, or payload fields seeking to inject `instituteId`, `userId`, `role`, or `membershipId` are **REJECTED** or **STRIPPED** via `.strict()` Zod schemas.
- If no valid session is provided, the API returns **`401 UNAUTHENTICATED`**.

---

## 3. Standardized Response Envelopes

Every `/api/v1` response follows a strict, predictable JSON structure.

### 3.1 Single Resource Envelope

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

### 3.2 Collection / Paginated Envelope

```json
{
  "success": true,
  "data": [
    {
      "id": "e9b8f2c3-4d5e-6f7a-8b9c-0d1e2f3a4b5c",
      "admissionNumber": "ADM-2026-001",
      "firstName": "Aarav",
      "lastName": "Sharma",
      "status": "active"
    }
  ],
  "pagination": {
    "cursor": null,
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

---

## 4. Error Contract & Error Taxonomy

When an HTTP status >= 400 is returned, the API provides a standardized error envelope:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed.",
    "details": [
      {
        "field": "email",
        "issue": "Invalid email address format."
      }
    ]
  },
  "meta": {
    "requestId": "1749d056-b8d8-4883-8f19-d6e03e4d1b49",
    "timestamp": "2026-08-12T14:17:27.000Z"
  }
}
```

### Taxonomy Matrix

| Error Code | HTTP Status | Description |
| :--- | :---: | :--- |
| `UNAUTHENTICATED` | 401 | Missing, expired, or invalid session token. |
| `FORBIDDEN` | 403 | Authenticated user lacks required capability or scope. |
| `NOT_FOUND` | 404 | Resource does not exist OR belongs to another tenant. |
| `VALIDATION_ERROR` | 400 | Invalid payload, unknown fields, or bad query parameters. |
| `CONFLICT` | 409 | Resource state collision (e.g. duplicate admission number). |
| `INVALID_STATE_TRANSITION` | 422 | Action violates aggregate state machine transition rules. |
| `RATE_LIMITED` | 429 | Bucket rate limit exceeded. `Retry-After` header included. |
| `INTERNAL_ERROR` | 500 | Unexpected server error. Stack traces redacted in production. |

---

## 5. Cursor Pagination Specification

All collection endpoints support cursor-based pagination.

- **Query Parameters**:
  - `limit`: Integer between `1` and `100` (default: `20`).
  - `cursor`: Opaque cursor string returned in the previous page's `nextCursor`.
- **Response Fields**:
  - `pagination.cursor`: Current page cursor (or `null`).
  - `pagination.nextCursor`: Cursor string for fetching the next page (or `null` if no more records).
  - `pagination.hasMore`: `true` if additional records remain.
  - `pagination.pageSize`: Number of items returned on this page.
  - `pagination.total`: Total count of matching records in tenant scope.

---

## 6. Rate Limiting & Bucket Keying

Rate limiting is enforced at the API boundary before database execution.

- **Read Operations (`GET`)**: 100 requests / minute per bucket.
- **Mutation Operations (`PATCH`, `POST`, `DELETE`)**: 30 requests / minute per bucket.
- **Bucket Key Format**:
  - Authenticated: `user:<userId>:ip:<ip>`
  - Unauthenticated: `ip:<ip>`
- **Throttled Response (`429 RATE_LIMITED`)**:
  - Header: `Retry-After: <seconds>`
  - Body: `{ "success": false, "error": { "code": "RATE_LIMITED", "message": "Rate limit exceeded..." } }`

---

## 7. Tenant Isolation & ID Enumeration Defense

To satisfy security invariant `IDENTITY-19`:
- Any request for a resource ID belonging to another institute/tenant will yield **`404 NOT_FOUND`**, identical to requesting a completely non-existent UUID.
- This prevents malicious actors from discovering resource existence across tenants via brute-force ID probing or `403 FORBIDDEN` side-channels.

---

## 8. Endpoint Reference

### 8.1 Student Resource (`/api/v1/students`)

#### `GET /api/v1/students`
- **Capability**: `student:read`
- **Query Params**: `search` (string), `status` (`active`|`inactive`|`archived`), `admissionStatus` (`prospect`|`applied`|`admitted`|`enrolled`|`rejected`|`withdrawn`), `limit` (1-100), `cursor` (string)
- **Response**: Paginated `StudentDTO` array.

#### `GET /api/v1/students/:id`
- **Capability**: `student:read`
- **Path Params**: `id` (UUID)
- **Response**: Single `StudentDTO`.

#### `PATCH /api/v1/students/:id`
- **Capability**: `student:update`
- **Path Params**: `id` (UUID)
- **Request Body**:
  ```json
  {
    "firstName": "Aarav",
    "lastName": "Sharma",
    "email": "aarav.sharma@example.com",
    "phone": "+919876543210",
    "dob": "2008-05-15",
    "gender": "male"
  }
  ```
- **Response**: Updated `StudentDTO`. Immutable fields (`admissionNumber`, `instituteId`) are strictly rejected if passed.

#### `GET /api/v1/students/:id/guardians`
- **Capability**: `relationship:read`
- **Path Params**: `id` (UUID)
- **Response**: Array of `StudentGuardianSummaryDTO`.

---

### 8.2 Guardian / Parent Resource (`/api/v1/guardians`)

#### `GET /api/v1/guardians`
- **Capability**: `guardian:read`
- **Query Params**: `search` (string), `status` (`active`|`inactive`|`archived`), `limit` (1-100), `cursor` (string)
- **Response**: Paginated `InstituteParentDTO` array.

#### `GET /api/v1/guardians/:id`
- **Capability**: `guardian:read`
- **Path Params**: `id` (UUID)
- **Response**: Single `InstituteParentDTO`.

#### `GET /api/v1/guardians/:id/students`
- **Capability**: `relationship:read`
- **Path Params**: `id` (UUID)
- **Response**: Array of `ParentStudentSummaryDTO`.

---

### 8.3 Staff / Membership Resource (`/api/v1/staff`)

#### `GET /api/v1/staff`
- **Capability**: `staff:read`
- **Query Params**: `search` (string), `role` (`owner`|`admin`|`teacher`|`assistant`), `status` (`active`|`suspended`|`invitation_pending`), `limit` (1-100), `cursor` (string)
- **Response**: Paginated `StaffMembershipDTO` array. (Sensitive auth credentials, password hashes, and MFA secrets are redacted).

#### `GET /api/v1/staff/:id`
- **Capability**: `staff:read`
- **Path Params**: `id` (UUID)
- **Response**: Single `StaffMembershipDTO`.

---

### 8.4 Enrollment Resource (`/api/v1/enrollments`)

#### `GET /api/v1/enrollments`
- **Capability**: `enrollment:read`
- **Resource Scoping**: Teachers are strictly scoped to enrollments in assigned batches.
- **Query Params**: `studentId` (UUID), `batchId` (UUID), `status` (`enrolled`|`completed`|`withdrawn`|`transferred`), `limit` (1-100), `cursor` (string)
- **Response**: Paginated `EnrollmentDTO` array.

#### `GET /api/v1/enrollments/:id`
- **Capability**: `enrollment:read`
- **Path Params**: `id` (UUID)
- **Response**: Single `EnrollmentDTO`.

---

## 9. Authorization Capability & Resource Scoping Matrix

### Why Did Request Fail?

- **Received `403 FORBIDDEN`**: Your user role does not possess the mandatory capability (e.g. `parent` role attempting `staff:read` or `student:update`).
- **Received `404 NOT_FOUND`**:
  - The resource does not exist.
  - The resource belongs to another tenant/institute.
  - You are a `teacher` role requesting an enrollment or student outside your assigned batches.

---

## 10. Client SDK Reference (`V1IdentityApiClient`)

The `@coaching-os/identity/client` package provides a pure, client-safe TypeScript SDK.

### 10.1 Initialization

```typescript
import { V1IdentityApiClient, V1ApiError } from '@coaching-os/identity/client';

const client = new V1IdentityApiClient({
  baseUrl: 'https://api.coachingos.app',
  credentials: 'same-origin',
});
```

### 10.2 Usage Examples

```typescript
// 1. List Students
const studentsPage = await client.students.list({
  search: 'Aarav',
  limit: 20,
});
console.log(studentsPage.data, studentsPage.pagination.nextCursor);

// 2. Fetch Single Student & Guardians
const student = await client.students.getById('stu-uuid');
const guardians = await client.students.getGuardians('stu-uuid');

// 3. Update Student Profile
const updatedStudent = await client.students.update('stu-uuid', {
  firstName: 'Aarav',
  phone: '+919876543210',
});

// 4. Fetch Staff Memberships
const staffPage = await client.staff.list({ role: 'teacher' });

// 5. Fetch Enrollments
const enrollmentsPage = await client.enrollments.list({ batchId: 'batch-uuid' });
```

### 10.3 Handling API Errors

```typescript
try {
  await client.students.getById('invalid-or-cross-tenant-id');
} catch (error) {
  if (error instanceof V1ApiError) {
    console.error(`API Error [${error.code}] Status: ${error.statusCode}`);
    console.error(`Message: ${error.message}`);
    console.error(`Request ID: ${error.requestId}`);
    if (error.statusCode === 429) {
      console.warn('Rate limited. Please retry later.');
    }
  }
}
```
