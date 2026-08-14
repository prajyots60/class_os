import * as React from 'react';
import { Button, Input, Skeleton } from '@coaching-os/ui';
import { InvoiceStatusBadge } from './BillingStatusBadge';
import type { InvoiceDTO } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';

export interface InvoicesViewProps {
  invoices: InvoiceDTO[];
  loading: boolean;
  canWriteBilling: boolean;
  canRecordPayment: boolean;
  onOpenGenerateInvoice: () => void;
  onSelectInvoice: (inv: InvoiceDTO) => void;
  onRecordPayment: (inv: InvoiceDTO) => void;
}

export function InvoicesView({
  invoices,
  loading,
  canWriteBilling,
  canRecordPayment,
  onOpenGenerateInvoice,
  onSelectInvoice,
  onRecordPayment,
}: InvoicesViewProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [overdueOnly, setOverdueOnly] = React.useState<boolean>(false);

  const filteredInvoices = React.useMemo(() => {
    return invoices.filter((inv) => {
      if (statusFilter !== 'all' && inv.status !== statusFilter) return false;
      if (overdueOnly && !inv.isOverdue) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNum = inv.invoiceNumber.toLowerCase().includes(q);
        const matchStudent = inv.studentName ? inv.studentName.toLowerCase().includes(q) : false;
        if (!matchNum && !matchStudent) return false;
      }
      return true;
    });
  }, [invoices, searchQuery, statusFilter, overdueOnly]);

  return (
    <div className="space-y-4">
      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card p-3 border border-border rounded-lg shadow-sm">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <Input
            placeholder="Search invoice # or student name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-64 text-xs"
          />

          <select
            aria-label="Filter by invoice status"
            className="rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="partial">Partially Paid</option>
            <option value="paid">Paid</option>
          </select>

          <label className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={overdueOnly}
              onChange={(e) => setOverdueOnly(e.target.checked)}
              className="rounded border-input text-primary focus:ring-ring h-4 w-4"
            />
            <span>Overdue Only</span>
          </label>
        </div>

        {canWriteBilling && (
          <Button size="sm" onClick={onOpenGenerateInvoice}>
            ⚡ Generate Invoice
          </Button>
        )}
      </div>

      {/* Invoice List Table */}
      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-lg bg-card/40">
          <p className="text-sm font-medium text-foreground">No Invoices Found</p>
          <p className="text-xs text-muted-foreground mt-1">
            {searchQuery || statusFilter !== 'all' || overdueOnly
              ? 'Try adjusting your search or filter parameters.'
              : 'No invoices have been generated yet.'}
          </p>
          {canWriteBilling && !searchQuery && (
            <Button size="sm" variant="outline" className="mt-4" onClick={onOpenGenerateInvoice}>
              Generate First Invoice
            </Button>
          )}
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b border-border font-semibold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="p-3">Invoice Number</th>
                  <th className="p-3">Student / Batch</th>
                  <th className="p-3">Due Date</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Paid Amount</th>
                  <th className="p-3">Outstanding</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-muted/30 transition">
                    <td
                      className="p-3 font-mono font-bold text-foreground cursor-pointer hover:underline"
                      onClick={() => onSelectInvoice(inv)}
                    >
                      {inv.invoiceNumber}
                    </td>
                    <td className="p-3">
                      <span className="font-semibold text-foreground block">
                        {inv.studentName || 'Student Context'}
                      </span>
                      {inv.batchName && <span className="text-muted-foreground text-[10px]">{inv.batchName}</span>}
                    </td>
                    <td className="p-3 text-muted-foreground">{formatDate(inv.dueDate)}</td>
                    <td className="p-3">
                      <InvoiceStatusBadge status={inv.status} isOverdue={inv.isOverdue} />
                    </td>
                    <td className="p-3 font-medium text-foreground">{formatCurrency(inv.amount)}</td>
                    <td className="p-3 text-emerald-600 dark:text-emerald-400 font-medium">
                      {formatCurrency(inv.paidAmount)}
                    </td>
                    <td className="p-3 font-bold text-rose-600 dark:text-rose-400">
                      {formatCurrency(inv.outstanding)}
                    </td>
                    <td className="p-3 text-right">
                      <div className="inline-flex gap-1">
                        <Button variant="ghost" size="sm" className="text-xs" onClick={() => onSelectInvoice(inv)}>
                          Details
                        </Button>
                        {inv.outstanding > 0 && canRecordPayment && (
                          <Button
                            size="sm"
                            className="text-xs"
                            data-testid="table-record-payment-btn"
                            onClick={() => onRecordPayment(inv)}
                          >
                            Pay
                          </Button>
                        )}
                      </div>
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
