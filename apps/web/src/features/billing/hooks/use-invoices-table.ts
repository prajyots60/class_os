'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';

export interface InvoiceTableFilterState {
  search: string;
  status: string;
  overdue: boolean | undefined;
  page: number;
  pageSize: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export function useInvoicesTable(initialState?: Partial<InvoiceTableFilterState>) {
  const [filters, setFilters] = React.useState<InvoiceTableFilterState>({
    search: initialState?.search || '',
    status: initialState?.status || '',
    overdue: initialState?.overdue,
    page: initialState?.page || 1,
    pageSize: initialState?.pageSize || 25,
    sortBy: initialState?.sortBy || 'dueDate',
    sortOrder: initialState?.sortOrder || 'desc',
  });

  const queryParams = new URLSearchParams();
  if (filters.search.trim()) queryParams.set('search', filters.search.trim());
  if (filters.status) queryParams.set('status', filters.status);
  if (filters.overdue !== undefined) queryParams.set('overdue', String(filters.overdue));
  queryParams.set('page', String(filters.page));
  queryParams.set('pageSize', String(filters.pageSize));
  if (filters.sortBy) queryParams.set('sortBy', filters.sortBy);
  if (filters.sortOrder) queryParams.set('sortOrder', filters.sortOrder);

  const queryKey = ['invoices-table', queryParams.toString()];

  const queryResult = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await fetch(`/api/v1/invoices?${queryParams.toString()}`, {
        cache: 'no-store',
      });
      if (!res.ok) {
        throw new Error(`Failed to load invoices (${res.status})`);
      }
      const json = await res.json();
      return json;
    },
    staleTime: 30000,
  });

  const updateFilter = React.useCallback(
    <K extends keyof InvoiceTableFilterState>(key: K, value: InvoiceTableFilterState[K]) => {
      setFilters((prev) => ({
        ...prev,
        [key]: value,
        page: key === 'page' ? (value as number) : 1,
      }));
    },
    [],
  );

  const clearFilters = React.useCallback(() => {
    setFilters({
      search: '',
      status: '',
      overdue: undefined,
      page: 1,
      pageSize: 25,
      sortBy: 'dueDate',
      sortOrder: 'desc',
    });
  }, []);

  return {
    filters,
    updateFilter,
    clearFilters,
    hasActiveFilters: Boolean(filters.search || filters.status || filters.overdue !== undefined),
    ...queryResult,
  };
}
