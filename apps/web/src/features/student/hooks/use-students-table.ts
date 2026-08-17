'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';

export interface StudentTableFilterState {
  search: string;
  status: string;
  admissionStatus: string;
  page: number;
  pageSize: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export function useStudentsTable(initialState?: Partial<StudentTableFilterState>) {
  const [filters, setFilters] = React.useState<StudentTableFilterState>({
    search: initialState?.search || '',
    status: initialState?.status || '',
    admissionStatus: initialState?.admissionStatus || '',
    page: initialState?.page || 1,
    pageSize: initialState?.pageSize || 25,
    sortBy: initialState?.sortBy || 'displayName',
    sortOrder: initialState?.sortOrder || 'asc',
  });

  const queryParams = new URLSearchParams();
  if (filters.search.trim()) queryParams.set('search', filters.search.trim());
  if (filters.status) queryParams.set('status', filters.status);
  if (filters.admissionStatus) queryParams.set('admissionStatus', filters.admissionStatus);
  queryParams.set('page', String(filters.page));
  queryParams.set('pageSize', String(filters.pageSize));
  if (filters.sortBy) queryParams.set('sortBy', filters.sortBy);
  if (filters.sortOrder) queryParams.set('sortOrder', filters.sortOrder);

  const queryKey = ['students-table', queryParams.toString()];

  const queryResult = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await fetch(`/api/v1/students?${queryParams.toString()}`, {
        cache: 'no-store',
      });
      if (!res.ok) {
        throw new Error(`Failed to load students (${res.status})`);
      }
      const json = await res.json();
      return json;
    },
    staleTime: 30000,
  });

  const updateFilter = React.useCallback(
    <K extends keyof StudentTableFilterState>(key: K, value: StudentTableFilterState[K]) => {
      setFilters((prev) => ({
        ...prev,
        [key]: value,
        page: key === 'page' ? (value as number) : 1, // Reset to page 1 when changing filters
      }));
    },
    [],
  );

  const clearFilters = React.useCallback(() => {
    setFilters({
      search: '',
      status: '',
      admissionStatus: '',
      page: 1,
      pageSize: 25,
      sortBy: 'displayName',
      sortOrder: 'asc',
    });
  }, []);

  return {
    filters,
    updateFilter,
    clearFilters,
    hasActiveFilters: Boolean(filters.search || filters.status || filters.admissionStatus),
    ...queryResult,
  };
}
