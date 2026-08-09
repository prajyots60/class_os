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

## Status

**ACCEPTED**
