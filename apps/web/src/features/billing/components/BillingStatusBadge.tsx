import * as React from 'react';
import { Badge } from '@coaching-os/ui';
import type { FeeType, InvoiceStatus, PaymentMode } from '../types';

export interface InvoiceStatusBadgeProps {
  status: InvoiceStatus;
  isOverdue?: boolean;
}

export function InvoiceStatusBadge({ status, isOverdue }: InvoiceStatusBadgeProps) {
  let variantLabel = 'Pending';
  let badgeClass = 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-200';

  if (status === 'partial') {
    variantLabel = 'Partially Paid';
    badgeClass = 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300';
  } else if (status === 'paid') {
    variantLabel = 'Paid';
    badgeClass = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300';
  }

  return (
    <div className="inline-flex items-center gap-1.5">
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${badgeClass}`}>
        {variantLabel}
      </span>
      {isOverdue && status !== 'paid' && (
        <span
          data-testid="overdue-badge"
          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300"
        >
          Overdue
        </span>
      )}
    </div>
  );
}

export function PaymentModeBadge({ mode }: { mode: PaymentMode }) {
  let label = 'Cash';
  if (mode === 'upi') label = 'UPI';
  if (mode === 'bank_transfer') label = 'Bank Transfer';

  return (
    <Badge variant="outline" className="text-xs font-medium uppercase tracking-wide">
      {label}
    </Badge>
  );
}

export function FeeTypeBadge({ type }: { type: FeeType }) {
  let label = 'Monthly';
  if (type === 'one_time') label = 'One Time';
  if (type === 'installment') label = 'Installment';

  return (
    <Badge variant="secondary" className="text-xs capitalize">
      {label}
    </Badge>
  );
}
