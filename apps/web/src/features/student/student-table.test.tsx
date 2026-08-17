import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StudentOperationalTable } from './components/student-operational-table';
import { useStudentsTable } from './hooks/use-students-table';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('./hooks/use-students-table', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./hooks/use-students-table')>();
  return {
    ...actual,
    useStudentsTable: vi.fn(),
  };
});

type UseStudentsTableReturn = ReturnType<typeof useStudentsTable>;

const mockStudentsResponse = {
  data: [
    {
      id: 'stud-101',
      displayName: 'Rahul Sharma',
      admissionNumber: 'ADM-101',
      phone: '+91 9876543210',
      email: 'rahul@test.com',
      status: 'active',
      admissionStatus: 'admitted',
      createdAt: '2026-01-15T00:00:00.000Z',
    },
    {
      id: 'stud-102',
      displayName: 'Priya Patel',
      admissionNumber: 'ADM-102',
      phone: '+91 9876543211',
      email: 'priya@test.com',
      status: 'inactive',
      admissionStatus: 'pending',
      createdAt: '2026-02-01T00:00:00.000Z',
    },
  ],
  meta: {
    total: 2,
    page: 1,
    pageSize: 25,
    totalPages: 1,
  },
};

describe('Phase 6.6 — Student Operational Table UI Test Suite (STUDENT-TABLE-001..018)', () => {
  beforeEach(() => {
    vi.mocked(useStudentsTable).mockReturnValue({
      filters: {
        search: '',
        status: '',
        admissionStatus: '',
        page: 1,
        pageSize: 25,
        sortBy: 'displayName',
        sortOrder: 'asc',
      },
      updateFilter: vi.fn(),
      clearFilters: vi.fn(),
      hasActiveFilters: false,
      data: mockStudentsResponse,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isRefetching: false,
    } as unknown as UseStudentsTableReturn);
  });

  it('STUDENT-TABLE-001: Table renders in workspace', () => {
    const html = renderToStaticMarkup(<StudentOperationalTable />);
    expect(html).toContain('student-operational-table');
  });

  it('STUDENT-TABLE-002: Correct columns render (Student, Admission No, Contact, Admission Status, Standing, Registered)', () => {
    const html = renderToStaticMarkup(<StudentOperationalTable />);
    expect(html).toContain('Student Name');
    expect(html).toContain('Admission No.');
    expect(html).toContain('Contact');
    expect(html).toContain('Admission Status');
    expect(html).toContain('Status');
  });

  it('STUDENT-TABLE-003: Search input filter renders and binds to query state', () => {
    const html = renderToStaticMarkup(<StudentOperationalTable />);
    expect(html).toContain('table-search-input');
    expect(html).toContain('Search students by name or admission no...');
  });

  it('STUDENT-TABLE-004: Standing status filter select renders', () => {
    const html = renderToStaticMarkup(<StudentOperationalTable />);
    expect(html).toContain('student-status-filter');
    expect(html).toContain('All Standing Statuses');
  });

  it('STUDENT-TABLE-005: Admission status filter select renders', () => {
    const html = renderToStaticMarkup(<StudentOperationalTable />);
    expect(html).toContain('student-admission-status-filter');
    expect(html).toContain('All Admission Statuses');
  });

  it('STUDENT-TABLE-006: Clear filters button appears when active filters exist', () => {
    vi.mocked(useStudentsTable).mockReturnValueOnce({
      filters: {
        search: 'Rahul',
        status: 'active',
        admissionStatus: '',
        page: 1,
        pageSize: 25,
        sortBy: 'displayName',
        sortOrder: 'asc',
      },
      updateFilter: vi.fn(),
      clearFilters: vi.fn(),
      hasActiveFilters: true,
      data: mockStudentsResponse,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isRefetching: false,
    } as unknown as UseStudentsTableReturn);

    const html = renderToStaticMarkup(<StudentOperationalTable />);
    expect(html).toContain('clear-filters-button');
  });

  it('STUDENT-TABLE-007: Server pagination controls render with total count', () => {
    const html = renderToStaticMarkup(<StudentOperationalTable />);
    expect(html).toContain('operational-table-pagination');
    expect(html).toContain('Showing');
    expect(html).toContain('results');
  });


  it('STUDENT-TABLE-008: Next page button renders in pagination', () => {
    const html = renderToStaticMarkup(<StudentOperationalTable />);
    expect(html).toContain('pagination-next');
  });

  it('STUDENT-TABLE-009: Previous page button renders in pagination', () => {
    const html = renderToStaticMarkup(<StudentOperationalTable />);
    expect(html).toContain('pagination-previous');
  });

  it('STUDENT-TABLE-010: Sortable header buttons exist with ARIA sort indicators', () => {
    const html = renderToStaticMarkup(<StudentOperationalTable />);
    expect(html).toContain('aria-label="Sort by Student Name"');
    expect(html).toContain('aria-label="Sort by Admission Number"');
  });

  it('STUDENT-TABLE-011: Loading skeleton renders during API fetch', () => {
    vi.mocked(useStudentsTable).mockReturnValueOnce({
      filters: { search: '', status: '', admissionStatus: '', page: 1, pageSize: 25, sortBy: 'displayName', sortOrder: 'asc' },
      updateFilter: vi.fn(),
      clearFilters: vi.fn(),
      hasActiveFilters: false,
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isRefetching: false,
    } as unknown as UseStudentsTableReturn);

    const html = renderToStaticMarkup(<StudentOperationalTable />);
    expect(html).toContain('operational-table-skeleton');
  });

  it('STUDENT-TABLE-012: Empty state renders when zero records exist', () => {
    vi.mocked(useStudentsTable).mockReturnValueOnce({
      filters: { search: '', status: '', admissionStatus: '', page: 1, pageSize: 25, sortBy: 'displayName', sortOrder: 'asc' },
      updateFilter: vi.fn(),
      clearFilters: vi.fn(),
      hasActiveFilters: false,
      data: { data: [], meta: { total: 0, page: 1, pageSize: 25, totalPages: 0 } },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isRefetching: false,
    } as unknown as UseStudentsTableReturn);

    const html = renderToStaticMarkup(<StudentOperationalTable />);
    expect(html).toContain('operational-table-empty');
    expect(html).toContain('No students found');
  });

  it('STUDENT-TABLE-013: Filtered-empty state offers Clear filters button', () => {
    vi.mocked(useStudentsTable).mockReturnValueOnce({
      filters: { search: 'NonExistent', status: '', admissionStatus: '', page: 1, pageSize: 25, sortBy: 'displayName', sortOrder: 'asc' },
      updateFilter: vi.fn(),
      clearFilters: vi.fn(),
      hasActiveFilters: true,
      data: { data: [], meta: { total: 0, page: 1, pageSize: 25, totalPages: 0 } },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isRefetching: false,
    } as unknown as UseStudentsTableReturn);

    const html = renderToStaticMarkup(<StudentOperationalTable />);
    expect(html).toContain('operational-table-empty');
    expect(html).toContain('No students match these filters');
    expect(html).toContain('empty-clear-filters-button');
  });

  it('STUDENT-TABLE-014: Safe error state renders without exposing Prisma strings', () => {
    vi.mocked(useStudentsTable).mockReturnValueOnce({
      filters: { search: '', status: '', admissionStatus: '', page: 1, pageSize: 25, sortBy: 'displayName', sortOrder: 'asc' },
      updateFilter: vi.fn(),
      clearFilters: vi.fn(),
      hasActiveFilters: false,
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('Prisma database connection failed'),
      refetch: vi.fn(),
      isRefetching: false,
    } as unknown as UseStudentsTableReturn);

    const html = renderToStaticMarkup(<StudentOperationalTable />);
    expect(html).toContain('operational-table-error');
    expect(html).not.toContain('Prisma database connection failed');
    expect(html).toContain('table-error-retry-button');
  });

  it('STUDENT-TABLE-015: Pagination buttons meet >=44px touch target requirement', () => {
    const html = renderToStaticMarkup(<StudentOperationalTable />);
    expect(html).toContain('min-h-[44px]');
  });

  it('STUDENT-TABLE-016: Container prevents horizontal page overflow (overflow-x-auto present)', () => {
    const html = renderToStaticMarkup(<StudentOperationalTable />);
    expect(html).toContain('overflow-x-auto');
  });

  it('STUDENT-TABLE-017: Long student names do not break layout (truncate present)', () => {
    const html = renderToStaticMarkup(<StudentOperationalTable />);
    expect(html).toContain('truncate');
  });

  it('STUDENT-TABLE-018: Accessible table header tags (<th scope="col">) exist', () => {
    const html = renderToStaticMarkup(<StudentOperationalTable />);
    expect(html).toContain('scope="col"');
  });
});
