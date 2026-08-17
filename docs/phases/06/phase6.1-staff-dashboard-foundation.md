# Phase 6.1 — Staff Dashboard Foundation & Read Orchestration

**Status:** 🟢 ACCEPTED & FROZEN  
**Milestone:** Phase 6 — Staff Dashboard & UX Polish  
**Type:** Application Read Layer & REST Adapters  
**Prisma Schema Modifications:** ❌ 0  
**Database Migrations:** ❌ 0  

---

## 1. Executive Summary

Phase 6.1 delivers the server-authoritative application read orchestration foundation for CoachingOS Staff Dashboards. It exposes three role-tailored application read use cases and thin REST API route adapters, enforcing tenant isolation, institute-local timezone calendar boundaries, role-based capability boundaries, and zero DTO leakage of Prisma internal models.

---

## 2. Core Components Implemented

### A. DTO Contracts (`@coaching-os/administration`)
- **`OwnerDashboardDTO`**: Composes attendance completion ratio, present/eligible student counts, today's scheduled classes and tests count, pending fee totals, overdue student count, recent announcements, and quick actions metadata.
- **`TeacherDashboardDTO`**: Composes today's assigned sessions (`BatchSession` records matched by today's date in institute timezone and assigned teacher/substitute), pending homework status per batch, and upcoming tests in the next 7 days.
- **`AssistantDashboardDTO`**: Composes today's collection amount (₹), transaction count, pending receipt count, new admissions today, and pending enrollments.

### B. Institute Local Timezone Calendar Boundary Service
- `getInstituteLocalTodayRange(timezoneStr, referenceDate)` derives `todayIso` (`YYYY-MM-DD`), `startOfDay` (`00:00:00.000` UTC Date), and `endOfDay` (`23:59:59.999` UTC Date) matching the institute's configured timezone (`Asia/Kolkata` default).
- Eliminates client/browser timezone tampering and raw UTC date mismatches.

### C. Application Read Use Cases
1. `GetOwnerDashboardUseCase`: Enforces owner role check, resolves institute timezone, delegates to `DashboardReadRepository`, computes session completion % and student attendance %, returns `OwnerDashboardDTO`.
2. `GetTeacherDashboardUseCase`: Enforces teacher/owner role check, filters sessions by today's date in institute timezone for batches assigned to the logged-in teacher or substitute teacher ID, returns `TeacherDashboardDTO`.
3. `GetAssistantDashboardUseCase`: Enforces assistant/owner role check, calculates today's fee collection sum and admissions today, returns `AssistantDashboardDTO`.

### D. Infrastructure Repository (`PrismaDashboardReadRepository`)
- Framework-independent repository interface `DashboardReadRepository` in `domain/repositories/`.
- Prisma adapter `PrismaDashboardReadRepository` in `infrastructure/repositories/` executing efficient single-pass PostgreSQL queries strictly scoped by `instituteId`.

### E. Thin REST API Route Adapters
- `/api/v1/dashboard/owner` (`GET`, guarded by `withV1ReadGuard`, role check `owner`).
- `/api/v1/dashboard/teacher` (`GET`, guarded by `withV1ReadGuard`, role check `teacher` or `owner`).
- `/api/v1/dashboard/assistant` (`GET`, guarded by `withV1ReadGuard`, role check `assistant` or `owner`).
- Non-GET requests (`POST`, `PUT`, `PATCH`, `DELETE`) return `405 Method Not Allowed`.

---

## 3. Security & Adversarial Verification Matrix (`P6.1-SEC-001..008`)

| Test ID | Scenario | Verification Result |
| :--- | :--- | :--- |
| `P6.1-SEC-001` | Unauthenticated access attempt to `/api/v1/dashboard/owner` | 🟢 PASSED (Returns 401 `UNAUTHENTICATED`) |
| `P6.1-SEC-002` | Client attempts to inject another `instituteId` query parameter | 🟢 PASSED (Ignored, scoped strictly to session tenant) |
| `P6.1-SEC-003` | Teacher user attempts to access Owner dashboard | 🟢 PASSED (Throws `AuthorizationError` / 403) |
| `P6.1-SEC-004` | Non-assistant non-owner attempts to access Assistant dashboard | 🟢 PASSED (Throws `AuthorizationError` / 403) |
| `P6.1-SEC-005` | Non-teacher non-owner attempts to access Teacher dashboard | 🟢 PASSED (Throws `AuthorizationError` / 403) |
| `P6.1-SEC-006` | Non-GET HTTP methods (`POST`, `PUT`, `DELETE`) on dashboard routes | 🟢 PASSED (Returns 405 `Method Not Allowed`) |
| `P6.1-SEC-007` | Client browser timezone header/query manipulation | 🟢 PASSED (Server derives calendar boundaries using institute DB timezone) |
| `P6.1-SEC-008` | DTO Field Safety — Check for raw Prisma objects/passwords | 🟢 PASSED (DTOs contain 100% serializable primitives) |

---

## 4. Verification Suite Results

```bash
pnpm env:check          # 🟢 PASSED
pnpm db:validate        # 🟢 PASSED
pnpm db:health          # 🟢 PASSED
pnpm typecheck          # 🟢 PASSED (13/13 workspace packages)
pnpm test               # 🟢 PASSED (64 test files, 869/869 tests passed)
pnpm build              # 🟢 PASSED (13/13 tasks successful)
```
