import type { OutboundMessageEntity, OutboundMessageStatus } from '../entities/outbound-message.entity';

export interface ClaimPendingMessagesParams {
  limit?: number;
}

export interface OutboundMessageRepository {
  save(message: OutboundMessageEntity): Promise<OutboundMessageEntity>;

  findById(instituteId: string, id: string): Promise<OutboundMessageEntity | null>;

  findBySourceIdempotencyKey(
    instituteId: string,
    notificationId: string | null,
    channel: string,
    recipientUserId: string,
  ): Promise<OutboundMessageEntity | null>;

  claimPendingJobs(params?: ClaimPendingMessagesParams): Promise<OutboundMessageEntity[]>;

  updateStatus(
    instituteId: string,
    id: string,
    status: OutboundMessageStatus,
    options?: {
      attempts?: number;
      lastError?: string | null;
      availableAt?: Date;
      sentAt?: Date | null;
    },
  ): Promise<OutboundMessageEntity | null>;
}
