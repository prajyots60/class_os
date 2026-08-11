# ADR-0011: Student Admission & Profile Core Architecture

- **Status**: 🟢 **ACCEPTED & FROZEN**
- **Date**: 2026-08-11
- **Deciders**: Senior Staff Identity & Student Architecture Team
- **Consulted**: SRS, SDD, DADD, Engineering Playbook
- **Informed**: Core Engineering Team

---

## 1. Context & Problem Statement

CoachingOS requires a multi-tenant domain aggregate to represent enrolled and admitted learners (**Student**) within coaching institutes.

Key architectural challenges:
1. **Tenant Scoping vs Global Identity**: `ParentIdentity` (Phase 1.6) is global platform identity. `InstituteParent` (Phase 1.7) is tenant parent CRM. How should `Student` be scoped?
2. **Guardian Decoupling**: How should students relate to parents/guardians without hardcoding parent fields inside student profiles?
3. **Academic Decoupling**: How should student identity relate to programs, batches, and fee enrollment without coupling learner profiles to academic structures?
4. **Human Identifier Strategy**: How should institutes identify students in a collision-free, human-readable manner?

---

## 2. Architectural Decisions

### Decision 1: Student is Strictly Tenant-Scoped
`Student` is an institute-bound domain aggregate. Every Student record **MUST** contain a mandatory `instituteId` referencing `Institute.id`. Students do **NOT** possess global platform identities in Phase 1.8.

### Decision 2: Decoupled Guardian Architecture (Phase 1.9 Separation)
`Student` aggregates contain zero parent/guardian fields (`fatherName`, `motherPhone`, `parentId`). Relationships between `Student` and `InstituteParent` / `ChildProfile` are delegated to Phase 1.9 junction entities (`InstituteParentStudent` and `StudentLink`).

### Decision 3: Decoupled Academic Architecture (Phase 1.10 & 1.11 Separation)
`Student` aggregates contain zero academic fields (`programId`, `batchId`, `subjectId`). Academic participation is managed strictly via `Enrollment` aggregates in Phase 1.11.

### Decision 4: Composite Uniqueness for Admission Numbers
`admissionNumber` is a human-readable identifier scoped per institute. Database uniqueness is enforced via:
```sql
@@unique([instituteId, admissionNumber], name: "student_admission_number_unique")
```

### Decision 5: Session-Derived Tenant Authorization
Client-supplied `instituteId`, `tenantId`, or role parameters in body payloads, query parameters, or custom HTTP headers are **strictly ignored**. Server-side `TenantContext` resolved from authenticated session cookies is the sole authority for tenant isolation.

---

## 3. Consequences

### Positive
- **Multi-Tenant Safety**: Absolute isolation guaranteed at domain, application, database, and API layers.
- **Domain Clarity**: Student entity represents the learner, free of academic or guardian clutter.
- **Future Extensibility**: Independent evolution of Phase 1.9 (Guardians), Phase 1.10 (Academics), and Phase 1.11 (Enrollment).
- **Audit Compliance**: Immutable UUID primary keys with human-readable, institute-scoped admission numbers.

### Negative / Trade-Offs
- Direct queries for "a student and their parents" require explicit repository joins in application use cases.
- Multi-institute student transfers require creating distinct `Student` records per tenant.

---

## 4. Compliance & Verification

1. **Schema Verification**: Prisma schema will enforce `instituteId` foreign key and composite unique index.
2. **Authorization Verification**: Use cases will require `student:read`, `student:create`, `student:update`, or `student:archive` capabilities.
3. **Multi-Tenant Security Suite**: Automated Playwright E2E matrix (`student-security.spec.ts`) will test unauthenticated 401s, RBAC 403s, and cross-tenant 404 barriers.
