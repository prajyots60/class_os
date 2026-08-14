# Phase 3.6.0 — Staff Billing Workspace UI Architecture & UX Contract Freeze

> **Authoritative Phase Contract**  
> **Status:** 🟢 **ACCEPTED & FROZEN**  
> **Milestone:** Phase 3 — Billing Module (Phase 3.6.0)  
> **Upstream Contracts:** [Phase 3.0 Billing Contract](file:///home/supra/Desktop/class_os/docs/phases/03/phase3-billing-contract.md), [Phase 3.2 Invoice Contract](file:///home/supra/Desktop/class_os/docs/phases/03/phase3.2-invoice-contract.md), [Phase 3.3 Payment Contract](file:///home/supra/Desktop/class_os/docs/phases/03/phase3.3-payment-contract.md), [Phase 3.4 Receipt Contract](file:///home/supra/Desktop/class_os/docs/phases/03/phase3.4-receipt-contract.md), [Phase 3.5 API Contract](file:///home/supra/Desktop/class_os/docs/phases/03/phase3.5-api-contract.md)

---

## 1. Purpose

This document establishes the authoritative **UI Architecture & UX Contract** for the Staff Billing Workspace in CoachingOS.

Billing is the primary financial domain of CoachingOS. Unlike standard CRUD admin pages, financial user interfaces require explicit architectural guardrails to prevent accidental mutations, present transparent financial math, enforce strict multi-tenant authorization, and faithfully communicate historical immutability.

This contract defines:
- Information architecture and navigation contract for top-level and contextual billing views.
- Component breakdown and layout specifications for Billing Plans, Invoices, Payments, and Receipts.
- Financial safety UX, dual-confirmation dialogs, and dynamic calculation preview rules.
- Permission-aware UI degradation mapped directly to backend capability invariants (`billing:read`, `billing:write`, `payment:record`, `receipt:read`, `receipt:issue`).
- Component boundaries (RSC vs Client Components) and `/api/v1` HTTP consumption model.
- Test matrix for Phase 3.6.1 UI implementation verification.

---

## 2. Authoritative Sources Inspected

1. **Master System Architecture & Requirements**:
   - [`docs/srs.md`](file:///home/supra/Desktop/class_os/docs/srs.md) — Multi-tenant coaching operations, fee management requirements.
   - [`docs/sdd.md`](file:///home/supra/Desktop/class_os/docs/sdd.md) — Modular monolith presentation & domain boundaries.
   - [`docs/dadd.md`](file:///home/supra/Desktop/class_os/docs/dadd.md) — Schema authority, Decimal types, financial status rules.
   - [`docs/DATABASE_SCHEMA.md`](file:///home/supra/Desktop/class_os/docs/DATABASE_SCHEMA.md) — Physical model specifications.
   - [`docs/ENGINEERING_PLAYBOOK.md`](file:///home/supra/Desktop/class_os/docs/ENGINEERING_PLAYBOOK.md) — Code quality, testing standards, token CSS guidelines.
   - [`docs/CONTEXT.md`](file:///home/supra/Desktop/class_os/docs/CONTEXT.md) — System progress tracker.
2. **Frozen Billing Phase Contracts**:
   - [`docs/phases/03/phase3-billing-contract.md`](file:///home/supra/Desktop/class_os/docs/phases/03/phase3-billing-contract.md) — Master Billing Architecture & Financial Model.
   - [`docs/phases/03/phase3.2-invoice-contract.md`](file:///home/supra/Desktop/class_os/docs/phases/03/phase3.2-invoice-contract.md) — Invoice Engine & Idempotency.
   - [`docs/phases/03/phase3.3-payment-contract.md`](file:///home/supra/Desktop/class_os/docs/phases/03/phase3.3-payment-contract.md) — Payment Engine & Ledger Recalculation.
   - [`docs/phases/03/phase3.4-receipt-contract.md`](file:///home/supra/Desktop/class_os/docs/phases/03/phase3.4-receipt-contract.md) — Receipt Engine & One-to-One Enforcement.
   - [`docs/phases/03/phase3.5-api-contract.md`](file:///home/supra/Desktop/class_os/docs/phases/03/phase3.5-api-contract.md) — Protected Billing HTTP API Specification.
3. **Existing UI Implementation & Design Language**:
   - `apps/web/src/features/app-shell/navigation/navigation-config.ts` — Navigation hierarchy and sidebar.
   - `apps/web/src/features/academic/` — Staff Academic Workspace pattern.
   - `apps/web/src/features/student/` — Student Workspace & details modal patterns.
   - `apps/web/src/features/enrollment/` — Enrollment lifecycle & status patterns.
   - `packages/ui/` — Semantic design tokens (`Button`, `Card`, `Badge`, `Input`, `Alert`).

---

## 3. Existing UI Architecture Discovered

The CoachingOS presentation layer follows strict architectural patterns:

- **Next.js 16 App Router Structure**:
  - `apps/web/src/app/(app)/(workspace)/` contains thin Server Component page wrappers (< 20 lines) that render feature modules.
  - Page routes render React Server Components (RSC) that serve as composition roots.
- **Feature Module Pattern**:
  - Located in `apps/web/src/features/<feature_name>/`.
  - Structured into `api/` (API fetch hooks/clients), `components/` (UI views, modals, cards, tables), and `types/`.
- **UI Design System**:
  - `@coaching-os/ui` provides token-driven primitive components (`Button`, `Badge`, `Card`, `Input`, `Alert`, `Separator`, `Skeleton`).
  - HSL-tailored CSS design tokens (`bg-background`, `text-foreground`, `bg-primary`, `border-border`, `ring-ring`, `rounded-md`) ensure multi-tenant brand isolation without inline hex values or hardcoded static colors.
- **Navigation & RBAC**:
  - Sidebar and mobile navigation defined centrally in `navigation-config.ts`.
  - Menu items gated by user capabilities via `capability` field (e.g., `billing:read`).

---

## 4. Core UI Principles & Financial Semantics

Billing UI represents actual money and legal obligations. The following principles govern all billing interfaces:

1. **CLARITY > Decoration**: Financial data must be clear, unambiguous, and tabular. Avoid decorative charts or vanity gauges that obscure raw numbers.
2. **SAFETY > Speed**: Financial mutations (Recording Payments, Creating Plans) require two-stage confirmation. No single-click irreversible actions.
3. **READABILITY > Density**: High-contrast typography, explicit currency symbols (`₹`), and distinct status indicators.
4. **CONFIRMATION > Accidental Mutation**: Destructive or irreversible financial actions require explicit review dialogs detailing amounts before submission.
5. **IMMUTABILITY > Convenience**: The UI explicitly communicates that historical financial records (Invoices, Payments, Receipts) cannot be edited or deleted. No `Edit` or `Delete` controls exist for financial ledgers.
6. **Financial Entity Hierarchy**:
   ```text
   Enrollment
      ↓
   BillingPlan   (Rules: feeType, totalAmount, billingStartDate)
      ↓
   Invoice       (Historical snapshot: amount, dueDate, status)
      ↓
   Payment       (Money received: amount, paymentMode, receivedOn)
      ↓
   Receipt       (Proof of payment: receiptNumber, generatedAt)
   ```

---

## 5. Persisted vs. Derived Financial Semantics

- **Invoice Persisted Statuses**:
  - `pending`: No payments recorded yet against the invoice.
  - `partial`: At least one payment recorded, but `outstanding > 0`.
  - `paid`: Total recorded payments equal or exceed `amount` (`outstanding === 0`).
- **Derived Visual Indicator — `Overdue`**:
  - Computed on client/server presentation: `dueDate < current_date` AND `status !== 'paid'`.
  - Displayed as a red warning badge (`Overdue`) next to the status.
  - **Invariant**: The UI NEVER implies `overdue` is a writable state or selectable filter value that mutates the database.

- **Financial Value Formatting (R-UI-002)**:
  - All currency values formatted using standard Indian Rupee notation: `Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })`.
  - Examples: `₹10,000.00`, `₹3,333.34`, `₹0.00`.
  - Floating-point calculations are forbidden; inputs and calculations use numeric string parsing or rounded Decimal numbers from API DTOs.

---

## 6. Staff Billing Information Architecture & Routing

### 6.1 Top-Level Staff Billing Workspace (`/billing`)
The primary navigation menu under **Finance** contains **Fees & Billing** (`/billing`), gated by `billing:read`.

Top-Level Route Structure:
```text
/billing
  ├── (Overview tab)      → Financial summary, recent invoices & overdue collections
  ├── ?tab=plans          → All Billing Plans (filterable by enrollment/student)
  ├── ?tab=invoices       → All Invoices (filterable by status, overdue, student)
  ├── ?tab=payments       → All Payments (filterable by mode, date range)
  └── ?tab=receipts       → All Receipts (filterable by receipt number, date)
```

### 6.2 Contextual Enrollment & Student Integration
Billing belongs directly to an `Enrollment` (which links a `Student` to a `Batch`).
- **Student Details View** (`/students` -> Student Details Modal): Includes a **Billing & Fees** tab listing all enrollments for that student and their associated billing plans, invoices, and payment history.
- **Enrollment Details View** (`/enrollments` -> Enrollment Details Modal): Includes a dedicated **Fee Management** tab displaying the active `BillingPlan`, generated `Invoices`, and recorded `Payments`.

---

## 7. Detailed Workspace Component Specifications

### 7.1 Billing Overview Tab
- **Metrics Summary Cards**:
  - `Total Outstanding`: Sum of computed `outstanding` across active invoices.
  - `Pending Collection`: Count & total amount of `pending` invoices.
  - `Overdue Invoices`: Count & total amount of overdue invoices.
  - `Payments Collected (This Month)`: Total amount of payments recorded in current calendar month.
- **Action Quick Links**: "Create Billing Plan", "Generate Invoices", "Record Payment".
- **Recent Activity Table**: Dual-feed showing latest recorded payments and recently generated invoices.

### 7.2 Billing Plans Workspace
- **List View**: Displays `BillingPlan` records with columns: `Student Name`, `Program / Batch`, `Fee Type` (`monthly`, `one_time`, `installment`), `Total Amount`, `Billing Start Date`, `Installments`, `Actions`.
- **Create Billing Plan Modal (`BillingPlanFormModal`)**:
  - Select Enrollment (dropdown of active enrollments without existing plan).
  - Select `Fee Type` (`monthly`, `one_time`, `installment`).
  - Input `Total Amount` (`₹`).
  - Input `Billing Start Date`.
  - If `installment`: Input `Installment Count` (min 2) and optional `First Invoice Amount Override`.
  - If discount: Select `Discount Type` (`percentage`, `fixed`) and `Discount Value`.
  - Dynamic Calculation Preview: Displays calculated installment schedule preview before saving.
- **Update Billing Plan Modal (`BillingPlanUpdateModal`)**:
  - Allows updating discount or first invoice override per Phase 3.1 rules.
  - Clearly states: *"Updating billing plan rules will apply to future invoice generations. Historical generated invoices remain unchanged."*

### 7.3 Invoice Workspace
- **Filter Controls**:
  - Search by Student Name / Invoice Number.
  - Filter by `Status` (`All`, `Pending`, `Partial`, `Paid`).
  - Filter by `Overdue Only` (boolean toggle).
- **Invoice Table Columns**: `Invoice Number`, `Student Name`, `Batch`, `Billing Period / Installment`, `Due Date`, `Amount`, `Paid Amount`, `Outstanding`, `Status / Overdue`, `Actions`.
- **Invoice Detail Modal (`InvoiceDetailsModal`)**:
  - Header: Invoice Number, Student Info, Due Date, Status Badge, Overdue Badge.
  - Summary Card: Total Amount, Total Paid, Remaining Outstanding.
  - Associated Billing Plan reference.
  - Recorded Payments list (table of payments against this invoice).
  - Actions: "Record Payment" (if `outstanding > 0` and user has `payment:record`), "Generate Receipt" (for existing payments).
- **Generate Invoices Modal (`GenerateInvoiceModal`)**:
  - Select Billing Plan & Target Billing Period / Due Date.
  - Trigger `POST /api/v1/invoices`.

### 7.4 Payment Recording & Payment Workspace

#### Payment Recording UX & Dynamic Calculation Preview (R-UI-004)
Payment recording is triggered via the "Record Payment" action from an Invoice detail or Billing view.

The `RecordPaymentModal` MUST render an explicit **Financial Summary Box**:
```text
┌─────────────────────────────────────────────────────────────┐
│ Invoice #INV-2026-00042 Financial Breakdown                 │
├─────────────────────────────────────────────────────────────┤
│ Invoice Amount:            ₹10,000.00                        │
│ Previously Paid:           ₹3,000.00                        │
│ Current Outstanding:       ₹7,000.00                        │
├─────────────────────────────────────────────────────────────┤
│ Payment Amount:           [ ₹2,000.00 ] (User Input)        │
│ Payment Mode:             [ UPI / Cash / Bank Transfer ]    │
│ Received On:              [ 2026-08-14 ]                    │
│ Collected By:             Staff User (Session)              │
│ Remarks:                  [ Optional notes... ]             │
├─────────────────────────────────────────────────────────────┤
│ Remaining Balance After:   ₹5,000.00 (Dynamic Preview)      │
└─────────────────────────────────────────────────────────────┘
```

#### Dual Confirmation & Overpayment Safety
- **Validation**:
  - `Payment Amount` must be $> 0$.
  - `Payment Amount` must NOT exceed `Current Outstanding` (Client-side validation blocks submission with error: *"Payment amount cannot exceed current outstanding balance of ₹7,000.00"*).
- **Confirmation Step**: Clicking "Proceed to Record" opens a confirmation alert:
  - *"Are you sure you want to record a payment of ₹2,000.00 via UPI for Invoice #INV-2026-00042? This transaction is permanent and cannot be undone."*
- **Concurrency Conflict Handling**: If another staff member recorded a payment concurrently, causing a backend `409 Conflict` or `400 Bad Request` overpayment error:
  - Display alert: *"Financial Conflict: The outstanding balance on this invoice has changed. Please refresh and review the updated balance before retrying."*
  - Do NOT automatically retry payment.

#### Payment List & Immutability
- Displays all recorded payments across the institute.
- Columns: `Payment ID`, `Invoice Number`, `Student Name`, `Amount`, `Payment Mode`, `Received Date`, `Collected By`, `Receipt Status`.
- **Immutability Invariant**: Payment records have **NO Edit**, **NO Delete**, and **NO Void** controls.

### 7.5 Receipt Workspace & PDF Boundary (R-UI-005)
- **Receipt List & Details (`ReceiptDetailsModal`)**:
  - Displays `Receipt Number` (`REC-YYYY-XXXXX`), `Payment ID`, `Invoice ID`, `Student Name`, `Amount`, `Payment Mode`, `Generated At`.
  - Immutability: Receipts cannot be edited or deleted. Retrying receipt generation for an already-receipted payment returns the existing receipt idempotently.
- **PDF Storage Boundary**:
  - Per Phase 3.4.1 contract, PDF generation workers and object storage are outside Phase 3 scope (`downloadUrl: null`).
  - The UI displays a disabled "Download PDF" button with tooltip: *"PDF receipt generation and object storage will be enabled in a future update. Official receipt number is issued above."*

---

## 8. Permission-Aware UI Matrix

UI action visibility degrades gracefully based on authenticated user capabilities:

| Action / UI Component | Required Capability | Behavior when Lacking Capability |
| :--- | :--- | :--- |
| Access Fees & Billing Workspace | `billing:read` | Navigation item hidden in sidebar. Direct route access redirects to `/dashboard` with 403 Toast. |
| View Billing Plans, Invoices, Payments, Receipts | `billing:read` | Content rendered normally. |
| Create / Update Billing Plan | `billing:write` | "Create Billing Plan" & "Update Plan" buttons hidden / disabled. |
| Generate Invoice | `billing:write` | "Generate Invoice" button hidden / disabled. |
| Record Payment | `payment:record` | "Record Payment" button hidden on Invoice views. Direct modal trigger prevented. |
| View Receipt Details | `receipt:read` | "View Receipt" button hidden / disabled. |
| Issue Receipt | `receipt:issue` | "Issue Receipt" button hidden on Payment views. |

---

## 9. Responsive & Accessibility Specifications

### 9.1 Responsive Design
- **Desktop (≥ 1024px)**: Full multi-column data tables, side-by-side financial metrics, inline filter controls.
- **Tablet (768px – 1023px)**: Scrollable data tables with sticky action columns, stacked metrics cards.
- **Mobile (< 768px)**:
  - Tab navigation collapses into a full-width select dropdown or scrollable tab bar.
  - Data tables transform into stacked **Financial Cards** showing Invoice Number, Student, Amount, Due Date, Status Badge, and Primary Action.
  - Payment recording modal opens full-screen (`h-full w-full rounded-none`).

### 9.2 Accessibility (a11y)
- **Keyboard Navigation**: All tab triggers, table row actions, dropdown filters, and modal controls accessible via `Tab`, `Enter`, and `Space`.
- **Modal Dialogs**: Built with ARIA role `dialog`, aria-labelledby, aria-describedby, and focus trap. Closing via `Escape` key.
- **Color & Contrast**: Status badges (`Paid` green, `Partial` amber, `Pending` slate, `Overdue` red) rely on explicit text labels and icons, not color alone. Minimum contrast ratio 4.5:1.
- **Screen Reader Formats**: Financial numbers include `aria-label="10000 Rupees"` alongside formatted string `₹10,000.00`.

---

## 10. Server vs. Client Component Boundaries & API Consumption

- **Route Page Boundary (`apps/web/src/app/(app)/(workspace)/billing/page.tsx`)**:
  - React Server Component (RSC) wrapper (< 20 lines).
  - Protected by layout session verification.
  - Renders `<BillingWorkspace />` client feature root.
- **Client Feature Shell (`apps/web/src/features/billing/components/BillingWorkspace.tsx`)**:
  - Client Component (`'use client'`).
  - Manages active tab state (`overview`, `plans`, `invoices`, `payments`, `receipts`), query parameters, filters, modal open states, and toast notifications.
- **API Consumption Model**:
  - Consumes protected `/api/v1` HTTP endpoints strictly using `v1ApiClient` or dedicated hooks in `src/features/billing/api/`.
  - **ZERO Direct Prisma Imports**: UI code NEVER imports `PrismaClient` or `@coaching-os/database`.
- **Caching & Revalidation**:
  - Uses React Query / SWR / Client state revalidation upon successful mutations (`POST /api/v1/payments`, `POST /api/v1/billing-plans`, `POST /api/v1/receipts`).

---

## 11. Source Reconciliations (R-UI Rules)

- **R-UI-001 (Navigation Location)**:
  - *Conflict*: Top-level vs Contextual Billing.
  - *Resolution*: Both top-level `/billing` (for institute-wide financial management) and contextual tabs within `/enrollments` and `/students` details modals.
- **R-UI-002 (Currency Formatting)**:
  - *Resolution*: Enforce `Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })` across all financial components. No raw floats.
- **R-UI-003 (Overdue Handling)**:
  - *Resolution*: Derived visual badge only (`dueDate < today` && `status !== paid`). No persisted overdue status.
- **R-UI-004 (Payment Confirmation & Overpayment Safety)**:
  - *Resolution*: Mandatory 2-step modal with live dynamic balance math preview and overpayment validation.
- **R-UI-005 (Receipt PDF Download)**:
  - *Resolution*: Display receipt number and details; disable PDF download button with explanatory tooltip (`downloadUrl: null`).

---

## 12. Explicit Non-Goals (Out of Scope for Phase 3.6)

The following items are explicitly **out of scope** for Phase 3.6:
- Production PDF rendering, PDF workers, or object storage signed URLs.
- Online payment gateway integration (Stripe, Razorpay, UPI QR codes).
- Voiding or editing recorded payments or receipts.
- Direct Prisma queries inside presentation components.
- Automated email or WhatsApp receipt dispatch (belongs to Phase 4 Communication Module).

---

## 13. Phase 3.6.1 UI Verification & Acceptance Matrix

When Phase 3.6.1 implementation is complete, the following test matrix must pass:

| Test ID | Test Category | Scenario / Assertion | Expected Result |
| :--- | :--- | :--- | :--- |
| **TEST-UI-001** | Navigation | Staff with `billing:read` accesses `/billing`. | Page loads with Overview, Plans, Invoices, Payments, Receipts tabs. |
| **TEST-UI-002** | RBAC | Staff without `billing:read` accesses `/billing`. | Sidebar link hidden; direct URL redirects to `/dashboard` with 403 notice. |
| **TEST-UI-003** | RBAC Actions | Staff without `payment:record` views Invoice Detail. | "Record Payment" button is hidden. |
| **TEST-UI-004** | BillingPlan Form | Staff creates Billing Plan with total `₹12,000` & 3 installments. | Dynamic preview shows 3 installments of `₹4,000`. Successful submission updates table. |
| **TEST-UI-005** | Invoice Filters | Filter Invoices by status `partial` and `overdue: true`. | Table filters correctly; overdue badge rendered in red. |
| **TEST-UI-006** | Record Payment | Record `₹2,000` payment against `₹5,000` outstanding invoice. | Summary preview displays `Remaining Balance: ₹3,000`. Confirmation modal records payment, updates status to `partial`. |
| **TEST-UI-007** | Overpayment Guard | Input `₹6,000` payment against `₹5,000` outstanding invoice. | Form validation blocks submit with error: *"Payment amount cannot exceed current outstanding balance"*. |
| **TEST-UI-008** | Concurrency Error | Record payment after invoice was paid concurrently. | Displays 409 Conflict alert; refreshes invoice state without auto-retry. |
| **TEST-UI-009** | Receipt Issuance | Staff issues receipt for recorded payment. | Generates receipt number (e.g. `REC-2026-00001`); retrying returns same receipt idempotently. |
| **TEST-UI-010** | Immutability | View Payment or Receipt detail modal. | No "Edit" or "Delete" buttons present anywhere in DOM. |
| **TEST-UI-011** | Responsive Card | Resize browser to 375px width (Mobile). | Data tables transform into accessible stacked cards; forms fit full-screen without horizontal overflow. |
| **TEST-UI-012** | Accessibility | Navigate entire payment recording flow using Keyboard only. | Focus indicator visible at all times; `Escape` closes modals; screen reader announces error states. |

---

## 14. Contract Freeze Certification

Phase 3.6.0 — Staff Billing Workspace UI Architecture & UX Contract is hereby **ACCEPTED & FROZEN**. No production UI code will be implemented until authorized in Phase 3.6.1.
