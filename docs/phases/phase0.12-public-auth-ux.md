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
Phase 0.12.2  Public Landing Page ✅ (COMPLETED & FROZEN)
      ├── Phase 0.12.2.0 — Landing Page UX & Content Contract 🟢 (FROZEN)
      ├── Phase 0.12.2.1 — Marketing Layout Shell ✅ (COMPLETED)
      ├── Phase 0.12.2.2 — Hero Section Component ✅ (COMPLETED)
      ├── Phase 0.12.2.3 — Product Workflow Section Component ✅ (COMPLETED)
      ├── Phase 0.12.2.4 — Core Capabilities Section Component ✅ (COMPLETED)
      ├── Phase 0.12.2.5 — Roles & Value Section Component ✅ (COMPLETED)
      ├── Phase 0.12.2.6 — Trust & Security Section Component ✅ (COMPLETED)
      ├── Phase 0.12.2.7 — Final CTA Section Component ✅ (COMPLETED)
      ├── Phase 0.12.2.8 — Responsive, SEO & Accessibility Audit ✅ (COMPLETED)
      └── Phase 0.12.2.9 — Phase 0.12.2 Acceptance Gate 🟢 (ACCEPTED & FROZEN)
Phase 0.12.3  Authentication Layout & Shared Components ✅ (COMPLETED)
Phase 0.12.4  Sign Up UI (Next)
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
   - Desktop anchor navigation (`/#features`, `/#workflow`, `/#roles`, `/#security`).
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

---

## 16. Phase 0.12.2.5 — Roles & Value Section Completion

**Status:** 🟢 **COMPLETED & VERIFIED**  
**Code Commit:** `a4b1a3f` (`feat(web): implement roles and trust sections`)  

### Implementation Details:
1. **`RolesSection` (`apps/web/src/components/marketing/roles-section.tsx`)**:
   - 100% Server Component rendering `<section id="roles">`.
   - Eyebrow Badge: `"Role-Based Value"`.
   - Headline H2: *"Built for every stakeholder in your institute."*
   - 4 Canonical Role Cards: Institute Owner, Teacher, Assistant, Parent & Student.
2. **Testing Suite**:
   - Created `apps/web/src/components/marketing/roles-section.test.ts`.

---

## 17. Phase 0.12.2.6 — Trust / Security Section Completion

**Status:** 🟢 **COMPLETED & VERIFIED**  
**Code Commit:** `a4b1a3f` (`feat(web): implement roles and trust sections`)  

### Implementation Details:
1. **`TrustSection` (`apps/web/src/components/marketing/trust-section.tsx`)**:
   - 100% Server Component rendering `<section id="security">`.
   - Eyebrow Badge: `"Architectural Trust & Security"`.
   - Headline H2: *"Enterprise security designed for coaching data."*
   - 4 Technical Trust Concepts: Row-Level Tenant Isolation, Capability-Based RBAC, Server-Controlled Sessions, Audit Logging & PII Protection.
2. **Testing Suite**:
   - Created `apps/web/src/components/marketing/trust-section.test.ts`.

---

## 18. Phase 0.12.2.7 — Final CTA Section Completion

**Status:** 🟢 **COMPLETED & VERIFIED**  
**Code Commit:** `b81312f` (`feat(web): implement final landing page CTA`)  

### Implementation Details:
1. **`CTASection` (`apps/web/src/components/marketing/cta-section.tsx`)**:
   - 100% Server Component rendering `<section id="get-started">`.
   - Eyebrow Badge: `"Ready to Organize Your Institute?"`.
   - Headline H2: *"Bring your institute's operations into one connected workspace."*
   - Conversion Actions: Primary CTA `"Get Started"` (`/sign-up`) + Secondary CTA `"Sign In"` (`/sign-in`).
   - Micro-copy: `"Multi-tenant isolation • Role-based security • Zero credit card required"`.
2. **Testing Suite**:
   - Created `apps/web/src/components/marketing/cta-section.test.ts`.

---

## 19. Phase 0.12.2.8 — Responsive, SEO & Accessibility Audit Completion

**Status:** 🟢 **COMPLETED & VERIFIED**  
**Code Commit:** `b81312f` (`feat(web): implement final landing page CTA`)  

### Audit Findings & Verification Details:
1. **Responsive Audit**: Verified 5 responsive viewports (`320px`, `375px`, `768px`, `1024px`, `1280px+`). Applied `scroll-mt-16` across all section landmarks to ensure zero title clipping beneath the sticky `MarketingHeader` (`h-16`).
2. **Accessibility Audit (WCAG 2.1 AA)**: Exactly 1 primary `<h1>` on the landing page (Hero headline). All sub-sections use semantic `<h2>` tags. Verified keyboard navigation, `:focus-visible:ring-2` focus rings, and screen-reader safe presentation.
3. **SEO & Metadata Audit**: Configured Open Graph (`og:title`, `og:description`), Twitter card metadata, and semantic description in `apps/web/src/app/(marketing)/layout.tsx`.
4. **Security Claim Verification**: Verified 100% factual accuracy of security messaging against codebase invariants (Row-Level Tenant Isolation, Capability-Based RBAC, Server Sessions via Better Auth, Pino Logging & Redaction). Zero fake compliance seals.
---

## 20. Phase 0.12.2.9 — Landing Page Acceptance Gate Completion

**Status:** 🟢 **ACCEPTED & FROZEN**  
**Code Commit:** `5697449` (`fix(web): finalize landing page acceptance`)  
**Decision:** **ACCEPTED** — All acceptance criteria pass cleanly.

### Formal Acceptance Summary:
1. **Route & Composition**: `/` resolves cleanly via `app/(marketing)` route group with thin composition boundary `page.tsx` (< 25 lines). No route collisions.
2. **Section Hierarchy**: All 6 required sections present in frozen sequence (`Hero`, `Workflow`, `Capabilities`, `Roles`, `Trust`, `CTA`) with valid section IDs (`#hero`, `#workflow`, `#features`, `#roles`, `#security`, `#get-started`).
3. **Navigation Integrity**: Desktop & mobile header navigation links (`/#features`, `/#workflow`, `/#roles`, `/#security`, `/sign-in`, `/sign-up`) and footer links resolve cleanly. Mobile drawer toggle with ESC key listener and `aria-expanded` attributes verified.
4. **Responsive & Accessibility Invariants**: 5 responsive viewports verified (`320px` to `1280px+`), zero horizontal overflow, `scroll-mt-16` anchor offset, single `<h1>` page heading hierarchy, keyboard `:focus-visible:ring-2` focus indicators.
---

## 21. Phase 0.12.3 — Authentication Layout & Shared Components Completion

**Status:** 🟢 **COMPLETED & VERIFIED**  
**Code Commit:** `30c747b` (`feat(web): establish authentication UI foundation`)  

### Implementation Details:
1. **Route Group Layout (`apps/web/src/app/(auth)/layout.tsx`)**:
   - Established `app/(auth)/layout.tsx` rendering `<AuthLayoutShell>{children}</AuthLayoutShell>` without adding `/auth` URL prefixes. Target contracts `/sign-in` and `/sign-up` preserved.
2. **Feature Components Structure (`apps/web/src/features/auth/`)**:
   - `auth-layout-shell.tsx`: Shared centered layout wrapper rendering branding, container card, and legal micro-copy.
   - `auth-branding.tsx`: Shared branding header with `CoachingOSLogo`, product tagline, and tenant security badge.
   - `auth-card.tsx`: Responsive card container (`max-w-md w-full`) with subtle border and shadow.
   - `auth-header.tsx`: Reusable header component accepting dynamic `title`, `description`, and `eyebrow`.
   - `auth-field.tsx`: Composition wrapper connecting `@coaching-os/ui` `Label`, `Input`, description, and field validation error.
   - `auth-error.tsx`: Safe public error alert primitive utilizing `@coaching-os/ui` `Alert`.
   - `auth-footer.tsx`: Contextual navigation footer accepting dynamic `prompt`, `linkLabel`, and `href`.
   - `index.ts`: Barrel export file.
3. **Temporary Routing Placeholders**:
   - Created minimal placeholder routes `app/(auth)/sign-in/page.tsx` and `app/(auth)/sign-up/page.tsx` to verify layout rendering and navigation contracts without auth form logic.
4. **Testing Suite**:
   - Created `apps/web/src/features/auth/components/auth-foundation.test.ts` (6 unit tests). Verified export boundaries and zero prohibited server/database/auth dependencies in presentation components.
5. **Explicit Deferrals**:
   - Sign Up form logic & submit handler (Completed in Phase 0.12.4).
   - Sign In form logic & submit handler (Completed in Phase 0.12.5).
   - Password reset, email verification, OAuth UI (Deferred).

---

## 22. Phase 0.12.4 — Sign Up UI & Registration Flow Completion

**Status:** 🟢 **COMPLETED & VERIFIED**  
**Code Commit:** `41217f4` (`feat(web): implement sign up UI & registration flow (Phase 0.12.4)`)  

### Implementation Details:
1. **Sign-Up Form Schema & Types**:
   - `signUpSchema` (`apps/web/src/features/auth/sign-up/sign-up-schema.ts`): Zod validator for name (min 2), email format, password (min 8), and confirm password matching.
   - `sign-up-types.ts`: `SignUpState` state machine (`idle | submitting | success | error`) and `SignUpPayload` DTO.
2. **SignUpForm Client Component**:
   - `SignUpForm` (`apps/web/src/features/auth/sign-up/sign-up-form.tsx`): Built with `react-hook-form` and `@hookform/resolvers/zod`.
   - Connected directly to `signUp.email()` from `@coaching-os/auth/client`.
   - Includes password visibility toggles (`Eye` / `EyeOff`), loading state (`Spinner`), and safe error mapping (`AuthError`).
   - `useSession()` guard automatically redirects authenticated users away from `/sign-up` to `/onboarding`.
3. **Route Page Composition**:
   - `app/(auth)/sign-up/page.tsx`: Thin Server Component composition embedding `<SignUpForm />`.
4. **Testing & Security Matrix**:
   - Unit tests: `sign-up-schema.test.ts` (14/14 passed) and `sign-up-form.test.ts` (7/7 passed).
   - E2E tests: `apps/web/e2e/sign-up.spec.ts` (9/9 passed).
   - Security: Zero tenant/identity payload injection (`userId`, `instituteId`, `membershipId`, `role`, `status`, `tenantId`). Safe error mapping prevents database/Prisma traceback exposure.

---

## 23. Phase 0.12.5 — Sign In UI & Authentication Flow Completion

**Status:** 🟢 **COMPLETED & VERIFIED**  
**Code Commit:** `Pending` (`feat(web): implement sign-in authentication flow`)  

### Implementation Details:
1. **Sign-In Form Schema & Types**:
   - `signInSchema` (`apps/web/src/features/auth/sign-in/sign-in-schema.ts`): Zod validation for required `email` ("Email address is required.", "Please enter a valid email address.") and `password` ("Password is required.").
   - `sign-in-types.ts`: `SignInPhase` state machine (`idle | submitting | success | error`), `SignInState`, and `SignInPayload` DTO.
2. **SignInForm Client Component**:
   - `SignInForm` (`apps/web/src/features/auth/sign-in/sign-in-form.tsx`): Built with `react-hook-form` and `@hookform/resolvers/zod` with `mode: 'onSubmit'`.
   - Connected directly to `signIn.email()` from `@coaching-os/auth/client`.
   - Includes password visibility toggle (`Eye` / `EyeOff`), `autoComplete="current-password"`, `autoComplete="email"`, `Spinner` loading indicator, and `AuthError` alerts.
   - `sanitizeCallbackUrl` helper sanitizes optional `callbackUrl` search params, rejecting external phishing URLs (e.g. `https://evil.com`) and allowing only safe relative internal paths (e.g. `/dashboard`).
   - Post-authentication routing checks `/api/dashboard/context` server-side: redirects users with an active institute to `/dashboard` (or safe `callbackUrl`), and users without an institute to `/onboarding`.
   - `useSession()` guard automatically redirects already-authenticated users away from `/sign-in` to `/dashboard` or `/onboarding`.
3. **Route Page Composition**:
   - `app/(auth)/sign-in/page.tsx`: Thin Server Component composition boundary (< 30 lines) embedding `<SignInForm />` inside `<React.Suspense>`.
4. **Testing & Verification**:
   - Unit tests: `sign-in-schema.test.ts` (7/7 passed) and `sign-in-form.test.ts` (17/17 passed), verifying validation rules, URL sanitization, safe error mapping, and architecture invariants.
   - E2E tests: `apps/web/e2e/sign-in.spec.ts` (8/8 passed in 8.2s), verifying form rendering, field validation, invalid credentials error, password visibility toggle, full sign-in → `/onboarding` redirect flow, session redirect for authenticated users, payload security (sending ONLY `email` and `password`), and malicious callbackUrl rejection.
   - Full monorepo verification: `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm env:check`, `pnpm db:validate`, `pnpm db:health`, `pnpm verify:auth`, `pnpm verify:infra`, `pnpm verify:observability` (100% passed).

---

## 24. Phase 0.12.7 — Session & Route Guards Completion

**Status:** 🟢 **COMPLETED & VERIFIED**  
**Code Commit:** `c836c98` (`feat(web): phase 0.12.7 — server-side session & route guards`)  

### Implementation Details:
1. **No Middleware Decision**: Server Component route guards rather than Next.js middleware. Security chain: `Better Auth session → server identity → tenant membership → RBAC → domain operation`.
2. **`auth-guards.ts`**: `requireAuthSession(callbackPath)` hard-redirects unauthenticated requests before HTML render. `resolveServerTenantContext(userId)` directly invokes domain use-cases without HTTP self-calls.
3. **Route Security Matrix**: Protected `/dashboard` and `/onboarding` as async Server Components.
4. **Testing Matrix**: Unit test suite `auth-guards.test.ts` (11 tests) and `sanitize-callback-url.test.ts` (22 tests). Playwright E2E suite `e2e/route-guards.spec.ts` (17 scenarios).

---

## 25. Phase 0.12.8 — Authenticated Application Shell Completion

**Status:** 🟢 **COMPLETED & VERIFIED**  
**Code Commit:** `Pending` (`feat(web): implement authenticated application shell (Phase 0.12.8)`)  

### Implementation Details:
1. **2-Level Layout Hierarchy (`apps/web/src/app/(app)/`)**:
   - `app/(app)/layout.tsx`: Authenticated session guard (`requireAuthSession`). Enforces session authentication for all app routes without duplicating session calls.
   - `app/(app)/onboarding/page.tsx`: Standalone setup page (`/onboarding`) rendered for authenticated users with no institute (`hasTenant: false`).
   - `app/(app)/(workspace)/layout.tsx`: Workspace layout (`/dashboard`, etc.). Checks `resolveServerTenantContext`. If `hasTenant: false`, redirects to `/onboarding`. Otherwise wraps children in `<AppShell>`.
2. **App Shell Feature Architecture (`apps/web/src/features/app-shell/`)**:
   - `AppShell` (`components/app-shell.tsx`): Root presentation container rendering desktop sidebar, header, and main workspace content (`<main className="max-w-7xl">`).
   - `AppSidebar` (`components/app-sidebar.tsx`): Desktop fixed sidebar (`w-64`) rendering `InstituteIdentity`, filtered navigation sections, and footer.
   - `AppHeader` (`components/app-header.tsx`): Sticky top header (`h-16`) with mobile hamburger toggle, `Breadcrumbs`, and `UserMenu`.
   - `MobileSidebar` (`components/mobile-sidebar.tsx`): Accessible slide-over drawer (< 768px viewports) with Escape key listener, backdrop overlay, focus management, ARIA attributes (`role="dialog"`, `aria-modal="true"`), and auto-close on route change.
   - `InstituteIdentity` (`components/institute-identity.tsx`): Institute logo or deterministic 2-letter initials avatar badge, institute name, and role badge.
   - `UserMenu` (`components/user-menu.tsx`): Dropdown menu displaying user name, email, role badge, profile/settings links (future/disabled), and functional `SignOutButton`.
   - `SignOutButton` (`components/sign-out-button.tsx`): Client component calling `signOut()` from `@coaching-os/auth/client` with loading state and redirect to `/sign-in`.
   - `Breadcrumbs` (`components/breadcrumbs.tsx`): Semantic navigation (`aria-label="Breadcrumb"`) with chevron separators and `aria-current="page"`.
   - `PageHeader` (`components/page-header.tsx`): Reusable title, description, and action slots header for workspace pages.
3. **Capability-Aware Navigation Architecture**:
   - `navigation-config.ts`: Centralized navigation configuration grouped into Overview, Management, Academics, Finance, Communication sections. Items marked `isImplemented: false` render with clear "Coming Soon" badges without dead links.
   - `navigation-visibility.ts`: `filterNavigationByRole(role)` filters sections/items using `getCapabilitiesForRole(role)` from `@coaching-os/identity`. Evaluated server-side in `(workspace)/layout.tsx`.
4. **Testing & Verification**:
   - Unit tests: `navigation.test.ts` (5 tests) and `app-shell.test.tsx` (2 tests). Total web unit tests: 129/129 passed.
   - Playwright E2E suite: `apps/web/e2e/app-shell.spec.ts` (5 scenarios passed: desktop workspace shell, mobile drawer, tenant isolation, no-tenant redirect, sign-out).
   - Full monorepo verification: `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm env:check`, `pnpm db:validate`, `pnpm db:health` (100% passed).

---

## 26. Phase 0.12.9 — Full Browser Journey Integration Completion

**Status:** 🟢 **COMPLETED & VERIFIED**  
**Code Commit:** `feat(web): add full browser journey integration (Phase 0.12.9)`  

### Implementation Details:
1. **Canonical Full Browser Journey E2E Suite (`apps/web/e2e/full-browser-journey.spec.ts`)**:
   - Created comprehensive end-to-end automated Playwright browser test suite covering the entire user journey:
     - **Journey A (New Institute Owner)**: Landing Page (`/`) → Sign Up (`/sign-up`) → Field Validation & Password Toggle → Better Auth Registration → Onboarding (`/onboarding`) → Slug Preview & Institute Creation → Workspace Dashboard (`/dashboard`) → Session & Tenant Persistence across Browser Refresh.
     - **Journey B (Sign Out & Protected Route Guards)**: Authenticated Workspace → Sign Out via User Menu → Session Revocation → `/sign-in` Redirect → Direct `/dashboard` navigation blocked & redirected to `/sign-in?callbackUrl=%2Fdashboard`.
     - **Journey C (Returning User Sign In)**: Anonymous `/sign-in` → Better Auth Authentication → Workspace Dashboard (`/dashboard`) → Active Tenant Resolution → Session Persistence on Refresh.
     - **Journey D (No-Tenant User Guard)**: Authenticated user without an institute attempting to access `/dashboard` → hard redirected to `/onboarding`.
     - **Journey E (Existing Tenant User Guard)**: Authenticated user with an active institute attempting to access `/onboarding` → hard redirected to `/dashboard`.
     - **Journey F (Auth Page Guards)**: Authenticated user with a tenant visiting `/sign-in` or `/sign-up` → hard redirected to `/dashboard`. Authenticated user without a tenant visiting `/sign-in` or `/sign-up` → hard redirected to `/onboarding`.
2. **Security & Boundary Invariants Verified**:
   - **Callback URL Security**: External redirect phishing attacks (`https://evil.example.com`, `//evil.example.com`, `javascript:alert(1)`) are rejected and sanitized to safe relative paths.
   - **Session Security Regression**: Expired, missing, or revoked session cookies immediately block access to protected Server Component routes and redirect to `/sign-in`.
   - **Tenant Isolation Regression**: Multi-tenant workspace separation verified browser-side. User A sees Institute A details only; User B sees Institute B details only. Zero cross-tenant data or identity exposure.
   - **Browser Navigation / Back-Button Security**: Signed-out users cannot access cached workspace content via browser back button; requests re-trigger server route guards.
   - **Mobile Application Shell**: Verified under Playwright mobile viewport (`< 768px`). Desktop sidebar hidden; accessible mobile drawer (`role="dialog"`, ESC key listener, overlay, navigation item closing) verified.
3. **Full Monorepo Verification Results**:
   - E2E Playwright Suite: 67/67 tests passed (`smoke.spec.ts`, `sign-up.spec.ts`, `sign-in.spec.ts`, `onboarding.spec.ts`, `route-guards.spec.ts`, `app-shell.spec.ts`, `full-browser-journey.spec.ts`).
   - Unit & Integration Suite: 129/129 tests passed across `@coaching-os/web` and monorepo packages.
   - Full Build, Lint, Typecheck: `pnpm env:check`, `pnpm db:validate`, `pnpm db:health`, `pnpm typecheck`, `pnpm lint`, `pnpm build` (100% clean across all 13 packages).

