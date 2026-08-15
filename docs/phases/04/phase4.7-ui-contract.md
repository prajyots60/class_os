# Phase 4.7 — Staff Communication Workspace UI Architecture, UX & Contract Freeze

> **Status:** 🟢 **ACCEPTED & FROZEN**  
> **Milestone:** Phase 4.7 — Staff Communication Workspace UI Contract  
> **Implementation Target:** Phase 4.7.1 — Staff Communication Workspace UI Implementation  
> **Authoritative Specifications:**  
> - [`docs/phases/04/phase4.0-communication-contract.md`](file:///home/supra/Desktop/class_os/docs/phases/04/phase4.0-communication-contract.md)  
> - [`docs/phases/04/phase4.6-api-contract.md`](file:///home/supra/Desktop/class_os/docs/phases/04/phase4.6-api-contract.md)  
> - [`docs/phases/04/phase4.6.1-api-implementation-report.md`](file:///home/supra/Desktop/class_os/docs/phases/04/phase4.6.1-api-implementation-report.md)  
> **Execution Date:** August 15, 2026  

---

## A. Executive Summary

Phase 4.7 establishes the authoritative visual architecture, information architecture, user experience (UX) workflows, accessibility contracts, and component hierarchy for the Staff Communication Workspace in CoachingOS.

This milestone is a **STRICT ARCHITECTURE + UX + SECURITY + CONTRACT FREEZE**. It introduces **0 production UI components, 0 API route changes, 0 database schema changes, and 0 migrations**. It bridges the already implemented and verified Phase 4.6.1 REST APIs (`/api/v1/communication/*` and `/api/v1/students/{id}/activities*`) to a native, responsive, accessible, and capability-aware frontend specification.

---

## B. Existing UI Architecture Audit

The CoachingOS web application (`apps/web/`) follows a strict modular monolith presentation structure:
1. **Workspace Shell Layout (`apps/web/src/app/(app)/(workspace)/layout.tsx`)**:
   - Server Component verifying session authentication (`requireAuthSession`) and resolving server-authoritative tenant context (`resolveServerTenantContext`).
   - Computes capability-filtered navigation links server-side using `filterNavigationByRole(tenantContext.role)` before passing presentation DTOs (`user`, `tenant`, `institute`) to `<AppShell>`.
2. **Design System Primitives (`@coaching-os/ui`)**:
   - Token-driven Tailwind CSS components (`Button`, `Card`, `Badge`, `Input`, `Textarea`, `Alert`, `Label`, `Separator`, `Skeleton`, `Spinner`).
   - Strict CSS variable token discipline (`bg-primary`, `text-primary-foreground`, `bg-background`, `border-border`, `ring-ring`, `rounded-md`).
3. **Feature-Based Modular Organization (`apps/web/src/features/`)**:
   - Each domain module exports client API wrappers (`api/v1-*-client.ts`), UI components (`components/`), TypeScript DTO types (`types/`), and explicit barrel exports (`index.ts`).
4. **Icons & Accessibility**:
   - `lucide-react` icon library (`Megaphone`, `Bell`, `CalendarCheck`, `FileText`, `Users`, `Lock`, `Plus`, `Trash2`, `Edit3`, `Archive`, `Send`, `CheckCircle2`, `AlertCircle`, `Filter`, `Search`).
   - WCAG 2.1 AA keyboard navigation, visible focus rings (`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`), semantic ARIA tags (`aria-expanded`, `aria-controls`, `role="status"`, `aria-live="polite"`).

---

## C. Information Architecture

The Staff Communication Workspace is integrated natively into the primary workspace navigation under the **Communication** section:

```text
Staff Communication Workspace (/communication)
├── Overview Header & Stats Counter
├── Workspace Navigation Tabs
│   ├── Announcements Tab (/communication/announcements)
│   │   ├── Announcement Filters (Target: All | Institute | Batch; Status: All | Draft | Published | Archived)
│   │   ├── Announcement List / Card Grid
│   │   ├── Create Draft Announcement Drawer / Dialog
│   │   ├── Edit Draft Announcement Drawer / Dialog
│   │   ├── Publish Confirmation Modal
│   │   └── Archive Confirmation Modal
│   └── Notifications Tab (/communication/notifications)
│       ├── Recipient Notification Feed
│       ├── Filter by Read / Unread Status
│       └── Mark as Read Action
└── Student Activity Timeline (/students/[id]?tab=activity)
    ├── Student Profile Activity Tab
    ├── Chronological Immutable Activity Stream
    └── Activity Event Type Filter
```

---

## D. Route Map

All Communication pages live under the authenticated workspace layout `(app)/(workspace)`:

| Frontend Route | Purpose | Access Control Capability | Parent Navigation Group |
| :--- | :--- | :--- | :--- |
| `/communication` | Communication Workspace Main Landing (Redirects to `/communication/announcements`) | `announcement:read` \| `notification:read` | Communication |
| `/communication/announcements` | Staff Announcement Management (List, Filter, Create, Edit, Publish, Archive) | `announcement:read` | Communication |
| `/communication/notifications` | Staff Recipient Notification Feed & Unread Center | `notification:read` | Communication |
| `/students/[id]?tab=activity` | Student Profile Activity Timeline Tab (Read-Only Event Log) | `activity:read` | Management $\rightarrow$ Students |

---

## E. Screen Specifications

### 1. Announcements Screen (`/communication/announcements`)
- **Purpose**: Manage institute and batch announcements across their full lifecycle (`draft` $\rightarrow$ `published` $\rightarrow$ `archived`).
- **Target Users**: Institute Owners, Admins, Teachers, Staff.
- **Capabilities**:
  - View list: `announcement:read`
  - Create draft: `announcement:create`
  - Edit draft: `announcement:update`
  - Delete draft: `announcement:delete`
  - Publish / Archive: `announcement:publish`
- **Actions**:
  - Primary CTA: `+ New Announcement` (Opens Create Announcement Sheet/Dialog).
  - Row Actions: `Edit` (Draft only), `Delete` (Draft only), `Publish` (Draft only), `Archive` (Published only).
- **States**:
  - `Loading`: 5 Skeleton cards.
  - `Empty`: "No announcements found. Create your first announcement." with CTA button.
  - `Error`: Inline Alert banner with retry button.

### 2. Notifications Feed Screen (`/communication/notifications`)
- **Purpose**: View and manage in-app notifications generated for the authenticated staff user.
- **Target Users**: All active staff users (`owner`, `admin`, `teacher`, `assistant`, `staff`).
- **Capabilities**: `notification:read`.
- **Actions**:
  - Unread Count Badge in header.
  - Filter by status (`All` | `Unread`).
  - Row Action: `Mark as Read` (Triggers `POST /api/v1/communication/notifications/{id}/read`).
- **States**:
  - `Loading`: Skeleton notification rows.
  - `Empty`: "You have no notifications." with checkmark icon.

### 3. Student Activity Timeline Tab (`/students/[id]?tab=activity`)
- **Purpose**: Provide staff and linked parents with an immutable, audit-ready chronological activity log of student events.
- **Target Users**: Staff, Teachers, Parents.
- **Capabilities**: `activity:read`.
- **Actions**: Filter by Event Type (`attendance_absent`, `attendance_present`, `homework_assigned`, `test_result`, `fee_payment`, `receipt_issued`, `announcement`).
- **Immutability**: Read-only timeline. **No creation, edit, or delete actions rendered**.

---

## F. Announcement UX Contract

### 1. State Lifecycle Rules
```text
[ Draft ] ────(Publish)────> [ Published ] ────(Archive)────> [ Archived ]
    │                             │
 (Edit / Delete)             (Read-Only)                    (Read-Only)
```
- **Draft State**:
  - Badge: Yellow/Amber outline (`variant="warning"`).
  - Actions: `Edit`, `Delete`, `Publish`.
- **Published State**:
  - Badge: Green filled (`variant="success"`).
  - Actions: `Archive`. **`Edit` and `Delete` buttons are HIDDEN/REMOVED**.
  - Published timestamp rendered: "Published on Dec 15, 2026 at 10:00 AM by Admin".
- **Archived State**:
  - Badge: Gray muted (`variant="secondary"`).
  - Actions: None. **All mutation buttons are HIDDEN/REMOVED**.

### 2. Create / Edit Form UX
- **Modal/Drawer**: Slide-over Sheet component.
- **Fields**:
  - `Target Scope`: Radio group (`Institute-wide` | `Batch-targeted`).
  - `Select Batch`: Dropdown selector (Required if `Target Scope === 'batch'`, hidden if `institute`).
  - `Title`: Input field (Min 1, max 200 chars, character counter `X/200`).
  - `Content`: Textarea (Min 1, max 5000 chars, character counter `X/5000`).
- **Validation**: Client-side Zod validation matching `createAnnouncementSchema` with field-level inline error text (`text-destructive`).

### 3. Irreversible Publish Dialog UX
- Triggered by clicking `Publish` on a draft announcement.
- **Modal Title**: "Publish Announcement?"
- **Modal Body**: "Publishing will immediately send this notice to all targeted recipients. Once published, the announcement content cannot be edited or deleted."
- **Confirmation Button**: `Publish Now` (Primary solid button).
- **Cancel Button**: `Cancel` (Ghost button).

---

## G. Notification UX Contract

- **Header Bell Component**: Displays unread notification count badge (e.g. `(3)`). Automatically revalidated when a notification is marked read.
- **Notification Item Cards**:
  - Unread items highlight with subtle background tint (`bg-muted/40`) and blue unread dot.
  - Priority visual indicators:
    - `critical`: Red alert badge (`variant="destructive"`).
    - `important`: Amber warning badge (`variant="warning"`).
    - `informational`: Neutral info badge (`variant="outline"`).
  - Clicking `Mark as Read` transitions item to read state (`isRead: true`), disables button, and decrements unread count badge.

---

## H. Activity Timeline UX Contract

- **Timeline Layout**: Vertical connected timeline stream with event-specific icons and timestamps.
- **Event Icon Mapping**:
  - `attendance_absent`: Red user minus icon (`UserX`)
  - `attendance_present`: Green user check icon (`UserCheck`)
  - `homework_assigned`: Book/pencil icon (`BookOpen`)
  - `test_result`: File text icon (`FileText`)
  - `fee_payment`: Credit card icon (`CreditCard`)
  - `receipt_issued`: Receipt icon (`Receipt`)
  - `announcement`: Megaphone icon (`Megaphone`)
- **Ordering**: Strict reverse-chronological order (`occurredAt DESC, id DESC`).

---

## I. Capability-Aware Permission Model

Frontend component rendering consumes capabilities derived from `AuthorizationEngine.getCapabilitiesForRole(tenantContext.role)`:

| UI Action / Button | Required Capability | Frontend Visibility Rule |
| :--- | :--- | :--- |
| `+ New Announcement` Button | `announcement:create` | Hide button if missing capability |
| `Edit Draft` Button | `announcement:update` | Render ONLY if draft AND user has capability |
| `Delete Draft` Button | `announcement:delete` | Render ONLY if draft AND user has capability |
| `Publish` Button | `announcement:publish` | Render ONLY if draft AND user has capability |
| `Archive` Button | `announcement:publish` | Render ONLY if published AND user has capability |
| `Mark Notification Read` | `notification:read` | Render for authenticated recipient |
| Activity Timeline Tab | `activity:read` | Render tab if user has capability |

*Note: Frontend visibility is a usability layer only. All actions are verified server-side by API guards.*

---

## J. API Integration Contract

The UI layer communicates exclusively with Phase 4.6.1 REST endpoints using client wrapper `apps/web/src/features/communication/api/v1-communication-client.ts`:

```text
UI Action                         REST API Call
───────────────────────────────   ─────────────────────────────────────────────────────
Load Announcement List            GET /api/v1/communication/announcements?status=...
Create Draft Announcement         POST /api/v1/communication/announcements
Update Draft Announcement         PATCH /api/v1/communication/announcements/{id}
Delete Draft Announcement         DELETE /api/v1/communication/announcements/{id}
Publish Announcement              POST /api/v1/communication/announcements/{id}/publish
Archive Announcement              POST /api/v1/communication/announcements/{id}/archive
Load Recipient Notifications      GET /api/v1/communication/notifications?isRead=...
Load Unread Notification Count    GET /api/v1/communication/notifications/unread-count
Mark Notification as Read         POST /api/v1/communication/notifications/{id}/read
Load Student Activity Log         GET /api/v1/students/{studentId}/activities?cursor=...
```

---

## K. Data Fetching & Cache Synchronization Strategy

- **TanStack Query / React Query Keys**:
  - `['communication', 'announcements', { status, batchId }]`
  - `['communication', 'notifications', { isRead }]`
  - `['communication', 'notifications', 'unread-count']`
  - `['students', studentId, 'activities', { eventType }]`
- **Cache Invalidation Rules**:
  - Creating, updating, publishing, or archiving an announcement invalidates `['communication', 'announcements']`.
  - Marking a notification read invalidates `['communication', 'notifications']` and `['communication', 'notifications', 'unread-count']`.

---

## L. Loading, Empty, and Error States

- **Loading States**: Content skeletons (`<Skeleton className="h-20 w-full" />`) matching table and card dimensions to prevent layout shifts.
- **Empty States**: Iconography + friendly prompt text + action CTA (e.g. `<EmptyState title="No Drafts" description="You have no saved announcement drafts." />`).
- **Error Handling**: Standardized error toast notifications and inline alert callouts parsing `ApiError` responses.

---

## M. Responsive Contract

- **Desktop ($\ge$ 1024px)**: Full sidebar layout with multi-column grid for announcement cards and detailed side drawers.
- **Tablet (768px – 1023px)**: Collapsible sidebar layout with responsive two-column grid.
- **Mobile (< 768px)**:
  - Navigation drawer (hamburger menu).
  - Tables convert into card stacks.
  - Modals convert into bottom sheets (`Sheet` with `side="bottom"`).
  - Touch targets set to minimum 44px $\times$ 44px (`min-h-[44px]`).

---

## N. Accessibility Contract (WCAG 2.1 AA)

1. **Keyboard Navability**: Full tab focus loop inside dialogs and sheets (`FocusTrap`). `Esc` key closes modals.
2. **Focus Visibility**: `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`.
3. **Screen Readers**:
   - Status indicators use `aria-live="polite"` for unread counter updates.
   - Form inputs have associated `<Label htmlFor="...">`.
   - Modals specify `aria-labelledby` and `aria-describedby`.
4. **Color Independence**: Status badges use text labels, icon badges, and border styles in addition to colors.

---

## O. Security & Privacy Threat Model

| Threat ID | UI Threat Vector | Frontend Defense Mechanism |
| :--- | :--- | :--- |
| **UI-SEC-001** | Unauthorized action attempts | Capability-aware button hiding (`AuthorizationEngine`) |
| **UI-SEC-002** | Bypassing client UI restrictions | Backend REST guards enforce server-authoritative checks |
| **UI-SEC-003** | Client `instituteId` URL manipulation | Tenant context derived server-side (`resolveServerTenantContext`) |
| **UI-SEC-004** | Cross-user notification tampering | Notification APIs reject foreign user notification IDs (`404`) |
| **UI-SEC-005** | Published announcement edit attempt | Edit button hidden for published state; API throws `400` |
| **UI-SEC-006** | Accidental publication | Mandatory two-step confirmation modal before publish |
| **UI-SEC-007** | Double-submit mutation duplicate requests | Buttons disabled with spinner while mutation is pending |

---

## P. Component Architecture Plan (Phase 4.7.1 Target)

```text
apps/web/src/features/communication/
├── api/
│   └── v1-communication-client.ts
├── components/
│   ├── announcements/
│   │   ├── announcement-list.tsx
│   │   ├── announcement-card.tsx
│   │   ├── announcement-editor-sheet.tsx
│   │   ├── publish-confirmation-dialog.tsx
│   │   └── archive-confirmation-dialog.tsx
│   ├── notifications/
│   │   ├── notification-list.tsx
│   │   ├── notification-item.tsx
│   │   └── unread-count-badge.tsx
│   └── activity/
│       ├── student-activity-timeline.tsx
│       └── activity-timeline-item.tsx
├── types/
│   └── communication-ui.types.ts
└── index.ts
```

---

## Q. Design System Reuse

The Communication UI consumes existing UI primitives from `@coaching-os/ui`:
- `Button` (`variant="default" | "outline" | "destructive" | "ghost"`)
- `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`
- `Badge` (`variant="default" | "secondary" | "destructive" | "outline" | "success" | "warning"`)
- `Input`, `Textarea`, `Label`
- `Skeleton`, `Spinner`
- `Alert`, `AlertTitle`, `AlertDescription`

---

## R. Explicit Non-Goals

- **NO Scheduled Announcement Picker**: Scheduled publishing is out of scope for Phase 4.
- **NO Public WhatsApp Direct Sending Button**: WhatsApp delivery remains an internal worker queue concern.
- **NO WebSockets / Realtime SSE**: Live push updates are not in scope for Phase 4.7.
- **NO Notification Preference Editor**: User notification preference settings belong to Phase 5.
- **NO Activity Mutation Actions**: Activities are read-only events.

---

## S. Acceptance Criteria & Phase 4.7.1 Gate

Phase 4.7 Contract Freeze is **ACCEPTED & FROZEN** when:
- Authoritative contract `docs/phases/04/phase4.7-ui-contract.md` is written and frozen.
- No production UI code changes were introduced.
- No Prisma database schema changes or migrations were made (`0 schema changes`).
- Monorepo Quality Gates pass 100%:
  ```bash
  pnpm env:check     # 🟢 PASS
  pnpm db:validate   # 🟢 PASS
  pnpm db:health     # 🟢 PASS
  pnpm typecheck     # 🟢 PASS
  pnpm lint          # 🟢 PASS
  pnpm test          # 🟢 PASS
  pnpm build         # 🟢 PASS
  ```

---

## Next Milestone

Phase 4.7 is **ACCEPTED & FROZEN**. Ready for authorization of:

**Phase 4.7.1 — Staff Communication Workspace UI Implementation**
