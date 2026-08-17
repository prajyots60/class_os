import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Input, Skeleton } from '@coaching-os/ui';
import { Search, IndianRupee, CreditCard, Receipt, RotateCcw, AlertCircle } from 'lucide-react';
import type { FeeCollectionReportResponseDTO } from '@coaching-os/administration';

export interface FeeCollectionReportViewProps {
  data: FeeCollectionReportResponseDTO | null;
  loading: boolean;
  error: string | null;
  from: string;
  to: string;
  paymentMode: string;
  search: string;
  page: number;
  onFromChange: (val: string) => void;
  onToChange: (val: string) => void;
  onPaymentModeChange: (val: string) => void;
  onSearchChange: (val: string) => void;
  onPageChange: (page: number) => void;
  onClearFilters: () => void;
  onRetry: () => void;
}

export function FeeCollectionReportView({
  data,
  loading,
  error,
  from,
  to,
  paymentMode,
  search,
  page,
  onFromChange,
  onToChange,
  onPaymentModeChange,
  onSearchChange,
  onPageChange,
  onClearFilters,
  onRetry,
}: FeeCollectionReportViewProps) {
  const summary = data?.summary;
  const rows = data?.data || [];
  const meta = data?.meta || { total: 0, page: 1, pageSize: 25, totalPages: 1 };

  const hasActiveFilters = Boolean(search || from || to || (paymentMode && paymentMode !== 'all'));

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amt);
  };

  return (
    <div className="space-y-6">
      {/* Metric Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-[hsl(var(--border))] bg-[hsl(var(--card))]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              Total Collected
            </CardTitle>
            <IndianRupee className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold text-[hsl(var(--foreground))]">
                {formatCurrency(summary?.totalCollectedAmount ?? 0)}
              </div>
            )}
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">In selected date range</p>
          </CardContent>
        </Card>

        <Card className="border-[hsl(var(--border))] bg-[hsl(var(--card))]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              Transactions Count
            </CardTitle>
            <Receipt className="h-4 w-4 text-[hsl(var(--primary))]" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-[hsl(var(--foreground))]">
                {summary?.transactionCount ?? 0}
              </div>
            )}
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">Payments recorded</p>
          </CardContent>
        </Card>

        <Card className="border-[hsl(var(--border))] bg-[hsl(var(--card))]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              Outstanding Invoices
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold text-[hsl(var(--foreground))]">
                {formatCurrency(summary?.pendingInvoiceAmount ?? 0)}
              </div>
            )}
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">Total pending balance</p>
          </CardContent>
        </Card>

        <Card className="border-[hsl(var(--border))] bg-[hsl(var(--card))]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              Method Breakdown
            </CardTitle>
            <CreditCard className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-xs space-y-1 font-medium text-[hsl(var(--foreground))]">
                <div className="flex justify-between">
                  <span className="text-[hsl(var(--muted-foreground))]">Cash:</span>
                  <span>{formatCurrency(summary?.paymentMethodBreakdown?.cash ?? 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[hsl(var(--muted-foreground))]">UPI:</span>
                  <span>{formatCurrency(summary?.paymentMethodBreakdown?.upi ?? 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[hsl(var(--muted-foreground))]">Bank:</span>
                  <span>{formatCurrency(summary?.paymentMethodBreakdown?.bank_transfer ?? 0)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Report Filter Toolbar */}
      <div className="flex flex-col gap-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor="fees-from-date" className="text-xs font-medium text-[hsl(var(--muted-foreground))]">From:</label>
            <Input
              id="fees-from-date"
              type="date"
              className="h-9 w-36 text-xs"
              value={from}
              onChange={(e) => onFromChange(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="fees-to-date" className="text-xs font-medium text-[hsl(var(--muted-foreground))]">To:</label>
            <Input
              id="fees-to-date"
              type="date"
              className="h-9 w-36 text-xs"
              value={to}
              onChange={(e) => onToChange(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="fees-payment-mode" className="text-xs font-medium text-[hsl(var(--muted-foreground))]">Mode:</label>
            <select
              id="fees-payment-mode"
              aria-label="Filter by payment method mode"
              className="h-9 rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 text-xs text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
              value={paymentMode || 'all'}
              onChange={(e) => onPaymentModeChange(e.target.value)}
            >
              <option value="all">All Modes</option>
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="bank_transfer">Bank Transfer</option>
            </select>
          </div>

          <div className="relative min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
            <Input
              type="text"
              placeholder="Search student or invoice..."
              className="h-9 pl-8 text-xs"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        </div>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="h-9 min-h-[44px] text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Clear Filters
          </Button>
        )}
      </div>

      {/* Report Content Table / States */}
      {error ? (
        <Card className="border-red-200 bg-red-50/50 p-6 text-center dark:border-red-900/50 dark:bg-red-950/20">
          <p className="text-sm font-medium text-red-800 dark:text-red-300">{error}</p>
          <Button variant="outline" size="sm" onClick={onRetry} className="mt-3 min-h-[44px]">
            Retry Loading Report
          </Button>
        </Card>
      ) : loading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : rows.length === 0 ? (
        <Card className="p-8 text-center border-[hsl(var(--border))] bg-[hsl(var(--card))]">
          <p className="text-sm font-medium text-[hsl(var(--foreground))]">No fee collection records found</p>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
            Try adjusting your date range or payment filters.
          </p>
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={onClearFilters} className="mt-3 min-h-[44px]">
              Clear Filters
            </Button>
          )}
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] uppercase font-medium">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Invoice #</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Mode</th>
                <th className="px-4 py-3 text-right">Receipt #</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[hsl(var(--border))]">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-[hsl(var(--muted))/50]">
                  <td className="px-4 py-3 font-medium text-[hsl(var(--foreground))]">{row.receivedOnIso}</td>
                  <td className="px-4 py-3 font-semibold text-[hsl(var(--foreground))]">
                    {row.studentName}
                    {row.admissionNumber && (
                      <span className="ml-1 text-[11px] font-normal text-[hsl(var(--muted-foreground))]">
                        ({row.admissionNumber})
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-[hsl(var(--muted-foreground))]">{row.invoiceNumber}</td>
                  <td className="px-4 py-3 font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(row.amount)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="text-[10px] uppercase">
                      {row.paymentMode}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-[hsl(var(--muted-foreground))]">
                    {row.receiptNumber || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Table Pagination */}
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-[hsl(var(--border))] px-4 py-3">
              <span className="text-xs text-[hsl(var(--muted-foreground))]">
                Page {meta.page} of {meta.totalPages} ({meta.total} total payments)
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => onPageChange(page - 1)}
                  className="min-h-[44px] text-xs"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= meta.totalPages}
                  onClick={() => onPageChange(page + 1)}
                  className="min-h-[44px] text-xs"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
