# Phase 1.13 — Staff UI & Onboarding Workflows Specification

- **Status**: 🟢 **Phase 1.13.0 & 1.13.1 — COMPLETED**
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
- **Staff Management Workspace**: Accessible, responsive UI for staff administration.

---

## 2. Subphase Roadmap

```text
Phase 1.13.0 — Staff Management Architecture & Contract Freeze   🟢 ACCEPTED & FROZEN
Phase 1.13.1 — Staff Management Domain & Application Layer       🟢 COMPLETED
                 ↓
Phase 1.13.2 — Staff Management API & Validators                 ⏳ UPCOMING
Phase 1.13.3 — Staff Management Security & E2E Matrix            ⏳ UPCOMING
Phase 1.13.4 — Staff Workspace UI Feature                       ⏳ UPCOMING
Phase 1.13.5 — UX, Accessibility & Workflow Testing              ⏳ UPCOMING
Phase 1.13.6 — Phase 1.13 Acceptance Gate & Freeze              ⏳ UPCOMING
```

---

## 3. Invariants & Security Rules

1. **Server Identity Authority**: Staff memberships are strictly scoped by `TenantContext.instituteId`. Client query or body overrides are ignored.
2. **Capability Protection**: All operations enforce capability assertions (`staff:read`, `staff:invite`, `staff:update`, `staff:remove`, `staff:role_change`).
3. **Self-Mutation Defense**: Users cannot alter their own role or remove their own active membership.
4. **Data Privacy Boundary**: `StaffMembershipDTO` excludes sensitive fields (passwords, MFA keys, auth tokens).
