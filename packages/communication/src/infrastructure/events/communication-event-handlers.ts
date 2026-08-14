import { logger } from '@coaching-os/observability';
import type {
  DomainEventEnvelope,
  AttendanceRecordedEvent,
  HomeworkPublishedEvent,
  TestPublishedEvent,
  InvoiceGeneratedEvent,
  PaymentRecordedEvent,
  ReceiptGeneratedEvent,
  CommunicationAnnouncementPublishedEvent,
} from '@coaching-os/shared';

import type { NotificationProjectionService } from '../../application/use-cases/notification.use-cases';
import type { ActivityProjectionService } from '../../application/use-cases/activity.use-cases';

// ============================================================================
// Dependency Interfaces (Injected without Direct Monorepo Package Imports)
// ============================================================================

export interface StudentParentResolver {
  findParentUserIdsForStudent(instituteId: string, studentId: string): Promise<string[]>;
  findStudentById?(instituteId: string, studentId: string): Promise<{ id: string; instituteId: string } | null>;
}

export interface BatchEnrollmentResolver {
  findActiveStudentIdsByBatch(instituteId: string, batchId: string): Promise<string[]>;
  findActiveInstituteUserIds(instituteId: string): Promise<string[]>;
}

export interface CommunicationEventDependencies {
  notificationProjectionService: NotificationProjectionService;
  activityProjectionService: ActivityProjectionService;
  studentParentResolver: StudentParentResolver;
  batchEnrollmentResolver: BatchEnrollmentResolver;
}

// ============================================================================
// Event Envelope & Version Validator
// ============================================================================

export function validateEventEnvelope(event: any): { isValid: boolean; errorReason?: string } {
  if (!event || typeof event !== 'object') {
    return { isValid: false, errorReason: 'Event payload must be a non-null object' };
  }

  if (!event.eventId || typeof event.eventId !== 'string' || event.eventId.trim() === '') {
    return { isValid: false, errorReason: 'Event is missing required eventId' };
  }

  if (!event.eventType || typeof event.eventType !== 'string' || event.eventType.trim() === '') {
    return { isValid: false, errorReason: 'Event is missing required eventType' };
  }

  if (!event.instituteId || typeof event.instituteId !== 'string' || event.instituteId.trim() === '') {
    return { isValid: false, errorReason: 'Event is missing required instituteId' };
  }

  if (!event.occurredAt || typeof event.occurredAt !== 'string' || isNaN(Date.parse(event.occurredAt))) {
    return { isValid: false, errorReason: 'Event contains invalid or missing occurredAt timestamp' };
  }

  if (!event.payload || typeof event.payload !== 'object') {
    return { isValid: false, errorReason: 'Event is missing required payload object' };
  }

  // Version check (default is 1.0)
  if (event.eventVersion && typeof event.eventVersion === 'string' && !event.eventVersion.startsWith('1.')) {
    return { isValid: false, errorReason: `Unsupported event version "${event.eventVersion}"` };
  }

  return { isValid: true };
}

// ============================================================================
// Event Handlers (Isolated Try-Catch Execution for Notifications & Activities)
// ============================================================================

/**
 * 1. academics.attendance.recorded
 */
export async function handleAttendanceRecorded(
  event: AttendanceRecordedEvent,
  deps: CommunicationEventDependencies,
): Promise<void> {
  const val = validateEventEnvelope(event);
  if (!val.isValid) {
    logger.warn('communication.event.rejected', {
      eventType: event?.eventType,
      eventId: event?.eventId,
      reason: val.errorReason,
    });
    return;
  }

  logger.info('communication.event.received', {
    eventId: event.eventId,
    eventType: event.eventType,
    instituteId: event.instituteId,
  });

  const { records, sessionTitle, recordedByName } = event.payload;
  if (!records || !Array.isArray(records)) {
    logger.warn('communication.projection.rejected', {
      eventId: event.eventId,
      reason: 'Missing records array in attendance event payload',
    });
    return;
  }

  for (const record of records) {
    if (!record.studentId) continue;

    // Tenant / Student verification
    if (deps.studentParentResolver.findStudentById) {
      const student = await deps.studentParentResolver.findStudentById(event.instituteId, record.studentId);
      if (!student || student.instituteId !== event.instituteId) {
        logger.warn('communication.projection.tenant_mismatch', {
          eventId: event.eventId,
          instituteId: event.instituteId,
          studentId: record.studentId,
        });
        continue;
      }
    }

    // A. Activity Projection (Isolated Boundary)
    try {
      await deps.activityProjectionService.projectAttendanceRecorded({
        instituteId: event.instituteId,
        studentId: record.studentId,
        status: record.status === 'absent' ? 'absent' : 'present',
        sessionTitle,
        recordedBy: recordedByName,
        occurredAt: new Date(event.occurredAt),
        eventIdempotencyKey: `${event.eventId}:${record.studentId}`,
      });
      logger.info('communication.projection.succeeded', {
        eventId: event.eventId,
        projectionType: 'activity',
        studentId: record.studentId,
      });
    } catch (err: any) {
      logger.error('communication.projection.failed', {
        eventId: event.eventId,
        projectionType: 'activity',
        studentId: record.studentId,
        error: err?.message,
      });
    }

    // B. Notification Projection (Only for absent students per Phase 4.4 contract)
    if (record.status === 'absent') {
      try {
        const parentUserIds = await deps.studentParentResolver.findParentUserIdsForStudent(
          event.instituteId,
          record.studentId,
        );

        if (!parentUserIds || parentUserIds.length === 0) {
          logger.warn('communication.projection.zero_recipients', {
            eventId: event.eventId,
            studentId: record.studentId,
          });
        } else {
          for (const parentUserId of parentUserIds) {
            try {
              await deps.notificationProjectionService.projectNotificationToRecipient({
                instituteId: event.instituteId,
                recipientUserId: parentUserId,
                recipientType: 'parent',
                priority: 'critical',
                category: 'attendance',
                title: 'Absent Alert',
                message: `Student was marked absent for '${sessionTitle}'.`,
                idempotencyKey: `${event.eventId}:${parentUserId}:attendance_absent`,
              });
              logger.info('communication.projection.succeeded', {
                eventId: event.eventId,
                projectionType: 'notification',
                recipientUserId: parentUserId,
              });
            } catch (err: any) {
              logger.error('communication.projection.failed', {
                eventId: event.eventId,
                projectionType: 'notification',
                recipientUserId: parentUserId,
                error: err?.message,
              });
            }
          }
        }
      } catch (err: any) {
        logger.error('communication.projection.failed', {
          eventId: event.eventId,
          projectionType: 'notification_resolution',
          studentId: record.studentId,
          error: err?.message,
        });
      }
    }
  }
}

/**
 * 2. academics.homework.published
 */
export async function handleHomeworkPublished(
  event: HomeworkPublishedEvent,
  deps: CommunicationEventDependencies,
): Promise<void> {
  const val = validateEventEnvelope(event);
  if (!val.isValid) {
    logger.warn('communication.event.rejected', {
      eventType: event?.eventType,
      eventId: event?.eventId,
      reason: val.errorReason,
    });
    return;
  }

  logger.info('communication.event.received', {
    eventId: event.eventId,
    eventType: event.eventType,
    instituteId: event.instituteId,
  });

  const { batchId, title, subjectName, assignedByName, dueDate } = event.payload;

  const studentIds = await deps.batchEnrollmentResolver.findActiveStudentIdsByBatch(
    event.instituteId,
    batchId,
  );

  for (const studentId of studentIds) {
    // Activity Projection
    try {
      await deps.activityProjectionService.projectHomeworkPublished({
        instituteId: event.instituteId,
        studentId,
        homeworkTitle: title,
        subjectName,
        assignedBy: assignedByName,
        dueDate,
        occurredAt: new Date(event.occurredAt),
        eventIdempotencyKey: `${event.eventId}:${studentId}`,
      });
    } catch (err: any) {
      logger.error('communication.projection.failed', {
        eventId: event.eventId,
        projectionType: 'activity',
        studentId,
        error: err?.message,
      });
    }

    // Notification Projection to Parents
    try {
      const parentUserIds = await deps.studentParentResolver.findParentUserIdsForStudent(
        event.instituteId,
        studentId,
      );

      for (const parentUserId of parentUserIds) {
        try {
          await deps.notificationProjectionService.projectNotificationToRecipient({
            instituteId: event.instituteId,
            recipientUserId: parentUserId,
            recipientType: 'parent',
            priority: 'important',
            category: 'homework',
            title: `Homework Assigned: ${title}`,
            message: `New homework assigned for ${subjectName}. Due: ${dueDate || 'N/A'}.`,
            idempotencyKey: `${event.eventId}:${parentUserId}:homework_assigned`,
          });
        } catch (err: any) {
          logger.error('communication.projection.failed', {
            eventId: event.eventId,
            projectionType: 'notification',
            recipientUserId: parentUserId,
            error: err?.message,
          });
        }
      }
    } catch (err: any) {
      // Resolution error isolated
    }
  }
}

/**
 * 3. academics.test.published
 */
export async function handleTestPublished(
  event: TestPublishedEvent,
  deps: CommunicationEventDependencies,
): Promise<void> {
  const val = validateEventEnvelope(event);
  if (!val.isValid) {
    logger.warn('communication.event.rejected', {
      eventType: event?.eventType,
      eventId: event?.eventId,
      reason: val.errorReason,
    });
    return;
  }

  logger.info('communication.event.received', {
    eventId: event.eventId,
    eventType: event.eventType,
    instituteId: event.instituteId,
  });

  const { title, totalMarks, studentScores, publishedByName } = event.payload;

  if (!studentScores || !Array.isArray(studentScores)) return;

  for (const score of studentScores) {
    if (!score.studentId) continue;

    // Activity Projection
    try {
      await deps.activityProjectionService.projectTestResultPublished({
        instituteId: event.instituteId,
        studentId: score.studentId,
        testTitle: title,
        marksObtained: score.marksObtained,
        totalMarks,
        publishedBy: publishedByName,
        occurredAt: new Date(event.occurredAt),
        eventIdempotencyKey: `${event.eventId}:${score.studentId}`,
      });
    } catch (err: any) {
      logger.error('communication.projection.failed', {
        eventId: event.eventId,
        projectionType: 'activity',
        studentId: score.studentId,
        error: err?.message,
      });
    }

    // Notification Projection
    try {
      const parentUserIds = await deps.studentParentResolver.findParentUserIdsForStudent(
        event.instituteId,
        score.studentId,
      );

      for (const parentUserId of parentUserIds) {
        try {
          await deps.notificationProjectionService.projectNotificationToRecipient({
            instituteId: event.instituteId,
            recipientUserId: parentUserId,
            recipientType: 'parent',
            priority: 'critical',
            category: 'assessment',
            title: `Test Results Published: ${title}`,
            message: `Marks for '${title}' have been published (${score.marksObtained}/${totalMarks}).`,
            idempotencyKey: `${event.eventId}:${parentUserId}:test_result`,
          });
        } catch (err: any) {
          logger.error('communication.projection.failed', {
            eventId: event.eventId,
            projectionType: 'notification',
            recipientUserId: parentUserId,
            error: err?.message,
          });
        }
      }
    } catch (err: any) {
      // Resolution error isolated
    }
  }
}

/**
 * 4. billing.invoice.generated
 */
export async function handleInvoiceGenerated(
  event: InvoiceGeneratedEvent,
  deps: CommunicationEventDependencies,
): Promise<void> {
  const val = validateEventEnvelope(event);
  if (!val.isValid) {
    logger.warn('communication.event.rejected', {
      eventType: event?.eventType,
      eventId: event?.eventId,
      reason: val.errorReason,
    });
    return;
  }

  logger.info('communication.event.received', {
    eventId: event.eventId,
    eventType: event.eventType,
    instituteId: event.instituteId,
  });

  const { studentId, amount, dueDate } = event.payload;

  if (!studentId) return;

  try {
    const parentUserIds = await deps.studentParentResolver.findParentUserIdsForStudent(
      event.instituteId,
      studentId,
    );

    for (const parentUserId of parentUserIds) {
      try {
        await deps.notificationProjectionService.projectNotificationToRecipient({
          instituteId: event.instituteId,
          recipientUserId: parentUserId,
          recipientType: 'parent',
          priority: 'critical',
          category: 'fee',
          title: 'Fee Invoice Generated',
          message: `Fee invoice generated for ₹${amount}. Due Date: ${dueDate}.`,
          idempotencyKey: `${event.eventId}:${parentUserId}:invoice_generated`,
        });
      } catch (err: any) {
        logger.error('communication.projection.failed', {
          eventId: event.eventId,
          projectionType: 'notification',
          recipientUserId: parentUserId,
          error: err?.message,
        });
      }
    }
  } catch (err: any) {
    // Resolution error isolated
  }
}

/**
 * 5. billing.payment.recorded
 */
export async function handlePaymentRecorded(
  event: PaymentRecordedEvent,
  deps: CommunicationEventDependencies,
): Promise<void> {
  const val = validateEventEnvelope(event);
  if (!val.isValid) {
    logger.warn('communication.event.rejected', {
      eventType: event?.eventType,
      eventId: event?.eventId,
      reason: val.errorReason,
    });
    return;
  }

  logger.info('communication.event.received', {
    eventId: event.eventId,
    eventType: event.eventType,
    instituteId: event.instituteId,
  });

  const { studentId, amount, paymentMode, collectedBy } = event.payload;
  if (!studentId) return;

  // Activity Projection
  try {
    await deps.activityProjectionService.projectPaymentRecorded({
      instituteId: event.instituteId,
      studentId,
      amount,
      paymentMode,
      recordedBy: collectedBy,
      occurredAt: new Date(event.occurredAt),
      eventIdempotencyKey: `${event.eventId}:${studentId}`,
    });
  } catch (err: any) {
    logger.error('communication.projection.failed', {
      eventId: event.eventId,
      projectionType: 'activity',
      studentId,
      error: err?.message,
    });
  }

  // Notification Projection
  try {
    const parentUserIds = await deps.studentParentResolver.findParentUserIdsForStudent(
      event.instituteId,
      studentId,
    );

    for (const parentUserId of parentUserIds) {
      try {
        await deps.notificationProjectionService.projectNotificationToRecipient({
          instituteId: event.instituteId,
          recipientUserId: parentUserId,
          recipientType: 'parent',
          priority: 'critical',
          category: 'fee',
          title: `Payment Recorded: ₹${amount}`,
          message: `Payment of ₹${amount} received via ${paymentMode}.`,
          idempotencyKey: `${event.eventId}:${parentUserId}:payment_recorded`,
        });
      } catch (err: any) {
        logger.error('communication.projection.failed', {
          eventId: event.eventId,
          projectionType: 'notification',
          recipientUserId: parentUserId,
          error: err?.message,
        });
      }
    }
  } catch (err: any) {
    // Resolution error isolated
  }
}

/**
 * 6. billing.receipt.generated
 */
export async function handleReceiptGenerated(
  event: ReceiptGeneratedEvent,
  deps: CommunicationEventDependencies,
): Promise<void> {
  const val = validateEventEnvelope(event);
  if (!val.isValid) {
    logger.warn('communication.event.rejected', {
      eventType: event?.eventType,
      eventId: event?.eventId,
      reason: val.errorReason,
    });
    return;
  }

  logger.info('communication.event.received', {
    eventId: event.eventId,
    eventType: event.eventType,
    instituteId: event.instituteId,
  });

  const { studentId, receiptNumber, amount } = event.payload;
  if (!studentId) return;

  // Activity Projection
  try {
    await deps.activityProjectionService.projectReceiptGenerated({
      instituteId: event.instituteId,
      studentId,
      receiptNumber,
      amount,
      occurredAt: new Date(event.occurredAt),
      eventIdempotencyKey: `${event.eventId}:${studentId}`,
    });
  } catch (err: any) {
    logger.error('communication.projection.failed', {
      eventId: event.eventId,
      projectionType: 'activity',
      studentId,
      error: err?.message,
    });
  }

  // Notification Projection
  try {
    const parentUserIds = await deps.studentParentResolver.findParentUserIdsForStudent(
      event.instituteId,
      studentId,
    );

    for (const parentUserId of parentUserIds) {
      try {
        await deps.notificationProjectionService.projectNotificationToRecipient({
          instituteId: event.instituteId,
          recipientUserId: parentUserId,
          recipientType: 'parent',
          priority: 'informational',
          category: 'fee',
          title: 'Payment Receipt Issued',
          message: `Receipt ${receiptNumber} issued for ₹${amount}.`,
          idempotencyKey: `${event.eventId}:${parentUserId}:receipt_generated`,
        });
      } catch (err: any) {
        logger.error('communication.projection.failed', {
          eventId: event.eventId,
          projectionType: 'notification',
          recipientUserId: parentUserId,
          error: err?.message,
        });
      }
    }
  } catch (err: any) {
    // Resolution error isolated
  }
}

/**
 * 7. communication.announcement.published
 */
export async function handleAnnouncementPublished(
  event: CommunicationAnnouncementPublishedEvent,
  deps: CommunicationEventDependencies,
): Promise<void> {
  const val = validateEventEnvelope(event);
  if (!val.isValid) {
    logger.warn('communication.event.rejected', {
      eventType: event?.eventType,
      eventId: event?.eventId,
      reason: val.errorReason,
    });
    return;
  }

  logger.info('communication.event.received', {
    eventId: event.eventId,
    eventType: event.eventType,
    instituteId: event.instituteId,
  });

  const { targetType, targetBatchId, title } = event.payload;

  if (targetType === 'batch' && targetBatchId) {
    const studentIds = await deps.batchEnrollmentResolver.findActiveStudentIdsByBatch(
      event.instituteId,
      targetBatchId,
    );

    for (const studentId of studentIds) {
      // Activity Projection
      try {
        await deps.activityProjectionService.projectAnnouncementPublished({
          instituteId: event.instituteId,
          studentId,
          announcementTitle: title,
          authorName: 'Staff',
          occurredAt: new Date(event.occurredAt),
          eventIdempotencyKey: `${event.eventId}:${studentId}`,
        });
      } catch (err: any) {
        logger.error('communication.projection.failed', {
          eventId: event.eventId,
          projectionType: 'activity',
          studentId,
          error: err?.message,
        });
      }

      // Notification Projection to Parents
      try {
        const parentUserIds = await deps.studentParentResolver.findParentUserIdsForStudent(
          event.instituteId,
          studentId,
        );

        for (const parentUserId of parentUserIds) {
          try {
            await deps.notificationProjectionService.projectNotificationToRecipient({
              instituteId: event.instituteId,
              recipientUserId: parentUserId,
              recipientType: 'parent',
              priority: 'critical',
              category: 'announcement',
              title: `Announcement: ${title}`,
              message: `New announcement published: ${title}`,
              idempotencyKey: `${event.eventId}:${parentUserId}:announcement_published`,
            });
          } catch (err: any) {
            logger.error('communication.projection.failed', {
              eventId: event.eventId,
              projectionType: 'notification',
              recipientUserId: parentUserId,
              error: err?.message,
            });
          }
        }
      } catch (err: any) {
        // Resolution error isolated
      }
    }
  } else if (targetType === 'institute') {
    const userIds = await deps.batchEnrollmentResolver.findActiveInstituteUserIds(event.instituteId);

    for (const userId of userIds) {
      try {
        await deps.notificationProjectionService.projectNotificationToRecipient({
          instituteId: event.instituteId,
          recipientUserId: userId,
          recipientType: 'staff',
          priority: 'critical',
          category: 'announcement',
          title: `Announcement: ${title}`,
          message: `New institute-wide announcement: ${title}`,
          idempotencyKey: `${event.eventId}:${userId}:institute_announcement`,
        });
      } catch (err: any) {
        logger.error('communication.projection.failed', {
          eventId: event.eventId,
          projectionType: 'notification',
          recipientUserId: userId,
          error: err?.message,
        });
      }
    }
  }
}
