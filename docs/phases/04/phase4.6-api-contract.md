# Phase 4.6 — Protected Communication REST APIs Architecture & Contract

> **Status:** 🟢 **ACCEPTED & FROZEN**  
> **Milestone:** Phase 4.6 — Protected Communication REST APIs  
> **Implementation Target:** Phase 4.6.1 — Protected Communication REST API Implementation  
> **Authoritative Specification:** [`docs/phases/04/phase4.0-communication-contract.md`](file:///home/supra/Desktop/class_os/docs/phases/04/phase4.0-communication-contract.md)  
> **Execution Date:** August 14, 2026  

---

## 1. Executive Summary

Phase 4.6 establishes the authoritative REST API architecture and contract for the Communication Module of CoachingOS. It bridges the already-implemented and verified Communication engines:
- Phase 4.1 Announcement Engine (`packages/communication/src/application/use-cases/announcement.use-cases.ts`)
- Phase 4.2 Notification Core & In-App Engine (`packages/communication/src/application/use-cases/notification.use-cases.ts`)
- Phase 4.3 Child Activity Timeline Engine (`packages/communication/src/application/use-cases/activity.use-cases.ts`)
- Phase 4.4 / 4.4.1 Domain Event Integration & Projections
- Phase 4.5 Outbound Messaging Queue & WhatsApp Provider

This phase freezes all HTTP endpoint signatures, request/response DTO shapes, Zod validation schemas, RBAC capability checks, tenant-isolation invariants, and error envelopes **WITHOUT creating production routes (`route.ts`) or mutating Prisma models (`schema.prisma`)**.

---

## 2. Scope & Non-Goals

### In-Scope
- Specification of `/api/v1/communication/announcements*` REST endpoints.
- Specification of `/api/v1/communication/notifications*` REST endpoints.
- Specification of `/api/v1/students/{studentId}/activities*` REST endpoints.
- Security threat modeling, recipient isolation, cross-tenant enumeration defenses, rate limiting, and Pino structured logging.

### Explicit Non-Goals
- **NO Production Route Implementation**: `route.ts` files will be built in Phase 4.6.1.
- **NO Business Logic in HTTP Layer**: REST routes are thin adapters delegating 100% to application use cases.
- **NO Direct Database / Prisma Access in Routes**: Routes consume domain entities via Application DTOs.
- **NO Public Direct Outbound Queue / WhatsApp Management APIs**: WhatsApp delivery remains an internal asynchronous queue concern.
- **NO Database Schema Changes**: Prisma schema changes count = 0.
- **NO UI Components or PWA Pages**: UI integration belongs to Phase 4.7 / Phase 5.

---

## 3. API Architecture & Layering

```text
HTTP Client Request
        │
        ▼
Next.js 16 App Router (/api/v1/communication/...)
        │
        ▼
Rate Limiter (assertReadRateLimit / assertMutationRateLimit)
        │
        ▼
Server-Authoritative Tenant Guard (resolveV1TenantContext)
        │
        ▼
Capability Authorization (AuthorizationEngine.requireCapability)
        │
        ▼
Zod Request Input Validation (.safeParse)
        │
        ▼
Application Use Case (e.g. ListNotificationsUseCase)
        │
        ▼
Domain Entity Repository (e.g. PrismaNotificationRepository)
        │
        ▼
PostgreSQL Database
```

---

## 4. Route Inventory

| Path | Methods Allowed | Methods Rejected (405) | Description |
| :--- | :--- | :--- | :--- |
| `/api/v1/communication/announcements` | `GET`, `POST` | `PUT`, `PATCH`, `DELETE` | List & Create Announcements |
| `/api/v1/communication/announcements/{id}` | `GET`, `PATCH`, `DELETE` | `POST`, `PUT` | Detail, Update Draft, Delete Draft |
| `/api/v1/communication/announcements/{id}/publish` | `POST` | `GET`, `PUT`, `PATCH`, `DELETE` | Publish Announcement |
| `/api/v1/communication/announcements/{id}/archive` | `POST` | `GET`, `PUT`, `PATCH`, `DELETE` | Archive Announcement |
| `/api/v1/communication/notifications` | `GET` | `POST`, `PUT`, `PATCH`, `DELETE` | List Recipient Notifications |
| `/api/v1/communication/notifications/unread-count` | `GET` | `POST`, `PUT`, `PATCH`, `DELETE` | Unread Notification Count |
| `/api/v1/communication/notifications/{id}` | `GET` | `POST`, `PUT`, `PATCH`, `DELETE` | Notification Detail |
| `/api/v1/communication/notifications/{id}/read` | `POST` | `GET`, `PUT`, `PATCH`, `DELETE` | Mark Notification as Read |
| `/api/v1/students/{studentId}/activities` | `GET` | `POST`, `PUT`, `PATCH`, `DELETE` | Student Activity Timeline |
| `/api/v1/students/{studentId}/activities/{id}` | `GET` | `POST`, `PUT`, `PATCH`, `DELETE` | Student Activity Detail |

---

## 5. HTTP Method Matrix & State Mutability Rules

- **Announcements**:
  - `GET`: Read lists / details (draft, published, archived).
  - `POST`: Create draft announcement OR state transitions (`/publish`, `/archive`).
  - `PATCH`: **Draft announcements only**. Attempting to `PATCH` a published or archived announcement throws `ValidationError` (domain state machine rejection).
  - `DELETE`: **Draft announcements only**. Attempting to `DELETE` a published or archived announcement throws `ValidationError`.
- **Notifications**:
  - `GET`: Read list, detail, or unread count for the authenticated recipient.
  - `POST /read`: State transition from `isRead: false` $\rightarrow$ `isRead: true`.
  - `POST` (create), `PATCH`, `DELETE`: **405 Method Not Allowed**. Public clients cannot forge or delete notifications.
- **Activity Timeline**:
  - `GET`: Read student timeline records.
  - `POST`, `PUT`, `PATCH`, `DELETE`: **405 Method Not Allowed**. Activities are immutable timeline entries generated exclusively by server projections.

---

## 6. Authentication & Tenant Resolution Contract

### Server-Authoritative Tenant Context (R-COM-API-001)

All Communication endpoints resolve tenancy server-side using `resolveV1TenantContext(req)`:
1. Session validated via `getAuthenticatedSession(req.headers)`. Unauthenticated requests throw `AuthenticationError` ($\rightarrow$ `401 Unauthorized`).
2. User membership fetched via `GetUserMembershipsUseCase`.
3. Server-verified `instituteId`, `userId`, `role`, and `permissions` are returned in `TenantContext`.
4. **INVARIANT**: Client-supplied `instituteId` in request body, query params, headers, or URL paths is **STRICTLY IGNORED**.

---

## 7. Capability & Role Authorization Matrix

| Endpoint | Required Capability | Authorized Roles | Additional Ownership Check |
| :--- | :--- | :--- | :--- |
| `GET /announcements` | `announcement:read` | `owner`, `admin`, `teacher`, `staff` | Tenant-scoped |
| `GET /announcements/{id}` | `announcement:read` | `owner`, `admin`, `teacher`, `staff` | Tenant-scoped |
| `POST /announcements` | `announcement:create` | `owner`, `admin`, `teacher` | Tenant-scoped |
| `PATCH /announcements/{id}` | `announcement:update` | `owner`, `admin`, `teacher` | Draft state only |
| `DELETE /announcements/{id}` | `announcement:delete` | `owner`, `admin` | Draft state only |
| `POST /announcements/{id}/publish` | `announcement:publish` | `owner`, `admin` | Transition: Draft $\rightarrow$ Published |
| `POST /announcements/{id}/archive` | `announcement:publish` | `owner`, `admin` | Transition: Published $\rightarrow$ Archived |
| `GET /notifications` | `notification:read` | All active users | **Recipient-scoped (`recipientUserId === ctx.userId`)** |
| `GET /notifications/unread-count` | `notification:read` | All active users | **Recipient-scoped (`recipientUserId === ctx.userId`)** |
| `GET /notifications/{id}` | `notification:read` | All active users | **Recipient-scoped (`recipientUserId === ctx.userId`)** |
| `POST /notifications/{id}/read` | `notification:read` | All active users | **Recipient-scoped (`recipientUserId === ctx.userId`)** |
| `GET /students/{studentId}/activities` | `activity:read` | `owner`, `admin`, `teacher`, `parent` | Student Access Authorization |
| `GET /students/{studentId}/activities/{id}` | `activity:read` | `owner`, `admin`, `teacher`, `parent` | Student Access Authorization |

---

## 8. Announcement API Specification

### 8.1 Create Announcement
- **Endpoint**: `POST /api/v1/communication/announcements`
- **Capability**: `announcement:create`
- **Request Body (Zod `createAnnouncementSchema`)**:
  ```json
  {
    "targetType": "institute",
    "targetBatchId": null,
    "title": "Annual Sports Day Notice",
    "content": "Sports Day will be held on December 15th."
  }
  ```
- **Validation**:
  - `targetType === 'institute'` $\Rightarrow$ `targetBatchId` must be `null` or omitted.
  - `targetType === 'batch'` $\Rightarrow$ `targetBatchId` must be a valid UUID belonging to the tenant.
- **Success Response (`201 Created`)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "c1f8e400-8f92-4f1b-8e12-000000000001",
      "instituteId": "a1b2c3d4-0000-0000-0000-000000000000",
      "authorUserId": "u1v2w3x4-0000-0000-0000-000000000000",
      "targetType": "institute",
      "targetBatchId": null,
      "title": "Annual Sports Day Notice",
      "content": "Sports Day will be held on December 15th.",
      "status": "draft",
      "publishedAt": null,
      "archivedAt": null,
      "createdAt": "2026-08-14T21:30:00.000Z",
      "updatedAt": "2026-08-14T21:30:00.000Z"
    },
    "meta": { "requestId": "req_12345", "timestamp": "2026-08-14T21:30:00.000Z" }
  }
  ```

### 8.2 Publish Announcement
- **Endpoint**: `POST /api/v1/communication/announcements/{id}/publish`
- **Capability**: `announcement:publish`
- **Behavior**: Transitions draft to `published`, sets `publishedAt = now()`, and emits `communication.announcement.published` domain event.
- **Success Response (`200 OK`)**: Standard envelope containing updated Announcement DTO.

---

## 9. Notification API Specification

### 9.1 List Notifications
- **Endpoint**: `GET /api/v1/communication/notifications`
- **Query Parameters**:
  - `isRead` (boolean, optional): Filter by read status.
  - `cursor` (UUID, optional): Next cursor for pagination.
  - `limit` (integer, default `20`, max `100`): Page limit.
- **Capability**: `notification:read`
- **Recipient Isolation (R-COM-API-002)**: Returns notifications where `recipientUserId === ctx.userId` and `instituteId === ctx.instituteId`.
- **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "n1f8e400-8f92-4f1b-8e12-000000000001",
        "instituteId": "a1b2c3d4-0000-0000-0000-000000000000",
        "recipientUserId": "u1v2w3x4-0000-0000-0000-000000000000",
        "recipientType": "parent",
        "priority": "critical",
        "category": "attendance",
        "title": "Absent Alert",
        "message": "Student John Doe was marked absent.",
        "actionUrl": null,
        "isRead": false,
        "readAt": null,
        "createdAt": "2026-08-14T21:30:00.000Z"
      }
    ],
    "pagination": {
      "cursor": null,
      "nextCursor": "n1f8e400-8f92-4f1b-8e12-000000000001",
      "hasMore": false,
      "pageSize": 20
    },
    "meta": { "requestId": "req_12345", "timestamp": "2026-08-14T21:30:00.000Z" }
  }
  ```

### 9.2 Mark Notification as Read
- **Endpoint**: `POST /api/v1/communication/notifications/{id}/read`
- **Capability**: `notification:read`
- **Behavior**: Marks notification read for `ctx.userId`. Returns `404 Not Found` if notification belongs to another user or tenant.

---

## 10. Activity Timeline API Specification

### 10.1 List Student Activities
- **Endpoint**: `GET /api/v1/students/{studentId}/activities`
- **Query Parameters**:
  - `eventType` (string, optional): Filter by `attendance_absent`, `attendance_present`, `homework_assigned`, `test_result`, `fee_payment`, `receipt_issued`, `announcement`.
  - `cursor` (UUID, optional): Next cursor for pagination.
  - `limit` (integer, default `20`, max `100`): Page limit.
- **Capability**: `activity:read`
- **Student Timeline Authorization**:
  - Staff (`owner`, `admin`, `teacher`): Granted access if student belongs to tenant.
  - Parent: Granted access if parent is linked to `studentId` via `InstituteParentStudent`.
- **Ordering**: Deterministic `occurredAt DESC, id DESC`.
- **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "act_1001-0000-0000-0000-000000000000",
        "instituteId": "a1b2c3d4-0000-0000-0000-000000000000",
        "studentId": "s1t2u3v4-0000-0000-0000-000000000000",
        "eventType": "attendance_absent",
        "title": "Absent for Physics Session",
        "description": "Student was marked absent for Physics 101.",
        "occurredAt": "2026-08-14T10:00:00.000Z",
        "actorName": "Teacher Smith",
        "createdAt": "2026-08-14T10:05:00.000Z"
      }
    ],
    "pagination": {
      "cursor": null,
      "nextCursor": "act_1001-0000-0000-0000-000000000000",
      "hasMore": false,
      "pageSize": 20
    },
    "meta": { "requestId": "req_12345", "timestamp": "2026-08-14T21:30:00.000Z" }
  }
  ```

---

## 11. Security Threat Model & IDOR Defenses

| Threat ID | Threat Vector | Defense Mechanism | Response |
| :--- | :--- | :--- | :--- |
| **T-API-001** | Cross-tenant announcement query (`GET /announcements/{foreignId}`) | `findById(instituteId, id)` check | `404 Not Found` (Enumeration Masked) |
| **T-API-002** | Cross-user notification IDOR (`GET /notifications/{otherUserIdNotif}`) | Recipient check (`recipientUserId === ctx.userId`) | `404 Not Found` |
| **T-API-003** | Cross-tenant student activity access (`GET /students/{foreignStudent}/activities`) | Tenant verification + Student parent link lookup | `404 Not Found` |
| **T-API-004** | Client `instituteId` spoofing in body/params | `resolveV1TenantContext` overrides all client input | Server context enforced |
| **T-API-005** | Unauthorized HTTP method (`PATCH /activities/123`) | `methodNotAllowed(['GET'])` | `405 Method Not Allowed` |
| **T-API-006** | Published announcement alteration (`PATCH /announcements/{publishedId}`) | Domain entity state invariant check | `400 Bad Request` / `ValidationError` |
| **T-API-007** | Rate limit abuse on list endpoints | `assertReadRateLimit(req, ctx.userId)` | `429 Too Many Requests` |
| **T-API-008** | WhatsApp queue raw endpoint tampering | Outbound queue endpoints **NOT EXPOSED** | `404 Not Found` |

---

## 12. Rate Limiting Contract

Using standard `@coaching-os/web` rate limiters (`rate-limiter.ts`):
- **Read Operations (`GET`)**: `assertReadRateLimit` (100 requests per minute per IP/user).
- **Mutation Operations (`POST`, `PATCH`, `DELETE`)**: `assertMutationRateLimit` (30 requests per minute per IP/user).
- Exceeding limits returns `429 Too Many Requests` with `Retry-After: <seconds>` header.

---

## 13. Reconciliations & Open Risks

### Reconciliations
- **R-API-001 (Outbound Messaging API)**: Phase 4.5 outbound WhatsApp queue is an internal worker concern. Raw queue control endpoints are NOT exposed in REST API v1.

### Open Risks
- None. API surface strictly matches completed Phase 4.1–4.5 use cases.

---

## 14. Acceptance Criteria & Quality Gates

Phase 4.6 Contract Freeze is ACCEPTED only when:
- Authoritative contract `docs/phases/04/phase4.6-api-contract.md` is written and frozen.
- No production route files (`route.ts`) were created.
- No database schema changes were made.
- Monorepo Quality Gates pass 100%:
  ```bash
  pnpm env:check     # 🟢 PASS
  pnpm db:validate   # 🟢 PASS
  pnpm db:health     # 🟢 PASS
  pnpm typecheck     # 🟢 PASS
  pnpm lint          # 🟢 PASS
  pnpm test          # 🟢 PASS
  pnpm build         # 🟢 PASS
  ```

---

## 15. Next Milestone

Phase 4.6 is **ACCEPTED & FROZEN**. Ready for authorization of:

**Phase 4.6.1 — Protected Communication REST API Implementation**
