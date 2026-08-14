export type InvoiceStatus = 'pending' | 'partial' | 'paid';

export function isValidInvoiceStatus(status: unknown): status is InvoiceStatus {
  return status === 'pending' || status === 'partial' || status === 'paid';
}
