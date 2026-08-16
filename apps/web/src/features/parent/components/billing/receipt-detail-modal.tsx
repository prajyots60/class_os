'use client';

import * as React from 'react';
import { Button, Badge, Skeleton } from '@coaching-os/ui';
import { X, Building2, User, Printer, CheckCircle2, CreditCard, Calendar } from 'lucide-react';
import { ParentApiClient } from '../../api/v1-parent-client';
import type { ParentReceiptItemDTO, ParentReceiptDetailDTO } from '../../types/parent-ui.types';

interface ReceiptDetailModalProps {
  receipt: ParentReceiptItemDTO | null;
  studentId: string | null;
  studentName?: string;
  instituteName?: string;
  onClose: () => void;
}

export function ReceiptDetailModal({
  receipt,
  studentId,
  studentName = 'Student',
  instituteName = 'Coaching Institute',
  onClose,
}: ReceiptDetailModalProps) {
  const modalRef = React.useRef<HTMLDivElement>(null);
  const [detail, setDetail] = React.useState<ParentReceiptDetailDTO | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!receipt) return;

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
  }, [receipt, onClose]);

  React.useEffect(() => {
    if (!receipt || !studentId) {
      return;
    }

    let isMounted = true;
    Promise.resolve().then(() => {
      if (isMounted) {
        setIsLoading(true);
        setError(null);
        setDetail(null);
      }
    });

    ParentApiClient.getStudentReceipt(studentId, receipt.id)
      .then((data) => {
        if (isMounted) {
          setDetail(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Failed to load receipt details.');
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [receipt, studentId]);

  if (!receipt) return null;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="receipt-modal-title"
    >
      <div ref={modalRef} className="w-full max-w-lg rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-[hsl(var(--border))] pb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="secondary" className="text-[10px] font-bold">
                {receipt.receiptNumber}
              </Badge>
              <Badge variant="secondary" className="bg-green-500/15 text-green-700 dark:text-green-400 border border-green-500/30 text-[10px]">
                <CheckCircle2 className="h-3 w-3 mr-1 inline" aria-hidden="true" />
                Verified Receipt
              </Badge>
            </div>
            <h2 id="receipt-modal-title" className="text-lg font-bold text-[hsl(var(--foreground))]">
              Fee Payment Receipt
            </h2>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] rounded-full p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
            aria-label="Close receipt details modal"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </Button>
        </div>

        {/* Content Body */}
        {isLoading ? (
          <div className="space-y-3 py-4">
            <Skeleton className="h-12 w-full rounded-md" />
            <Skeleton className="h-24 w-full rounded-md" />
          </div>
        ) : error ? (
          <div className="p-4 rounded-md border border-[hsl(var(--destructive)/0.3)] text-center text-xs text-[hsl(var(--destructive))]">
            {error}
          </div>
        ) : (
          <div className="space-y-4 py-2" id="printable-receipt-content">
            {/* Institute & Student Header */}
            <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.15)] p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-[hsl(var(--primary))]" aria-hidden="true" />
                <span className="font-bold text-sm text-[hsl(var(--foreground))]">
                  {detail?.institute.name || instituteName}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
                <User className="h-3.5 w-3.5" aria-hidden="true" />
                <span>
                  Student: <strong className="text-[hsl(var(--foreground))]">{detail?.student.fullName || studentName}</strong> ({detail?.student.admissionNumber || 'N/A'})
                </span>
              </div>
              <div className="text-xs text-[hsl(var(--muted-foreground))]">
                Batch: <strong className="text-[hsl(var(--foreground))]">{detail?.batchName || receipt.batchName}</strong>
              </div>
            </div>

            {/* Payment Details */}
            <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 space-y-3 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-[hsl(var(--border))]">
                <span className="text-[hsl(var(--muted-foreground))]">Receipt Date</span>
                <span className="font-semibold text-[hsl(var(--foreground))] flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                  {receipt.generatedAt ? new Date(receipt.generatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                </span>
              </div>

              <div className="flex justify-between items-center pb-2 border-b border-[hsl(var(--border))]">
                <span className="text-[hsl(var(--muted-foreground))]">Payment Method</span>
                <span className="font-semibold text-[hsl(var(--foreground))] uppercase flex items-center gap-1">
                  <CreditCard className="h-3.5 w-3.5" aria-hidden="true" />
                  {receipt.paymentMode}
                </span>
              </div>

              <div className="flex justify-between items-center pt-1">
                <span className="font-bold text-sm text-[hsl(var(--foreground))]">Amount Received</span>
                <span className="font-extrabold text-lg text-green-600 dark:text-green-400">
                  {formatCurrency(receipt.amount)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-[hsl(var(--border))]">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            disabled={isLoading || Boolean(error)}
            className="gap-2 min-h-[44px] min-w-[44px]"
            aria-label="Print or save receipt PDF"
          >
            <Printer className="h-4 w-4" aria-hidden="true" />
            <span>Print / Save PDF</span>
          </Button>

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
