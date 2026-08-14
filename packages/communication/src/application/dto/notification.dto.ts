import type { NotificationEntity } from '../../domain/entities/notification.entity';
import type {
  NotificationCategory,
  NotificationChannel,
  NotificationPriority,
  NotificationRecipientType,
} from '../../domain/types';

export interface NotificationDTO {
  id: string;
  instituteId: string;
  recipientUserId: string;
  recipientType: NotificationRecipientType;
  priority: NotificationPriority;
  category: NotificationCategory;
  channel: NotificationChannel;
  title: string;
  message: string;
  actionUrl: string | null;
  isRead: boolean;
  readAt: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export function toNotificationDTO(entity: NotificationEntity): NotificationDTO {
  return {
    id: entity.id,
    instituteId: entity.instituteId,
    recipientUserId: entity.recipientUserId,
    recipientType: entity.recipientType,
    priority: entity.priority,
    category: entity.category,
    channel: entity.channel,
    title: entity.title,
    message: entity.message,
    actionUrl: entity.actionUrl,
    isRead: entity.isRead,
    readAt: entity.readAt ? entity.readAt.toISOString() : null,
    metadata: entity.metadata,
    createdAt: entity.createdAt.toISOString(),
  };
}
