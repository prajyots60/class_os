import type { PaymentEntity } from '../entities/payment.entity';
import type { PaymentMode } from '../enums/payment-mode.enum';

export interface PaymentRepository {
  /**
   * Persists a Payment record inside tenant context.
   * Supports optional Prisma transaction client `tx`.
   */
  save(payment: PaymentEntity, instituteId: string, tx?: unknown): Promise<void>;

  /**
   * Retrieves a Payment record by ID within tenant context.
   * Returns null if not found or belongs to another tenant.
   */
  findById(id: string, instituteId: string, tx?: unknown): Promise<PaymentEntity | null>;

  /**
   * Retrieves all Payment records for a specific invoice within tenant context.
   * Returns empty array if invoice not found or belongs to another tenant.
   */
  findByInvoiceId(invoiceId: string, instituteId: string, tx?: unknown): Promise<PaymentEntity[]>;

  /**
   * Application-level idempotency lookup by (invoiceId, amount, paymentMode, receivedOn) within tenant context.
   */
  findByIdempotencyTuple(
    invoiceId: string,
    amount: number,
    paymentMode: PaymentMode,
    receivedOn: Date,
    instituteId: string,
    tx?: unknown
  ): Promise<PaymentEntity | null>;
}
