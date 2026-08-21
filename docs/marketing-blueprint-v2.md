# CoachingOS Production Website Design System v2 — Teal

**Status:** Frozen by founder decision.
This document supersedes the public-marketing colour architecture in previous versions. Typography, owner-first hierarchy, responsive layout, and honesty constraints remain intact.

> **Visual character: calm command in deep teal.** CoachingOS should feel composed and trustworthy: warm canvas, dark teal authority, sage restraint, and product proof that does the selling.

## 1. Locked Palette

| Token | Hex | Approved Role | Never use for |
|-------|-----|---------------|---------------|
| `--co-canvas` | `#F8F7F3` | Main landing-page canvas | Product-semantic state |
| `--co-surface` | `#FFFFFF` | Cards, forms, image framing | Repeated generic-card grids |
| `--co-ink` | `#102426` | Headlines, primary text, icons | Decorative large-area fill |
| `--co-primary` | `#03363D` | CTA, active state, dark conversion/footer section, key brand elements | Full-page saturation or a gradient |
| `--co-primary-hover` | `#022C32` | Hover/pressed primary controls | Static supporting text |
| `--co-soft-brand` | `#BDD9D7` | Highlight field, supporting section background, controlled emphasis | Primary text or CTA fill |
| `--co-soft-brand-dark`| `#9FC5C2` | Decorative rule, selected detail, secondary brand treatment | Primary body text |
| `--co-border` | `#D9E0DE` | Hairline dividers, image/card borders, form rules | Heavy container outlines |
| `--co-text-secondary` | `#526264` | Supporting paragraph copy and utility content | Text below 14px |
| `--co-success` | `#237A5B` | Confirmed / present / paid states | General marketing accent |
| `--co-warning` | `#8A6200` | Due / pending / needs attention states | CTA or decorative colour |
| `--co-error` | `#B74738` | Error / destructive state | Marketing emphasis |

*Rule:* Primary teal + Jet Stream = brand. Green/yellow/red = product state ONLY. Never use success green as a marketing accent. No gradients anywhere. No purple/neon/pink.

## 2. Typography

| Role | Font | Weight | Size | Usage |
|------|------|--------|------|-------|
| Eyebrow | IBM Plex Mono | 500 | 11px (0.6875rem), ALL CAPS, letter-spacing 0.08em | Section labels only |
| Hero H1 | DM Serif Display | 400 | `clamp(3.5rem, 5vw, 5.25rem)`, line-height 1.1 | Hero headline only |
| Section H2 | DM Serif Display | 400 | `clamp(2.5rem, 3.5vw, 4rem)`, line-height 1.15 | Major section statements |
| Product H3 | Manrope | 700 | 22–24px | Feature titles, role names |
| Body Large | Manrope | 400 | 18px, line-height 1.6 | Hero subcopy, section descriptions |
| Body | Manrope | 400 | 16px, line-height 1.6 | General copy |
| Caption | Manrope | 500 | 14px | Labels, metadata |
| CTA | Manrope | 600 | 16px | Buttons |

*Load:* DM Serif Display (400), Manrope (400,500,600,700), IBM Plex Mono (500) from Google Fonts. Do not substitute Inter.

## 3. Spacing & Components

**Base:** 4px. Tokens: `4, 8, 12, 16, 24, 32, 48, 64, 96, 128`.

*   **Hero vertical:** 128px top, 96px bottom
*   **Major sections:** 96px vertical
*   **Compact/Mobile sections:** 64px vertical
*   **Content max-width:** 1200px, centered
*   **Section horizontal:** 24px (mobile) → 48px (desktop)
*   **Card/Image Framing:** Surface `#FFFFFF`, 1px Border `#D9E0DE`, 8px radius. Shadow `0 8px 24px rgba(16, 36, 38, 0.08)` only when required.
*   **No glassmorphism,** no excessive rounding (12px max). Focus state: 2px Primary outline with a 3px offset.

## 4. Copy-Ready CSS Tokens

```css
:root {
  --co-canvas: #F8F7F3;
  --co-surface: #FFFFFF;
  --co-ink: #102426;
  --co-primary: #03363D;
  --co-primary-hover: #022C32;
  --co-soft-brand: #BDD9D7;
  --co-soft-brand-dark: #9FC5C2;
  --co-border: #D9E0DE;
  --co-text-secondary: #526264;
  --co-success: #237A5B;
  --co-warning: #8A6200;
  --co-error: #B74738;

  --font-display: "DM Serif Display", Georgia, serif;
  --font-ui: "Manrope", Arial, sans-serif;
  --font-mono: "IBM Plex Mono", monospace;

  --radius-control: 0.25rem;
  --radius-container: 0.5rem;
  --shadow-quiet: 0 8px 24px rgba(16, 36, 38, 0.08);
}

body { background: var(--co-canvas); color: var(--co-ink); font-family: var(--font-ui); }
.co-primary-button { background: var(--co-primary); color: var(--co-canvas); }
.co-primary-button:hover { background: var(--co-primary-hover); }
.co-primary-button:focus-visible { outline: 2px solid var(--co-primary); outline-offset: 3px; }
.co-soft-section { background: var(--co-soft-brand); color: var(--co-ink); }
.co-dark-section { background: var(--co-primary); color: var(--co-canvas); }
```

---

# Section-by-Section Architecture (Locked)

*Build in phases: Phase A (Foundation & Sections 1-3) first, test across breakpoints, then proceed to the rest.*

## 01 — Header
*   **Quiet.** Canvas field, `--co-border` lower rule on scroll.
*   **Content:** Actual CoachingOS Logo | Product | How it works | For families | Sign in | Request beta access (CTA Button).

## 02 — Hero
*   **H1:** Run the institute day from one clear workspace.
*   **Body:** Batches, attendance, fees, staff follow-up, and parent updates stay connected to the same operating rhythm.
*   **CTA:** [ Request beta access ]  *See how it works →*
*   **Visual:** Real connected owner dashboard image + mobile staff/owner experience. This is the first major proof.

## 03 — The Operating Day
*   **H2:** The institute day has a rhythm. Your software should follow it.
*   **Flow:** Plan → Run → Record → Follow up → Inform. Explain the operational loop from the MVP.

## 04 — One System, Different Workflows
*   **H2:** One system. Everyone knows what to do next.
*   **Content:** Owner (See the institute clearly) / Teacher (Run the session) / Assistant (Keep operations moving) / Parent (Stay informed).
*   **Format:** Typography-driven, editorial layout. No icons. No four floating cards.

## 05 — What Stays Connected
*   **H2:** Everything that matters, in one place.
*   **Four pillars:** Batches & schedules, Academics & attendance, Fees & receipts, Family updates.
*   **Visuals:** Real product screenshots inside cards. Option A: Asymmetric grid.

## 06 — Your Institute, Your Identity
*   **H2:** Your institute stays at the center.
*   **Body:** Your institute's identity stays visible throughout the experience. (Name, logo, colors, and supported visual settings).
*   **Visual:** Screenshot showing dashboard with custom institute color/logo.

## 07 — Family Experience
*   **H2:** The institute moves first. Families stay informed.
*   **Visual:** Large parent PWA screenshot.
*   **Benefits:** Attendance, Homework, Results, Fees, Updates. Add a small Family Hub explanation below.

## 08 — Built for Control
*   **H2:** Built for institutes that need control.
*   **Content (factual):** Separate institute data, Role-aware access, Server-controlled sessions, Traceable operations. No marketing speak, just facts with hairline dividers.

## 09 — FAQ
*   **H2:** Questions.
*   **Content:** 5 simple honest questions and answers in an accordion. No heavy cards.

## 10 — Beta CTA
*   **Style:** Dark teal/ink section `--co-primary`. Canvas text.
*   **H2:** Give your institute one clear operating rhythm.
*   **Body:** We're working with early coaching institutes to shape CoachingOS around the realities of running their day.
*   **CTA:** [ Request beta access → ] (Soft Brand fill, Ink text)
*   *Note:* No pricing, fake numbers, urgency or testimonials.

## 11 — Footer
*   **Style:** Dark teal (`#102426` or `--co-primary`), quiet and confident.
*   **Content:** CoachingOS Logo. "The operating system for founder-led coaching institutes."
*   **Links:** Product / Account / Legal / Copyright.

---

## Global Rules
1. **Real Images:** Product screenshots only. No 3D renders, no isometric illustrations, no stock photos. No "blue" UI in screenshots—everything must match the Teal palette.
2. **No gradients, glassmorphism, or heavy shadows.**
3. **No fake proof** (testimonials, logo walls, fake metrics).
4. **Build progressively.** Start with Foundation, Header, Hero, and Operating Day.
