# Phase 0.12 — Public & Authentication UX Architecture Contract

**Status:** Architecture Freeze 🟢  
**Milestone:** Phase 0.12.0 — Architecture & UX Contract  
**Target:** Establish a scalable, componentized frontend architecture for CoachingOS, defining public marketing, authentication journeys, route groups, thin page composition boundaries, and design system contracts.

---

## 1. Executive Summary & Audit Findings

### 1.1 Existing Frontend & Auth Audit Findings
- **App Router Structure**: Currently flat (`app/page.tsx`, `app/onboarding/page.tsx`, `app/dashboard/page.tsx`).
- **Authentication Backend Capabilities (`@coaching-os/auth`)**:
  - `signUp.email` (`POST /api/auth/sign-up/email` with 5 attempts / 60s rate limit) — **Supported**
  - `signIn.email` (`POST /api/auth/sign-in/email` with 3 attempts / 10s rate limit) — **Supported**
  - `signOut` (`POST /api/auth/sign-out`) — **Supported**
  - `useSession` / `getAuthenticatedSession` — **Supported**
  - `forgetPassword` / `resetPassword` — Rate limit rules configured in Better Auth (`/forget-password`, `/reset-password`), but email delivery / reset token workflow is **Deferred (Phase 0.12.6)** until email infrastructure is connected.
  - OAuth / Magic Link / Email Verification — **Not Configured / Deferred**.
- **Page Composition Audit**:
  - `app/page.tsx` currently contains 375 lines of inline showcase UI, demo form validation, and theme controls.
  - `app/onboarding/page.tsx` contains 221 lines of inline form state, Zod validation, and fetch handlers.
  - Needs refactoring into thin App Router route compositions using feature components under `features/`.

---

## 2. Monorepo Frontend Architecture & Folder Structure

```text
apps/web/src/
├── app/
│   ├── (marketing)/              ← Route Group: Public Marketing Pages
│   │   ├── layout.tsx            ← Marketing Header + Main + Footer Layout
│   │   └── page.tsx              ← Thin composition: <LandingPage />
│   │
│   ├── (auth)/                   ← Route Group: Authentication Shell
│   │   ├── layout.tsx            ← Centered Auth Card Layout & Branding Shell
│   │   ├── login/
│   │   │   └── page.tsx          ← Thin composition: <SignInPage />
│   │   ├── signup/
│   │   │   └── page.tsx          ← Thin composition: <SignUpPage />
│   │   ├── forgot-password/
│   │   │   └── page.tsx          ← Thin composition: <ForgotPasswordPage /> (Deferred)
│   │   └── reset-password/
│   │       └── page.tsx          ← Thin composition: <ResetPasswordPage /> (Deferred)
│   │
│   ├── (app)/                    ← Route Group: Protected Application Shell
│   │   ├── layout.tsx            ← Authenticated App Layout (Topbar, Sidebar container)
│   │   ├── onboarding/
│   │   │   └── page.tsx          ← Thin composition: <OnboardingPage />
│   │   └── dashboard/
│   │       └── page.tsx          ← Thin composition: <DashboardPage />
│   │
│   ├── api/                      ← HTTP Route Handlers
│   ├── globals.css
│   └── layout.tsx                ← Root Layout (HTML, Fonts, ThemeProvider)
│
├── components/                   ← GENERIC REUSABLE UI PRIMITIVES
│   ├── ui/                       ← Reusable Design System Tokens (Button, Input, Card, Badge)
│   ├── layout/                   ← Layout Primitives (Container, Section, PageHeader)
│   └── navigation/               ← Shared Navigation Primitives (Logo, NavLink, UserMenu)
│
├── features/                     ← BUSINESS & PRODUCT-SPECIFIC UI & LOGIC
│   ├── marketing/                ← Public Landing Page Feature
│   │   └── components/           ← HeroSection, FeaturesGrid, WorkflowSection, FinalCTA, Footer
│   │
│   ├── auth/                     ← Authentication Feature
│   │   ├── components/           ← SignInForm, SignUpForm, AuthCard, PasswordField, AuthError
│   │   ├── hooks/                ← useAuthSession, useAuthActions
│   │   └── schemas/              ← signInSchema, signUpSchema (Zod)
│   │
│   ├── onboarding/               ← Institute Onboarding Feature
│   │   ├── components/           ← InstituteSetupForm, OnboardingHeader, SlugPreview
│   │   └── hooks/                ← useInstituteOnboarding
│   │
│   └── dashboard/                ← Tenant Dashboard Feature
│       └── components/           ← TenantHeader, StatCards, QuickActions
│
├── lib/                          ← Utilities & Infrastructure Clients
│   ├── auth/                     ← Auth client exports & session helpers
│   └── utils/                    ← Formatting & DOM utilities
├── providers/                    ← Global React Context Providers
└── stores/                       ← Zustand UI stores
```

---

## 3. Thin Page Composition Principle (Non-Negotiable)

**Invariant:** App Router pages (`app/**/page.tsx`) MUST remain thin route composition boundaries (under 30 lines of code). They MUST NOT contain inline form state, raw fetch API calls, or multi-hundred-line JSX layouts.

### Example Page Composition Invariant:
```tsx
// app/(auth)/login/page.tsx (THIN ROUTE BOUNDARY)
import { SignInForm } from '@/features/auth/components/sign-in-form';

export default function LoginPage() {
  return <SignInForm />;
}
```

---

## 4. Component Ownership Rules

| Directory | Ownership Scope | Allowed Content | Prohibited Content |
|---|---|---|---|
| `components/ui/` | Generic Design System Primitives | `Button`, `Input`, `Card`, `Badge`, `Dialog` | CoachingOS business logic, domain entities, API calls |
| `components/layout/` | Structural Containers | `Container`, `Section`, `Grid`, `PageHeader` | Feature-specific business forms or auth hooks |
| `components/navigation/` | Shared Nav Primitives | `Logo`, `NavLink`, `UserMenu` | Direct database or server action imports |
| `features/auth/` | Authentication Business Logic & UI | `SignInForm`, `SignUpForm`, `useAuthSession` | Direct Prisma imports or server-side authorization authority |
| `features/marketing/` | Public Product Showcase UI | `HeroSection`, `WorkflowSection`, `Footer` | Auth session mutations or protected tenant logic |
| `features/onboarding/` | Onboarding Setup UI | `InstituteSetupForm`, `SlugPreview` | Direct DB mutations (calls `/api/onboarding/institute`) |
| `features/dashboard/` | Authenticated Tenant UI | `TenantHeader`, `OverviewStats` | Bypassing `GET /api/dashboard/context` guard |

---

## 5. Security & Authorization Boundary

The browser MUST NEVER be treated as the authority for identity, tenancy, or permissions.

```text
Browser Client Component
         │
         ├── Sends Session Cookie / Authentication Request
         │
         ▼
Server Boundary (API Route / Server Component)
         │
         ├── 1. Better Auth session validation (getAuthenticatedSession)
         ├── 2. ResolveInstituteMembershipUseCase
         ├── 3. Produce Trusted TenantContext
         └── 4. Evaluate Capability via AuthorizationEngine
```

- **Client Session Hook (`useSession`)**: Used purely for UX state (display user name, toggle auth buttons, show loading skeletons).
- **Server Tenant Guard (`GET /api/dashboard/context`)**: Sole authority for tenant context resolution (`hasTenant: true/false`).

---

## 6. Authentication & Route State Machine

### Navigation State Rules:

```text
                                  ┌────────────────────────┐
                                  │   Anonymous Visitor    │
                                  └───────────┬────────────┘
                                              │
                         ┌────────────────────┴────────────────────┐
                         ▼                                         ▼
                 ┌───────────────┐                         ┌───────────────┐
                 │  / (Landing)  │                         │ /login, /signup│
                 └───────┬───────┘                         └───────┬───────┘
                         │                                         │
                         └────────────────────┬────────────────────┘
                                              │ Authenticate via Better Auth
                                              ▼
                                   ┌─────────────────────┐
                                   │ Session Active      │
                                   └──────────┬──────────┘
                                              │
                              GET /api/dashboard/context
                                              │
                      ┌───────────────────────┴───────────────────────┐
                      ▼                                               ▼
             hasTenant: false                                 hasTenant: true
                      │                                               │
                      ▼                                               ▼
         ┌────────────────────────┐                      ┌────────────────────────┐
         │      /onboarding       │                      │       /dashboard       │
         │ (Institute Setup Form) │                      │   (Tenant Workspace)   │
         └────────────┬───────────┘                      └────────────────────────┘
                      │ Onboarding Complete (201)
                      └───────────────────────────────────────────────┘
```

1. **Anonymous User**:
   - Visiting `/` → Renders Marketing Landing Page.
   - Visiting `/login` or `/signup` → Renders Authentication Forms.
   - Visiting `/onboarding` or `/dashboard` → Server/Guard detects no session → Redirects to `/login`.

2. **Authenticated User (Without Active Institute Tenant)**:
   - Visiting `/` or `/login` or `/signup` → Redirected to `/onboarding`.
   - Visiting `/dashboard` → Server/Guard resolves `hasTenant: false` → Redirected to `/onboarding`.
   - Visiting `/onboarding` → Renders Institute Onboarding Form.

3. **Authenticated User (With Active Institute Tenant)**:
   - Visiting `/` or `/login` or `/signup` or `/onboarding` → Server/Guard resolves `hasTenant: true` → Redirected to `/dashboard`.
   - Visiting `/dashboard` → Renders Authenticated Institute Workspace.

---

## 7. Visual Design & Product Aesthetics Directive

CoachingOS visual design must convey **Professionalism, Speed, Operational Density, and Trust**.

- **Target Audience**: Coaching institute owners, teachers, parents, and administrative staff.
- **Palette**: Deep navy/slate neutrals, vibrant indigo/royal primary accents (`hsl(222, 47%, 11%)`), emerald success badges, warm amber warning indicators.
- **Typography**: Inter / Outfit sans-serif hierarchy with high legibility, strict vertical baseline grid, and high-density data tables.
- **Micro-Animations**: Framer Motion subtle hover effects, layout transitions, button loading states (`shouldReduceMotion` respected).

---

## 8. Subphase Implementation Sequence (Phase 0.12 Roadmap)

```text
Phase 0.12.0  Architecture & UX Contract Freeze ✅
Phase 0.12.1  UI Foundation & Design System Audit ✅ (COMPLETED)
Phase 0.12.2  Public Landing Page 🚧 (IN PROGRESS)
      ├── Phase 0.12.2.0 — Landing Page UX & Content Contract 🟢 (FROZEN)
      ├── Phase 0.12.2.1 — Marketing Layout Shell ✅ (COMPLETED)
      ├── Phase 0.12.2.2 — Hero Section Component ✅ (COMPLETED)
      ├── Phase 0.12.2.3 — Product Workflow Section Component ✅ (COMPLETED)
      ├── Phase 0.12.2.4 — Core Capabilities Section Component ✅ (COMPLETED)
      ├── Phase 0.12.2.5 — Roles & Value Section Component (Next)
      ├── Phase 0.12.2.6 — Trust & Security Section Component
      ├── Phase 0.12.2.7 — Final CTA Section Component
      ├── Phase 0.12.2.8 — Responsive, SEO & Accessibility Audit
      └── Phase 0.12.2.9 — Phase 0.12.2 Acceptance Gate
Phase 0.12.3  Authentication Layout & Shared Components
Phase 0.12.4  Sign Up UI
Phase 0.12.5  Sign In UI
Phase 0.12.6  Password Recovery UI (Deferred until Email Provider Ready)
Phase 0.12.7  Session & Route Guards
Phase 0.12.8  Authenticated Application Shell
Phase 0.12.9  Full Browser Journey Integration
Phase 0.12.10 Security & UX Test Matrix
Phase 0.12.11 Phase 0.12 Acceptance Gate
```

---

## 9. Verification & Non-Regression Invariants

- **Monorepo Tests**: All package unit tests (`@coaching-os/identity`, `@coaching-os/web`, `@coaching-os/ui`, etc.) must pass.
- **Verification Commands**: `pnpm env:check`, `db:validate`, `db:health`, `db:drift:check`, `verify:auth`, `verify:infra`, `verify:observability` must pass.
- **Typecheck & Lint**: `pnpm typecheck`, `pnpm lint`, `pnpm build` must pass cleanly.

---

## 10. Phase 0.12.1 — UI Foundation & Design System Audit Completion

**Status:** 🟢 **COMPLETED & VERIFIED**  
**Code Commit:** `f504e45` (`feat(ui): establish CoachingOS UI foundation`)  

### Component Inventory & Boundary Decisions:
1. **`packages/ui` Primitives**:
   - **Retained & Exported**: `Button`, `Input`, `Card`, `Badge`, `cn`, `THEME_PRESETS`.
   - **Created Foundational Primitives**:
     - `Label` (`components/label.tsx`): Reusable accessible form label primitive.
     - `Textarea` (`components/textarea.tsx`): Reusable text area with label and error support.
     - `Alert` & `AlertTitle`, `AlertDescription` (`components/alert.tsx`): Status banners (`info`, `success`, `warning`, `destructive`).
     - `Spinner` (`components/spinner.tsx`): Size-variant SVG loading spinner.
     - `Skeleton` (`components/skeleton.tsx`): Pulse loading placeholder.
     - `Separator` (`components/separator.tsx`): Horizontal/vertical divider line.
2. **`apps/web` Web App Foundational Components**:
   - `CoachingOSLogo` (`apps/web/src/components/brand/logo.tsx`): Reusable product branding component.
   - `Container` & `Section` (`apps/web/src/components/layout/container.tsx`): Reusable responsive layout wrappers.
3. **Unit Test Suite**:
   - Added `@coaching-os/ui` Vitest test suite (`packages/ui/src/components/ui-primitives.test.ts`) verifying `buttonVariants`, `badgeVariants`, `alertVariants`, `cn`, and `THEME_PRESETS`.

---

## 11. Phase 0.12.2.0 — Public Landing Page UX & Content Contract Completion

**Status:** 🟢 **FROZEN & VERIFIED**  
**Contract Document:** `docs/phases/phase0.12.2-landing-page.md`  

### Key Architectural & Content Freeze Decisions:
1. **Target Audience**: Coaching institute owners, founders, and administrators.
2. **Core Positioning Statement**: *"Run your coaching institute from one place."*
3. **Primary CTAs**: `"Get Started"` (`/sign-up`) as primary conversion action, `"Sign In"` (`/sign-in`) as secondary action.
4. **Information Architecture**:
   - 1. Header (`MarketingHeader`)
   - 2. Hero (`HeroSection`)
   - 3. Workflow (`WorkflowSection`)
   - 4. Core Capabilities (`CapabilitiesSection`)
   - 5. Stakeholder Roles (`RolesSection`)
   - 6. Trust & Security (`TrustSection`)
   - 7. Final CTA (`CTASection`)
   - 8. Footer (`MarketingFooter`)
5. **Security Messaging Boundary**: Restricted to factual architectural invariants (tenant isolation by `institute_id`, capability RBAC, server-side session authorization, audit logging). No fake SOC2 or ISO claims.
6. **Component Layout**: Componentized under `apps/web/src/components/marketing/` to enforce thin `page.tsx` (< 30 lines).
7. **Public Boundary**: Zero database queries, ORM imports, or tenant context logic in public marketing pages.

---

## 12. Phase 0.12.2.1 — Marketing Layout Shell Completion

**Status:** 🟢 **COMPLETED & VERIFIED**  
**Code Commit:** `8679d0b` (`feat(web): establish marketing layout shell`)  

### Implementation Details:
1. **Route Group Architecture**:
   - `apps/web/src/app/(marketing)/layout.tsx`: Public marketing shell rendering `MarketingHeader` + `<main>` + `MarketingFooter`.
   - `apps/web/src/app/(marketing)/page.tsx`: Thin composition boundary placeholder serving `/`.
   - Removed old 375-line `apps/web/src/app/page.tsx` to prevent App Router route collisions.
2. **`MarketingHeader` (`apps/web/src/components/marketing/marketing-header.tsx`)**:
   - Reuses `CoachingOSLogo` and `Container` primitives.
   - Desktop anchor navigation (`/#features`, `/#workflow`, `/#security`).
   - Auth action CTAs (`/sign-in`, `/sign-up`).
   - Integrated `<MobileNav />` client toggle component for accessible mobile overlay.
3. **`MarketingFooter` (`apps/web/src/components/marketing/marketing-footer.tsx`)**:
   - Reuses `CoachingOSLogo`, `Container`, `Section`, and `Badge` primitives.
   - Product and Account link columns.
   - Live system status indicator badge (`"System Operational"`).
   - Dynamic current year copyright (`© 2026 CoachingOS`).
4. **Testing Suite**:
   - Created `apps/web/src/components/marketing/marketing-layout.test.ts` verifying export boundaries.

---

## 13. Phase 0.12.2.2 — Hero Section Component Completion

**Status:** 🟢 **COMPLETED & VERIFIED**  
**Code Commit:** `06f7866` (`feat(web): implement marketing hero section`)  

### Implementation Details:
1. **`HeroSection` (`apps/web/src/components/marketing/hero-section.tsx`)**:
   - 100% Server Component adhering to Section 7.2 of frozen UX contract.
   - Eyebrow Badge: `"Built for Coaching Institutes"` (`Badge` variant `"secondary"` with `Sparkles` icon).
   - Headline H1: *"Run your coaching institute from one place."*
   - Supporting Copy: *"Manage students, academics, attendance, tests, fees, staff, and day-to-day institute operations through one connected platform."*
   - Primary CTA: `"Get Started"` (`/sign-up`) with `ArrowRight` icon.
   - Secondary CTA: `"Sign In"` (`/sign-in`).
   - Trust Micro-copy: Multi-tenant Isolation, Role-based Security, Zero credit card required.
2. **`HeroProductPreview` (`apps/web/src/components/marketing/hero-product-preview.tsx`)**:
   - Clean, structured CSS/React mockup illustrating CoachingOS institute workspace dashboard (top browser bar, tenant isolation badge, institute header, student/batch/attendance stat cards, today's class schedule preview).
3. **Composition**:
   - Composed `<HeroSection />` in `apps/web/src/app/(marketing)/page.tsx` (under 10 lines of code).
4. **Testing Suite**:
   - Created `apps/web/src/components/marketing/hero-section.test.ts` verifying component export boundaries and zero DB/Auth module dependencies.

---

## 14. Phase 0.12.2.3 — Product Workflow Section Completion

**Status:** 🟢 **COMPLETED & VERIFIED**  
**Code Commit:** `38a94e5` (`feat(web): implement workflow and capabilities sections`)  

### Implementation Details:
1. **`WorkflowSection` (`apps/web/src/components/marketing/workflow-section.tsx`)**:
   - 100% Server Component rendering `<section id="workflow">`.
   - Eyebrow Badge: `"Operational Workflow"`.
   - Headline H2: *"How CoachingOS works for your institute."*
   - 4 Step Grid:
     - `STEP 01`: Set Up Your Institute
     - `STEP 02`: Add Team & Students
     - `STEP 03`: Run Daily Operations
     - `STEP 04`: Stay in Total Control
2. **Testing Suite**:
   - Created `apps/web/src/components/marketing/workflow-section.test.ts`.

---

## 15. Phase 0.12.2.4 — Core Capabilities Section Completion

**Status:** 🟢 **COMPLETED & VERIFIED**  
**Code Commit:** `38a94e5` (`feat(web): implement workflow and capabilities sections`)  

### Implementation Details:
1. **`CapabilitiesSection` (`apps/web/src/components/marketing/capabilities-section.tsx`)**:
   - 100% Server Component rendering `<section id="features">`.
   - Eyebrow Badge: `"Core Platform Capabilities"`.
   - Headline H2: *"Everything needed to manage your coaching class."*
   - 8 Module Domain Cards: Student Management, Academic Operations, Attendance Tracking, Homework & Tasks, Tests & Marks, Fees & Billing, Staff & Role Control, Institute Announcements.
2. **Testing Suite**:
   - Created `apps/web/src/components/marketing/capabilities-section.test.ts`.





