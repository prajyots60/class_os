# Phase 1.13 — Staff UI & Onboarding Workflows Specification

- **Status**: 🟢 **Phase 1.13.0, 1.13.1, 1.13.2, 1.13.3 — COMPLETED**
- **Date**: 2026-08-12
- **Authors**: Senior Staff Architecture & Identity Team
- **Deciders**: Product & Engineering Core

---

## 1. Phase Objective

Phase 1.13 establishes the **Staff Management and Staff Onboarding Workflow** for CoachingOS.

It defines and implements:
- **Staff Aggregate Foundation**: Domain representation of staff members (`InstituteMembershipEntity` linked to `User`).
- **Staff Onboarding & Invitation**: Inviting new staff members by email and role (`owner`, `teacher`, `assistant`).
- **Role Assignment & RBAC Governance**: Role promotions and demotions under `staff:role_change` capability protection.
- **Membership Lifecycle Management**: Activation, suspension, and removal of staff memberships.
- **Protected API Boundary & Validators**: `/api/v1/staff` RESTful HTTP endpoints with strict Zod presentation validation.
- **Security Threat Matrix (STAFF-SEC-01..24)**: Adversarial security verification suite covering capability enforcement, tenant isolation, rate limiting, and DTO data privacy.

---

## 2. Subphase Roadmap

```text
Phase 1.13.0 — Staff Management Architecture & Contract Freeze   🟢 ACCEPTED & FROZEN
Phase 1.13.1 — Staff Management Domain & Application Layer       🟢 COMPLETED
Phase 1.13.2 — Staff Management API & Validators                 🟢 COMPLETED
Phase 1.13.3 — Staff Management Security & E2E Matrix            🟢 COMPLETED
                 ↓
Phase 1.13.4 — Staff Workspace UI Feature                       ⏳ NOT STARTED
Phase 1.13.5 — UX, Accessibility & Workflow Testing              ⏳ NOT STARTED
Phase 1.13.6 — Phase 1.13 Acceptance Gate & Freeze              ⏳ NOT STARTED
```

---

## 3. Implemented Endpoints & Validators

| HTTP Method | Route Endpoint | Purpose | Capability Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/staff` | List staff memberships with role/status query filters | `staff:read` |
| `POST` | `/api/v1/staff` | Invite new staff member | `staff:invite` |
| `POST` | `/api/v1/staff/invite` | Explicit endpoint to invite new staff member | `staff:invite` |
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
