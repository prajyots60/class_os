import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { InvoiceOperationalTable } from './components/invoice-operational-table';
import { useInvoicesTable } from './hooks/use-invoices-table';

vi.mock('./hooks/use-invoices-table', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./hooks/use-invoices-table')>();
  return {
    ...actual,
    useInvoicesTable: vi.fn(),
  };
});

type UseInvoicesTableReturn = ReturnType<typeof useInvoicesTable>;

const mockInvoicesResponse = {
  data: [
    {
      id: 'inv-10101010-1010-1010-1010-101010101010',
      invoiceNumber: 'INV-10101010',
      studentId: 'stud-101',
      studentName: 'Rahul Sharma',
      admissionNumber: 'ADM-101',
      amount: 15000,
      paidAmount: 15000,
      outstandingAmount: 0,
      dueDateIso: '2026-03-01',
      status: 'paid',
      createdAtIso: '2026-02-01',
    },
    {
      id: 'inv-20202020-2020-2020-2020-202020202020',
      invoiceNumber: 'INV-20202020',
      studentId: 'stud-102',
      studentName: 'Priya Patel',
      admissionNumber: 'ADM-102',
      amount: 20000,
      paidAmount: 5000,
      outstandingAmount: 15000,
      dueDateIso: '2026-02-15',
      status: 'partial',
      createdAtIso: '2026-02-01',
    },
  ],
  meta: {
    total: 2,
    page: 1,
    pageSize: 25,
    totalPages: 1,
  },
};

describe('Phase 6.6 — Invoice Operational Table UI Test Suite (INVOICE-TABLE-001..018)', () => {
  beforeEach(() => {
    vi.mocked(useInvoicesTable).mockReturnValue({
      filters: {
        search: '',
        status: '',
        overdue: undefined,
        page: 1,
        pageSize: 25,
        sortBy: 'dueDate',
        sortOrder: 'desc',
      },
      updateFilter: vi.fn(),
      clearFilters: vi.fn(),
      hasActiveFilters: false,
      data: mockInvoicesResponse,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isRefetching: false,
    } as unknown as UseInvoicesTableReturn);
  });

  it('INVOICE-TABLE-001: Table renders in workspace', () => {
    const html = renderToStaticMarkup(<InvoiceOperationalTable />);
    expect(html).toContain('invoice-operational-table');
  });

  it('INVOICE-TABLE-002: Correct columns render (Invoice Number, Student, Total Amount, Paid Amount, Due Date, Status)', () => {
    const html = renderToStaticMarkup(<InvoiceOperationalTable />);
    expect(html).toContain('Invoice Number');
    expect(html).toContain('Student');
    expect(html).toContain('Total Amount');
    expect(html).toContain('Paid Amount');
    expect(html).toContain('Due Date');
    expect(html).toContain('Status');
  });

  it('INVOICE-TABLE-003: Search input filter renders and binds to query state', () => {
    const html = renderToStaticMarkup(<InvoiceOperationalTable />);
    expect(html).toContain('table-search-input');
    expect(html).toContain('Search invoices by student name or ID...');
  });

  it('INVOICE-TABLE-004: Payment status filter select renders', () => {
    const html = renderToStaticMarkup(<InvoiceOperationalTable />);
    expect(html).toContain('invoice-status-filter');
    expect(html).toContain('All Payment Statuses');
  });

  it('INVOICE-TABLE-005: Overdue filter select renders', () => {
    const html = renderToStaticMarkup(<InvoiceOperationalTable />);
    expect(html).toContain('invoice-overdue-filter');
    expect(html).toContain('All Due Dates');
    expect(html).toContain('Overdue Only');
  });

  it('INVOICE-TABLE-006: Clear filters button appears when active filters exist', () => {
    vi.mocked(useInvoicesTable).mockReturnValueOnce({
      filters: {
        search: 'Rahul',
        status: 'paid',
        overdue: undefined,
        page: 1,
        pageSize: 25,
        sortBy: 'dueDate',
        sortOrder: 'desc',
      },
      updateFilter: vi.fn(),
      clearFilters: vi.fn(),
      hasActiveFilters: true,
      data: mockInvoicesResponse,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isRefetching: false,
    } as unknown as UseInvoicesTableReturn);

    const html = renderToStaticMarkup(<InvoiceOperationalTable />);
    expect(html).toContain('clear-filters-button');
  });

  it('INVOICE-TABLE-007: Server pagination controls render with total count', () => {
    const html = renderToStaticMarkup(<InvoiceOperationalTable />);
    expect(html).toContain('operational-table-pagination');
    expect(html).toContain('Showing');
    expect(html).toContain('results');
  });


  it('INVOICE-TABLE-008: Formats amounts in INR currency (₹15,000)', () => {
    const html = renderToStaticMarkup(<InvoiceOperationalTable />);
    expect(html).toContain('₹15,000');
  });

  it('INVOICE-TABLE-009: Displays invoice numbers with mono formatting', () => {
    const html = renderToStaticMarkup(<InvoiceOperationalTable />);
    expect(html).toContain('INV-10101010');
    expect(html).toContain('font-mono');
  });

  it('INVOICE-TABLE-010: Sortable header buttons exist with ARIA sort indicators', () => {
    const html = renderToStaticMarkup(<InvoiceOperationalTable />);
    expect(html).toContain('aria-label="Sort by Amount"');
    expect(html).toContain('aria-label="Sort by Due Date"');
  });

  it('INVOICE-TABLE-011: Loading skeleton renders during API fetch', () => {
    vi.mocked(useInvoicesTable).mockReturnValueOnce({
      filters: { search: '', status: '', overdue: undefined, page: 1, pageSize: 25, sortBy: 'dueDate', sortOrder: 'desc' },
      updateFilter: vi.fn(),
      clearFilters: vi.fn(),
      hasActiveFilters: false,
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isRefetching: false,
    } as unknown as UseInvoicesTableReturn);

    const html = renderToStaticMarkup(<InvoiceOperationalTable />);
    expect(html).toContain('operational-table-skeleton');
  });

  it('INVOICE-TABLE-012: Empty state renders when zero records exist', () => {
    vi.mocked(useInvoicesTable).mockReturnValueOnce({
      filters: { search: '', status: '', overdue: undefined, page: 1, pageSize: 25, sortBy: 'dueDate', sortOrder: 'desc' },
      updateFilter: vi.fn(),
      clearFilters: vi.fn(),
      hasActiveFilters: false,
      data: { data: [], meta: { total: 0, page: 1, pageSize: 25, totalPages: 0 } },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isRefetching: false,
    } as unknown as UseInvoicesTableReturn);

    const html = renderToStaticMarkup(<InvoiceOperationalTable />);
    expect(html).toContain('operational-table-empty');
    expect(html).toContain('No invoices found');
  });

  it('INVOICE-TABLE-013: Filtered-empty state offers Clear filters button', () => {
    vi.mocked(useInvoicesTable).mockReturnValueOnce({
      filters: { search: 'NonExistent', status: '', overdue: undefined, page: 1, pageSize: 25, sortBy: 'dueDate', sortOrder: 'desc' },
      updateFilter: vi.fn(),
      clearFilters: vi.fn(),
      hasActiveFilters: true,
      data: { data: [], meta: { total: 0, page: 1, pageSize: 25, totalPages: 0 } },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isRefetching: false,
    } as unknown as UseInvoicesTableReturn);

    const html = renderToStaticMarkup(<InvoiceOperationalTable />);
    expect(html).toContain('operational-table-empty');
    expect(html).toContain('No invoices match these filters');
    expect(html).toContain('empty-clear-filters-button');
  });

  it('INVOICE-TABLE-014: Safe error state renders without exposing database details', () => {
    vi.mocked(useInvoicesTable).mockReturnValueOnce({
      filters: { search: '', status: '', overdue: undefined, page: 1, pageSize: 25, sortBy: 'dueDate', sortOrder: 'desc' },
      updateFilter: vi.fn(),
      clearFilters: vi.fn(),
      hasActiveFilters: false,
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('SQL syntax error in query'),
      refetch: vi.fn(),
      isRefetching: false,
    } as unknown as UseInvoicesTableReturn);

    const html = renderToStaticMarkup(<InvoiceOperationalTable />);
    expect(html).toContain('operational-table-error');
    expect(html).not.toContain('SQL syntax error');
    expect(html).toContain('table-error-retry-button');
  });

  it('INVOICE-TABLE-015: Pagination buttons meet >=44px touch target requirement', () => {
    const html = renderToStaticMarkup(<InvoiceOperationalTable />);
    expect(html).toContain('min-h-[44px]');
  });

  it('INVOICE-TABLE-016: Container prevents horizontal page overflow (overflow-x-auto present)', () => {
    const html = renderToStaticMarkup(<InvoiceOperationalTable />);
    expect(html).toContain('overflow-x-auto');
  });

  it('INVOICE-TABLE-017: Text truncation applied to student names', () => {
    const html = renderToStaticMarkup(<InvoiceOperationalTable />);
    expect(html).toContain('truncate');
  });

  it('INVOICE-TABLE-018: Accessible table header tags (<th scope="col">) exist', () => {
    const html = renderToStaticMarkup(<InvoiceOperationalTable />);
    expect(html).toContain('scope="col"');
  });
});
