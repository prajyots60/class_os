# ADR 0016: Staff Management & Onboarding Architecture

- **Status**: 🟢 **ACCEPTED & FROZEN** (Phase 1.13.0 Baseline)
- **Date**: 2026-08-12
- **Authors**: Senior Staff Architecture & Identity Team
- **Deciders**: Product & Engineering Core
- **Consulted**: SRS, SDD, DADD, ADR-0001, ADR-0006, ADR-0009, ADR-0010, ADR-0011, ADR-0012, ADR-0013
- **Informed**: All Implementation Engineers

---

## 1. Context & Problem Statement

CoachingOS has established multi-tenant identity boundaries, institute onboarding, parent CRM, student admission lifecycles, and academic course hierarchies (Phases 1.1–1.12). 

To operate a coaching institute effectively, institute founders (`owner`) must invite, assign roles to, manage, and audit staff members (`teacher`, `assistant`, `owner`).

### Architectural Requirements:
1. **Identity Sovereignty**: Staff members interact with CoachingOS using authentication accounts (Better Auth `User`), while their authority within a specific coaching institute is governed by tenant-scoped `InstituteMembership` records.
2. **Role & Capability Authorization**: Staff management must strictly reuse the existing capability-based RBAC engine (`AuthorizationEngine`) and canonical capability taxonomy (`staff:read`, `staff:invite`, `staff:update`, `staff:remove`, `staff:role_change`).
3. **Self-Mutation & Escalation Defense**: Staff members must be prevented from changing their own roles, escalating their privileges, or revoking their own active memberships to prevent accidental institute lockout.
4. **Tenant Scoping & Multi-Tenancy**: All staff management operations must resolve tenant identity exclusively via trusted server-side `TenantContext.instituteId`. Client-supplied request body or header overrides are strictly rejected.

---

## 2. Architectural Decisions

### Decision 1: Aggregate & Membership Boundary (`User ─── InstituteMembership`)

CoachingOS models staff members by linking global `User` accounts to tenant-scoped `InstituteMembership` entities (`role` = `'owner'` | `'teacher'` | `'assistant'`).

```text
       GLOBAL IDENTITY                               INSTITUTE TENANT
     ┌──────────────────┐                           ┌─────────────────┐
     │   User Account   │                           │ Institute Tenant│
     │ (Email / Auth)   │                           └────────┬────────┘
     └────────┬─────────┘                                    │
              │ 1                                            │ 1
              ▼                                              ▼
    ┌───────────────────────────────────────────────────────────────────┐
    │                     InstituteMembership Entity                   │
    │  - userId                                                         │
    │  - instituteId                                                    │
    │  - role: 'owner' | 'teacher' | 'assistant'                        │
    │  - status: 'active' | 'suspended' | 'removed'                     │
    └───────────────────────────────────────────────────────────────────┘
```

#### Boundary Invariants:
- A staff member's credentials and authentication are owned by Better Auth.
- A staff member's operational authority is governed by `InstituteMembershipEntity`.
- A user can belong to only one coaching institute as staff, or multiple institutes as a parent (via `InstituteParent`).

---

### Decision 2: Staff Membership Lifecycle

Staff membership follows a explicit lifecycle state machine:

```text
            ┌─────────┐
            │ invited │  (Optional pre-registration / pending state)
            └────┬────┘
                 │
                 ▼
            ┌─────────┐
            │ active  │  (Operational staff member with RBAC capabilities)
            └────┬────┘
                 │ ◄─────────────┐
                 │               │
                 ▼               │
            ┌─────────┐          │
            │suspended│ ─────────┘ (Temporarily deactivated)
            └────┬────┘
                 │
                 ▼
            ┌─────────┐
            │ removed │ (Soft-deleted historical record; immutable)
            └─────────┘
```

#### State Transition Rules:
- `active` ──► `suspended`: Staff member temporarily access-restricted.
- `suspended` ──► `active`: Staff member access restored.
- `active` / `suspended` ──► `removed`: Membership soft-archived.
- **Terminal State**: `removed` memberships cannot be reactivated or updated.

---

### Decision 3: Invitation & Onboarding Model

1. **Invitation Authority**: Inviting a new staff member requires `staff:invite` capability.
2. **User Identity Linking**:
   - If a `User` account with the target email exists in the database, `InviteStaffMemberUseCase` attaches or verifies `InstituteMembership` for `instituteId`.
   - If no `User` account exists, a placeholder/invited identity record is created with `status: 'active'` or `'invited'` ready for Better Auth sign-up completion.
3. **Duplicate Protection**: Inviting an existing active staff member returns `409 Conflict`.

---

### Decision 4: Role Assignment & Self-Escalation Defense

1. **Allowed Roles**: `owner`, `teacher`, `assistant`.
2. **Capability Protection**:
   - Updating staff roles requires `staff:role_change` capability.
   - Promoting a staff member to `owner` requires `institute:update` capability in addition to `staff:role_change`.
3. **Self-Mutation Defense**:
   - Staff members CANNOT change their own role (`tenantContext.userId !== target.userId`).
   - Staff members CANNOT suspend or remove their own active membership.
   - An institute MUST maintain at least 1 active `owner` membership at all times.

---

### Decision 5: Capabilities & RBAC Integration

Staff operations map directly to the canonical capability registry:

| Capability | Resource | Action | Description | Allowed Roles |
| :--- | :--- | :--- | :--- | :--- |
| `staff:read` | `staff` | `read` | List and view staff member profiles | `owner`, `assistant` |
| `staff:invite` | `staff` | `invite` | Invite new staff members | `owner` |
| `staff:update` | `staff` | `update` | Update staff details / activate / suspend | `owner` |
| `staff:remove` | `staff` | `remove` | Remove staff membership | `owner` |
| `staff:role_change` | `staff` | `role_change` | Change staff member role | `owner` |

---

### Decision 6: Threat Matrix (STAFF-01 .. 14)

| Threat ID | Threat Category | Defense Mechanism |
| :--- | :--- | :--- |
| **STAFF-01** | Unauthenticated | `requireAuthSession` hard-guard returning HTTP 401. |
| **STAFF-02** | Authorization | Missing `staff:read` / `staff:invite` capability throws 403. |
| **STAFF-03** | Cross-Tenant | Target membership in Tenant B accessed by Tenant A context throws 404/403. |
| **STAFF-04** | Duplicate Invite | Re-inviting active staff member returns 409 Conflict. |
| **STAFF-05** | Invalid Transition | Mutating `removed` staff membership throws `ValidationError`. |
| **STAFF-06** | Role Escalation | Assistant attempting to promote user to `owner` throws 403. |
| **STAFF-07** | Self Role Escalation | User attempting to change their own role throws `AuthorizationError`. |
| **STAFF-08** | Unauthorized Removal | Non-owner attempting to remove staff throws 403. |
| **STAFF-09** | Unauthorized Status | Non-owner attempting to suspend staff throws 403. |
| **STAFF-10** | Tenant Spoofing | Client-supplied `instituteId` override is ignored; derived from session. |
| **STAFF-11** | Data Leakage | DTO strips password hashes, MFA keys, OAuth tokens, session secrets. |
| **STAFF-12** | Inactive Access | Suspended/removed staff context rejected during session resolution. |
| **STAFF-13** | Role Mutation | Valid role update emits `identity.staff.role_updated` audit event. |
| **STAFF-14** | Lifecycle Transition | Valid status change emits `identity.staff.status_changed` audit event. |

---

## 3. Consequences & Status

- **Status**: 🟢 **ACCEPTED & FROZEN** (Phase 1.13.0 Baseline)
- **Runtime Code Impact**: Implemented in Phase 1.13.1.
- **Next Phase**: Phase 1.13.1 (Staff Management Domain & Application Layer).
