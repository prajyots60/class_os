import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthorizationError, NotFoundError, ValidationError } from '@coaching-os/shared';
import { PaymentEntity } from '../../domain/entities/payment.entity';
import { ReceiptEntity } from '../../domain/entities/receipt.entity';
import type { PaymentRepository } from '../../domain/repositories/payment.repository';
import type { ReceiptRepository } from '../../domain/repositories/receipt.repository';
import { GenerateReceiptUseCase, GetReceiptUseCase } from './receipt.use-cases';

describe('Receipt Use Cases Unit Suite', () => {
  const instituteId = 'inst-tenant-1';
  const paymentId = 'pay-123';

  let mockPaymentRepo: PaymentRepository;
  let mockReceiptRepo: ReceiptRepository;
  let mockEventBus: { publish: ReturnType<typeof vi.fn> };
  let generateUseCase: GenerateReceiptUseCase;
  let getUseCase: GetReceiptUseCase;

  let existingPayment: PaymentEntity;
  let storedReceipts: Map<string, ReceiptEntity>;

  beforeEach(() => {
    storedReceipts = new Map();

    existingPayment = PaymentEntity.reconstitute({
      id: paymentId,
      invoiceId: 'inv-100',
      amount: 5000,
      paymentMode: 'upi',
      receivedOn: new Date('2026-08-14'),
      collectedBy: 'staff-1',
      remarks: 'Term 1 fee payment',
      createdAt: new Date('2026-08-14T10:00:00Z'),
    });

    mockPaymentRepo = {
      save: vi.fn(),
      findById: vi.fn().mockImplementation(async (id: string, instId: string) => {
        if (id === paymentId && instId === instituteId) {
          return existingPayment;
        }
        return null;
      }),
      findByInvoiceId: vi.fn(),
      findByIdempotencyTuple: vi.fn(),
    };

    let sequenceCounter = 0;

    mockReceiptRepo = {
      save: vi.fn().mockImplementation(async (receipt: ReceiptEntity) => {
        storedReceipts.set(receipt.id, receipt);
      }),
      findById: vi.fn().mockImplementation(async (id: string, instId: string) => {
        const found = storedReceipts.get(id);
        if (found && found.instituteId === instId) {
          return found;
        }
        return null;
      }),
      findByPaymentId: vi.fn().mockImplementation(async (payId: string, instId: string) => {
        for (const r of storedReceipts.values()) {
          if (r.paymentId === payId && r.instituteId === instId) {
            return r;
          }
        }
        return null;
      }),
      allocateNextReceiptNumber: vi.fn().mockImplementation(async (_instId: string, year: number) => {
        sequenceCounter++;
        const seqPadded = String(sequenceCounter).padStart(5, '0');
        return `REC-${year}-${seqPadded}`;
      }),
    };

    mockEventBus = {
      publish: vi.fn().mockResolvedValue(undefined),
    };

    generateUseCase = new GenerateReceiptUseCase(
      mockPaymentRepo,
      mockReceiptRepo,
      undefined,
      mockEventBus as any
    );

    getUseCase = new GetReceiptUseCase(mockReceiptRepo);
  });

  describe('GenerateReceiptUseCase', () => {
    it('should successfully generate a Receipt for a valid Payment and emit event', async () => {
      const dto = await generateUseCase.execute(
        instituteId,
        { paymentId },
        { capabilities: ['receipt:issue'] }
      );

      expect(dto.id).toBeDefined();
      expect(dto.instituteId).toBe(instituteId);
      expect(dto.paymentId).toBe(paymentId);
      expect(dto.receiptNumber).toBe('REC-2026-00001');

      expect(mockReceiptRepo.save).toHaveBeenCalledTimes(1);
      expect(mockEventBus.publish).toHaveBeenCalledWith('billing.receipt.generated', {
        receiptId: dto.id,
        instituteId,
        paymentId,
        receiptNumber: 'REC-2026-00001',
        amount: 5000,
        paymentMode: 'upi',
        generatedAt: dto.generatedAt,
      });
    });

    it('should enforce R-019 idempotency: retry for same Payment returns existing Receipt without new number allocation', async () => {
      const firstDto = await generateUseCase.execute(
        instituteId,
        { paymentId },
        { capabilities: ['receipt:issue'] }
      );

      // Second execution for exact same payment
      const secondDto = await generateUseCase.execute(
        instituteId,
        { paymentId },
        { capabilities: ['receipt:issue'] }
      );

      expect(secondDto.id).toBe(firstDto.id);
      expect(secondDto.receiptNumber).toBe(firstDto.receiptNumber);
      expect(mockReceiptRepo.allocateNextReceiptNumber).toHaveBeenCalledTimes(1);
      // Event published only on initial creation
      expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundError if target Payment does not exist', async () => {
      await expect(
        generateUseCase.execute(
          instituteId,
          { paymentId: 'non-existent-pay' },
          { capabilities: ['receipt:issue'] }
        )
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError if Payment belongs to another tenant', async () => {
      await expect(
        generateUseCase.execute(
          'foreign-inst-999',
          { paymentId },
          { capabilities: ['receipt:issue'] }
        )
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw AuthorizationError if missing required capability', async () => {
      await expect(
        generateUseCase.execute(
          instituteId,
          { paymentId },
          { capabilities: ['read:only'] }
        )
      ).rejects.toThrow(AuthorizationError);
    });

    it('should throw ValidationError if instituteId or paymentId are missing', async () => {
      await expect(
        generateUseCase.execute('', { paymentId }, { capabilities: ['receipt:issue'] })
      ).rejects.toThrow(ValidationError);

      await expect(
        generateUseCase.execute(instituteId, { paymentId: '' }, { capabilities: ['receipt:issue'] })
      ).rejects.toThrow(ValidationError);
    });

    it('should NOT mutate Payment entity state during receipt generation', async () => {
      const originalAmount = existingPayment.amount;
      const originalPaymentMode = existingPayment.paymentMode;

      await generateUseCase.execute(
        instituteId,
        { paymentId },
        { capabilities: ['receipt:issue'] }
      );

      expect(existingPayment.amount).toBe(originalAmount);
      expect(existingPayment.paymentMode).toBe(originalPaymentMode);
    });
  });

  describe('GetReceiptUseCase', () => {
    it('should successfully retrieve a Receipt by ID within tenant context', async () => {
      const createdDto = await generateUseCase.execute(
        instituteId,
        { paymentId },
        { capabilities: ['receipt:issue'] }
      );

      const fetchedDto = await getUseCase.execute(
        createdDto.id,
        instituteId,
        { capabilities: ['receipt:read'] }
      );

      expect(fetchedDto.id).toBe(createdDto.id);
      expect(fetchedDto.receiptNumber).toBe('REC-2026-00001');
    });

    it('should return NotFoundError when attempting cross-tenant receipt lookup', async () => {
      const createdDto = await generateUseCase.execute(
        instituteId,
        { paymentId },
        { capabilities: ['receipt:issue'] }
      );

      await expect(
        getUseCase.execute(
          createdDto.id,
          'other-foreign-inst',
          { capabilities: ['receipt:read'] }
        )
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw AuthorizationError if missing receipt:read capability', async () => {
      await expect(
        getUseCase.execute('rcpt-123', instituteId, { capabilities: ['invalid:cap'] })
      ).rejects.toThrow(AuthorizationError);
    });
  });
});
