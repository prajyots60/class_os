# Phase 1.13 — Staff UI & Onboarding Workflows Specification

- **Status**: 🟢 **ACCEPTED & FROZEN**
- **Date**: 2026-08-12
- **Authors**: Senior Staff Architecture & Identity Team
- **Deciders**: Product & Engineering Core

---

## 1. Phase Objective

Phase 1.13 establishes the **Staff Management and Staff Onboarding Workflow** for CoachingOS.

It defines and implements:
- **Staff Aggregate Foundation**: Domain representation of staff members (`InstituteMembershipEntity` linked to `User`).
- **Staff Onboarding & Invitation**: Adding/inviting new staff members by email or User ID and role (`owner`, `teacher`, `assistant`).
- **Role Assignment & RBAC Governance**: Role promotions and demotions under `staff:role_change` capability protection.
- **Membership Lifecycle Management**: Activation, suspension, and removal of staff memberships.
- **Protected API Boundary & Validators**: `/api/v1/staff` RESTful HTTP endpoints with strict Zod presentation validation.
- **Security Threat Matrix (STAFF-SEC-01..24)**: Adversarial security verification suite covering capability enforcement, tenant isolation, rate limiting, and DTO data privacy (24/24 passing).
- **Staff Workspace UI**: Production client feature module (`/staff`) with role/status filters, capability-gated actions, responsive desktop table, 375px mobile cards, loading skeletons, and accessible modal dialogs.
- **UX, Accessibility & Workflow Matrix**: Automated Playwright E2E matrix proving staff management workflows, Escape key modal dismissals, focus traps, ARIA attributes, and cross-tenant isolation (10/10 passing).

---

## 2. Subphase Roadmap

```text
Phase 1.13.0 — Staff Management Architecture & Contract Freeze   🟢 ACCEPTED & FROZEN
Phase 1.13.1 — Staff Management Domain & Application Layer       🟢 ACCEPTED & FROZEN
Phase 1.13.2 — Staff Management API & Validators                 🟢 ACCEPTED & FROZEN
Phase 1.13.3 — Staff Management Security & E2E Matrix            🟢 ACCEPTED & FROZEN
Phase 1.13.4 — Staff Workspace UI Feature                       🟢 ACCEPTED & FROZEN
Phase 1.13.5 — UX, Accessibility & Workflow Testing              🟢 ACCEPTED & FROZEN
                 ↓
Phase 1.13.6 — Phase 1.13 Acceptance Gate & Freeze              🟢 ACCEPTED & FROZEN
```

---

## 3. Implemented Endpoints & Validators

| HTTP Method | Route Endpoint | Purpose | Capability Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/staff` | List staff memberships with role/status query filters | `staff:read` |
| `POST` | `/api/v1/staff` | Invite/add new staff member | `staff:invite` |
| `POST` | `/api/v1/staff/invite` | Explicit endpoint to invite/add new staff member | `staff:invite` |
| `GET` | `/api/v1/staff/[id]` | Get staff membership details | `staff:read` |
| `PATCH` | `/api/v1/staff/[id]/role` | Update staff member role (`owner`, `teacher`, `assistant`) | `staff:role_change` (+ `institute:update` for owner) |
| `POST` | `/api/v1/staff/[id]/activate` | Activate staff member | `staff:update` |
| `POST` | `/api/v1/staff/[id]/suspend` | Suspend staff member | `staff:remove` |
| `DELETE` | `/api/v1/staff/[id]` | Remove staff membership | `staff:remove` |

---

## 4. Invariants & Security Rules

1. **Server Identity Authority**: Staff memberships are strictly scoped by `TenantContext.instituteId`. Client query or body overrides are ignored.
2. **Capability Protection**: All operations enforce capability assertions (`staff:read`, `staff:invite`, `staff:update`, `staff:remove`, `staff:role_change`).
3. **Self-Mutation Defense**: Users cannot alter their own role or remove their own active membership.
4. **Data Privacy Boundary**: `StaffMembershipDTO` excludes sensitive fields (passwords, MFA keys, auth tokens).
5. **Accessibility & Responsive Shell**: Modal dialogs conform to WAI-ARIA dialog patterns (Escape key dismissal, aria-modal, title ids) and list cards adapt seamlessly down to 375px viewports.

---

## 5. Phase 1.13 Final Acceptance Audit Report

- **Decision**: 🟢 **ACCEPTED & FROZEN**
- **Domain & Architecture Audit**: ADR-0016 fully compliant. `User` global identity is isolated from `InstituteMembership` tenant records. Lifecycle states (`active`, `suspended`, `removed`) strictly governed.
- **Security Audit (`STAFF-SEC-01..24`)**: 24/24 threat tests passing cleanly in `staff-security.test.ts`.
- **E2E & Accessibility Matrix**: 10/10 Playwright tests passing in `staff-workflow.spec.ts` (7/7) & `staff-accessibility.spec.ts` (3/3).
- **Quality Gate Results**:
  - `pnpm env:check` — PASSED
  - `pnpm db:validate` — PASSED
  - `pnpm db:health` — PASSED
  - `pnpm typecheck` — PASSED (13/13 packages, 0 errors)
  - `pnpm test` — PASSED (87/87 monorepo unit & integration tests)
  - `pnpm lint` — PASSED (0 errors)
  - `pnpm build` — PASSED (Clean Next.js & Turbo build)
- **Database Audit**: Schema modifications: 0, New migrations: 0, Schema drift: 0.
- **Git Commit**: `94127d5`
- **Working Tree**: Clean.
