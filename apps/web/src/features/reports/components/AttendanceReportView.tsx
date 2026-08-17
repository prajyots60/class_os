import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Input, Skeleton } from '@coaching-os/ui';
import { Search, CalendarCheck, CheckCircle2, Clock, Users, RotateCcw } from 'lucide-react';
import type { AttendanceReportResponseDTO } from '@coaching-os/administration';

export interface AttendanceReportViewProps {
  data: AttendanceReportResponseDTO | null;
  loading: boolean;
  error: string | null;
  from: string;
  to: string;
  search: string;
  page: number;
  onFromChange: (val: string) => void;
  onToChange: (val: string) => void;
  onSearchChange: (val: string) => void;
  onPageChange: (page: number) => void;
  onClearFilters: () => void;
  onRetry: () => void;
}

export function AttendanceReportView({
  data,
  loading,
  error,
  from,
  to,
  search,
  page,
  onFromChange,
  onToChange,
  onSearchChange,
  onPageChange,
  onClearFilters,
  onRetry,
}: AttendanceReportViewProps) {
  const summary = data?.summary;
  const rows = data?.data || [];
  const meta = data?.meta || { total: 0, page: 1, pageSize: 25, totalPages: 1 };

  const hasActiveFilters = Boolean(search || from || to);

  return (
    <div className="space-y-6">
      {/* Metric Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-[hsl(var(--border))] bg-[hsl(var(--card))]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              Total Sessions
            </CardTitle>
            <CalendarCheck className="h-4 w-4 text-[hsl(var(--primary))]" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-[hsl(var(--foreground))]">
                {summary?.totalSessions ?? 0}
              </div>
            )}
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">Scheduled in date range</p>
          </CardContent>
        </Card>

        <Card className="border-[hsl(var(--border))] bg-[hsl(var(--card))]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              Completed Sessions
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-[hsl(var(--foreground))]">
                {summary?.completedSessions ?? 0}
              </div>
            )}
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">Attendance marked</p>
          </CardContent>
        </Card>

        <Card className="border-[hsl(var(--border))] bg-[hsl(var(--card))]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              Pending Sessions
            </CardTitle>
            <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-[hsl(var(--foreground))]">
                {summary?.pendingSessions ?? 0}
              </div>
            )}
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">Awaiting attendance</p>
          </CardContent>
        </Card>

        <Card className="border-[hsl(var(--border))] bg-[hsl(var(--card))]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              Attendance Rate
            </CardTitle>
            <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-[hsl(var(--foreground))]">
                {summary?.attendancePercentage ?? 0}%
              </div>
            )}
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
              {summary?.presentCount ?? 0} Present / {summary?.eligibleRecords ?? 0} Total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Report Filter Toolbar */}
      <div className="flex flex-col gap-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor="attendance-from-date" className="text-xs font-medium text-[hsl(var(--muted-foreground))]">From:</label>
            <Input
              id="attendance-from-date"
              type="date"
              className="h-9 w-36 text-xs"
              value={from}
              onChange={(e) => onFromChange(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="attendance-to-date" className="text-xs font-medium text-[hsl(var(--muted-foreground))]">To:</label>
            <Input
              id="attendance-to-date"
              type="date"
              className="h-9 w-36 text-xs"
              value={to}
              onChange={(e) => onToChange(e.target.value)}
            />
          </div>

          <div className="relative min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
            <Input
              type="text"
              placeholder="Search batch or code..."
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
          <p className="text-sm font-medium text-[hsl(var(--foreground))]">No attendance report records found</p>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
            Try adjusting your date range or search query filters.
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
                <th className="px-4 py-3">Batch</th>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">Teacher</th>
                <th className="px-4 py-3 text-center">Present</th>
                <th className="px-4 py-3 text-center">Absent</th>
                <th className="px-4 py-3 text-center">Attendance %</th>
                <th className="px-4 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[hsl(var(--border))]">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-[hsl(var(--muted))/50]">
                  <td className="px-4 py-3 font-medium text-[hsl(var(--foreground))]">{row.dateIso}</td>
                  <td className="px-4 py-3 font-semibold text-[hsl(var(--foreground))]">{row.batchName}</td>
                  <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]">{row.subjectName}</td>
                  <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]">{row.teacherName}</td>
                  <td className="px-4 py-3 text-center font-medium text-emerald-600 dark:text-emerald-400">{row.presentCount}</td>
                  <td className="px-4 py-3 text-center font-medium text-red-600 dark:text-red-400">{row.absentCount}</td>
                  <td className="px-4 py-3 text-center font-bold text-[hsl(var(--foreground))]">
                    {row.attendancePercentage}%
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Badge
                      variant={row.status === 'completed' ? 'default' : 'secondary'}
                      className="text-[10px]"
                    >
                      {row.status === 'completed' ? 'Completed' : 'Scheduled'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Table Pagination */}
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-[hsl(var(--border))] px-4 py-3">
              <span className="text-xs text-[hsl(var(--muted-foreground))]">
                Page {meta.page} of {meta.totalPages} ({meta.total} total sessions)
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
