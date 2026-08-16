'use client';

import * as React from 'react';
import { Card, CardContent, Badge } from '@coaching-os/ui';
import { Calendar, CreditCard, ArrowUpRight, ReceiptText } from 'lucide-react';
import type { ParentPaymentItemDTO } from '../../types/parent-ui.types';

interface PaymentListProps {
  payments: ParentPaymentItemDTO[];
}

export function PaymentList({ payments }: PaymentListProps) {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const getModeLabel = (mode: string) => {
    switch (mode.toLowerCase()) {
      case 'upi':
        return 'UPI';
      case 'bank_transfer':
        return 'Bank Transfer';
      case 'cash':
        return 'Cash';
      default:
        return mode.toUpperCase();
    }
  };

  if (payments.length === 0) {
    return (
      <Card className="border border-dashed border-[hsl(var(--border))] text-center p-6 sm:p-8">
        <CardContent className="space-y-2 pt-2">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(var(--muted)/0.4)] text-[hsl(var(--muted-foreground))]">
            <ArrowUpRight className="h-5 w-5" aria-hidden="true" />
          </div>
          <h4 className="text-sm font-semibold text-[hsl(var(--foreground))]">
            No Payments Recorded Yet
          </h4>
          <p className="text-xs text-[hsl(var(--muted-foreground))] max-w-sm mx-auto">
            Payment records will appear here as soon as payments are received and recorded by the institute.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3" role="region" aria-label="Payment history list">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
        Payment History ({payments.length})
      </h3>

      <div className="grid gap-3 sm:grid-cols-2">
        {payments.map((p) => {
          const receivedDateFormatted = p.receivedOn
            ? new Date(p.receivedOn).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
            : 'Date N/A';

          return (
            <Card
              key={p.id}
              className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3 shadow-xs"
              aria-label={`Payment of ${formatCurrency(p.amount)} via ${getModeLabel(p.paymentMode)} on ${receivedDateFormatted}`}
            >
              <CardContent className="p-0 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-[10px] font-semibold">
                    <CreditCard className="h-3 w-3 mr-1 inline" aria-hidden="true" />
                    {getModeLabel(p.paymentMode)}
                  </Badge>
                  <span className="text-xs text-[hsl(var(--muted-foreground))] flex items-center gap-1">
                    <Calendar className="h-3 w-3" aria-hidden="true" />
                    {receivedDateFormatted}
                  </span>
                </div>

                <div className="flex items-baseline justify-between pt-1">
                  <div>
                    <span className="text-[10px] font-medium text-[hsl(var(--muted-foreground))] block truncate max-w-[140px]">
                      {p.batchName}
                    </span>
                    <span className="text-base font-extrabold text-[hsl(var(--foreground))]">
                      {formatCurrency(p.amount)}
                    </span>
                  </div>

                  {p.receiptNumber && (
                    <div className="text-right">
                      <span className="text-[10px] text-[hsl(var(--muted-foreground))] block">
                        Receipt
                      </span>
                      <span className="text-xs font-bold text-[hsl(var(--primary))] flex items-center gap-1">
                        <ReceiptText className="h-3 w-3 inline" aria-hidden="true" />
                        {p.receiptNumber}
                      </span>
                    </div>
                  )}
                </div>

                {p.remarks && (
                  <p className="text-[11px] text-[hsl(var(--muted-foreground))] pt-1 border-t border-[hsl(var(--border)/0.5)] italic truncate">
                    &ldquo;{p.remarks}&rdquo;
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
