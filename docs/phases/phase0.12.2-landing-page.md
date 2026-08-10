# Phase 0.12.2 — Public Landing Page UX & Content Contract

**Status:** Architecture & Content Contract Freeze 🟢  
**Milestone:** Phase 0.12.2.0 — Landing Page Contract  
**Target:** Define a precise, implementation-ready UX, content, architectural, SEO, accessibility, and component contract for the public `/` landing page.

---

## 1. Purpose

The public landing page (`/`) is the primary public presentation boundary for CoachingOS.

Its fundamental jobs are to:
1. Clearly explain what CoachingOS is to first-time visitors.
2. Identify the primary target customer (coaching institute owners/operators).
3. Communicate the core operational value proposition within seconds.
4. Establish architectural trust and professional credibility without hyperbole.
5. Provide a friction-free conversion path to authentication (`/sign-up` and `/sign-in`).
6. Avoid claiming product functionality or compliance certifications that have not been implemented.

**Architectural Invariant:** The landing page is strictly a presentation boundary. It contains ZERO business logic, database queries, authentication checks, or tenant scoping calls.

---

## 2. Target Audience

### 2.1 Primary Conversion Audience
**Coaching Institute Owners, Founders, and Administrators**  
Operators running private coaching classes, competitive exam prep institutes (NEET, JEE, Foundation), tuition centers, and academic coaching academies.

### 2.2 Secondary Audience
Teachers, tutors, administrative assistants, parents, and students who may visit the platform. While important, they are **NOT** the primary conversion audience for the homepage.

**Messaging Rule:** All copy on the public landing page speaks directly to the institute owner/operator. The messaging does NOT attempt to simultaneously pitch unrelated products to parents or students.

---

## 3. Product Positioning

### 3.1 Positioning Statement
> **"CoachingOS helps coaching institutes run their institute from one place."**

### 3.2 Tone & Language Guidelines
- **Serious Operational Software**: Clean, professional, precise, and operationally focused.
- **No Marketing Hyperbole**: Strict prohibition against empty SaaS buzzwords ("revolutionary", "world's best", "AI-powered", "zero effort", "replace your entire team", "guaranteed growth").
- **Roadmap Truthfulness**: Features being actively built are described as platform capabilities without falsely claiming production availability before backend completion.

---

## 4. Primary User Journey

```text
Visitor
  │
  ▼
Landing Page (/)
  │
  ▼
Understand Product & Value Proposition
  │
  ▼
Evaluate Architectural Trust & Capabilities
  │
  ├───────────────────────────────┐
  ▼                               ▼
Primary CTA ("Get Started")    Secondary CTA ("Sign In")
  │                               │
  ▼                               ▼
/sign-up                        /sign-in
  │                               │
  └───────────────┬───────────────┘
                  ▼
          Authenticated User
                  │
        ┌─────────┴─────────┐
        ▼                   ▼
    hasTenant: false    hasTenant: true
        │                   │
        ▼                   ▼
   /onboarding          /dashboard
```

---

## 5. Primary & Secondary Calls-to-Action (CTAs)

### 5.1 Primary Conversion CTA
- **Label**: `"Get Started"`
- **Target Route**: `/sign-up`
- **Visual Style**: Solid primary button (`variant="default"`, `size="lg"`), prominent contrast.

### 5.2 Secondary Action CTA
- **Label**: `"Sign In"`
- **Target Route**: `/sign-in`
- **Visual Style**: Outline or ghost button (`variant="outline"` / `variant="ghost"`).

**Constraint:** No competing conversion goals (such as demo booking, sales calls, waitlist forms, or pricing plans) are permitted on the homepage.

---

## 6. Information Architecture & Section Order

The landing page layout MUST strictly follow this vertical section hierarchy:

```text
1. Header / Navigation    (<MarketingHeader />)
2. Hero Section          (<HeroSection />)
3. Workflow Section      (<WorkflowSection />)
4. Capabilities Section  (<CapabilitiesSection />)
5. Roles & Value         (<RolesSection />)
6. Trust & Security      (<TrustSection />)
7. Final CTA Section     (<CTASection />)
8. Footer                (<MarketingFooter />)
```

---

## 7. Section Contracts

### 7.1 Header Contract (`<MarketingHeader />`)
- **Left**: `CoachingOSLogo` (brand mark + text logo).
- **Navigation Links**:
  - `Features` (scroll anchor `#features`)
  - `Workflow` (scroll anchor `#workflow`)
  - `Security` (scroll anchor `#security`)
- **Right Actions**:
  - `Sign In` (`/sign-in`)
  - `Get Started` (`/sign-up`)
- **Responsive Behavior**: On viewport width `< 768px`, navigation links collapse into a clean mobile overlay or hamburger drawer while preserving Logo and `Get Started` CTA.

### 7.2 Hero Contract (`<HeroSection />`)
- **Eyebrow Badge**: `"Built for Coaching Institutes"` (`Badge` variant `"secondary"`).
- **Headline (H1)**: `"Run your coaching institute from one place."`
- **Supporting Copy**: `"Manage students, academics, attendance, tests, fees, staff, and day-to-day institute operations through one connected platform."`
- **Actions**: Primary CTA `"Get Started"` + Secondary CTA `"Sign In"`.
- **Visual Feature Placeholder**: A high-density, crisp UI preview mockup illustrating the CoachingOS institute workspace dashboard.

### 7.3 Product Workflow Section (`<WorkflowSection />`)
- **Purpose**: Demonstrate how CoachingOS integrates into an institute's daily operations.
- **Workflow Flow**:
  1. **Set Up Institute**: Bootstrap institute tenant, configure academic details and staff.
  2. **Organize Students & Staff**: Assign roles, enroll students, structure batches and classes.
  3. **Manage Daily Operations**: Track attendance, assign homework, schedule tests, record marks.
  4. **Track Activity & Fees**: Collect fee payments, issue receipts, and broadcast announcements.
  5. **Unified Control**: Monitor institute health from an authoritative server-scoped dashboard.

### 7.4 Core Capability Messaging (`<CapabilitiesSection />`)
- **Purpose**: Present functional module domains accurately.
- **Module Grid**:
  - **Student Management**: Student profiles, enrollment records, batch tracking.
  - **Academic Management**: Schedules, sessions, syllabus tracking, classes.
  - **Attendance & Homework**: Daily session attendance, assignment submission logs.
  - **Tests & Marks**: Test schedules, batch mark entry, performance summaries.
  - **Billing & Payments**: Fee structures, invoices, payment tracking, receipts.
  - **Staff & Announcements**: Staff role management, multi-channel announcements.

### 7.5 Role / Institute Value Section (`<RolesSection />`)
- **Purpose**: Articulate value across institute stakeholders while remaining centered on the institute owner.
- **Role Cards**:
  - **Institute Owners / Founders**: Complete operational visibility, financial oversight, role control.
  - **Teachers & Tutors**: Streamlined class attendance, homework assignment, test grading.
  - **Administrative Staff**: Student enrollment, fee receipt generation, record keeping.
  - **Parents & Students**: Transparent academic progress, test scores, fee statements.

### 7.6 Trust & Security Section (`<TrustSection />`)
- **Purpose**: Establish architectural credibility and security posture.
- **Factual Claims ONLY**:
  - **Tenant Isolation**: Row-level database scoping by `institute_id` enforced server-side.
  - **Capability RBAC**: Fine-grained role-based access control with 49 granular capabilities.
  - **Server-Side Authorization**: Authentication derived 100% from encrypted session cookies.
  - **Audit Logging**: Structured security event logging and request correlation IDs.
- **Strictly Prohibited Claims**: NO fake SOC 2, ISO 27001, GDPR compliance seals, or "bank-grade encryption" claims unless verified elsewhere.

### 7.7 Final CTA Section (`<CTASection />`)
- **Headline**: `"Ready to organize your coaching institute?"`
- **Supporting Copy**: `"Join forward-thinking coaching institutes using CoachingOS to streamline operations."`
- **Actions**: Primary CTA `"Get Started"` (`/sign-up`) and Secondary CTA `"Sign In"` (`/sign-in`).

### 7.8 Footer Contract (`<MarketingFooter />`)
- **Brand Column**: CoachingOS logo, short product tagline, dynamic current year copyright (`© 2026 CoachingOS`).
- **Product Links**: Features (`#features`), Workflow (`#workflow`), Security (`#security`).
- **Account Links**: Sign In (`/sign-in`), Get Started (`/sign-up`).
- **System Status**: Static badge indicating `"System Operational"`.

---

## 8. Technical & Performance Requirements

### 8.1 SEO Metadata
```typescript
export const metadata: Metadata = {
  title: 'CoachingOS — Operating System for Coaching Institutes',
  description:
    'Run your coaching institute from one place. Streamline student management, academics, attendance, tests, staff, and fee billing in a unified platform.',
  openGraph: {
    title: 'CoachingOS — Operating System for Coaching Institutes',
    description:
      'Unified management platform for coaching institutes, tuition academies, and competitive exam prep centers.',
    type: 'website',
  },
};
```

### 8.2 Accessibility (WCAG 2.1 AA)
- Single, clear `<h1>` heading in `<HeroSection />`.
- Strict heading hierarchy (`<h1>` → `<h2>` → `<h3>`).
- Keyboard navigable links and interactive buttons with visible focus rings (`focus-visible:ring-2`).
- Accessible contrast ratio (minimum 4.5:1 for normal text).
- `aria-label` on non-text elements and icon buttons.
- Full support for `prefers-reduced-motion`.

### 8.3 Responsive Breakpoints
- **Mobile** (`320px` – `767px`): Single-column stack, compact navigation, stacked CTAs.
- **Tablet** (`768px` – `1023px`): Responsive 2-column grids, horizontal nav header.
- **Desktop** (`1024px+`): Multi-column feature grids, max container width `1280px` (`max-w-7xl`).

---

## 9. Component Architecture & File Layout

To enforce the **Thin Page Composition Principle**, `app/(marketing)/page.tsx` will remain under 30 lines. Marketing components will live under `apps/web/src/components/marketing/`:

```text
apps/web/src/
├── app/
│   └── (marketing)/
│       ├── layout.tsx              ← MarketingHeader + <main> + MarketingFooter
│       └── page.tsx                ← Thin composition (<LandingPage />)
│
└── components/
    ├── brand/
    │   └── logo.tsx                ← CoachingOSLogo (from Phase 0.12.1)
    ├── layout/
    │   └── container.tsx           ← Container & Section (from Phase 0.12.1)
    └── marketing/
        ├── marketing-header.tsx    ← Top navigation header
        ├── marketing-footer.tsx    ← Marketing footer
        ├── hero-section.tsx        ← Hero banner & primary CTAs
        ├── workflow-section.tsx    ← 5-step operational workflow
        ├── capabilities-section.tsx← 6-domain capability grid
        ├── roles-section.tsx       ← Stakeholder value cards
        ├── trust-section.tsx       ← Factual security & tenant isolation cards
        └── cta-section.tsx         ← Bottom conversion banner
```

---

## 10. Architectural Boundaries & Non-Goals

### 10.1 Prohibited Imports in Marketing Boundary
The landing page and marketing components **MUST NOT** import:
- Prisma ORM or `@coaching-os/database`
- Better Auth server methods (`auth.api.*`) or session handlers
- Identity repositories or domain entities
- RBAC capability checks or authorization guards
- TenantContext or `institute_id` state

### 10.2 Non-Goals for Phase 0.12.2
This phase does **NOT** implement:
- Sign-up form logic (`/sign-up`)
- Sign-in form logic (`/sign-in`)
- Onboarding institute creation (`/onboarding`)
- Tenant dashboard workspace (`/dashboard`)
- Pricing calculator or billing gateway integration
- Live database queries or dynamic analytics
- External email or marketing CRM integration

---

## 11. Subphase Implementation Sequence

```text
Phase 0.12.2.0  Landing Page UX / Content Contract Freeze 🟢 (COMPLETED)
Phase 0.12.2.1  Marketing Layout Shell (Header + Footer Layout) ✅ (COMPLETED)
Phase 0.12.2.2  Hero Section Component ✅ (COMPLETED)
Phase 0.12.2.3  Product Workflow Section Component ✅ (COMPLETED)
Phase 0.12.2.4  Core Capabilities Section Component ✅ (COMPLETED)
Phase 0.12.2.5  Roles & Value Section Component ✅ (COMPLETED)
Phase 0.12.2.6  Trust & Security Section Component ✅ (COMPLETED)
Phase 0.12.2.7  Final CTA Section Component ✅ (COMPLETED)
Phase 0.12.2.8  Responsive, SEO & Accessibility Audit ✅ (COMPLETED)
Phase 0.12.2.9  Phase 0.12.2 Acceptance Gate (NEXT)
```

---

## 12. Acceptance Criteria & Verification Invariants

1. ✅ Landing page target audience explicitly defined (coaching institute owners).
2. ✅ Product positioning statement frozen ("Run your coaching institute from one place.").
3. ✅ Primary CTA (`"Get Started"` -> `/sign-up`) and Secondary CTA (`"Sign In"` -> `/sign-in`) frozen.
4. ✅ Landing page section order frozen (Header → Hero → Workflow → Capabilities → Roles → Trust → Final CTA → Footer).
5. ✅ Each section's UX purpose, copy direction, and components specified.
6. ✅ Trust messaging restricted to factual architectural invariants (tenant isolation, server RBAC, audit logging).
7. ✅ SEO metadata contract defined for `/`.
8. ✅ Accessibility (WCAG 2.1 AA) guidelines specified.
9. ✅ Responsive layout contracts (mobile, tablet, desktop) defined using `Container` and `Section` primitives.
10. ✅ Component architecture defined under `apps/web/src/components/marketing/`.
11. ✅ Public page security boundaries enforced (zero DB/auth/tenant imports).
12. ✅ Explicit non-goals defined.
13. ✅ Zero code or implementation changes introduced during Phase 0.12.2.0 contract freeze.
14. ✅ Existing `@coaching-os/ui` foundation primitives remain 100% intact.
15. ✅ Existing Phase 1.3 RBAC and Phase 1.4 Onboarding contracts remain 100% untouched.
