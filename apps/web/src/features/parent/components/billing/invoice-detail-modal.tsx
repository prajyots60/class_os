'use client';

import * as React from 'react';
import { Button, Badge } from '@coaching-os/ui';
import { X, Calendar, Building2, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import type { ParentInvoiceItemDTO } from '../../types/parent-ui.types';

interface InvoiceDetailModalProps {
  invoice: ParentInvoiceItemDTO | null;
  instituteName?: string;
  onClose: () => void;
}

export function InvoiceDetailModal({ invoice, instituteName, onClose }: InvoiceDetailModalProps) {
  const modalRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!invoice) return;

    const previousActiveElement = document.activeElement as HTMLElement | null;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const closeBtn = modalRef.current?.querySelector<HTMLElement>('button');
    closeBtn?.focus();

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousActiveElement?.focus();
    };
  }, [invoice, onClose]);

  if (!invoice) return null;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const dueDateFormatted = invoice.dueDate
    ? new Date(invoice.dueDate).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Date Not Specified';

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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="invoice-modal-title"
    >
      <div ref={modalRef} className="w-full max-w-lg rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-[hsl(var(--border))] pb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-[10px]">
                {invoice.batchName}
              </Badge>
              {getStatusBadge(invoice.status)}
            </div>
            <h2 id="invoice-modal-title" className="text-lg font-bold text-[hsl(var(--foreground))]">
              Fee Invoice
            </h2>
            {instituteName && (
              <p className="text-xs text-[hsl(var(--muted-foreground))] flex items-center gap-1 mt-1 font-medium">
                <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
                {instituteName}
              </p>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] rounded-full p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
            aria-label="Close invoice details modal"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </Button>
        </div>

        {/* Content Body */}
        <div className="space-y-4 py-2">
          <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.15)] p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[hsl(var(--muted-foreground))]">Due Date</span>
              <span className="font-semibold text-[hsl(var(--foreground))] flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                {dueDateFormatted}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs pt-2 border-t border-[hsl(var(--border))]">
              <span className="text-[hsl(var(--muted-foreground))]">Total Invoice Amount</span>
              <span className="font-bold text-base text-[hsl(var(--foreground))]">
                {formatCurrency(invoice.amount)}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-[hsl(var(--muted-foreground))]">Paid Amount</span>
              <span className="font-bold text-sm text-green-600 dark:text-green-400">
                {formatCurrency(invoice.paidAmount)}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs pt-2 border-t border-[hsl(var(--border))]">
              <span className="font-semibold text-[hsl(var(--foreground))]">Remaining Outstanding</span>
              <span className="font-extrabold text-base text-amber-600 dark:text-amber-400">
                {formatCurrency(invoice.outstandingAmount)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-3 border-t border-[hsl(var(--border))]">
          <Button
            variant="outline"
            onClick={onClose}
            className="min-h-[44px] px-5"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
