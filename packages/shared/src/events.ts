/**
 * @coaching-os/shared Event Contract Principles
 *
 * Engineering Rule:
 * Domain modules emit typed ApplicationEvents through stable contracts.
 * Asynchronous infrastructure (InMemoryEventBus / Inngest / Trigger.dev) will subscribe
 * to these events when background job workloads are introduced.
 */

export interface DomainEventEnvelope<TType extends string = string, TPayload = unknown> {
  readonly eventId: string;
  readonly eventType: TType;
  readonly instituteId: string;
  readonly occurredAt: string; // ISO 8601 string
  readonly payload: TPayload;
  readonly metadata?: {
    readonly requestId?: string;
    readonly actorUserId?: string;
  };
}

// ============================================================================
// Event Interfaces & In-Memory Bus Abstraction
// ============================================================================

export interface EventBusPublisher {
  publish(eventName: string, payload: unknown): Promise<void> | void;
}

export interface EventBusSubscriber {
  subscribe(eventName: string, handler: (payload: any) => Promise<void> | void): () => void;
}

export interface EventBus extends EventBusPublisher, EventBusSubscriber {}

export class InMemoryEventBus implements EventBus {
  private readonly handlers: Map<string, Array<(payload: any) => Promise<void> | void>> = new Map();

  public subscribe(eventName: string, handler: (payload: any) => Promise<void> | void): () => void {
    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, []);
    }
    this.handlers.get(eventName)!.push(handler);

    return () => {
      const list = this.handlers.get(eventName);
      if (list) {
        const idx = list.indexOf(handler);
        if (idx !== -1) {
          list.splice(idx, 1);
        }
      }
    };
  }

  public async publish(eventName: string, payload: unknown): Promise<void> {
    const list = this.handlers.get(eventName) || [];
    const wildcardList = this.handlers.get('*') || [];

    const allHandlers = [...list, ...wildcardList];

    for (const handler of allHandlers) {
      try {
        await handler(payload);
      } catch (error) {
        // Individual handler failure MUST NOT crash the event bus or prevent other handlers from receiving events
      }
    }
  }
}

// ============================================================================
// Upstream Domain Event Contracts
// ============================================================================

// 1. Academics Domain Events
export type AttendanceRecordedEventPayload = {
  readonly sessionId: string;
  readonly batchId: string;
  readonly sessionTitle: string;
  readonly records: Array<{
    readonly studentId: string;
    readonly status: 'present' | 'absent' | 'late' | 'excused';
  }>;
  readonly recordedByUserId: string;
  readonly recordedByName: string;
};

export type AttendanceRecordedEvent = DomainEventEnvelope<
  'academics.attendance.recorded',
  AttendanceRecordedEventPayload
>;

export type HomeworkPublishedEventPayload = {
  readonly homeworkId: string;
  readonly batchId: string;
  readonly subjectName: string;
  readonly title: string;
  readonly dueDate?: string | null;
  readonly assignedByUserId: string;
  readonly assignedByName: string;
};

export type HomeworkPublishedEvent = DomainEventEnvelope<
  'academics.homework.published',
  HomeworkPublishedEventPayload
>;

export type TestPublishedEventPayload = {
  readonly testId: string;
  readonly batchId: string;
  readonly title: string;
  readonly totalMarks: number;
  readonly studentScores: Array<{
    readonly studentId: string;
    readonly marksObtained: number;
  }>;
  readonly publishedByUserId: string;
  readonly publishedByName: string;
};

export type TestPublishedEvent = DomainEventEnvelope<
  'academics.test.published',
  TestPublishedEventPayload
>;

// 2. Billing Domain Events
export type InvoiceGeneratedEventPayload = {
  readonly invoiceId: string;
  readonly studentId: string;
  readonly amount: number;
  readonly dueDate: string;
};

export type InvoiceGeneratedEvent = DomainEventEnvelope<
  'billing.invoice.generated',
  InvoiceGeneratedEventPayload
>;

export type PaymentRecordedEventPayload = {
  readonly paymentId: string;
  readonly invoiceId: string;
  readonly billingPlanId: string;
  readonly instituteId: string;
  readonly enrollmentId?: string;
  readonly studentId?: string;
  readonly amount: number;
  readonly paymentMode: string;
  readonly receivedOn: string;
  readonly collectedBy: string;
  readonly newInvoiceStatus: string;
  readonly outstandingBalance: number;
  readonly recordedAt: string;
};

export type PaymentRecordedEvent = DomainEventEnvelope<
  'billing.payment.recorded',
  PaymentRecordedEventPayload
>;

export type ReceiptGeneratedEventPayload = {
  readonly receiptId: string;
  readonly instituteId: string;
  readonly paymentId: string;
  readonly receiptNumber: string;
  readonly amount: number;
  readonly paymentMode: string;
  readonly generatedAt: string;
  readonly studentId?: string;
};

export type ReceiptGeneratedEvent = DomainEventEnvelope<
  'billing.receipt.generated',
  ReceiptGeneratedEventPayload
>;

// 3. Communication Domain Events
export type CommunicationAnnouncementPublishedEventPayload = {
  readonly announcementId: string;
  readonly targetType: 'institute' | 'batch';
  readonly targetBatchId?: string | null;
  readonly title: string;
  readonly publishedAt: string;
};

export type CommunicationAnnouncementPublishedEvent = DomainEventEnvelope<
  'communication.announcement.published',
  CommunicationAnnouncementPublishedEventPayload
>;

// Backward compatibility aliases
export type AttendanceMarkedEvent = AttendanceRecordedEvent;
export type TestResultPublishedEvent = TestPublishedEvent;
export type AnnouncementPublishedEvent = CommunicationAnnouncementPublishedEvent;

export type ApplicationEvent =
  | AttendanceRecordedEvent
  | HomeworkPublishedEvent
  | TestPublishedEvent
  | InvoiceGeneratedEvent
  | PaymentRecordedEvent
  | ReceiptGeneratedEvent
  | CommunicationAnnouncementPublishedEvent;
