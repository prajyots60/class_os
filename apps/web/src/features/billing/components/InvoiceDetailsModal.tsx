import * as React from 'react';
import { Button, Card } from '@coaching-os/ui';
import { InvoiceStatusBadge, PaymentModeBadge } from './BillingStatusBadge';
import type { InvoiceDTO, PaymentDTO } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';

export interface InvoiceDetailsModalProps {
  isOpen: boolean;
  invoice: InvoiceDTO | null;
  payments?: PaymentDTO[];
  canRecordPayment?: boolean;
  onClose: () => void;
  onRecordPayment?: (invoice: InvoiceDTO) => void;
}

export function InvoiceDetailsModal({
  isOpen,
  invoice,
  payments = [],
  canRecordPayment = true,
  onClose,
  onRecordPayment,
}: InvoiceDetailsModalProps) {
  if (!isOpen || !invoice) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="invoice-details-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="w-full max-w-2xl rounded-lg bg-background p-6 shadow-xl border border-border max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
          <div>
            <h2 id="invoice-details-title" className="text-xl font-bold text-foreground">
              Invoice #{invoice.invoiceNumber}
            </h2>
            {invoice.studentName && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Student: {invoice.studentName} {invoice.batchName ? `• ${invoice.batchName}` : ''}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <InvoiceStatusBadge status={invoice.status} isOverdue={invoice.isOverdue} />
            <Button variant="ghost" size="sm" onClick={onClose}>
              ✕
            </Button>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card className="p-3 bg-muted/30 border border-border text-center">
            <span className="text-xs text-muted-foreground block">Invoice Amount</span>
            <span className="text-lg font-bold text-foreground">
              {formatCurrency(invoice.amount)}
            </span>
          </Card>
          <Card className="p-3 bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 text-center">
            <span className="text-xs text-emerald-800 dark:text-emerald-300 block">Total Paid</span>
            <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
              {formatCurrency(invoice.paidAmount)}
            </span>
          </Card>
          <Card className="p-3 bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 text-center">
            <span className="text-xs text-rose-800 dark:text-rose-300 block">Outstanding</span>
            <span className="text-lg font-bold text-rose-700 dark:text-rose-400">
              {formatCurrency(invoice.outstanding)}
            </span>
          </Card>
        </div>

        <div className="space-y-2 text-sm mb-6 text-muted-foreground border-t border-b border-border py-3">
          <div className="flex justify-between">
            <span>Due Date:</span>
            <span className="font-medium text-foreground">{formatDate(invoice.dueDate)}</span>
          </div>
          <div className="flex justify-between">
            <span>Billing Plan ID:</span>
            <span className="font-mono text-xs text-foreground">{invoice.billingPlanId}</span>
          </div>
          {invoice.enrollmentId && (
            <div className="flex justify-between">
              <span>Enrollment ID:</span>
              <span className="font-mono text-xs text-foreground">{invoice.enrollmentId}</span>
            </div>
          )}
        </div>

        {/* Recorded Payments List */}
        <div className="space-y-3 mb-6">
          <h3 className="text-sm font-semibold text-foreground">Payment History</h3>
          {payments.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No payments recorded against this invoice yet.</p>
          ) : (
            <div className="border border-border rounded-md divide-y divide-border text-xs">
              {payments.map((p) => (
                <div key={p.id} className="p-3 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground">{formatCurrency(p.amount)}</span>
                      <PaymentModeBadge mode={p.paymentMode} />
                    </div>
                    <p className="text-muted-foreground mt-0.5">
                      Received: {formatDate(p.receivedOn)} • By: {p.collectedBy}
                    </p>
                    {p.remarks && <p className="text-muted-foreground italic mt-0.5">&quot;{p.remarks}&quot;</p>}
                  </div>
                  {p.receiptNumber && (
                    <span className="font-mono text-xs bg-muted px-2 py-1 rounded text-foreground">
                      {p.receiptNumber}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-between items-center pt-2">
          <p className="text-xs text-muted-foreground italic">
            * Invoices and payments are historical financial records and cannot be edited.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
            {invoice.outstanding > 0 && canRecordPayment && onRecordPayment && (
              <Button
                size="sm"
                data-testid="invoice-record-payment-btn"
                onClick={() => {
                  onClose();
                  onRecordPayment(invoice);
                }}
              >
                Record Payment
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
