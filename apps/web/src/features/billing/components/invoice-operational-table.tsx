'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import { Badge } from '@coaching-os/ui';
import { ArrowUpDown, ArrowUp, ArrowDown, Eye, CreditCard, User } from 'lucide-react';
import {
  OperationalTableToolbar,
  OperationalTablePagination,
  OperationalTableSkeleton,
  OperationalTableEmpty,
  OperationalTableError,
  OperationalTableRowActions,
  type RowActionItem,
} from '../../shared/components/operational-table';
import { useInvoicesTable } from '../hooks/use-invoices-table';

export interface InvoiceRowItem {
  id: string;
  invoiceNumber: string;
  studentName: string;
  admissionNumber?: string;
  amount: number;
  paidAmount: number;
  outstandingAmount: number;
  dueDateIso: string;
  status: string;
  createdAtIso: string;
}

export interface InvoiceOperationalTableProps {
  onViewDetails?: (invoice: InvoiceRowItem) => void;
  onRecordPayment?: (invoice: InvoiceRowItem) => void;
  canRecordPayment?: boolean;
}

const columnHelper = createColumnHelper<InvoiceRowItem>();

export function InvoiceOperationalTable({
  onViewDetails,
  onRecordPayment,
  canRecordPayment = true,
}: InvoiceOperationalTableProps = {}) {
  const router = useRouter();
  const {
    filters,
    updateFilter,
    clearFilters,
    hasActiveFilters,
    data: apiResponse,
    isLoading,
    isError,
    error,
    refetch,
  } = useInvoicesTable();

  const invoices: InvoiceRowItem[] = React.useMemo(() => {
    if (!apiResponse?.data) return [];
    return apiResponse.data.map((item: Record<string, unknown>) => {
      const id = String(item.id || '');
      return {
        id,
        invoiceNumber: String(item.invoiceNumber || `INV-${id.slice(0, 8).toUpperCase()}`),
        studentName: String(item.studentName || 'Student'),
        admissionNumber: String(item.admissionNumber || ''),
        amount: typeof item.amount === 'number' ? item.amount : Number(item.amount || 0),
        paidAmount: typeof item.paidAmount === 'number' ? item.paidAmount : Number(item.paidAmount || 0),
        outstandingAmount: typeof item.outstandingAmount === 'number' ? item.outstandingAmount : Number(item.outstandingAmount || 0),
        dueDateIso: String(item.dueDateIso || (item.dueDate ? new Date(String(item.dueDate)).toISOString().split('T')[0] : '—')),
        status: String(item.status || 'pending'),
        createdAtIso: String(item.createdAtIso || (item.createdAt ? new Date(String(item.createdAt)).toISOString().split('T')[0] : '—')),
      };
    });
  }, [apiResponse]);

  const total = apiResponse?.meta?.total ?? invoices.length;
  const page = apiResponse?.meta?.page ?? filters.page;
  const pageSize = apiResponse?.meta?.pageSize ?? filters.pageSize;
  const totalPages = Math.ceil(total / pageSize) || 1;

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);

  const handleSort = React.useCallback(
    (field: string) => {
      if (filters.sortBy === field) {
        updateFilter('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc');
      } else {
        updateFilter('sortBy', field);
        updateFilter('sortOrder', 'asc');
      }
    },
    [filters.sortBy, filters.sortOrder, updateFilter],
  );

  const columns = React.useMemo(
    () => [
      columnHelper.accessor('invoiceNumber', {
        header: 'Invoice Number',
        cell: (info) => (
          <code className="font-mono text-xs px-2 py-0.5 rounded bg-[hsl(var(--muted))] border border-[hsl(var(--border))]">
            {info.getValue()}
          </code>
        ),
      }),

      columnHelper.accessor('studentName', {
        header: 'Student',
        cell: (info) => (
          <div className="flex flex-col">
            <span className="font-semibold text-xs text-[hsl(var(--foreground))] truncate max-w-[180px]">
              {info.getValue()}
            </span>
            {info.row.original.admissionNumber && (
              <span className="text-[11px] text-[hsl(var(--muted-foreground))]">
                Adm: {info.row.original.admissionNumber}
              </span>
            )}
          </div>
        ),
      }),

      columnHelper.accessor('amount', {
        header: () => (
          <button
            type="button"
            onClick={() => handleSort('amount')}
            className="flex items-center space-x-1 font-semibold text-xs uppercase text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] rounded px-1 min-h-[44px]"
            aria-label="Sort by Amount"
          >
            <span>Total Amount</span>
            {filters.sortBy === 'amount' ? (
              filters.sortOrder === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />
            ) : (
              <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />
            )}
          </button>
        ),
        cell: (info) => <span className="font-semibold text-xs">{formatCurrency(info.getValue())}</span>,
      }),

      columnHelper.accessor('paidAmount', {
        header: 'Paid Amount',
        cell: (info) => <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">{formatCurrency(info.getValue())}</span>,
      }),

      columnHelper.accessor('dueDateIso', {
        header: () => (
          <button
            type="button"
            onClick={() => handleSort('dueDate')}
            className="flex items-center space-x-1 font-semibold text-xs uppercase text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] rounded px-1 min-h-[44px]"
            aria-label="Sort by Due Date"
          >
            <span>Due Date</span>
            {filters.sortBy === 'dueDate' ? (
              filters.sortOrder === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />
            ) : (
              <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />
            )}
          </button>
        ),
        cell: (info) => <span className="text-xs text-[hsl(var(--muted-foreground))]">{info.getValue()}</span>,
      }),

      columnHelper.accessor('status', {
        header: () => (
          <button
            type="button"
            onClick={() => handleSort('status')}
            className="flex items-center space-x-1 font-semibold text-xs uppercase text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] rounded px-1 min-h-[44px]"
            aria-label="Sort by Status"
          >
            <span>Status</span>
            {filters.sortBy === 'status' ? (
              filters.sortOrder === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />
            ) : (
              <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />
            )}
          </button>
        ),
        cell: (info) => {
          const s = info.getValue();
          const variant = s === 'paid' ? 'default' : s === 'partial' ? 'secondary' : 'outline';
          return (
            <Badge variant={variant} className="text-[10px] uppercase font-semibold">
              {s}
            </Badge>
          );
        },
      }),

      columnHelper.display({
        id: 'actions',
        header: 'Actions',
        cell: (info) => {
          const inv = info.row.original;
          const actions: RowActionItem[] = [
            {
              id: 'view-details',
              label: 'View Invoice Details',
              icon: Eye,
              onClick: () => {
                if (onViewDetails) {
                  onViewDetails(inv);
                } else {
                  router.push(`/billing?tab=invoices&invoiceId=${inv.id}`);
                }
              },
            },
          ];

          if (canRecordPayment && inv.status !== 'paid') {
            actions.push({
              id: 'record-payment',
              label: 'Record Payment',
              icon: CreditCard,
              onClick: () => {
                if (onRecordPayment) {
                  onRecordPayment(inv);
                } else {
                  router.push(`/billing?tab=invoices&invoiceId=${inv.id}&action=record-payment`);
                }
              },
            });
          }

          actions.push({
            id: 'view-student',
            label: 'View Student',
            icon: User,
            onClick: () => router.push(`/students?search=${encodeURIComponent(inv.studentName)}`),
          });

          return (
            <OperationalTableRowActions
              actions={actions}
              rowId={inv.id}
              resourceName={inv.invoiceNumber}
            />
          );
        },
      }),
    ],
    [filters.sortBy, filters.sortOrder, handleSort, onViewDetails, onRecordPayment, canRecordPayment, router],
  );

  const table = useReactTable({
    data: invoices,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
  });

  return (
    <div className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm overflow-hidden" data-testid="invoice-operational-table">
      {/* Operational Toolbar */}
      <OperationalTableToolbar
        searchQuery={filters.search}
        onSearchChange={(val) => updateFilter('search', val)}
        searchPlaceholder="Search invoices by student name or ID..."
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearFilters}
        totalCount={total}
        resourceName="invoices"
      >
        {/* Status Filter Dropdown */}
        <select
          value={filters.status}
          onChange={(e) => updateFilter('status', e.target.value)}
          aria-label="Filter by Status"
          data-testid="invoice-status-filter"
          className="min-h-[44px] rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 text-xs text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
        >
          <option value="">All Payment Statuses</option>
          <option value="pending">Pending</option>
          <option value="partial">Partial</option>
          <option value="paid">Paid</option>
        </select>

        {/* Overdue Filter Dropdown */}
        <select
          value={filters.overdue === undefined ? '' : String(filters.overdue)}
          onChange={(e) =>
            updateFilter(
              'overdue',
              e.target.value === '' ? undefined : e.target.value === 'true',
            )
          }
          aria-label="Filter by Overdue Status"
          data-testid="invoice-overdue-filter"
          className="min-h-[44px] rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 text-xs text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
        >
          <option value="">All Due Dates</option>
          <option value="true">Overdue Only</option>
          <option value="false">On Time / Paid</option>
        </select>
      </OperationalTableToolbar>

      {/* Loading State */}
      {isLoading && <OperationalTableSkeleton rows={5} columns={7} />}

      {/* Error State */}
      {isError && (
        <OperationalTableError
          message={(error as Error)?.message}
          onRetry={() => refetch()}
        />
      )}

      {/* Empty / Filtered-Empty State */}
      {!isLoading && !isError && invoices.length === 0 && (
        <OperationalTableEmpty
          isFiltered={hasActiveFilters}
          resourceName="invoices"
          onClearFilters={clearFilters}
        />
      )}

      {/* Data Table */}
      {!isLoading && !isError && invoices.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr
                  key={headerGroup.id}
                  className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]"
                >
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} scope="col" className="py-3 px-4 font-semibold">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-[hsl(var(--border))]">
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="hover:bg-[hsl(var(--muted)/0.2)] transition-colors"
                  data-testid={`invoice-table-row-${row.original.id}`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="py-3 px-4">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Operational Pagination Footer */}
      {!isLoading && !isError && (
        <OperationalTablePagination
          page={page}
          pageSize={pageSize}
          total={total}
          totalPages={totalPages}
          onPageChange={(newPage) => updateFilter('page', newPage)}
          onPageSizeChange={(newPageSize) => updateFilter('pageSize', newPageSize)}
        />
      )}
    </div>
  );
}
