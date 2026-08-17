# Phase 6.9 — Advanced Settings UX Refinement

## 1. Executive Summary

Phase 6.9 refines the existing Phase 1.5 Institute Settings capability into a coherent, production-grade staff settings workspace at `/settings`. It introduces a multi-section navigation structure (**Institute Details**, **White-Label Branding**, and **Academic Defaults**), URL state synchronization (`/settings?section=...`), live branding preview, dirty-state form tracking, and dedicated UI/security test matrices while strictly preserving the underlying backend contract, frozen REST endpoints (`GET/PATCH /api/institute/settings`), and zero-database-changes invariant (`Schema changes: 0`, `Migrations: 0`).

- **Domain & Endpoint Reuse:** Reused existing `@coaching-os/identity` use cases (`GetInstituteSettingsUseCase`, `UpdateInstituteSettingsUseCase`) and REST route handler at `/api/institute/settings`. Zero duplicate APIs or settings tables created.
- **Zero Database Schema Alteration:** `Schema changes: 0`, `Migrations: 0`. Retained existing `Institute` fields (`name`, `phone`, `email`, `timezone`, `logoUrl`, `primaryColor`, `slug`).
- **Academic System Defaults Boundary:** Rendered supported system defaults (Timezone `Asia/Kolkata`, Session-level attendance rules, Grading matrix standards, Tenant isolation policies) with notice documentation that custom batch schedules and capacities are managed in the Academic Workspace. Zero unpersisted database fields added.
- **URL State & Navigation:** Integrated `useSearchParams()` (`section=institute | branding | academic`) with default fallback to `section=institute`. Supports deep-linking, tab switching, and browser back/forward navigation.

---

## 2. Information Architecture & UX Components

### A. Components (`apps/web/src/features/institute-settings/`)
- **`InstituteSettingsContent`**: Wrapped in `<Suspense fallback={<SettingsSkeleton />}>`. Renders staff settings shell, section switcher (sidebar for desktop $\ge 1024\text{px}$, tab bar for mobile $320\text{px}-768\text{px}$), active section view, dirty-state Reset button, and Save Changes button ("Save Changes" / "Saving..." / "Settings saved successfully").
- **`InstituteProfileForm`**: Refined form for Institute Name, Phone, Email, Timezone, and immutable Slug (read-only styling with public URL hint).
- **`InstituteBrandingForm`**: Refined form for HTTPS Logo URL, Primary Color HEX input + visual color swatch, and live `ColorPreview` & `LogoPreview`.
- **`AcademicDefaultsSection`**: Card displaying standard system defaults (Timezone, Attendance Policy, Evaluation Matrix, Tenant Scoping) and academic boundary notice box.

---

## 3. Verification & Quality Gates

The implementation passed 100% of quality gates:

```bash
pnpm env:check          # 🟢 SUCCESS — Environment config 100% valid
pnpm db:validate        # 🟢 SUCCESS — Prisma schema valid (0 schema changes)
pnpm db:health          # 🟢 SUCCESS — PostgreSQL health check round-trip latency: 72ms
pnpm typecheck          # 🟢 SUCCESS — Strict TypeScript typecheck passed (13/13 packages)
pnpm lint               # 🟢 SUCCESS — ESLint 0 errors across 13/13 packages
pnpm test               # 🟢 SUCCESS — 1167/1167 unit & integration tests passed clean
pnpm build              # 🟢 SUCCESS — Production build of packages and Next.js app
```

### Test Suite Execution Summary
- `settings-ux.test.tsx` (`SETTINGS-UX-001..013`): **13/13 Passed**
- `settings-security.test.ts` (`SETTINGS-6.9-SEC-001..012`): **12/12 Passed**
- `route.test.ts` (Phase 1.5 Settings Integration Matrix): **19/19 Passed**
- Monorepo Total Test Count: **1167/1167 Passed**
