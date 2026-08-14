import * as React from 'react';
import { Button, Input } from '@coaching-os/ui';
import { v1BillingClient } from '../api/v1-billing-client';
import type { BillingPlanDTO, DiscountType } from '../types';

export interface BillingPlanUpdateModalProps {
  isOpen: boolean;
  plan: BillingPlanDTO | null;
  onClose: () => void;
  onSuccess: (updated: BillingPlanDTO) => void;
}

export function BillingPlanUpdateModal({ isOpen, plan, onClose, onSuccess }: BillingPlanUpdateModalProps) {
  const [discountType, setDiscountType] = React.useState<DiscountType>(plan?.discountType || 'none');
  const [discountValue, setDiscountValue] = React.useState(
    plan?.discountValue !== undefined && plan?.discountValue !== null ? String(plan.discountValue) : ''
  );
  const [firstInvoiceOverride, setFirstInvoiceOverride] = React.useState(
    plan?.firstInvoiceAmountOverride !== undefined && plan?.firstInvoiceAmountOverride !== null
      ? String(plan.firstInvoiceAmountOverride)
      : ''
  );
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (!isOpen || !plan) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      setLoading(true);
      const updated = await v1BillingClient.updateBillingPlan(plan.id, {
        discountType: discountType !== 'none' ? discountType : null,
        discountValue: discountType !== 'none' ? parseFloat(discountValue) || 0 : null,
        firstInvoiceAmountOverride: firstInvoiceOverride ? parseFloat(firstInvoiceOverride) || 0 : null,
      });
      onSuccess(updated);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update billing plan.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="update-plan-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="w-full max-w-md rounded-lg bg-background p-6 shadow-xl border border-border">
        <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
          <h2 id="update-plan-title" className="text-lg font-semibold text-foreground">
            Update Billing Plan Rules
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground border border-border">
            <p className="font-semibold text-foreground">Plan Rule Safety Notice:</p>
            <p>
              Updating plan discount or installment overrides applies to future invoice generation. Historical generated invoices remain completely unchanged.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Discount Type</label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as DiscountType)}
              >
                <option value="none">None</option>
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed (₹)</option>
              </select>
            </div>
            {discountType !== 'none' && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Discount Value</label>
                <Input
                  type="number"
                  min="0"
                  placeholder="e.g. 10"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              First Invoice Amount Override (₹)
            </label>
            <Input
              type="number"
              min="0"
              placeholder="e.g. 5000"
              value={firstInvoiceOverride}
              onChange={(e) => setFirstInvoiceOverride(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Update Plan Rules'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
