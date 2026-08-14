import * as React from 'react';
import { Button, Card } from '@coaching-os/ui';
import { PaymentModeBadge } from './BillingStatusBadge';
import type { ReceiptDTO } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';

export interface ReceiptDetailsModalProps {
  isOpen: boolean;
  receipt: ReceiptDTO | null;
  onClose: () => void;
}

export function ReceiptDetailsModal({ isOpen, receipt, onClose }: ReceiptDetailsModalProps) {
  if (!isOpen || !receipt) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="receipt-details-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="w-full max-w-md rounded-lg bg-background p-6 shadow-xl border border-border">
        <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
          <div>
            <h2 id="receipt-details-title" className="text-lg font-bold text-foreground">
              Official Fee Receipt
            </h2>
            <p className="text-xs font-mono font-bold text-primary mt-0.5">
              {receipt.receiptNumber}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </div>

        <Card className="p-4 bg-muted/30 border border-border space-y-3 mb-4 text-xs">
          <div className="flex justify-between items-center pb-2 border-b border-border">
            <span className="text-muted-foreground">Receipt Number:</span>
            <span className="font-mono font-bold text-foreground">{receipt.receiptNumber}</span>
          </div>

          {receipt.amount !== undefined && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Amount Paid:</span>
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(receipt.amount)}
              </span>
            </div>
          )}

          {receipt.paymentMode && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Payment Mode:</span>
              <PaymentModeBadge mode={receipt.paymentMode} />
            </div>
          )}

          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Payment ID:</span>
            <span className="font-mono text-foreground">{receipt.paymentId}</span>
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-border">
            <span className="text-muted-foreground">Issued At:</span>
            <span className="text-foreground">{formatDate(receipt.generatedAt)}</span>
          </div>
        </Card>

        {/* PDF Boundary Notice (R-UI-005) */}
        <div className="mb-4 rounded-md bg-slate-100 p-3 text-xs text-slate-700 dark:bg-slate-900 dark:text-slate-300 border border-slate-200 dark:border-slate-800 space-y-1">
          <p className="font-semibold">Document Notice</p>
          <p>
            Official receipt ID <code className="font-mono">{receipt.receiptNumber}</code> has been verified and permanently registered. PDF document generation will be enabled in a future release.
          </p>
        </div>

        <div className="flex justify-between items-center pt-2">
          {/* Disabled PDF download button with explanatory tooltip */}
          <div className="relative group">
            <Button variant="outline" size="sm" disabled data-testid="download-pdf-btn">
              Download PDF 📄
            </Button>
            <div className="absolute bottom-full left-0 mb-1 hidden group-hover:block w-48 rounded bg-slate-900 px-2 py-1 text-[10px] text-white shadow-lg">
              PDF storage worker integration will be enabled in a future update.
            </div>
          </div>

          <Button variant="default" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
