# Phase 1.3 — Capability-Based RBAC Architecture Contract

**Status:** Architecture Freeze  
**Milestone:** Phase 1.3.0 — RBAC Architecture & Capability Matrix  
**Target:** Establish a secure, extensible, capability-based authorization engine for CoachingOS without scattering `if (role === '...')` checks across business logic.

---

## 1. Architectural Philosophy & Principles

1. **Role is Organizational Identity, Capability is Authorization**:
   - Application use cases test for explicit capabilities (`authorize(context, 'homework.create')` or `requireCapability('staff.invite')`).
   - Capabilities are derived dynamically from the authenticated user's `MembershipRole` (`owner`, `teacher`, `assistant`, `parent`) inside the current `TenantContext`.
   - **NEVER** write `if (role === 'teacher')` or `if (role === 'owner')` in use cases, domain entities, or presentation controllers.
2. **RBAC Externally + Capability-Based Internally**:
   - Predefined institute membership roles map to static capability sets in code today (`ROLE_CAPABILITIES`).
   - The engine is designed so future database-backed custom roles can be plugged in without changing any application authorization checks.
3. **CoachingOS Platform Administration ≠ Institute Staff Authorization**:
   - Platform superadmins operate outside institute membership roles. Institute RBAC governs only institute staff (`owner`, `teacher`, `assistant`) and guardians (`parent`). No `admin` or `super_admin` role inside institute RBAC.
4. **Deny-by-Default Security Model**:
   - Unless a capability is explicitly granted to a role by the Capability Engine, access is rejected with `AuthorizationError("Permission denied: Missing required capability '[capability]'")`.
   - Unknown capabilities, missing policies, or unassigned roles MUST result in `DENY`.
5. **Capability ≠ Unrestricted Resource Access**:
   - A capability grants the actor permission to *attempt* an operation.
   - Resource-level policies (e.g. parent linked child boundary, teacher assigned batch boundary) and domain invariants (e.g. owner cannot self-remove) operate as secondary policy checks.
6. **No Database Permission Tables (In Phase 1.3)**:
   - Capability mappings are defined in code (`ROLE_CAPABILITIES`). Zero DB joins, zero migration overhead, 100% type-safe, version-controlled, and deterministic.

---

## 2. Standardized Capability Taxonomy (`resource:action`)

Capabilities are strongly-typed string literals defined using the `<resource>:<action>` taxonomy:

### A. Institute Management (`institute:*`, `settings:*`, `branding:*`)
- `institute:read`: View institute profile details and status.
- `institute:update`: Update core institute details (name, contact, timezone).
- `institute:archive`: Archive or deactivate institute (restricted to owner).
- `settings:read`: View institute operational settings.
- `settings:update`: Modify institute operational settings.
- `branding:read`: View custom white-label branding configurations.
- `branding:update`: Modify institute fonts, colors, logos, PWA assets.

### B. Staff & Membership Management (`staff:*`)
- `staff:read`: View staff directory and membership roles.
- `staff:invite`: Create staff memberships and send invitations.
- `staff:update`: Modify staff member profile details.
- `staff:remove`: Remove or deactivate staff memberships.
- `staff:role_change`: Change membership role of staff members.

### C. Student & Guardian Management (`student:*`)
- `student:read`: View student profiles and details. *(Parent/Teacher resource-scoped)*
- `student:create`: Admit new students into the institute.
- `student:update`: Modify student profiles and batch assignments.
- `student:archive`: Withdraw or archive a student profile.

### D. Academic Hierarchy & Attendance (`academic:*`, `attendance:*`)
- `academic:read`: View programs, subjects, batches, and schedules.
- `academic:write`: Create and modify programs, subjects, batches, schedules.
- `attendance:read`: View attendance records. *(Parent/Teacher resource-scoped)*
- `attendance:mark`: Take initial attendance for a session.
- `attendance:update`: Edit existing attendance session records.
- `attendance:correct`: Make official attendance corrections.

### E. Homework & Examinations (`homework:*`, `test:*`, `marks:*`)
- `homework:read`: View homework assignments and submissions. *(Parent resource-scoped)*
- `homework:create`: Create new homework assignments.
- `homework:update`: Edit existing homework assignments.
- `homework:delete`: Remove homework assignments.
- `test:read`: View test schedules and gradebooks. *(Parent resource-scoped)*
- `test:create`: Create new test schedules.
- `test:update`: Modify test schedules.
- `test:delete`: Remove test schedules.
- `marks:read`: View test marks and grade cards. *(Parent resource-scoped)*
- `marks:create`: Enter initial test marks.
- `marks:update`: Edit entered test marks.
- `marks:delete`: Delete test marks.
- `marks:publish`: Formally publish test marks to parents/students.

### F. Billing, Invoices & Financials (`billing:*`, `payment:*`, `receipt:*`)
- `billing:read`: View fee structures and invoice summaries. *(Parent resource-scoped)*
- `billing:create`: Create fee structures and assign invoices.
- `billing:update`: Modify fee structures and invoice terms.
- `billing:cancel`: Void or cancel invoices.
- `payment:read`: View payment transaction history. *(Parent resource-scoped)*
- `payment:record`: Record offline fee payment transactions.
- `receipt:read`: View payment receipts. *(Parent resource-scoped)*
- `receipt:issue`: Generate and issue official payment receipts.

### G. Communication & Audit (`announcement:*`, `audit:*`)
- `announcement:read`: View institute announcements.
- `announcement:create`: Draft announcements.
- `announcement:update`: Modify draft announcements.
- `announcement:delete`: Delete announcements.
- `announcement:publish`: Broadcast announcements to parents/students.
- `audit:read`: View institute audit logs and security trails.

---

## 3. Authoritative Role → Capability Matrix (Phase 1.3)

| Capability | `owner` | `teacher` | `assistant` | `parent` |
| :--- | :---: | :---: | :---: | :---: |
| `institute:read` | ✅ | ✅ | ✅ | — |
| `institute:update` | ✅ | — | — | — |
| `institute:archive` | ✅ | — | — | — |
| `staff:read` | ✅ | — | ✅ | — |
| `staff:invite` | ✅ | — | — | — |
| `staff:update` | ✅ | — | — | — |
| `staff:remove` | ✅ | — | — | — |
| `staff:role_change` | ✅ | — | — | — |
| `student:read` | ✅ | ✅ *(Scoped)* | ✅ | ✅ *(Scoped)* |
| `student:create` | ✅ | — | ✅ | — |
| `student:update` | ✅ | ✅ *(Scoped)* | ✅ | — |
| `student:archive` | ✅ | — | — | — |
| `academic:read` | ✅ | ✅ | ✅ | ✅ |
| `academic:write` | ✅ | ✅ | ✅ | — |
| `attendance:read` | ✅ | ✅ | ✅ | ✅ *(Scoped)* |
| `attendance:mark` | ✅ | ✅ | ✅ | — |
| `attendance:update` | ✅ | ✅ | — | — |
| `attendance:correct` | ✅ | ✅ | — | — |
| `homework:read` | ✅ | ✅ | ✅ | ✅ *(Scoped)* |
| `homework:create` | ✅ | ✅ | — | — |
| `homework:update` | ✅ | ✅ | — | — |
| `homework:delete` | ✅ | ✅ | — | — |
| `test:read` | ✅ | ✅ | ✅ | ✅ *(Scoped)* |
| `test:create` | ✅ | ✅ | — | — |
| `test:update` | ✅ | ✅ | — | — |
| `test:delete` | ✅ | ✅ | — | — |
| `marks:read` | ✅ | ✅ | ✅ | ✅ *(Scoped)* |
| `marks:create` | ✅ | ✅ | — | — |
| `marks:update` | ✅ | ✅ | — | — |
| `marks:delete` | ✅ | ✅ | — | — |
| `marks:publish` | ✅ | ✅ | — | — |
| `billing:read` | ✅ | — | ✅ | ✅ *(Scoped)* |
| `billing:create` | ✅ | — | — | — |
| `billing:update` | ✅ | — | ✅ | — |
| `billing:cancel` | ✅ | — | — | — |
| `payment:read` | ✅ | — | ✅ | ✅ *(Scoped)* |
| `payment:record` | ✅ | — | ✅ | — |
| `receipt:read` | ✅ | — | ✅ | ✅ *(Scoped)* |
| `receipt:issue` | ✅ | — | ✅ | — |
| `announcement:read` | ✅ | ✅ | ✅ | ✅ |
| `announcement:create` | ✅ | ✅ | — | — |
| `announcement:update` | ✅ | ✅ | — | — |
| `announcement:delete` | ✅ | ✅ | — | — |
| `announcement:publish` | ✅ | ✅ | — | — |
| `settings:read` | ✅ | — | — | — |
| `settings:update` | ✅ | — | — | — |
| `branding:read` | ✅ | — | — | — |
| `branding:update` | ✅ | — | — | — |
| `audit:read` | ✅ | — | — | — |

*(Note: `Scoped` indicates that possessing the capability alone is insufficient; a secondary resource policy check is executed.)*

---

## 4. The 6-Step Authorization Decision Pipeline

```text
Authorization Request (actor: TenantContext, capability: Capability, resource?: ResourceContext)
                                       │
  ┌────────────────────────────────────┴────────────────────────────────────┐
  ▼                                                                         ▼
[Check 1: Authentication]  Is session valid & active?               (No → UnauthorizedError)
  │
  ▼
[Check 2: Membership]      Is membership active (not suspended/removed)? (No → AuthorizationError)
  │
  ▼
[Check 3: Tenant Isolation] Does resource match current instituteId? (No → AuthorizationError)
  │
  ▼
[Check 4: Capability]      Does role possess required capability?   (No → AuthorizationError)
  │
  ▼
[Check 5: Resource Policy] Is specific resource accessible?        (No → AuthorizationError)
  │
  ▼
[Check 6: State Policy]    Is operation valid for current state?    (No → ValidationError)
  │
  ▼
ALLOW EXECUTION
```

---

## 5. Phase 1.3 Execution Plan & Subphase Sequence

```text
Phase 1.3.0 — Architecture Freeze & Capability Matrix Contract  ✅ COMPLETED
Phase 1.3.1 — Capability Taxonomy & Strongly-Typed Enums       ✅ COMPLETED
Phase 1.3.2 — Role → Capability Resolver Engine                 ✅ COMPLETED
Phase 1.3.3 — Authorization Engine & Assertion Guards           ✅ COMPLETED
Phase 1.3.4 — Tenant-Scoped Capability Evaluation               ✅ COMPLETED
Phase 1.3.5 — Resource-Scoped Filtering Helpers (Parent/Teacher) ✅ COMPLETED
Phase 1.3.6 — Identity Use Case Integration                     ✅ COMPLETED
Phase 1.3.7 — Security & RBAC Test Matrix                       ✅ COMPLETED
Phase 1.3.8 — Phase 1.3 Acceptance Gate                         🚧 NEXT TASK
```

---

## 6. Phase 1.3.6 — Identity Use Case Authorization Mapping

| Protected Use Case | Capability Required | Tenant Context Check | Escalation Guard |
| :--- | :--- | :--- | :--- |
| `GetInstituteUseCase` | `institute:read` | `context.instituteId === found.id` | N/A |
| `UpdateInstituteUseCase` | `institute:update` | `context.instituteId === command.id` | Checked BEFORE DB write |
| `ChangeInstituteStatusUseCase` | `institute:update` / `institute:archive` | `context.instituteId === command.id` | Checked BEFORE DB write |
| `CreateInstituteUseCase` | *Pre-tenant onboarding* | N/A (Initial creation flow) | Single owner bootstrapping |
| `GetInstituteMembersUseCase` | `staff:read` | `context.instituteId === query.instituteId` | N/A |
| `GetInstituteMembershipUseCase` | `staff:read` | `context.instituteId === found.instituteId` | N/A |
| `CreateInstituteMembershipUseCase` | `staff:invite` | `context.instituteId === props.instituteId` | Creating `owner` requires `institute:update` |
| `UpdateMembershipRoleUseCase` | `staff:role_change` | `context.instituteId === existing.instituteId` | Promotion to `owner` requires `institute:update` |
| `ChangeMembershipStatusUseCase` | `staff:remove` / `staff:update` | `context.instituteId === existing.instituteId` | Checked BEFORE DB write |
| `GetUserMembershipsUseCase` | Self-Service | `authenticatedUserId === query.userId` | Prevents cross-user enumeration |
| `ResolveInstituteMembershipUseCase` | Auth Gateway | Resolves active membership | Rejects suspended/removed memberships |

