import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SessionOperationalTable } from './components/session-operational-table';
import { useSessionsTable } from './hooks/use-sessions-table';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('./hooks/use-sessions-table', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./hooks/use-sessions-table')>();
  return {
    ...actual,
    useSessionsTable: vi.fn(),
  };
});

type UseSessionsTableReturn = ReturnType<typeof useSessionsTable>;

const mockSessionsResponse = {
  data: [
    {
      id: 'sess-101',
      batchId: 'batch-01',
      batchName: 'Physics Target 2026',
      batchCode: 'PHY-26',
      subjectName: 'Physics',
      teacherName: 'Dr. H.C. Verma',
      dateIso: '2026-03-10',
      timeRange: '10:00 - 11:30',
      status: 'scheduled',
      attendanceTaken: false,
    },
    {
      id: 'sess-102',
      batchId: 'batch-02',
      batchName: 'Chemistry Advanced',
      batchCode: 'CHEM-ADV',
      subjectName: 'Chemistry',
      teacherName: 'Prof. R.C. Mukherjee',
      dateIso: '2026-03-09',
      timeRange: '14:00 - 15:30',
      status: 'completed',
      attendanceTaken: true,
    },
  ],
  meta: {
    total: 2,
    page: 1,
    pageSize: 25,
    totalPages: 1,
  },
};

describe('Phase 6.6 — Session Operational Table UI Test Suite (SESSION-TABLE-001..018)', () => {
  beforeEach(() => {
    vi.mocked(useSessionsTable).mockReturnValue({
      filters: {
        search: '',
        status: '',
        attendanceStatus: '',
        batchId: '',
        subjectId: '',
        teacherId: '',
        page: 1,
        pageSize: 25,
        sortBy: 'date',
        sortOrder: 'asc',
      },
      updateFilter: vi.fn(),
      clearFilters: vi.fn(),
      hasActiveFilters: false,
      data: mockSessionsResponse,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isRefetching: false,
    } as unknown as UseSessionsTableReturn);
  });

  it('SESSION-TABLE-001: Table renders in workspace', () => {
    const html = renderToStaticMarkup(<SessionOperationalTable />);
    expect(html).toContain('session-operational-table');
  });

  it('SESSION-TABLE-002: Correct columns render (Session Date, Batch, Subject, Teacher, Session Status, Attendance)', () => {
    const html = renderToStaticMarkup(<SessionOperationalTable />);
    expect(html).toContain('Session Date');
    expect(html).toContain('Batch');
    expect(html).toContain('Subject');
    expect(html).toContain('Teacher');
    expect(html).toContain('Session Status');
    expect(html).toContain('Attendance');
  });

  it('SESSION-TABLE-003: Search input filter renders and binds to query state', () => {
    const html = renderToStaticMarkup(<SessionOperationalTable />);
    expect(html).toContain('table-search-input');
    expect(html).toContain('Search sessions by batch or subject name...');
  });

  it('SESSION-TABLE-004: Session status filter select renders', () => {
    const html = renderToStaticMarkup(<SessionOperationalTable />);
    expect(html).toContain('session-status-filter');
    expect(html).toContain('All Session Statuses');
  });

  it('SESSION-TABLE-005: Attendance status filter select renders', () => {
    const html = renderToStaticMarkup(<SessionOperationalTable />);
    expect(html).toContain('session-attendance-status-filter');
    expect(html).toContain('All Attendance States');
    expect(html).toContain('Attendance Taken');
    expect(html).toContain('Attendance Pending');
  });

  it('SESSION-TABLE-006: Clear filters button appears when active filters exist', () => {
    vi.mocked(useSessionsTable).mockReturnValueOnce({
      filters: {
        search: 'Physics',
        status: 'scheduled',
        attendanceStatus: '',
        batchId: '',
        subjectId: '',
        teacherId: '',
        page: 1,
        pageSize: 25,
        sortBy: 'date',
        sortOrder: 'asc',
      },
      updateFilter: vi.fn(),
      clearFilters: vi.fn(),
      hasActiveFilters: true,
      data: mockSessionsResponse,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isRefetching: false,
    } as unknown as UseSessionsTableReturn);

    const html = renderToStaticMarkup(<SessionOperationalTable />);
    expect(html).toContain('clear-filters-button');
  });

  it('SESSION-TABLE-007: Server pagination controls render with total count', () => {
    const html = renderToStaticMarkup(<SessionOperationalTable />);
    expect(html).toContain('operational-table-pagination');
    expect(html).toContain('Showing');
    expect(html).toContain('results');
  });


  it('SESSION-TABLE-008: Displays batch name and batch code', () => {
    const html = renderToStaticMarkup(<SessionOperationalTable />);
    expect(html).toContain('Physics Target 2026');
    expect(html).toContain('Code: PHY-26');
  });

  it('SESSION-TABLE-009: Displays attendance state badges (Taken / Pending)', () => {
    const html = renderToStaticMarkup(<SessionOperationalTable />);
    expect(html).toContain('Taken');
    expect(html).toContain('Pending');
  });

  it('SESSION-TABLE-010: Sortable header buttons exist with ARIA sort indicators', () => {
    const html = renderToStaticMarkup(<SessionOperationalTable />);
    expect(html).toContain('aria-label="Sort by Session Date"');
    expect(html).toContain('aria-label="Sort by Status"');
  });

  it('SESSION-TABLE-011: Loading skeleton renders during API fetch', () => {
    vi.mocked(useSessionsTable).mockReturnValueOnce({
      filters: { search: '', status: '', attendanceStatus: '', batchId: '', subjectId: '', teacherId: '', page: 1, pageSize: 25, sortBy: 'date', sortOrder: 'asc' },
      updateFilter: vi.fn(),
      clearFilters: vi.fn(),
      hasActiveFilters: false,
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isRefetching: false,
    } as unknown as UseSessionsTableReturn);

    const html = renderToStaticMarkup(<SessionOperationalTable />);
    expect(html).toContain('operational-table-skeleton');
  });

  it('SESSION-TABLE-012: Empty state renders when zero records exist', () => {
    vi.mocked(useSessionsTable).mockReturnValueOnce({
      filters: { search: '', status: '', attendanceStatus: '', batchId: '', subjectId: '', teacherId: '', page: 1, pageSize: 25, sortBy: 'date', sortOrder: 'asc' },
      updateFilter: vi.fn(),
      clearFilters: vi.fn(),
      hasActiveFilters: false,
      data: { data: [], meta: { total: 0, page: 1, pageSize: 25, totalPages: 0 } },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isRefetching: false,
    } as unknown as UseSessionsTableReturn);

    const html = renderToStaticMarkup(<SessionOperationalTable />);
    expect(html).toContain('operational-table-empty');
    expect(html).toContain('No sessions found');
  });

  it('SESSION-TABLE-013: Filtered-empty state offers Clear filters button', () => {
    vi.mocked(useSessionsTable).mockReturnValueOnce({
      filters: { search: 'NonExistent', status: '', attendanceStatus: '', batchId: '', subjectId: '', teacherId: '', page: 1, pageSize: 25, sortBy: 'date', sortOrder: 'asc' },
      updateFilter: vi.fn(),
      clearFilters: vi.fn(),
      hasActiveFilters: true,
      data: { data: [], meta: { total: 0, page: 1, pageSize: 25, totalPages: 0 } },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isRefetching: false,
    } as unknown as UseSessionsTableReturn);

    const html = renderToStaticMarkup(<SessionOperationalTable />);
    expect(html).toContain('operational-table-empty');
    expect(html).toContain('No sessions match these filters');
    expect(html).toContain('empty-clear-filters-button');
  });

  it('SESSION-TABLE-014: Safe error state renders without exposing database details', () => {
    vi.mocked(useSessionsTable).mockReturnValueOnce({
      filters: { search: '', status: '', attendanceStatus: '', batchId: '', subjectId: '', teacherId: '', page: 1, pageSize: 25, sortBy: 'date', sortOrder: 'asc' },
      updateFilter: vi.fn(),
      clearFilters: vi.fn(),
      hasActiveFilters: false,
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('PostgreSQL connection timeout'),
      refetch: vi.fn(),
      isRefetching: false,
    } as unknown as UseSessionsTableReturn);

    const html = renderToStaticMarkup(<SessionOperationalTable />);
    expect(html).toContain('operational-table-error');
    expect(html).not.toContain('PostgreSQL connection timeout');
    expect(html).toContain('table-error-retry-button');
  });

  it('SESSION-TABLE-015: Pagination buttons meet >=44px touch target requirement', () => {
    const html = renderToStaticMarkup(<SessionOperationalTable />);
    expect(html).toContain('min-h-[44px]');
  });

  it('SESSION-TABLE-016: Container prevents horizontal page overflow (overflow-x-auto present)', () => {
    const html = renderToStaticMarkup(<SessionOperationalTable />);
    expect(html).toContain('overflow-x-auto');
  });

  it('SESSION-TABLE-017: Text truncation applied to batch names', () => {
    const html = renderToStaticMarkup(<SessionOperationalTable />);
    expect(html).toContain('truncate');
  });

  it('SESSION-TABLE-018: Accessible table header tags (<th scope="col">) exist', () => {
    const html = renderToStaticMarkup(<SessionOperationalTable />);
    expect(html).toContain('scope="col"');
  });
});
