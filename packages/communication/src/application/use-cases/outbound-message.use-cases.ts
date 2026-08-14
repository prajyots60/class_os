import { logger } from '@coaching-os/observability';
import crypto from 'node:crypto';
import {
  OutboundMessageEntity,
  type OutboundMessageDTO,
  type OutboundChannel,
} from '../../domain/entities/outbound-message.entity';
import type { OutboundMessageRepository } from '../../domain/repositories/outbound-message.repository';

export interface EnqueueOutboundMessageCommand {
  instituteId: string;
  notificationId?: string | null;
  recipientUserId: string;
  recipientPhone: string;
  channel?: OutboundChannel;
  templateName: string;
  templateVariables?: Record<string, unknown> | null;
}

export class EnqueueOutboundMessageUseCase {
  constructor(private readonly repository: OutboundMessageRepository) {}

  public async execute(command: EnqueueOutboundMessageCommand): Promise<OutboundMessageDTO> {
    const channel = command.channel ?? 'whatsapp';

    // Idempotency check: prevent enqueuing identical message twice
    if (command.notificationId) {
      const existing = await this.repository.findBySourceIdempotencyKey(
        command.instituteId,
        command.notificationId,
        channel,
        command.recipientUserId,
      );
      if (existing) {
        return existing.toDTO();
      }
    }

    const messageId = crypto.randomUUID();

    const entity = OutboundMessageEntity.create({
      id: messageId,
      instituteId: command.instituteId,
      notificationId: command.notificationId,
      recipientUserId: command.recipientUserId,
      recipientPhone: command.recipientPhone,
      channel,
      templateName: command.templateName,
      templateVariables: command.templateVariables,
      status: 'pending',
    });

    const saved = await this.repository.save(entity);

    logger.info('communication.outbound.queued', {
      jobId: saved.id,
      instituteId: saved.instituteId,
      notificationId: saved.notificationId,
      recipientUserId: saved.recipientUserId,
      channel: saved.channel,
      templateName: saved.templateName,
    });

    return saved.toDTO();
  }
}
