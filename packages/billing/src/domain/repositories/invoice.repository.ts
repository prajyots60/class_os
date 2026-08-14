import type { InvoiceEntity } from '../entities/invoice.entity';

export interface InvoiceRepository {
  save(invoice: InvoiceEntity, instituteId: string): Promise<void>;
  findById(id: string, instituteId: string): Promise<InvoiceEntity | null>;
  findByBillingPlanId(billingPlanId: string, instituteId: string): Promise<InvoiceEntity[]>;
}
