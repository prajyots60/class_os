import { CAPABILITIES } from '@coaching-os/identity';
import { AuthorizationError, NotFoundError, ValidationError } from '@coaching-os/shared';
import crypto from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationEntity } from '../../domain/entities/notification.entity';
import type {
  ListNotificationsOptions,
  NotificationRepository,
  PaginatedNotificationsResult,
} from '../../domain/repositories/notification.repository';
import {
  CountUnreadNotificationsUseCase,
  CreateNotificationUseCase,
  GetNotificationUseCase,
  ListNotificationsUseCase,
  MarkNotificationReadUseCase,
  NotificationProjectionService,
  NotificationRequestContext,
} from './notification.use-cases';

class InMemoryNotificationRepository implements NotificationRepository {
  private notifications: Map<string, NotificationEntity> = new Map();

  async save(notification: NotificationEntity): Promise<NotificationEntity> {
    this.notifications.set(notification.id, notification);
    return notification;
  }

  async findById(instituteId: string, id: string): Promise<NotificationEntity | null> {
    const found = this.notifications.get(id);
    if (!found || found.instituteId !== instituteId) {
      return null;
    }
    return found;
  }

  async findManyForRecipient(
    options: ListNotificationsOptions,
  ): Promise<PaginatedNotificationsResult> {
    const all = Array.from(this.notifications.values())
      .filter(
        (n) => n.instituteId === options.instituteId && n.recipientUserId === options.recipientUserId,
      )
      .filter((n) => (options.isRead !== undefined ? n.isRead === options.isRead : true))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    let startIndex = 0;
    if (options.cursor) {
      const cursorIndex = all.findIndex((n) => n.id === options.cursor);
      if (cursorIndex !== -1) {
        startIndex = cursorIndex + 1;
      }
    }

    const limit = options.limit ?? 20;
    const pageItems = all.slice(startIndex, startIndex + limit);
    const nextCursor = pageItems.length === limit && startIndex + limit < all.length ? pageItems[pageItems.length - 1].id : null;

    return {
      items: pageItems,
      nextCursor,
    };
  }

  async countUnread(instituteId: string, recipientUserId: string): Promise<number> {
    return Array.from(this.notifications.values()).filter(
      (n) => n.instituteId === instituteId && n.recipientUserId === recipientUserId && !n.isRead,
    ).length;
  }

  async markAsRead(
    instituteId: string,
    recipientUserId: string,
    id: string,
    readAt?: Date,
  ): Promise<NotificationEntity | null> {
    const notification = await this.findById(instituteId, id);
    if (!notification || notification.recipientUserId !== recipientUserId) {
      return null;
    }
    notification.markAsRead(readAt);
    this.notifications.set(id, notification);
    return notification;
  }

  async findBySourceIdempotencyKey(
    instituteId: string,
    recipientUserId: string,
    idempotencyKey: string,
  ): Promise<NotificationEntity | null> {
    for (const n of this.notifications.values()) {
      if (
        n.instituteId === instituteId &&
        n.recipientUserId === recipientUserId &&
        n.metadata?.idempotencyKey === idempotencyKey
      ) {
        return n;
      }
    }
    return null;
  }
}

describe('Notification Use Cases Suite', () => {
  let repository: InMemoryNotificationRepository;
  let mockUserChecker: { findById: (instituteId: string, id: string) => Promise<unknown | null> };

  const instA = 'inst-A';
  const userA = 'user-A';
  const userB = 'user-B';

  const userContextA: NotificationRequestContext = {
    instituteId: instA,
    userId: userA,
    capabilities: [CAPABILITIES.NOTIFICATION_READ, CAPABILITIES.NOTIFICATION_MANAGE],
  };

  const userContextB: NotificationRequestContext = {
    instituteId: instA,
    userId: userB,
    capabilities: [CAPABILITIES.NOTIFICATION_READ],
  };

  const unauthContext: NotificationRequestContext = {
    instituteId: instA,
    userId: userA,
    capabilities: [],
  };

  beforeEach(() => {
    repository = new InMemoryNotificationRepository();
    mockUserChecker = {
      findById: vi.fn(async (_instId: string, _id: string) => ({ id: 'user-id' })),
    };
  });

  describe('CreateNotificationUseCase', () => {
    it('creates notification for valid recipient in institute', async () => {
      const useCase = new CreateNotificationUseCase(repository, mockUserChecker);
      const result = await useCase.execute(userContextA, {
        recipientUserId: userA,
        recipientType: 'student',
        title: 'Exam Scheduled',
        message: 'Physics exam tomorrow.',
      });

      expect(result.id).toBeDefined();
      expect(result.instituteId).toBe(instA);
      expect(result.recipientUserId).toBe(userA);
      expect(result.isRead).toBe(false);
      expect(mockUserChecker.findById).toHaveBeenCalledWith(instA, userA);
    });

    it('rejects creation if recipient user does not exist in institute', async () => {
      mockUserChecker.findById = vi.fn(async () => null);
      const useCase = new CreateNotificationUseCase(repository, mockUserChecker);

      await expect(
        useCase.execute(userContextA, {
          recipientUserId: 'non-existent',
          recipientType: 'student',
          title: 'Title',
          message: 'Message',
        }),
      ).rejects.toThrow(NotFoundError);
    });

    it('returns existing notification when idempotency key matches', async () => {
      const useCase = new CreateNotificationUseCase(repository, mockUserChecker);
      const input = {
        recipientUserId: userA,
        recipientType: 'student' as const,
        title: 'Fee Reminder',
        message: 'Please pay fee.',
        idempotencyKey: 'event-12345',
      };

      const first = await useCase.execute(userContextA, input);
      const second = await useCase.execute(userContextA, input);

      expect(first.id).toBe(second.id);
    });
  });

  describe('GetNotificationUseCase & Recipient Isolation', () => {
    it('allows recipient to retrieve their notification', async () => {
      const createUseCase = new CreateNotificationUseCase(repository, mockUserChecker);
      const created = await createUseCase.execute(userContextA, {
        recipientUserId: userA,
        recipientType: 'student',
        title: 'Title',
        message: 'Message',
      });

      const getUseCase = new GetNotificationUseCase(repository);
      const retrieved = await getUseCase.execute(userContextA, created.id);
      expect(retrieved.id).toBe(created.id);
    });

    it('masks notification as NotFoundError when requested by another user in same institute', async () => {
      const createUseCase = new CreateNotificationUseCase(repository, mockUserChecker);
      const createdForA = await createUseCase.execute(userContextA, {
        recipientUserId: userA,
        recipientType: 'student',
        title: 'Private Notice',
        message: 'For User A only',
      });

      const getUseCase = new GetNotificationUseCase(repository);

      // User B attempts to read User A's notification
      await expect(getUseCase.execute(userContextB, createdForA.id)).rejects.toThrow(NotFoundError);
    });
  });

  describe('ListNotificationsUseCase & CountUnreadNotificationsUseCase', () => {
    it('lists notifications for recipient and computes unread count', async () => {
      const createUseCase = new CreateNotificationUseCase(repository, mockUserChecker);
      await createUseCase.execute(userContextA, {
        recipientUserId: userA,
        recipientType: 'student',
        title: 'Notice 1',
        message: 'Body 1',
      });
      await createUseCase.execute(userContextA, {
        recipientUserId: userA,
        recipientType: 'student',
        title: 'Notice 2',
        message: 'Body 2',
      });
      // Create notification for User B (must not appear in User A inbox)
      await createUseCase.execute(userContextA, {
        recipientUserId: userB,
        recipientType: 'parent',
        title: 'Notice User B',
        message: 'Body User B',
      });

      const listUseCase = new ListNotificationsUseCase(repository);
      const countUseCase = new CountUnreadNotificationsUseCase(repository);

      const inboxA = await listUseCase.execute(userContextA);
      expect(inboxA.items).toHaveLength(2);
      expect(inboxA.items.every((n) => n.recipientUserId === userA)).toBe(true);

      const unread = await countUseCase.execute(userContextA);
      expect(unread.unreadCount).toBe(2);
    });
  });

  describe('MarkNotificationReadUseCase', () => {
    it('marks notification as read idempotently', async () => {
      const createUseCase = new CreateNotificationUseCase(repository, mockUserChecker);
      const created = await createUseCase.execute(userContextA, {
        recipientUserId: userA,
        recipientType: 'student',
        title: 'Unread Notice',
        message: 'Body',
      });

      const markReadUseCase = new MarkNotificationReadUseCase(repository);

      const firstRead = await markReadUseCase.execute(userContextA, created.id);
      expect(firstRead.isRead).toBe(true);
      expect(firstRead.readAt).not.toBeNull();

      const secondRead = await markReadUseCase.execute(userContextA, created.id);
      expect(secondRead.isRead).toBe(true);
      expect(secondRead.readAt).toBe(firstRead.readAt);
    });

    it('rejects mark notification as read when user is not the recipient', async () => {
      const createUseCase = new CreateNotificationUseCase(repository, mockUserChecker);
      const createdForA = await createUseCase.execute(userContextA, {
        recipientUserId: userA,
        recipientType: 'student',
        title: 'Notice A',
        message: 'Body',
      });

      const markReadUseCase = new MarkNotificationReadUseCase(repository);

      // User B attempts to mark User A's notification as read
      await expect(markReadUseCase.execute(userContextB, createdForA.id)).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe('NotificationProjectionService', () => {
    it('projects domain events into recipient notifications idempotently', async () => {
      const service = new NotificationProjectionService(repository, mockUserChecker);
      const params = {
        instituteId: instA,
        recipientUserId: userA,
        recipientType: 'student' as const,
        title: 'Session Scheduled',
        message: 'Math session at 10 AM',
        idempotencyKey: 'session-event-999',
      };

      const proj1 = await service.projectNotificationToRecipient(params);
      const proj2 = await service.projectNotificationToRecipient(params);

      expect(proj1.id).toBe(proj2.id);
    });
  });
});
