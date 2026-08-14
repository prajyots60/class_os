import * as React from 'react';
import { Button, Card, Skeleton } from '@coaching-os/ui';
import { InvoiceStatusBadge, PaymentModeBadge } from './BillingStatusBadge';
import type { InvoiceDTO, PaymentDTO } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';

export interface BillingOverviewViewProps {
  invoices: InvoiceDTO[];
  payments: PaymentDTO[];
  loading: boolean;
  canWriteBilling: boolean;
  canRecordPayment?: boolean;
  onOpenCreatePlan: () => void;
  onOpenGenerateInvoice: () => void;
  onSelectInvoice: (inv: InvoiceDTO) => void;
  onSelectPayment: (pay: PaymentDTO) => void;
  onNavigateTab: (tab: 'plans' | 'invoices' | 'payments' | 'receipts') => void;
}

export function BillingOverviewView({
  invoices,
  payments,
  loading,
  canWriteBilling,
  canRecordPayment,
  onOpenCreatePlan,
  onOpenGenerateInvoice,
  onSelectInvoice,
  onSelectPayment,
  onNavigateTab,
}: BillingOverviewViewProps) {
  void canRecordPayment;
  // Aggregate Overview Metrics supported by APIs
  const totalOutstanding = invoices.reduce((acc, inv) => acc + inv.outstanding, 0);
  const pendingInvoices = invoices.filter((inv) => inv.status === 'pending');
  const pendingAmount = pendingInvoices.reduce((acc, inv) => acc + inv.outstanding, 0);
  const overdueInvoices = invoices.filter((inv) => inv.isOverdue);
  const overdueAmount = overdueInvoices.reduce((acc, inv) => acc + inv.outstanding, 0);
  const totalCollected = payments.reduce((acc, p) => acc + p.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header Quick Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground">Financial Overview</h2>
          <p className="text-xs text-muted-foreground">Real-time fee collection, outstanding balances, and activity</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canWriteBilling && (
            <>
              <Button size="sm" variant="outline" onClick={onOpenCreatePlan}>
                + New Billing Plan
              </Button>
              <Button size="sm" variant="outline" onClick={onOpenGenerateInvoice}>
                ⚡ Generate Invoice
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border border-border bg-card shadow-sm space-y-1">
          <span className="text-xs text-muted-foreground font-medium">Total Outstanding</span>
          {loading ? (
            <Skeleton className="h-8 w-28" />
          ) : (
            <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">
              {formatCurrency(totalOutstanding)}
            </p>
          )}
          <span className="text-[11px] text-muted-foreground">Across active generated invoices</span>
        </Card>

        <Card className="p-4 border border-border bg-card shadow-sm space-y-1">
          <span className="text-xs text-muted-foreground font-medium">Pending Collection</span>
          {loading ? (
            <Skeleton className="h-8 w-28" />
          ) : (
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">
              {formatCurrency(pendingAmount)}
            </p>
          )}
          <span className="text-[11px] text-muted-foreground">{pendingInvoices.length} pending invoices</span>
        </Card>

        <Card className="p-4 border border-border bg-card shadow-sm space-y-1">
          <span className="text-xs text-muted-foreground font-medium">Overdue Invoices</span>
          {loading ? (
            <Skeleton className="h-8 w-28" />
          ) : (
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {formatCurrency(overdueAmount)}
            </p>
          )}
          <span className="text-[11px] text-muted-foreground">{overdueInvoices.length} invoices overdue</span>
        </Card>

        <Card className="p-4 border border-border bg-card shadow-sm space-y-1">
          <span className="text-xs text-muted-foreground font-medium">Total Collected</span>
          {loading ? (
            <Skeleton className="h-8 w-28" />
          ) : (
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(totalCollected)}
            </p>
          )}
          <span className="text-[11px] text-muted-foreground">Total payments recorded</span>
        </Card>
      </div>

      {/* Recent Activity Feeds */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Invoices Feed */}
        <Card className="p-4 border border-border space-y-3">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <h3 className="text-sm font-bold text-foreground">Recent Invoices</h3>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => onNavigateTab('invoices')}>
              View All →
            </Button>
          </div>

          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : invoices.length === 0 ? (
            <p className="text-xs text-muted-foreground italic text-center py-4">
              No invoices generated yet.
            </p>
          ) : (
            <div className="space-y-2 text-xs">
              {invoices.slice(0, 5).map((inv) => (
                <div
                  key={inv.id}
                  onClick={() => onSelectInvoice(inv)}
                  className="flex items-center justify-between p-2.5 rounded-md hover:bg-muted/50 transition cursor-pointer border border-border/40"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-foreground">{inv.invoiceNumber}</span>
                      <InvoiceStatusBadge status={inv.status} isOverdue={inv.isOverdue} />
                    </div>
                    <p className="text-muted-foreground mt-0.5">
                      {inv.studentName || 'Student'} • Due {formatDate(inv.dueDate)}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-foreground">{formatCurrency(inv.amount)}</span>
                    <span className="block text-[10px] text-rose-500 font-medium">
                      Bal: {formatCurrency(inv.outstanding)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent Payments Feed */}
        <Card className="p-4 border border-border space-y-3">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <h3 className="text-sm font-bold text-foreground">Recent Payments</h3>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => onNavigateTab('payments')}>
              View All →
            </Button>
          </div>

          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : payments.length === 0 ? (
            <p className="text-xs text-muted-foreground italic text-center py-4">
              No payments recorded yet.
            </p>
          ) : (
            <div className="space-y-2 text-xs">
              {payments.slice(0, 5).map((p) => (
                <div
                  key={p.id}
                  onClick={() => onSelectPayment(p)}
                  className="flex items-center justify-between p-2.5 rounded-md hover:bg-muted/50 transition cursor-pointer border border-border/40"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(p.amount)}
                      </span>
                      <PaymentModeBadge mode={p.paymentMode} />
                    </div>
                    <p className="text-muted-foreground mt-0.5">
                      {p.studentName || 'Student'} • {formatDate(p.receivedOn)}
                    </p>
                  </div>
                  {p.receiptNumber && (
                    <span className="font-mono text-[10px] bg-muted px-2 py-0.5 rounded text-foreground">
                      {p.receiptNumber}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
