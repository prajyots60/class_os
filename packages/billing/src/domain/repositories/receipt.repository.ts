import type { ReceiptEntity } from '../entities/receipt.entity';

export interface ReceiptRepository {
  /**
   * Persists a Receipt record inside tenant context.
   * Supports optional Prisma transaction client `tx`.
   */
  save(receipt: ReceiptEntity, instituteId: string, tx?: unknown): Promise<void>;

  /**
   * Retrieves a Receipt record by ID within tenant context.
   * Returns null if not found or belongs to another tenant.
   */
  findById(id: string, instituteId: string, tx?: unknown): Promise<ReceiptEntity | null>;

  /**
   * Retrieves a Receipt record by Payment ID within tenant context.
   * Returns null if not found or belongs to another tenant.
   */
  findByPaymentId(paymentId: string, instituteId: string, tx?: unknown): Promise<ReceiptEntity | null>;

  /**
   * Safely allocates the next institute-scoped sequential receipt number (REC-{YYYY}-{SEQ:5}).
   * Executes sequence count / locking within tenant context and transaction client `tx`.
   */
  allocateNextReceiptNumber(instituteId: string, year: number, tx?: unknown): Promise<string>;

  // NOTE: Physical deletion (delete()) is strictly PROHIBITED per financial audit requirements.
}
