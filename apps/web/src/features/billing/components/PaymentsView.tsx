import * as React from 'react';
import { Button, Input, Skeleton } from '@coaching-os/ui';
import { PaymentModeBadge } from './BillingStatusBadge';
import type { PaymentDTO } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';

export interface PaymentsViewProps {
  payments: PaymentDTO[];
  loading: boolean;
  canIssueReceipt: boolean;
  onSelectPayment: (payment: PaymentDTO) => void;
  onIssueReceipt: (paymentId: string) => void;
}

export function PaymentsView({
  payments,
  loading,
  canIssueReceipt,
  onSelectPayment,
  onIssueReceipt,
}: PaymentsViewProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [modeFilter, setModeFilter] = React.useState<string>('all');

  const filteredPayments = React.useMemo(() => {
    return payments.filter((p) => {
      if (modeFilter !== 'all' && p.paymentMode !== modeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchStudent = p.studentName ? p.studentName.toLowerCase().includes(q) : false;
        const matchInvoice = p.invoiceNumber ? p.invoiceNumber.toLowerCase().includes(q) : false;
        const matchReceipt = p.receiptNumber ? p.receiptNumber.toLowerCase().includes(q) : false;
        if (!matchStudent && !matchInvoice && !matchReceipt) return false;
      }
      return true;
    });
  }, [payments, searchQuery, modeFilter]);

  return (
    <div className="space-y-4">
      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card p-3 border border-border rounded-lg shadow-sm">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <Input
            placeholder="Search payments by student, invoice # or receipt #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-72 text-xs"
          />

          <select
            aria-label="Filter by payment mode"
            className="rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value)}
          >
            <option value="all">All Payment Modes</option>
            <option value="upi">UPI</option>
            <option value="cash">Cash</option>
            <option value="bank_transfer">Bank Transfer</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : filteredPayments.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-lg bg-card/40">
          <p className="text-sm font-medium text-foreground">No Recorded Payments</p>
          <p className="text-xs text-muted-foreground mt-1">
            {searchQuery || modeFilter !== 'all'
              ? 'Try adjusting your search or filter parameters.'
              : 'No payment transactions have been recorded yet.'}
          </p>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b border-border font-semibold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="p-3">Payment ID</th>
                  <th className="p-3">Student Name</th>
                  <th className="p-3">Invoice Number</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Mode</th>
                  <th className="p-3">Received Date</th>
                  <th className="p-3">Collected By</th>
                  <th className="p-3">Receipt</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/30 transition cursor-pointer" onClick={() => onSelectPayment(p)}>
                    <td className="p-3 font-mono font-medium text-foreground">{p.id.slice(0, 8)}...</td>
                    <td className="p-3 font-semibold text-foreground">{p.studentName || 'Student Context'}</td>
                    <td className="p-3 font-mono font-bold text-foreground">{p.invoiceNumber || '—'}</td>
                    <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(p.amount)}
                    </td>
                    <td className="p-3">
                      <PaymentModeBadge mode={p.paymentMode} />
                    </td>
                    <td className="p-3 text-muted-foreground">{formatDate(p.receivedOn)}</td>
                    <td className="p-3 text-muted-foreground">{p.collectedBy}</td>
                    <td className="p-3">
                      {p.receiptNumber ? (
                        <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded text-foreground font-semibold">
                          {p.receiptNumber}
                        </span>
                      ) : (
                        <span className="text-[11px] text-muted-foreground italic">Unissued</span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      {!p.receiptNumber && canIssueReceipt && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs"
                          onClick={() => onIssueReceipt(p.id)}
                        >
                          Issue Receipt
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
