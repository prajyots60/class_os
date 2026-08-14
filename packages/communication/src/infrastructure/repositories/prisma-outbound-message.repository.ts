import type { PrismaClient, Prisma } from '@coaching-os/database';
import { ConflictError, NotFoundError } from '@coaching-os/shared';
import { OutboundMessageEntity, type OutboundMessageStatus } from '../../domain/entities/outbound-message.entity';
import type {
  OutboundMessageRepository,
  ClaimPendingMessagesParams,
} from '../../domain/repositories/outbound-message.repository';

export class PrismaOutboundMessageRepository implements OutboundMessageRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async save(message: OutboundMessageEntity): Promise<OutboundMessageEntity> {
    try {
      const data: Prisma.OutboundMessageQueueCreateInput = {
        id: message.id,
        institute: { connect: { id: message.instituteId } },
        notification: message.notificationId ? { connect: { id: message.notificationId } } : undefined,
        recipient: { connect: { id: message.recipientUserId } },
        recipientPhone: message.recipientPhone,
        channel: message.channel,
        templateName: message.templateName,
        templateVariables: message.templateVariables ? (message.templateVariables as Prisma.InputJsonValue) : undefined,
        status: message.status,
        attempts: message.attempts,
        maxAttempts: message.maxAttempts,
        lastError: message.lastError,
        idempotencyKey: message.idempotencyKey,
        availableAt: message.availableAt,
        sentAt: message.sentAt,
        createdAt: message.createdAt,
        updatedAt: message.updatedAt,
      };

      const record = await this.prisma.outboundMessageQueue.upsert({
        where: { id: message.id },
        create: data,
        update: {
          status: message.status,
          attempts: message.attempts,
          lastError: message.lastError,
          availableAt: message.availableAt,
          sentAt: message.sentAt,
          updatedAt: new Date(),
        },
      });

      return this.mapToEntity(record);
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'code' in error) {
        const code = (error as { code: string }).code;
        if (code === 'P2002') {
          throw new ConflictError('Outbound message queue record already exists for this idempotency boundary');
        }
        if (code === 'P2025') {
          throw new NotFoundError('Referenced institute, recipient, or notification record not found');
        }
      }
      throw error;
    }
  }

  public async findById(instituteId: string, id: string): Promise<OutboundMessageEntity | null> {
    const record = await this.prisma.outboundMessageQueue.findFirst({
      where: { id, instituteId },
    });
    return record ? this.mapToEntity(record) : null;
  }

  public async findBySourceIdempotencyKey(
    instituteId: string,
    notificationId: string | null,
    channel: string,
    recipientUserId: string,
  ): Promise<OutboundMessageEntity | null> {
    if (notificationId) {
      const record = await this.prisma.outboundMessageQueue.findUnique({
        where: {
          instituteId_notificationId_channel_recipientUserId: {
            instituteId,
            notificationId,
            channel,
            recipientUserId,
          },
        },
      });
      if (record) return this.mapToEntity(record);
    }

    return null;
  }

  public async claimPendingJobs(params?: ClaimPendingMessagesParams): Promise<OutboundMessageEntity[]> {
    const limit = params?.limit ?? 10;
    const now = new Date();

    const claimed = await (this.prisma as any).$transaction(async (tx: any) => {
      const eligible = await tx.outboundMessageQueue.findMany({
        where: {
          status: 'pending',
          availableAt: { lte: now },
        },
        take: limit,
        orderBy: [{ availableAt: 'asc' }, { createdAt: 'asc' }],
      });

      if (eligible.length === 0) return [];

      const ids = eligible.map((item: any) => item.id);

      await tx.outboundMessageQueue.updateMany({
        where: { id: { in: ids } },
        data: {
          status: 'processing',
          updatedAt: now,
        },
      });

      return eligible.map((item: any) => ({ ...item, status: 'processing', updatedAt: now }));
    });

    return claimed.map((record: any) => this.mapToEntity(record));
  }

  public async updateStatus(
    instituteId: string,
    id: string,
    status: OutboundMessageStatus,
    options?: {
      attempts?: number;
      lastError?: string | null;
      availableAt?: Date;
      sentAt?: Date | null;
    },
  ): Promise<OutboundMessageEntity | null> {
    const updated = await this.prisma.outboundMessageQueue.updateMany({
      where: { id, instituteId },
      data: {
        status,
        attempts: options?.attempts,
        lastError: options?.lastError,
        availableAt: options?.availableAt,
        sentAt: options?.sentAt,
        updatedAt: new Date(),
      },
    });

    if (updated.count === 0) return null;
    return this.findById(instituteId, id);
  }

  private mapToEntity(record: any): OutboundMessageEntity {
    return OutboundMessageEntity.create({
      id: record.id,
      instituteId: record.instituteId,
      notificationId: record.notificationId,
      recipientUserId: record.recipientUserId,
      recipientPhone: record.recipientPhone,
      channel: record.channel as any,
      templateName: record.templateName,
      templateVariables: record.templateVariables ? (record.templateVariables as Record<string, unknown>) : null,
      status: record.status as OutboundMessageStatus,
      attempts: record.attempts,
      maxAttempts: record.maxAttempts,
      lastError: record.lastError,
      idempotencyKey: record.idempotencyKey,
      availableAt: record.availableAt,
      sentAt: record.sentAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
