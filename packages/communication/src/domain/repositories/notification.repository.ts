import type { NotificationEntity } from '../entities/notification.entity';

export interface ListNotificationsOptions {
  instituteId: string;
  recipientUserId: string;
  isRead?: boolean;
  cursor?: string;
  limit?: number;
}

export interface PaginatedNotificationsResult {
  items: NotificationEntity[];
  nextCursor: string | null;
}

export interface NotificationRepository {
  save(notification: NotificationEntity): Promise<NotificationEntity>;
  findById(instituteId: string, id: string): Promise<NotificationEntity | null>;
  findManyForRecipient(options: ListNotificationsOptions): Promise<PaginatedNotificationsResult>;
  countUnread(instituteId: string, recipientUserId: string): Promise<number>;
  markAsRead(
    instituteId: string,
    recipientUserId: string,
    id: string,
    readAt?: Date,
  ): Promise<NotificationEntity | null>;
  findBySourceIdempotencyKey(
    instituteId: string,
    recipientUserId: string,
    idempotencyKey: string,
  ): Promise<NotificationEntity | null>;
}
