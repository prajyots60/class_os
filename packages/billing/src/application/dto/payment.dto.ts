import type { PaymentEntity } from '../../domain/entities/payment.entity';
import type { PaymentMode } from '../../domain/enums/payment-mode.enum';

export interface PaymentDTO {
  id: string;
  invoiceId: string;
  amount: number;
  paymentMode: PaymentMode;
  receivedOn: string;
  collectedBy: string | null;
  remarks: string | null;
  createdAt: string;
}

export interface RecordPaymentInput {
  invoiceId: string;
  amount: number;
  paymentMode: PaymentMode;
  receivedOn?: string | Date;
  collectedBy?: string | null;
  remarks?: string | null;
  idempotencyKey?: string | null;
}

export function toPaymentDTO(payment: PaymentEntity): PaymentDTO {
  return {
    id: payment.id,
    invoiceId: payment.invoiceId,
    amount: payment.amount,
    paymentMode: payment.paymentMode,
    receivedOn: payment.receivedOn.toISOString().split('T')[0] || payment.receivedOn.toISOString(),
    collectedBy: payment.collectedBy,
    remarks: payment.remarks,
    createdAt: payment.createdAt.toISOString(),
  };
}
