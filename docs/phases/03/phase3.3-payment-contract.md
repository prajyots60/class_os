# PHASE 3.3 — PAYMENT ENGINE ARCHITECTURE & DOMAIN CONTRACT

**CoachingOS — Contract Freeze v1.0**

**Status: 🟢 ACCEPTED & FROZEN**

This document establishes the authoritative architecture, domain models, business invariants, state machine transitions, overpayment policy, concurrency strategy, idempotency rules, tenant security, and domain events for **Phase 3.3 — Payment Engine** of CoachingOS.

Phase 3.0 (Billing Architecture), Phase 3.1 (BillingPlan Domain), and Phase 3.2 (Invoice Engine) are **COMPLETED & FROZEN**. Phase 3.3 freezes how `Payment` records are created, linked to `Invoice` obligations, and used to recalculate invoice status prior to Phase 3.3.1 implementation.

---

# 1. Architectural Position & Objective

The Payment Engine resides in `@coaching-os/billing` under `packages/billing/`:

```text
Enrollment
    │
    ▼
BillingPlan  (Agreement & Rules — Phase 3.1)
    │
    ▼
 Invoice     (Concrete Financial Request — Phase 3.2)
    │
    ▼
 Payment     (Actual Received Funds — Phase 3.3) ──► Triggers PaymentRecorded
    │                                                       │
    ▼                                                       ▼
 Receipt     (Proof of Payment — Phase 3.4) ◄───────────────┘
```

### Core Objective

The Payment Engine answers:

> **How is money received against an Invoice recorded, validated, bound to tenant context, and used to update Invoice status atomically?**

---

# 2. Terminology Freeze

| Concept | Canonical Name | Database Model | UI Label |
|---|---|---|---|
| Billing Agreement | `BillingPlan` | `billing_plans` | Fee Plan |
| Payment Request | `Invoice` | `invoices` | Invoice |
| Money Received | `Payment` | `payments` | Payment |
| Proof of Payment | `Receipt` | `receipts` | Receipt |

### Key Architectural Invariants
1. **Payment is NOT an Online Payment Gateway**: A `Payment` record represents money that the institute staff has recorded as physically or electronically received (Cash, UPI, Bank Transfer). It is NOT a gateway intent, checkout session, Razorpay transaction, or Stripe payload.
2. **`Invoice 1 ──► N Payment`**: An `Invoice` may have zero, one, or multiple `Payment` records attached (supporting partial payments).
3. **`Payment 1 ──► 1 Receipt`**: Every `Payment` record is eligible for exactly one `Receipt` in Phase 3.4.

---

# 3. Canonical Payment Entity Model

The `Payment` model is governed strictly by `infrastructure/database/prisma/schema.prisma` without schema drift or migrations.

```text
model Payment {
  id          String      @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  invoiceId   String      @map("invoice_id") @db.Uuid
  amount      Decimal     @db.Decimal(10, 2)
  paymentMode PaymentMode @map("payment_mode")
  receivedOn  DateTime    @map("received_on") @db.Date
  collectedBy String?     @map("collected_by") @db.Uuid
  remarks     String?     @db.Text
  createdAt   DateTime    @default(now()) @map("created_at")

  invoice     Invoice  @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  collector   User?    @relation("CollectedByPayments", fields: [collectedBy], references: [id], onDelete: SetNull)
  receipt     Receipt?

  @@index([invoiceId])
  @@map("payments")
}
```

### Schema Constraints & Boundaries
- **No Direct `instituteId` Column**: `Payment` connects to `Invoice`, which connects to `BillingPlan`, which connects to `Enrollment`, which connects to `Institute`. Repository queries **MUST** join `invoice: { billingPlan: { enrollment: { instituteId } } }` for tenant isolation.
- **Monetary Precision**: `amount` is stored as `Decimal(10, 2)`. Domain monetary math MUST be framework-independent 2-decimal exact representation, avoiding JS floating-point arithmetic errors.
- **Zero Schema Migrations**: Zero columns added or removed.

---

# 4. Payment Modes (MVP Scope)

Supported `PaymentMode` enum values:
- **`cash`**: Physical currency collected by staff.
- **`upi`**: Direct UPI transfer (P2P/P2M QR/VPA transfer directly to institute bank).
- **`bank_transfer`**: IMPS / NEFT / RTGS / Bank draft directly to institute bank account.

### Explicit Exclusion
Online payment gateways (Razorpay, Stripe, PayU), credit cards, debit cards, netbanking checkouts, and automated webhooks are **EXCLUDED from MVP scope**.

---

# 5. Business Invariants & Rules

### PAY-001 — Positive Amount Requirement
```text
payment.amount > 0.00
```
- Payment amount MUST be strictly greater than zero (`> 0.00`). Zero or negative payment amounts throw `ValidationError`.

### PAY-002 — Invoice Existence & Ownership
- A `Payment` MUST reference an existing `Invoice` belonging to the same tenant institute.
- Creating a payment for an invoice belonging to another tenant throws `NotFoundError` (404) to prevent resource enumeration.

### PAY-003 — Overpayment Protection Policy (R-010)
```text
outstanding = invoice.amount - SUM(existing_payments.amount)
payment.amount <= outstanding
```
- Overpayment is strictly **REJECTED**.
- If `payment.amount > outstanding`, `RecordPaymentUseCase` throws `ValidationError("Payment amount exceeds remaining invoice outstanding balance")`.
- Overpayments cannot be partially accepted or converted to auto-credits in Phase 3.3 MVP.

### PAY-004 — Received Date Semantics (R-015)
- `receivedOn` represents the calendar date the payment was received by the institute.
- Defaults to today's date in `Institute.timezone` if omitted.
- **Future Dates**: `receivedOn` cannot be in the future (`receivedOn > today` throws `ValidationError`).
- **Past Dates**: Back-dated payments are permitted, provided `receivedOn >= BillingPlan.billingStartDate`.

### PAY-005 — Collected By Semantics (R-014)
- `collectedBy` stores the UUID of the institute `User` (staff member) who recorded/collected the payment.
- If provided in input, it MUST be validated to exist as an active staff user in the tenant.
- If omitted in input, it defaults to `ctx.userId` from the authenticated server context.

### PAY-006 — Remarks Field
- `remarks` is optional (`string | null`).
- Maximum length: 500 characters. Sanitized to prevent script injection.

---

# 6. Invoice Status Recalculation & State Machine

Recording a payment automatically recalculates the associated `Invoice.status`.

```text
totalPaid = SUM(all_payments_for_invoice.amount)
invoiceAmount = invoice.amount
```

### Transition Matrix
- `totalPaid == 0.00` ──► `status = 'pending'`
- `0.00 < totalPaid < invoiceAmount` ──► `status = 'partial'`
- `totalPaid == invoiceAmount` ──► `status = 'paid'`

```text
               ┌──────────┐
               │ pending  │
               └────┬─────┘
                    │
          partial payment recorded
                    │
                    ▼
               ┌──────────┐
               │ partial  │
               └────┬─────┘
                    │
         full payment / final balance
                    │
                    ▼
               ┌──────────┐
               │   paid   │
               └──────────┘
```

### Invariants
1. `paid` state is **FINAL** in Phase 3.3 MVP. Once an invoice reaches `paid`, no further payments can be recorded against it (`ValidationError`).
2. Status transitions occur exclusively inside the atomic payment recording database transaction. Direct manual status updates via API/UI are FORBIDDEN.

---

# 7. Financial Immutability & Deletion Policy

### 7.1 Payment Immutability (R-012)
Once a `Payment` record is created, its fields (`amount`, `paymentMode`, `receivedOn`, `invoiceId`, `collectedBy`, `remarks`) become **100% IMMUTABLE**. No edit (`PATCH` / `PUT`) endpoints exist.

### 7.2 Physical Deletion Prohibition (R-013)
- `Payment` records represent immutable financial audit trail data.
- Hard deletion (`DELETE /payments/:id`) and soft-deletion are **FORBIDDEN**.
- **Schema Cascade Policy Reconciliation**: While `schema.prisma` contains `onDelete: Cascade` for test database resets, application/domain code MUST NOT expose any delete methods on `PaymentRepository`.

---

# 8. Concurrency & Idempotency Strategy

### 8.1 Transactional Concurrency Control (R-011)
To prevent race conditions where two concurrent requests record payments exceeding the invoice amount:
```text
BEGIN TRANSACTION
  1. Acquire row lock or query current Invoice & existing Payments
  2. Compute real-time outstanding = invoice.amount - SUM(existing_payments)
  3. Validate newPayment.amount <= outstanding
  4. Insert Payment record
  5. Update Invoice status (pending -> partial or paid)
COMMIT TRANSACTION
```
If a concurrent transaction completes first and reduces `outstanding` below `newPayment.amount`, the second transaction aborts and throws `ValidationError`.

### 8.2 Payment Recording Idempotency (R-009)
If a client retries a payment submission (e.g. due to network timeout):
- Option A: Client passes optional `idempotencyKey`.
- Option B: System checks if a payment with matching `(invoiceId, amount, paymentMode, receivedOn)` was recorded within the last 5 seconds.
- If duplicate is detected, `RecordPaymentUseCase` returns the existing `PaymentDTO` without creating a duplicate database row.

---

# 9. Tenant Isolation & Security Boundaries

### Security Ownership Chain
```text
Payment ──► Invoice ──► BillingPlan ──► Enrollment ──► Institute
```

### Security Invariants
1. **Server-Authoritative Context**: `ctx.instituteId` derived exclusively from DB-verified session (`resolveV1TenantContext()`). Client inputs for tenant identity are rejected.
2. **Repository Tenant Scoping**: All Prisma queries for `Payment` MUST include `invoice: { billingPlan: { enrollment: { instituteId: ctx.instituteId } } }`.
3. **Cross-Tenant Masking**: Accessing a `Payment` or `Invoice` belonging to another institute MUST return `NotFoundError` (404).

---

# 10. Capability & RBAC Registry

| Operation | Capability Required | Resource | Action |
|---|---|---|---|
| View Payment | `CAPABILITIES.BILLING_READ` (`billing:read`) | `payment` | `read` |
| Record Payment | `CAPABILITIES.PAYMENT_RECORD` (`payment:record`) | `payment` | `create` |

No custom role systems allowed. Staff permissions map strictly to capabilities.

---

# 11. Transaction Boundary & Domain Events

### Transaction Boundary (`RecordPaymentUseCase`)
```text
BEGIN TRANSACTION
  1. Resolve tenant & verify authorization
  2. Load Invoice within tenant boundary
  3. Validate payment mode, date, and positive amount
  4. Lock & calculate current outstanding balance
  5. Enforce overpayment policy (amount <= outstanding)
  6. Create Payment record in DB
  7. Update Invoice status (pending/partial -> partial/paid)
COMMIT TRANSACTION

AFTER COMMIT:
  8. Emit PaymentRecorded domain event
```

### Domain Event: `PaymentRecorded`
- **Topic/Name**: `billing.payment.recorded`
- **Payload**:
  ```ts
  {
    paymentId: string;
    invoiceId: string;
    billingPlanId: string;
    instituteId: string;
    enrollmentId: string;
    amount: number;
    paymentMode: 'cash' | 'upi' | 'bank_transfer';
    receivedOn: string;
    collectedBy: string | null;
    newInvoiceStatus: 'partial' | 'paid';
    outstandingBalance: number;
    recordedAt: string;
  }
  ```
- Emitted **only after successful DB transaction commit**.

---

# 12. Receipt Boundary (Phase 3.4 Integration)

- Phase 3.3 **DOES NOT** create `Receipt` records, generate receipt numbers, or produce PDF documents.
- `PaymentRecorded` event supplies all necessary payload data for the Phase 3.4 Receipt Engine to create a 1:1 `Receipt` asynchronously or post-commit.

---

# 13. Shared Error Taxonomy

| Error Situation | Exception Class | HTTP Status |
|---|---|---|
| Invoice not found in tenant | `NotFoundError` | 404 |
| Cross-tenant Payment access | `NotFoundError` | 404 |
| Payment amount <= 0 | `ValidationError` | 400 |
| Overpayment attempt (`amount > outstanding`) | `ValidationError` | 400 |
| Future `receivedOn` date | `ValidationError` | 400 |
| Payment on already 'paid' Invoice | `ValidationError` | 400 |
| Insufficient RBAC capability | `AuthorizationError` | 403 |

---

# 14. Source Reconciliation Register

### R-009 — Payment Recording Idempotency
- **Conflict**: No database unique index exists on `Payment`.
- **Resolution**: Application-level idempotency checking by `(invoiceId, amount, paymentMode, receivedOn)` or optional client idempotency key.

### R-010 — Overpayment Policy
- **Conflict**: SRS specifies `SUM(payments) <= invoice.amount` but doesn't detail overflow behavior.
- **Resolution**: Overpayment is strictly rejected with `ValidationError`.

### R-011 — Concurrent Payment Control
- **Conflict**: Potential race condition under concurrent payment submission.
- **Resolution**: Transactional locking and re-evaluating outstanding balance inside atomic DB transaction.

### R-012 — Payment Immutability
- **Conflict**: Financial records require strict audit trail.
- **Resolution**: `Payment` entity and endpoints are 100% immutable. No `PATCH` or edit endpoints.

### R-013 — Financial Cascade Deletion Policy Tension
- **Conflict**: Prisma schema contains `onDelete: Cascade` while DADD prohibits hard deletion.
- **Resolution**: Domain repositories omit `delete()` methods. Prisma cascades remain for test reset scripts only.

### R-014 — `collectedBy` Collector Semantics
- **Conflict**: Field is nullable in schema.
- **Resolution**: Verified against tenant staff users; defaults to `ctx.userId` if omitted.

### R-015 — `receivedOn` Date Constraints
- **Conflict**: Schema uses `@db.Date`.
- **Resolution**: Back-dating permitted ($\ge \text{billingStartDate}$); future dates strictly forbidden.

---

# 15. Phase 3.3.1 Acceptance Matrix

In Phase 3.3.1, implementation will be verified against:
1. **Unit Tests**:
   - `PaymentEntity` creation, amount validation ($>0$), immutability.
   - Invoice status recalculation (`pending` -> `partial` -> `paid`).
   - Overpayment rejection policy (R-010).
2. **Integration Tests (`PrismaPaymentRepository`)**:
   - PostgreSQL multi-tenant isolation (Institute A cannot record/read Institute B payments).
   - Atomic database transaction (`Payment` creation + `Invoice.status` update).
   - Concurrent payment submission handling (R-011).
3. **Monorepo Quality Gate**:
   - `pnpm env:check && pnpm db:validate && pnpm db:health && pnpm typecheck && pnpm lint && pnpm test && pnpm build`.

---

# 16. Final Freeze Status

### 🟢 PHASE 3.3.0 — ACCEPTED & FROZEN

```text
Payment Domain Model     🟢 FROZEN
Payment Modes (MVP)      🟢 FROZEN
Overpayment Policy       🟢 FROZEN
Invoice Status Machine   🟢 FROZEN
Immutability Policy      🟢 FROZEN
Tenant Isolation & RBAC  🟢 FROZEN
Transaction Boundary     🟢 FROZEN
Domain Event Contract    🟢 FROZEN
Schema Stability (0 drift)🟢 FROZEN
```
