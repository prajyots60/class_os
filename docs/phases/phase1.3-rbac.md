# Phase 1.3 — Capability-Based RBAC Architecture Contract

**Status:** Architecture Freeze  
**Milestone:** Phase 1.3.0 — RBAC Architecture & Capability Matrix  
**Target:** Establish a secure, extensible, capability-based authorization engine for CoachingOS without scattering `if (role === '...')` checks across business logic.

---

## 1. Architectural Philosophy & Principles

1. **Capability-Based Internally, Role-Based Initially**:
   - Application use cases test for explicit capabilities (`hasCapability('student:create')` or `requireCapability('staff:invite')`).
   - Capabilities are derived dynamically from the authenticated user's `MembershipRole` inside the current `TenantContext`.
   - **NEVER** write `if (role === 'owner')` in application use cases, domain entities, or presentation controllers.
2. **Deny-by-Default Security Model**:
   - Unless a capability is explicitly granted to a role by the Capability Engine, access is rejected with `AuthorizationError("Permission denied: Missing required capability '[capability]'")`.
3. **Tenant-Scoped Authorization**:
   - Authorization evaluation is strictly tenant-scoped (`TenantContext` + `Capability`).
   - Possessing a capability in Institute A does NOT grant authorization in Institute B.
4. **Framework-Independent & Extensible Engine**:
   - In Phase 1.3, capability sets per role are statically defined, strongly-typed, and versioned in code (`@coaching-os/identity`).
   - The engine interface is designed so that future database-driven custom roles can be plugged in without refactoring application use cases.

---

## 2. Capability Taxonomy (`resource:action`)

Capabilities are strongly-typed string literals defined using the `resource:action` taxonomy:

### A. Institute & Tenant Management (`institute:*`)
- `institute:read`: View institute profile details, settings, and status.
- `institute:update`: Update institute details, contact information, timezone, branding.
- `institute:delete`: Archive or deactivate institute (restricted to platform/owner).

### B. Staff & Member Management (`staff:*`)
- `staff:read`: View staff directory, roles, and membership statuses.
- `staff:invite`: Create new staff memberships and send invitations.
- `staff:update_role`: Change membership roles of existing staff.
- `staff:update_status`: Suspend, activate, or remove staff memberships.

### C. Student & Guardian Management (`student:*`)
- `student:read`: View student profiles, admission numbers, contact details.
- `student:create`: Create/admit new student profiles into the institute.
- `student:update`: Modify student profile information and batch assignments.
- `student:archive`: Archive or withdraw a student from the institute.

### D. Academic Hierarchy & Attendance (`academic:*`, `attendance:*`)
- `academic:read`: View programs, subjects, batches, and class schedules.
- `academic:write`: Create and modify programs, subjects, batches, schedules.
- `attendance:read`: View student attendance records and reports.
- `attendance:write`: Take or modify attendance sessions.

### E. Homework & Examinations (`homework:*`, `exam:*`)
- `homework:read`: View homework assignments and student submissions.
- `homework:write`: Create, edit, publish, or grade homework assignments.
- `exam:read`: View test schedules, marks, and gradebooks.
- `exam:write`: Create tests, enter marks, and generate report cards.

### F. Billing, Invoices & Financials (`billing:*`)
- `billing:read`: View fee structures, invoices, payment history, receipts.
- `billing:write`: Create fee structures, generate invoices, record payments.

### G. Communication & Announcements (`communication:*`)
- `communication:read`: View institute announcements and notification logs.
- `communication:write`: Publish announcements and send multi-channel notifications.

---

## 3. Canonical Role → Capability Matrix

| Capability | `owner` | `teacher` | `assistant` | `parent` |
| :--- | :---: | :---: | :---: | :---: |
| `institute:read` | ✅ | ✅ | ✅ | ✅ |
| `institute:update` | ✅ | ❌ | ❌ | ❌ |
| `institute:delete` | ✅ | ❌ | ❌ | ❌ |
| `staff:read` | ✅ | ✅ | ✅ | ❌ |
| `staff:invite` | ✅ | ❌ | ❌ | ❌ |
| `staff:update_role` | ✅ | ❌ | ❌ | ❌ |
| `staff:update_status` | ✅ | ❌ | ❌ | ❌ |
| `student:read` | ✅ | ✅ | ✅ | ✅ *(Scoped)* |
| `student:create` | ✅ | ❌ | ✅ | ❌ |
| `student:update` | ✅ | ❌ | ✅ | ❌ |
| `student:archive` | ✅ | ❌ | ❌ | ❌ |
| `academic:read` | ✅ | ✅ | ✅ | ✅ |
| `academic:write` | ✅ | ✅ | ✅ | ❌ |
| `attendance:read` | ✅ | ✅ | ✅ | ✅ *(Scoped)* |
| `attendance:write` | ✅ | ✅ | ✅ | ❌ |
| `homework:read` | ✅ | ✅ | ✅ | ✅ *(Scoped)* |
| `homework:write` | ✅ | ✅ | ❌ | ❌ |
| `exam:read` | ✅ | ✅ | ✅ | ✅ *(Scoped)* |
| `exam:write` | ✅ | ✅ | ❌ | ❌ |
| `billing:read` | ✅ | ❌ | ❌ | ✅ *(Scoped)* |
| `billing:write` | ✅ | ❌ | ❌ | ❌ |
| `communication:read` | ✅ | ✅ | ✅ | ✅ |
| `communication:write` | ✅ | ✅ | ✅ | ❌ |

*(Note: Parent capabilities are automatically resource-scoped to their linked child profiles.)*

---

## 4. Evaluation Engine Architecture

```text
                  TenantContext (userId, instituteId, membershipId, role, status)
                                       │
                                       ▼
                       CapabilityResolver.getCapabilities(role)
                                       │
                                       ▼
                          Set<Capability> (Read-only)
                                       │
                                       ▼
            AuthorizationEngine.evaluate(tenantContext, requiredCapability)
                                       │
                         ┌─────────────┴─────────────┐
                         ▼                           ▼
                     ALLOWED                      DENIED
             (Proceed to Use Case)       (Throw AuthorizationError)
```

### Core Authorization Engine API Contract

```ts
export type Capability =
  | 'institute:read'
  | 'institute:update'
  | 'institute:delete'
  | 'staff:read'
  | 'staff:invite'
  | 'staff:update_role'
  | 'staff:update_status'
  | 'student:read'
  | 'student:create'
  | 'student:update'
  | 'student:archive'
  | 'academic:read'
  | 'academic:write'
  | 'attendance:read'
  | 'attendance:write'
  | 'homework:read'
  | 'homework:write'
  | 'exam:read'
  | 'exam:write'
  | 'billing:read'
  | 'billing:write'
  | 'communication:read'
  | 'communication:write';

export class AuthorizationEngine {
  public static getCapabilitiesForRole(role: MembershipRole): Set<Capability>;
  public static hasCapability(context: TenantContext, capability: Capability): boolean;
  public static hasAllCapabilities(context: TenantContext, capabilities: Capability[]): boolean;
  public static hasAnyCapability(context: TenantContext, capabilities: Capability[]): boolean;
  public static requireCapability(context: TenantContext, capability: Capability): void;
}
```

---

## 5. Phase 1.3 Execution Plan & Subphase Sequence

```text
Phase 1.3.0 — Architecture Freeze & Capability Matrix Contract  ✅ COMPLETED
Phase 1.3.1 — Capability Taxonomy & Strongly-Typed Enums
Phase 1.3.2 — Role → Capability Resolver Engine
Phase 1.3.3 — Authorization Engine & Assertion Guards
Phase 1.3.4 — Tenant-Scoped Capability Evaluation
Phase 1.3.5 — Resource-Scoped Filtering Helpers (Parent / Teacher boundaries)
Phase 1.3.6 — Identity Use Case Integration (Institute, Membership, Staff)
Phase 1.3.7 — Security & RBAC Test Matrix (Unit, PostgreSQL, Security)
Phase 1.3.8 — Phase 1.3 Acceptance Gate
```
