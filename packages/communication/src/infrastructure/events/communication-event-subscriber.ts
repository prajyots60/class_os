import type { EventBusSubscriber } from '@coaching-os/shared';
import {
  handleAttendanceRecorded,
  handleHomeworkPublished,
  handleTestPublished,
  handleInvoiceGenerated,
  handlePaymentRecorded,
  handleReceiptGenerated,
  handleAnnouncementPublished,
  type CommunicationEventDependencies,
} from './communication-event-handlers';

export function registerCommunicationEventHandlers(
  eventBus: EventBusSubscriber,
  deps: CommunicationEventDependencies,
): () => void {
  const unsubscribers: Array<() => void> = [];

  unsubscribers.push(
    eventBus.subscribe('academics.attendance.recorded', (event) =>
      handleAttendanceRecorded(event, deps),
    ),
  );

  unsubscribers.push(
    eventBus.subscribe('academics.homework.published', (event) =>
      handleHomeworkPublished(event, deps),
    ),
  );

  unsubscribers.push(
    eventBus.subscribe('academics.test.published', (event) =>
      handleTestPublished(event, deps),
    ),
  );

  unsubscribers.push(
    eventBus.subscribe('billing.invoice.generated', (event) =>
      handleInvoiceGenerated(event, deps),
    ),
  );

  unsubscribers.push(
    eventBus.subscribe('billing.payment.recorded', (event) =>
      handlePaymentRecorded(event, deps),
    ),
  );

  unsubscribers.push(
    eventBus.subscribe('billing.receipt.generated', (event) =>
      handleReceiptGenerated(event, deps),
    ),
  );

  unsubscribers.push(
    eventBus.subscribe('communication.announcement.published', (event) =>
      handleAnnouncementPublished(event, deps),
    ),
  );

  // Return master unsubscribe function
  return () => {
    unsubscribers.forEach((unsub) => unsub());
  };
}
