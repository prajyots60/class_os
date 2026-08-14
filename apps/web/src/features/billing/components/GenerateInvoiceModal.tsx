import * as React from 'react';
import { Button, Input } from '@coaching-os/ui';
import { v1BillingClient } from '../api/v1-billing-client';
import type { InvoiceDTO } from '../types';

export interface GenerateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (invoice: InvoiceDTO) => void;
}

export function GenerateInvoiceModal({ isOpen, onClose, onSuccess }: GenerateInvoiceModalProps) {
  const [billingPlanId, setBillingPlanId] = React.useState('');
  const [periodIndex, setPeriodIndex] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!billingPlanId.trim()) {
      setError('Billing Plan ID is required.');
      return;
    }

    try {
      setLoading(true);
      const generated = await v1BillingClient.generateInvoice({
        billingPlanId: billingPlanId.trim(),
        billingPeriodIndex: periodIndex ? parseInt(periodIndex, 10) : undefined,
      });
      onSuccess(generated);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to generate invoice.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="generate-invoice-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="w-full max-w-md rounded-lg bg-background p-6 shadow-xl border border-border">
        <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
          <h2 id="generate-invoice-title" className="text-lg font-semibold text-foreground">
            Generate Invoice
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
            ✕
          </Button>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-rose-50 p-3 text-sm text-rose-800 dark:bg-rose-950 dark:text-rose-200 border border-rose-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Billing Plan ID <span className="text-rose-500">*</span>
            </label>
            <Input
              placeholder="e.g. 11111111-1111-1111-1111-111111111111"
              value={billingPlanId}
              onChange={(e) => setBillingPlanId(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Billing Period / Installment Index (Optional)
            </label>
            <Input
              type="number"
              min="0"
              placeholder="e.g. 1"
              value={periodIndex}
              onChange={(e) => setPeriodIndex(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Leave blank to automatically calculate the next billing period.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Generating...' : 'Generate Invoice'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
