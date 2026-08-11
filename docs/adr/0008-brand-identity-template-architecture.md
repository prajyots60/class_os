# ADR 0008: Brand Identity & Template Engine Architecture (Future Roadmap)

- **Status**: Proposed / Deferred (Post-V1 Milestone)
- **Date**: 2026-08-11
- **Authors**: Senior Staff Architecture Team
- **Deciders**: Product & Engineering Core

---

## Context & Problem Statement

CoachingOS is a multi-tenant SaaS platform for coaching institutes. White-labeling and visual personalization are key platform capabilities. 

In early iterations, basic branding primitives were introduced (`logoUrl`, `primaryColor`). However, letting non-designer institute owners manually select arbitrary hex colors, fonts, radii, and styles often leads to inconsistent, unpolished UI combinations that violate accessibility standards and brand coherence.

We need an authoritative architectural vision for multi-tenant brand identity that:
1. Delivers professionally designed, cohesive visual identities without requiring users to act as graphic designers.
2. Preserves strict multi-tenant isolation and prevents arbitrary CSS injection security risks.
3. Allows seamless evolution and versioning of platform design systems over time.

---

## Architecture & Design Decisions

### 1. Controlled Branding Templates over Arbitrary CSS Options

Instead of exposing raw CSS variables or complex design token editors to institute owners, CoachingOS will provide platform-owned **Branding Templates**.

```text
                                 CoachingOS Platform
                                          │
               ┌──────────────────────────┼──────────────────────────┐
               ▼                          ▼                          ▼
       Academic Template          Modern Template            Premium Template
       (Trustworthy / Navy)       (Digital / Indigo)         (High-End / Gold)
               │                          │                          │
               └──────────────────────────┼──────────────────────────┘
                                          ▼
                                   Institute Choice
                                          │
                                          ▼
                                 `brandingTemplateId`
                                          │
                                          ▼
                                   Tenant Workspace
```

An institute's brand identity will be defined as:
```text
Institute Brand Identity = Platform-Controlled Design Template + Institute Assets + Structured Preferences
```

### 2. Separation of Domain Concerns

The system explicitly decouples three distinct administrative boundaries:

1. **Institute Operational Settings**: Operational metadata (`name`, `contactEmail`, `phoneNumber`, `timezone`, `currency`, `dateFormat`, `academicYear`).
2. **Brand Identity System**: Visual identity tokens (`brandingTemplateId`, `logoUrl`, `faviconUrl`, `themeMode`).
3. **Product Preferences**: Workspace defaults (`defaultDashboard`, `notificationDefaults`, `feeDisplayFormat`).

### 3. Data Model & Architecture (Platform-Owned Tokens)

Design tokens live in the **CoachingOS design system**, not in tenant database rows.

**Tenant Database Contract (Minimal & Safe):**
```typescript
interface InstituteBrandIdentity {
  brandingTemplateId: string; // e.g. "academic-blue", "modern-violet", "premium-gold"
  logoUrl?: string;
  faviconUrl?: string;
  themeModePreference: 'light' | 'dark' | 'system';
}
```

**Platform Template Contract (Design System Registry):**
```typescript
interface BrandingTemplate {
  id: string;
  name: string;
  description: string;
  version: string;
  tokens: {
    color: {
      primary: string;         // HSL format
      primaryForeground: string;
      secondary: string;
      accent: string;
      surface: string;
      background: string;
      foreground: string;
      border: string;
      ring: string;
    };
    typography: {
      headingFont: string;
      bodyFont: string;
    };
    uiPersonality: {
      radius: string;
      shadow: string;
      buttonStyle: 'rounded' | 'square' | 'pill';
    };
  };
}
```

---

## Component Token Discipline (Non-Negotiable Requirement)

For this future template architecture to function seamlessly without component refactoring, **all UI components in `@coaching-os/ui` and `apps/web` MUST consume semantic CSS variables exclusively**:

```tsx
// ✅ Correct - Consumes semantic design tokens
<Button className="bg-primary text-primary-foreground hover:bg-primary/90">
<div className="bg-background text-foreground border-border">

// ❌ Forbidden - Hardcoded color utilities
<Button className="bg-blue-600 text-white">
<div className="bg-[#1E293B]">
```

When an institute selects a template, the workspace root (`AppShell`) injects the template's token map into CSS custom properties (`--primary`, `--secondary`, `--radius`). The UI components automatically adapt without code modifications.

---

## Roadmap & Migration Strategy

- **Phase 1.5 (Current Baseline)**: V1 branding primitive using `primaryColor` hex value converted to `--primary` CSS variable alongside `logoUrl`.
- **Post-V1 Roadmap Milestone**: Introduce the `BrandingTemplateRegistry`, 4-6 curated design templates, interactive preview UI, and deprecate raw `primaryColor` in favor of `brandingTemplateId`. Existing institutes on V1 will map smoothly to default `academic-blue` template.
