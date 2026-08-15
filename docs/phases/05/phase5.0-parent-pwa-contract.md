# Phase 5.0 — Parent PWA Architecture & Domain Contract

> **Status:** 🟢 **ACCEPTED & FROZEN**  
> **Milestone:** Phase 5.0 — Parent PWA Architecture & Domain Contract Freeze  
> **Date:** August 15, 2026  
> **Authoritative Specifications:**  
> - [`docs/SRS.md`](file:///home/supra/Desktop/class_os/docs/SRS.md)  
> - [`docs/SDD.md`](file:///home/supra/Desktop/class_os/docs/SDD.md)  
> - [`docs/DADD.md`](file:///home/supra/Desktop/class_os/docs/DADD.md)  
> - [`docs/adr/0001-two-layer-parent-identity.md`](file:///home/supra/Desktop/class_os/docs/adr/0001-two-layer-parent-identity.md)  
> - [`docs/phases/04/phase4.0-communication-contract.md`](file:///home/supra/Desktop/class_os/docs/phases/04/phase4.0-communication-contract.md)  

---

## 1. Executive Summary & Objective

Phase 5 introduces the **Parent PWA**: a mobile-first portal through which an authenticated parent can monitor their children across one or more coaching institutes within a single unified application.

The core objective of Phase 5 is:
> **A parent can log in once via phone + OTP and understand the academic, attendance, assessment, fee, and communication status of all linked children across all connected coaching institutes without contacting institute staff for routine information.**

Phase 5.0 establishes the authoritative architecture, security invariants, domain boundaries, API contracts, and UX models for the Parent PWA before implementation begins.

---

## 2. Architectural Position & Dependency Invariants

The Parent PWA is **not** a new business domain module for academics, billing, or communication. It is a **consumer presentation and application layer** over the existing domain engines established in Phases 1 through 4.

```text
                                  PARENT PWA
                                      │
                                      ▼
                           Parent Presentation Layer
                             (apps/web/src/features/parent)
                                      │
                                      ▼
                           Parent Application Layer
                            (Read Use Cases & DTOs)
                                      │
             ┌────────────────────────┼────────────────────────┐
             ▼                        ▼                        ▼
      Identity Domain          Academics Domain          Billing Domain
    (ParentIdentity, RBAC)   (Attendance, Homework,     (Invoices, Payments,
                                 Tests, Marks)               Receipts)
             │                        │                        │
             └────────────────────────┼────────────────────────┘
                                      ▼
                            Communication Domain
                          (Notifications, Activity,
                               Announcements)
                                      │
                                      ▼
                             PostgreSQL Database
```

### Dependency Invariant Rule
The Parent PWA consumes domain capabilities; it **never re-implements business logic** inside React components or client-side stores.
- ❌ **Forbidden**: React components calculate fee balances, attendance percentages, or marks averages.
- ✅ **Required**: Domain & application use cases compute values and return strongly-typed DTOs to presentation views.

---

## 3. Two-Layer Parent Model Baseline

The two-layer parent architecture defined in **ADR-0001** and [`docs/DADD.md`](file:///home/supra/Desktop/class_os/docs/DADD.md) remains strictly authoritative:

```text
                                PLATFORM LAYER
                               (Global Identity)
                                ParentIdentity
                                      │
                     ┌────────────────┴────────────────┐
                     ▼                                 ▼
               ChildProfile                   InstituteMembership
               (Parent-Owned)                   (Tenant Role)
                     │                                 │
                     ▼                                 ▼
                StudentLink                     InstituteParent
                (Join Link)                     (Tenant CRM)
                     │                                 │
                     └────────────────┬────────────────┘
                                      ▼
                               TENANT LAYER
                             Institute Student
```

### Platform Layer Definitions
- **`ParentIdentity`**: Globally unique identity anchored to a phone number. Serves as the single login for parents across all coaching institutes.
- **`ChildProfile`**: Parent-owned organizational profile (e.g., "Rahul", "Priya"). Contains parent-defined names and avatars.
- **`StudentLink`**: Global join table connecting a `ChildProfile` to an `Institute` `Student`.

### Tenant Layer Definitions
- **`InstituteParent`**: Institute-scoped CRM record representing the parent within a specific institute's system.
- **`InstituteParentStudent`**: Institute-scoped relationship mapping (`father`, `mother`, `guardian`) connecting `InstituteParent` to `Student`.

---

## 4. Resolution of Key Architectural Decisions

### Decision A — Parent API Authorization Semantics: Universal 404 Masking
To prevent resource enumeration, user tracking, and security scanning, all Parent REST APIs enforce **Universal 404 Masking** for unauthorized or unlinked resource queries:
- Attempting to access a student, invoice, receipt, attendance, mark, or activity record that does not belong to an established `ParentIdentity` $\rightarrow$ `ChildProfile` $\rightarrow$ `StudentLink` $\rightarrow$ `Student` relationship returns **HTTP 404 Not Found**.
- Stack traces, database errors, and explicit "403 Permission Denied for Student X" messages are strictly forbidden on public Parent APIs.

### Decision B — StudentLink Lifecycle: Hard Deletion of Join Links
- Unlinking a student from a `ChildProfile` performs an **immediate physical deletion** (`DELETE FROM student_links WHERE id = :id`) of the join table row.
- Unlinking a `StudentLink` removes the parent's PWA visibility into that student, but **does NOT delete or alter** the underlying institute-side `Student`, `InstituteParentStudent`, or `Enrollment` records.

### Decision C — Parent OTP & Authentication Strategy
- **Authentication Transport**: Phone number + 6-digit OTP verification via `ParentIdentity`.
- **OTP Lifecycle**: OTP requests are valid for 5 minutes; max 3 verification attempts before invalidation.
- **Rate Limiting**: Strictly 3 OTP requests per 15-minute window per phone number (`RateLimitError` HTTP 429).
- **Session Model**: Successful verification issues an HTTP-only, secure, samesite session cookie bound to `ParentIdentity.id`.
- **Dev/Test Provider**: In non-production environments (`NODE_ENV !== 'production'`), a deterministic mock OTP provider returns fixed OTP `123456` for automated test suites.

---

## 5. Parent Authorization Model & Security Pipeline

Parent access is strictly **relationship-based** and server-authoritative. Knowing a `studentId` or `invoiceId` provides zero authorization.

### Canonical Authorization Chain

```text
HTTP Request
     ↓
Authentication Guard (requireParentSession)
     ↓
ParentIdentity (Status must be 'active')
     ↓
ChildProfile (Must be owned by ParentIdentity)
     ↓
StudentLink (Must connect ChildProfile to Student)
     ↓
Tenant Institute Student Verification
     ↓
Target Resource (Attendance / Homework / Test / Invoice / Receipt / Activity)
     ↓
Authorized DTO Response
```

Every Parent API route handler MUST execute this full verification chain before returning data.

---

## 6. Parent Hub vs. Coaching Workspace API Specification

### 6.1 Parent Hub APIs (Platform-Global — `/api/v1/parent/*`)

| Endpoint | Method | Capabilities / Requirements | Description |
| :--- | :--- | :--- | :--- |
| `/api/v1/parent/auth/otp/request` | `POST` | Public / Rate Limited | Request 6-digit OTP for phone number |
| `/api/v1/parent/auth/otp/verify` | `POST` | Public | Verify OTP and establish parent session |
| `/api/v1/parent/auth/session` | `GET` | Authenticated Parent | Fetch active `ParentIdentity` session details |
| `/api/v1/parent/auth/logout` | `POST` | Authenticated Parent | Invalidate active parent session |
| `/api/v1/parent/hub` | `GET` | Authenticated Parent | Multi-institute parent hub summary (child profiles, connected institutes, unread alert counts) |
| `/api/v1/parent/profiles` | `GET` | Authenticated Parent | List all `ChildProfile` records owned by parent |
| `/api/v1/parent/profiles` | `POST` | Authenticated Parent | Create new `ChildProfile` (e.g. "Rahul") |
| `/api/v1/parent/profiles/{id}` | `PATCH` | Authenticated Parent | Update `ChildProfile` name or avatar |
| `/api/v1/parent/profiles/{id}/links` | `POST` | Authenticated Parent | Link a student to a `ChildProfile` |
| `/api/v1/parent/profiles/{id}/links/{linkId}` | `DELETE` | Authenticated Parent | Unlink student from `ChildProfile` (hard delete join row) |
| `/api/v1/parent/suggestions` | `GET` | Authenticated Parent | Fetch unlinked student suggestions matched by phone/name |

### 6.2 Coaching Workspace APIs (Tenant-Scoped — `/api/v1/parent/students/{id}/*`)

| Endpoint | Method | Authorization Verification | Description |
| :--- | :--- | :--- | :--- |
| `/api/v1/parent/students/{id}` | `GET` | Canonical Parent Relationship Chain | Detailed student profile & batch enrollment details |
| `/api/v1/parent/students/{id}/attendance` | `GET` | Canonical Parent Relationship Chain | Calendar-derived session attendance history |
| `/api/v1/parent/students/{id}/homework` | `GET` | Canonical Parent Relationship Chain | Published homework list (pending & completed) |
| `/api/v1/parent/students/{id}/marks` | `GET` | Canonical Parent Relationship Chain | Published test results & performance history |
| `/api/v1/parent/students/{id}/fees` | `GET` | Canonical Parent Relationship Chain | Fee structure, outstanding balance, invoices, payments |
| `/api/v1/parent/students/{id}/receipts/{receiptId}` | `GET` | Canonical Parent Relationship Chain | Safe signed receipt download URL |
| `/api/v1/parent/students/{id}/activities` | `GET` | Canonical Parent Relationship Chain | Append-only student activity feed |

---

## 7. Domain Read Integration Boundaries

1. **Academics Engine Integration**:
   - **Attendance**: Derived from `BatchSession` and `Attendance` entities. Draft or unrecorded sessions are hidden.
   - **Homework**: Read-only visibility into `Homework` where `publishedAt !== null`. Draft homework is strictly hidden.
   - **Tests & Marks**: Read-only visibility into `Test` and `Marks` where `status === 'published'`. Draft, scheduled, or marks_entered tests are strictly hidden.
2. **Billing Engine Integration**:
   - Read-only visibility into `BillingPlan`, `Invoice`, `Payment`, and `Receipt`.
   - Outstanding fee balances are computed dynamically ($Outstanding = Invoice.amount - \sum(Payment.amount)$).
   - Direct payment recording or fee adjustments by parents are strictly forbidden in Phase 5.
3. **Communication Engine Integration**:
   - **Notifications**: Read-only feed and mark-as-read updates for recipient-isolated `Notification` records.
   - **Announcements**: Targeted filtering by institute or student batch.
   - **Activity Feed**: Read-only append-only `Activity` timeline feed.

---

## 8. Parent PWA UI & Mobile-First UX Architecture

- **Primary Target**: Mobile PWA (375px responsive baseline, touch targets $\ge$ 44px, fast navigation).
- **Desktop Compatibility**: Responsive container max-width bounds for desktop browsers.
- **State Management Discipline**:
  - **TanStack Query (Server State)**: Child profiles, student details, attendance, homework, marks, billing, notifications, activity timeline.
  - **Zustand (UI State Only)**: Active child profile selector, active institute filter, dialog open states, mobile navigation drawer.

---

## 9. Security & Adversarial Test Requirements (`PAR-SEC-001` - `PAR-SEC-015`)

Phase 5 implementation requires an explicit adversarial E2E security suite (`apps/web/src/app/api/v1/parent-security.test.ts`):
- `PAR-SEC-001`: Returns `404 Not Found` when Parent A queries Parent B's `ChildProfile`.
- `PAR-SEC-002`: Returns `404 Not Found` when Parent A queries an unlinked student ID.
- `PAR-SEC-003`: Returns `404 Not Found` when Parent A queries invoices/receipts for Student B.
- `PAR-SEC-004`: Rejects OTP verification for invalid or expired OTP code.
- `PAR-SEC-005`: Rejects OTP requests exceeding 3 attempts per 15 minutes with `429 RateLimitError`.
- `PAR-SEC-006`: Rejects requests from `suspended` or `deactivated` `ParentIdentity` records.
- `PAR-SEC-007`: Rejects draft homework, draft tests, or unpublished test marks from parent views.
- `PAR-SEC-008`: Enforces `405 Method Not Allowed` for `POST`, `PUT`, `PATCH`, `DELETE` on parent attendance, marks, fees, and activities.
- `PAR-SEC-009`: Verifies `StudentLink` hard deletion removes PWA visibility without deleting tenant `Student` data.
- `PAR-SEC-010`: Prevents cross-tenant parameter tampering (`instituteId` mismatch on `StudentLink`).

---

## 10. Subphase Roadmap for Phase 5

```text
PHASE 5 — PARENT PWA EXECUTION ROADMAP
  ├── Phase 5.0 — Architecture & Domain Contract Freeze        🟢 ACCEPTED & FROZEN
  ├── Phase 5.1 — Parent Authentication & OTP Implementation
  ├── Phase 5.2 — Parent Session & Authorization Engine
  ├── Phase 5.3 — Child Profile & Student Linking Implementation
  ├── Phase 5.4 — Parent Hub & Cross-Institute Read APIs
  ├── Phase 5.5 — Parent Home & Today's Activity Dashboard UI
  ├── Phase 5.6 — Attendance & Homework Views UI
  ├── Phase 5.7 — Assessments, Marks & Performance Views UI
  ├── Phase 5.8 — Fee Status, Invoices & Receipt Download UI
  ├── Phase 5.9 — Notifications & Unified Timeline Feed UI
  ├── Phase 5.10 — PWA Mobile UX, Touch Targets & Accessibility Hardening
  ├── Phase 5.11 — Security, Privacy & Adversarial E2E Matrix
  └── Phase 5.12 — Phase 5 Acceptance Gate & Milestone Freeze
```

---

## 11. Acceptance & Freeze Decision

> 🟢 **ACCEPTED & FROZEN**

Phase 5.0 is formally **ACCEPTED & FROZEN**. Implementation of Phase 5.1 may begin.
