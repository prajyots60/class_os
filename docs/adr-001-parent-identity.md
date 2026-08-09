# ADR-001 — Parent Identity Architecture

**Status:** Accepted  
**Date:** 2026-08-08  
**Deciders:** Product & Engineering  
**Documents Affected:** SRS, SDD, DADD, Phase 1 Discovery

---

## Context

CoachingOS is a multi-tenant SaaS platform. A single parent may have children enrolled across multiple independent coaching institutes on the platform.

The initial design modelled Parent as a tenant-scoped entity — a record belonging to one institute. This raised a question during architecture review:

> Can the platform automatically know that "Rahul" in Physics Coaching is the same "Rahul" in Maths Coaching?

The answer is **no** — reliably. Each institute stores student names differently:

| Institute       | Name Stored        |
| --------------- | ------------------ |
| Physics Academy | Rahul Sharma       |
| Maths Classes   | Rahul S.           |
| Cricket Academy | Rahul Kumar Sharma |

Attempting automatic identity matching across institutes is error-prone and unsafe. It introduces a class of bugs where unrelated students get merged, or real siblings stay separated.

---

## Decision

**We introduce a two-layer architecture that separates global parent identity from institute-scoped student data.**

The parent is responsible for organizing their own children — not the platform.

---

## Two-Layer Model

```
────────────────────────────────
PLATFORM LAYER  (Global — owned by CoachingOS)
────────────────────────────────
ParentIdentity      — one record per phone number
ChildProfile        — parent-created labels (Rahul, Priya)
StudentLink         — links ChildProfile → Institute Student
Authentication      — OTP login tied to ParentIdentity
Push Tokens         — global notification delivery
Global Preferences  — cross-institute settings

────────────────────────────────
INSTITUTE LAYER  (Tenant — owned by each coaching institute)
────────────────────────────────
Institute
Student             — exists only within this institute
Enrollment
Attendance
Marks
Fees
Announcements
```

The two layers meet **only** through the parent's own organization.

- Institutes know nothing about ChildProfiles.
- ChildProfiles know nothing about other institutes' data.
- The platform never merges institute records automatically.

---

## Schema

```
ParentIdentity
─────────────
id          UUID
phone       String (unique globally)
created_at  Timestamp


InstituteMembership
─────────────
id                  UUID
parent_identity_id  → ParentIdentity
institute_id        → Institute
institute_parent_id → InstituteParent  (the tenant-scoped parent record)


InstituteParent  (tenant-scoped — formerly "parents" table)
─────────────
id              UUID
institute_id    → Institute
name            String
primary_phone   String
secondary_phone String (nullable)


ChildProfile  (personal — owned by ParentIdentity, invisible to institutes)
─────────────
id                  UUID
parent_identity_id  → ParentIdentity
name                String   (e.g. "Rahul", "Priya")
avatar              String   (nullable)
created_at          Timestamp


StudentLink  (maps ChildProfile → a specific institute's Student record)
─────────────
id                UUID
child_profile_id  → ChildProfile
student_id        → Student (institute-scoped)
institute_id      → Institute
```

---

## What the Parent Sees

### Parent Hub (Global Layer)

When a parent logs in with `9876543210`:

```
9876543210
    │
    ├── Physics Academy → Rahul Sharma
    ├── Maths Academy   → Rahul S.
    └── Dance Academy   → Priya
```

They create ChildProfiles and assign enrollments:

```
👦 Rahul
    ├── Physics Academy
    ├── Maths Academy
    └── Cricket Academy

👧 Priya
    ├── Dance
    └── Abacus
```

### Coaching Workspace (Institute Layer)

Each coaching remains fully isolated:

```
Physics Academy
    ├── Attendance
    ├── Fees
    ├── Marks
    └── Homework
```

---

## Smart Suggestions (Future — Not MVP)

The platform may **suggest** possible matches — never enforce them.

```
Physics → Rahul Sharma, Age 15
Maths   → Rahul Sharma, Age 15

"These two students look similar. Add both to a Child Profile?"
[ Yes ]  [ No ]
```

The parent decides. The platform never assumes.

---

## Product Implications

### Parent Hub

The Parent Dashboard is renamed conceptually to **Parent Hub** — a global view across all coaching institutes a parent is connected to.

| Parent Hub Features                 |
| ----------------------------------- |
| OTP login via phone                 |
| All connected coaching institutes   |
| Child Profiles                      |
| Cross-institute attendance calendar |
| Unified notifications               |
| Per-child academic overview         |

### Coaching Workspace

Each institute remains a fully isolated tenant workspace.

| Coaching Workspace Features |
| --------------------------- |
| Attendance                  |
| Fees                        |
| Marks                       |
| Homework                    |
| Announcements               |

---

## Benefits

| Benefit                                | Explanation                                                        |
| -------------------------------------- | ------------------------------------------------------------------ |
| No unreliable identity matching        | Parent organizes — platform never assumes                          |
| Clean tenant isolation preserved       | Institute data never crosses tenant boundaries                     |
| Phone number is the global anchor      | One phone → one ParentIdentity, regardless of how many institutes  |
| Phone change is a single-record update | Only `ParentIdentity.phone` changes — no cascade across institutes |
| Differentiated product                 | Cross-institute child view is impossible for single-institute apps |
| Future-proof                           | Smart suggestions can be added later without schema changes        |

---

## Consequences

### What Changes

- `parents` table is now `institute_parents` — fully tenant-scoped
- New global tables: `parent_identities`, `institute_memberships`, `child_profiles`, `student_links`
- Parent authentication resolves `ParentIdentity` first, then `InstituteMembership`
- Parent Portal is split into two surfaces: Parent Hub (global) and Coaching Workspace (tenant)

### What Does NOT Change

- All institute-scoped data (students, enrollments, attendance, marks, fees) is unchanged
- Tenant isolation rules are unchanged and strengthened
- The institute never sees or interacts with `ChildProfile` or `ParentIdentity` directly

---

## Alternatives Considered

### Option A — Single Global Student Identity

Attempt automatic matching of students across institutes using name + DOB + phone.

**Rejected:** Unreliable. Different institutes store names differently. Automatic merging risks incorrect identity fusion. Extremely hard to undo.

### Option B — Keep Parent Fully Tenant-Scoped (Original Design)

Parent belongs to one institute. No cross-institute view.

**Rejected:** Leaves a significant product gap. Parents with children across multiple institutes would have a fragmented experience. Misses a genuine differentiator.

### Option C (Chosen) — Two-Layer Architecture

Global `ParentIdentity` + personal `ChildProfile` + tenant-scoped `InstituteParent`.

**Accepted:** Clean separation. No identity assumptions. Parent controls their own organization. Institutes remain completely isolated. Opens cross-institute features without coupling tenants.

---

## Decision Record

| Field      | Value                                                                                         |
| ---------- | --------------------------------------------------------------------------------------------- |
| Decision   | Two-layer parent identity — global identity + tenant parent                                   |
| Driven by  | Product insight during architecture review                                                    |
| Reversible | Partially — early enough to implement correctly before launch                                 |
| Impact     | Schema, auth flow, parent API surface, product naming                                         |
| MVP scope  | Platform Layer tables created; ChildProfiles optional in MVP; full cross-institute view in V1 |

---

_ADR-001 — Accepted. This decision supersedes the original single-layer parent model in SRS Chapter 2, SDD Chapter 1, and DADD Chapters 1 and 2._
