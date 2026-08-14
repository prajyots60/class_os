# PHASE 3.4 — RECEIPT ENGINE ARCHITECTURE & DOMAIN CONTRACT

**CoachingOS — Contract Freeze v1.0**

**Status: 🟢 ACCEPTED & FROZEN**

This document establishes the authoritative architecture, domain models, business invariants, receipt numbering strategy, snapshot semantics, PDF artifact boundary, concurrency strategy, idempotency rules, tenant security, and domain events for **Phase 3.4 — Receipt Engine** of CoachingOS.

Phase 3.0 (Billing Architecture), Phase 3.1 (BillingPlan Domain), Phase 3.2 (Invoice Engine), and Phase 3.3 (Payment Engine) are **COMPLETED & FROZEN**. Phase 3.4 freezes how `Receipt` records are created, numbered, linked to `Payment` instances, and rendered prior to Phase 3.4.1 implementation.

---

# 1. Architectural Position & Objective

The Receipt Engine resides in `@coaching-os/billing` under `packages/billing/`:

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
    │
    ▼
PDF Artifact (Asynchronous Object Storage Generation — Phase 3.4)
```

### Core Objective

The Receipt Engine answers:

> **How is proof of payment generated, numbered, bound to tenant context, rendered, and stored as an immutable historical record following a recorded Payment?**

---

# 2. Terminology Freeze

| Concept | Canonical Name | Database Model | UI / User Label |
|---|---|---|---|
| Payment Request | `Invoice` | `invoices` | Invoice |
| Received Money | `Payment` | `payments` | Payment |
| Proof of Payment | `Receipt` | `receipts` | Receipt |
| Printable File | `PDF Artifact` | S3 / GCS Storage | Downloadable Receipt PDF |

### Key Architectural Invariants
1. **Receipt is Proof of Payment**: A `Receipt` represents historical proof that a specific `Payment` was recorded. It is NOT an invoice, payment request, ledger, or credit note.
2. **`Payment 1 ──► 1 Receipt`**: Each `Payment` record produces exactly ONE `Receipt` (`Receipt.paymentId` is `UNIQUE`). If an `Invoice` has 3 payments, 3 distinct receipts are issued.
3. **No Aggregate Receipts**: Receipts are issued per `Payment`, never aggregated across multiple payments or invoices.

---

# 3. Canonical Receipt Entity Model

The `Receipt` model is governed strictly by `infrastructure/database/prisma/schema.prisma` without schema drift or migrations.

```prisma
model Receipt {
  id            String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  instituteId   String   @map("institute_id") @db.Uuid
  paymentId     String   @unique @map("payment_id") @db.Uuid
  receiptNumber String   @map("receipt_number") @db.VarChar(100)
  generatedAt   DateTime @default(now()) @map("generated_at")

  institute Institute @relation(fields: [instituteId], references: [id], onDelete: Cascade)
  payment   Payment   @relation(fields: [paymentId], references: [id], onDelete: Cascade)

  @@index([instituteId])
  @@map("receipts")
}
```

### Schema Constraints & Boundaries
- **Direct `instituteId` Ownership**: `Receipt` directly contains `instituteId` for tenant scoping.
- **Unique `paymentId` Constraint**: Enforces strictly one receipt per payment (`@@unique([paymentId])`).
- **Zero Schema Migrations**: Zero columns added or removed.

---

# 4. Business Invariants & Rules

### RCT-001 — One Receipt Per Payment (1:1 Relationship)
- Every `Payment` record MUST produce at most one `Receipt`.
- Attempting to generate a receipt for a `Payment` that already has a `Receipt` is **IDEMPOTENT** and returns the existing `Receipt` record without duplicate database creation or number incrementation.

### RCT-002 — Tenant Scoping & Ownership Consistency
- `Receipt.instituteId` MUST match the `instituteId` of the target `Payment`'s underlying `Invoice ──► BillingPlan ──► Enrollment ──► Institute` chain.
- Cross-tenant receipt generation or lookup attempts throw `NotFoundError` (404) to prevent resource enumeration.

### RCT-003 — Immutability of Issued Receipts (R-020)
- Once issued, all `Receipt` fields (`id`, `instituteId`, `paymentId`, `receiptNumber`, `generatedAt`) are **100% IMMUTABLE**.
- No `update()`, `PATCH`, or edit operations exist on `Receipt`.

### RCT-004 — Prohibition of Physical Deletion (R-020)
- Receipts are legal and financial audit trail records. Application-level deletion (`DELETE /receipts/:id`) and soft-deletion are **FORBIDDEN**.
- `ReceiptRepository` MUST NOT expose a `delete()` method. Prisma `onDelete: Cascade` remains strictly for test fixture cleanup (`cleanTestDatabase()`).

---

# 5. Source Reconciliation Register

### R-016 — Receipt Numbering Strategy & Concurrency
- **Source Conflict / Tension**: DADD specifies institute-scoped sequential numbers (`receipt_number`), while SRS notes numbering strategy was deferred.
- **Resolution**:
  - **Format**: `REC-{YYYY}-{SEQ:5}` (e.g. `REC-2026-00001`).
  - **Scope**: Institute-scoped (`instituteId`).
  - **Sequence Allocation**: Number allocation executes inside an atomic database transaction. If two concurrent payment recordings occur for Institute A, row locking or sequential count inside transaction guarantees unique, non-colliding numbers (`REC-2026-00001` and `REC-2026-00002`).
  - **Gaps**: Gaps resulting from rolled-back transactions are permitted to ensure non-blocking high availability. Gapless accounting is deferred to enterprise ledger extensions.

### R-017 — Snapshot vs Dynamic Presentation Resolution
- **Source Conflict / Tension**: SRS requires receipt output to display Student Name, Amount, Payment Mode, Date, and Institute Branding, but `Receipt` table stores only `id`, `instituteId`, `paymentId`, `receiptNumber`, `generatedAt`.
- **Resolution**:
  - `Payment` fields (`amount`, `paymentMode`, `receivedOn`, `collectedBy`) are **100% IMMUTABLE** (frozen in Phase 3.3).
  - Domain presentation resolves Payment details dynamically from the immutable `Payment ──► Invoice ──► Enrollment ──► Student` graph.
  - Institute Branding (logo, name, contact, theme colors) is snapshotted at PDF rendering time and compiled into the stored PDF artifact in Object Storage.

### R-018 — Receipt Record Creation vs Asynchronous PDF Generation
- **Source Conflict / Tension**: SDD mandates asynchronous PDF generation, while business operations require fast payment recording.
- **Resolution**:
  - **Step 1 (Sync/Event-Driven)**: `GenerateReceiptUseCase` creates `Receipt` DB row (`id`, `instituteId`, `paymentId`, `receiptNumber`, `generatedAt`) and emits `billing.receipt.generated`.
  - **Step 2 (Async Background Worker)**: Worker consumes `billing.receipt.generated`, renders HTML template, compiles PDF, uploads to Object Storage (`S3`/`GCS`), and stores storage path.
  - **Failure Isolation**: A PDF compilation or storage upload failure MUST NEVER rollback the recorded `Payment` or `Receipt` DB record. PDF generation can be retried safely.

### R-019 — Receipt Idempotency Strategy
- **Conflict**: Duplicate calls to generate receipt for the same payment.
- **Resolution**: `GenerateReceiptUseCase` performs lookup by `paymentId`. If found, returns existing `ReceiptDTO`. `Receipt.paymentId` `UNIQUE` constraint acts as database safety barrier.

### R-020 — Immutability & Deletion Policy
- **Resolution**: `Receipt` records are 100% immutable. No `PATCH` endpoints. No `delete()` methods in domain/application repository.

### R-021 — Tenant Isolation & Security Boundary
- **Resolution**: `Receipt` is directly scoped by `instituteId`. All queries enforce `where: { id, instituteId: ctx.instituteId }`.

### R-022 — Domain Event Architecture
- **Resolution**: Emits `billing.receipt.generated` post-commit with payload `{ receiptId, instituteId, paymentId, receiptNumber, amount, paymentMode, generatedAt }`.

---

# 6. PDF Generation & Object Storage Boundary

```text
Receipt Entity (DB Row)
        │
        ▼
billing.receipt.generated Event
        │
        ▼
Asynchronous PDF Worker (Background)
        │
        ├── Render HTML (Template + Payment Data + Branding)
        ├── Compile PDF (Puppeteer / Chromium / PDFKit)
        └── Upload to Object Storage (S3 / GCS)
                │
                ▼
      Signed Download URL (15-min expiration)
```

### PDF Artifact Invariants
1. **No Public Bucket URLs**: PDF files in S3/GCS MUST NOT be publicly accessible. Downloads require short-lived signed URLs (15-minute expiration) generated by server API.
2. **Asynchronous Retry**: If PDF generation fails (e.g. network timeout to GCS), the worker retries idempotently without mutating `Receipt` DB record or `receiptNumber`.

---

# 7. Tenant Isolation & Security Boundaries

### Security Invariants
1. **Server-Authoritative Context**: `ctx.instituteId` derived exclusively from DB-verified session (`resolveV1TenantContext()`). Client inputs for tenant identity are rejected.
2. **Repository Tenant Scoping**: All Prisma queries for `Receipt` MUST filter by `instituteId: ctx.instituteId`.
3. **Cross-Tenant Masking**: Accessing a `Receipt` belonging to another institute MUST return `NotFoundError` (404).

---

# 8. Capability & RBAC Registry

| Operation | Capability Required | Resource | Action |
|---|---|---|---|
| View / Download Receipt | `CAPABILITIES.RECEIPT_READ` (`receipt:read` or `billing:read`) | `receipt` | `read` |
| Generate / Issue Receipt | `CAPABILITIES.RECEIPT_ISSUE` (`receipt:issue` or `billing:write`) | `receipt` | `create` |

No custom role systems allowed. Permissions map strictly to capabilities.

---

# 9. Domain Event: `ReceiptGenerated`

- **Topic/Name**: `billing.receipt.generated`
- **Payload**:
  ```ts
  {
    receiptId: string;
    instituteId: string;
    paymentId: string;
    receiptNumber: string;
    amount: number;
    paymentMode: 'cash' | 'upi' | 'bank_transfer';
    generatedAt: string;
  }
  ```
- Emitted **only after successful DB transaction commit** of `Receipt` record.

---

# 10. Shared Error Taxonomy

| Error Situation | Exception Class | HTTP Status |
|---|---|---|
| Receipt not found in tenant | `NotFoundError` | 404 |
| Payment not found in tenant | `NotFoundError` | 404 |
| Cross-tenant Receipt access | `NotFoundError` | 404 |
| Insufficient RBAC capability | `AuthorizationError` | 403 |
| Duplicate Receipt constraint violation | `ConflictError` | 409 |

---

# 11. Phase 3.4.1 Acceptance Matrix

In Phase 3.4.1, implementation will be verified against:
1. **Unit Tests**:
   - `ReceiptEntity` creation, mandatory fields, immutability.
   - `GenerateReceiptUseCase` idempotency (1 Payment = 1 Receipt).
   - Receipt number format generation (`REC-YYYY-SEQ`).
2. **Integration Tests (`PrismaReceiptRepository`)**:
   - PostgreSQL multi-tenant isolation (Institute A cannot read/generate Institute B receipts).
   - PostgreSQL `paymentId` UNIQUE constraint enforcement.
   - Real PostgreSQL concurrent receipt generation locking test.
3. **Monorepo Quality Gate**:
   - `pnpm env:check && pnpm db:validate && pnpm db:health && pnpm typecheck && pnpm lint && pnpm test && pnpm build`.

---

# 12. Final Freeze Status

### 🟢 PHASE 3.4.0 — ACCEPTED & FROZEN

```text
Receipt Domain Model          🟢 FROZEN
Payment 1:1 Relationship      🟢 FROZEN
Receipt Numbering Strategy    🟢 FROZEN
Snapshot vs Dynamic Rules     🟢 FROZEN
PDF & Object Storage Boundary 🟢 FROZEN
Immutability & Deletion Policy🟢 FROZEN
Tenant Isolation & RBAC       🟢 FROZEN
Domain Event Contract         🟢 FROZEN
Schema Stability (0 drift)    🟢 FROZEN
```
