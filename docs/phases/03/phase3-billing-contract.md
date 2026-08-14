# PHASE 3.0 — BILLING ARCHITECTURE & DOMAIN CONTRACT

**CoachingOS — Contract Freeze v1.0**

**Status: 🟢 ACCEPTED & FROZEN**

This is the contract we should now treat as the source of truth for Phase 3 implementation. It preserves the existing SRS/DADD/SDD/schema terminology and explicitly resolves the few inconsistencies found between those documents.

The existing roadmap defines Phase 3 as Billing Plans → Invoices → Payments → Receipts, with the operational outcome: **assistant records fee → invoice status updates → receipt generated → parent sees updated status**. 

---

# 1. Phase Objective

Phase 3 introduces the **Billing module** into the existing CoachingOS operational system.

The module answers:

> **How much does this enrollment owe, when is it due, what has actually been paid, and what proof of payment was issued?**

The billing lifecycle is:

```text
Enrollment
    │
    ▼
BillingPlan
    │
    ├── defines billing rules
    │
    ▼
Invoice
    │
    ├── amount due
    │
    ├── payments
    │
    ▼
Payment
    │
    ▼
Receipt
```

The core relationship is already established as:

```text
Enrollment 1 → 1 BillingPlan
BillingPlan 1 → N Invoice
Invoice 1 → N Payment
Payment 1 → 1 Receipt
```

This relationship is explicitly defined in the DADD. 

---

# 2. Terminology Freeze

These names are now canonical.

| Concept           | Canonical name | UI label                |
| ----------------- | -------------- | ----------------------- |
| Billing agreement | `BillingPlan`  | Fee Plan / Billing Plan |
| Amount request    | `Invoice`      | Invoice                 |
| Money received    | `Payment`      | Payment                 |
| Proof of payment  | `Receipt`      | Receipt                 |
| Module            | `billing`      | Fees                    |

The SRS explicitly renamed **Fee Plan → BillingPlan** and **Finance → Billing**. 

### Critical distinction

```text
BillingPlan ≠ Invoice ≠ Payment ≠ Receipt
```

**BillingPlan** is the contract.

**Invoice** is a request for payment.

**Payment** is money actually received.

**Receipt** is proof that a payment was received.

The BillingPlan does **not** change because payments occur. 

---

# 3. Architectural Position

Billing belongs to:

```text
packages/billing/
```

and follows the existing modular-monolith architecture:

```text
Presentation
     ↓
Application
     ↓
Domain
     ↑
Infrastructure
```

The Billing domain must remain framework-independent.

It must not import:

* Prisma
* Next.js
* React
* HTTP request/response objects
* Better Auth
* payment providers

This follows the frozen architecture rules. 

---

# 4. Aggregate Model

## 4.1 Enrollment is the billing owner

Billing is **Enrollment-centric**, not Student-centric.

```text
Student
   │
   └── Enrollment
          │
          └── BillingPlan
                 │
                 ├── Invoice
                 │      └── Payment
                 │             └── Receipt
                 │
                 └── ...
```

This preserves the existing system invariant that Enrollment is the operational entity connecting the student to the batch and owning billing plans. 

Therefore:

> Never attach a BillingPlan directly to `Student`.

---

# 5. BillingPlan Contract

## Definition

A `BillingPlan` is:

> **The billing agreement attached to an enrollment that defines how invoices are generated.**

It stores the billing rules, not payment history.

### Supported types

```text
monthly
one_time
installment
```

These three types are explicitly required by FR-050 through FR-052. 

---

# 6. BillingPlan Fields

The existing schema defines:

```text
id
enrollmentId
type
amount
discountType
discountValue
billingStartDate
firstInvoiceAmountOverride
createdAt
updatedAt
```

The schema uses Decimal for monetary values. 

### Meaning

| Field                        | Meaning                                    |
| ---------------------------- | ------------------------------------------ |
| `enrollmentId`               | Enrollment whose billing agreement this is |
| `type`                       | Monthly / one-time / installment           |
| `amount`                     | Base billing amount                        |
| `discountType`               | none / percentage / fixed                  |
| `discountValue`              | Discount amount or percentage              |
| `billingStartDate`           | Date from which billing begins             |
| `firstInvoiceAmountOverride` | Optional first-invoice amount              |

---

# 7. BillingPlan Invariants

### BIL-001 — Enrollment ownership

Every BillingPlan belongs to exactly one Enrollment.

```text
BillingPlan → Enrollment
```

### BIL-002 — BillingPlan does not own payment state

Payment information must never be stored on BillingPlan.

### BIL-003 — Payments do not mutate BillingPlan

Recording:

```text
₹5,000 payment
```

must not change:

```text
BillingPlan.amount
BillingPlan.type
BillingPlan.discount*
BillingPlan.billingStartDate
```

### BIL-004 — One billing agreement per enrollment

The current schema models:

```text
Enrollment 1 → BillingPlan
```

and the DADD explicitly describes exactly one active fee plan per enrollment. 

**Freeze decision:** Phase 3 will maintain **one current BillingPlan per Enrollment**.

Historical replacement/versioning of BillingPlans is **out of Phase 3 MVP scope**.

---

# 8. Discount Contract

Supported:

```text
none
percentage
fixed
```

These are explicitly defined by the SRS/DADD/schema. 

Conceptually:

```text
Base Amount
      ↓
Discount
      ↓
Invoice Amount
```

### Percentage

```text
discount = base × percentage / 100
```

### Fixed

```text
discount = fixed amount
```

### Important invariant

The resulting invoice amount must never become negative.

Therefore:

```text
final amount >= 0
```

This is an implementation invariant derived from the monetary model; the source documents specify the discount types but do not define the exact boundary behavior.

---

# 9. Billing Start Date

`billingStartDate` is independent from enrollment join date.

This is explicitly required by FR-054. 

Example:

```text
Enrollment date
    Aug 17

Billing start
    Sep 01
```

The billing engine must therefore **not assume**:

```text
billingStartDate === enrolledAt
```

---

# 10. First Invoice Override

`firstInvoiceAmountOverride` exists specifically for:

* late joins
* pro-rata cases

The SRS explicitly defines this purpose. 

Therefore:

```text
Normal invoice
    → generated from BillingPlan rules

First invoice with override
    → uses explicit override
```

The override applies only to the applicable first invoice.

It must **not permanently modify**:

```text
BillingPlan.amount
```

---

# 11. Monthly Billing

Monthly BillingPlan:

```text
BillingPlan(type = monthly)
        ↓
Invoice
        ↓
Invoice
        ↓
Invoice
        ↓
...
```

The SRS defines monthly billing as an invoice generated each month. 

### Frozen rule

The billing schedule is determined from:

```text
billingStartDate
```

not the enrollment creation timestamp.

---

# 12. One-Time Billing

One-time:

```text
BillingPlan(type = one_time)
        ↓
One Invoice
```

The SRS explicitly defines One-Time as a single invoice on creation. 

No recurring generation occurs.

---

# 13. Installment Billing

Installment:

```text
BillingPlan(type = installment)
        ↓
Invoice 1
Invoice 2
Invoice 3
...
```

The source defines installments as **N invoices based on a schedule**. 

### Important contract decision

The current canonical database schema does **not** contain installment-specific schedule columns/entities.

Therefore Phase 3.0 freezes the conceptual contract:

> An installment BillingPlan produces multiple invoices according to an installment schedule.

But the **exact schedule representation** must be implemented through the approved Phase 3 design without silently introducing unsupported schema assumptions.

We should resolve this at the implementation subphase before creating migrations.

---

# 14. Invoice Contract

An Invoice is:

> **A payment request generated from a BillingPlan.**

The SRS defines the lifecycle:

```text
Generated
   ↓
Pending
   ↓
Partially Paid
   ↓
Paid
```

Canonical persisted fields are:

```text
id
billingPlanId
amount
dueDate
status
createdAt
updatedAt
```

The current database schema uses `billingPlanId`. 

---

# 15. Invoice Status

Canonical Phase 3 status:

```text
pending
partial
paid
```

The current schema and SRS use exactly these three states. 

### State machine

```text
                payment
                   │
                   ▼
             ┌───────────┐
             │  pending  │
             └─────┬─────┘
                   │
             partial payment
                   │
                   ▼
             ┌───────────┐
             │  partial  │
             └─────┬─────┘
                   │
              full payment
                   │
                   ▼
             ┌───────────┐
             │   paid    │
             └───────────┘
```

### No backward transitions

```text
paid → partial
paid → pending
```

are not allowed by the Phase 3 MVP contract.

---

# 16. Important DADD Reconciliation — `overdue`

The older DADD contains an `overdue` invoice status. 

However:

* SRS specifies `pending`, `partial`, `paid`
* current Prisma schema specifies `pending`, `partial`, `paid`
* roadmap specifies `pending`, `partial`, `paid`

Therefore:

> **`overdue` is NOT part of the Phase 3 persisted Invoice state machine.**

Overdue reporting can be derived later from:

```text
dueDate < today
AND
status != paid
```

but that behavior is **not a Phase 3 state transition**.

This avoids adding an unnecessary schema change.

---

# 17. Outstanding Amount

The DADD explicitly states:

> Outstanding amount is computed, never stored. 

Therefore:

```text
outstanding =
    invoice.amount
    -
    SUM(invoice.payments.amount)
```

Never create:

```text
invoice.balance
invoice.outstandingAmount
```

as persisted mutable state for MVP.

This prevents balance drift.

---

# 18. Payment Contract

A Payment represents:

> **Actual money received by the institute.**

It is **not an online payment transaction**. 

Supported modes:

```text
cash
upi
bank_transfer
```

Online payment gateway integration is explicitly outside MVP. 

---

# 19. Payment Fields

Current schema:

```text
id
invoiceId
amount
paymentMode
receivedOn
collectedBy
remarks
createdAt
```

### Meaning

| Field         | Meaning                              |
| ------------- | ------------------------------------ |
| `invoiceId`   | Invoice being paid                   |
| `amount`      | Amount actually received             |
| `paymentMode` | Cash / UPI / bank transfer           |
| `receivedOn`  | Date payment was received            |
| `collectedBy` | Staff member recording/collecting it |
| `remarks`     | Optional operational note            |

---

# 20. Payment Invariants

### PAY-001

Payment amount must be:

```text
> 0
```

This is explicitly required by the DADD API contract. 

### PAY-002

Payment must reference an existing Invoice.

### PAY-003

Payment must belong to the same institute as the authenticated tenant.

### PAY-004

Multiple payments may belong to one Invoice.

```text
Invoice
 ├── Payment 1
 ├── Payment 2
 └── Payment 3
```

This explicitly supports partial payments. 

### PAY-005

A payment cannot make an invoice's total received amount exceed the invoice amount.

So:

```text
SUM(payments) <= invoice.amount
```

This is a necessary financial consistency invariant for the stated partial-payment model.

---

# 21. Payment Recording Transaction

This is one of the most important Phase 3 transactions.

The SDD explicitly defines:

> Payment Recording = Payment + Invoice update. 

Therefore:

```text
BEGIN TRANSACTION

1. Resolve invoice
2. Verify tenant
3. Verify invoice is payable
4. Validate payment amount
5. Calculate current outstanding
6. Reject overpayment
7. Create Payment
8. Recalculate invoice status
9. Commit

AFTER COMMIT

10. Publish PaymentRecorded
11. Generate receipt workflow
```

If any step before commit fails:

```text
Payment = not created
Invoice = unchanged
```

---

# 22. Invoice Status Calculation

Status must derive from financial state.

```text
received = SUM(payments.amount)
amount   = invoice.amount
```

Then:

```text
received == 0
    → pending

0 < received < amount
    → partial

received == amount
    → paid
```

This keeps Invoice status consistent with actual payments.

---

# 23. Receipt Contract

Receipt is:

> **Proof of payment.**

It is generated from the **Payment**, not the Invoice. 

The relationship is:

```text
Payment 1 → 1 Receipt
```

This is explicitly enforced by a unique `paymentId` in the current schema. 

---

# 24. Receipt Number

Receipt numbers are:

> **Institute-scoped sequential numbers.**

This is defined by the DADD. 

Therefore:

```text
Institute A:
R-000001
R-000002
R-000003

Institute B:
R-000001
R-000002
```

Receipt numbering must never be globally shared across institutes.

---

# 25. Receipt Content

The SRS requires printable receipts containing:

* Institute branding
* Receipt number
* Student
* Amount
* Payment mode
* Date

The DADD additionally defines:

* generated timestamp

Therefore receipt presentation must expose the payment context required to identify the transaction.

---

# 26. Receipt Generation

The business transaction is:

```text
Payment
   ↓
Receipt
```

The DADD explicitly says:

> One Payment → One Receipt. 

### Idempotency invariant

If receipt creation is retried for the same Payment:

```text
Payment P
   ↓
Receipt R
```

must remain:

```text
1 Payment → exactly 1 Receipt
```

Never:

```text
Payment P
   ↓
Receipt R1
Receipt R2
```

---

# 27. Receipt PDF

The SDD describes receipt PDF generation as background processing. 

Therefore:

### Phase 3 domain

Owns:

```text
receipt existence
receipt identity
receipt number
payment relationship
```

### Infrastructure

Owns:

```text
PDF rendering
storage
download URL
```

The domain must not know about PDF libraries or object storage.

---

# 28. Financial Immutability

Financial records are historical records.

The DADD explicitly states that:

* payments must never be hard deleted
* invoices must never be hard deleted
* enrollment history must be preserved. 

Therefore:

### Payment

Once recorded:

```text
Payment
```

is immutable in Phase 3 MVP.

### Receipt

Once generated:

```text
Receipt
```

is immutable.

### Invoice

Once financial activity exists against an Invoice, its financial amount must not be casually edited.

We should not build destructive editing into the payment workflow.

---

# 29. Invoice Generation

There are two conceptual sources:

```text
BillingPlan → automatic invoice generation
```

and the existing DADD API also specifies:

```text
POST /invoices
→ manually generate invoice
```

### Contract

Both are allowed, but:

> **Every invoice must belong to a BillingPlan.**

Manual generation does not mean an invoice becomes independent of a plan.

---

# 30. Duplicate Invoice Protection

The billing engine must be idempotent for generated recurring invoices.

For example, if monthly generation runs twice:

```text
August invoice
```

must not become:

```text
August invoice #1
August invoice #2
```

This is a business invariant required for safe scheduled generation.

The exact database uniqueness mechanism will be selected during implementation based on the finalized installment/monthly schedule representation.

---

# 31. Tenant Isolation

Billing is completely tenant-scoped.

The security invariant:

```text
Authenticated User
        ↓
Institute A
        ↓
Billing query
        ↓
ONLY Institute A billing data
```

A user from Institute A must never access:

* Institute B BillingPlans
* Institute B invoices
* Institute B payments
* Institute B receipts

even if they possess a valid UUID from Institute B.

The existing architecture mandates server-side tenant resolution and repository-level tenant scoping. 

---

# 32. Critical Cross-Tenant Chain

This must be checked across the entire relationship:

```text
Invoice
 ↓
BillingPlan
 ↓
Enrollment
 ↓
Student
 ↓
Institute
```

and:

```text
Payment
 ↓
Invoice
 ↓
BillingPlan
 ↓
Enrollment
 ↓
Institute
```

and:

```text
Receipt
 ↓
Payment
 ↓
Invoice
 ↓
BillingPlan
 ↓
Enrollment
 ↓
Institute
```

The client must never be trusted to establish tenant ownership.

---

# 33. Authorization

The existing authorization architecture is capability-based rather than merely role-based. 

The DADD explicitly mentions:

```text
invoice.create
payment.record
```

Phase 3 will therefore use capabilities such as:

```text
billing:read
billing:plan:create
billing:plan:update
invoice:read
invoice:create
payment:record
payment:read
receipt:read
```

**Important:** the exact final capability names must match the existing centralized capability registry rather than introducing duplicate permission concepts.

No new role system will be created.

---

# 34. Parent Access

Parent visibility is intentionally downstream.

Phase 3's core job is staff-side billing.

Later Parent PWA requirements explicitly include:

* fee status
* invoice history
* receipt downloads

FR-089 and FR-090. 

Therefore:

```text
Phase 3
Billing data exists correctly
        ↓
Phase 5
Parent can consume it
```

We should **not build the complete Parent PWA inside Phase 3**.

---

# 35. Domain Events

The SDD already freezes:

```text
InvoiceGenerated
PaymentRecorded
```

as domain events. 

### InvoiceGenerated

Triggered after successful invoice creation.

```text
Invoice transaction
      ↓
COMMIT
      ↓
InvoiceGenerated
```

### PaymentRecorded

Triggered after successful payment transaction.

```text
Payment + invoice status
      ↓
COMMIT
      ↓
PaymentRecorded
```

Events represent immutable facts and are published only after successful transaction completion. 

---

# 36. Receipt Event

The current source documents do **not** define a first-class `ReceiptGenerated` event.

Therefore:

> We will **not invent a new domain event in Phase 3.0**.

Receipt generation can be part of the payment workflow and downstream processing without creating a new cross-module contract unless a concrete requirement emerges.

---

# 37. Transaction Boundaries

### Transaction A — Generate Invoice

```text
BillingPlan
      ↓
Invoice
```

Atomic.

### Transaction B — Record Payment

```text
Payment
+
Invoice status
```

Atomic.

### Transaction C — Receipt

Receipt creation must be idempotent and tied to the successful Payment.

Whether receipt persistence occurs inside the payment transaction or immediately after commit depends on the final PDF/receipt architecture.

**The critical invariant remains:**

```text
No successful Payment without a deterministically recoverable Receipt.
```

---

# 38. Payment → Receipt Failure

This deserves explicit treatment.

We must not do:

```text
Create Payment
↓
PDF generation fails
↓
Rollback payment
```

because PDF generation is infrastructure/background work and must not make the financial operation fail. The SDD explicitly says background/external operations must not block the business operation. 

Instead:

```text
Payment transaction succeeds
        ↓
PaymentRecorded
        ↓
Receipt generation
        ↓
PDF generation
```

The receipt record/workflow must be retryable and idempotent.

---

# 39. API Contract

The existing DADD defines:

### Billing Plans

```text
GET   /api/v1/fee-plans
POST  /api/v1/fee-plans
PATCH /api/v1/fee-plans/{id}
```

But the newer SRS/schema terminology is **BillingPlan**, not FeePlan. 

### Freeze decision

Use:

```text
/api/v1/billing-plans
```

rather than perpetuating the old `fee-plans` terminology.

This is a contract reconciliation, not a new business capability.

---

## Invoice

```text
GET  /api/v1/invoices
POST /api/v1/invoices
GET  /api/v1/invoices/{id}
```

The DADD defines these operations. 

---

## Payment

```text
POST /api/v1/payments
GET  /api/v1/payments
```

with filters such as:

```text
date
batch_id
student_id
```

---

## Receipt

```text
GET /api/v1/receipts/{id}
```

The DADD specifies receipt metadata plus a signed download URL. 

---

# 40. API Pipeline

Every Billing API follows:

```text
HTTP Request
      ↓
Authentication
      ↓
Server Tenant Resolution
      ↓
Capability Check
      ↓
Zod Validation
      ↓
Billing Use Case
      ↓
Repository
      ↓
PostgreSQL Transaction
      ↓
Domain Event
      ↓
Safe API Response
```

This follows the frozen SDD request lifecycle. 

---

# 41. Error Contract

Billing must use the existing shared error taxonomy.

Examples:

| Situation                      | Error                                            |
| ------------------------------ | ------------------------------------------------ |
| Invalid amount                 | `ValidationError`                                |
| Invalid discount               | `ValidationError`                                |
| Invoice not found              | `NotFoundError`                                  |
| BillingPlan not found          | `NotFoundError`                                  |
| Cross-tenant invoice           | `NotFoundError` / existing tenant masking policy |
| Unauthorized payment recording | `AuthorizationError`                             |
| Duplicate BillingPlan          | `ConflictError`                                  |
| Overpayment                    | `ValidationError`                                |
| Unexpected DB failure          | `InternalError`                                  |

No new generic Billing error framework.

---

# 42. Money Representation

The existing schema uses PostgreSQL `Decimal` / `NUMERIC` rather than floating point. 

Therefore:

```text
Money = Decimal
```

Never:

```text
number / float
```

for persisted monetary calculations.

The Engineering Playbook also explicitly requires `NUMERIC` for money. 

---

# 43. No Online Payments

Phase 3 explicitly supports:

```text
Cash
UPI
Bank Transfer
```

It does **not** implement:

```text
Razorpay checkout
Stripe
payment gateway
webhooks
online collection
```

The SRS explicitly states online payment gateway is outside MVP. 

---

# 44. No Accounting System

Billing is not:

* double-entry accounting
* GST accounting
* payroll
* expense management
* bank reconciliation
* tax filing
* ledger software

Those are outside the Phase 3 contract.

The goal is operational fee management.

---

# 45. Phase 3 User Workflow

The canonical staff workflow is:

```text
Open Student
      ↓
Open Enrollment
      ↓
View BillingPlan
      ↓
View outstanding invoices
      ↓
Select invoice
      ↓
Record payment
      ↓
Select:
  Cash / UPI / Bank Transfer
      ↓
Enter amount
      ↓
Confirm
      ↓
Payment recorded
      ↓
Invoice status recalculated
      ↓
Receipt generated
      ↓
Receipt printable/downloadable
```

This directly implements the Phase 3 roadmap deliverable. 

---

# 46. Phase 3 Domain Structure

The Billing package should follow the established module structure:

```text
packages/billing/

src/
├── domain/
│   ├── entities/
│   │   ├── billing-plan.entity.ts
│   │   ├── invoice.entity.ts
│   │   ├── payment.entity.ts
│   │   └── receipt.entity.ts
│   │
│   ├── value-objects/
│   │   ├── money.vo.ts
│   │   ├── discount.vo.ts
│   │   └── receipt-number.vo.ts
│   │
│   ├── enums/
│   │   ├── billing-type.ts
│   │   ├── invoice-status.ts
│   │   └── payment-mode.ts
│   │
│   ├── services/
│   │   └── fee-schedule-generator.ts
│   │
│   └── repositories/
│
├── application/
│   ├── dto/
│   └── use-cases/
│       ├── create-billing-plan.ts
│       ├── generate-invoice.ts
│       ├── record-payment.ts
│       ├── get-invoice.ts
│       └── get-receipt.ts
│
├── infrastructure/
│   └── repositories/
│
├── presentation/
│   └── validators/
│
└── index.ts
```

The exact folder names can follow the repository's existing conventions, but the architectural layers are non-negotiable. 

---

# 47. Phase 3 Acceptance Matrix

## BillingPlan

* [ ] Monthly BillingPlan
* [ ] One-time BillingPlan
* [ ] Installment BillingPlan
* [ ] Percentage discount
* [ ] Fixed discount
* [ ] Billing start date
* [ ] First invoice override
* [ ] Enrollment ownership
* [ ] Tenant isolation

## Invoice

* [ ] Generated from BillingPlan
* [ ] Correct amount
* [ ] Correct due date
* [ ] Pending state
* [ ] Partial state
* [ ] Paid state
* [ ] Outstanding amount computed
* [ ] No overpayment
* [ ] No cross-tenant access
* [ ] Duplicate generation protection

## Payment

* [ ] Cash
* [ ] UPI
* [ ] Bank transfer
* [ ] Positive amount
* [ ] Partial payment
* [ ] Full payment
* [ ] Collected-by staff
* [ ] Remarks
* [ ] Immutable financial record
* [ ] Tenant isolation

## Receipt

* [ ] One receipt per payment
* [ ] Sequential institute-scoped number
* [ ] Student information
* [ ] Amount
* [ ] Payment mode
* [ ] Date
* [ ] Institute branding
* [ ] Printable
* [ ] Retry-safe
* [ ] Tenant isolation

---

# 48. Security Acceptance Matrix

Mandatory adversarial tests:

```text
Institute A
    ↓
tries Invoice B
    → DENIED

Institute A
    ↓
tries Payment B
    → DENIED

Institute A
    ↓
tries Receipt B
    → DENIED

Institute A
    ↓
changes billingPlanId
    → DENIED

Institute A
    ↓
changes invoiceId
    → DENIED

Institute A
    ↓
changes enrollmentId
    → DENIED
```

Tenant identity must always come from the authenticated server context.

---

# 49. Phase 3 Non-Goals

Explicitly **not** part of this phase:

```text
❌ Online payment gateway
❌ Razorpay integration
❌ Automatic bank reconciliation
❌ GST/tax accounting
❌ Expense management
❌ Payroll
❌ Full accounting ledger
❌ Subscription billing for CoachingOS itself
❌ Parent PWA
❌ WhatsApp payment notifications
❌ AI fee prediction
❌ Advanced financial analytics
❌ Multi-branch billing
```

Parent fee visibility will be consumed later by the Parent PWA. The SRS places fee status, invoice history, and receipt downloads there. 

---

# 50. Source Reconciliation Register

There are **three important inconsistencies** between the older documents and the current architecture.

### R-001 — FeePlan vs BillingPlan

Older DADD API:

```text
/fee-plans
```

Current SRS/database:

```text
BillingPlan
billing_plans
```

**Resolution:** `BillingPlan` is canonical.

---

### R-002 — Invoice `overdue`

Older DADD mentions:

```text
overdue
```

Current SRS/schema:

```text
pending
partial
paid
```

**Resolution:** `overdue` is not a persisted Phase 3 state.

---

### R-003 — Installment schedule

SRS says:

> Installments = N invoices based on schedule.

Current schema does not contain an explicit installment schedule model.

**Resolution:** The conceptual requirement is frozen, but the persistence representation must be explicitly designed in the next implementation subphase before migration.

This is the **only meaningful remaining technical design item** before implementation.

---

# 51. Phase 3.0 Freeze Boundary

At the end of Phase 3.0, the following are now frozen:

```text
                    BILLING CONTRACT
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
     BillingPlan       Invoice           Payment
          │                │                │
          │                └───────┐        │
          │                        ▼        ▼
          │                     Payment   Receipt
          │
          ├── Monthly
          ├── One-time
          └── Installment
```

The financial truth is:

```text
BillingPlan
    = contract

Invoice
    = amount requested

Payment
    = amount actually received

Receipt
    = proof of payment
```

And:

```text
Outstanding
=
Invoice Amount
-
SUM(Payments)
```

---

# 52. Final Freeze Status

### 🟢 PHASE 3.0 — ACCEPTED & FROZEN

**Contract status:**

```text
Architecture       🟢 FROZEN
Domain terminology 🟢 FROZEN
Entity ownership   🟢 FROZEN
Money model        🟢 FROZEN
Invoice lifecycle  🟢 FROZEN
Payment model      🟢 FROZEN
Receipt model      🟢 FROZEN
Tenant isolation   🟢 FROZEN
Authorization      🟢 FROZEN
Transactions       🟢 FROZEN
Domain events      🟢 FROZEN
API direction      🟢 FROZEN
MVP boundaries     🟢 FROZEN
```

The only implementation-specific design that must be settled before the first migration is the **exact persistence representation of installment schedules**. I would **not invent columns or silently alter the schema** just to make the implementation convenient.
