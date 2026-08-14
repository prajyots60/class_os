import { logger } from '@coaching-os/observability';
import type { OutboundMessageRepository } from '../../domain/repositories/outbound-message.repository';
import type { WhatsAppProvider } from '../providers/whatsapp.provider';
import { maskPhoneNumber } from '../../domain/entities/outbound-message.entity';

export interface BatchProcessingResult {
  claimed: number;
  sent: number;
  failed: number;
  retried: number;
  skipped: number;
}

export class OutboundMessageWorker {
  constructor(
    private readonly repository: OutboundMessageRepository,
    private readonly provider: WhatsAppProvider,
  ) {}

  public async processNextBatch(batchSize = 10): Promise<BatchProcessingResult> {
    const result: BatchProcessingResult = {
      claimed: 0,
      sent: 0,
      failed: 0,
      retried: 0,
      skipped: 0,
    };

    if (!this.provider.isConfigured()) {
      logger.warn('communication.outbound.skipped', {
        reason: 'WhatsApp provider is unconfigured in server environment',
      });
      return result;
    }

    const claimedJobs = await this.repository.claimPendingJobs({ limit: batchSize });
    result.claimed = claimedJobs.length;

    if (claimedJobs.length === 0) {
      return result;
    }

    logger.info('communication.outbound.claimed', {
      jobCount: claimedJobs.length,
    });

    for (const job of claimedJobs) {
      try {
        const maskedPhone = maskPhoneNumber(job.recipientPhone);

        logger.info('communication.outbound.attempt', {
          jobId: job.id,
          instituteId: job.instituteId,
          recipientUserId: job.recipientUserId,
          maskedPhone,
          templateName: job.templateName,
          attempt: job.attempts + 1,
        });

        const deliveryResult = await this.provider.send({
          recipientPhone: job.recipientPhone,
          templateName: job.templateName,
          templateVariables: job.templateVariables,
        });

        if (deliveryResult.success) {
          await this.repository.updateStatus(job.instituteId, job.id, 'sent', {
            attempts: job.attempts + 1,
            sentAt: new Date(),
            lastError: null,
          });

          result.sent += 1;
          logger.info('communication.outbound.sent', {
            jobId: job.id,
            instituteId: job.instituteId,
            recipientUserId: job.recipientUserId,
            maskedPhone,
            providerMessageId: deliveryResult.providerMessageId,
          });
        } else {
          const nextAttempt = job.attempts + 1;
          const isRetryable = deliveryResult.isRetryable && nextAttempt < job.maxAttempts;
          const retryDelayMs = Math.pow(3, nextAttempt) * 1000; // 3s, 9s, 27s
          const newStatus = isRetryable ? 'pending' : 'failed';

          await this.repository.updateStatus(job.instituteId, job.id, newStatus, {
            attempts: nextAttempt,
            lastError: deliveryResult.error,
            availableAt: isRetryable ? new Date(Date.now() + retryDelayMs) : undefined,
          });

          if (isRetryable) {
            result.retried += 1;
            logger.warn('communication.outbound.retry', {
              jobId: job.id,
              instituteId: job.instituteId,
              attempt: nextAttempt,
              error: deliveryResult.error,
              retryDelayMs,
            });
          } else {
            result.failed += 1;
            logger.error('communication.outbound.failed', {
              jobId: job.id,
              instituteId: job.instituteId,
              attempt: nextAttempt,
              error: deliveryResult.error,
            });
          }
        }
      } catch (err: any) {
        result.failed += 1;
        logger.error('communication.outbound.worker_error', {
          jobId: job.id,
          instituteId: job.instituteId,
          error: err?.message,
        });
      }
    }

    return result;
  }
}
