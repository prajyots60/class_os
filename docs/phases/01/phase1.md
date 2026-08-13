# Phase 1.0 — Domain & Architecture Contract

**Status:** Architecture freeze  
**Purpose:** Define exactly what Phase 1 owns, how entities interact, what invariants cannot be violated, and what the implementation agent must follow.

---

# 1. Phase 1 Objective

Phase 1 is the **Identity Module** of CoachingOS.

Its job is to establish:

> **Who is using CoachingOS, which institute they belong to, which students exist inside that institute, who their guardians are, and how students are organized academically.**

At the end of Phase 1, a real coaching institute must be able to:

```text
Create account
    ↓
Create institute
    ↓
Become institute owner
    ↓
Configure institute
    ↓
Add staff
    ↓
Assign permissions
    ↓
Create academic structure
    ↓
Create student
    ↓
Create/link guardian
    ↓
Enroll student into batch
```

That is our **Phase 1 business acceptance workflow**.

---

# 2. What Phase 1 Owns

```text
┌──────────────────────────────────────────────┐
│                 PHASE 1                      │
│              Identity Module                 │
├──────────────────────────────────────────────┤
│                                              │
│  Institute / Tenant                          │
│  User / Membership                           │
│  Roles / Permissions                         │
│  Institute Onboarding                        │
│  Institute Settings                          │
│  Institute Branding                          │
│                                              │
│  ParentIdentity                              │
│  ChildProfile                                │
│  InstituteParent                             │
│  Student                                     │
│  StudentLink                                 │
│  Guardian relationships                      │
│                                              │
│  Program                                     │
│  Subject                                     │
│  Batch                                       │
│  Enrollment                                  │
│                                              │
└──────────────────────────────────────────────┘
```

## Explicitly NOT Phase 1

```text
Attendance       → Phase 2
Homework         → Phase 2
Tests / Marks    → Phase 2
Billing          → Phase 3
Communication    → Phase 4
Parent PWA       → Phase 5
Advanced UX      → Phase 6
Production Beta  → Phase 7
```

This boundary is important.

We don't build an attendance system while implementing students merely because the tables already exist.

---

# 3. Core Architectural Principle

The most important rule of Phase 1:

> **Platform identity and institute identity are different concepts.**

We have two worlds.

### Platform world

Owned by CoachingOS:

```text
ParentIdentity
     │
     ├── InstituteMembership
     │
     └── ChildProfile
```

### Institute world

Owned by an individual coaching institute:

```text
Institute
   │
   ├── User
   ├── InstituteParent
   ├── Student
   ├── Program
   ├── Subject
   ├── Batch
   └── Enrollment
```

The two worlds connect through carefully defined links.

---

# 4. Multi-Tenancy Contract

Every institute is a **tenant**.

```text
Institute A
├── Users
├── Parents
├── Students
├── Programs
├── Subjects
├── Batches
└── Enrollments

Institute B
├── Users
├── Parents
├── Students
├── Programs
├── Subjects
├── Batches
└── Enrollments
```

Institute A must never be able to access Institute B's tenant data.

## Non-negotiable invariant

For every tenant-owned entity:

```text
request
   ↓
authenticated user
   ↓
institute membership
   ↓
resolved instituteId
   ↓
repository/use-case
   ↓
query scoped by instituteId
```

Never:

```ts
prisma.student.findUnique({
  where: { id },
});
```

when the operation is tenant-sensitive.

Instead the effective authorization must establish:

```text
student.id
AND
student.institute_id === currentInstituteId
```

---

# 5. Tenant Context

We need one canonical tenant context.

Conceptually:

```ts
interface TenantContext {
  userId: string;
  instituteId: string;
  role: InstituteRole;
}
```

The application layer should not repeatedly reconstruct this information from arbitrary request data.

The context comes from authenticated session + membership.

### Critical rule

**Never trust `instituteId` supplied by the browser as authorization.**

For example, this is insufficient:

```http
POST /api/v1/students
{
  "instituteId": "some-id"
}
```

The server must determine whether the authenticated user actually has access to that institute.

---

# 6. Institute Model

The institute is the tenant root.

```text
Institute
│
├── identity
├── contact
├── lifecycle status
├── settings
└── branding
```

Responsibilities:

- create institute
- retrieve institute
- update institute
- lifecycle management
- current tenant resolution

### Institute lifecycle

Use the existing status model rather than inventing a second lifecycle system.

Conceptually:

```text
ACTIVE
SUSPENDED
...
```

The exact enum remains the canonical Prisma definition already established in Phase 0.

---

# 7. User vs Membership

This distinction is extremely important.

## User

Represents:

> "Who is this person?"

```text
User
├── id
├── name
├── email
├── phone
├── status
└── authentication identity
```

## InstituteMembership

Represents:

> "What relationship does this person have with this institute?"

```text
User
      │
      ▼
InstituteMembership
      │
      ├── Institute
      └── Role
```

Therefore:

**User ≠ Institute membership.**

A user may eventually belong to multiple institutes.

---

# 8. Initial Staff Roles

Phase 1 starts with:

```text
OWNER
TEACHER
ASSISTANT
```

And later:

```text
PARENT
```

is handled through the parent-facing architecture rather than treating the parent exactly like an institute staff member.

The role system must be permission-oriented.

Avoid scattering:

```ts
if (user.role === 'OWNER')
```

through business logic.

Instead:

```text
Role
 ↓
Permission
 ↓
Use case authorization
```

---

# 9. Permission Model

We establish permissions around capabilities.

For example:

```text
institute.read
institute.update

staff.read
staff.invite
staff.update

student.read
student.create
student.update
student.archive

parent.read
parent.create
parent.update

program.read
program.create
program.update

subject.read
subject.create
subject.update

batch.read
batch.create
batch.update

enrollment.read
enrollment.create
enrollment.update
```

The exact final permission catalogue should be derived during 1.3 rather than inventing hundreds of permissions now.

The principle is:

> **Authorization is capability based, not UI based.**

---

# 10. ParentIdentity Architecture

This is one of the most important decisions we have already made.

## Global parent identity

```text
ParentIdentity
```

belongs to the **CoachingOS platform**, not an institute.

It is phone-anchored.

```text
ParentIdentity
      │
      ├── InstituteMembership
      │
      └── ChildProfile
```

It must **not** contain:

```text
institute_id
```

because the same parent may interact with multiple coaching institutes.

---

# 11. ChildProfile

A `ChildProfile` is also platform-level.

It represents:

> "A child/student profile that this parent manages across CoachingOS."

This gives us the OTT-like profile concept we discussed.

Example:

```text
ParentIdentity
│
├── ChildProfile: Aarav
├── ChildProfile: Ananya
└── ChildProfile: Riya
```

Later:

```text
Aarav
 ├── Sharma Physics Classes
 ├── Allen-like Institute
 └── Coding Academy
```

The platform does **not** automatically assume that two institute students are the same real-world child.

That would be dangerous.

---

# 12. Student Linking Contract

We already chose the safer model:

```text
ChildProfile
      │
      ▼
StudentLink
      │
      ▼
Student
```

This means:

```text
Parent says:
"This institute's student is my Aarav."
```

rather than:

```text
CoachingOS says:
"These two students have the same name/phone,
therefore they must be the same child."
```

### Critical rule

**No automatic cross-institute student identity matching in Phase 1.**

This avoids false identity merges.

---

# 13. InstituteParent

`InstituteParent` is the institute's local representation of a parent/guardian.

```text
ParentIdentity
      │
      │ optional platform relationship
      ▼
InstituteParent
      │
      ▼
Student
```

The institute can store its operational guardian information without exposing the global platform identity model.

This gives us:

```text
Platform identity
        ≠
Institute CRM/contact record
```

---

# 14. Student

Student is an **institute-owned entity**.

```text
Institute
    │
    └── Student
```

A student belongs to an institute.

Student fields should represent the institute's academic/operational record.

Examples:

```text
admission number
name
status
contact information
academic metadata
```

But we should avoid turning `Student` into a global CoachingOS identity.

---

# 15. Guardian Relationship

The relationship should support:

```text
One parent → multiple students

One student → multiple guardians
```

Example:

```text
Parent A ─────┐
              ├── Student 1
Parent B ─────┘

Parent A ───────── Student 2
```

This matters for:

- father + mother
- guardian + parent
- siblings
- multiple children in the same institute

The relationship itself should carry the appropriate `Relation` semantics already present in the schema.

---

# 16. Academic Hierarchy

Phase 1 establishes:

```text
Institute
    │
    ├── Program
    │
    └── Subject
            │
            └── Batch
```

But **Program is optional**.

Therefore:

```text
Program
   ↓
Subject
```

is valid.

And:

```text
Subject
   ↓
Batch
```

is also valid without a Program.

That preserves the schema decision already made.

---

# 17. Subject Contract

Subject is scoped to institute.

Uniqueness:

```text
(instituteId, name)
```

Therefore:

```text
Institute A → Physics
Institute B → Physics
```

is perfectly valid.

But:

```text
Institute A → Physics
Institute A → Physics
```

should not create duplicate subjects under the defined uniqueness rule.

---

# 18. Batch Contract

Batch belongs to a subject.

Canonical uniqueness:

```text
(instituteId, subjectId, name)
```

Therefore:

```text
Physics
 ├── Morning
 └── Evening
```

is valid.

And another subject can also have:

```text
Mathematics
 └── Morning
```

because the uniqueness is scoped to subject.

---

# 19. Enrollment Contract

Enrollment is the operational bridge:

```text
Student
   +
Batch
   ↓
Enrollment
```

Do **not** put batch-specific operational state directly on Student.

A student can have:

```text
Aarav
 ├── Physics Morning
 ├── Mathematics Evening
 └── Chemistry Weekend
```

Each relationship is represented through Enrollment.

This becomes extremely important later when Academics and Billing are implemented.

---

# 20. Enrollment Lifecycle

We already have the canonical lifecycle/status model.

Conceptually:

```text
PENDING
   ↓
ACTIVE
   ↓
COMPLETED

       ↘
       CANCELLED
```

The exact allowed transitions should be enforced in the domain/use-case layer rather than allowing arbitrary status updates.

---

# 21. Domain Boundaries

Our package boundaries now become meaningful.

```text
@coaching-os/identity
        │
        ├── Institute
        ├── Membership
        ├── RBAC
        ├── Parent
        ├── Student
        ├── Academic organization
        └── Enrollment
```

`@coaching-os/identity` remains framework-independent.

It should **not** import:

```text
Next.js
React
Prisma
Pino
Better Auth
```

Instead:

```text
Web
 │
 ▼
Application/use-case boundary
 │
 ▼
Identity domain
 │
 ▼
Infrastructure adapters
```

---

# 22. Dependency Direction

This is our Phase 1 dependency rule:

```text
                ┌───────────────┐
                │   Next.js     │
                │     Web       │
                └───────┬───────┘
                        │
                        ▼
                ┌───────────────┐
                │ Application   │
                │ / Use Cases   │
                └───────┬───────┘
                        │
                        ▼
                ┌───────────────┐
                │   Identity    │
                │    Domain     │
                └───────┬───────┘
                        │
             interfaces │
                        ▼
                ┌───────────────┐
                │ Infrastructure│
                │   Adapters    │
                └───────────────┘
```

The domain does not know Prisma exists.

---

# 23. Database Rule

Phase 0 already created the schema.

Therefore:

> **Do not redesign the database simply because we're starting Phase 1.**

First implementation step is to inspect the existing schema and map it to the domain contract.

If a genuine Phase 1 requirement exposes a schema deficiency:

```text
Requirement
   ↓
Architecture decision
   ↓
ADR if significant
   ↓
Prisma schema
   ↓
Migration
   ↓
Tests
```

No direct production database mutation.

---

# 24. API Architecture

All Phase 1 APIs use:

```text
/api/v1/...
```

Conceptually:

```text
/api/v1/institute
/api/v1/memberships
/api/v1/staff
/api/v1/parents
/api/v1/students
/api/v1/programs
/api/v1/subjects
/api/v1/batches
/api/v1/enrollments
```

Every protected endpoint performs:

```text
Authentication
      ↓
Tenant resolution
      ↓
Authorization
      ↓
Input validation
      ↓
Use case
      ↓
Repository
      ↓
Response
```

---

# 25. Validation

Boundary validation uses **Zod**.

Example:

```text
HTTP request
     ↓
Zod schema
     ↓
validated DTO
     ↓
use case
```

Domain invariants should **not** rely solely on Zod.

For example:

> "A student cannot be enrolled twice in the same active batch."

That belongs in domain/use-case logic **and** should have database-level protection where appropriate.

---

# 26. Error Contract

Phase 0's error system remains canonical.

Use:

```text
ValidationError       → 400
AuthenticationError   → 401
AuthorizationError    → 403
NotFoundError         → 404
ConflictError         → 409
RateLimitError        → 429
InternalError         → 500
```

No new error architecture in Phase 1.

---

# 27. Security Contract

Every Phase 1 operation must satisfy:

```text
Authentication
        +
Authorization
        +
Tenant isolation
        +
Input validation
        +
Safe error handling
```

Especially:

### Never accept these as authoritative:

```text
instituteId from browser
userId from browser
role from browser
parentIdentityId from browser
```

They can be inputs/references, but authorization must independently verify ownership/access.

---

# 28. Audit Contract

Important identity operations should generate audit events.

Examples:

```text
institute.created
staff.invited
staff.role_changed
student.created
student.updated
student.archived
parent.created
parent.student_linked
parent.student_unlinked
batch.created
enrollment.created
enrollment.cancelled
```

But don't turn every database read into an audit log.

Audit logging should focus on meaningful security/business mutations.

---

# 29. Observability Contract

Use the Phase 0 infrastructure:

```text
logger
ErrorReporter
requestId
performance timing
structured events
```

Examples:

```text
identity.institute.create.success
identity.student.create.success
identity.student.create.failure
identity.enrollment.create.success
security.authorization.denied
```

No raw:

```text
password
OTP
parent phone
payment credentials
full request bodies
```

in logs.

---

# 30. Phase 1 Testing Pyramid

Every domain feature gets tests.

```text
                 E2E
                /   \
               /     \
        Integration  API
             /          \
            /            \
       Domain / Use-case
          /                \
       Unit tests      Repository tests
```

Minimum expectation:

### Unit

- domain rules
- status transitions
- permission evaluation
- validation

### Integration

- PostgreSQL
- Prisma repositories
- tenant isolation
- constraints

### E2E

At least the critical business journey:

```text
Owner signup
   ↓
Institute creation
   ↓
Academic setup
   ↓
Student creation
   ↓
Parent linking
   ↓
Enrollment
```

---

# 31. Phase 1 Security Test — Mandatory

We specifically test cross-tenant access.

### Setup

```text
Institute A
  Student A

Institute B
  Student B
```

Then:

```text
User A requests Student B
```

Expected:

```text
404 / authorization-safe failure
```

Not:

```text
Student B data
```

Likewise:

```text
User A → Batch B ❌
User A → Parent B ❌
User A → Enrollment B ❌
```

This is one of the most important tests in the entire system.

---

# 32. Phase 1.0 Deliverables

At the end of this architecture checkpoint, we have:

```text
✅ Domain boundaries
✅ Entity ownership
✅ Tenant model
✅ ParentIdentity model
✅ ChildProfile model
✅ Student model
✅ Guardian relationship
✅ Academic hierarchy
✅ Enrollment model
✅ RBAC direction
✅ API direction
✅ Security invariants
✅ Error contract
✅ Observability contract
✅ Testing contract
✅ Phase 1 acceptance workflow
```

---

# 33. Phase 1 Implementation Map

So when we move into actual coding, we're going to execute:

```text
                    PHASE 1
                       │
                       ▼
              ┌─────────────────┐
              │ 1.1 Institute   │
              │ Tenant Core     │
              └────────┬────────┘
                       ▼
              ┌─────────────────┐
              │ 1.2 Users +     │
              │ Memberships     │
              └────────┬────────┘
                       ▼
              ┌─────────────────┐
              │ 1.3 RBAC        │
              └────────┬────────┘
                       ▼
              ┌─────────────────┐
              │ 1.4 Onboarding  │
              └────────┬────────┘
                       ▼
              ┌─────────────────┐
              │ 1.5 Settings +  │
              │ Branding        │
              └────────┬────────┘
                       ▼
              ┌─────────────────┐
              │ 1.6 Parent      │
              │ Identity        │
              └────────┬────────┘
                       ▼
              ┌─────────────────┐
              │ 1.7 Institute   │
              │ Parent          │
              └────────┬────────┘
                       ▼
              ┌─────────────────┐
              │ 1.8 Students    │
              └────────┬────────┘
                       ▼
              ┌─────────────────┐
              │ 1.9 Guardian +  │
              │ Student Links   │
              └────────┬────────┘
                       ▼
              ┌─────────────────┐
              │ 1.10 Academic   │
              │ Organization    │
              └────────┬────────┘
                       ▼
              ┌─────────────────┐
              │ 1.11 Enrollment │
              └────────┬────────┘
                       ▼
              ┌─────────────────┐
              │ 1.12 APIs       │
              └────────┬────────┘
                       ▼
              ┌─────────────────┐
              │ 1.13 Staff UI   │
              └────────┬────────┘
                       ▼
              ┌─────────────────┐
              │ 1.14 Hardening  │
              └────────┬────────┘
                       ▼
              ┌─────────────────┐
              │ 1.15 PHASE GATE │
              └─────────────────┘
```

## One important implementation rule

We should **not give Antigravity one enormous "build Phase 1" prompt**.

We'll work in controlled vertical slices.

For each subphase:

```text
Architecture context
       ↓
Context-rich agent prompt
       ↓
Agent implementation
       ↓
Review generated diff
       ↓
Run verification
       ↓
Security review
       ↓
Commit
       ↓
Next subphase
```

That preserves the discipline we used throughout Phase 0 while still letting us move very quickly.

---

# Phase 1.0 → DONE

The **domain contract is frozen** and ready for subphase implementation.

### 🚧 PHASE 1 — IDENTITY MODULE (NOW ACTIVE)

- **Domain Contract Specification:** Documented in [docs/phases/phase1.md](file:///home/supra/Desktop/class_os/docs/phases/phase1.md) (Phase 1.0 Architecture Freeze), [docs/phases/phase1.3-rbac.md](file:///home/supra/Desktop/class_os/docs/phases/phase1.3-rbac.md) (Phase 1.3.0 RBAC Architecture Freeze), and [docs/phases/phase1.4-onboarding.md](file:///home/supra/Desktop/class_os/docs/phases/phase1.4-onboarding.md) (Phase 1.4.0 Onboarding Architecture Freeze).
- **Subphase Tracking Rule:** Subphases are added to the tracker in `docs/CONTEXT.md` as each subphase is approved and implemented.
- **Phase 1 Implementation Map:**
  - **Phase 1.0:** Domain & Architecture Contract Freeze ✅
  - **Phase 1.1:** Institute Tenant Core ✅
  - **Phase 1.2:** Users & Memberships ✅
  - **Phase 1.3:** Capability-Based RBAC ✅ (ACCEPTED 🟢)
    - **Phase 1.3.0:** RBAC Architecture & Capability Matrix ✅ (Freeze)
    - **Phase 1.3.1:** Capability Taxonomy & Strongly-Typed Enums ✅
    - **Phase 1.3.2:** Role → Capability Resolver Engine ✅
    - **Phase 1.3.3:** Authorization Engine & Assertion Guards ✅
    - **Phase 1.3.4:** Tenant-Scoped Capability Evaluation ✅
    - **Phase 1.3.5:** Resource-Scoped Filtering Helpers (Parent/Teacher) ✅
    - **Phase 1.3.6:** Identity Use Case Integration ✅
    - **Phase 1.3.7:** Security & RBAC Test Matrix ✅
    - **Phase 1.3.8:** Phase 1.3 Acceptance Gate ✅ (ACCEPTED 🟢)
  - **Phase 1.4:** Institute Onboarding Workflow ✅ (ACCEPTED 🟢)
    - **Phase 1.4.0:** Architecture & Workflow Contract Freeze 🟢 (Freeze)
    - **Phase 1.4.1:** Onboarding Domain & Application Orchestration ✅
    - **Phase 1.4.2:** Atomic Institute + Owner Bootstrap Transaction ✅
    - **Phase 1.4.3:** Idempotency & Conflict Handling ✅
    - **Phase 1.4.4:** Onboarding API Boundary ✅
    - **Phase 1.4.5:** Onboarding UI Flow ✅
    - **Phase 1.4.6:** Tenant Context Resolution & Post-Onboarding Redirect ✅
    - **Phase 1.4.7:** End-to-End Security & Failure Testing ✅
    - **Phase 1.4.8:** Phase 1.4 Acceptance Gate ✅ (ACCEPTED 🟢)
  - **Phase 1.5:** Institute Settings & White-Label Branding ✅ (ACCEPTED 🟢)
    - **Phase 1.5.0:** Architecture & Contract Freeze 🟢 (ACCEPTED & FROZEN)
    - **Phase 1.5.1:** Settings Domain Use Cases & Authorization ✅ COMPLETED
    - **Phase 1.5.2:** Settings API & Validators ✅ COMPLETED
    - **Phase 1.5.3:** Settings UI Feature ✅ COMPLETED
    - **Phase 1.5.4:** Security E2E & Acceptance Gate 🟢 (ACCEPTED & FROZEN)
  - **Phase 1.6:** Global ParentIdentity Platform Layer 🟢 (ACCEPTED & FROZEN)
    - **Phase 1.6.0:** Architecture & Contract Freeze 🟢 (ACCEPTED & FROZEN)
    - **Phase 1.6.1:** ParentIdentity Domain Entities & Value Objects ✅ COMPLETED
    - **Phase 1.6.2:** ParentIdentity Repository & Persistence Layer ✅ COMPLETED
    - **Phase 1.6.3:** ParentIdentity Application Use Cases ✅ COMPLETED
    - **Phase 1.6.4:** Parent Identity ↔ Authentication Integration ✅ COMPLETED
    - **Phase 1.6.5:** Multi-Tenant Security & Authorization Matrix ✅ COMPLETED
    - **Phase 1.6.6:** Phase 1.6 Acceptance Gate 🟢 (ACCEPTED & FROZEN)
  - **Phase 1.7:** Tenant InstituteParent CRM Layer 🟢 (ACCEPTED & FROZEN)
    - **Phase 1.7.0:** Architecture & Contract Freeze 🟢 (ACCEPTED & FROZEN)
    - **Phase 1.7.1:** InstituteParent Domain Entity & Value Objects ✅ COMPLETED
    - **Phase 1.7.2:** InstituteParent Repository & PostgreSQL Persistence Layer ✅ COMPLETED
    - **Phase 1.7.3:** InstituteParent Application Use Cases ✅ COMPLETED
    - **Phase 1.7.4:** ParentIdentity ↔ InstituteParent Linking & Authorization ✅ COMPLETED
    - **Phase 1.7.5:** InstituteParent API Boundary & Validators ✅ COMPLETED
    - **Phase 1.7.6:** InstituteParent Security / Privacy E2E Matrix ✅ COMPLETED
    - **Phase 1.7.7:** InstituteParent Staff UI / CRM Feature ✅ COMPLETED
    - **Phase 1.7.8:** UX, Accessibility & Tenant-Scoped Workflow Testing ✅ COMPLETED
    - **Phase 1.7.9:** Phase 1.7 Acceptance Gate 🟢 (ACCEPTED & FROZEN)
  - **Phase 1.8:** Student Admission & Profile Core 🟢 (ACCEPTED & FROZEN)
    - **Phase 1.8.0:** Architecture & Contract Freeze 🟢 (ACCEPTED & FROZEN)
    - **Phase 1.8.1:** Student Domain Entity & Value Objects ✅ COMPLETED
    - **Phase 1.8.2:** Student Repository & PostgreSQL Persistence Layer ✅ COMPLETED
    - **Phase 1.8.3:** Student Application Use Cases ✅ COMPLETED
    - **Phase 1.8.4:** Student Admission & Lifecycle Rules ✅ COMPLETED
    - **Phase 1.8.5:** Student API Boundary & Validators ✅ COMPLETED
    - **Phase 1.8.6:** Student Security / Tenant E2E Matrix ✅ COMPLETED
    - **Phase 1.8.7:** Student Staff UI / Admission Feature ✅ COMPLETED
    - **Phase 1.8.8:** UX, Accessibility & Admission Workflow Testing ✅ COMPLETED
  - **Phase 1.9:** Guardian & Student Links 🟢 (COMPLETED & FROZEN)
    - **Phase 1.9.0:** Architecture & Contract Freeze 🟢 (ACCEPTED & FROZEN)
    - **Phase 1.9.1:** Relationship Domain Entity & Value Objects 🟢 COMPLETED
    - **Phase 1.9.2:** Relationship Repository & PostgreSQL Persistence 🟢 COMPLETED
    - **Phase 1.9.3:** Relationship Application Use Cases 🟢 COMPLETED
    - **Phase 1.9.4:** Guardian/Student Linking & Authorization 🟢 COMPLETED
    - **Phase 1.9.5:** Relationship API Boundary & Validators 🟢 COMPLETED
    - **Phase 1.9.6:** Relationship Security / Privacy E2E Matrix 🟢 COMPLETED
    - **Phase 1.9.7:** Staff Guardian/Relationship UI 🟢 COMPLETED
    - **Phase 1.9.8:** UX, Accessibility & Workflow Testing 🟢 COMPLETED
    - **Phase 1.9.9:** Phase 1.9 Acceptance Gate 🟢 ACCEPTED & FROZEN
  - **Phase 1.10:** Academic Hierarchy (Programs, Subjects, Batches) 🟢 (ACCEPTED & FROZEN)
    - **Phase 1.10.0:** Architecture & Contract Freeze 🟢 (ACCEPTED & FROZEN)
    - **Phase 1.10.1:** Academic Hierarchy Domain Entities & Value Objects 🟢 COMPLETED
    - **Phase 1.10.2:** Repository & PostgreSQL Persistence Layer 🟢 COMPLETED
    - **Phase 1.10.3:** Application Use Cases & State Machine Rules 🟢 COMPLETED
    - **Phase 1.10.4:** API Boundary & Presentation Validators 🟢 COMPLETED
    - **Phase 1.10.5:** Security & Tenant Isolation E2E Matrix 🟢 COMPLETED
    - **Phase 1.10.6:** Staff Academic Workspace UI 🟢 COMPLETED
    - **Phase 1.10.7:** UX, Accessibility & Workflow Testing 🟢 COMPLETED
    - **Phase 1.10.8:** Phase 1.10 Acceptance Gate & Freeze 🟢 ACCEPTED & FROZEN
  - **Phase 1.11:** Student Enrollment Lifecycle 🟢 (ACCEPTED & FROZEN)
    - **Phase 1.11.0:** Architecture & Contract Freeze 🟢 (ACCEPTED & FROZEN)
    - **Phase 1.11.1:** Enrollment Domain Entity & Value Objects 🟢 COMPLETED
    - **Phase 1.11.2:** Repository & PostgreSQL Persistence Layer 🟢 COMPLETED
    - **Phase 1.11.3:** Application Use Cases & Enrollment Lifecycle 🟢 COMPLETED
    - **Phase 1.11.4:** API Boundary & Presentation Validators 🟢 COMPLETED
    - **Phase 1.11.5:** Security & Tenant Isolation E2E Matrix 🟢 COMPLETED
    - **Phase 1.11.6:** Staff Enrollment UI 🟢 COMPLETED
    - **Phase 1.11.7:** UX, Accessibility & Workflow Testing 🟢 COMPLETED
    - **Phase 1.11.8:** Phase 1.11 Acceptance Gate & Freeze 🟢 ACCEPTED & FROZEN
  - **Phase 1.12:** Protected Identity APIs (`/api/v1/...`) 🟢 (ACCEPTED & FROZEN)
    - **Phase 1.12.0:** Architecture & Contract Freeze 🟢 (ACCEPTED & FROZEN)
    - **Phase 1.12.1:** Protected Identity API Domain/Application Contracts 🟢 COMPLETED
    - **Phase 1.12.2:** API Infrastructure & Persistence Adapters 🟢 COMPLETED
    - **Phase 1.12.3:** API Boundary & Presentation Validators 🟢 COMPLETED
    - **Phase 1.12.4:** Authentication, Authorization & Tenant Isolation 🟢 COMPLETED
    - **Phase 1.12.5:** Security & Adversarial E2E Audit 🟢 COMPLETED
    - **Phase 1.12.6:** Protected Identity API Integration / Staff Consumption 🟢 COMPLETED
    - **Phase 1.12.7:** API UX / Developer Experience / Documentation 🟢 COMPLETED
    - **Phase 1.12.8:** Final Acceptance Gate & Freeze 🟢 (ACCEPTED & FROZEN)
  - **Phase 1.13:** Staff UI & Onboarding Workflows 🟢 (ACCEPTED & FROZEN)
    - **Phase 1.13.0:** Staff Management Architecture & Contract Freeze 🟢 (ACCEPTED & FROZEN)
    - **Phase 1.13.1:** Staff Management Domain & Application Layer 🟢 COMPLETED
    - **Phase 1.13.2:** Staff Management API & Validators 🟢 COMPLETED
    - **Phase 1.13.3:** Staff Management Security & E2E Matrix 🟢 COMPLETED
    - **Phase 1.13.4:** Staff Workspace UI Feature 🟢 COMPLETED
    - **Phase 1.13.5:** UX, Accessibility & Workflow Testing 🟢 COMPLETED
    - **Phase 1.13.6:** Phase 1.13 Acceptance Gate & Freeze 🟢 (ACCEPTED & FROZEN)
  - **Phase 1.14:** Multi-Tenant Cross-Tenant Access Security Hardening 🟢 (ACCEPTED & FROZEN)
    - **Phase 1.14.0:** Security Architecture & Threat Model 🟢 (ACCEPTED & FROZEN)
    - **Phase 1.14.1:** Repository & Application Hardening 🟢 (ACCEPTED & FROZEN)
    - **Phase 1.14.2:** API Boundary Hardening 🟢 (ACCEPTED & FROZEN)
    - **Phase 1.14.3:** Adversarial Security E2E Matrix 🟢 (ACCEPTED & FROZEN)
    - **Phase 1.14.4:** Phase 1.14 Acceptance Gate & Freeze 🟢 (ACCEPTED & FROZEN)
  - **Phase 1.15:** Phase 1 Acceptance Gate 🟢 (ACCEPTED & FROZEN)
