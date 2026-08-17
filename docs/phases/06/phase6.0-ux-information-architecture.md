# 📐 Phase 6.0 — UX & Information Architecture Contract

> **Authoritative Phase 6 UX & Information Hierarchy Document**  
> **Status:** 🟢 ACCEPTED & FROZEN  
> **Milestone:** Phase 6 — Staff Dashboard & UX Polish  
> **Type:** UX & Information Architecture Specification  
> **Updated:** August 17, 2026

---

## 1. Information Hierarchy Principles

The Staff Dashboard UX follows a strict 5-tier information hierarchy:

```text
1. ATTENTION  →  What requires immediate operational intervention? (e.g. Overdue Fees, Missing Attendance)
2. TODAY      →  What is happening today in the institute? (e.g. Sessions, Assessments, Admissions)
3. UPCOMING   →  What is happening in the next 24-48 hours? (e.g. Tomorrow's Tests)
4. ACTION     →  What quick actions can the staff member take right now?
5. RECENT     →  What activities or announcements occurred recently?
```

---

## 2. Layout Grid & Component Composition

All role dashboards are built using CSS Grid and Flexbox layouts using `@coaching-os/ui` design tokens (`--color-background`, `--color-card`, `--color-primary`, `--radius-card`).

### 2.1 Owner / Founder Grid Layout
- **Top Row (Span 12):** Header Greetings + Active Tenant Context Banner + Institute Timezone indicator.
- **Middle Row (Span 8 + Span 4):**
  - Left (Span 8): Operational Summary Cards (Attendance Ratio, Classes Today, Assessments Today).
  - Right (Span 4): Attention Banner (Overdue Fees, Pending Action Items) + Quick Action Buttons.
- **Bottom Row (Span 12):** Recent Institute Announcements & Activity Timeline Feed.

### 2.2 Teacher Grid Layout
- **Top Row (Span 12):** Teacher Greeting + Today's Date.
- **Main Section (Span 8):** Timeline Card List of Today's Generated `BatchSession`s with inline attendance status badges (`[Take Attendance]` / `[Taken ✅]`).
- **Sidebar (Span 4):** Attention Cards (Pending Homework items for assigned batches) + Upcoming Tests.

### 2.3 Assistant Grid Layout
- **Top Row (Span 12):** Assistant Greeting + Operational Controls.
- **Left Column (Span 6):** Financial Collection Summary (`₹ Collected Today`, Payment Count, Pending Receipts) + Quick `Record Payment` Action.
- **Right Column (Span 6):** Admissions Summary (`Students Admitted Today`, Pending Enrollments) + Quick `Add Student` Action.

---

## 3. Component States & Skeleton Fallbacks

Every dashboard card, metric widget, and table view MUST support four distinct UI states:

```text
┌────────────────────────────────────────────────────────────────────────┐
│ State        Behavior                                                  │
├────────────────────────────────────────────────────────────────────────┤
│ Loading      Renders skeleton pulse primitives (@coaching-os/ui)       │
│              No layout reflow when data resolves                       │
├────────────────────────────────────────────────────────────────────────┤
│ Success      Renders computed DTO metrics & interactive buttons       │
├────────────────────────────────────────────────────────────────────────┤
│ Empty        Renders friendly operational status (e.g. "No classes     │
│              scheduled for today") with capability-aware action CTA    │
├────────────────────────────────────────────────────────────────────────┤
│ Error        Widget-level error boundary with retry trigger;           │
│              never crashes the whole dashboard page                     │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Mobile & Touch Responsive Invariants

- **Breakpoints:** `320px` (Mobile Small), `375px` (Mobile Standard), `768px` (Tablet), `1024px+` (Desktop).
- **Touch Targets:** Minimum $\ge 44 \times 44\text{px}$ touch target size for all interactive buttons, card links, and tab triggers on mobile viewports.
- **Table Transformation:** Dense data tables transform into stacked responsive card lists on viewports $< 768\text{px}$.
- **Focus Trapping:** Search overlays and quick action modal dialogs trap focus, respond to `Escape` key, and restore focus upon exit.
