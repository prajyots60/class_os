import type { InvoiceEntity } from '../../domain/entities/invoice.entity';
import type { InvoiceStatus } from '../../domain/enums/invoice-status.enum';

export interface InvoiceDTO {
  id: string;
  billingPlanId: string;
  amount: number;
  dueDate: string;
  status: InvoiceStatus;
  createdAt: string;
  updatedAt: string;
}

export interface GenerateInvoiceInput {
  billingPlanId: string;
  periodYearMonth?: string;
  installmentNumber?: number;
  totalInstallments?: number;
}

export function toInvoiceDTO(entity: InvoiceEntity): InvoiceDTO {
  return {
    id: entity.id,
    billingPlanId: entity.billingPlanId,
    amount: entity.amount,
    dueDate: entity.dueDate.toISOString().split('T')[0] || entity.dueDate.toISOString(),
    status: entity.status,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
}
