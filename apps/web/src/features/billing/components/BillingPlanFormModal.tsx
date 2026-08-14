import * as React from 'react';
import { Button, Input, Card } from '@coaching-os/ui';
import { v1BillingClient } from '../api/v1-billing-client';
import type { BillingPlanDTO, DiscountType, FeeType } from '../types';
import { formatCurrency } from '../utils/formatters';

export interface BillingPlanFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (plan: BillingPlanDTO) => void;
}

export function BillingPlanFormModal({ isOpen, onClose, onSuccess }: BillingPlanFormModalProps) {
  const [enrollmentId, setEnrollmentId] = React.useState('');
  const [feeType, setFeeType] = React.useState<FeeType>('monthly');
  const [totalAmount, setTotalAmount] = React.useState('');
  const [billingStartDate, setBillingStartDate] = React.useState(
    new Date().toISOString().split('T')[0]
  );
  const [installmentCount, setInstallmentCount] = React.useState('3');
  const [discountType, setDiscountType] = React.useState<DiscountType>('none');
  const [discountValue, setDiscountValue] = React.useState('');
  const [firstInvoiceOverride, setFirstInvoiceOverride] = React.useState('');

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (!isOpen) return null;

  const totalNum = parseFloat(totalAmount) || 0;
  const instCountNum = parseInt(installmentCount, 10) || 1;
  const overrideNum = parseFloat(firstInvoiceOverride) || 0;

  // Calculation preview
  let calculatedAmountPerInstallment = 0;
  if (feeType === 'installment' && instCountNum > 1 && totalNum > 0) {
    if (overrideNum > 0 && overrideNum < totalNum) {
      calculatedAmountPerInstallment = (totalNum - overrideNum) / (instCountNum - 1);
    } else {
      calculatedAmountPerInstallment = totalNum / instCountNum;
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!enrollmentId.trim()) {
      setError('Enrollment ID is required.');
      return;
    }
    if (isNaN(totalNum) || totalNum <= 0) {
      setError('Total Amount must be greater than 0.');
      return;
    }

    try {
      setLoading(true);
      const created = await v1BillingClient.createBillingPlan({
        enrollmentId: enrollmentId.trim(),
        feeType,
        totalAmount: totalNum,
        billingStartDate,
        installmentCount: feeType === 'installment' ? instCountNum : undefined,
        discountType: discountType !== 'none' ? discountType : undefined,
        discountValue: discountType !== 'none' ? parseFloat(discountValue) || 0 : undefined,
        firstInvoiceAmountOverride: overrideNum > 0 ? overrideNum : undefined,
      });
      onSuccess(created);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create billing plan.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="billing-plan-form-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="w-full max-w-lg rounded-lg bg-background p-6 shadow-xl border border-border max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
          <h2 id="billing-plan-form-title" className="text-lg font-semibold text-foreground">
            Create Billing Plan
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
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Enrollment ID <span className="text-rose-500">*</span>
            </label>
            <Input
              placeholder="e.g. 11111111-1111-1111-1111-111111111111"
              value={enrollmentId}
              onChange={(e) => setEnrollmentId(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Fee Type</label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                value={feeType}
                onChange={(e) => setFeeType(e.target.value as FeeType)}
              >
                <option value="monthly">Monthly</option>
                <option value="one_time">One Time</option>
                <option value="installment">Installment</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Total Amount (₹) <span className="text-rose-500">*</span>
              </label>
              <Input
                type="number"
                min="1"
                step="0.01"
                placeholder="e.g. 12000"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Discount Type</label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as DiscountType)}
              >
                <option value="none">None</option>
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount (₹)</option>
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Start Date</label>
              <Input
                type="date"
                value={billingStartDate}
                onChange={(e) => setBillingStartDate(e.target.value)}
                required
              />
            </div>
            {feeType === 'installment' && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Installment Count
                </label>
                <Input
                  type="number"
                  min="2"
                  max="36"
                  value={installmentCount}
                  onChange={(e) => setInstallmentCount(e.target.value)}
                  required
                />
              </div>
            )}
          </div>

          {feeType === 'installment' && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                First Invoice Override (Optional ₹)
              </label>
              <Input
                type="number"
                min="0"
                placeholder="e.g. 5000"
                value={firstInvoiceOverride}
                onChange={(e) => setFirstInvoiceOverride(e.target.value)}
              />
            </div>
          )}

          {/* Dynamic Installment Calculation Preview */}
          {feeType === 'installment' && totalNum > 0 && (
            <Card className="bg-muted/40 p-3 border border-border text-xs space-y-1">
              <p className="font-semibold text-foreground">Installment Schedule Preview:</p>
              {overrideNum > 0 ? (
                <>
                  <p>• Invoice #1: {formatCurrency(overrideNum)}</p>
                  <p>
                    • Invoices #2–#{instCountNum}: {instCountNum - 1} ×{' '}
                    {formatCurrency(calculatedAmountPerInstallment)}
                  </p>
                </>
              ) : (
                <p>
                  • {instCountNum} Installments of {formatCurrency(calculatedAmountPerInstallment)}
                </p>
              )}
            </Card>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Billing Plan'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
