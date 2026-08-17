# Phase 6.6 — Operational Tables & Multi-Criteria Filtering

## Executive Summary

Phase 6.6 establishes a reusable, production-grade operational table architecture across the CoachingOS monorepo for staff workflows. The initial implementation introduces full operational table capabilities for **Students**, **Invoices**, and **Sessions**, featuring server-applied filtering, deterministic sorting, bounded pagination, dual state sync (URL query params & React state), strict multi-tenant scoping, and role-aware authorization.

---

## Architecture & Design Patterns

### 1. Server-Authoritative Filtering & Pagination
- **TanStack Table (v8)** operates in explicit manual mode (`manualPagination`, `manualSorting`, `manualFiltering`). UI components capture user interactions and propagate parameters directly to server REST endpoints (`/api/v1/students`, `/api/v1/invoices`, `/api/v1/academics/sessions`).
- Database repositories execute single SQL queries with `COUNT(*)` windowing/aggregations to avoid double-filtering or client-side truncation.
- Bounded pagination defaults to 25 items per page with a hard upper limit of 100 items per page enforced via Zod schemas.

### 2. Standardized UI Primitives (`@coaching-os/web/src/features/shared/components/operational-table/`)
- `OperationalTableToolbar`: Search bar with 300ms debounce, total count indicator badge, filter dropdown slots, active filter detection, and one-click "Clear Filters" action.
- `OperationalTablePagination`: Range indicator (`Showing 1 to 25 of 100`), Prev/Next page controls, page size selector dropdown (10, 25, 50, 100), ARIA pagination attributes, touch target dimensions $\ge 44 \times 44\text{px}$.
- `OperationalTableEmpty`: Context-aware empty state differentiating zero database records vs zero matching filter results. Prominently displays "No records match these filters" with a primary "Clear filters" button when filters are active.
- `OperationalTableError`: Hides Prisma/SQL exception details behind user-friendly error copy with a "Retry" button.
- `OperationalTableSkeleton`: Accessible multi-column skeleton loader matching the operational table layout.

### 3. Multi-Tenant Scoping & Role Security Invariants
- All server routes consume `withV1ReadGuard`, resolving `instituteId` server-side via authenticated session context. Client-supplied `instituteId` query parameters are ignored.
- **Teacher Role Scoping**: `/api/v1/academics/sessions` filters sessions to those where the teacher is assigned (`batch.teacherId` or `substituteTeacherId`).
- **Parent Role Block**: Accessing `/api/v1/academics/sessions` as a Parent returns `AuthorizationError` (403 Forbidden).
- **Anti-Enumeration Guard**: When `batchId` is provided in query parameters for session listing, the route validates batch ownership against `ctx.instituteId` and throws `NotFoundError` (404) if foreign.

---

## Domain Operational Tables

| Domain Table | Route Path | Filters Supported | Sort Fields | Role Access |
| :--- | :--- | :--- | :--- | :--- |
| **Students** | `/api/v1/students` | `status`, `admissionStatus`, `batchId`, `search` | `displayName`, `admissionNumber`, `status` | Owner, Admin, Teacher, Assistant |
| **Invoices** | `/api/v1/invoices` | `status`, `overdue`, `search` | `amount`, `dueDate`, `status` | Owner, Admin, Assistant |
| **Sessions** | `/api/v1/academics/sessions` | `batchId`, `subjectId`, `teacherId`, `status`, `attendanceStatus`, `startDate`, `endDate`, `search` | `date`, `status` | Owner, Admin, Teacher (scoped), Assistant (Parent blocked: 403) |

---

## Verification & Test Matrix (78/78 UI & Security Tests)

1. **Student Table UI Suite (`student-table.test.tsx`):** 18 unit/UI tests covering URL query sync, filter state updates, sort column toggling, pagination controls, clear filters action, skeleton loading, and empty states.
2. **Invoice Table UI Suite (`invoice-table.test.tsx`):** 18 unit/UI tests covering INR currency formatting (`formatCurrency`), status badge variants, overdue filter toggle, and pagination boundaries.
3. **Session Table UI Suite (`session-table.test.tsx`):** 18 unit/UI tests covering date ISO formatting, time range formatting, teacher name mapping via `parentIdentity`, status filtering, and attendance state badges.
4. **Security & Integration Suite (`operational-tables-security.test.ts`):** 24 API tests verifying `withV1ReadGuard` session resolution, client parameter injection prevention, teacher scoping, parent 403 block, anti-enumeration 404 behavior, and rate-limiting envelope compliance.

---

## Quality Gate Checklist

- [x] **Environment Validation:** `pnpm env:check` 🟢
- [x] **Prisma Schema Validation:** `pnpm db:validate` 🟢
- [x] **PostgreSQL Database Health:** `pnpm db:health` 🟢
- [x] **Monorepo Test Suite:** `pnpm test` (1084/1084 passing) 🟢
- [x] **TypeScript Type Check:** `pnpm typecheck` (13/13 packages clean) 🟢
- [x] **ESLint Static Analysis:** `pnpm lint --force` (13/13 packages clean, 0 errors) 🟢
- [x] **Production Build:** `pnpm build` (All 13 packages & Next.js production build clean) 🟢
