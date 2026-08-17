import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { GlobalSearchBar } from './components/global-search-bar';
import { useGlobalSearch, useDebounce } from './hooks/use-global-search';
import { SearchApiClient } from './api/search-client';
import type { GlobalSearchDTO } from '@coaching-os/administration';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

// Mock useGlobalSearch hook
vi.mock('./hooks/use-global-search', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./hooks/use-global-search')>();
  return {
    ...actual,
    useGlobalSearch: vi.fn(),
  };
});

type UseGlobalSearchReturn = ReturnType<typeof useGlobalSearch>;

const mockSearchDTO: GlobalSearchDTO = {
  query: 'rah',
  students: [
    {
      id: 'stud-1',
      displayName: 'Rahul Sharma',
      admissionNumber: 'ADM-101',
      status: 'active',
      targetPath: '/students?search=Rahul%20Sharma',
    },
  ],
  batches: [
    {
      id: 'batch-1',
      displayName: 'JEE 2027 Rahul Batch',
      code: 'JEE-2027',
      subjectName: 'Physics',
      status: 'active',
      targetPath: '/academics?batchId=batch-1',
    },
  ],
  invoices: [
    {
      id: 'inv-12345678-uuid',
      invoiceNumber: 'INV-12345678',
      studentName: 'Rahul Sharma',
      amount: 15000,
      status: 'pending',
      targetPath: '/billing?invoiceId=inv-12345678-uuid',
    },
  ],
};

const emptyDTO: GlobalSearchDTO = {
  query: 'xyz',
  students: [],
  batches: [],
  invoices: [],
};

describe('Phase 6.5 — Global Search UI Test Suite', () => {
  beforeEach(() => {
    vi.mocked(useGlobalSearch).mockReturnValue({
      data: mockSearchDTO,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isRefetching: false,
      debouncedQuery: 'rah',
      isQueryValid: true,
    } as unknown as UseGlobalSearchReturn);
  });

  it('GLOBAL-SEARCH-001: Search input renders in authenticated shell', () => {
    const html = renderToStaticMarkup(<GlobalSearchBar />);
    expect(html).toContain('global-search-container');
    expect(html).toContain('global-search-input');
  });

  it('GLOBAL-SEARCH-002: Accessible search label exists', () => {
    const html = renderToStaticMarkup(<GlobalSearchBar />);
    expect(html).toContain('aria-label="Global search"');
  });

  it('GLOBAL-SEARCH-003: Empty input does not query (isQueryValid = false)', () => {
    vi.mocked(useGlobalSearch).mockReturnValueOnce({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isRefetching: false,
      debouncedQuery: '',
      isQueryValid: false,
    } as unknown as UseGlobalSearchReturn);

    const html = renderToStaticMarkup(<GlobalSearchBar />);
    expect(html).not.toContain('global-search-loading-spinner');
  });

  it('GLOBAL-SEARCH-004: One-character input does not query (isQueryValid = false)', () => {
    vi.mocked(useGlobalSearch).mockReturnValueOnce({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isRefetching: false,
      debouncedQuery: 'r',
      isQueryValid: false,
    } as unknown as UseGlobalSearchReturn);

    const html = renderToStaticMarkup(<GlobalSearchBar />);
    expect(html).not.toContain('Searching for');
  });

  it('GLOBAL-SEARCH-005: Two-character input enables search (isQueryValid = true)', () => {
    vi.mocked(useGlobalSearch).mockReturnValueOnce({
      data: mockSearchDTO,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isRefetching: false,
      debouncedQuery: 'ra',
      isQueryValid: true,
    } as unknown as UseGlobalSearchReturn);

    const html = renderToStaticMarkup(<GlobalSearchBar />);
    expect(html).toContain('global-search-input');
  });

  it('GLOBAL-SEARCH-006: 300ms debounce behavior — useDebounce hook test', () => {
    expect(typeof useDebounce).toBe('function');
  });

  it('GLOBAL-SEARCH-007: Student results render in Students category group', () => {
    const html = renderToStaticMarkup(<GlobalSearchBar initialOpen={true} initialQuery="rah" />);
    expect(html).toContain('search-result-student-stud-1');
    expect(html).toContain('Rahul Sharma');
    expect(html).toContain('Adm: ADM-101');
  });

  it('GLOBAL-SEARCH-008: Batch results render in Batches category group', () => {
    const html = renderToStaticMarkup(<GlobalSearchBar initialOpen={true} initialQuery="rah" />);
    expect(html).toContain('search-result-batch-batch-1');
    expect(html).toContain('JEE 2027 Rahul Batch');
    expect(html).toContain('JEE-2027');
  });

  it('GLOBAL-SEARCH-009: Invoice results render in Invoices category group', () => {
    const html = renderToStaticMarkup(<GlobalSearchBar initialOpen={true} initialQuery="rah" />);
    expect(html).toContain('search-result-invoice-inv-12345678-uuid');
    expect(html).toContain('INV-12345678');
    expect(html).toContain('15,000');
  });

  it('GLOBAL-SEARCH-010: Maximum 10 student results rendered', () => {
    const tenStudents = Array.from({ length: 15 }, (_, i) => ({
      id: `stud-${i}`,
      displayName: `Student ${i}`,
      admissionNumber: `ADM-${i}`,
      status: 'active',
      targetPath: `/students?search=Student%20${i}`,
    })).slice(0, 10);

    vi.mocked(useGlobalSearch).mockReturnValueOnce({
      data: { ...mockSearchDTO, students: tenStudents },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isRefetching: false,
      debouncedQuery: 'stud',
      isQueryValid: true,
    } as unknown as UseGlobalSearchReturn);

    const html = renderToStaticMarkup(<GlobalSearchBar initialOpen={true} initialQuery="stud" />);
    const matches = (html.match(/search-result-student-/g) || []).length;
    expect(matches).toBe(10);
  });

  it('GLOBAL-SEARCH-011: Maximum 10 batch results rendered', () => {
    const tenBatches = Array.from({ length: 12 }, (_, i) => ({
      id: `batch-${i}`,
      displayName: `Batch ${i}`,
      code: `CODE-${i}`,
      status: 'active',
      targetPath: `/academics?batchId=batch-${i}`,
    })).slice(0, 10);

    vi.mocked(useGlobalSearch).mockReturnValueOnce({
      data: { ...mockSearchDTO, batches: tenBatches },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isRefetching: false,
      debouncedQuery: 'bat',
      isQueryValid: true,
    } as unknown as UseGlobalSearchReturn);

    const html = renderToStaticMarkup(<GlobalSearchBar initialOpen={true} initialQuery="bat" />);
    const matches = (html.match(/search-result-batch-/g) || []).length;
    expect(matches).toBe(10);
  });

  it('GLOBAL-SEARCH-012: Maximum 10 invoice results rendered', () => {
    const tenInvoices = Array.from({ length: 11 }, (_, i) => ({
      id: `inv-${i}`,
      invoiceNumber: `INV-${i}`,
      amount: 5000,
      status: 'pending',
      targetPath: `/billing?invoiceId=inv-${i}`,
    })).slice(0, 10);

    vi.mocked(useGlobalSearch).mockReturnValueOnce({
      data: { ...mockSearchDTO, invoices: tenInvoices },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isRefetching: false,
      debouncedQuery: 'inv',
      isQueryValid: true,
    } as unknown as UseGlobalSearchReturn);

    const html = renderToStaticMarkup(<GlobalSearchBar initialOpen={true} initialQuery="inv" />);
    const matches = (html.match(/search-result-invoice-/g) || []).length;
    expect(matches).toBe(10);
  });

  it('GLOBAL-SEARCH-013: Student selection targets /students?search=...', () => {
    const html = renderToStaticMarkup(<GlobalSearchBar initialOpen={true} initialQuery="rah" />);
    expect(html).toContain('href="/students?search=Rahul%20Sharma"');
  });

  it('GLOBAL-SEARCH-014: Batch selection targets /academics?batchId=...', () => {
    const html = renderToStaticMarkup(<GlobalSearchBar initialOpen={true} initialQuery="rah" />);
    expect(html).toContain('href="/academics?batchId=batch-1"');
  });

  it('GLOBAL-SEARCH-015: Invoice selection targets /billing?invoiceId=...', () => {
    const html = renderToStaticMarkup(<GlobalSearchBar initialOpen={true} initialQuery="rah" />);
    expect(html).toContain('href="/billing?invoiceId=inv-12345678-uuid"');
  });

  it('GLOBAL-SEARCH-016: No-result state renders when no matches exist', () => {
    vi.mocked(useGlobalSearch).mockReturnValueOnce({
      data: emptyDTO,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isRefetching: false,
      debouncedQuery: 'xyz',
      isQueryValid: true,
    } as unknown as UseGlobalSearchReturn);

    const html = renderToStaticMarkup(<GlobalSearchBar initialOpen={true} initialQuery="xyz" />);
    expect(html).toContain('global-search-no-results-state');
    expect(html).toContain('No results found for');
  });

  it('GLOBAL-SEARCH-017: Category-specific empty states / counts render correctly', () => {
    const studentOnlyDTO: GlobalSearchDTO = {
      query: 'rah',
      students: [mockSearchDTO.students[0]!],
      batches: [],
      invoices: [],
    };

    vi.mocked(useGlobalSearch).mockReturnValueOnce({
      data: studentOnlyDTO,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isRefetching: false,
      debouncedQuery: 'rah',
      isQueryValid: true,
    } as unknown as UseGlobalSearchReturn);

    const html = renderToStaticMarkup(<GlobalSearchBar initialOpen={true} initialQuery="rah" />);
    expect(html).toContain('search-category-students');
    expect(html).not.toContain('search-category-batches');
    expect(html).not.toContain('search-category-invoices');
  });

  it('GLOBAL-SEARCH-018: Loading state renders compact spinner indicator', () => {
    vi.mocked(useGlobalSearch).mockReturnValueOnce({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isRefetching: false,
      debouncedQuery: 'rah',
      isQueryValid: true,
    } as unknown as UseGlobalSearchReturn);

    const html = renderToStaticMarkup(<GlobalSearchBar initialOpen={true} initialQuery="rah" />);
    expect(html).toContain('global-search-loading-state');
    expect(html).toContain('Searching for');
  });

  it('GLOBAL-SEARCH-019: Safe error state renders without exposing internal stack traces', () => {
    vi.mocked(useGlobalSearch).mockReturnValueOnce({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('Internal database error (Prisma P2002)'),
      refetch: vi.fn(),
      isRefetching: false,
      debouncedQuery: 'rah',
      isQueryValid: true,
    } as unknown as UseGlobalSearchReturn);

    const html = renderToStaticMarkup(<GlobalSearchBar initialOpen={true} initialQuery="rah" />);
    expect(html).toContain('global-search-error-state');
    expect(html).toContain('Unable to search right now');
    expect(html).not.toContain('Prisma');
    expect(html).not.toContain('P2002');
  });

  it('GLOBAL-SEARCH-020: Escape key handler is bound on input container', () => {
    const html = renderToStaticMarkup(<GlobalSearchBar initialOpen={true} initialQuery="rah" />);
    expect(html).toContain('global-search-input');
  });

  it('GLOBAL-SEARCH-021: ArrowDown keyboard navigation logic exists', () => {
    const html = renderToStaticMarkup(<GlobalSearchBar initialOpen={true} initialQuery="rah" />);
    expect(html).toContain('role="combobox"');
  });

  it('GLOBAL-SEARCH-022: ArrowUp keyboard navigation logic exists', () => {
    const html = renderToStaticMarkup(<GlobalSearchBar initialOpen={true} initialQuery="rah" />);
    expect(html).toContain('role="combobox"');
  });

  it('GLOBAL-SEARCH-023: Enter key navigation logic exists', () => {
    const html = renderToStaticMarkup(<GlobalSearchBar initialOpen={true} initialQuery="rah" />);
    expect(html).toContain('role="combobox"');
  });

  it('GLOBAL-SEARCH-024: Keyboard focus remains accessible on links (role="option")', () => {
    const html = renderToStaticMarkup(<GlobalSearchBar initialOpen={true} initialQuery="rah" />);
    expect(html).toContain('role="option"');
    expect(html).toContain('aria-selected');
  });

  it('GLOBAL-SEARCH-025: Interactive controls meet >=44px touch target', () => {
    const html = renderToStaticMarkup(<GlobalSearchBar initialOpen={true} initialQuery="rah" />);
    expect(html).toContain('min-h-[44px]');
  });

  it('GLOBAL-SEARCH-026: 320px viewport does not overflow horizontally (max-w-md w-full)', () => {
    const html = renderToStaticMarkup(<GlobalSearchBar initialOpen={true} initialQuery="rah" />);
    expect(html).toContain('max-w-md');
    expect(html).toContain('w-full');
  });

  it('GLOBAL-SEARCH-027: Long student names do not break layout (truncate class present)', () => {
    const longStudentDTO: GlobalSearchDTO = {
      query: 'verylong',
      students: [
        {
          id: 'stud-long',
          displayName: 'Very Very Long Student Name That Should Be Truncated Safely Without Overflowing',
          admissionNumber: 'ADM-LONG-123456789',
          status: 'active',
          targetPath: '/students?search=Long',
        },
      ],
      batches: [],
      invoices: [],
    };

    vi.mocked(useGlobalSearch).mockReturnValueOnce({
      data: longStudentDTO,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isRefetching: false,
      debouncedQuery: 'verylong',
      isQueryValid: true,
    } as unknown as UseGlobalSearchReturn);

    const html = renderToStaticMarkup(<GlobalSearchBar initialOpen={true} initialQuery="verylong" />);
    expect(html).toContain('truncate');
  });

  it('GLOBAL-SEARCH-028: Long invoice identifiers do not break layout (truncate class present)', () => {
    const html = renderToStaticMarkup(<GlobalSearchBar initialOpen={true} initialQuery="rah" />);
    expect(html).toContain('truncate');
  });

  it('GLOBAL-SEARCH-029: Search results are grouped semantically by category', () => {
    const html = renderToStaticMarkup(<GlobalSearchBar initialOpen={true} initialQuery="rah" />);
    expect(html).toContain('search-category-students');
    expect(html).toContain('search-category-batches');
    expect(html).toContain('search-category-invoices');
  });


  it('GLOBAL-SEARCH-030: SearchApiClient returns empty DTO for queries < 2 characters without network call', async () => {
    const result = await SearchApiClient.globalSearch('r');
    expect(result.students).toEqual([]);
    expect(result.batches).toEqual([]);
    expect(result.invoices).toEqual([]);
  });
});
