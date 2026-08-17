'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';

export interface SessionTableFilterState {
  search: string;
  status: string;
  attendanceStatus: string;
  batchId: string;
  subjectId: string;
  teacherId: string;
  page: number;
  pageSize: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export function useSessionsTable(initialState?: Partial<SessionTableFilterState>) {
  const [filters, setFilters] = React.useState<SessionTableFilterState>({
    search: initialState?.search || '',
    status: initialState?.status || '',
    attendanceStatus: initialState?.attendanceStatus || '',
    batchId: initialState?.batchId || '',
    subjectId: initialState?.subjectId || '',
    teacherId: initialState?.teacherId || '',
    page: initialState?.page || 1,
    pageSize: initialState?.pageSize || 25,
    sortBy: initialState?.sortBy || 'date',
    sortOrder: initialState?.sortOrder || 'asc',
  });

  const queryParams = new URLSearchParams();
  if (filters.search.trim()) queryParams.set('search', filters.search.trim());
  if (filters.status) queryParams.set('status', filters.status);
  if (filters.attendanceStatus) queryParams.set('attendanceStatus', filters.attendanceStatus);
  if (filters.batchId) queryParams.set('batchId', filters.batchId);
  if (filters.subjectId) queryParams.set('subjectId', filters.subjectId);
  if (filters.teacherId) queryParams.set('teacherId', filters.teacherId);
  queryParams.set('page', String(filters.page));
  queryParams.set('pageSize', String(filters.pageSize));
  if (filters.sortBy) queryParams.set('sortBy', filters.sortBy);
  if (filters.sortOrder) queryParams.set('sortOrder', filters.sortOrder);

  const queryKey = ['sessions-table', queryParams.toString()];

  const queryResult = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await fetch(`/api/v1/academics/sessions?${queryParams.toString()}`, {
        cache: 'no-store',
      });
      if (!res.ok) {
        throw new Error(`Failed to load sessions (${res.status})`);
      }
      const json = await res.json();
      return json;
    },
    staleTime: 30000,
  });

  const updateFilter = React.useCallback(
    <K extends keyof SessionTableFilterState>(key: K, value: SessionTableFilterState[K]) => {
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
      attendanceStatus: '',
      batchId: '',
      subjectId: '',
      teacherId: '',
      page: 1,
      pageSize: 25,
      sortBy: 'date',
      sortOrder: 'asc',
    });
  }, []);

  return {
    filters,
    updateFilter,
    clearFilters,
    hasActiveFilters: Boolean(
      filters.search ||
        filters.status ||
        filters.attendanceStatus ||
        filters.batchId ||
        filters.subjectId ||
        filters.teacherId,
    ),
    ...queryResult,
  };
}
