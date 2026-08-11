# Phase 1.5 — Institute Settings & White-Label Branding Specification & Contract

> **Phase Status:** 🟢 **FROZEN** (Phase 1.5.0 Contract Freeze)  
> **Milestone:** Phase 1.5.0 — Architecture & Contract Freeze  
> **Author:** Antigravity (Google DeepMind Agentic Pair Programmer)  
> **Date:** August 11, 2026  

---

## 1. Executive Summary & Purpose

Phase 1.5 defines the domain, application, API, security, and UI contract for **Institute Settings & White-Label Branding** within CoachingOS.

This specification establishes the authoritative contract allowing an institute **Owner** to view and modify institute-level profile configuration, regional settings, and visual branding elements while maintaining strict **tenant isolation**, **capability-based authorization (RBAC)**, and **server-controlled session identity**.

---

## 2. Repository Audit Findings & Baseline State

### 2.1 Existing Database Schema (`infrastructure/database/prisma/schema.prisma`)
The `institutes` table currently contains:
- `id` (`Uuid`, PK)
- `name` (`VarChar(255)`)
- `slug` (`VarChar(100)`, `@unique`)
- `phone` (`VarChar(20)`)
- `email` (`VarChar(255)`)
- `logoUrl` (`Text`, nullable)
- `primaryColor` (`VarChar(50)`, nullable)
- `timezone` (`VarChar(50)`, default `'Asia/Kolkata'`)
- `status` (`InstituteStatus`: `active` | `suspended` | `archived`)
- `createdAt`, `updatedAt`

Prisma schema also contains `Settings` and `Branding` placeholder models created in Phase 0.4.

### 2.2 Domain Entities (`packages/identity`)
- `InstituteEntity` encapsulates `id`, `name`, `slug`, `phone`, `email`, `logoUrl`, `primaryColor`, `timezone`, `status`, `createdAt`, `updatedAt`.
- Business mutation method `updateDetails(props)` already supports updating `name`, `phone`, `email`, `timezone`, `logoUrl`, `primaryColor`.

### 2.3 Authorization Engine & Capability Taxonomy (`packages/identity/src/authorization`)
- `CAPABILITIES` registry includes:
  - `INSTITUTE_READ` (`institute:read`)
  - `INSTITUTE_UPDATE` (`institute:update`)
  - `SETTINGS_READ` (`settings:read`)
  - `SETTINGS_UPDATE` (`settings:update`)
  - `BRANDING_READ` (`branding:read`)
  - `BRANDING_UPDATE` (`branding:update`)
- `ROLE_CAPABILITIES` mapping:
  - `owner`: Possesses ALL capabilities (`SETTINGS_*`, `BRANDING_*`, `INSTITUTE_*`).
  - `teacher`: Possesses `INSTITUTE_READ`. Denied `SETTINGS_UPDATE` & `BRANDING_UPDATE`.
  - `assistant`: Possesses `INSTITUTE_READ`. Denied `SETTINGS_UPDATE` & `BRANDING_UPDATE`.
  - `parent`: Denied institute management capabilities.

---

## 3. Data Reconciliation & Classification

| Field | Classification | Mutability | Rationale |
|:---|:---|:---|:---|
| `id` | Domain Identity | **Immutable** | Core primary key uuid |
| `slug` | Domain Identity / Route Anchor | **Immutable** | Public handle; changing breaks deep links and routes |
| `createdAt` | Audit Lifecycle | **Immutable** | Creation timestamp |
| `status` | System Lifecycle | Protected | Controlled via `ChangeInstituteStatusUseCase` |
| `name` | Operational Profile | **Editable** | Institute display name |
| `phone` | Contact Information | **Editable** | Public/admin contact phone |
| `email` | Contact Information | **Editable** | Public/admin contact email |
| `timezone` | Regional Configuration | **Editable** | Schedule & attendance time anchor |
| `logoUrl` | Visual Branding | **Editable** | Public logo URL reference |
| `primaryColor` | Visual Branding | **Editable** | UI theme brand color HEX |

---

## 4. White-Label Branding Contract

### 4.1 Allowed Branding Elements (Phase 1.5 Baseline)
1. **Institute Display Name (`name`)**: Displayed in app header, public cards, reports, and invoices.
2. **Logo Asset URL (`logoUrl`)**: Validated HTTPS image URL displayed in sidebars, navigation header, and public tenant pages.
3. **Primary Brand Color (`primaryColor`)**: Validated 3-digit or 6-digit HEX color string (`#RRGGBB` / `#RGB`) used for primary button highlights, sidebar accent tokens, and brand accents.
4. **Public Institute Slug (`slug`)**: Read-only handle used for public routing and tenant identification.

### 4.2 Explicitly Rejected Branding Features (Non-Goals)
To preserve application stability, security, and performance, Phase 1.5 explicitly **rejects**:
- ❌ **Arbitrary CSS Injection**: No raw CSS strings or stylesheets allowed (prevents CSS-based keylogging / layout breaking).
- ❌ **Arbitrary JavaScript Execution**: No script tags, event handlers, or custom JS bundles.
- ❌ **Custom HTML/Server Templates**: UI relies strictly on safe React design system components.
- ❌ **Custom Font Uploads**: Font family selections are restricted to predefined system fonts.
- ❌ **Custom Domain / CNAME Setup**: Routing relies on standard path or subdomain resolution.
- ❌ **Custom SMTP / Email Template Customization**: Deferred to future notification phase.

---

## 5. Server Trust & Authorization Contract

### 5.1 Identity Resolution Chain
```text
Browser HTTP Request (Session Cookie)
    ↓
Better Auth Session Verification
    ↓
Server Session Identity (userId)
    ↓
Server Membership Lookup (ResolveServerTenantContext)
    ↓
Trusted TenantContext (userId, instituteId, role, membershipId)
    ↓
Capability Assertion (requireCapability: settings:read / settings:update)
    ↓
Execute Application Use Case
    ↓
Prisma Repository (Tenant Scoped)
```

### 5.2 Strict Invariants
1. **Zero Client Authority over Identity**: `instituteId`, `userId`, `role`, and `membershipId` are NEVER accepted from client request bodies, headers, or query parameters.
2. **Server-Side Capability Enforcement**: Routes and API endpoints verify `settings:read` / `settings:update` using the trusted `TenantContext`.
3. **Immutability of Tenant Slug**: Requests attempting to update `slug` or `status` via the settings endpoint will be rejected.

---

## 6. Validation Rules & Constraints

Validation is enforced via Zod schema (`updateInstituteSettingsSchema`) at presentation boundaries:

```typescript
export const updateInstituteSettingsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Institute name must be at least 2 characters')
    .max(255, 'Institute name cannot exceed 255 characters')
    .optional(),
  phone: z
    .string()
    .trim()
    .min(10, 'Contact phone number must be at least 10 digits')
    .max(20, 'Contact phone number cannot exceed 20 characters')
    .optional(),
  email: z
    .string()
    .trim()
    .email('Invalid contact email address')
    .max(255)
    .optional(),
  timezone: z
    .string()
    .trim()
    .min(1, 'Timezone cannot be empty')
    .max(50)
    .optional(),
  logoUrl: z
    .string()
    .trim()
    .url('Logo URL must be a valid HTTPS URL')
    .startsWith('https://', 'Logo URL must use HTTPS protocol')
    .max(2048)
    .nullable()
    .optional(),
  primaryColor: z
    .string()
    .trim()
    .regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, 'Primary color must be a valid HEX color code (e.g. #0F172A or #3B82F6)')
    .nullable()
    .optional(),
});
```

---

## 7. API Contract

### 7.1 GET `/api/institute/settings`
- **Method**: `GET`
- **Authentication**: Session Cookie required.
- **Capability**: `settings:read` or `institute:read`.
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "id": "uuid-1234",
    "name": "Sharma Classes",
    "slug": "sharma-classes",
    "phone": "+919876543210",
    "email": "contact@sharmaclasses.com",
    "timezone": "Asia/Kolkata",
    "logoUrl": "https://images.unsplash.com/photo-1546410531-bb4caa6b424d",
    "primaryColor": "#0F172A",
    "status": "active",
    "createdAt": "2026-08-11T00:00:00.000Z",
    "updatedAt": "2026-08-11T12:00:00.000Z"
  }
}
```

### 7.2 PATCH `/api/institute/settings`
- **Method**: `PATCH`
- **Authentication**: Session Cookie required.
- **Capability**: `settings:update` or `institute:update`.
- **Request Body DTO**:
```json
{
  "name": "Sharma Classes Academy",
  "phone": "+919876543211",
  "primaryColor": "#2563EB"
}
```
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "id": "uuid-1234",
    "name": "Sharma Classes Academy",
    "slug": "sharma-classes",
    "phone": "+919876543211",
    "email": "contact@sharmaclasses.com",
    "timezone": "Asia/Kolkata",
    "logoUrl": "https://images.unsplash.com/photo-1546410531-bb4caa6b424d",
    "primaryColor": "#2563EB",
    "status": "active",
    "createdAt": "2026-08-11T00:00:00.000Z",
    "updatedAt": "2026-08-11T12:35:00.000Z"
  }
}
```

---

## 8. Application Use Cases Contract

1. **`GetInstituteSettingsUseCase`**:
   - Accepts `{ tenantContext: TenantContext }`.
   - Verifies `SETTINGS_READ` or `INSTITUTE_READ` capability.
   - Fetches `InstituteEntity` via `InstituteRepository.findById(tenantContext.instituteId)`.
   - Returns clean DTO representation.

2. **`UpdateInstituteSettingsUseCase`**:
   - Accepts `{ tenantContext: TenantContext, details: UpdateInstituteDetailsProps }`.
   - Verifies `SETTINGS_UPDATE` or `INSTITUTE_UPDATE` capability.
   - Fetches `InstituteEntity` via `InstituteRepository.findById(tenantContext.instituteId)`.
   - Invokes `entity.updateDetails(details)`.
   - Persists via `InstituteRepository.update(entity)`.
   - Logs structured observability event `identity.institute.settings.updated`.
   - Creates `AuditLog` entry.

---

## 9. Security Threat Matrix

| Threat ID | Threat Vector | Mitigation Mechanism |
|:---|:---|:---|
| **SET-01** | Unauthenticated Settings Access | Reject with `401 AuthenticationError` |
| **SET-02** | Non-Owner Role Update Attempt | Reject with `403 AuthorizationError` via `requireCapability(tenantContext, 'settings:update')` |
| **SET-03** | Cross-Tenant `instituteId` Injection | Ignore client input; resolve target `instituteId` strictly from server `TenantContext` |
| **SET-04** | Slug Alteration / Hijacking | Slug is non-updatable in settings DTO |
| **SET-05** | Malicious Logo URL (XSS/SSRF) | Enforce HTTPS protocol and valid URL regex via Zod validator |
| **SET-06** | CSS Injection via `primaryColor` | Enforce rigid HEX regex `/^#([0-9A-Fa-f]{3}\|[0-9A-Fa-f]{6})$/` |
| **SET-07** | Suspended User Settings Access | Server tenant context resolution rejects non-active memberships |

---

## 10. Frontend & UI Architecture Contract

- **Route Page**: `apps/web/src/app/(app)/(workspace)/settings/page.tsx`
  - Server Component wrapper (< 30 lines).
  - Executes `requireAuthSession()` and `resolveServerTenantContext()`.
  - Asserts `settings:read` capability.
  - Passes initial settings data to `<InstituteSettingsContent />`.
- **Feature Component Boundary**: `apps/web/src/features/institute-settings/`
  - `components/institute-settings-form.tsx` (Tabbed UI for Profile, Regional, and Visual Branding).
  - `components/branding-preview.tsx` (Live visual theme color & logo preview).
  - `schemas/institute-settings-schema.ts` (Zod schema).
  - `hooks/use-institute-settings.ts` (React Query / mutation hook).

---

## 11. Implementation Sequence (Phase 1.5 Subphases)

```text
Phase 1.5.0 — Architecture & Contract Freeze 🟢 (ACCEPTED & FROZEN)
    ↓
Phase 1.5.1 — Settings Domain Use Cases & Authorization
    ↓
Phase 1.5.2 — Settings API Endpoints & Validators
    ↓
Phase 1.5.3 — Settings & Branding UI Feature (/settings)
    ↓
Phase 1.5.4 — Security E2E Matrix & Acceptance Gate
```

---

## 12. Explicit Non-Goals & Deferred Items

- ⏸ **Managed Asset Uploads (S3/Cloudflare R2)**: Deferred until object storage infrastructure phase.
- ⏸ **Custom Domains / CNAME Routing**: Deferred to future enterprise multi-tenant routing phase.
- ⏸ **Email Branding / Custom SMTP**: Deferred to communication phase.
- ⏸ **Password Recovery (Phase 0.12.6)**: Deferred until transactional email infrastructure is configured.
