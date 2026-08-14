import type { ReceiptEntity } from '../../domain/entities/receipt.entity';

export interface ReceiptDTO {
  id: string;
  instituteId: string;
  paymentId: string;
  receiptNumber: string;
  generatedAt: string;
}

export interface GenerateReceiptInput {
  paymentId: string;
}

export function toReceiptDTO(entity: ReceiptEntity): ReceiptDTO {
  return {
    id: entity.id,
    instituteId: entity.instituteId,
    paymentId: entity.paymentId,
    receiptNumber: entity.receiptNumber,
    generatedAt: entity.generatedAt.toISOString(),
  };
}
