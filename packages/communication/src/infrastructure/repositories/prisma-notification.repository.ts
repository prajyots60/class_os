import { db as defaultDb } from '@coaching-os/database';
import { ConflictError, NotFoundError } from '@coaching-os/shared';
import { NotificationEntity } from '../../domain/entities/notification.entity';
import type {
  ListNotificationsOptions,
  NotificationRepository,
  PaginatedNotificationsResult,
} from '../../domain/repositories/notification.repository';
import type {
  NotificationCategory,
  NotificationPriority,
  NotificationRecipientType,
} from '../../domain/types';

export class PrismaNotificationRepository implements NotificationRepository {
  constructor(private readonly dbClient: any = defaultDb) {}

  async save(notification: NotificationEntity): Promise<NotificationEntity> {
    try {
      const data = {
        instituteId: notification.instituteId,
        recipientUserId: notification.recipientUserId,
        recipientType: notification.recipientType,
        priority: notification.priority,
        category: notification.category,
        title: notification.title,
        message: notification.message,
        actionUrl: notification.actionUrl,
        isRead: notification.isRead,
        readAt: notification.readAt,
        metadata: notification.metadata
          ? (notification.metadata as Record<string, unknown>)
          : undefined,
      };

      const row = await this.dbClient.notification.upsert({
        where: { id: notification.id },
        create: {
          id: notification.id,
          ...data,
          createdAt: notification.createdAt,
        },
        update: data,
      });

      return this.mapToEntity(row);
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new ConflictError('A notification with this ID or idempotency key already exists');
      }
      if (error?.code === 'P2025') {
        throw new NotFoundError('Notification record not found');
      }
      throw error;
    }
  }

  async findById(instituteId: string, id: string): Promise<NotificationEntity | null> {
    const row = await this.dbClient.notification.findFirst({
      where: {
        id,
        instituteId,
      },
    });

    if (!row) {
      return null;
    }

    return this.mapToEntity(row);
  }

  async findManyForRecipient(
    options: ListNotificationsOptions,
  ): Promise<PaginatedNotificationsResult> {
    const limit = options.limit ?? 20;

    const where: any = {
      instituteId: options.instituteId,
      recipientUserId: options.recipientUserId,
    };

    if (options.isRead !== undefined) {
      where.isRead = options.isRead;
    }

    const findOptions: any = {
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    };

    if (options.cursor) {
      findOptions.cursor = { id: options.cursor };
      findOptions.skip = 1;
    }

    const rows = await this.dbClient.notification.findMany(findOptions);

    let nextCursor: string | null = null;
    if (rows.length > limit) {
      const nextItem = rows.pop();
      nextCursor = nextItem.id;
    }

    return {
      items: rows.map((r: any) => this.mapToEntity(r)),
      nextCursor,
    };
  }

  async countUnread(instituteId: string, recipientUserId: string): Promise<number> {
    const count = await this.dbClient.notification.count({
      where: {
        instituteId,
        recipientUserId,
        isRead: false,
      },
    });
    return count;
  }

  async markAsRead(
    instituteId: string,
    recipientUserId: string,
    id: string,
    readAt?: Date,
  ): Promise<NotificationEntity | null> {
    try {
      const timestamp = readAt ?? new Date();

      const row = await this.dbClient.notification.updateMany({
        where: {
          id,
          instituteId,
          recipientUserId,
        },
        data: {
          isRead: true,
          readAt: timestamp,
        },
      });

      if (row.count === 0) {
        return null;
      }

      return await this.findById(instituteId, id);
    } catch (error: any) {
      if (error?.code === 'P2025') {
        return null;
      }
      throw error;
    }
  }

  async findBySourceIdempotencyKey(
    instituteId: string,
    recipientUserId: string,
    idempotencyKey: string,
  ): Promise<NotificationEntity | null> {
    const row = await this.dbClient.notification.findFirst({
      where: {
        instituteId,
        recipientUserId,
        metadata: {
          path: ['idempotencyKey'],
          equals: idempotencyKey,
        },
      },
    });

    if (!row) {
      return null;
    }

    return this.mapToEntity(row);
  }

  private mapToEntity(row: any): NotificationEntity {
    return NotificationEntity.reconstitute({
      id: row.id,
      instituteId: row.instituteId,
      recipientUserId: row.recipientUserId,
      recipientType: row.recipientType as NotificationRecipientType,
      priority: row.priority as NotificationPriority,
      category: row.category as NotificationCategory,
      channel: 'in_app',
      title: row.title,
      message: row.message,
      actionUrl: row.actionUrl,
      isRead: row.isRead,
      readAt: row.readAt ? new Date(row.readAt) : null,
      metadata: row.metadata ? (row.metadata as Record<string, unknown>) : null,
      createdAt: new Date(row.createdAt),
    });
  }
}
