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
import { ArrowUpDown, ArrowUp, ArrowDown, Eye, Edit, CreditCard, BookOpen, UserCheck, UserX, Archive } from 'lucide-react';
import {
  OperationalTableToolbar,
  OperationalTablePagination,
  OperationalTableSkeleton,
  OperationalTableEmpty,
  OperationalTableError,
  OperationalTableRowActions,
  type RowActionItem,
} from '../../shared/components/operational-table';
import { useStudentsTable } from '../hooks/use-students-table';

export interface StudentRowItem {
  id: string;
  displayName: string;
  admissionNumber: string;
  phone?: string;
  email?: string;
  status: string;
  admissionStatus: string;
  createdAt: string;
}

export interface StudentOperationalTableProps {
  onViewDetails?: (student: StudentRowItem) => void;
  onEdit?: (student: StudentRowItem) => void;
  onAdmit?: (student: StudentRowItem) => void;
  onReject?: (student: StudentRowItem) => void;
  onCancel?: (student: StudentRowItem) => void;
  onActivate?: (student: StudentRowItem) => void;
  onDeactivate?: (student: StudentRowItem) => void;
  onArchive?: (student: StudentRowItem) => void;
  canUpdate?: boolean;
  canArchive?: boolean;
}

const columnHelper = createColumnHelper<StudentRowItem>();

export function StudentOperationalTable({
  onViewDetails,
  onEdit,
  onAdmit,
  onReject,
  onCancel,
  onActivate,
  onDeactivate,
  onArchive,
  canUpdate = true,
  canArchive = true,
}: StudentOperationalTableProps = {}) {
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
  } = useStudentsTable();

  const students: StudentRowItem[] = React.useMemo(() => {
    if (!apiResponse?.data) return [];
    return apiResponse.data.map((item: Record<string, unknown>) => ({
      id: String(item.id || ''),
      displayName: String(item.displayName || `${item.firstName || ''} ${item.lastName || ''}`).trim() || 'Unnamed',
      admissionNumber: String(item.admissionNumber || item.admissionNo || 'N/A'),
      phone: String(item.phone || item.contact || '—'),
      email: String(item.email || '—'),
      status: String(item.status || 'active'),
      admissionStatus: String(item.admissionStatus || 'admitted'),
      createdAt: item.createdAt ? new Date(String(item.createdAt)).toLocaleDateString() : '—',
    }));
  }, [apiResponse]);

  const total = apiResponse?.meta?.total ?? students.length;
  const page = apiResponse?.meta?.page ?? filters.page;
  const pageSize = apiResponse?.meta?.pageSize ?? filters.pageSize;
  const totalPages = Math.ceil(total / pageSize) || 1;

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
      columnHelper.accessor('displayName', {
        header: () => (
          <button
            type="button"
            onClick={() => handleSort('displayName')}
            className="flex items-center space-x-1 font-semibold text-xs uppercase text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] rounded px-1 min-h-[44px]"
            aria-label="Sort by Student Name"
          >
            <span>Student Name</span>
            {filters.sortBy === 'displayName' ? (
              filters.sortOrder === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />
            ) : (
              <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />
            )}
          </button>
        ),
        cell: (info) => (
          <div className="flex flex-col">
            <span className="font-semibold text-xs text-[hsl(var(--foreground))] truncate max-w-[200px]">
              {info.getValue()}
            </span>
            <span className="text-[11px] text-[hsl(var(--muted-foreground))] truncate max-w-[200px]">
              {info.row.original.email}
            </span>
          </div>
        ),
      }),

      columnHelper.accessor('admissionNumber', {
        header: () => (
          <button
            type="button"
            onClick={() => handleSort('admissionNumber')}
            className="flex items-center space-x-1 font-semibold text-xs uppercase text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] rounded px-1 min-h-[44px]"
            aria-label="Sort by Admission Number"
          >
            <span>Admission No.</span>
            {filters.sortBy === 'admissionNumber' ? (
              filters.sortOrder === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />
            ) : (
              <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />
            )}
          </button>
        ),
        cell: (info) => (
          <code className="font-mono text-xs px-2 py-0.5 rounded bg-[hsl(var(--muted))] border border-[hsl(var(--border))]">
            {info.getValue()}
          </code>
        ),
      }),

      columnHelper.accessor('phone', {
        header: 'Contact',
        cell: (info) => <span className="text-xs text-[hsl(var(--muted-foreground))]">{info.getValue()}</span>,
      }),

      columnHelper.accessor('admissionStatus', {
        header: 'Admission Status',
        cell: (info) => (
          <Badge variant="secondary" className="text-[10px] uppercase font-semibold">
            {info.getValue()}
          </Badge>
        ),
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
        cell: (info) => (
          <Badge
            variant={info.getValue() === 'active' ? 'default' : 'outline'}
            className="text-[10px] uppercase font-semibold"
          >
            {info.getValue()}
          </Badge>
        ),
      }),

      columnHelper.accessor('createdAt', {
        header: 'Registered',
        cell: (info) => <span className="text-xs text-[hsl(var(--muted-foreground))]">{info.getValue()}</span>,
      }),

      columnHelper.display({
        id: 'actions',
        header: 'Actions',
        cell: (info) => {
          const s = info.row.original;
          const actions: RowActionItem[] = [];

          if (onViewDetails) {
            actions.push({
              id: 'view-details',
              label: 'View Details',
              icon: Eye,
              onClick: () => onViewDetails(s),
            });
          }

          if (canUpdate && onEdit) {
            actions.push({
              id: 'edit',
              label: 'Edit Profile',
              icon: Edit,
              onClick: () => onEdit(s),
            });
          }

          if (canUpdate && s.admissionStatus === 'pending') {
            if (onAdmit) {
              actions.push({
                id: 'admit',
                label: 'Admit Student',
                icon: UserCheck,
                onClick: () => onAdmit(s),
              });
            }
            if (onReject) {
              actions.push({
                id: 'reject',
                label: 'Reject Admission',
                icon: UserX,
                variant: 'danger',
                onClick: () => onReject(s),
              });
            }
          }

          actions.push({
            id: 'view-billing',
            label: 'View Billing',
            icon: CreditCard,
            onClick: () => router.push(`/billing?tab=invoices&search=${encodeURIComponent(s.displayName)}`),
          });

          actions.push({
            id: 'view-academics',
            label: 'View Academics',
            icon: BookOpen,
            onClick: () => router.push(`/academics?tab=sessions&search=${encodeURIComponent(s.displayName)}`),
          });

          if (canArchive && onArchive && s.status !== 'archived') {
            actions.push({
              id: 'archive',
              label: 'Archive Student',
              icon: Archive,
              variant: 'danger',
              onClick: () => onArchive(s),
            });
          }

          return (
            <OperationalTableRowActions
              actions={actions}
              rowId={s.id}
              resourceName={s.displayName}
            />
          );
        },
      }),
    ],
    [filters.sortBy, filters.sortOrder, handleSort, onViewDetails, onEdit, onAdmit, onReject, onArchive, canUpdate, canArchive, router],
  );

  const table = useReactTable({
    data: students,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
  });

  return (
    <div className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm overflow-hidden" data-testid="student-operational-table">
      {/* Operational Toolbar */}
      <OperationalTableToolbar
        searchQuery={filters.search}
        onSearchChange={(val) => updateFilter('search', val)}
        searchPlaceholder="Search students by name or admission no..."
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearFilters}
        totalCount={total}
        resourceName="students"
      >
        {/* Status Filter Dropdown */}
        <select
          value={filters.status}
          onChange={(e) => updateFilter('status', e.target.value)}
          aria-label="Filter by Standing Status"
          data-testid="student-status-filter"
          className="min-h-[44px] rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 text-xs text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
        >
          <option value="">All Standing Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="archived">Archived</option>
        </select>

        {/* Admission Status Filter Dropdown */}
        <select
          value={filters.admissionStatus}
          onChange={(e) => updateFilter('admissionStatus', e.target.value)}
          aria-label="Filter by Admission Status"
          data-testid="student-admission-status-filter"
          className="min-h-[44px] rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 text-xs text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
        >
          <option value="">All Admission Statuses</option>
          <option value="admitted">Admitted</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
          <option value="cancelled">Cancelled</option>
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
      {!isLoading && !isError && students.length === 0 && (
        <OperationalTableEmpty
          isFiltered={hasActiveFilters}
          resourceName="students"
          onClearFilters={clearFilters}
        />
      )}

      {/* Data Table */}
      {!isLoading && !isError && students.length > 0 && (
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
                  data-testid={`student-table-row-${row.original.id}`}
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
