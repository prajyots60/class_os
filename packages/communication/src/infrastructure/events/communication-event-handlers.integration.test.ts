import {
  cleanTestDatabase,
  closeTestPool,
  db,
  validateTestEnvironment,
} from '@coaching-os/database';
import { InMemoryEventBus } from '@coaching-os/shared';
import crypto from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { PrismaActivityRepository } from '../repositories/prisma-activity.repository';
import { PrismaNotificationRepository } from '../repositories/prisma-notification.repository';
import { ProjectActivityUseCase, ActivityProjectionService } from '../../application/use-cases/activity.use-cases';
import { NotificationProjectionService } from '../../application/use-cases/notification.use-cases';
import { registerCommunicationEventHandlers } from './communication-event-subscriber';
import type { StudentParentResolver, BatchEnrollmentResolver } from './communication-event-handlers';

describe('Communication Domain Event Handlers Integration Suite (Phase 4.4.1)', () => {
  let eventBus: InMemoryEventBus;
  let activityRepo: PrismaActivityRepository;
  let notificationRepo: PrismaNotificationRepository;
  let activityService: ActivityProjectionService;
  let notificationService: NotificationProjectionService;

  let mockStudentParentResolver: StudentParentResolver;
  let mockBatchEnrollmentResolver: BatchEnrollmentResolver;

  const instituteId = crypto.randomUUID();
  const foreignInstituteId = crypto.randomUUID();
  const studentId = crypto.randomUUID();
  const foreignStudentId = crypto.randomUUID();
  const parentUserId = crypto.randomUUID();
  const batchId = crypto.randomUUID();

  beforeAll(() => {
    validateTestEnvironment();
    activityRepo = new PrismaActivityRepository(db as any);
    notificationRepo = new PrismaNotificationRepository(db as any);

    const projectActivityUseCase = new ProjectActivityUseCase(activityRepo);
    activityService = new ActivityProjectionService(projectActivityUseCase);
    notificationService = new NotificationProjectionService(notificationRepo);
  });

  beforeEach(async () => {
    await cleanTestDatabase();
    eventBus = new InMemoryEventBus();

    await db.institute.create({
      data: {
        id: instituteId,
        name: 'Event Handler Institute A',
        slug: `evt-inst-a-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        phone: '+919876543210',
        email: `evt-a-${Date.now()}-${Math.floor(Math.random() * 10000)}@example.com`,
      },
    });

    await db.institute.create({
      data: {
        id: foreignInstituteId,
        name: 'Event Handler Institute B',
        slug: `evt-inst-b-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        phone: '+919876543211',
        email: `evt-b-${Date.now()}-${Math.floor(Math.random() * 10000)}@example.com`,
      },
    });

    await db.student.create({
      data: {
        id: studentId,
        instituteId,
        admissionNumber: `ADM-E1-${Date.now()}`,
        firstName: 'EventStudent',
        lastName: 'One',
      },
    });

    await db.student.create({
      data: {
        id: foreignStudentId,
        instituteId: foreignInstituteId,
        admissionNumber: `ADM-E2-${Date.now()}`,
        firstName: 'ForeignStudent',
        lastName: 'Two',
      },
    });

    await db.user.create({
      data: {
        id: parentUserId,
        name: 'Parent User',
        email: `parent-${Date.now()}-${Math.floor(Math.random() * 10000)}@example.com`,
      },
    });

    mockStudentParentResolver = {
      findParentUserIdsForStudent: async (instId, stdId) => {
        if (instId === instituteId && stdId === studentId) {
          return [parentUserId];
        }
        return [];
      },
      findStudentById: async (instId, stdId) => {
        if (instId === instituteId && stdId === studentId) {
          return { id: studentId, instituteId };
        }
        if (instId === foreignInstituteId || stdId === foreignStudentId) {
          return { id: stdId, instituteId: foreignInstituteId };
        }
        return null;
      },
    };

    mockBatchEnrollmentResolver = {
      findActiveStudentIdsByBatch: async (instId, bId) => {
        if (instId === instituteId && bId === batchId) {
          return [studentId];
        }
        return [];
      },
      findActiveInstituteUserIds: async (instId) => {
        if (instId === instituteId) {
          return [parentUserId];
        }
        return [];
      },
    };

    registerCommunicationEventHandlers(eventBus, {
      notificationProjectionService: notificationService,
      activityProjectionService: activityService,
      studentParentResolver: mockStudentParentResolver,
      batchEnrollmentResolver: mockBatchEnrollmentResolver,
    });
  });

  afterAll(async () => {
    await closeTestPool();
  });

  describe('1. Attendance Event Projections (academics.attendance.recorded)', () => {
    it('EVT-001 & EVT-014: should project attendance_absent Activity & Notification for absent student', async () => {
      const eventId = crypto.randomUUID();
      await eventBus.publish('academics.attendance.recorded', {
        eventId,
        eventType: 'academics.attendance.recorded',
        instituteId,
        occurredAt: new Date().toISOString(),
        payload: {
          sessionId: crypto.randomUUID(),
          batchId,
          sessionTitle: 'Mathematics 101',
          records: [{ studentId, status: 'absent' }],
          recordedByUserId: crypto.randomUUID(),
          recordedByName: 'Prof. John',
        },
      });

      // Verify Activity created
      const activities = await activityRepo.findManyForStudent({ instituteId, studentId });
      expect(activities.items.length).toBe(1);
      expect(activities.items[0].eventType).toBe('attendance_absent');
      expect(activities.items[0].title).toBe('Marked Absent');

      // Verify Notification created
      const notifications = await notificationRepo.findManyForRecipient({ instituteId, recipientUserId: parentUserId });
      expect(notifications.items.length).toBe(1);
      expect(notifications.items[0].category).toBe('attendance');
      expect(notifications.items[0].title).toBe('Absent Alert');
    });

    it('should project attendance_present Activity without creating Notification for present student', async () => {
      const eventId = crypto.randomUUID();
      await eventBus.publish('academics.attendance.recorded', {
        eventId,
        eventType: 'academics.attendance.recorded',
        instituteId,
        occurredAt: new Date().toISOString(),
        payload: {
          sessionId: crypto.randomUUID(),
          batchId,
          sessionTitle: 'Mathematics 101',
          records: [{ studentId, status: 'present' }],
          recordedByUserId: crypto.randomUUID(),
          recordedByName: 'Prof. John',
        },
      });

      const activities = await activityRepo.findManyForStudent({ instituteId, studentId });
      expect(activities.items.length).toBe(1);
      expect(activities.items[0].eventType).toBe('attendance_present');

      const notifications = await notificationRepo.findManyForRecipient({ instituteId, recipientUserId: parentUserId });
      expect(notifications.items.length).toBe(0);
    });
  });

  describe('2. Homework Event Projections (academics.homework.published)', () => {
    it('EVT-015: should project homework_assigned Activity & Notification to enrolled batch members', async () => {
      const eventId = crypto.randomUUID();
      await eventBus.publish('academics.homework.published', {
        eventId,
        eventType: 'academics.homework.published',
        instituteId,
        occurredAt: new Date().toISOString(),
        payload: {
          homeworkId: crypto.randomUUID(),
          batchId,
          subjectName: 'Physics',
          title: 'Quantum Mechanics Problem Set',
          dueDate: '2026-08-20',
          assignedByUserId: crypto.randomUUID(),
          assignedByName: 'Dr. Feynman',
        },
      });

      const activities = await activityRepo.findManyForStudent({ instituteId, studentId });
      expect(activities.items.length).toBe(1);
      expect(activities.items[0].eventType).toBe('homework_assigned');
      expect(activities.items[0].title).toContain('Quantum Mechanics');

      const notifications = await notificationRepo.findManyForRecipient({ instituteId, recipientUserId: parentUserId });
      expect(notifications.items.length).toBe(1);
      expect(notifications.items[0].category).toBe('homework');
    });
  });

  describe('3. Test Result Event Projections (academics.test.published)', () => {
    it('EVT-016: should project test_result Activity & Notification for published test scores', async () => {
      const eventId = crypto.randomUUID();
      await eventBus.publish('academics.test.published', {
        eventId,
        eventType: 'academics.test.published',
        instituteId,
        occurredAt: new Date().toISOString(),
        payload: {
          testId: crypto.randomUUID(),
          batchId,
          title: 'Midterm Assessment',
          totalMarks: 100,
          studentScores: [{ studentId, marksObtained: 85 }],
          publishedByUserId: crypto.randomUUID(),
          publishedByName: 'Evaluator Smith',
        },
      });

      const activities = await activityRepo.findManyForStudent({ instituteId, studentId });
      expect(activities.items.length).toBe(1);
      expect(activities.items[0].eventType).toBe('test_result');
      expect(activities.items[0].description).toContain('Scored 85/100');

      const notifications = await notificationRepo.findManyForRecipient({ instituteId, recipientUserId: parentUserId });
      expect(notifications.items.length).toBe(1);
      expect(notifications.items[0].category).toBe('assessment');
    });
  });

  describe('4. Billing Event Projections (billing.payment.recorded & billing.receipt.generated)', () => {
    it('EVT-012: should project fee_payment Activity & Notification for recorded payment', async () => {
      const eventId = crypto.randomUUID();
      await eventBus.publish('billing.payment.recorded', {
        eventId,
        eventType: 'billing.payment.recorded',
        instituteId,
        occurredAt: new Date().toISOString(),
        payload: {
          paymentId: crypto.randomUUID(),
          invoiceId: crypto.randomUUID(),
          billingPlanId: crypto.randomUUID(),
          instituteId,
          studentId,
          amount: 5000,
          paymentMode: 'UPI',
          receivedOn: '2026-08-14',
          collectedBy: 'Accountant Admin',
          newInvoiceStatus: 'paid',
          outstandingBalance: 0,
          recordedAt: new Date().toISOString(),
        },
      });

      const activities = await activityRepo.findManyForStudent({ instituteId, studentId });
      expect(activities.items.length).toBe(1);
      expect(activities.items[0].eventType).toBe('fee_payment');

      const notifications = await notificationRepo.findManyForRecipient({ instituteId, recipientUserId: parentUserId });
      expect(notifications.items.length).toBe(1);
      expect(notifications.items[0].category).toBe('fee');
    });

    it('EVT-013: should project receipt_issued Activity & Notification for generated receipt', async () => {
      const eventId = crypto.randomUUID();
      await eventBus.publish('billing.receipt.generated', {
        eventId,
        eventType: 'billing.receipt.generated',
        instituteId,
        occurredAt: new Date().toISOString(),
        payload: {
          receiptId: crypto.randomUUID(),
          instituteId,
          paymentId: crypto.randomUUID(),
          receiptNumber: 'RCP-2026-001',
          amount: 5000,
          paymentMode: 'UPI',
          generatedAt: new Date().toISOString(),
          studentId,
        },
      });

      const activities = await activityRepo.findManyForStudent({ instituteId, studentId });
      expect(activities.items.length).toBe(1);
      expect(activities.items[0].eventType).toBe('receipt_issued');

      const notifications = await notificationRepo.findManyForRecipient({ instituteId, recipientUserId: parentUserId });
      expect(notifications.items.length).toBe(1);
      expect(notifications.items[0].title).toBe('Payment Receipt Issued');
    });
  });

  describe('5. Announcement Event Projections (communication.announcement.published)', () => {
    it('EVT-010: should project institute-wide announcement notification to all institute users', async () => {
      const eventId = crypto.randomUUID();
      await eventBus.publish('communication.announcement.published', {
        eventId,
        eventType: 'communication.announcement.published',
        instituteId,
        occurredAt: new Date().toISOString(),
        payload: {
          announcementId: crypto.randomUUID(),
          targetType: 'institute',
          title: 'Annual Day Celebrations',
          publishedAt: new Date().toISOString(),
        },
      });

      const notifications = await notificationRepo.findManyForRecipient({ instituteId, recipientUserId: parentUserId });
      expect(notifications.items.length).toBe(1);
      expect(notifications.items[0].title).toContain('Annual Day');
    });

    it('EVT-011: should project batch announcement Activity & Notification to batch members', async () => {
      const eventId = crypto.randomUUID();
      await eventBus.publish('communication.announcement.published', {
        eventId,
        eventType: 'communication.announcement.published',
        instituteId,
        occurredAt: new Date().toISOString(),
        payload: {
          announcementId: crypto.randomUUID(),
          targetType: 'batch',
          targetBatchId: batchId,
          title: 'Batch Special Class',
          publishedAt: new Date().toISOString(),
        },
      });

      const activities = await activityRepo.findManyForStudent({ instituteId, studentId });
      expect(activities.items.length).toBe(1);
      expect(activities.items[0].eventType).toBe('announcement');

      const notifications = await notificationRepo.findManyForRecipient({ instituteId, recipientUserId: parentUserId });
      expect(notifications.items.length).toBe(1);
    });
  });

  describe('6. Security & Multi-Tenant Isolation Tests', () => {
    it('EVT-004 & EVT-005: should REJECT event when student belongs to foreign institute', async () => {
      const eventId = crypto.randomUUID();
      await eventBus.publish('academics.attendance.recorded', {
        eventId,
        eventType: 'academics.attendance.recorded',
        instituteId, // Event is for Institute A
        occurredAt: new Date().toISOString(),
        payload: {
          sessionId: crypto.randomUUID(),
          batchId,
          sessionTitle: 'Malicious Injected Session',
          records: [{ studentId: foreignStudentId, status: 'absent' }], // Student belongs to Institute B
          recordedByUserId: crypto.randomUUID(),
          recordedByName: 'Attacker',
        },
      });

      // Zero activity or notification records created for foreign student/institute
      const activities = await activityRepo.findManyForStudent({ instituteId, studentId: foreignStudentId });
      expect(activities.items.length).toBe(0);

      const notifications = await notificationRepo.findManyForRecipient({ instituteId, recipientUserId: parentUserId });
      expect(notifications.items.length).toBe(0);
    });
  });

  describe('7. Idempotency & Concurrency Tests', () => {
    it('EVT-006 & EVT-018: should be 100% IDEMPOTENT when replaying duplicate event multiple times', async () => {
      const eventId = crypto.randomUUID();
      const eventPayload = {
        eventId,
        eventType: 'billing.payment.recorded' as const,
        instituteId,
        occurredAt: new Date().toISOString(),
        payload: {
          paymentId: crypto.randomUUID(),
          invoiceId: crypto.randomUUID(),
          billingPlanId: crypto.randomUUID(),
          instituteId,
          studentId,
          amount: 2500,
          paymentMode: 'Cash',
          receivedOn: '2026-08-14',
          collectedBy: 'Staff Admin',
          newInvoiceStatus: 'paid',
          outstandingBalance: 0,
          recordedAt: new Date().toISOString(),
        },
      };

      // Publish 3 identical duplicate events
      await eventBus.publish('billing.payment.recorded', eventPayload);
      await eventBus.publish('billing.payment.recorded', eventPayload);
      await eventBus.publish('billing.payment.recorded', eventPayload);

      // Exactly 1 Activity & 1 Notification record created
      const activities = await activityRepo.findManyForStudent({ instituteId, studentId });
      expect(activities.items.length).toBe(1);

      const notifications = await notificationRepo.findManyForRecipient({ instituteId, recipientUserId: parentUserId });
      expect(notifications.items.length).toBe(1);
    });

    it('EVT-007: should handle CONCURRENT duplicate event processing atomically', async () => {
      const eventId = crypto.randomUUID();
      const eventPayload = {
        eventId,
        eventType: 'billing.payment.recorded' as const,
        instituteId,
        occurredAt: new Date().toISOString(),
        payload: {
          paymentId: crypto.randomUUID(),
          invoiceId: crypto.randomUUID(),
          billingPlanId: crypto.randomUUID(),
          instituteId,
          studentId,
          amount: 3000,
          paymentMode: 'Card',
          receivedOn: '2026-08-14',
          collectedBy: 'Staff Admin',
          newInvoiceStatus: 'paid',
          outstandingBalance: 0,
          recordedAt: new Date().toISOString(),
        },
      };

      // Fire 5 concurrent workers simultaneously
      await Promise.all([
        eventBus.publish('billing.payment.recorded', eventPayload),
        eventBus.publish('billing.payment.recorded', eventPayload),
        eventBus.publish('billing.payment.recorded', eventPayload),
        eventBus.publish('billing.payment.recorded', eventPayload),
        eventBus.publish('billing.payment.recorded', eventPayload),
      ]);

      const activities = await activityRepo.findManyForStudent({ instituteId, studentId });
      expect(activities.items.length).toBe(1);

      const notifications = await notificationRepo.findManyForRecipient({ instituteId, recipientUserId: parentUserId });
      expect(notifications.items.length).toBe(1);
    });
  });

  describe('8. Failure Isolation Tests', () => {
    it('EVT-008 & EVT-009: should maintain independent failure boundaries between Notification and Activity projections', async () => {
      // Mock notification service to throw error
      const brokenNotificationService = {
        projectNotificationToRecipient: async () => {
          throw new Error('Database temporary connection failure in notification repo');
        },
      } as any;

      const eventBusWithFailure = new InMemoryEventBus();
      registerCommunicationEventHandlers(eventBusWithFailure, {
        notificationProjectionService: brokenNotificationService,
        activityProjectionService: activityService,
        studentParentResolver: mockStudentParentResolver,
        batchEnrollmentResolver: mockBatchEnrollmentResolver,
      });

      const eventId = crypto.randomUUID();
      await eventBusWithFailure.publish('billing.payment.recorded', {
        eventId,
        eventType: 'billing.payment.recorded',
        instituteId,
        occurredAt: new Date().toISOString(),
        payload: {
          paymentId: crypto.randomUUID(),
          invoiceId: crypto.randomUUID(),
          billingPlanId: crypto.randomUUID(),
          instituteId,
          studentId,
          amount: 1000,
          paymentMode: 'Cash',
          receivedOn: '2026-08-14',
          collectedBy: 'Admin',
          newInvoiceStatus: 'paid',
          outstandingBalance: 0,
          recordedAt: new Date().toISOString(),
        },
      });

      // Activity projection SUCCEEDS despite Notification projection failure!
      const activities = await activityRepo.findManyForStudent({ instituteId, studentId });
      expect(activities.items.length).toBe(1);
    });
  });

  describe('9. Event Safety & Malformed Payload Handling', () => {
    it('EVT-002: should ignore unknown event types safely without throwing', async () => {
      await expect(
        eventBus.publish('unregistered.custom.event', {
          eventId: crypto.randomUUID(),
          eventType: 'unregistered.custom.event',
          instituteId,
          occurredAt: new Date().toISOString(),
          payload: {},
        }),
      ).resolves.not.toThrow();
    });

    it('EVT-003: should reject malformed events missing required eventId or instituteId', async () => {
      // Missing eventId
      await eventBus.publish('academics.attendance.recorded', {
        eventType: 'academics.attendance.recorded',
        instituteId,
        occurredAt: new Date().toISOString(),
        payload: {},
      } as any);

      // Missing instituteId
      await eventBus.publish('academics.attendance.recorded', {
        eventId: crypto.randomUUID(),
        eventType: 'academics.attendance.recorded',
        occurredAt: new Date().toISOString(),
        payload: {},
      } as any);

      const activities = await activityRepo.findManyForStudent({ instituteId, studentId });
      expect(activities.items.length).toBe(0);
    });

    it('EVT-020: should reject unsupported event version', async () => {
      await eventBus.publish('academics.attendance.recorded', {
        eventId: crypto.randomUUID(),
        eventType: 'academics.attendance.recorded',
        instituteId,
        occurredAt: new Date().toISOString(),
        eventVersion: '3.0.0', // Unsupported major version
        payload: {
          sessionId: crypto.randomUUID(),
          batchId,
          sessionTitle: 'Future Session',
          records: [{ studentId, status: 'absent' }],
          recordedByUserId: crypto.randomUUID(),
          recordedByName: 'Future Teacher',
        },
      } as any);

      const activities = await activityRepo.findManyForStudent({ instituteId, studentId });
      expect(activities.items.length).toBe(0);
    });
  });
});
