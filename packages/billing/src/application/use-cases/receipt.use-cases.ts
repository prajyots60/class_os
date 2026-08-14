import type { PrismaClient } from '@coaching-os/database';
import { logger } from '@coaching-os/observability';
import { AuthorizationError, NotFoundError, ValidationError } from '@coaching-os/shared';
import { ReceiptEntity } from '../../domain/entities/receipt.entity';
import type { PaymentRepository } from '../../domain/repositories/payment.repository';
import type { ReceiptRepository } from '../../domain/repositories/receipt.repository';
import type { GenerateReceiptInput, ReceiptDTO } from '../dto/receipt.dto';
import { toReceiptDTO } from '../dto/receipt.dto';
import type { EventBus } from './invoice.use-cases';

const moduleLogger = logger.child({ module: 'billing' });

export interface ReceiptGeneratedEventPayload {
  receiptId: string;
  instituteId: string;
  paymentId: string;
  receiptNumber: string;
  amount: number;
  paymentMode: string;
  generatedAt: string;
}

export class GenerateReceiptUseCase {
  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly receiptRepository: ReceiptRepository,
    private readonly prisma?: PrismaClient,
    private readonly eventBus?: EventBus
  ) {}

  public async execute(
    instituteId: string,
    input: GenerateReceiptInput,
    userContext?: { userId?: string; capabilities?: string[] }
  ): Promise<ReceiptDTO> {
    // 1. Validate inputs
    if (!instituteId?.trim()) {
      throw new ValidationError('Institute ID is required');
    }
    if (!input.paymentId?.trim()) {
      throw new ValidationError('Payment ID is required');
    }

    const cleanInstituteId = instituteId.trim();
    const cleanPaymentId = input.paymentId.trim();

    // 2. Capability Authorization Check (receipt:issue or billing:write)
    if (userContext?.capabilities) {
      const hasCap =
        userContext.capabilities.includes('receipt:issue') ||
        userContext.capabilities.includes('billing:write');
      if (!hasCap) {
        throw new AuthorizationError('Permission denied: receipt:issue capability required');
      }
    }

    // 3. Application-Level Idempotency Pre-Check (R-019)
    const existingReceipt = await this.receiptRepository.findByPaymentId(
      cleanPaymentId,
      cleanInstituteId
    );
    if (existingReceipt) {
      moduleLogger.info('Returning existing receipt for payment (Idempotency R-019)', {
        receiptId: existingReceipt.id,
        paymentId: cleanPaymentId,
        instituteId: cleanInstituteId,
      });
      return toReceiptDTO(existingReceipt);
    }

    // 4. Verify Target Payment Exists & Belongs to Tenant
    const payment = await this.paymentRepository.findById(cleanPaymentId, cleanInstituteId);
    if (!payment) {
      throw new NotFoundError(
        `Payment with ID ${cleanPaymentId} not found in this institute`
      );
    }

    // 5. Transactional Receipt Creation & Number Allocation
    let receipt: ReceiptEntity;
    let isNewReceipt = false;

    const executeTransaction = async (txClient?: unknown) => {
      // Re-check idempotency within transaction boundary
      const txExisting = await this.receiptRepository.findByPaymentId(
        cleanPaymentId,
        cleanInstituteId,
        txClient
      );
      if (txExisting) {
        receipt = txExisting;
        return;
      }

      // Allocate Institute-Scoped Receipt Number (REC-YYYY-SEQ:5)
      const currentYear = new Date().getUTCFullYear();
      const receiptNumber = await this.receiptRepository.allocateNextReceiptNumber(
        cleanInstituteId,
        currentYear,
        txClient
      );

      // Construct Receipt Domain Entity
      receipt = ReceiptEntity.create({
        instituteId: cleanInstituteId,
        paymentId: cleanPaymentId,
        receiptNumber,
      });

      // Persist Receipt
      await this.receiptRepository.save(receipt, cleanInstituteId, txClient);
      isNewReceipt = true;
    };

    if (this.prisma?.$transaction) {
      await this.prisma.$transaction(async (tx) => {
        await executeTransaction(tx);
      });
    } else {
      await executeTransaction();
    }

    // 6. Post-Commit Domain Event Emission (R-022)
    if (isNewReceipt && this.eventBus) {
      const eventPayload: ReceiptGeneratedEventPayload = {
        receiptId: receipt!.id,
        instituteId: cleanInstituteId,
        paymentId: cleanPaymentId,
        receiptNumber: receipt!.receiptNumber,
        amount: payment.amount,
        paymentMode: payment.paymentMode,
        generatedAt: receipt!.generatedAt.toISOString(),
      };

      try {
        await this.eventBus.publish('billing.receipt.generated', eventPayload);
      } catch (err: any) {
        moduleLogger.warn('Failed to publish billing.receipt.generated event post-commit', {
          error: err?.message,
          receiptId: receipt!.id,
        });
      }
    }

    return toReceiptDTO(receipt!);
  }
}

export class GetReceiptUseCase {
  constructor(private readonly receiptRepository: ReceiptRepository) {}

  public async execute(
    receiptId: string,
    instituteId: string,
    userContext?: { userId?: string; capabilities?: string[] }
  ): Promise<ReceiptDTO> {
    if (!receiptId?.trim()) {
      throw new ValidationError('Receipt ID is required');
    }
    if (!instituteId?.trim()) {
      throw new ValidationError('Institute ID is required');
    }

    const cleanReceiptId = receiptId.trim();
    const cleanInstituteId = instituteId.trim();

    // Capability Authorization Check (receipt:read or billing:read)
    if (userContext?.capabilities) {
      const hasCap =
        userContext.capabilities.includes('receipt:read') ||
        userContext.capabilities.includes('billing:read');
      if (!hasCap) {
        throw new AuthorizationError('Permission denied: receipt:read capability required');
      }
    }

    const receipt = await this.receiptRepository.findById(cleanReceiptId, cleanInstituteId);
    if (!receipt) {
      throw new NotFoundError(
        `Receipt with ID ${cleanReceiptId} not found in this institute`
      );
    }

    return toReceiptDTO(receipt);
  }
}
