import { CAPABILITIES } from '@coaching-os/identity';
import { AuthorizationError, NotFoundError, ValidationError } from '@coaching-os/shared';
import crypto from 'node:crypto';
import { NotificationEntity } from '../../domain/entities/notification.entity';
import type { NotificationRepository } from '../../domain/repositories/notification.repository';
import type {
  NotificationCategory,
  NotificationChannel,
  NotificationPriority,
  NotificationRecipientType,
} from '../../domain/types';
import { type NotificationDTO, toNotificationDTO } from '../dto/notification.dto';

export interface UserExistenceChecker {
  findById(instituteId: string, id: string): Promise<unknown | null>;
}

export interface NotificationRequestContext {
  instituteId: string;
  userId: string;
  role?: string;
  capabilities?: readonly string[];
}

function generateDeterministicUUID(namespace: string, key: string): string {
  const hash = crypto.createHash('sha256').update(`${namespace}:${key}`).digest('hex');
  return `${hash.substring(0, 8)}-${hash.substring(8, 12)}-4${hash.substring(13, 16)}-8${hash.substring(17, 20)}-${hash.substring(20, 32)}`;
}

function assertCapability(
  capabilities: readonly string[] | undefined,
  requiredCapabilities: string[],
): void {
  if (!capabilities) {
    return; // System context
  }
  const hasCap = requiredCapabilities.some((cap) => capabilities.includes(cap));
  if (!hasCap) {
    throw new AuthorizationError(
      `User lacks required capability: ${requiredCapabilities.join(' or ')}`,
    );
  }
}

export class CreateNotificationUseCase {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly userChecker?: UserExistenceChecker,
  ) {}

  async execute(
    ctx: NotificationRequestContext,
    input: {
      recipientUserId: string;
      recipientType: NotificationRecipientType;
      priority?: NotificationPriority;
      category?: NotificationCategory;
      channel?: NotificationChannel;
      title: string;
      message: string;
      actionUrl?: string | null;
      metadata?: Record<string, unknown> | null;
      idempotencyKey?: string;
    },
  ): Promise<NotificationDTO> {
    assertCapability(ctx.capabilities, [
      CAPABILITIES.NOTIFICATION_MANAGE,
      CAPABILITIES.ANNOUNCEMENT_CREATE,
    ]);

    // 1. Verify recipient user belongs to server-authoritative tenant
    if (this.userChecker) {
      const user = await this.userChecker.findById(ctx.instituteId, input.recipientUserId);
      if (!user) {
        throw new NotFoundError(`Recipient user not found in institute ${ctx.instituteId}`);
      }
    }

    // 2. Check Idempotency Key if provided
    if (input.idempotencyKey) {
      const existing = await this.notificationRepository.findBySourceIdempotencyKey(
        ctx.instituteId,
        input.recipientUserId,
        input.idempotencyKey,
      );
      if (existing) {
        return toNotificationDTO(existing);
      }
    }

    // 3. Attach idempotencyKey in metadata if present
    const metadata = input.idempotencyKey
      ? { ...input.metadata, idempotencyKey: input.idempotencyKey }
      : input.metadata;

    const notificationId = input.idempotencyKey
      ? generateDeterministicUUID(`${ctx.instituteId}:${input.recipientUserId}`, input.idempotencyKey)
      : crypto.randomUUID();

    const notification = NotificationEntity.create({
      id: notificationId,
      instituteId: ctx.instituteId,
      recipientUserId: input.recipientUserId,
      recipientType: input.recipientType,
      priority: input.priority,
      category: input.category,
      channel: input.channel,
      title: input.title,
      message: input.message,
      actionUrl: input.actionUrl,
      metadata,
    });

    const saved = await this.notificationRepository.save(notification);
    return toNotificationDTO(saved);
  }
}

export class GetNotificationUseCase {
  constructor(private readonly notificationRepository: NotificationRepository) {}

  async execute(ctx: NotificationRequestContext, id: string): Promise<NotificationDTO> {
    assertCapability(ctx.capabilities, [
      CAPABILITIES.NOTIFICATION_READ,
      CAPABILITIES.INSTITUTE_READ,
    ]);

    const notification = await this.notificationRepository.findById(ctx.instituteId, id);

    // Tenant & Recipient isolation enforcement (404 masking)
    if (!notification || notification.recipientUserId !== ctx.userId) {
      throw new NotFoundError('Notification not found');
    }

    return toNotificationDTO(notification);
  }
}

export class ListNotificationsUseCase {
  constructor(private readonly notificationRepository: NotificationRepository) {}

  async execute(
    ctx: NotificationRequestContext,
    options?: {
      isRead?: boolean;
      cursor?: string;
      limit?: number;
    },
  ): Promise<{ items: NotificationDTO[]; nextCursor: string | null }> {
    assertCapability(ctx.capabilities, [
      CAPABILITIES.NOTIFICATION_READ,
      CAPABILITIES.INSTITUTE_READ,
    ]);

    const result = await this.notificationRepository.findManyForRecipient({
      instituteId: ctx.instituteId,
      recipientUserId: ctx.userId,
      isRead: options?.isRead,
      cursor: options?.cursor,
      limit: options?.limit,
    });

    return {
      items: result.items.map(toNotificationDTO),
      nextCursor: result.nextCursor,
    };
  }
}

export class CountUnreadNotificationsUseCase {
  constructor(private readonly notificationRepository: NotificationRepository) {}

  async execute(ctx: NotificationRequestContext): Promise<{ unreadCount: number }> {
    assertCapability(ctx.capabilities, [
      CAPABILITIES.NOTIFICATION_READ,
      CAPABILITIES.INSTITUTE_READ,
    ]);

    const count = await this.notificationRepository.countUnread(ctx.instituteId, ctx.userId);
    return { unreadCount: count };
  }
}

export class MarkNotificationReadUseCase {
  constructor(private readonly notificationRepository: NotificationRepository) {}

  async execute(ctx: NotificationRequestContext, id: string): Promise<NotificationDTO> {
    assertCapability(ctx.capabilities, [
      CAPABILITIES.NOTIFICATION_READ,
      CAPABILITIES.NOTIFICATION_MANAGE,
    ]);

    const notification = await this.notificationRepository.findById(ctx.instituteId, id);

    // Recipient & Tenant isolation (404 masking)
    if (!notification || notification.recipientUserId !== ctx.userId) {
      throw new NotFoundError('Notification not found');
    }

    if (notification.isRead) {
      return toNotificationDTO(notification); // Idempotent return
    }

    const updated = await this.notificationRepository.markAsRead(
      ctx.instituteId,
      ctx.userId,
      id,
      new Date(),
    );

    if (!updated) {
      throw new NotFoundError('Notification not found');
    }

    return toNotificationDTO(updated);
  }
}

export class NotificationProjectionService {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly userChecker?: UserExistenceChecker,
  ) {}

  async projectNotificationToRecipient(params: {
    instituteId: string;
    recipientUserId: string;
    recipientType: NotificationRecipientType;
    priority?: NotificationPriority;
    category?: NotificationCategory;
    title: string;
    message: string;
    actionUrl?: string | null;
    metadata?: Record<string, unknown> | null;
    idempotencyKey?: string;
  }): Promise<NotificationDTO> {
    if (params.idempotencyKey) {
      const existing = await this.notificationRepository.findBySourceIdempotencyKey(
        params.instituteId,
        params.recipientUserId,
        params.idempotencyKey,
      );
      if (existing) {
        return toNotificationDTO(existing);
      }
    }

    if (this.userChecker) {
      const user = await this.userChecker.findById(params.instituteId, params.recipientUserId);
      if (!user) {
        throw new NotFoundError(
          `Recipient user ${params.recipientUserId} not found in institute ${params.instituteId}`,
        );
      }
    }

    const metadata = params.idempotencyKey
      ? { ...params.metadata, idempotencyKey: params.idempotencyKey }
      : params.metadata;

    const notificationId = params.idempotencyKey
      ? generateDeterministicUUID(`${params.instituteId}:${params.recipientUserId}`, params.idempotencyKey)
      : crypto.randomUUID();

    const notification = NotificationEntity.create({
      id: notificationId,
      instituteId: params.instituteId,
      recipientUserId: params.recipientUserId,
      recipientType: params.recipientType,
      priority: params.priority,
      category: params.category,
      channel: 'in_app',
      title: params.title,
      message: params.message,
      actionUrl: params.actionUrl,
      metadata,
    });

    const saved = await this.notificationRepository.save(notification);
    return toNotificationDTO(saved);
  }
}
