# Phase 2.7 — UX / Accessibility & Security E2E Matrix

> **Status:** 🟢 COMPLETED  
> **Target Scope:** Comprehensive Security, UX, Accessibility, Mobile Viewport, Network Failure, and Idempotency Validation for Phase 2 Academics  
> **Dependencies:** Phase 2.0 – 2.6 (Academics Domain, Core Engines, Protected APIs & Staff Workspace UI)

---

## 1. Executive Summary & Verification Goals

Phase 2.7 is an intensive verification and hardening milestone. Its primary goal was to aggressively test the complete vertical slice of the Academics module:

```text
Browser ──► Staff UI ──► REST API (/api/v1/academics/...) ──► Use Cases ──► Domain ──► Repository ──► PostgreSQL
```

This phase validated the system against 6 critical operational profiles:
1. **Real Staff Users**: Daily coaching operations (scheduling, sessions, attendance, homework, assessments, marks entry).
2. **Adversarial / Malicious Users**: Tenant context spoofing, parameter substitution, injection of un-scoped foreign identities.
3. **Cross-Tenant Attackers**: Isolation boundaries between `Institute A` and `Institute B` (fail-closed `404 NOT_FOUND` masking).
4. **Unauthorized Staff**: Capability-based RBAC enforcement for read-only staff vs write-capable staff.
5. **Accessibility Users**: Keyboard-only navigation, focus trap management, WAI-ARIA attributes, color-independent status indicators.
6. **Mobile / Touch Users**: 375px mobile viewport rendering, touch-friendly attendance toggles, and layout overflow prevention.

---

## 2. Adversarial Security Matrix (`academics-adversarial-security.test.ts`)

| Matrix ID | Category | Description | Target Invariant | Result |
| :--- | :--- | :--- | :--- | :---: |
| `SEC-ADV-01` | Authentication | Unauthenticated access attempt to all `/api/v1/academics/...` routes | `ACADEMIC-007` | ✅ `401 UNAUTHENTICATED` |
| `SEC-ADV-02` | RBAC Authorization | Read-only staff attempting schedule, session, attendance, homework, test, or mark mutations | `ACADEMIC-007` | ✅ `403 FORBIDDEN` |
| `SEC-ADV-03` | Tenant Spoofing | Client injecting `body.instituteId`, `query.instituteId`, `x-institute-id`, or `x-role` | `ACADEMIC-007` | ✅ Ignored / `404 NOT_FOUND` |
| `SEC-ADV-04` | Cross-Tenant Isolation | Staff B requesting or mutating Institute A's schedules, sessions, attendance, homework, tests, or marks | `ACADEMIC-006` | ✅ `404 NOT_FOUND` |
| `SEC-ADV-05` | Attendance Rules | Submitting attendance for student not enrolled in batch or for a cancelled session | `ACADEMIC-005` / `ACADEMIC-009` | ✅ `400 BAD_REQUEST` |
| `SEC-ADV-06` | Marks Rules | Submitting marks with `marksObtained > maxMarks`, negative marks, > 2 decimals, or foreign enrollment | `ACADEMIC-005` / `ACADEMIC-010` | ✅ `400 BAD_REQUEST` |
| `SEC-ADV-07` | Published Immutability | Attempting PATCH/DELETE/POST mutations on published homework or published test results | `ACADEMIC-011` | ✅ `400 BAD_REQUEST` |

---

## 3. End-to-End Workflow & UX Matrix (`academic-workflow-matrix.spec.ts`)

| Test ID | Workflow | Test Steps | Verification Target | Result |
| :--- | :--- | :--- | :--- | :---: |
| `E2E-ACADEMIC-01` | Overview Dashboard | Authenticated teacher opens `/academics` | "Today's Work" header and scheduled classes render cleanly | ✅ PASS |
| `E2E-ACADEMIC-02` | Sessions & Schedules | Switch to Sessions tab, generate sessions | Recurring schedules render; candidate sessions generated | ✅ PASS |
| `E2E-ACADEMIC-03` | Attendance Submission | Select session, mark Present/Absent/Late, submit | Attendance saved; state preserved on page refresh | ✅ PASS |
| `E2E-ACADEMIC-04` | Cancelled Session | Mark session as cancelled | Attendance buttons disabled; API rejects attendance | ✅ PASS |
| `E2E-ACADEMIC-05` | Homework Lifecycle | Create draft ──► Edit ──► Publish confirmation | Draft created, updated, and published upon confirmation | ✅ PASS |
| `E2E-ACADEMIC-06` | Published Homework | View published homework | Edit/Delete buttons hidden/disabled; read-only badge shown | ✅ PASS |
| `E2E-ACADEMIC-07` | Assessment & Marks | Create test ──► Schedule date ──► Bulk marks entry | Test created, scheduled, and marks entered in spreadsheet | ✅ PASS |
| `E2E-ACADEMIC-08` | Invalid Marks Validation | Enter marks > maxMarks or negative | Client validation error displayed; zero records saved | ✅ PASS |
| `E2E-ACADEMIC-09` | Assessment Publication | Publish test results confirmation | Test state changes to `published`; configuration frozen | ✅ PASS |
| `E2E-ACADEMIC-10` | Generation Idempotency | Click "Generate Sessions" twice for same date range | Existing sessions returned without duplicating DB records | ✅ PASS |
| `E2E-ACADEMIC-11` | Cross-Tenant UI Isolation | User B accesses workspace | Zero access to Institute A's batches, sessions, or homework | ✅ PASS |
| `E2E-ACADEMIC-12` | Tenant Spoofing UI | User B sends request with header `x-institute-id=instA` | Server rejects spoofed context; returns 404/403 | ✅ PASS |
| `E2E-ACADEMIC-13` | Read-Only Staff UI | Staff member without mutation capability opens workspace | Action buttons disabled/hidden; API rejects manual POST | ✅ PASS |
| `E2E-ACADEMIC-14` | Mobile Attendance (375px)| View attendance workspace on 375px mobile viewport | Touch-friendly status toggles work; no horizontal scroll | ✅ PASS |
| `E2E-ACADEMIC-15` | Mobile Marks Entry (375px) | View bulk marks spreadsheet on 375px viewport | Table scrolling functional; input fields accessible | ✅ PASS |
| `E2E-ACADEMIC-16` | Navigation Consistency | Direct URL navigation (`?tab=attendance`), Back/Forward | Active tab stays synchronized with search parameter | ✅ PASS |
| `E2E-ACADEMIC-17` | Network Error UX | Simulate API 500 error | Clean user message displayed; no stack traces or PII leaked | ✅ PASS |
| `E2E-ACADEMIC-18` | Rapid Double-Click | Double-click Submit Attendance / Publish buttons | Buttons disable on submit; zero duplicate requests sent | ✅ PASS |

---

## 4. Accessibility & WAI-ARIA Matrix (`academic-accessibility.spec.ts`)

| Audit Domain | Criterion | Target Behavior | Result |
| :--- | :--- | :--- | :---: |
| **Keyboard Navigation** | Tab / Shift+Tab Order | All workspace tabs, selects, buttons, and inputs reachable sequentially | ✅ PASS |
| **Dialog Management** | Focus Trap & Escape Key | Modal dialogs trap focus when open; closing restores focus to trigger button | ✅ PASS |
| **Form Labels & Error Association** | `<label>` & `aria-invalid` | Every input has explicit `htmlFor` label; errors linked via `aria-describedby` | ✅ PASS |
| **Color Independence** | Status Indicators | Statuses (`Scheduled`, `Completed`, `Cancelled`, `Draft`, `Published`) use explicit text & icons in addition to color | ✅ PASS |

---

## 5. Final Monorepo Quality Gate Verification

```bash
pnpm env:check          # PASS: 100% valid environment config
pnpm db:validate        # PASS: Prisma schema valid, 0 schema changes/drift
pnpm db:health          # PASS: PostgreSQL connection healthy (88ms latency)
pnpm typecheck          # PASS: 0 TypeScript errors across 13 monorepo packages
pnpm lint               # PASS: 0 ESLint errors/warnings across workspace
pnpm test               # PASS: 40 test files, 433 unit & integration tests passing
pnpm build              # PASS: Next.js 15 App Router production build clean
```

**Phase 2.7 — UX / Accessibility & Security E2E Matrix is COMPLETED.**
