# PHASE 3.7 — SECURITY / UX / E2E MATRIX ARCHITECTURE & ACCEPTANCE CONTRACT

**CoachingOS — Contract Freeze v1.0**

**Status: 🟢 ACCEPTED & FROZEN**

This document establishes the authoritative security threat model, authorization matrix, tenant isolation guardrails, financial integrity rules, concurrency & idempotency matrices, API abuse protections, UI safety constraints, accessibility standards, E2E user journeys, regression mappings, audit requirements, and comprehensive acceptance test criteria for **Phase 3.7 — Security / UX / E2E Matrix** of CoachingOS.

Phase 3.0 (Billing Architecture), Phase 3.1 (BillingPlan Domain), Phase 3.2 (Invoice Engine), Phase 3.3 (Payment Engine), Phase 3.4 (Receipt Engine), Phase 3.5 (Protected Billing APIs), and Phase 3.6 (Staff Billing Workspace UI) are **COMPLETED, VERIFIED & FROZEN**. Phase 3.7 freezes the security, financial integrity, and user-experience acceptance boundaries across the complete Billing vertical.

---

# 1. Architectural Position & Security Ownership Boundary

The complete Phase 3 Billing ownership chain is defined as:

```text
BillingPlan
  └── Enrollment
        └── Institute (Tenant)

Invoice
  └── BillingPlan
        └── Enrollment
              └── Institute (Tenant)

Payment
  └── Invoice
        └── BillingPlan
              └── Enrollment
                    └── Institute (Tenant)

Receipt
  └── Payment
        └── Invoice
              └── BillingPlan
                    └── Enrollment
                          └── Institute (Tenant)
```

### Core Invariants
1. **Server-Authoritative Tenant Scoping**: Every tenant database query and mutation MUST be scoped explicitly by `instituteId` derived exclusively from server-verified session context (`resolveV1TenantContext()`).
2. **Client `instituteId` Non-Trust**: Any `instituteId` supplied in client request query parameters, JSON bodies, or headers is strictly ignored and MUST NOT override server session tenancy.
3. **Safe Cross-Tenant Failure Mode**: Any cross-tenant access attempt (e.g. User from Institute A attempting to read or mutate a resource belonging to Institute B) MUST return `404 Not Found` to prevent resource enumeration attacks.
4. **Historical Financial Immutability**: Historical financial ledgers (`Invoice`, `Payment`, `Receipt`) are immutable once recorded. `PATCH` and `DELETE` requests on financial records return `405 Method Not Allowed`.

---

# 2. Source Reconciliations (R-SEC / R-FIN / R-UX Register)

### R-SEC-001 — Cross-Tenant Resource Enumeration Masking
- **Conflict**: Standard REST conventions return `403 Forbidden` for foreign tenant objects. SRS/DADD require preventing resource enumeration attacks.
- **Resolution**: Cross-tenant requests return `404 Not Found` (`NotFoundError`) when a requested resource ID exists in PostgreSQL but belongs to a different institute.

### R-SEC-002 — Backend Authorization as Authoritative Source of Truth
- **Conflict**: Client UI components enforce capability checks (`billing:read`, `payment:record`, etc.) for button visibility.
- **Resolution**: UI visibility is purely cosmetic. Backend HTTP endpoints enforce `AuthorizationEngine.requireCapability()` authoritatively. Bypassing UI filters directly via curl/fetch returns `403 Forbidden` (`AuthorizationError`).

### R-FIN-001 — Payment Balance Derivation & Non-Persistence
- **Conflict**: Traditional databases store mutable `outstanding` column in `Invoice` table.
- **Resolution**: In CoachingOS, `outstanding = invoice.amount - SUM(payments)`. Outstanding is calculated dynamically in PostgreSQL/use-cases and is NEVER stored as a mutable state column, preventing financial drift.

### R-FIN-002 — Overpayment & Negative Outstanding Prevention
- **Conflict**: Certain legacy systems allow overpayments or negative balance generation.
- **Resolution**: Overpayment is strictly forbidden ($PaymentAmount > Outstanding$). Attempting to record a payment exceeding invoice outstanding returns `400 Bad Request` (`ValidationError`). No credit balances or negative outstanding are permitted in Phase 3.

### R-FIN-003 — Tuple Idempotency Boundary for Payments
- **Conflict**: High-frequency web applications can experience double-click submissions.
- **Resolution**: `RecordPaymentUseCase` enforces tuple idempotency `(invoiceId, amount, paymentMode, receivedOn)` in PostgreSQL transaction. Re-submitting the exact same tuple returns the previously recorded `Payment` without duplicating ledger entries.

### R-FIN-004 — Payment Tuple Idempotency Product Limitation
- **Conflict**: Legitimate duplicate payments on the same date for the exact same amount (`₹5,000` cash on `2026-08-14` for `Invoice X`).
- **Resolution**: Both identical payments share the tuple idempotency key `(invoiceId, amount, paymentMode, receivedOn)` and will return the first recorded `Payment` DTO. This is an accepted product boundary/limitation for Phase 3. Staff making legitimate duplicate payments on the same date must vary remarks or timestamp metadata.

### R-FIN-005 — Stale Balance Concurrency Response Canonical Standard
- **Conflict**: UI contract mentions `409 Conflict`, while use case validation returns `400 Bad Request` (`ValidationError`).
- **Resolution**: The backend `RecordPaymentUseCase` returns `400 Bad Request` with `code: "VALIDATION_ERROR"` when payment exceeds remaining balance due to concurrent updates. The UI `RecordPaymentModal` catches both `400` and `409` status codes and renders the financial conflict notice.

### R-REC-001 — Receipt Sequence Allocation & Rollback Gap Behavior
- **Conflict**: Certain descriptions refer to "gapless sequence numbering". PostgreSQL atomic sequence allocation permits gaps on transaction rollback.
- **Resolution**: Receipt numbers use format `REC-{YYYY}-{SEQ:5}` allocated atomically per institute. Sequence numbers are unique and strictly monotonic per allocation. If a transaction rolls back after sequence increment, sequence gaps are allowed and compliant with Phase 3.4 contract. "Gapless" is NOT guaranteed across transaction rollbacks.

### R-UX-001 — Stale Balance Concurrency UX Handling
- **Conflict**: Concurrent payment recording by two staff members on the same invoice.
- **Resolution**: When a payment fails due to 409 Conflict / 400 Bad Request (outstanding changed concurrently), UI displays an alert: *"Financial Conflict: The outstanding balance on this invoice has changed. Please review the updated balance before retrying."* UI DOES NOT auto-retry or alter payment amounts automatically.

### R-UX-002 — Receipt PDF Storage Boundary
- **Conflict**: SRS mentions downloading PDF receipts. Object storage workers are deferred to future infrastructure phases.
- **Resolution**: `ReceiptDTO.downloadUrl` returns `null`. Staff UI displays official receipt number (`REC-YYYY-XXXXX`) and metadata with a disabled "Download PDF" button and explanatory tooltip.

---

# 3. Security Threat Model Matrix

| Threat ID | Vulnerability / Attack Vector | Impact | Existing & Required Mitigation | Verification Method | Residual Risk |
|---|---|---|---|---|---|
| **T-001** | Cross-Tenant IDOR (`GET /api/v1/invoices/{foreignId}`) | Unauthorized viewing of foreign student financial obligations | `resolveV1TenantContext()` scopes repository queries by `instituteId`. Foreign lookup returns `404 Not Found`. | Integration & Adversarial Test | Minimal |
| **T-002** | Client `instituteId` Spoofing in Body/Query | Tenant context override / cross-tenant injection | `resolveV1TenantContext()` ignores client `instituteId` input and resolves strictly from session cookie. | Adversarial Test | Zero |
| **T-003** | Capability Bypass (`POST /api/v1/payments` without `payment:record`) | Unauthorized financial ledger modification | `AuthorizationEngine.requireCapability(CAPABILITIES.PAYMENT_RECORD)` checked server-side before execution. | HTTP Integration Test | Zero |
| **T-004** | Invoice Overpayment Injection ($Payment > Outstanding$) | Financial ledger corruption / negative balance | `RecordPaymentUseCase` validates $amount \le outstanding$. | Domain & API Test | Zero |
| **T-005** | Double Payment Submission (Rapid Double Click) | Duplicate payment entry on same invoice | Tuple idempotency check + PostgreSQL row lock `SELECT ... FOR UPDATE`. | Concurrent Race Test | Zero |
| **T-006** | Concurrent Payment Race ($₹7k + ₹7k$ on $₹10k$ Invoice) | Over-collection beyond total invoice obligation | PostgreSQL row locking (`SELECT FOR UPDATE`) forces serial evaluation; second payment fails with validation error. | Real PostgreSQL Race Test | Zero |
| **T-007** | Receipt Number Sequence Collision | Duplicate receipt numbers allocated in same year | PostgreSQL sequence / atomic allocation with transaction lock per institute. | Concurrent Receipt Test | Zero |
| **T-008** | Duplicate Receipt Generation for Same Payment | Multiple receipts issued for single payment | 1-to-1 Payment-to-Receipt constraint in DB (`payment_id` UNIQUE). Re-trigger returns existing receipt. | Use Case & API Test | Zero |
| **T-009** | Historical Invoice Mutation via Plan Update | Tampering with issued invoice financial amounts | `UpdateBillingPlanUseCase` updates rule metadata for future generations; existing invoices remain snapshot-frozen. | Integration Test | Zero |
| **T-010** | Invoice Status Direct Modification via API | Bypassing payment workflow to mark invoice paid | HTTP routes forbid `PATCH` and `DELETE` on invoices (`405 Method Not Allowed`). Status recalculates strictly via payments. | Route Security Test | Zero |
| **T-011** | Stale Balance Payment Attempt in UI | Staff recording payment on already paid/reduced invoice | Backend rejects with 400/409; UI displays clear conflict notice without auto-retrying. | E2E & Component Test | Minimal |
| **T-012** | Malicious Input Payload (NaN, Negative, Oversized Strings) | System crash or floating-point precision error | Zod schema validation enforces strict types, positive numbers, and max lengths. | Zod Boundary Test | Zero |
| **T-013** | Unauthenticated Access to Financial Endpoints | Data leak to unauthenticated internet traffic | `getAuthenticatedSession()` middleware returns `401 Unauthorized` for all `/api/v1/` billing routes. | HTTP Auth Test | Zero |
| **T-014** | API Rate Limit Abuse / Denial of Service | System overload via automated script | IP & session rate limiting (`assertReadRateLimit`, `assertMutationRateLimit`). | Rate Limit Test | Low |

---

# 4. Authentication & Authorization Matrix

### 4.1 Authentication Response Expectations

| User State | Endpoint Type | Expected HTTP Status | Error Code | Response Masking |
|---|---|---|---|---|
| Unauthenticated (No session cookie) | Any `/api/v1/billing*` | `401 Unauthorized` | `UNAUTHENTICATED` | Standard 401 JSON envelope |
| Authenticated (No institute membership) | Any `/api/v1/billing*` | `403 Forbidden` | `FORBIDDEN` | Standard 403 JSON envelope |
| Authenticated (Inactive membership) | Any `/api/v1/billing*` | `403 Forbidden` | `FORBIDDEN` | Standard 403 JSON envelope |
| Authenticated (Foreign tenant member) | `/api/v1/*/{id}` (Detail) | `404 Not Found` | `NOT_FOUND` | Masks existence of foreign ID |
| Authenticated (Foreign tenant member) | `/api/v1/*` (List) | `200 OK` | — | Returns empty collection (`items: []`) |

### 4.2 Capability Matrix

| Resource | Operation | Required Capability | Un-captioned Behavior (API) | Un-captioned Behavior (UI) |
|---|---|---|---|---|
| `BillingPlan` | List / Read Detail | `billing:read` | `403 Forbidden` | Hides workspace / Access Denied |
| `BillingPlan` | Create / Update | `billing:write` | `403 Forbidden` | Hides "New Plan" & "Edit Rules" buttons |
| `Invoice` | List / Read Detail | `billing:read` | `403 Forbidden` | Hides Invoices tab content |
| `Invoice` | Generate | `billing:write` | `403 Forbidden` | Hides "Generate Invoice" button |
| `Payment` | List / Read Detail | `billing:read` | `403 Forbidden` | Hides Payments tab content |
| `Payment` | Record | `payment:record` | `403 Forbidden` | Hides "Record Payment" & "Pay" buttons |
| `Receipt` | List / Read Detail | `receipt:read` | `403 Forbidden` | Hides Receipts tab content |
| `Receipt` | Generate / Issue | `receipt:issue` | `403 Forbidden` | Hides "Issue Receipt" button |

---

# 5. IDOR & Tenant Isolation Matrix

Every tenant-owned request MUST adhere to the following isolation matrix:

| Scenario ID | Tested Vector | Input Payload | Expected HTTP | Expected System State |
|---|---|---|---|---|
| **IDOR-001** | Cross-Tenant BillingPlan GET | `GET /api/v1/billing-plans/{instB_planId}` | `404 Not Found` | Zero data returned; logged as security alert |
| **IDOR-002** | Cross-Tenant Invoice GET | `GET /api/v1/invoices/{instB_invoiceId}` | `404 Not Found` | Zero data returned; logged as security alert |
| **IDOR-003** | Cross-Tenant Payment GET | `GET /api/v1/payments/{instB_paymentId}` | `404 Not Found` | Zero data returned; logged as security alert |
| **IDOR-004** | Cross-Tenant Receipt GET | `GET /api/v1/receipts/{instB_receiptId}` | `404 Not Found` | Zero data returned; logged as security alert |
| **IDOR-005** | POST BillingPlan with foreign `enrollmentId` | `POST /api/v1/billing-plans` (`enrollmentId: instB_enr`) | `404 Not Found` | Plan creation fails; enrollment ownership verified |
| **IDOR-006** | POST Payment with foreign `invoiceId` | `POST /api/v1/payments` (`invoiceId: instB_inv`) | `404 Not Found` | Payment recording fails; invoice ownership verified |
| **IDOR-007** | POST Receipt with foreign `paymentId` | `POST /api/v1/receipts` (`paymentId: instB_pay`) | `404 Not Found` | Receipt issuance fails; payment ownership verified |
| **IDOR-008** | Client `instituteId` Parameter Injection | `POST /api/v1/payments` (`instituteId: instB`) | `201 Created` | Payment created in **Institute A** (server session context) |

---

# 6. Financial Integrity & Arithmetic Invariants

### 6.1 Core Financial Rules

1. **Cent-Exact Integer Arithmetic**: All monetary balances, discounts, and installment calculations operate on exact currency units.
2. **Formula Integrity**:
   $$\text{Outstanding} = \text{Invoice.Amount} - \sum \text{Payment.Amount}$$
   $$\text{Invoice.PaidAmount} = \sum \text{Payment.Amount}$$
   $$\text{Status} = \begin{cases} \text{paid} & \text{if } \text{Outstanding} = 0 \\ \text{partial} & \text{if } 0 < \text{PaidAmount} < \text{Amount} \\ \text{pending} & \text{if } \text{PaidAmount} = 0 \end{cases}$$
3. **Derived Overdue Status**:
   $$\text{isOverdue} = (\text{DueDate} < \text{Today}) \land (\text{Status} \ne \text{paid})$$

### 6.2 Cent-Exact Installment Breakdown Matrix

When generating installment invoices ($N$ installments for total obligation $T$):
- Base installment: $B = \lfloor T / N \rfloor$
- Remainder cents: $R = T - (B \times N)$
- Installments $1 \dots (N-1)$ equal $B$.
- Final installment $N$ equals $B + R$.

| Total Obligation ($T$) | Installment Count ($N$) | Installment 1..N-1 Amount | Final Installment ($N$) Amount | Sum Verification |
|---|---|---|---|---|
| ₹10,000.00 | 3 | ₹3,333.33 | ₹3,333.34 | $\sum = \text{₹10,000.00}$ 🟢 |
| ₹100.00 | 6 | ₹16.66 | ₹16.70 | $\sum = \text{₹100.00}$ 🟢 |
| ₹30,000.00 | 3 (₹5,000 override on #1) | ₹5,000.00 (#1) | ₹12,500.00 (#2), ₹12,500.00 (#3) | $\sum = \text{₹30,000.00}$ 🟢 |

---

# 7. Concurrency & Idempotency Matrix

### 7.1 Payment Concurrency & PostgreSQL Row Locking

To prevent over-collection during simultaneous payment recording:
1. `RecordPaymentUseCase` initiates a PostgreSQL transaction with `SELECT ... FOR UPDATE` on the target `Invoice` row.
2. If Payment A ($₹7,000$) and Payment B ($₹7,000$) arrive concurrently for a $₹10,000$ invoice:

```text
Time   Thread A (Payment ₹7k)               Thread B (Payment ₹7k)
 │
 ▼
T1     BEGIN TRANSACTION                    BEGIN TRANSACTION
T2     SELECT * FROM Invoice FOR UPDATE ──► BLOCKED (Waiting for lock...)
T3     Calculate: Bal = 10k - 7k = 3k      │
T4     Insert Payment A (₹7,000)           │
T5     Update Invoice Status -> 'partial'  │
T6     COMMIT TRANSACTION ─────────────────► Lock acquired!
T7                                         SELECT * FROM Invoice FOR UPDATE
T8                                         Reads: Amount=10k, Paid=7k, Outstanding=3k
T9                                         Validate: 7k <= 3k ? FALSE!
T10                                        ROLLBACK & Throw ValidationError (400)
```

### 7.2 Idempotency Rules

| Operation | Idempotency Key / Tuple | Concurrent Request Handling | Retry Request Handling |
|---|---|---|---|
| **Record Payment** | `(invoiceId, amount, paymentMode, receivedOn)` | Serialized via DB row lock; 2nd fails with validation error if over balance | Returns original `Payment` DTO without duplicating DB entry |
| **Issue Receipt** | `paymentId` | Transaction lock; 2nd returns existing `Receipt` | Returns existing `Receipt` DTO; receipt sequence NOT incremented |
| **Generate Invoice** | `(billingPlanId, periodIdentifier)` | Transaction lock; 2nd returns existing `Invoice` | Returns existing `Invoice` DTO without generating duplicate |

---

# 8. API Security & HTTP Method Safety Matrix

### 8.1 HTTP Method Restrictions

| Endpoint Route | Allowed Methods | Forbidden Methods | Status for Forbidden Methods |
|---|---|---|---|
| `/api/v1/billing-plans` | `GET`, `POST` | `PUT`, `DELETE` | `405 Method Not Allowed` |
| `/api/v1/billing-plans/{id}` | `GET`, `PATCH` | `POST`, `PUT`, `DELETE` | `405 Method Not Allowed` |
| `/api/v1/invoices` | `GET`, `POST` | `PUT`, `PATCH`, `DELETE` | `405 Method Not Allowed` |
| `/api/v1/invoices/{id}` | `GET` | `POST`, `PUT`, `PATCH`, `DELETE` | `405 Method Not Allowed` |
| `/api/v1/payments` | `GET`, `POST` | `PUT`, `PATCH`, `DELETE` | `405 Method Not Allowed` |
| `/api/v1/payments/{id}` | `GET` | `POST`, `PUT`, `PATCH`, `DELETE` | `405 Method Not Allowed` |
| `/api/v1/receipts` | `GET`, `POST` | `PUT`, `PATCH`, `DELETE` | `405 Method Not Allowed` |
| `/api/v1/receipts/{id}` | `GET` | `POST`, `PUT`, `PATCH`, `DELETE` | `405 Method Not Allowed` |

---

# 9. UI Safety & Accessibility Matrix

### 9.1 Staff Billing Workspace Safety Controls

1. **Double-Click Protection**: Form submit buttons (`RecordPaymentModal`, `BillingPlanFormModal`, `GenerateInvoiceModal`) enter disabled loading state immediately upon initial trigger.
2. **Dynamic Balance Preview**: `RecordPaymentModal` displays live calculation preview updating on input change.
3. **Stale Balance Alert**: If backend returns 400/409 (outstanding changed concurrently), UI renders inline alert and forces refresh without altering values.
4. **Immutable Action Masking**: UI contains zero "Edit Payment", "Delete Payment", "Edit Receipt", or "Delete Receipt" controls.

### 9.2 Accessibility (A11Y) Criteria

- **Semantic Dialogs**: Modals use `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, and `aria-describedby`.
- **Keyboard Trapping & Escape**: Modals trap keyboard focus when open and close on `Escape` keypress.
- **Focus Management**: Focus automatically moves to primary input upon modal mount and returns to triggering element on unmount.
- **Non-Color-Only Indicators**: All status badges pair distinct visual colors with explicit text labels (`Paid`, `Partially Paid`, `Pending`, `Overdue`).

---

# 10. End-to-End (E2E) User Journeys

| Journey ID | Name | User Action | Expected API Outcome | Expected DB Outcome | Expected UI Outcome | Security Invariant |
|---|---|---|---|---|---|---|
| **E2E-001** | Create BillingPlan | Staff fills plan form & submits | `POST 201 Created` | `BillingPlan` row inserted | Plan appears in list; toast notification | Tenant & capability checked |
| **E2E-002** | Generate One-Time Invoice | Staff triggers invoice generation | `POST 201 Created` | `Invoice` row created (status `pending`) | Invoice rendered in list with pending badge | Period idempotency enforced |
| **E2E-003** | Record Partial Payment | Staff records ₹3,000 on ₹10,000 invoice | `POST 201 Created` | `Payment` created; invoice status -> `partial` | Outstanding updates to ₹7,000; status badge updates | Row lock prevents race |
| **E2E-004** | Record Final Payment | Staff records ₹7,000 on remaining balance | `POST 201 Created` | `Payment` created; invoice status -> `paid` | Outstanding updates to ₹0; status badge -> `Paid` | Invoice obligation fulfilled |
| **E2E-005** | Issue Receipt | Staff clicks "Issue Receipt" on payment | `POST 201 Created` | `Receipt` inserted; `REC-YYYY-XXXXX` allocated | Receipt modal displays official number | 1-to-1 Payment restriction |
| **E2E-006** | Retry Receipt Issuance | Staff clicks "Issue Receipt" again | `POST 201 Created` | Zero new rows inserted; sequence unchanged | Same receipt metadata displayed | Duplicate issuance prevented |
| **E2E-007** | Cross-Tenant Direct URL Attempt | User A accesses `GET /invoices/{instB_inv}` | `GET 404 Not Found` | Zero rows returned | Renders 404 Not Found error page | Resource enumeration masked |
| **E2E-008** | Unauthorized Record Payment Attempt | Staff without `payment:record` calls API | `POST 403 Forbidden` | Transaction aborted | Button hidden; direct API call fails | Backend authorization authoritative |
| **E2E-009** | Concurrent Payment Race | Staff A & B record ₹7,000 simultaneously | 1x `201`, 1x `400` | Exactly 1 payment recorded; balance = ₹3,000 | Staff A succeeds; Staff B receives conflict alert | Row locking prevents negative balance |
| **E2E-010** | Overpayment Submission Attempt | Staff enters ₹12,000 on ₹10,000 invoice | Client blocked & `400` if forced | Transaction aborted | Error message: *"Amount cannot exceed outstanding"* | Integrity enforced |
| **E2E-011** | Plan Update Historical Immutability | Staff updates plan discount rules | `PATCH 200 OK` | `BillingPlan` rules updated | Future generations use new rules; old invoices intact | Financial history preserved |
| **E2E-012** | Stale Balance Payment Conflict | Staff submits on outdated balance | `POST 400 Bad Request` | Transaction aborted | Financial conflict alert rendered | Stale UI handled gracefully |
| **E2E-013** | Payment Double Click | Staff rapidly double-clicks Submit | 1x `201 Created` | Exactly 1 payment inserted | Submit button disables; 1 payment recorded | Button disabling + tuple idempotency |
| **E2E-014** | Unauthenticated API Attempt | Anonymous curl call to `/api/v1/invoices` | `GET 401 Unauthorized` | Zero DB access | Redirected to sign-in | Authentication required |

---

# 11. Acceptance Test Matrix & Quality Gates

### 11.1 Acceptance Criteria Register

| ID | Category | Scenario | Precondition | Action | Expected Result | Severity | Verification Method |
|---|---|---|---|---|---|---|---|
| **AC-SEC-001** | SEC | Cross-tenant invoice lookup | User in Inst A | `GET /api/v1/invoices/{instB_inv}` | `404 Not Found` | P0 | Automated Integration Test |
| **AC-SEC-002** | SEC | Client `instituteId` override attempt | Session in Inst A | `POST /api/v1/payments` with `instituteId: instB` | Payment created in Inst A | P0 | Automated Integration Test |
| **AC-SEC-003** | SEC | Capability missing on record payment | User lacks `payment:record` | `POST /api/v1/payments` | `403 Forbidden` | P0 | Automated Integration Test |
| **AC-FIN-001** | FIN | Overpayment rejection | Invoice outstanding = ₹5,000 | Record payment of ₹6,000 | `400 Bad Request` | P0 | Automated Integration Test |
| **AC-FIN-002** | FIN | Cent-exact 3-installment breakdown | Total = ₹10,000.00 | Generate 3 installments | Inst 1=3333.33, 2=3333.33, 3=3333.34 ($\sum = 10k$) | P0 | Automated Unit Test |
| **AC-FIN-003** | FIN | Method safety on invoice | Valid Invoice ID | `PATCH /api/v1/invoices/{id}` | `405 Method Not Allowed` | P0 | Automated Route Test |
| **AC-CON-001** | CON | Concurrent payment race | Invoice outstanding = ₹10,000 | 2x simultaneous ₹7,000 payments | 1 succeeds (paid=7k, bal=3k), 1 fails (400) | P0 | Real PostgreSQL Race Test |
| **AC-CON-002** | CON | Atomic receipt sequence allocation | 50 concurrent payments | Generate receipts simultaneously | 50 unique sequence numbers without gaps/dups | P0 | Real PostgreSQL Race Test |
| **AC-IDEM-001**| IDEM| Duplicate payment tuple retry | Payment recorded | Re-send same payload | Returns original payment DTO; no duplicate DB row | P0 | Automated Integration Test |
| **AC-IDEM-002**| IDEM| Duplicate receipt generation retry | Receipt generated | Call `POST /api/v1/receipts` again | Returns existing receipt; sequence unchanged | P0 | Automated Integration Test |
| **AC-UI-001**  | UI  | Stale balance conflict handling | Outstanding updated | Submit old balance | Renders financial conflict alert; no auto-retry | P1 | UI Component Test |
| **AC-UI-002**  | UI  | Disabled PDF download button | Valid Receipt Modal | Inspect "Download PDF" button | Button disabled with storage worker tooltip | P2 | UI Component Test |
| **AC-A11Y-001**| A11Y| Keyboard trap in payment modal | Open modal | Press Tab & Escape | Focus trapped inside modal; closes on Escape | P2 | UI Component Test |
| **AC-REG-001** | REG | Monorepo verification suite | Codebase clean | Run full verification command suite | All 13 packages pass typecheck, lint, test, build | P0 | Automated Build Suite |

---

# 12. Observability & Audit Signal Requirements

Every Phase 3 event log MUST utilize structured Pino logging (`@coaching-os/observability`) adhering to format `domain.action.result`:

| Event Name | Trigger Condition | Severity | Log Payload Metadata | PII Redaction Rule |
|---|---|---|---|---|
| `identity.membership.resolve.success` | Session membership resolved | `INFO` | `requestId`, `userId`, `instituteId`, `role` | Exclude raw auth token / cookies |
| `billing.plan.create.success` | BillingPlan created | `INFO` | `requestId`, `instituteId`, `billingPlanId`, `totalAmount` | Exclude student address/phone |
| `billing.invoice.generate.success` | Invoice generated | `INFO` | `requestId`, `instituteId`, `invoiceId`, `amount`, `dueDate` | Redact sensitive notes |
| `billing.payment.recorded` | Payment recorded | `INFO` | `requestId`, `instituteId`, `paymentId`, `invoiceId`, `amount`, `mode` | Exclude bank account details |
| `billing.receipt.generated` | Receipt generated | `INFO` | `requestId`, `instituteId`, `receiptId`, `receiptNumber` | Redact direct PII |
| `security.authorization_denied` | Capability check fails | `WARN` | `requestId`, `userId`, `instituteId`, `requiredCapability` | Standard security event format |
| `security.tenant_isolation_violation` | Cross-tenant access attempt | `ERROR` | `requestId`, `userId`, `targetResourceId`, `attemptedTenant` | Mandatory correlation tracing |

---

# 13. Unresolved Risks & Scope Boundaries

1. **Object Storage Boundary**: PDF receipt file generation and signed Object Storage download URLs remain outside Phase 3 scope (`downloadUrl: null`).
2. **Tuple Idempotency Scope**: Tuple idempotency identifies retries based on `(invoiceId, amount, paymentMode, receivedOn)`. Different payment modes recorded on the same day for the exact same amount require distinct transaction notes or timestamp variations.
3. **External Payment Gateway Integration**: Razorpay/Stripe webhooks and automatic gateway reconciliation are out of scope for Phase 3 (Phase 3 handles manual/assisted staff payment recording).

---

# 14. Phase 3.7 Execution Plan & Next Steps

Phase 3.7 will proceed in two distinct subphases:
- **Phase 3.7.0 (Current)**: Architecture, Threat Model, UX, and Acceptance Contract Freeze (🟢 **COMPLETED & FROZEN**).
- **Phase 3.7.1 (Next)**: Comprehensive Security, Adversarial, Concurrency, and E2E Test Suite Execution.

---

### Authoritative Sign-Off

```text
Phase 3.7.0 Security / UX / E2E Contract Freeze: ACCEPTED & FROZEN
Document Version: 1.0.0
Authoritative References: SRS, SDD, DADD, DATABASE_SCHEMA, Phase 3.0 - 3.6 Contracts
Prisma Schema Changes: ZERO (0)
Migrations Created: ZERO (0)
```
