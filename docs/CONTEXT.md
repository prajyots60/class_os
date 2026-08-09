# 🗺️ CoachingOS Project Context & Phase Progress Tracker

> **Authoritative Context Document**
>
> This document maintains the complete execution history, verified architecture state, completed milestone summaries, and upcoming phase roadmap for CoachingOS.

---

## 1. Project Overview & Architecture

CoachingOS is a multi-tenant SaaS operating system built for founder-led coaching institutes (50–500 students).

### Core Architectural Mandates
- **Architecture:** Modular Monolith inside a pnpm + Turborepo monorepo.
- **Multi-Tenancy:** Shared PostgreSQL database with automatic `institute_id` row-level scoping at the repository layer.
- **Two-Layer Parent Identity (ADR-006):** Separates global `ParentIdentity` (phone anchor) and parent-managed `ChildProfile` from tenant-scoped `InstituteParent` and `Student` records.
- **Operational Entity:** `Enrollment` (not Student) owns fee structures, status, and batch participation.
- **Session-Driven Academics:** Attendance is recorded against generated `BatchSession` records rather than raw dates.
- **Token-Driven White-Label UI:** One codebase supports many coaching identities via CSS variable tokens (`var(--color-primary)`, `var(--radius-card)`), avoiding custom CSS or separate apps.

### Authoritative Architecture Specifications
- **[Software Requirements Specification (SRS)](file:///home/supra/Desktop/class_os/docs/srs.md)**
- **[System Design Document (SDD)](file:///home/supra/Desktop/class_os/docs/sdd.md)**
- **[Database & API Design Document (DADD)](file:///home/supra/Desktop/class_os/docs/dadd.md)**
- **[Engineering Playbook](file:///home/supra/Desktop/class_os/docs/ENGINEERING_PLAYBOOK.md)**
- **[Milestone Roadmap](file:///home/supra/Desktop/class_os/docs/ROADMAP.md)**
- **[ADR-0001: Monorepo Architecture Strategy](file:///home/supra/Desktop/class_os/docs/adr/0001-monorepo-architecture.md)**
- **[Engineering Backlog](file:///home/supra/Desktop/class_os/docs/BACKLOG.md)**

---

## 2. Phase Execution Tracker

```text
Phase 0.1 — Repository Initialization          ✅ COMPLETED
Phase 0.2 — Monorepo Architecture              ✅ COMPLETED
Phase 0.3 — Web Application Foundation         ✅ COMPLETED
Phase 0.4 — Database + Prisma Foundation        🚧 NEXT
Phase 0.5 — Environment & Configuration         ⏳ PENDING
Phase 0.6 — Authentication Foundation          ⏳ PENDING
Phase 0.7 — Shared Engineering Infrastructure  ⏳ PENDING
Phase 0.8 — Testing Infrastructure              ⏳ PENDING
Phase 0.9 — Git & CI Pipelines                 ⏳ PENDING
Phase 0.10 — Observability Setup                ⏳ PENDING
Phase 0.11 — Production Deployment             ⏳ PENDING
                                                ↓
                                          PHASE 0 GATE
```

---

## 3. Completed Phase Overviews

### ✅ Phase 0.1 — Repository Initialization
- **Goal:** Establish a runnable pnpm + Turborepo monorepo skeleton.
- **What Was Built:**
  - Initialized monorepo workspace (`pnpm-workspace.yaml`, `turbo.json`, `package.json`, `tsconfig.json`).
  - Scaffolding Next.js 16 App Router application (`apps/web`) with TypeScript, Tailwind CSS v4, and ESLint.
  - Created package boundaries (`packages/*`) and infrastructure directories (`infrastructure/*`).
  - Standardized code style with `.editorconfig`, `.prettierrc`, and `.gitignore`.
  - Created initial Conventional Commit: `chore(repo): initialize coachingos monorepo`.

---

### ✅ Phase 0.2 — Monorepo Architecture
- **Goal:** Turn directory skeleton into a strictly governed workspace package graph.
- **What Was Built:**
  - Renamed Next.js web application package to `@coaching-os/web` for 100% scoped workspace consistency.
  - Configured explicit `"exports"` manifests (`src/index.ts`) in all 8 packages (`packages/*`).
  - Verified framework independence of domain packages (`identity`, `academics`, `billing`, `communication`, `administration`, `audit`).
  - Authored `ADR-0001: Monorepo Architecture Strategy` in `docs/adr/0001-monorepo-architecture.md`.
  - Committed changes: `chore(repo): establish monorepo architecture`.

---

### ✅ Phase 0.3 — Web Application Foundation
- **Goal:** Build the token-driven white-label design system, UI component library, and frontend infrastructure.
- **What Was Built:**
  - Created token-driven theme architecture (`ThemeConfig`, `THEME_PRESETS`) supporting white-label institute branding:
    - **Theme A ("Sharma Classes"):** Blue primary (`#2563eb`), Poppins font, rounded cards (`1rem`).
    - **Theme B ("Apex Academy"):** Orange primary (`#ea580c`), Manrope font, sharper cards (`0.25rem`).
  - Built source-owned UI component primitives in `@coaching-os/ui` (`Button`, `Input`, `Card`, `Badge`, `cn` helper).
  - Implemented curated Google typography system (`Inter`, `Manrope`, `Poppins`, `Nunito`) in `RootLayout`.
  - Configured shallow Provider tree (`QueryProvider` with TanStack Query + `ThemeProvider`).
  - Implemented Zustand UI state store (`useUIStore`) for dynamic theme toggling and sidebar UI state.
  - Created App Router infrastructure routes: `loading.tsx` (skeleton spinner), `error.tsx` (error boundary), and `not-found.tsx` (404 page).
  - Built interactive Design Showcase Page (`apps/web/src/app/page.tsx`) featuring real-time theme toggling, typography, buttons, badges, cards, Lucide icons, and React Hook Form + Zod demo lead form with validation.
  - **Refactoring (UI-001):** Moved `ThemeConfig` and `THEME_PRESETS` into `@coaching-os/ui` (`packages/ui/src/theme/`) so `@coaching-os/shared` remains 100% reserved for cross-cutting non-UI primitives.
  - Committed changes: `feat(web): establish frontend foundation`.

---

## 4. Next Milestone Roadmap

### 🚧 Phase 0.4 — Database + Prisma Foundation
- Configure PostgreSQL database connection and pooling in `infrastructure/database`.
- Initialize Prisma ORM 7 setup and schema definitions (`schema.prisma`).
- Map base tables per DADD specification (`institutes`, `users`, `parent_identities`, `institute_memberships`, `institute_parents`, `students`, `child_profiles`, `student_links`, etc.).
- Generate initial migration and seed scripts.
