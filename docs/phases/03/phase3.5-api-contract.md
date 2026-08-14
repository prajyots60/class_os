# PHASE 3.5 — PROTECTED BILLING APIS ARCHITECTURE & CONTRACT

**CoachingOS — Contract Freeze v1.0**

**Status: 🟢 ACCEPTED & FROZEN**

This document establishes the authoritative architecture, route matrix, HTTP contracts, Zod schemas, tenant security rules, error normalization, capability authorization, audit requirements, rate limits, and acceptance test matrices for **Phase 3.5 — Protected Billing APIs** of CoachingOS.

Phase 3.0 (Billing Architecture), Phase 3.1 (BillingPlan Domain), Phase 3.2 (Invoice Engine), Phase 3.3 (Payment Engine), and Phase 3.4 (Receipt Engine) are **COMPLETED & FROZEN**. Phase 3.5 exposes the implemented Billing domain via protected `/api/v1` HTTP endpoints.

---

# 1. Architectural Position & Design Principles

The Protected Billing APIs reside in `apps/web/src/app/api/v1/`:

```text
HTTP Request
    │
    ▼
Authentication (Session & Auth Cookies — getAuthenticatedSession)
    │
    ▼
Tenant Context Resolution (resolveV1TenantContext ──► DB-verified InstituteMembership)
    │
    ▼
Rate Limiter (assertReadRateLimit / assertMutationRateLimit)
    │
    ▼
Capability Authorization (AuthorizationEngine.requireCapability)
    │
    ▼
Zod Input Validation (strict validation schemas in presentation/validators)
    │
    ▼
Billing Use Case Execution (packages/billing Use Cases)
    │
    ▼
Prisma Repository & PostgreSQL (Atomic Transactions & Row Locking)
    │
    ▼
Domain Events & Audit Logging (Post-commit publishing)
    │
    ▼
HTTP Response (apiSuccess / apiCollection ADR-0015 Envelopes)
```

### Core Architecture Rules
1. **Thin Route Adapter Pattern**: Route handlers MUST remain thin adapters. No business calculations, SQL queries, or Prisma calls allowed inside `apps/web` API routes.
2. **Server-Authoritative Tenant Scoping**: `ctx.instituteId` is derived exclusively from DB-verified session context (`resolveV1TenantContext()`). Client-supplied `instituteId` in query, body, or headers is strictly ignored.
3. **Cross-Tenant Masking**: Accessing resources outside the user's institute membership MUST return `NotFoundError` (404) to prevent resource enumeration attacks.
4. **Method Safety**: Financial history is immutable. `PATCH` and `DELETE` on Invoices, Payments, and Receipts are strictly PROHIBITED (return 405 Method Not Allowed).

---

# 2. Source Reconciliations (R-API Register)

### R-API-001 — Canonical BillingPlan Route Terminology
- **Source Conflict**: Older DADD sections refer to `/fee-plans`. Phase 3 contracts established `BillingPlan` as canonical domain model.
- **Resolution**: Canonical API path is `/api/v1/billing-plans`. `/fee-plans` is NOT created. Zero compatibility aliases.

### R-API-002 — Receipt Download URL Boundary
- **Source Conflict**: DADD specifies `GET /api/v1/receipts/{id}` returns `downloadUrl` (signed S3/GCS URL). Phase 3.4.1 stopped before Object Storage deployment.
- **Resolution**: `GET /api/v1/receipts/{id}` returns receipt DTO metadata. `downloadUrl` is defined as `string | null` in the API schema (returns `null` until PDF worker storage integration in Phase 3.4 storage phase).

### R-API-003 — Payment List Filtering Parameters
- **Source Conflict**: DADD specifies `date`, `batch_id`, `student_id`.
- **Resolution**: Canonical query parameters map to camelCase API conventions: `invoiceId`, `studentId`, `batchId`, `fromDate`, `toDate`, `paymentMode`, `cursor`, `limit`.

### R-API-004 — Capability Constants Alignment
- **Resolution**: Use centralized capability constants from `@coaching-os/identity`:
  - `CAPABILITIES.BILLING_READ` (`billing:read`)
  - `CAPABILITIES.BILLING_WRITE` (`billing:write`)
  - `CAPABILITIES.PAYMENT_RECORD` (`payment:record`)
  - `CAPABILITIES.RECEIPT_READ` (`receipt:read`)
  - `CAPABILITIES.RECEIPT_ISSUE` (`receipt:issue`)

### R-API-005 — API Response & Error Envelope
- **Resolution**: Adheres strictly to ADR-0015 canonical shape (`apiSuccess`, `apiCollection`, `handleV1Error`).

### R-API-006 — Pagination Standards
- **Resolution**: Cursor-based pagination (`cursor`, `nextCursor`, `hasMore`, `pageSize`, `total`) with limit default 20, max 100.

### R-API-007 — Invoice Generation Trigger Semantics
- **Resolution**: `POST /api/v1/invoices` generates invoices manually/batch via `GenerateInvoiceUseCase`. Idempotency guarantees prevent duplicate period/installment invoices.

---

# 3. Complete Billing API Surface Matrix

| Resource | Method | Route | Purpose | Capability | Request Body / Query | Success Status | Response Envelope |
|---|---|---|---|---|---|---|---|
| **BillingPlan** | `GET` | `/api/v1/billing-plans` | List plans | `BILLING_READ` | `v1ListBillingPlansSchema` | 200 OK | `apiCollection` |
| **BillingPlan** | `POST` | `/api/v1/billing-plans` | Create plan | `BILLING_WRITE` | `v1CreateBillingPlanSchema` | 201 Created | `apiSuccess` |
| **BillingPlan** | `GET` | `/api/v1/billing-plans/{id}` | Get plan detail | `BILLING_READ` | `v1GetByIdSchema` | 200 OK | `apiSuccess` |
| **BillingPlan** | `PATCH` | `/api/v1/billing-plans/{id}` | Update plan | `BILLING_WRITE` | `v1UpdateBillingPlanSchema` | 200 OK | `apiSuccess` |
| **Invoice** | `GET` | `/api/v1/invoices` | List invoices | `BILLING_READ` | `v1ListInvoicesSchema` | 200 OK | `apiCollection` |
| **Invoice** | `POST` | `/api/v1/invoices` | Generate invoice | `BILLING_WRITE` | `v1GenerateInvoiceSchema` | 201 Created | `apiSuccess` |
| **Invoice** | `GET` | `/api/v1/invoices/{id}` | Get invoice detail | `BILLING_READ` | `v1GetByIdSchema` | 200 OK | `apiSuccess` |
| **Payment** | `GET` | `/api/v1/payments` | List payments | `BILLING_READ` | `v1ListPaymentsSchema` | 200 OK | `apiCollection` |
| **Payment** | `POST` | `/api/v1/payments` | Record payment | `PAYMENT_RECORD` | `v1RecordPaymentSchema` | 201 Created | `apiSuccess` |
| **Payment** | `GET` | `/api/v1/payments/{id}` | Get payment detail | `BILLING_READ` | `v1GetByIdSchema` | 200 OK | `apiSuccess` |
| **Receipt** | `GET` | `/api/v1/receipts/{id}` | Get receipt detail | `RECEIPT_READ` | `v1GetByIdSchema` | 200 OK | `apiSuccess` |
| **Receipt** | `POST` | `/api/v1/receipts` | Generate receipt | `RECEIPT_ISSUE` | `v1GenerateReceiptSchema` | 201 Created | `apiSuccess` |

---

# 4. Request & Response Schemas

### 4.1 BillingPlan Endpoints

#### `POST /api/v1/billing-plans`
- **Request Body**:
  ```json
  {
    "enrollmentId": "uuid",
    "feeType": "monthly | one_time | installment",
    "totalAmount": 12000.00,
    "billingStartDate": "2026-08-01",
    "installmentCount": 4,
    "discountType": "percentage | fixed",
    "discountValue": 10
  }
  ```
- **Response `data`**: `BillingPlanDTO`

#### `GET /api/v1/billing-plans`
- **Query Parameters**: `enrollmentId`, `studentId`, `feeType`, `cursor`, `limit` (max 100, default 20)
- **Response**: `apiCollection` array of `BillingPlanDTO`

---

### 4.2 Invoice Endpoints

#### `POST /api/v1/invoices`
- **Request Body**:
  ```json
  {
    "billingPlanId": "uuid",
    "billingPeriod": "2026-08",
    "installmentNumber": 1
  }
  ```
- **Response `data`**: `InvoiceDTO`

#### `GET /api/v1/invoices`
- **Query Parameters**: `billingPlanId`, `enrollmentId`, `studentId`, `status` (`pending` | `partial` | `paid`), `overdue` (`true` | `false`), `cursor`, `limit`
- **Response**: `apiCollection` array of `InvoiceDTO`

---

### 4.3 Payment Endpoints

#### `POST /api/v1/payments`
- **Request Body**:
  ```json
  {
    "invoiceId": "uuid",
    "amount": 5000.00,
    "paymentMode": "cash | upi | bank_transfer",
    "receivedOn": "2026-08-14",
    "remarks": "Optional notes"
  }
  ```
- **Response `data`**: `PaymentDTO`

#### `GET /api/v1/payments`
- **Query Parameters**: `invoiceId`, `studentId`, `batchId`, `paymentMode`, `fromDate`, `toDate`, `cursor`, `limit`
- **Response**: `apiCollection` array of `PaymentDTO`

---

### 4.4 Receipt Endpoints

#### `POST /api/v1/receipts`
- **Request Body**:
  ```json
  {
    "paymentId": "uuid"
  }
  ```
- **Response `data`**: `ReceiptDTO`

#### `GET /api/v1/receipts/{id}`
- **Response `data`**:
  ```json
  {
    "id": "uuid",
    "instituteId": "uuid",
    "paymentId": "uuid",
    "receiptNumber": "REC-2026-00001",
    "generatedAt": "2026-08-14T10:00:00.000Z",
    "downloadUrl": null
  }
  ```

---

# 5. Security & Multi-Tenant Isolation Matrix

1. **Authentication (401)**: Unauthenticated requests without session tokens return `401 Unauthorized`.
2. **Tenant Scoping (404)**: Accessing a BillingPlan, Invoice, Payment, or Receipt belonging to another institute returns `404 Not Found`. Client-supplied `instituteId` in query, body, or headers is ignored.
3. **Capability Authorization (403)**: Authenticated users without the required capability return `403 Forbidden`.
4. **Input Validation (400)**: Malformed JSON, negative amounts, overpayments, invalid modes, or unknown query fields return `400 Bad Request`.
5. **Rate Limiting (429)**: Exceeding read (100 req/min) or mutation (20 req/min) limits returns `429 Too Many Requests` with `Retry-After` header.

---

# 6. Shared Error Taxonomy

| Situation | Shared Error Class | HTTP Status | Canonical Code |
|---|---|---|---|
| Invalid query or body | `ValidationError` | 400 | `BAD_REQUEST` / `VALIDATION_ERROR` |
| Unauthenticated session | `AuthenticationError` | 401 | `UNAUTHORIZED` |
| Missing capability permission | `AuthorizationError` | 403 | `FORBIDDEN` |
| Resource not found / Cross-tenant | `NotFoundError` | 404 | `NOT_FOUND` |
| Method not supported (e.g. DELETE payment) | `MethodNotAllowedError` | 405 | `METHOD_NOT_ALLOWED` |
| Idempotency / DB duplicate constraint | `ConflictError` | 409 | `CONFLICT` |
| Rate limit exceeded | `RateLimitLimitError` | 429 | `RATE_LIMITED` |

---

# 7. Audit Logging Policy

The following sensitive billing API mutations produce structured audit log entries via `@coaching-os/observability`:
- `identity.billing_plan.create.success`
- `identity.billing_plan.update.success`
- `identity.invoice.generate.success`
- `identity.payment.record.success`
- `identity.receipt.generate.success`

Logs include `requestId`, `actorId`, `instituteId`, `action`, and target resource ID. Secrets and auth tokens are strictly redacted.

---

# 8. Phase 3.5 Acceptance Matrix

Phase 3.5.1 and 3.5.2 implementation will be verified against:
1. **API Integration Tests** (`apps/web/src/app/api/v1/billing/*.test.ts`):
   - Valid creation and retrieval for BillingPlans, Invoices, Payments, Receipts.
   - Idempotent retries returning exact same DTOs.
   - Overpayment rejection (400).
   - Rate limiting enforcement (429).
2. **Security & Cross-Tenant Adversarial Matrix**:
   - Cross-tenant spoofing returns 404.
   - Client-supplied `instituteId` spoofing ignored.
   - Missing capabilities return 403.
   - Prohibited methods (`PATCH`/`DELETE` on payments) return 405.
3. **Monorepo Quality Gate**:
   - `pnpm env:check && pnpm db:validate && pnpm db:health && pnpm typecheck && pnpm lint && pnpm test && pnpm build`.

---

# 9. Final Contract Status

### 🟢 PHASE 3.5.0 — ACCEPTED & FROZEN

```text
Billing API Route Surface     🟢 FROZEN
Canonical Route Terminology   🟢 FROZEN (R-API-001)
Receipt Storage Boundary      🟢 FROZEN (R-API-002)
Payment Filter Mapping        🟢 FROZEN (R-API-003)
Capability Constants Mapping  🟢 FROZEN (R-API-004)
Response & Error Envelope     🟢 FROZEN (R-API-005)
Pagination Strategy           🟢 FROZEN (R-API-006)
Invoice Generation Trigger    🟢 FROZEN (R-API-007)
Multi-Tenant Security Rules   🟢 FROZEN
Rate Limiting & Audit Rules   🟢 FROZEN
Schema Stability (0 drift)    🟢 FROZEN
```
