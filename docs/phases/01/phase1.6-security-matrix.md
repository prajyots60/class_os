# Global ParentIdentity Platform Layer — Security & Authorization Matrix (Phase 1.6.5)

- **Status**: 🟢 **ACCEPTED & FROZEN**
- **Date**: 2026-08-11
- **Authors**: Senior Staff Security & Identity Architecture Team

---

## 1. Overview & Architecture Invariants

The **Global ParentIdentity Platform Layer** enforces four strictly isolated security authorities:

```text
Authentication Authority:   Better Auth User & Session (credentials, sessions, rate limits)
Global Identity Authority: ParentIdentity (phone-anchored platform identity)
Tenant Authority:          TenantContext & InstituteMembership (institute isolation)
Authorization Authority:   RBAC & Capability Engine (capability checks)
```

The server strictly resolves identity in one direction:

```text
HTTP Request (Session Cookie / Header)
        ↓
Better Auth Session Resolution (auth.api.getSession)
        ↓
Database User Record (db.user.findUnique)
        ↓
User.parentIdentityId Link
        ↓
ParentIdentity DTO Resolution
```

Client-supplied identity values (`parentId`, `userId`, `instituteId`, `role`, `x-parent-id`, etc.) are strictly ignored by server resolution boundaries.

---

## 2. Comprehensive Threat Matrix (`PARENT-SEC-01` to `PARENT-SEC-25`)

| Test ID | Threat Category | Attack Vector | Expected Behavior | Actual Mitigation | Result |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **PARENT-SEC-01** | Unauthenticated Access | Request `requireParentIdentity()` with missing/invalid session cookie | Return `AuthenticationError` (401 status) | Server checks `auth.api.getSession()`; rejects missing sessions without DB lookups | **PASS** |
| **PARENT-SEC-02** | Spoofed `parentId` | Inject `?parentId=<victim>` or body `parentId: "<victim>"` | Server ignores parameter; resolves identity purely via session `user.parentIdentityId` | `ResolveParentIdentityForUserUseCase` resolves only trusted `session.user.id` | **PASS** |
| **PARENT-SEC-03** | Spoofed `userId` | Inject body `{ "userId": "<victim>" }` or header `x-user-id` | Server ignores client `userId`; reads user ID from validated session token | Session resolution derives `userId` exclusively from session store | **PASS** |
| **PARENT-SEC-04** | Spoofed `instituteId` | Inject header `x-institute-id` or body `{ "instituteId": "other" }` | Request context uses server-verified `InstituteMembership` | `requireInstituteMembership` queries database membership for target institute | **PASS** |
| **PARENT-SEC-05** | Spoofed Role | Inject header `x-role: owner` or body `{ "role": "owner" }` | Server computes role from verified database membership | Role resolved via `db.user` or `db.instituteMembership`; client headers ignored | **PASS** |
| **PARENT-SEC-06** | Cross-Tenant Enumeration | Query `ParentIdentity` globally expecting cross-tenant CRM data | Response contains global profile only (`id`, `phone`, `name`, `avatar`, `status`) | DTO mapping strips tenant memberships, institute IDs, and CRM notes | **PASS** |
| **PARENT-SEC-07** | Cross-Tenant Child Access | Request Student/Child records for Institute B while in Institute A context | Request rejected by tenant context boundary | `TenantContext` isolation prevents querying non-authorized `instituteId` records | **PASS** |
| **PARENT-SEC-08** | Parent Identity Enumeration | Attempt `GET /parents/:parentIdentityId` public scan | Endpoint returns 401/403 or does not exist publicly | No unauthenticated/unauthorized public endpoints exposed for parent identity scanning | **PASS** |
| **PARENT-SEC-09** | Phone Enumeration | Attempt `GetParentIdentityByPhoneUseCase` from public endpoint | Request rejected unless executed inside authorized internal use case | `GetParentIdentityByPhoneUseCase` is an application service, not a public HTTP API | **PASS** |
| **PARENT-SEC-10** | Identity Linking Attack | Client submits `{ "parentIdentityId": "victim" }` to force account linking | Server rejects client link parameter; links only via canonical phone lookup | Linking logic in `ResolveParentIdentityForUserUseCase` requires canonical phone matching | **PASS** |
| **PARENT-SEC-11** | Duplicate Phone Creation | Create identities for `+919876543210`, `9876543210`, `+91 98765 43210` | All inputs map to 1 canonical `+919876543210` record | `PhoneNumber` VO normalizes E.164 format before database unique index check | **PASS** |
| **PARENT-SEC-12** | Race Condition Creation | 5 parallel requests attempt auto-creation for same phone | Exactly 1 `ParentIdentity` record created; all requests receive identical ID | PostgreSQL `@unique` index + `ConflictError` catch logic handles concurrent requests | **PASS** |
| **PARENT-SEC-13** | Status Invariants | Attempt `deactivated` → `active` or update profile on deactivated identity | Throws `ValidationError` ("Deactivated parent identity is terminal") | `ParentIdentityEntity` state machine enforces terminal state immutability | **PASS** |
| **PARENT-SEC-14** | Auth vs Parent Status | Suspend `ParentIdentity` expecting silent mutation of Better Auth credentials | Better Auth credentials remain untouched; status affects parent identity domain layer | Authentication credentials and parent identity status are decoupled | **PASS** |
| **PARENT-SEC-15** | Session Revocation | Access `requireParentIdentity()` after sign-out / session revocation | Throws `AuthenticationError` | Session state checked dynamically on every server request | **PASS** |
| **PARENT-SEC-16** | Missing Association | `User.parentIdentityId` references deleted/missing `ParentIdentity` | System fails safely; returns `null` or throws `AuthenticationError` | Repository returns `null` on missing lookup; does not corrupt state | **PASS** |
| **PARENT-SEC-17** | User Without Identity | Authenticated user with `parentIdentityId = null` | Resolves to `null` unless `autoCreateIfMissing: true` is explicitly passed by server | Controlled by explicit server option, never client input | **PASS** |
| **PARENT-SEC-18** | Deterministic Linking | Unlinked user with phone matching existing `ParentIdentity` | User automatically linked to existing `ParentIdentity` without creating duplicate | `ResolveParentIdentityForUserUseCase` checks phone lookup before creation | **PASS** |
| **PARENT-SEC-19** | Phone Mismatch Safety | User phone differs from linked `ParentIdentity` phone | Link is maintained if already established; relinking requires explicit workflow | Relinking/phone change is restricted to dedicated verified workflows | **PASS** |
| **PARENT-SEC-20** | DTO Privacy | Inspect fields of `ParentIdentityDTO` | Fields restricted to: `id`, `phone`, `name`, `avatar`, `status`, `createdAt`, `updatedAt` | Zero password hashes, session tokens, or tenant membership objects exposed | **PASS** |
| **PARENT-SEC-21** | Observability PII Safety | Log identity operations | Logs contain `parentIdentityId`, `userId`, `operation`; zero raw passwords or auth headers | Sensitive fields redacted via `@coaching-os/observability` Pino redaction rules | **PASS** |
| **PARENT-SEC-22** | Authorization Scope | Non-parent user (e.g. assistant) attempting parent identity resolution | Resolution returns global identity or null; tenant CRM access requires RBAC | Identity resolution is decoupled from tenant CRM capability checks | **PASS** |
| **PARENT-SEC-23** | Tenant Context Decoupling | Inspect `ParentIdentity` domain entity properties | Zero tenant parameters (`instituteId`, `tenantId`, `membershipId`) exist | Framework-independent domain entity enforces platform-level scope | **PASS** |
| **PARENT-SEC-24** | Repository Scope | Inspect `ParentIdentityRepository` methods | All methods operate on global entity/phone/ID without tenant parameters | Repository interface strictly platform-scoped | **PASS** |
| **PARENT-SEC-25** | DB Integrity Constraints | Inspect PostgreSQL schema foreign keys & indexes | `phone` UNIQUE constraint, `parentIdentityId` foreign key with `SetNull` on delete | PostgreSQL enforced at database engine layer; 0 schema drift | **PASS** |

---

## 3. Automated Test Suite Traceability

- **Unit & Integration Suite**: `packages/identity/src/application/use-cases/parent-identity.use-cases.test.ts` (11/11 passing)
- **Auth Integration Suite**: `infrastructure/auth/src/parent-identity-auth.integration.test.ts` (7/7 passing)
- **Comprehensive Security Matrix Suite**: `infrastructure/auth/src/parent-identity-security-matrix.test.ts` (25/25 passing)
- **E2E Security Suite**: `apps/web/e2e/parent-identity-security.spec.ts` (12/12 passing)
