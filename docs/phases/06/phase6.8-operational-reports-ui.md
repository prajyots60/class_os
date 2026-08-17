# Phase 6.8 — Operational Reports UI & Read-Only Reporting Workspace

## 1. Executive Summary

Phase 6.8 successfully delivers the dedicated operational reporting workspace (`/reports`) for CoachingOS staff. It provides two on-screen interactive report views: **Attendance Reports** and **Fee Collection Reports**, with server-authoritative date boundary resolution (institute timezone), strict tenant isolation (`institute_id`), role-based capability scoping, dual URL state sync, operational table pagination, and zero data exports (no CSV/Excel/PDF/predictive analytics) in accordance with the frozen Phase 6.0 contract.

- **Zero Schema Alteration Invariant:** `Schema changes: 0`, `Migrations: 0`. No database schema changes or materialized reporting tables were introduced.
- **Interactive On-Screen Scope:** Reports are 100% read-only projections. No export controls (CSV/Excel/PDF) or automated scheduled emails were added.
- **Server Timezone & Date Limit:** Query date boundaries (`from`, `to`) are interpreted server-side using `resolveServerTenantContext()` and institute local timezone (`startOfDay`, `endOfDay`). Date ranges are clamped to a maximum of 90 days per query.
- **Role Authorization Invariants:** Owner/Staff get full reports. Assistant receives fee collection reports (`billing:read`). Teacher receives attendance reports restricted to assigned batches (`academic:read`) with 403 Forbidden on fee collection reports. Parent receives 403 Forbidden on all staff reports.

---

## 2. Architecture & API Endpoints

### A. DTO Projections
- `AttendanceReportSummaryDTO`: `totalSessions`, `completedSessions`, `pendingSessions`, `eligibleRecords`, `presentCount`, `absentCount`, `attendancePercentage`.
- `AttendanceReportRowDTO`: `id`, `dateIso`, `batchId`, `batchName`, `batchCode`, `subjectName`, `teacherName`, `eligibleCount`, `presentCount`, `absentCount`, `attendancePercentage`, `status`.
- `FeeCollectionReportSummaryDTO`: `totalCollectedAmount`, `transactionCount`, `pendingInvoiceAmount`, `paymentMethodBreakdown`.
- `FeeCollectionReportRowDTO`: `id`, `receivedOnIso`, `studentId`, `studentName`, `admissionNumber`, `invoiceId`, `invoiceNumber`, `amount`, `paymentMode`, `receiptNumber`.

### B. Application & Domain Repositories
- `GetAttendanceReportUseCase` & `GetFeeCollectionReportUseCase` in `@coaching-os/administration`.
- `PrismaReportsReadRepository` executing server-side Prisma aggregations and paginated queries over `BatchSession`, `Attendance`, `Payment`, `Invoice`, `Student`.

### C. Protected REST Endpoints
- `GET /api/v1/reports/attendance`: Accepts `from`, `to`, `batchId`, `subjectId`, `teacherId`, `search`, `page`, `pageSize`. Guarded by `withV1ReadGuard`.
- `GET /api/v1/reports/fees`: Accepts `from`, `to`, `paymentMode`, `search`, `page`, `pageSize`. Guarded by `withV1ReadGuard`. Blocks `teacher` and `parent` roles with 403.
- Non-GET HTTP methods return `405 Method Not Allowed` with `Allow: GET`.

---

## 3. UI Components & Workspace UX (`/reports`)

- **`ReportsWorkspace`**: Root client layout with `<Suspense>` boundary and tab switcher (`Attendance Reports` | `Fee Collection Reports`).
- **`AttendanceReportView`**: Summary metric cards, filter toolbar (Date Range, Search, Clear Filters), paginated attendance details table.
- **`FeeCollectionReportView`**: Summary metric cards (Total Collected ₹, Transactions Count, Outstanding Invoices ₹, Method Breakdown), filter toolbar (Date Range, Mode Select, Search, Clear Filters), paginated fee collection table with INR currency formatting (`Intl.NumberFormat('en-IN', ...)`).
- **Navigation Integration**: Added `/reports` item to `@coaching-os/web` app sidebar under Academics section (`academic:read` capability).

---

## 4. Verification & Quality Gates

The implementation passed 100% of pre-commit quality gates:

```bash
pnpm env:check          # 🟢 SUCCESS — Environment config 100% valid
pnpm db:validate        # 🟢 SUCCESS — Prisma schema loaded and valid (0 schema changes)
pnpm db:health          # 🟢 SUCCESS — PostgreSQL connection round-trip latency 76ms
pnpm typecheck          # 🟢 SUCCESS — Strict TypeScript typecheck across 13/13 packages
pnpm lint               # 🟢 SUCCESS — ESLint 0 errors across workspace packages
pnpm test               # 🟢 SUCCESS — 1142/1142 unit & integration tests passed clean
pnpm build              # 🟢 SUCCESS — Production build of packages and Next.js app
```

### Test Suite Execution Summary
- `reports-security.test.ts` (`P6.8-SEC-001..018`): 18/18 Passed.
- `reports-ui.test.tsx` (`REPORT-001..030`): 15/15 Passed.
- Monorepo Total Test Count: **1142/1142 Passed**.
