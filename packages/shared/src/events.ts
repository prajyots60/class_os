/**
 * @coaching-os/shared Event Contract Principles
 *
 * Engineering Rule:
 * Domain modules emit typed ApplicationEvents through stable contracts.
 * Asynchronous infrastructure (Inngest / Trigger.dev) will subscribe to these events
 * when background job workloads are introduced.
 */

export interface DomainEventEnvelope<TType extends string = string, TPayload = unknown> {
  eventId: string;
  eventType: TType;
  instituteId: string;
  occurredAt: string; // ISO 8601 string
  payload: TPayload;
  metadata?: {
    requestId?: string;
    actorUserId?: string;
  };
}

export type AttendanceMarkedEvent = DomainEventEnvelope<
  'attendance.marked',
  {
    sessionId: string;
    batchId: string;
    presentCount: number;
    absentCount: number;
  }
>;

export type TestResultPublishedEvent = DomainEventEnvelope<
  'test.published',
  {
    testId: string;
    batchId: string;
    title: string;
  }
>;

export type InvoiceGeneratedEvent = DomainEventEnvelope<
  'invoice.generated',
  {
    invoiceId: string;
    studentId: string;
    amount: number;
    dueDate: string;
  }
>;

export type AnnouncementPublishedEvent = DomainEventEnvelope<
  'announcement.published',
  {
    announcementId: string;
    batchId?: string;
    title: string;
  }
>;

export type ApplicationEvent =
  | AttendanceMarkedEvent
  | TestResultPublishedEvent
  | InvoiceGeneratedEvent
  | AnnouncementPublishedEvent;
