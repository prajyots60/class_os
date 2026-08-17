# 📜 Phase 6.0 — Staff Dashboard & UX Architecture Contract

> **Authoritative Phase 6 Contract & Architecture Freeze Document**  
> **Status:** 🟢 ACCEPTED & FROZEN  
> **Milestone:** Phase 6 — Staff Dashboard & UX Polish  
> **Type:** Architecture + Product + UX Contract Freeze  
> **Implementation:** ❌ Not part of Phase 6.0  
> **Schema changes:** ❌ None (`Schema changes: 0`, `Migrations: 0`)  
> **Updated:** August 17, 2026

---

## 1. Executive Summary & Objective

Phase 6.0 establishes the **authoritative architecture, information hierarchy, UX behavior, role boundaries, data ownership, and acceptance criteria** for the Staff Dashboard & UX layer of CoachingOS.

### Core Objective

> **Turn the existing CoachingOS operational system into a role-tailored daily workspace where staff can immediately understand what requires attention and navigate directly to the appropriate existing workflow.**

Phase 6 is strictly a **Read / Discover / Navigate / Act** presentation and operational orchestration layer over the already implemented and frozen domain modules:

- `Identity` (Phase 1)
- `Academics` (Phase 2)
- `Billing` (Phase 3)
- `Communication` (Phase 4)
- `Parent PWA` (Phase 5)

Phase 6 **does NOT introduce any new business domain**, database schema changes, background analytics pipelines, or external infrastructure (Redis, Elasticsearch, Sentry, Trigger.dev).

---

## 2. Frozen Architectural Invariants

### 2.1 Monorepo & Layer Boundaries
CoachingOS remains a **Modular Monolith** inside a pnpm + Turborepo workspace.
The architectural dependency direction remains strictly:

$$\text{Presentation (web)} \longrightarrow \text{Application / Use Cases} \longrightarrow \text{Domain Entities} \longleftarrow \text{Infrastructure Adapters}$$

- **Zero Domain Pollution:** Dashboard components and read orchestration MUST NOT import Prisma Client, HTTP request/response objects, or framework code into `domain/`.
- **Zero Business Logic in UI:** React components MUST NOT perform fee calculations, attendance ratios, role permission evaluation, or state transition validations.
- **Repository Isolation:** Repositories return domain entities, never raw Prisma models. Dashboard read orchestration composes existing application DTOs and domain queries.

### 2.2 Multi-Tenant Security & Context Invariants
- **Server-Authoritative Context:** All tenant and user authorization MUST be resolved server-side via `requireAuthSession()` and `resolveServerTenantContext()`.
- **No Client Parameter Trust:** `instituteId`, `role`, `userId`, or membership parameters supplied in query strings, headers, or request bodies MUST NEVER be trusted for authorization.
- **Universal Cross-Tenant Masking:** Cross-tenant searches, reports, or data queries for resources outside the user's institute membership MUST return `404 NOT_FOUND` or empty result sets to prevent resource enumeration attacks.

---

## 3. Agreed Product & UX Contract Decisions

The following 6 product and UX decisions are explicitly settled and frozen for Phase 6:

### 1. Founder / Owner Dashboard "Today's Attendance" Metric
- **Definition:** Displays `Taken / Total Sessions Today` completion ratio alongside `Present Count / Total Eligible Students` and overall percentage.
- **Click Behavior:** Clicking the attendance card navigates directly to `/academics` (Attendance tab).

### 2. Teacher Dashboard "Today's Batches" Scope
- **Definition:** Filtered strictly by today's calendar date (`today` in institute local timezone) for generated `BatchSession` records where the logged-in teacher is assigned.
- **Attributes:** Shows start/end time, subject name, batch name, classroom, and attendance completion badge (`Pending` / `Taken`).

### 3. Assistant Dashboard Fee Metric
- **Definition:** Displays `Today's Collection Amount (₹)` (sum of payments received today), `Total Transactions Count`, and `Unissued / Pending Receipts Count`.
- **Quick Action:** Includes a primary "Record Payment" quick action button opening the `/billing` payment workflow.

### 4. Global Search Click Behavior
- **Definition:** Direct Navigation to target resource workspace with pre-filtered query state:
  - Student result $\rightarrow$ `/students?search=Name`
  - Batch result $\rightarrow$ `/academics?batchId=Id`
  - Invoice result $\rightarrow$ `/billing?invoiceId=Id`

### 5. Operational Reporting Export Scope
- **Definition:** On-Screen Interactive Reports Only (MVP scope). Includes rich filterable data tables, summary cards, and visual indicators. File export (CSV/Excel) is deferred to future Beta Readiness phases.

### 6. Advanced Settings UX Boundary
- **Definition:** Refines existing settings UI into clear tabbed sections (`Institute Details`, `White-label Branding` for logos/colors/fonts, `Academic Defaults`). Introduces ZERO new database fields or unapproved configuration concepts.

---

## 4. Role-Tailored Dashboard Information Architecture

### 4.1 Founder / Owner Dashboard (`/dashboard` for `owner` role)

```text
┌────────────────────────────────────────────────────────────────────────┐
│ Good Morning, Founder                                                  │
│ Apex Academy • Mumbai (IST)                                            │
├────────────────────────────────────────┬───────────────────────────────┤
│ ATTENTION                              │ QUICK ACTIONS                 │
│ Pending Fees: ₹1,45,000 (12 Invoices)  │ [+ Add Student]  [Record Fee] │
│ Overdue: 4 Students                    │ [Take Attendance] [New Test] │
├────────────────────────────────────────┴───────────────────────────────┤
│ TODAY'S OPERATIONAL SUMMARY                                            │
│ Attendance: 3 / 4 Sessions Completed (92% Present)                    │
│ Scheduled Classes: 4 Sessions Today                                    │
│ Scheduled Tests: 1 Assessment Today (Physics Unit Test 2)              │
├────────────────────────────────────────────────────────────────────────┤
│ RECENT ANNOUNCEMENTS                                                   │
│ "Mid-Term Examination Schedule Announced" (Published Today)            │
└────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Teacher Dashboard (`/dashboard` for `teacher` role)

```text
┌────────────────────────────────────────────────────────────────────────┐
│ Today's Teaching Schedule                                              │
│ Teacher Workspace                                                      │
├────────────────────────────────────────────────────────────────────────┤
│ TODAY'S BATCH SESSIONS (4 Sessions)                                    │
│ • 04:00 PM - 05:30 PM | Class 12 Physics (Batch A) — [Take Attendance] │
│ • 05:45 PM - 07:00 PM | Class 11 Maths (Batch B)   — [Taken ✅]        │
├────────────────────────────────────────────────────────────────────────┤
│ ATTENTION / PENDING WORK                                               │
│ Pending Homework: 2 Batches without assigned homework this week        │
│ Upcoming Tests: Class 12 Physics Test (Tomorrow, Aug 18)               │
└────────────────────────────────────────────────────────────────────────┘
```

### 4.3 Assistant Dashboard (`/dashboard` for `assistant` role)

```text
┌────────────────────────────────────────────────────────────────────────┐
│ Today's Administrative Operations                                      │
│ Assistant Workspace                                                    │
├────────────────────────────────────────┬───────────────────────────────┤
│ TODAY'S COLLECTION                     │ QUICK ACTIONS                 │
│ Collected Today: ₹38,500 (5 Payments)  │ [Record Payment]              │
│ Pending Receipts: 2 Unissued           │ [New Student Admission]       │
├────────────────────────────────────────┴───────────────────────────────┤
│ TODAY'S ADMISSIONS                                                     │
│ New Students Admitted Today: 3                                         │
│ Pending Enrollments: 1 Student awaiting batch assignment               │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Global Search & Operational Table Contracts

### 5.1 Global Search Specification
- **Location:** Header search bar in authenticated App Shell (`apps/web/src/features/app-shell/`).
- **Target Resources:** Students (by name/admission number), Batches (by name/code), Invoices (by invoice number/student name).
- **Execution:** Server-side PostgreSQL text search query scoped strictly to active tenant `institute_id`.
- **Debounce & Boundary:** 300ms client debounce, minimum 2 characters required, max 10 results per category.

### 5.2 Operational Data Tables & Filtering
- **Presentation Technology:** TanStack Table (React Table v8) integrated with `@coaching-os/ui` design tokens.
- **Filtering Contract:** Server-applied multi-criteria filtering for protected datasets:
  - **Students Table:** Status (`active`, `inactive`), Batch, Admission Status (`admitted`, `pending`).
  - **Invoices Table:** Status (`pending`, `partial`, `paid`), Date range, Student ID.
  - **Sessions Table:** Date, Subject, Teacher ID, Attendance Status (`taken`, `pending`).

---

## 6. Phase 6 Execution Subphase Roadmap

```text
PHASE 6 — STAFF DASHBOARD & UX POLISH EXECUTION ROADMAP

6.0  Architecture & UX Contract Freeze                      🟢 ACCEPTED & FROZEN
 │
 ├── 6.1  Staff Dashboard Foundation & Read Orchestration  ⏳ NEXT ACTIVE TARGET
 │
 ├── 6.2  Founder / Owner Dashboard UI                       ⏳ UPCOMING
 │
 ├── 6.3  Teacher Dashboard UI                             ⏳ UPCOMING
 │
 ├── 6.4  Assistant Dashboard UI                           ⏳ UPCOMING
 │
 ├── 6.5  Global Search Implementation                     ⏳ UPCOMING
 │
 ├── 6.6  Operational Tables & Multi-Criteria Filtering    ⏳ UPCOMING
 │
 ├── 6.7  Operational Reports UI                           ⏳ UPCOMING
 │
 ├── 6.8  Advanced Settings UX Refinement                  ⏳ UPCOMING
 │
 ├── 6.9  UX / Accessibility / Security Matrix             ⏳ UPCOMING
 │
 └── 6.10 Phase 6 Final Acceptance Gate & Milestone Freeze ⏳ UPCOMING
```

---

## 7. Acceptance Criteria Checklist

- [x] Modular Monolith architecture and Clean Architecture boundaries preserved.
- [x] Zero database schema changes or migrations (`Schema changes: 0`, `Migrations: 0`).
- [x] Zero external infrastructure dependencies added (no Redis, Elasticsearch, BullMQ).
- [x] Role-specific dashboard specifications defined for Owner, Teacher, and Assistant.
- [x] Parent PWA explicitly isolated and kept frozen from Staff Dashboard.
- [x] Server-authoritative tenant scoping and capability RBAC enforced.
- [x] 6 core product/UX contract decisions frozen.
- [x] Monorepo quality gates passing clean.
