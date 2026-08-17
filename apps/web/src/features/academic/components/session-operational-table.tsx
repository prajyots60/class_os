'use client';

import * as React from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import { Badge } from '@coaching-os/ui';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import {
  OperationalTableToolbar,
  OperationalTablePagination,
  OperationalTableSkeleton,
  OperationalTableEmpty,
  OperationalTableError,
} from '../../shared/components/operational-table';
import { useSessionsTable } from '../hooks/use-sessions-table';

export interface SessionRowItem {
  id: string;
  batchId: string;
  batchName: string;
  batchCode: string;
  subjectName?: string;
  teacherName?: string;
  dateIso: string;
  timeRange: string;
  status: string;
  attendanceTaken: boolean;
}

const columnHelper = createColumnHelper<SessionRowItem>();

export function SessionOperationalTable() {
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
  } = useSessionsTable();

  const sessions: SessionRowItem[] = React.useMemo(() => {
    if (!apiResponse?.data) return [];
    return apiResponse.data.map((item: Record<string, unknown>) => ({
      id: String(item.id || ''),
      batchId: String(item.batchId || ''),
      batchName: String(item.batchName || 'Batch'),
      batchCode: String(item.batchCode || ''),
      subjectName: String(item.subjectName || '—'),
      teacherName: String(item.teacherName || '—'),
      dateIso: String(item.dateIso || (item.date ? new Date(String(item.date)).toISOString().split('T')[0] : '—')),
      timeRange: item.startTime && item.endTime ? `${String(item.startTime)} - ${String(item.endTime)}` : String(item.startTime || '—'),
      status: String(item.status || 'scheduled'),
      attendanceTaken: Boolean(item.attendanceTaken),
    }));
  }, [apiResponse]);


  const total = apiResponse?.meta?.total ?? sessions.length;
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
      columnHelper.accessor('dateIso', {
        header: () => (
          <button
            type="button"
            onClick={() => handleSort('date')}
            className="flex items-center space-x-1 font-semibold text-xs uppercase text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] rounded px-1 min-h-[44px]"
            aria-label="Sort by Session Date"
          >
            <span>Session Date</span>
            {filters.sortBy === 'date' ? (
              filters.sortOrder === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />
            ) : (
              <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />
            )}
          </button>
        ),
        cell: (info) => (
          <div className="flex flex-col">
            <span className="font-semibold text-xs text-[hsl(var(--foreground))]">{info.getValue()}</span>
            <span className="text-[11px] text-[hsl(var(--muted-foreground))]">{info.row.original.timeRange}</span>
          </div>
        ),
      }),

      columnHelper.accessor('batchName', {
        header: 'Batch',
        cell: (info) => (
          <div className="flex flex-col">
            <span className="font-semibold text-xs text-[hsl(var(--foreground))] truncate max-w-[180px]">
              {info.getValue()}
            </span>
            <span className="text-[11px] text-[hsl(var(--muted-foreground))]">Code: {info.row.original.batchCode}</span>
          </div>
        ),
      }),

      columnHelper.accessor('subjectName', {
        header: 'Subject',
        cell: (info) => <span className="text-xs text-[hsl(var(--muted-foreground))]">{info.getValue()}</span>,
      }),

      columnHelper.accessor('teacherName', {
        header: 'Teacher',
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
            <span>Session Status</span>
            {filters.sortBy === 'status' ? (
              filters.sortOrder === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />
            ) : (
              <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />
            )}
          </button>
        ),
        cell: (info) => {
          const s = info.getValue();
          const variant = s === 'completed' ? 'default' : s === 'scheduled' ? 'secondary' : 'outline';
          return (
            <Badge variant={variant} className="text-[10px] uppercase font-semibold">
              {s}
            </Badge>
          );
        },
      }),

      columnHelper.accessor('attendanceTaken', {
        header: 'Attendance',
        cell: (info) => {
          const taken = info.getValue();
          return (
            <Badge variant={taken ? 'default' : 'outline'} className="text-[10px] uppercase font-semibold">
              {taken ? 'Taken' : 'Pending'}
            </Badge>
          );
        },
      }),
    ],
    [filters.sortBy, filters.sortOrder, handleSort],
  );

  const table = useReactTable({
    data: sessions,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
  });

  return (
    <div className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm overflow-hidden" data-testid="session-operational-table">
      {/* Operational Toolbar */}
      <OperationalTableToolbar
        searchQuery={filters.search}
        onSearchChange={(val) => updateFilter('search', val)}
        searchPlaceholder="Search sessions by batch or subject name..."
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearFilters}
        totalCount={total}
        resourceName="sessions"
      >
        {/* Status Filter Dropdown */}
        <select
          value={filters.status}
          onChange={(e) => updateFilter('status', e.target.value)}
          aria-label="Filter by Session Status"
          data-testid="session-status-filter"
          className="min-h-[44px] rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 text-xs text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
        >
          <option value="">All Session Statuses</option>
          <option value="scheduled">Scheduled</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>

        {/* Attendance Status Filter Dropdown */}
        <select
          value={filters.attendanceStatus}
          onChange={(e) => updateFilter('attendanceStatus', e.target.value)}
          aria-label="Filter by Attendance Status"
          data-testid="session-attendance-status-filter"
          className="min-h-[44px] rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 text-xs text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
        >
          <option value="">All Attendance States</option>
          <option value="taken">Attendance Taken</option>
          <option value="pending">Attendance Pending</option>
        </select>
      </OperationalTableToolbar>

      {/* Loading State */}
      {isLoading && <OperationalTableSkeleton rows={5} columns={6} />}

      {/* Error State */}
      {isError && (
        <OperationalTableError
          message={(error as Error)?.message}
          onRetry={() => refetch()}
        />
      )}

      {/* Empty / Filtered-Empty State */}
      {!isLoading && !isError && sessions.length === 0 && (
        <OperationalTableEmpty
          isFiltered={hasActiveFilters}
          resourceName="sessions"
          onClearFilters={clearFilters}
        />
      )}

      {/* Data Table */}
      {!isLoading && !isError && sessions.length > 0 && (
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
                  data-testid={`session-table-row-${row.original.id}`}
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
