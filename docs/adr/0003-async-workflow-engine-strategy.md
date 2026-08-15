# ADR-0003: Asynchronous Workflow Engine Strategy

## Context & Problem Statement

CoachingOS will eventually require asynchronous background processing for domain events and tasks such as:

1. Multi-channel notifications (WhatsApp Cloud API, SMS retries)
2. Scheduled monthly fee invoice generation
3. Report PDF generation
4. Bulk student CSV imports
5. AI student performance summary generation

During Phase 0.7 (Shared Engineering Infrastructure), we evaluated whether to install an initial workflow engine (such as Inngest, Trigger.dev, BullMQ + Redis, or cloud queues).

## Decision Drivers

- **Zero / Low Cost:** Avoid unnecessary monthly SaaS fees or dedicated cluster hosting costs during Phase 0.
- **Operational Simplicity:** Minimize operational overhead for a solo founder (no managing dedicated Redis servers or worker fleets).
- **No Premature Abstraction:** Do not install infrastructure before a real asynchronous business workload exists.
- **Next.js & Serverless Compatibility:** Maintain clean compatibility with Next.js App Router and serverless deployment models.

## Considered Options

1. **Inngest:** Event-driven durable workflow platform.
2. **Trigger.dev:** Task-oriented durable background job execution platform.
3. **BullMQ + Redis:** Self-hosted Node.js queue requiring Redis cluster management.
4. **Defer Installation until First Async Business Workload:** Establish domain event contracts now, defer infrastructure selection until Phase 4 (Notifications) or first real workload.

## Decision Outcome

**Option 4: Defer Async Infrastructure Installation.**

No background workflow engine (Inngest, Trigger.dev, BullMQ, Redis, SQS, Kafka) will be installed in Phase 0.7.

### Rationale

- **No Current Workload:** CoachingOS Phase 0 focuses on core engineering foundation, identity, and database models. No background tasks currently exist.
- **Event Contract First:** Domain events are defined as typed contracts (`ApplicationEvent` in `@coaching-os/shared`). Domain code emits events without knowing the execution transport.
- **Workload-Driven Selection:** When the first real asynchronous business workload is introduced:
  - **Inngest** will be evaluated for event-driven workflow orchestration (e.g. `attendance.marked` -> parent notification chain).
  - **Trigger.dev** will be evaluated for compute-heavy or long-running tasks (e.g. report PDF rendering, bulk CSV parsing, AI summaries).

---

## Evaluation Matrix for Future Async Workloads

| Criteria                     | Inngest                          | Trigger.dev                | BullMQ + Redis                  |
| ---------------------------- | -------------------------------- | -------------------------- | ------------------------------- |
| **Primary Focus**            | Event-driven workflows           | Long-running tasks & AI    | Self-hosted Redis queue         |
| **TypeScript Integration**   | Excellent                        | Excellent                  | Good                            |
| **Serverless Compatibility** | Native                           | Native                     | Requires worker pool            |
| **Operational Overhead**     | Low (Managed)                    | Low (Managed)              | High (Requires Redis & Workers) |
| **Free Tier**                | Generous (50k runs/mo)           | Generous ($5 credits/mo)   | N/A (Self-hosted)               |
| **Target Workload**          | Notification chains, event flows | Heavy processing, AI, PDFs | Self-hosted queue               |

---

## Phase 4 Execution & Architectural Realization (August 2026)

During **Phase 4 — Communication Module**, we evaluated whether to introduce Inngest or Trigger.dev for the event-driven notification and WhatsApp outbound queue pipeline.

### Architectural Decision for Phase 4

Rather than installing Inngest or Trigger.dev, Phase 4 implemented the **PostgreSQL Transactional Outbox Pattern (`OutboundMessageQueue`)** combined with an **In-Process Typed Event Bus (`@coaching-os/shared`)**:

```text
Domain Event Emitted (Academics / Billing)
         ↓
Typed Shared EventBus (@coaching-os/shared)
         ↓
Communication Event Subscribers (handleAttendanceRecorded, etc.)
         ├── ActivityProjectionService    → Activity table (Append-Only Ledger)
         ├── NotificationProjectionService → Notification table (In-App Feed)
         └── OutboundMessageQueue          → OutboundMessageQueue table (Transactional Outbox)
                                                      ↓
                                           WhatsApp Delivery Worker
                                          (MetaWhatsAppProvider)
```

### Rationale for Omitting Inngest / Trigger.dev in Phase 4

1. **ACID Transactional Guarantees**: Writing notifications, activity feed updates, and outbound WhatsApp messages directly to PostgreSQL within the domain transaction boundary guarantees zero lost events if external HTTP calls fail or network drops occur.
2. **Zero Third-Party Operational Overhead**: Preserves the zero-external-dependency Modular Monolith principle. Eliminates third-party cloud queue outages, SaaS API keys, webhook endpoint routing, and local developer proxies (`inngest-cli` / `trigger.dev dev`).
3. **Failure Isolation**: Provider HTTP failures (e.g. Meta WhatsApp 500s or 429 rate limits) are isolated to the `OutboundMessageQueue` worker retry loop and never corrupt core business transactions or in-app notification state.

### Trigger for Future Re-evaluation

Inngest and Trigger.dev remain approved options for future non-transactional, compute-heavy tasks if required in later phases:
- **Trigger.dev**: Long-running background compute tasks (PDF report rendering, bulk student CSV parsing, AI summaries).
- **Inngest**: Complex multi-step multi-service workflows spanning external cloud APIs beyond the monorepo boundary.

---

## Status

**ACCEPTED & REIFIED IN PHASE 4**
