# Phase 4.0 — Communication Architecture & Domain Contract Freeze

> **Status:** 🟢 **ACCEPTED & FROZEN**  
> **Authoritative Specification Document**  
> **Target Audience:** Engineering Staff, Domain Lead, Security Reviewers  
> **Freeze Date:** August 14, 2026  

---

## 1. Executive Summary & Scope Boundary

### 1.1 Purpose
This document establishes the **authoritative, frozen architectural specification and domain contract** for **Phase 4 — Communication Module** of CoachingOS.

Phase 1 established **Identity & Tenancy** (*who everyone is*).  
Phase 2 established **Academics** (*what happens in class*).  
Phase 3 established **Billing** (*financial obligations & payments*).  
Phase 4 establishes **Communication & Activity Tracking** (*how business facts reach staff, parents, and students*).

### 1.2 Strict Scope Constraints for Phase 4.0
- **CONTRACT FREEZE ONLY**: Zero production implementation code is to be written during Phase 4.0.
- **NO DATABASE DRIFT**: No Prisma schema changes or PostgreSQL migrations are applied in Phase 4.0.
- **NO EXTERNAL INFRASTRUCTURE DEPENDENCIES**: No Redis, BullMQ, Sentry, or paid third-party cloud SaaS dependencies are introduced.
- **NO API OR UI IMPLEMENTATION**: REST API routes and React UI components are specified in this contract but constructed in subsequent subphases (Phases 4.6 and 4.7).

---

## 2. Core Architectural Principles & Invariants

```text
Academics / Billing / Identity Domains
              │
              │ Published Domain Events (Business Facts)
              ▼
      Communication Module (Consumer of Facts)
              │
       ┌──────┼────────────────────────┐
       ▼      ▼                        ▼
   In-App   Outbound Queue       Activity Timeline
 Notification (WhatsApp / SMS)  (Child-Centric Feed)
```

### R-COM-001 — Communication as a Pure Consumer of Business Facts
- Communication is a **downstream consumer** of domain events emitted by Academics, Billing, and Identity.
- **Strict Invariant**: Communication NEVER mutates data in upstream packages (`packages/academics`, `packages/billing`, `packages/identity`). Communication only reads upstream data or reacts to published domain events.

### R-COM-002 — Architectural Distinction: Notification vs. Activity
- **Notification ("Tell someone something")**: A targeted message to a specific user (`recipientUserId`) with delivery state (`isRead`, `readAt`), priority level, and delivery channel (`in_app`, `whatsapp`).
- **Activity ("Record what happened to a child")**: An immutable chronological ledger entry attached to a `Student` (`studentId`), forming the child-centric feed for parents.
- **Invariant**: One domain event (e.g., `academics.attendance.recorded`) can project into **both** a `Notification` for a parent and an `Activity` for the student's timeline.

### R-COM-003 — Delivery Channel Abstraction (Provider Pattern)
- The domain layer (`packages/communication/src/domain`) MUST remain 100% framework-independent and vendor-agnostic.
- Domain code calls `DeliveryOrchestrator.send(notification)` or queues an `OutboundMessage`.
- Infrastructure adapters (`infrastructure/communication/whatsapp-provider.ts`) handle Meta Cloud API / Twilio HTTP integration details. Domain code NEVER imports third-party messaging SDKs or HTTP clients directly.

### R-COM-004 — SRS vs. Roadmap WhatsApp Reconciliation
- **SRS Alignment**: SRS Section 8 defines In-App as MVP and WhatsApp as future rollout.
- **Roadmap Alignment**: Milestone Roadmap Phase 4 includes automated WhatsApp delivery.
- **Reconciliation**: In-App notifications are built synchronously into the core Phase 4 execution. WhatsApp delivery is integrated asynchronously via an `OutboundMessageQueue` table and decoupled `WhatsAppProvider` adapter. If WhatsApp credentials are unconfigured or fail, In-App notifications and Activity timeline entries remain 100% functional.

### R-COM-005 — Asynchronous Queue Engine Selection (ADR-0003 Evaluation)
- Per ADR-0003 and Engineering Playbook rules, asynchronous workloads are evaluated when required.
- **Decision**: Phase 4 utilizes an **In-Memory Event Bus + PostgreSQL Outbound Message Queue (`outbound_message_queue` table)**. This provides transactional delivery guarantees, atomic retries, and zero external infrastructure dependencies (No Redis or BullMQ required).

---

## 3. Communication Domain Entities & State Machines

```text
                  COMMUNICATION DOMAIN AGGREGATES
                  
  ┌───────────────────┐    ┌───────────────────┐    ┌───────────────────┐
  │   Announcement    │    │   Notification    │    │     Activity      │
  ├───────────────────┤    ├───────────────────┤    ├───────────────────┤
  │ id                │    │ id                │    │ id                │
  │ instituteId       │    │ instituteId       │    │ instituteId       │
  │ targetType        │    │ recipientUserId   │    │ studentId         │
  │ targetBatchId     │    │ priority          │    │ eventType         │
  │ title             │    │ category          │    │ title             │
  │ content           │    │ title, message    │    │ description       │
  │ status (draft...) │    │ isRead, readAt    │    │ occurredAt        │
  └───────────────────┘    └───────────────────┘    └───────────────────┘
```

### 3.1 `AnnouncementEntity`
Represents institute-wide or batch-targeted broadcasts created by staff.

- **Fields**:
  - `id`: string (UUID v4)
  - `instituteId`: string (Tenant ID)
  - `targetType`: `'institute' | 'batch'`
  - `targetBatchId`: string | null (Required if `targetType === 'batch'`)
  - `title`: string (1 to 200 chars)
  - `content`: string (1 to 5000 chars)
  - `authorUserId`: string (Staff User ID)
  - `status`: `'draft' | 'published' | 'archived'`
  - `publishedAt`: Date | null
  - `createdAt`: Date
  - `updatedAt`: Date

- **Lifecycle Invariants**:
  - `draft` $\rightarrow$ `published` $\rightarrow$ `archived`.
  - Once `published`, `title`, `content`, `targetType`, and `targetBatchId` are **100% IMMUTABLE**.
  - Deletion is permitted ONLY for `draft` announcements. `published` announcements cannot be deleted, only `archived`.

### 3.2 `NotificationEntity`
Represents targeted in-app or channel notifications sent to individual staff, parents, or students.

- **Fields**:
  - `id`: string (UUID v4)
  - `instituteId`: string (Tenant ID)
  - `recipientUserId`: string (User ID)
  - `recipientType`: `'staff' | 'parent' | 'student'`
  - `priority`: `'critical' | 'important' | 'informational'`
  - `category`: `'attendance' | 'fee' | 'assessment' | 'homework' | 'announcement' | 'emergency' | 'general'`
  - `title`: string
  - `message`: string
  - `actionUrl`: string | null (Optional deep link, e.g., `/billing` or `/academics`)
  - `isRead`: boolean (Default `false`)
  - `readAt`: Date | null
  - `metadata`: Record<string, unknown> | null
  - `createdAt`: Date

- **Priority Taxonomy & Behavior**:
  - 🔴 **`critical`**: Absent alerts, Fee Due notices, Payment Receipts, Test Results published, Emergency Announcements. (Generates In-App + Queues WhatsApp message).
  - 🟡 **`important`**: Homework assigned, Timetable changes, Batch Announcements. (Generates In-App notification).
  - 🔵 **`informational`**: General updates, Institute-wide announcements. (Generates In-App notification).

- **Lifecycle & Immutability**:
  - State transition: `unread` $\rightarrow$ `read`.
  - Notifications are immutable once created. No `PATCH` endpoints for content. Only `markAsRead()` mutations are allowed.
  - Physical deletion of notifications is prohibited in domain repositories.

### 3.3 `ActivityEntity` (Child Activity Timeline Foundation)
Represents a chronological ledger entry of an event impacting a specific student, serving as the data foundation for the Phase 5 Parent PWA.

- **Fields**:
  - `id`: string (UUID v4)
  - `instituteId`: string (Tenant ID)
  - `studentId`: string (Student ID)
  - `eventType`: `'attendance_absent' | 'attendance_present' | 'homework_assigned' | 'test_result' | 'fee_payment' | 'receipt_issued' | 'announcement'`
  - `title`: string
  - `description`: string
  - `occurredAt`: Date
  - `actorName`: string | null (e.g., Teacher name or "System")
  - `metadata`: Record<string, unknown> | null (e.g., `{ marks: '42/50', receiptNumber: 'REC-2026-00142' }`)
  - `createdAt`: Date

- **Immutability & Security**:
  - Activity records are **100% IMMUTABLE**. No `PATCH` or `DELETE` methods.
  - Parents can ONLY query activity entries for students linked via verified `StudentLink` relationships.

### 3.4 `OutboundMessageQueueEntity` (Delivery Adapter Queue)
Tracks outbound messaging jobs (WhatsApp / SMS) for reliability, idempotency, and retries.

- **Fields**:
  - `id`: string (UUID v4)
  - `instituteId`: string
  - `notificationId`: string | null
  - `channel`: `'whatsapp' | 'sms'`
  - `recipientPhone`: string (E.164 format)
  - `templateName`: string
  - `templateVariables`: Record<string, unknown>
  - `status`: `'pending' | 'sent' | 'failed'`
  - `attempts`: number (Default `0`, max `3`)
  - `lastError`: string | null
  - `processedAt`: Date | null
  - `createdAt`: Date

---

## 4. Domain Event Integration & Projections

Communication automatically projects published business facts into `Notification` and `Activity` records:

| Emitted Domain Event | Target Audience | Priority | Projections Created |
| :--- | :--- | :--- | :--- |
| `academics.attendance.recorded` | Parent(s) of Absent Student | 🔴 Critical | 1. `Activity` (`attendance_absent`) attached to `studentId`<br>2. `Notification` (`critical`) sent to Parent `userId`<br>3. `OutboundMessageQueue` (WhatsApp absent template) |
| `academics.homework.published` | Students & Parents in Batch | 🟡 Important | 1. `Activity` (`homework_assigned`) attached to each `studentId`<br>2. `Notification` (`important`) sent to Batch Students & Parents |
| `academics.test.published` | Students & Parents in Batch | 🔴 Critical | 1. `Activity` (`test_result`) attached to each `studentId`<br>2. `Notification` (`critical`) sent to Batch Students & Parents |
| `billing.payment.recorded` | Parent(s) of Student | 🔴 Critical | 1. `Activity` (`fee_payment`) attached to `studentId`<br>2. `Notification` (`critical`) sent to Parent `userId`<br>3. `OutboundMessageQueue` (WhatsApp receipt template) |
| `billing.receipt.generated` | Parent(s) of Student | 🔵 Informational | 1. `Activity` (`receipt_issued`) attached to `studentId` |
| `communication.announcement.published` | Institute or Batch Members | 🔴 Critical / 🔵 Informational | 1. `Notification` sent to Target Audience<br>2. `Activity` (`announcement`) attached to affected students |

---

## 5. Security Invariants, Tenant Isolation & RBAC Capabilities

### 5.1 Tenant Isolation Matrix
1. **Server-Authoritative Tenancy**: All queries for Announcements, Notifications, Activity, and Message Queues MUST be scoped explicitly by `instituteId` derived from verified server session context (`resolveV1TenantContext()`).
2. **Client Parameter Non-Trust**: Any client-supplied `instituteId` in request bodies, query strings, or headers is strictly ignored.
3. **Cross-Tenant Masking**: Accessing foreign tenant announcements, notifications, or activity entries returns `404 Not Found`.

### 5.2 Capability RBAC Taxonomy
Central capability definitions in `@coaching-os/identity`:

- `communication:read`: View announcements, notifications, and activity feeds.
- `communication:write`: Create, edit draft, or publish announcements.
- `announcement:create`: Create draft announcements.
- `announcement:publish`: Publish announcements to institute/batch.
- `notification:read`: View and mark in-app notifications as read.

### 5.3 Parent Data Privacy Safeguard
- Parents MUST ONLY access activity entries and notifications for students linked to their authenticated `ParentIdentity` via active `StudentLink` records.
- Staff administrative notes, internal member data, and foreign student data are 100% inaccessible to parents.

---

## 6. HTTP REST API Surface Specification (`/api/v1/communication/...`)

```text
GET    /api/v1/communication/announcements          ← List announcements (filter: batchId, status)
POST   /api/v1/communication/announcements          ← Create announcement (draft)
GET    /api/v1/communication/announcements/{id}     ← Get announcement details
PATCH  /api/v1/communication/announcements/{id}     ← Update draft announcement
POST   /api/v1/communication/announcements/{id}/publish ← Publish announcement
POST   /api/v1/communication/announcements/{id}/archive ← Archive announcement

GET    /api/v1/communication/notifications          ← List in-app notifications (filter: priority, isRead)
PATCH  /api/v1/communication/notifications/{id}/read← Mark single notification as read
PATCH  /api/v1/communication/notifications/read-all ← Mark all notifications as read

GET    /api/v1/communication/activity               ← Chronological activity feed (filter: studentId, eventType)
```

---

## 7. Subphase Execution Roadmap (Phases 4.0 – 4.9)

```text
========================================================================================
                          PHASE 4 — COMMUNICATION MODULE ROADMAP
========================================================================================

Phase 4.0 — Communication Architecture & Domain Contract Freeze  🟢 ACCEPTED & FROZEN
  ├── Phase 4.1 — Announcement Engine Core                        ⏳ UPCOMING
  ├── Phase 4.2 — Notification Core & In-App Engine               ⏳ UPCOMING
  ├── Phase 4.3 — Child Activity Timeline Engine                  ⏳ UPCOMING
  ├── Phase 4.4 — Domain Event Integration & Projections          ⏳ UPCOMING
  ├── Phase 4.5 — Outbound Messaging & WhatsApp Provider          ⏳ UPCOMING
  ├── Phase 4.6 — Protected Communication REST APIs               ⏳ UPCOMING
  ├── Phase 4.7 — Staff Communication Workspace UI                ⏳ UPCOMING
  ├── Phase 4.8 — Security / Privacy / UX / E2E Adversarial Matrix ⏳ UPCOMING
  └── Phase 4.9 — Phase 4 Milestone Freeze & Final Acceptance Gate ⏳ UPCOMING
                                        ↓
                              PHASE 4 GATE (PASSED & FROZEN)
========================================================================================
```

---

## 8. Verification & Acceptance Criteria for Phase 4.0

- [x] Authoritative Phase 4.0 Contract document created at `docs/phases/04/phase4.0-communication-contract.md`.
- [x] Pure consumer invariant defined (Communication reacts to events, never mutates upstream domain data).
- [x] Architectural distinction between Notification and Activity established.
- [x] Delivery channel provider abstraction defined (Domain decoupled from Meta/Twilio SDKs).
- [x] SRS vs. Roadmap WhatsApp reconciliation documented.
- [x] In-Memory Event Bus + PostgreSQL Outbound Queue selected per ADR-0003 review.
- [x] Subphase execution tree (4.0 through 4.9) defined.
- [x] `docs/CONTEXT.md` updated reflecting Phase 4.0 `🟢 ACCEPTED & FROZEN`.
