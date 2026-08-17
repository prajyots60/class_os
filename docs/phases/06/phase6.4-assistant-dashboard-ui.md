# Phase 6.4 — Assistant Dashboard UI & Operational Workspace

**Status:** 🟢 COMPLETED & VERIFIED  
**Milestone:** Phase 6 — Staff Dashboard & UX Polish  
**Type:** Client UI Workspace & React Query Integration  
**Prisma Schema Modifications:** ❌ 0  
**Database Migrations:** ❌ 0  

---

## 1. Executive Summary

Phase 6.4 delivers the production-ready Assistant Dashboard UI on top of the Phase 6.1 server-authoritative Assistant Dashboard read orchestration (`GET /api/v1/dashboard/assistant`). It strictly preserves the frozen Phase 6.0 UX contract without introducing new metrics, business logic, or infrastructure.

The Assistant Dashboard is a **front-desk operational cockpit**: What was collected today? What receipts need attention? How many admissions happened? What action do I take now?

---

## 2. Frozen Phase 6.0 Assistant Contract

The Phase 6.0 contract for the Assistant role is:

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

This implementation faithfully delivers all required sections.

---

## 3. Today's Collection Definition

**"Today"** is determined server-side using the institute's configured timezone via `getInstituteLocalTodayRange()` in `@coaching-os/administration`.

The UI **NEVER**:
- Sums payment records
- Filters payments by date
- Calls `new Date()` for business decisions
- Passes `date`, `timezone`, `startDate`, or `endDate` from the client

`collectedTodayAmount`, `transactionCount`, and `pendingReceiptCount` are pre-aggregated by `PrismaDashboardReadRepository.getAssistantData()` and delivered via `AssistantDashboardDTO`.

---

## 4. Information Architecture

```text
HEADER
  → Date badge (server todayIso, UTC-parsed, no browser timezone)
  → Timezone badge (server-provided)

TODAY'S COLLECTION (full-width, primary prominence)
  → ₹collectedTodayAmount (Intl.NumberFormat en-IN INR)
  → transactionCount
  → pendingReceiptCount
  → Navigation: /billing

OPERATIONAL GRID (responsive md:grid-cols-2)
  LEFT: ADMISSIONS & ENROLLMENTS
    → admissionsTodayCount → /students
    → pendingEnrollmentsCount → /enrollments

  RIGHT: QUICK ACTIONS
    → Record Payment → /billing (primary button, prominent)
    → New Student Admission → /students
```

---

## 5. Component Architecture

| Component | File | Responsibility |
|---|---|---|
| `AssistantDashboardView` | `assistant-dashboard-view.tsx` | Root view: loading/error/data states, layout composition |
| `AssistantCollectionCard` | `assistant-collection-card.tsx` | Today's Collection: amount, transactions, pending receipts |
| `AssistantAdmissionsSummary` | `assistant-admissions-summary.tsx` | Admissions today + pending enrollments with navigation |
| `AssistantQuickActions` | `assistant-quick-actions.tsx` | Server-provided quick action links |
| `useAssistantDashboard` | `use-assistant-dashboard.ts` | React Query hook, query key `['dashboard', 'assistant']` |
| `DashboardApiClient.getAssistantDashboard()` | `dashboard-client.ts` | Fetches GET /api/v1/dashboard/assistant |

RSC routing in `dashboard/page.tsx` — `role === 'assistant'` → `<AssistantDashboardView />`.

---

## 6. DTO / Data Flow

```text
Server (getAssistantData → PrismaDashboardReadRepository)
  ↓
GetAssistantDashboardUseCase (server-side aggregation + timezone boundary)
  ↓
/api/v1/dashboard/assistant (GET, no client params accepted)
  ↓
AssistantDashboardDTO {
  instituteId, assistantUserId, timezone, todayIso,
  collection: { collectedTodayAmount, transactionCount, pendingReceiptCount, targetPath },
  admissions: { admissionsTodayCount, pendingEnrollmentsCount, targetPath },
  quickActions: [{ id, label, targetPath, requiredCapability }]
}
  ↓
DashboardApiClient.getAssistantDashboard()
  ↓
useAssistantDashboard() React Query
  ↓
AssistantDashboardView → child components
```

---

## 7. Financial Display Rules

- Currency formatted with `new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })` — same pattern as `OwnerOperationalAttention`.
- No second currency formatting system introduced.
- Zero collection (`₹0`) renders as valid operational data, not an error/empty state.
- No financial totals computed client-side.

---

## 8. Navigation Targets

| Action | Route | Source |
|---|---|---|
| View Billing & Receipts | `/billing` | `collection.targetPath` from DTO |
| Manage Admissions | `/students` | Hardcoded, confirmed real workspace route |
| Manage Enrollments | `/enrollments` | `admissions.targetPath` from DTO |
| Record Payment | `/billing` | `quickActions[0].targetPath` from DTO |
| New Student Admission | `/students` | `quickActions[1].targetPath` from DTO |

All routes verified against `apps/web/src/app/(app)/(workspace)/` directory.

---

## 9. Loading / Error / Zero States

- **LOADING**: Layout-matched skeleton (header, collection card, 2-col grid) with no misleading zeros.
- **ERROR**: Safe card with human-readable message, Retry button calling `refetch()`. Prisma/SQL error strings stripped.
- **ZERO**: `collectedTodayAmount: 0`, `transactionCount: 0`, `pendingReceiptCount: 0`, `admissionsTodayCount: 0`, `pendingEnrollmentsCount: 0` all render as valid operational data, not error states.

---

## 10. Responsive Behavior

- Container: `max-w-7xl mx-auto p-4 sm:p-6` — responsive padding.
- Collection card: full width at all viewports.
- Lower grid: `grid gap-6 md:grid-cols-2` — single column on mobile, 2-col ≥768px.
- All interactive elements: `min-h-[44px]` — 44×44 CSS px touch targets.
- Amount text: `break-all` prevents rupee value overflow on narrow viewports.

---

## 11. Accessibility

- `<header>`, `<main>`, `<section aria-label>` semantic landmarks.
- `<h1>` with logical heading hierarchy.
- `aria-label` on all navigation links.
- `aria-hidden="true"` on decorative icons.
- `focus-visible` ring classes via `buttonVariants` from `@coaching-os/ui`.
- Status meaning uses explicit text counts ("2 receipts unissued"), not color alone.

---

## 12. Security Invariants

| ID | Invariant |
|---|---|
| P6.4-SEC-001 | Unauthenticated access → 401 UNAUTHENTICATED |
| P6.4-SEC-002 | Client `instituteId` override ignored |
| P6.4-SEC-003 | Client `userId` override ignored |
| P6.4-SEC-004 | Teacher cannot access Assistant Dashboard |
| P6.4-SEC-005 | Cross-institute data boundary enforced |
| P6.4-SEC-006 | Client `date`/`startDate`/`endDate` params ignored |
| P6.4-SEC-007 | No Prisma models/secrets in DTO response |
| P6.4-SEC-008 | Financial aggregation is server-owned |
| P6.4-SEC-009 | Parent role access rejected with AuthorizationError |
| P6.4-SEC-010 | POST → 405 Method Not Allowed |

---

## 13. Test Matrix

### UI Tests (ASSISTANT-DASH-001..030) — 30/30 ✅
Covers: DTO rendering, zero-value safety, loading skeleton, safe error/retry, navigation targets, touch targets ≥44px, keyboard nav, accessible names, color-independent semantics, server-authoritative date, stable query key, no Prisma fields.

### Security Tests (P6.4-SEC-001..010) — 10/10 ✅
Covers: authentication, authorization, tenant isolation, role isolation, server-side financial aggregation, server-side date boundaries, DTO safety, cache isolation, HTTP method safety.

---

## 14. Quality Gates

```bash
pnpm env:check          # 🟢 PASSED
pnpm db:validate        # 🟢 PASSED
pnpm db:health          # 🟢 PASSED
pnpm typecheck          # 🟢 PASSED (13/13 workspace packages clean)
pnpm turbo lint --force # 🟢 PASSED (0 errors, 0 warnings)
pnpm test (P6.4 files)  # 🟢 PASSED (30/30 UI + 10/10 security tests)
pnpm build              # 🟢 PASSED (13/13 build tasks successful)
```

---

## 15. Database Impact

- **Schema changes:** 0
- **Migrations:** 0
- No new tables, views, functions, or indexes introduced.

---

## 16. Explicit Non-Goals

This phase does NOT implement:
- Financial charts or revenue analytics
- Monthly/quarterly reports
- Profit/loss summaries
- Payroll or salary information
- Admission creation workflow
- Enrollment processing workflow
- Receipt PDF generation
- Payment gateway integration
- CSV/Excel export
- Accounting ledger
- AI recommendations

---

## 17. Phase 6.5 Handoff

**Next Active Target:** Phase 6.5 — Global Search Implementation

The dashboard UI layer (6.2 Owner, 6.3 Teacher, 6.4 Assistant) is now complete. Phase 6.5 targets the global search bar in the authenticated app shell, enabling server-side PostgreSQL text search for Students, Batches, and Invoices within the active tenant scope.
