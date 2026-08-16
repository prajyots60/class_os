'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from '@coaching-os/ui';
import { Calendar, ExternalLink, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import type { ParentInvoiceItemDTO } from '../../types/parent-ui.types';

interface InvoiceCardProps {
  invoice: ParentInvoiceItemDTO;
  onSelect: (item: ParentInvoiceItemDTO) => void;
}

export function InvoiceCard({ invoice, onSelect }: InvoiceCardProps) {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const dueDateFormatted = invoice.dueDate
    ? new Date(invoice.dueDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'N/A';

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <Badge
            variant="secondary"
            className="bg-green-500/15 text-green-700 dark:text-green-400 border border-green-500/30 text-xs font-semibold px-2.5 py-0.5"
          >
            <CheckCircle2 className="h-3 w-3 mr-1 inline" aria-hidden="true" />
            Paid
          </Badge>
        );
      case 'partial':
        return (
          <Badge
            variant="secondary"
            className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-xs font-semibold px-2.5 py-0.5"
          >
            <Clock className="h-3 w-3 mr-1 inline" aria-hidden="true" />
            Partial
          </Badge>
        );
      default:
        return (
          <Badge
            variant="secondary"
            className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30 text-xs font-semibold px-2.5 py-0.5"
          >
            <AlertCircle className="h-3 w-3 mr-1 inline" aria-hidden="true" />
            Pending
          </Badge>
        );
    }
  };

  const ariaText = `Invoice for ${invoice.batchName}: total ${formatCurrency(invoice.amount)}, ${formatCurrency(invoice.paidAmount)} paid, ${formatCurrency(invoice.outstandingAmount)} outstanding, due ${dueDateFormatted}, status ${invoice.status}`;

  return (
    <Card
      className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm hover:border-[hsl(var(--primary)/0.5)] transition-all"
      aria-label={ariaText}
    >
      <CardHeader className="pb-2 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <Badge variant="outline" className="text-[10px]">
            {invoice.batchName}
          </Badge>
          {getStatusBadge(invoice.status)}
        </div>

        <CardTitle className="text-base font-bold text-[hsl(var(--foreground))] pt-1">
          {formatCurrency(invoice.amount)}
        </CardTitle>
        <div className="text-xs text-[hsl(var(--muted-foreground))] flex items-center gap-1">
          <Calendar className="h-3 w-3" aria-hidden="true" />
          Due on {dueDateFormatted}
        </div>
      </CardHeader>

      <CardContent className="pt-1 space-y-3">
        <div className="grid grid-cols-2 gap-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.15)] p-2.5">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              Paid
            </div>
            <div className="text-sm font-bold text-[hsl(var(--foreground))] mt-0.5">
              {formatCurrency(invoice.paidAmount)}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              Outstanding
            </div>
            <div
              className={`text-sm font-extrabold mt-0.5 ${
                invoice.outstandingAmount > 0
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-green-600 dark:text-green-400'
              }`}
            >
              {formatCurrency(invoice.outstandingAmount)}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-[hsl(var(--border)/0.5)]">
          <span className="text-xs text-[hsl(var(--muted-foreground))]">
            Historical Invoice
          </span>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSelect(invoice)}
            className="min-h-[44px] min-w-[44px] gap-1 text-xs text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)]"
            aria-label={`View invoice details for ${invoice.batchName}`}
          >
            <span>View Invoice</span>
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
