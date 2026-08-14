import {
  cleanTestDatabase,
  closeTestPool,
  db,
  validateTestEnvironment,
} from '@coaching-os/database';
import { CAPABILITIES } from '@coaching-os/identity';
import { AuthorizationError, NotFoundError, ValidationError } from '@coaching-os/shared';
import crypto from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  CountUnreadNotificationsUseCase,
  CreateNotificationUseCase,
  GetNotificationUseCase,
  ListNotificationsUseCase,
  MarkNotificationReadUseCase,
  NotificationProjectionService,
  NotificationRequestContext,
} from '../../application/use-cases/notification.use-cases';
import { NotificationEntity } from '../../domain/entities/notification.entity';
import { PrismaNotificationRepository } from './prisma-notification.repository';

describe('PrismaNotificationRepository & Security Integration Suite', () => {
  let repository: PrismaNotificationRepository;

  let instituteA_Id: string;
  let instituteB_Id: string;

  let userA1_Id: string;
  let userA2_Id: string;
  let userB1_Id: string;

  beforeAll(() => {
    validateTestEnvironment();
    repository = new PrismaNotificationRepository(db as any);
  });

  afterAll(async () => {
    await closeTestPool();
  });

  beforeEach(async () => {
    await cleanTestDatabase();

    // 1. Seed Institute A
    const instA = await db.institute.create({
      data: {
        id: crypto.randomUUID(),
        name: 'Notification Institute A',
        slug: `notif-inst-a-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        phone: '9876543210',
        email: `notif-a-${Date.now()}-${Math.floor(Math.random() * 1000)}@test.com`,
      },
    });
    instituteA_Id = instA.id;

    // Users in Institute A
    const userA1 = await db.user.create({
      data: {
        id: crypto.randomUUID(),
        instituteId: instituteA_Id,
        name: 'User A1',
        email: `usera1-${Date.now()}@test.com`,
      },
    });
    userA1_Id = userA1.id;

    const userA2 = await db.user.create({
      data: {
        id: crypto.randomUUID(),
        instituteId: instituteA_Id,
        name: 'User A2',
        email: `usera2-${Date.now()}@test.com`,
      },
    });
    userA2_Id = userA2.id;

    // 2. Seed Institute B
    const instB = await db.institute.create({
      data: {
        id: crypto.randomUUID(),
        name: 'Notification Institute B',
        slug: `notif-inst-b-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        phone: '9876543211',
        email: `notif-b-${Date.now()}-${Math.floor(Math.random() * 1000)}@test.com`,
      },
    });
    instituteB_Id = instB.id;

    const userB1 = await db.user.create({
      data: {
        id: crypto.randomUUID(),
        instituteId: instituteB_Id,
        name: 'User B1',
        email: `userb1-${Date.now()}@test.com`,
      },
    });
    userB1_Id = userB1.id;
  });

  describe('PostgreSQL Persistence & Repository Operations', () => {
    it('persists and retrieves a notification entity', async () => {
      const entity = NotificationEntity.create({
        id: crypto.randomUUID(),
        instituteId: instituteA_Id,
        recipientUserId: userA1_Id,
        recipientType: 'student',
        priority: 'important',
        category: 'fee',
        title: 'Fee Installment Due',
        message: 'Your fee installment is due on the 15th.',
        actionUrl: '/billing',
        metadata: { invoiceId: 'inv-99' },
      });

      await repository.save(entity);

      const retrieved = await repository.findById(instituteA_Id, entity.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(entity.id);
      expect(retrieved?.instituteId).toBe(instituteA_Id);
      expect(retrieved?.recipientUserId).toBe(userA1_Id);
      expect(retrieved?.priority).toBe('important');
      expect(retrieved?.category).toBe('fee');
      expect(retrieved?.title).toBe('Fee Installment Due');
      expect(retrieved?.message).toBe('Your fee installment is due on the 15th.');
      expect(retrieved?.actionUrl).toBe('/billing');
      expect(retrieved?.isRead).toBe(false);
      expect(retrieved?.metadata).toEqual({ invoiceId: 'inv-99' });
    });

    it('counts unread notifications and marks notification read in PostgreSQL', async () => {
      const entity1 = NotificationEntity.create({
        id: crypto.randomUUID(),
        instituteId: instituteA_Id,
        recipientUserId: userA1_Id,
        recipientType: 'student',
        title: 'Notice 1',
        message: 'Body 1',
      });
      const entity2 = NotificationEntity.create({
        id: crypto.randomUUID(),
        instituteId: instituteA_Id,
        recipientUserId: userA1_Id,
        recipientType: 'student',
        title: 'Notice 2',
        message: 'Body 2',
      });

      await repository.save(entity1);
      await repository.save(entity2);

      let unread = await repository.countUnread(instituteA_Id, userA1_Id);
      expect(unread).toBe(2);

      // Mark entity1 as read
      const updated = await repository.markAsRead(instituteA_Id, userA1_Id, entity1.id);
      expect(updated?.isRead).toBe(true);
      expect(updated?.readAt).not.toBeNull();

      unread = await repository.countUnread(instituteA_Id, userA1_Id);
      expect(unread).toBe(1);
    });

    it('handles concurrent markAsRead operations safely', async () => {
      const entity = NotificationEntity.create({
        id: crypto.randomUUID(),
        instituteId: instituteA_Id,
        recipientUserId: userA1_Id,
        recipientType: 'student',
        title: 'Concurrent Read Notice',
        message: 'Message',
      });
      await repository.save(entity);

      const [res1, res2] = await Promise.all([
        repository.markAsRead(instituteA_Id, userA1_Id, entity.id),
        repository.markAsRead(instituteA_Id, userA1_Id, entity.id),
      ]);

      expect(res1?.isRead).toBe(true);
      expect(res2?.isRead).toBe(true);

      const finalCheck = await repository.findById(instituteA_Id, entity.id);
      expect(finalCheck?.isRead).toBe(true);
    });
  });

  describe('Adversarial Security Cases (Case A through Case I)', () => {
    const ctxUserA1: NotificationRequestContext = {
      instituteId: '', // Set dynamically
      userId: '',
      capabilities: [CAPABILITIES.NOTIFICATION_READ, CAPABILITIES.NOTIFICATION_MANAGE],
    };

    const ctxUserA2: NotificationRequestContext = {
      instituteId: '',
      userId: '',
      capabilities: [CAPABILITIES.NOTIFICATION_READ],
    };

    const ctxUserB1: NotificationRequestContext = {
      instituteId: '',
      userId: '',
      capabilities: [CAPABILITIES.NOTIFICATION_READ, CAPABILITIES.NOTIFICATION_MANAGE],
    };

    const userChecker = {
      async findById(instituteId: string, id: string) {
        return db.user.findFirst({ where: { id, instituteId } });
      },
    };

    beforeEach(() => {
      ctxUserA1.instituteId = instituteA_Id;
      ctxUserA1.userId = userA1_Id;

      ctxUserA2.instituteId = instituteA_Id;
      ctxUserA2.userId = userA2_Id;

      ctxUserB1.instituteId = instituteB_Id;
      ctxUserB1.userId = userB1_Id;
    });

    it('Security Case A — Cross-tenant IDOR returns NotFoundError (404 masking)', async () => {
      const entity = NotificationEntity.create({
        id: crypto.randomUUID(),
        instituteId: instituteA_Id,
        recipientUserId: userA1_Id,
        recipientType: 'student',
        title: 'Secret Inst A Notice',
        message: 'Body',
      });
      await repository.save(entity);

      // Direct DB isolation check
      const foreignFind = await repository.findById(instituteB_Id, entity.id);
      expect(foreignFind).toBeNull();

      // Use Case level check
      const getUseCase = new GetNotificationUseCase(repository);
      await expect(getUseCase.execute(ctxUserB1, entity.id)).rejects.toThrow(NotFoundError);
    });

    it('Security Case B — Cross-user IDOR in same institute returns NotFoundError (404 masking)', async () => {
      const entity = NotificationEntity.create({
        id: crypto.randomUUID(),
        instituteId: instituteA_Id,
        recipientUserId: userA1_Id,
        recipientType: 'student',
        title: 'User A1 Private Notice',
        message: 'Body',
      });
      await repository.save(entity);

      const getUseCase = new GetNotificationUseCase(repository);
      // User A2 in Institute A attempts to read User A1's notification
      await expect(getUseCase.execute(ctxUserA2, entity.id)).rejects.toThrow(NotFoundError);

      const markUseCase = new MarkNotificationReadUseCase(repository);
      // User A2 attempts to mark User A1's notification as read
      await expect(markUseCase.execute(ctxUserA2, entity.id)).rejects.toThrow(NotFoundError);
    });

    it('Security Case C — Client tenant spoofing is overridden by server context', async () => {
      const createUseCase = new CreateNotificationUseCase(repository, userChecker);
      const created = await createUseCase.execute(ctxUserA1, {
        recipientUserId: userA1_Id,
        recipientType: 'student',
        title: 'Tenant Security Test',
        message: 'Message body',
      });

      // Server context instituteA_Id MUST be enforced
      expect(created.instituteId).toBe(instituteA_Id);

      // Institute B cannot read it
      const foreignRead = await repository.findById(instituteB_Id, created.id);
      expect(foreignRead).toBeNull();
    });

    it('Security Case D — Foreign recipient injection is rejected', async () => {
      const createUseCase = new CreateNotificationUseCase(repository, userChecker);

      // Attempting to create a notification in Institute A for User B1 (who belongs to Institute B)
      await expect(
        createUseCase.execute(ctxUserA1, {
          recipientUserId: userB1_Id, // Foreign recipient!
          recipientType: 'student',
          title: 'Injection Notice',
          message: 'Body',
        }),
      ).rejects.toThrow(NotFoundError);
    });

    it('Security Case E — Unauthorized notification mutation rejects missing capability', async () => {
      const createUseCase = new CreateNotificationUseCase(repository, userChecker);

      const unauthCtx: NotificationRequestContext = {
        instituteId: instituteA_Id,
        userId: userA1_Id,
        capabilities: [], // Zero capabilities
      };

      await expect(
        createUseCase.execute(unauthCtx, {
          recipientUserId: userA1_Id,
          recipientType: 'student',
          title: 'Title',
          message: 'Message',
        }),
      ).rejects.toThrow(AuthorizationError);
    });

    it('Security Case F — Duplicate domain event projection is idempotent', async () => {
      const projectionService = new NotificationProjectionService(repository, userChecker);
      const idempotencyKey = `event-proj-${Date.now()}`;

      const params = {
        instituteId: instituteA_Id,
        recipientUserId: userA1_Id,
        recipientType: 'student' as const,
        title: 'Idempotent Homework Notice',
        message: 'Homework 4 uploaded',
        idempotencyKey,
      };

      const proj1 = await projectionService.projectNotificationToRecipient(params);
      const proj2 = await projectionService.projectNotificationToRecipient(params);

      expect(proj1.id).toBe(proj2.id);

      const count = await repository.countUnread(instituteA_Id, userA1_Id);
      expect(count).toBe(1);
    });

    it('Security Case G — Concurrent duplicate projection creates exactly 1 notification', async () => {
      const projectionService = new NotificationProjectionService(repository, userChecker);
      const idempotencyKey = `concurrent-event-${Date.now()}`;

      const params = {
        instituteId: instituteA_Id,
        recipientUserId: userA1_Id,
        recipientType: 'student' as const,
        title: 'Concurrent Event Notice',
        message: 'Message',
        idempotencyKey,
      };

      const [res1, res2] = await Promise.all([
        projectionService.projectNotificationToRecipient(params),
        projectionService.projectNotificationToRecipient(params),
      ]);

      expect(res1.id).toBe(res2.id);
    });

    it('Security Case H — Random UUID probing yields NotFoundError', async () => {
      const getUseCase = new GetNotificationUseCase(repository);
      const randomId = crypto.randomUUID();

      await expect(getUseCase.execute(ctxUserA1, randomId)).rejects.toThrow(NotFoundError);
    });

    it('Security Case I — Core notification properties are immutable', async () => {
      const entity = NotificationEntity.create({
        id: crypto.randomUUID(),
        instituteId: instituteA_Id,
        recipientUserId: userA1_Id,
        recipientType: 'student',
        title: 'Immutable Title',
        message: 'Original Message',
      });
      await repository.save(entity);

      // Attempting property mutation throws TS error and domain properties remain read-only
      expect(() => {
        (entity as any).title = 'Hacked Title';
      }).toThrow();

      expect(entity.title).toBe('Immutable Title');
    });
  });
});
