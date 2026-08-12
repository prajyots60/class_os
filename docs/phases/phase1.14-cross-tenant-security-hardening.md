# Phase 1.14 — Multi-Tenant Cross-Tenant Access Security Hardening Specification

- **Status**: 🟢 **ACCEPTED & FROZEN**
- **Date**: 2026-08-12
- **Authors**: Senior Staff Architecture & Security Team
- **Deciders**: Product & Engineering Core

---

## 1. Phase Objective

Phase 1.14 delivers comprehensive **Multi-Tenant Cross-Tenant Access Security Hardening** across CoachingOS.

The primary objective is to prove and enforce the core multi-tenant security invariant across all architectural layers:

> **A principal authenticated in Institute A must never be able to read, mutate, infer, enumerate, or indirectly access resources belonging to Institute B.**

It defines and implements:
- **Security Architecture & Threat Model (Phase 1.14.0)**: Authoritative architecture specification (ADR-0017), trust hierarchy, tenant-scoped resource matrix (11 core resources), and threat matrix (`TENANT-01` to `TENANT-32`).
- **Repository & Application Hardening (Phase 1.14.1)**: Persistence-layer scoping enforcement (`where: { id, instituteId }`), relationship traversal cross-tenant verification, and cross-tenant integration test matrix.
- **API Boundary Hardening (Phase 1.14.2)**: Presentation-layer validation, route-level error masking, header spoofing protection, and bounded pagination.
- **Adversarial Security E2E Matrix (Phase 1.14.3)**: Comprehensive HTTP security test suite execution covering `API-BOUNDARY-01..15` and `TENANT-01..32` (31/31 tests passing).
- **Phase 1.14 Acceptance Gate & Freeze (Phase 1.14.4)**: Final security verification, monorepo quality gate execution, Playwright E2E suites, documentation freeze, and phase freeze.

---

## 2. Subphase Roadmap

```text
Phase 1.14.0 — Security Architecture & Threat Model                🟢 ACCEPTED & FROZEN
Phase 1.14.1 — Repository & Application Hardening                🟢 ACCEPTED & FROZEN
Phase 1.14.2 — API Boundary Hardening                            🟢 ACCEPTED & FROZEN
Phase 1.14.3 — Adversarial Security E2E Matrix                   🟢 ACCEPTED & FROZEN
Phase 1.14.4 — Phase 1.14 Acceptance Gate & Freeze               🟢 ACCEPTED & FROZEN
```

---

## 3. Threat Vector Coverage Matrix (`TENANT-01` .. `TENANT-32`)

| Identifier | Vector Description | Category | Target Status |
| :--- | :--- | :--- | :--- |
| `TENANT-01` | Cross-tenant Student lookup | Direct Read | `404 NOT_FOUND` |
| `TENANT-02` | Cross-tenant Guardian lookup | Direct Read | `404 NOT_FOUND` |
| `TENANT-03` | Cross-tenant Staff lookup | Direct Read | `404 NOT_FOUND` |
| `TENANT-04` | Cross-tenant Enrollment lookup | Direct Read | `404 NOT_FOUND` |
| `TENANT-05` | Cross-tenant Batch lookup | Direct Read | `404 NOT_FOUND` |
| `TENANT-06` | Cross-tenant Subject lookup | Direct Read | `404 NOT_FOUND` |
| `TENANT-07` | Cross-tenant Program lookup | Direct Read | `404 NOT_FOUND` |
| `TENANT-08` | Cross-tenant Relationship lookup | Direct Read | `404 NOT_FOUND` |
| `TENANT-09` | Cross-tenant Student update | Mutation | `404 NOT_FOUND` |
| `TENANT-10` | Cross-tenant Staff role update | Mutation | `404 NOT_FOUND` |
| `TENANT-11` | Cross-tenant Staff suspension | Mutation | `404 NOT_FOUND` |
| `TENANT-12` | Cross-tenant Batch archive | Mutation | `404 NOT_FOUND` |
| `TENANT-13` | Cross-tenant Enrollment cancel/withdraw | Mutation | `404 NOT_FOUND` |
| `TENANT-14` | Cross-tenant Enrollment transfer | Mutation | `404 NOT_FOUND` |
| `TENANT-15` | Cross-tenant Guardian status update | Mutation | `404 NOT_FOUND` |
| `TENANT-16` | Cross-tenant Relationship archive | Mutation | `404 NOT_FOUND` |
| `TENANT-17` | `instituteId` in request body injection | Injection | Rejected / Stripped |
| `TENANT-18` | `instituteId` in query param override | Injection | Ignored |
| `TENANT-19` | `x-institute-id` header spoofing | Header Spoof | Ignored |
| `TENANT-20` | `x-role` header spoofing | Header Spoof | Ignored |
| `TENANT-21` | `x-user-id` header spoofing | Header Spoof | Ignored |
| `TENANT-22` | Forged/synthetic `membershipId` | Injection | Rejected |
| `TENANT-23` | Foreign ID search term enumeration | Disclosure | `200` with `data: []` |
| `TENANT-24` | Enrollment in foreign batch conflict leak | Disclosure | `404 NOT_FOUND` |
| `TENANT-25` | Duplicate enrollment check foreign leak | Disclosure | `404 NOT_FOUND` |
| `TENANT-26` | Collection pagination count leakage | Disclosure | Tenant Isolated |
| `TENANT-27` | Linking Student A to Foreign Guardian B | Traversal | `404 NOT_FOUND` |
| `TENANT-28` | Enrolling Student A in Foreign Batch B | Traversal | `404 NOT_FOUND` |
| `TENANT-29` | Transferring Student A to Foreign Batch B | Traversal | `404 NOT_FOUND` |
| `TENANT-30` | Mapping Program A to Foreign Subject B | Traversal | `404 NOT_FOUND` |
| `TENANT-31` | Assigning Staff A to Foreign Batch B | Traversal | `404 NOT_FOUND` |
| `TENANT-32` | Student guardians for foreign student | Traversal | `404 NOT_FOUND` |

---

## 4. Invariants & Rules

1. **Server Identity Authority**: All queries and mutations use `TenantContext.instituteId` resolved server-side.
2. **Fail-Closed 404 Error Semantics**: Requests targeting foreign tenant resource IDs return `404 NOT_FOUND` without revealing existence or state.
3. **Double-Sided Traversal Enforcement**: All relationship use cases verify that both primary and target entities belong to `TenantContext.instituteId`.

---

## 5. Phase 1.14 — Final Acceptance & Freeze Report

- **Final Status**: 🟢 **ACCEPTED & FROZEN**
- **Acceptance Date**: 2026-08-12
- **Audit Decision**: Fully Compliant with ADR-0017 and Multi-Tenant Invariants.

### 5.1 Verification Matrix & Quality Gate Execution

| Verification Suite | Scope / Command | Result |
| :--- | :--- | :--- |
| **Database Schema Integrity** | `pnpm db:validate` | 🟢 PASSED |
| **Database Connection Health** | `pnpm db:health` (118ms latency) | 🟢 PASSED |
| **Database Migration Drift** | `pnpm db:drift:check` (0 differences) | 🟢 PASSED |
| **Repository Cross-Tenant Isolation** | `cross-tenant-repository.test.ts` (7 tests) | 🟢 PASSED |
| **API Boundary & Threat Matrix** | `cross-tenant-security.test.ts` (31 tests) | 🟢 PASSED |
| **Protected V1 Identity Security** | `v1-security.test.ts` (24 tests) | 🟢 PASSED |
| **Staff Security & Capability Suite** | `staff-security.test.ts` (24 tests) | 🟢 PASSED |
| **Monorepo Typecheck** | `pnpm typecheck` (13/13 packages, 0 errors) | 🟢 PASSED |
| **Monorepo Unit & Integration Tests**| `pnpm test` (380+ tests) | 🟢 PASSED |
| **Monorepo ESLint Suite** | `pnpm lint` (0 errors) | 🟢 PASSED |
| **Production Application Build** | `pnpm build` (Clean Next.js 16 build) | 🟢 PASSED |
| **Playwright E2E Security Suite** | `e2e/staff-workflow.spec.ts` & `e2e/staff-accessibility.spec.ts` (10 tests) | 🟢 PASSED |

### 5.2 Record of Database Schema Changes

> **Phase 1.14 required zero database schema changes.**

### 5.3 Explicitly Deferred Work

1. Fine-grained teacher → batch individual permission restrictions (managed via batch relationship).
2. Advanced cross-institute super-admin delegation.
3. Complex multi-tier staff invitation lifecycle tokens.

### 5.4 Freeze Rule

The multi-tenant security architecture established by ADR-0017 is **FROZEN**. Any future modification to tenant context resolution, authorization boundaries, repository tenant scoping, or cross-tenant error semantics requires a new ADR and explicit architectural review.

