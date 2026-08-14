import * as React from 'react';
import { Button, Input, Card } from '@coaching-os/ui';
import { v1BillingClient } from '../api/v1-billing-client';
import type { InvoiceDTO, PaymentDTO, PaymentMode } from '../types';
import { formatCurrency } from '../utils/formatters';

export interface RecordPaymentModalProps {
  isOpen: boolean;
  invoice: InvoiceDTO | null;
  onClose: () => void;
  onSuccess: (payment: PaymentDTO) => void;
}

export function RecordPaymentModal({ isOpen, invoice, onClose, onSuccess }: RecordPaymentModalProps) {
  const [amount, setAmount] = React.useState(invoice ? String(invoice.outstanding) : '');
  const [paymentMode, setPaymentMode] = React.useState<PaymentMode>('upi');
  const [receivedOn, setReceivedOn] = React.useState(new Date().toISOString().split('T')[0]);
  const [remarks, setRemarks] = React.useState('');

  const [showConfirmation, setShowConfirmation] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (!isOpen || !invoice) return null;

  const paymentNum = parseFloat(amount) || 0;
  const currentOutstanding = invoice.outstanding;
  const remainingBalance = Math.max(0, currentOutstanding - paymentNum);

  const validate = (): boolean => {
    setError(null);
    if (isNaN(paymentNum) || paymentNum <= 0) {
      setError('Payment amount must be greater than 0.');
      return false;
    }
    if (paymentNum > currentOutstanding) {
      setError(
        `Payment amount cannot exceed current outstanding balance of ${formatCurrency(currentOutstanding)}.`
      );
      return false;
    }
    return true;
  };

  const handleProceedClick = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      setShowConfirmation(true);
    }
  };

  const handleConfirmRecord = async () => {
    if (!validate()) return;
    setError(null);

    try {
      setLoading(true);
      const recorded = await v1BillingClient.recordPayment({
        invoiceId: invoice.id,
        amount: paymentNum,
        paymentMode,
        receivedOn,
        remarks: remarks.trim() || undefined,
      });
      setShowConfirmation(false);
      onSuccess(recorded);
      onClose();
    } catch (err: unknown) {
      setShowConfirmation(false);
      const statusCode = (err as Record<string, unknown>)?.statusCode;
      const message = err instanceof Error ? err.message : 'Failed to record payment.';
      if (statusCode === 409 || statusCode === 400) {
        setError(
          'Financial Conflict: The outstanding balance on this invoice has changed or another payment was recorded concurrently. Please review the updated balance before retrying.'
        );
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="record-payment-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="w-full max-w-md rounded-lg bg-background p-6 shadow-xl border border-border">
        <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
          <h2 id="record-payment-title" className="text-lg font-semibold text-foreground">
            Record Payment — {invoice.invoiceNumber}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
            ✕
          </Button>
        </div>

        {error && (
          <div
            data-testid="payment-error-alert"
            className="mb-4 rounded-md bg-rose-50 p-3 text-sm text-rose-800 dark:bg-rose-950 dark:text-rose-200 border border-rose-200"
          >
            {error}
          </div>
        )}

        {!showConfirmation ? (
          <form onSubmit={handleProceedClick} className="space-y-4">
            {/* Financial Summary Box (R-UI-004) */}
            <Card className="bg-muted/40 p-3 border border-border text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Invoice Amount:</span>
                <span className="font-medium text-foreground">{formatCurrency(invoice.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Previously Paid:</span>
                <span className="font-medium text-foreground">{formatCurrency(invoice.paidAmount)}</span>
              </div>
              <div className="flex justify-between font-semibold border-t border-border/60 pt-1.5 text-sm">
                <span className="text-foreground">Current Outstanding:</span>
                <span className="text-rose-600 dark:text-rose-400">{formatCurrency(invoice.outstanding)}</span>
              </div>
            </Card>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Payment Amount (₹) <span className="text-rose-500">*</span>
              </label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                max={currentOutstanding}
                placeholder="e.g. 5000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Payment Mode</label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                >
                  <option value="upi">UPI</option>
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Received Date</label>
                <Input
                  type="date"
                  value={receivedOn}
                  onChange={(e) => setReceivedOn(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Remarks (Optional)</label>
              <Input
                placeholder="e.g. Term 1 fee payment via PhonePe"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </div>

            {/* Dynamic Remaining Balance Preview */}
            <Card className="bg-emerald-50/50 dark:bg-emerald-950/30 p-3 border border-emerald-200 dark:border-emerald-900 text-xs flex justify-between items-center">
              <span className="text-emerald-900 dark:text-emerald-300 font-medium">
                Remaining Balance After Payment:
              </span>
              <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                {formatCurrency(remainingBalance)}
              </span>
            </Card>

            <div className="flex justify-end gap-3 pt-3 border-t border-border">
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                Proceed to Review
              </Button>
            </div>
          </form>
        ) : (
          /* Step 2: Confirmation Alert Modal */
          <div className="space-y-4">
            <div className="rounded-md bg-amber-50 p-4 border border-amber-200 text-amber-900 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-900 text-sm space-y-2">
              <p className="font-semibold text-base">Confirm Payment Transaction</p>
              <p>
                Are you sure you want to record a payment of{' '}
                <strong className="text-amber-950 dark:text-amber-100">{formatCurrency(paymentNum)}</strong> via{' '}
                <strong className="uppercase">{paymentMode}</strong> for Invoice{' '}
                <strong>#{invoice.invoiceNumber}</strong>?
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400 border-t border-amber-200/60 pt-2">
                • Received Date: {receivedOn}
                <br />
                • Remaining Outstanding After Payment: {formatCurrency(remainingBalance)}
                <br />• <strong>Notice:</strong> Payment records are permanent financial transactions and cannot be deleted or modified.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowConfirmation(false)}
                disabled={loading}
              >
                Back to Edit
              </Button>
              <Button
                data-testid="confirm-record-btn"
                onClick={handleConfirmRecord}
                disabled={loading}
              >
                {loading ? 'Recording Payment...' : 'Confirm & Record Payment'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
