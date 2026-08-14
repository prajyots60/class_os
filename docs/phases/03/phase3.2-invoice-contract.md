# PHASE 3.2 — INVOICE ENGINE ARCHITECTURE & DOMAIN CONTRACT

**CoachingOS — Contract Freeze v1.0**

**Status: 🟢 ACCEPTED & FROZEN**

This document establishes the authoritative architecture, domain models, business invariants, state machine, calculation rules, idempotency strategy, and security boundaries for **Phase 3.2 — Invoice Engine** of CoachingOS.

Phase 3.1 (BillingPlan Domain & Persistence) is **COMPLETED & VERIFIED**. Phase 3.2 freezes how `Invoice` records are generated, managed, and linked to `BillingPlan` agreements prior to Phase 3.2.1 implementation.

---

# 1. Architectural Position & Objective

The Invoice Engine resides in `@coaching-os/billing` under `packages/billing/`:

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
 Payment     (Actual Received Funds — Phase 3.3)
    │
    ▼
 Receipt     (Proof of Payment — Phase 3.4)
```

### Core Objective

The Invoice Engine answers:

> **Given a BillingPlan, exactly when, why, for how much, and with what due date is an Invoice generated?**

---

# 2. Terminology Freeze

| Concept | Canonical Name | Database Model | UI Label |
|---|---|---|---|
| Billing Agreement | `BillingPlan` | `billing_plans` | Fee Plan |
| Payment Request | `Invoice` | `invoices` | Invoice |
| Money Received | `Payment` | `payments` | Payment |
| Proof of Payment | `Receipt` | `receipts` | Receipt |

### Key Architectural Invariant

```text
BillingPlan ≠ Invoice
```

- **`BillingPlan`** stores the agreement rules (type, base amount, discount, billing start date, override).
- **`Invoice`** is a concrete, historical financial obligation generated for a specific amount and due date.
- Modifying a `BillingPlan` after an `Invoice` has been generated **MUST NEVER** alter or rewrite the already-generated `Invoice`.

---

# 3. Canonical Invoice Entity Model

The `Invoice` model is governed strictly by `infrastructure/database/prisma/schema.prisma` without schema drift or migrations.

```text
model Invoice {
  id            String        @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  billingPlanId String        @map("billing_plan_id") @db.Uuid
  amount        Decimal       @db.Decimal(10, 2)
  dueDate       DateTime      @map("due_date") @db.Date
  status        InvoiceStatus @default(pending)
  createdAt     DateTime      @default(now()) @map("created_at")
  updatedAt     DateTime      @updatedAt @map("updated_at")

  billingPlan BillingPlan @relation(fields: [billingPlanId], references: [id], onDelete: Cascade)
  payments    Payment[]

  @@index([billingPlanId])
  @@index([dueDate])
  @@index([status])
  @@map("invoices")
}
```

### Schema Constraints & Boundaries
- **No Direct `instituteId` Column**: `Invoice` connects to `BillingPlan`, which connects to `Enrollment`, which connects to `Institute`. Repository queries **MUST** join `billingPlan: { enrollment: { instituteId } }` for tenant isolation.
- **Monetary Precision**: `amount` is stored as `Decimal(10, 2)`. Domain monetary math MUST be framework-independent 2-decimal exact representation, avoiding JS floating-point arithmetic errors.
- **Zero Schema Migrations**: Zero columns added or removed.

---

# 4. Invoice Status & State Machine

### Persisted Invoice Statuses (`InvoiceStatus` Enum)
- **`pending`**: Invoice generated; zero payments recorded (`SUM(payments.amount) == 0`).
- **`partial`**: Partial payment recorded (`0 < SUM(payments.amount) < invoice.amount`).
- **`paid`**: Fully satisfied (`SUM(payments.amount) == invoice.amount`).

### State Machine Transition Diagram

```text
                 payment (partial)
                    │
                    ▼
              ┌──────────┐
              │ pending  │
              └────┬─────┘
                   │
         full payment / remaining
                   │
                   ▼
              ┌──────────┐
              │ partial  │
              └────┬─────┘
                   │
              full payment
                   │
                   ▼
              ┌──────────┐
              │   paid   │
              └──────────┘
```

### State Machine Invariants
1. **Forbidden Transitions**:
   - `paid` ──► `partial` (FORBIDDEN)
   - `paid` ──► `pending` (FORBIDDEN)
   - `partial` ──► `pending` (FORBIDDEN)
2. **No Direct Mutation**: Invoice status CANNOT be updated via arbitrary `PATCH` endpoints. Status updates occur exclusively inside atomic `RecordPaymentUseCase` transactions (Phase 3.3).
3. **No Persisted `overdue` Status**: `overdue` is **NOT** a status in `InvoiceStatus`. See Section 5.

---

# 5. Derived Computations: Overdue & Outstanding

### 5.1 Outstanding Amount Invariant
```text
outstanding = invoice.amount - SUM(payments.amount)
```
- **Rule**: `outstanding` is strictly a **computed value**, NEVER stored as a column on `Invoice`.
- Prevents balance drift across concurrent transactions.

### 5.2 Overdue Derivation Rule
An Invoice is determined to be **overdue** if and only if:
```text
dueDate < currentLocalDate(institute.timezone)
AND
status != 'paid'
```
- **Timezone Anchor**: The local date is evaluated against the institute's configured timezone (e.g. `Asia/Kolkata` from `Institute.timezone`), NOT server UTC or JS runtime system date.

---

# 6. Invoice Generation Rules by BillingType

### 6.1 One-Time Billing (`BillingType.one_time`)
- **Invoice Count**: Exactly 1 Invoice per `BillingPlan`.
- **Due Date**: Equals `BillingPlan.billingStartDate`.
- **Amount Calculation**:
  - If `firstInvoiceAmountOverride` is present: `amount = firstInvoiceAmountOverride`.
  - Else: `amount = BillingPlan.calculateStandardInvoiceAmount()` (Base `amount` minus `Discount`).
- **Idempotency Key**: `(billingPlanId)`. If generation is invoked again, it returns the existing Invoice without creating duplicates.

### 6.2 Monthly Billing (`BillingType.monthly`)
- **Invoice Count**: 1 Invoice generated per billing cycle / month.
- **Period Identifier**: `(billingPlanId, YYYY-MM)` (e.g., `2026-08`).
- **First Invoice Due Date**: Equals `BillingPlan.billingStartDate`.
- **First Invoice Amount**:
  - If `firstInvoiceAmountOverride` is present: `amount = firstInvoiceAmountOverride`.
  - Else: `amount = BillingPlan.calculateStandardInvoiceAmount()`.
- **Subsequent Invoice Due Dates**:
  - Generated on the 1st of each subsequent calendar month (or matched to `billingStartDate.getDate()`), adjusted for month-end limits.
- **Subsequent Invoice Amounts**: `amount = BillingPlan.calculateStandardInvoiceAmount()`.
- **Month-End Boundary Rule**: If `billingStartDate` day of month (e.g., 31st) exceeds the target month's maximum days (e.g., Feb 28/29), due date caps to the last day of that month (`Feb 28` / `Feb 29`).

### 6.3 Installment Billing (`BillingType.installment`) — Resolution of R-004, R-006, R-007, R-008
- **Context & Source Reconciliation**: SRS defines installments as $N$ scheduled invoices. The database schema does not have a separate `installment_schedules` table or `totalInstallments` column on `BillingPlan`.
- **R-006 — Installment Schedule Consistency**:
  - Installment generation requests accept an explicit `installmentNumber` ($1 \dots N$) and `totalInstallments` parameter ($N \ge 2$).
  - **Immutability of $N$**: Once the first installment invoice (`installmentNumber = 1`) is generated for a `BillingPlan`, $N$ (`totalInstallments`) becomes locked for that plan. Any subsequent generation request for the same `billingPlanId` MUST pass the exact same `totalInstallments` value $N$. If a conflicting `totalInstallments` is supplied, `GenerateInvoiceUseCase` throws `ValidationError("Installment count N cannot be changed once installment generation has started.")`.
- **R-007 — Installment Remainder Cents Allocation**:
  - To prevent floating-point loss or cent drift (e.g. ₹10,000 / 3 = ₹3,333.33 x 3 = ₹9,999.99 losing ₹0.01), remainder cents are allocated deterministically:
  - Let total billable amount be $T = \text{effectiveNetPlanAmount}$.
  - Base installment amount: $A_{\text{base}} = \lfloor (T \times 100) / N \rfloor / 100$.
  - Cents remainder: $R = \text{round}(T \times 100) - (A_{\text{base}} \times 100 \times N)$ (where $0 \le R < N$ cents).
  - The $R$ extra cents are distributed +₹0.01 to each of the first $R$ installments ($k \le R$).
  - Guaranteed Invariant: $\sum_{k=1}^{N} \text{Invoice}_k.\text{amount} == T$ exact!
- **R-008 — First Invoice Override & Installment Balance Distribution**:
  - When `firstInvoiceAmountOverride` $O$ is set on an installment `BillingPlan`:
    - **Installment #1 Amount**: $O$ (the explicit override amount for the first installment/pro-rata period).
    - **Remaining Balance for Installments #2 through $N$**: $T_{\text{rem}} = \max(0, T_{\text{standard\_plan\_total}} - O)$.
    - The remaining balance $T_{\text{rem}}$ is distributed across the remaining $N - 1$ installments using R-007 remainder cents allocation.
    - Example: Total $T = ₹30,000$, $N = 3$, Override $O = ₹5,000$.
      - Installment #1 = ₹5,000.00
      - Remaining balance $T_{\text{rem}} = 30,000 - 5,000 = 25,000.00$.
      - Installment #2 = ₹12,500.00
      - Installment #3 = ₹12,500.00
      - Total = ₹30,000.00 exact!
- **Due Dates**: Installment $k$ due date = `billingStartDate` + $(k - 1)$ months.
- **Idempotency Key**: `(billingPlanId, installmentNumber)`.

---

# 7. Discount & Override Calculation Precedence

```text
       ┌────────────────────────────────────────────────────────┐
       │ Is firstInvoiceAmountOverride present AND Invoice #1?  │
       └───────────────────────────┬────────────────────────────┘
                                   │
                     ┌─────────────┴─────────────┐
                    YES                          NO
                     │                           │
                     ▼                           ▼
        Invoice Amount =             Invoice Amount =
        firstInvoiceAmountOverride   Standard Plan Amount
                                     (Base Amount - Discount)
                                     [distributed via R-007/008]
```

### Precedence Invariants
1. **`firstInvoiceAmountOverride`**: Represents a final explicit monetary agreement for the first invoice (e.g., late-join pro-rata fee). It is NOT subjected to additional plan discount deductions.
2. **Subsequent Invoices**: Use standard BillingPlan rules and installment balance distribution (R-008).
3. **Exact Total Preservation**: In all cases (monthly, one-time, installment), monetary rounding guarantees $\sum \text{Invoice.amount} == \text{Total Obligation}$.
4. **Non-Negative Invariant**: An Invoice `amount` MUST NEVER be negative (`amount >= 0.00`).

---

# 8. Immutability & Financial Audit Safety

### Financial Invariants
1. **Persisted Invoice Immutability**: Once created, an `Invoice` record's `amount`, `dueDate`, and `billingPlanId` become **IMMUTABLE**.
2. **No Deletion**: `Invoice` records MUST NOT be hard deleted or soft-deleted once generated.
3. **No Cancellation Status**: Invoice cancellation/voiding is out of scope for Phase 3.2 (no `cancelled` enum value in `InvoiceStatus`).

---

# 9. Tenant Isolation & Multi-Tenant Security

### Security Ownership Chain
```text
Invoice ──► BillingPlan ──► Enrollment ──► Institute
```

### Invariants
1. **Server-Authoritative Context**: `ctx.instituteId` derived exclusively from DB-verified session (`resolveV1TenantContext()`). Never trust client headers or body inputs.
2. **Repository Tenant Scoping**: All Prisma queries for `Invoice` MUST include `billingPlan: { enrollment: { instituteId: ctx.instituteId } }`.
3. **Cross-Tenant Masking**: Accessing an `Invoice` or `BillingPlan` belonging to another institute MUST return `NotFoundError` (404) to prevent resource enumeration.

---

# 10. Capability & RBAC Registry

| Operation | Capability Required | Resource | Action |
|---|---|---|---|
| View Invoice | `CAPABILITIES.BILLING_READ` (`billing:read`) | `invoice` | `read` |
| Generate Invoice | `CAPABILITIES.BILLING_WRITE` (`billing:write`) | `invoice` | `create` |

No custom role systems or inline permission strings allowed.

---

# 11. Transaction Boundary & Domain Events

### Transaction Shape (`GenerateInvoiceUseCase`)
```text
BEGIN TRANSACTION
  1. Resolve server-authoritative TenantContext
  2. Verify BillingPlan exists and belongs to tenant
  3. Verify idempotency (check if invoice for period/installment exists)
  4. Calculate invoice amount and due date
  5. Create Invoice record in DB
COMMIT TRANSACTION

AFTER COMMIT:
  6. Emit InvoiceGenerated domain event
```

### Domain Event: `InvoiceGenerated`
- **Topic/Name**: `billing.invoice.generated`
- **Payload**:
  ```ts
  {
    invoiceId: string;
    billingPlanId: string;
    instituteId: string;
    enrollmentId: string;
    amount: number;
    dueDate: string;
    status: 'pending';
    generatedAt: string;
  }
  ```
- Event is emitted **only after successful DB commit**.

---

# 12. Shared Error Taxonomy

| Error Situation | Exception Class | HTTP Status |
|---|---|---|
| BillingPlan not found in tenant | `NotFoundError` | 404 |
| Cross-tenant Invoice access | `NotFoundError` | 404 |
| Duplicate invoice generation attempt | `ConflictError` | 409 |
| Invalid amount or due date | `ValidationError` | 400 |
| Insufficient RBAC capability | `AuthorizationError` | 403 |

---

# 13. Source Reconciliation Register

### R-004 — Installment Schedule Representation
- **Conflict**: SRS specifies installments, but Prisma `schema.prisma` does not include an `InstallmentSchedule` entity or `installmentCount` column.
- **Resolution**: Phase 3.2 uses parameterized installment generation `(installmentNumber, totalInstallments)` with idempotency key `(billingPlanId, installmentNumber)`. Zero schema changes required.

### R-005 — `overdue` Status
- **Conflict**: DADD mentions `overdue` as an invoice status; SRS and Prisma schema use `pending`, `partial`, `paid`.
- **Resolution**: `overdue` is a derived reporting condition (`dueDate < today AND status != 'paid'`), NOT a persisted database enum.

### R-006 — Installment Schedule Consistency
- **Conflict**: `totalInstallments` $N$ is provided at invoice generation time and is not stored on `BillingPlan`.
- **Resolution**: Once Installment #1 is generated with count $N$, $N$ becomes immutable for that `BillingPlan`. Subsequent generation calls MUST supply the matching $N$ or throw `ValidationError`.

### R-007 — Installment Remainder Cents Allocation
- **Conflict**: Integer division of monetary amounts across $N$ installments can yield floating-point cent remainders (e.g., ₹10,000 / 3 = ₹9,999.99 total).
- **Resolution**: Base installment = $\lfloor (T \times 100) / N \rfloor / 100$. Extra $R$ cents are allocated +₹0.01 to each of the first $R$ installments ($k \le R$), guaranteeing $\sum \text{Invoice.amount} == T$ exact.

### R-008 — First Invoice Override & Installment Balance Distribution
- **Conflict**: Interaction between `firstInvoiceAmountOverride` $O$ and installment balance calculation.
- **Resolution**: Override $O$ replaces Installment #1 amount directly. The remaining plan balance $T_{\text{rem}} = \max(0, T_{\text{total}} - O)$ is distributed across Installments #2 through $N$ using R-007, preserving total plan obligation.

---

# 14. Phase 3.2.1 Acceptance Matrix

In Phase 3.2.1, implementation will be verified against:
1. **Unit Tests**:
   - `InvoiceEntity` creation, amount calculations, and immutability.
   - Idempotency key generation for `one_time`, `monthly`, and `installment` types.
   - Discount and `firstInvoiceAmountOverride` precedence logic.
2. **Integration Tests (`PrismaInvoiceRepository`)**:
   - PostgreSQL multi-tenant isolation (Institute A cannot read/mutate Institute B invoices).
   - Idempotent invoice creation (preventing duplicate invoices for same period/installment).
   - Correct relation joining `billingPlan ──► enrollment ──► institute`.
3. **Monorepo Quality Gate**:
   - `pnpm env:check && pnpm db:validate && pnpm db:health && pnpm typecheck && pnpm lint && pnpm test && pnpm build`.

---

# 15. Final Freeze Status

### 🟢 PHASE 3.2.0 — ACCEPTED & FROZEN

```text
Invoice Domain Model     🟢 FROZEN
Invoice Status Machine   🟢 FROZEN
Generation Semantics     🟢 FROZEN
Discount & Override Rules🟢 FROZEN
Immutability Invariants  🟢 FROZEN
Idempotency Strategy     🟢 FROZEN
Tenant Isolation & RBAC  🟢 FROZEN
Domain Event Contract    🟢 FROZEN
Schema Stability (0 drift)🟢 FROZEN
```
