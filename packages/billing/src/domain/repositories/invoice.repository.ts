import type { InvoiceEntity } from '../entities/invoice.entity';

export interface InvoiceRepository {
  save(invoice: InvoiceEntity, instituteId: string, tx?: unknown): Promise<void>;
  findById(id: string, instituteId: string, tx?: unknown): Promise<InvoiceEntity | null>;
  findByBillingPlanId(billingPlanId: string, instituteId: string, tx?: unknown): Promise<InvoiceEntity[]>;
}
