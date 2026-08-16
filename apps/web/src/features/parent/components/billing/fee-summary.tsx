'use client';

import * as React from 'react';
import { Card, CardContent } from '@coaching-os/ui';
import { CreditCard, ReceiptText, Calendar, ArrowUpRight } from 'lucide-react';
import type { ParentBillingSummaryDTO } from '../../types/parent-ui.types';

interface FeeSummaryProps {
  summary: ParentBillingSummaryDTO;
}

export function FeeSummary({ summary }: FeeSummaryProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formattedLastPaymentDate = summary.lastPayment?.receivedOn
    ? new Date(summary.lastPayment.receivedOn).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
      {/* Total Outstanding Card */}
      <Card
        className={`border p-3 ${
          summary.totalOutstandingAmount > 0
            ? 'border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-300'
            : 'border-green-500/30 bg-green-500/10 text-green-900 dark:text-green-300'
        }`}
      >
        <CardContent className="p-0 flex flex-col justify-between h-full">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              Outstanding Fees
            </span>
            <CreditCard className="h-4 w-4 text-[hsl(var(--primary))]" aria-hidden="true" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-extrabold tracking-tight">
              {formatCurrency(summary.totalOutstandingAmount)}
            </div>
            <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">
              {summary.totalOutstandingAmount > 0
                ? `${summary.pendingInvoiceCount} pending invoice${summary.pendingInvoiceCount !== 1 ? 's' : ''}`
                : 'All fees fully settled'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Paid Invoices Card */}
      <Card className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3">
        <CardContent className="p-0 flex flex-col justify-between h-full">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              Settled Invoices
            </span>
            <ReceiptText className="h-4 w-4 text-green-600 dark:text-green-400" aria-hidden="true" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-[hsl(var(--foreground))]">
              {summary.paidInvoiceCount}
            </div>
            <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">
              paid invoice{summary.paidInvoiceCount !== 1 ? 's' : ''} on record
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Last Payment Card */}
      <Card className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3">
        <CardContent className="p-0 flex flex-col justify-between h-full">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              Last Payment
            </span>
            <ArrowUpRight className="h-4 w-4 text-[hsl(var(--primary))]" aria-hidden="true" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-[hsl(var(--foreground))]">
              {summary.lastPayment ? formatCurrency(summary.lastPayment.amount) : 'N/A'}
            </div>
            <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5 flex items-center gap-1">
              <Calendar className="h-3 w-3 inline" aria-hidden="true" />
              {formattedLastPaymentDate || 'No payments recorded'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
