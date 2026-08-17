'use client';

import * as React from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Button } from '@coaching-os/ui';
import { BarChart3, CalendarCheck, IndianRupee } from 'lucide-react';
import { fetchAttendanceReport, fetchFeeCollectionReport } from '../api/reports-client';
import { AttendanceReportView } from './AttendanceReportView';
import { FeeCollectionReportView } from './FeeCollectionReportView';
import type { AttendanceReportResponseDTO, FeeCollectionReportResponseDTO } from '@coaching-os/administration';

export function ReportsWorkspaceContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // 1. Parse URL State
  const activeTab = (searchParams.get('tab') as 'attendance' | 'fees') || 'attendance';
  const now = React.useMemo(() => new Date(), []);
  const defaultTo = React.useMemo(() => now.toISOString().split('T')[0], [now]);
  const defaultFrom = React.useMemo(
    () => new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    [now]
  );

  const from = searchParams.get('from') || defaultFrom;
  const to = searchParams.get('to') || defaultTo;
  const paymentMode = searchParams.get('paymentMode') || 'all';
  const search = searchParams.get('search') || '';
  const page = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1;

  // 2. Data states
  const [attendanceData, setAttendanceData] = React.useState<AttendanceReportResponseDTO | null>(null);
  const [feeData, setFeeData] = React.useState<FeeCollectionReportResponseDTO | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  // Helper to update URL params
  const updateUrlParams = React.useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, val]) => {
        if (val === null || val === '') params.delete(key);
        else params.set(key, val);
      });
      router.push(`${pathname}?${params.toString()}`);
    },
    [searchParams, router, pathname]
  );

  // Load Data
  const loadReportData = React.useCallback(() => {
    let isCancelled = false;

    async function run() {
      setLoading(true);
      setError(null);

      try {
        if (activeTab === 'attendance') {
          const res = await fetchAttendanceReport({ from, to, search, page, pageSize: 25 });
          if (!isCancelled) setAttendanceData(res);
        } else {
          const res = await fetchFeeCollectionReport({
            from,
            to,
            paymentMode: paymentMode !== 'all' ? paymentMode : undefined,
            search,
            page,
            pageSize: 25,
          });
          if (!isCancelled) setFeeData(res);
        }
      } catch (err: unknown) {
        if (!isCancelled) setError(err instanceof Error ? err.message : 'An error occurred while loading reports.');
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    run();

    return () => {
      isCancelled = true;
    };
  }, [activeTab, from, to, paymentMode, search, page]);

  React.useEffect(() => {
    const cleanup = loadReportData();
    return cleanup;
  }, [loadReportData]);

  const handleTabChange = (tab: 'attendance' | 'fees') => {
    updateUrlParams({ tab, page: '1' });
  };

  const handleClearFilters = () => {
    updateUrlParams({
      from: null,
      to: null,
      paymentMode: null,
      search: null,
      page: '1',
    });
  };

  return (
    <div className="container mx-auto space-y-6 px-4 py-6 max-w-7xl">
      {/* Workspace Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-[hsl(var(--border))] pb-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-[hsl(var(--foreground))]">
            <BarChart3 className="h-6 w-6 text-[hsl(var(--primary))]" />
            Operational Reports Workspace
          </h1>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
            Fast, on-screen interactive operational reports for attendance activity and fee collections.
          </p>
        </div>

        {/* Tab Navigation Controls */}
        <div className="flex items-center gap-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted))] p-1">
          <Button
            variant={activeTab === 'attendance' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleTabChange('attendance')}
            className="h-9 min-h-[44px] text-xs font-medium"
          >
            <CalendarCheck className="mr-1.5 h-4 w-4" />
            Attendance Reports
          </Button>
          <Button
            variant={activeTab === 'fees' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleTabChange('fees')}
            className="h-9 min-h-[44px] text-xs font-medium"
          >
            <IndianRupee className="mr-1.5 h-4 w-4" />
            Fee Collection Reports
          </Button>
        </div>
      </div>

      {/* Active Tab View Content */}
      {activeTab === 'attendance' ? (
        <AttendanceReportView
          data={attendanceData}
          loading={loading}
          error={error}
          from={from}
          to={to}
          search={search}
          page={page}
          onFromChange={(val) => updateUrlParams({ from: val, page: '1' })}
          onToChange={(val) => updateUrlParams({ to: val, page: '1' })}
          onSearchChange={(val) => updateUrlParams({ search: val, page: '1' })}
          onPageChange={(p) => updateUrlParams({ page: String(p) })}
          onClearFilters={handleClearFilters}
          onRetry={loadReportData}
        />
      ) : (
        <FeeCollectionReportView
          data={feeData}
          loading={loading}
          error={error}
          from={from}
          to={to}
          paymentMode={paymentMode}
          search={search}
          page={page}
          onFromChange={(val) => updateUrlParams({ from: val, page: '1' })}
          onToChange={(val) => updateUrlParams({ to: val, page: '1' })}
          onPaymentModeChange={(val) => updateUrlParams({ paymentMode: val, page: '1' })}
          onSearchChange={(val) => updateUrlParams({ search: val, page: '1' })}
          onPageChange={(p) => updateUrlParams({ page: String(p) })}
          onClearFilters={handleClearFilters}
          onRetry={loadReportData}
        />
      )}
    </div>
  );
}

export function ReportsWorkspace() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-xs text-[hsl(var(--muted-foreground))]">Loading reports workspace...</div>}>
      <ReportsWorkspaceContent />
    </React.Suspense>
  );
}
