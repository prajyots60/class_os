'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { SearchApiClient } from '../api/search-client';
import type { GlobalSearchDTO } from '@coaching-os/administration';

export function useDebounce<T>(value: T, delayMs: number = 300): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delayMs]);

  return debouncedValue;
}

export function useGlobalSearch(inputQuery: string) {
  const debouncedQuery = useDebounce(inputQuery, 300);
  const normalizedQuery = debouncedQuery.trim();
  const isQueryValid = normalizedQuery.length >= 2;

  const queryResult = useQuery<GlobalSearchDTO, Error>({
    queryKey: ['global-search', normalizedQuery],
    queryFn: () => SearchApiClient.globalSearch(normalizedQuery),
    enabled: isQueryValid,
    staleTime: 1000 * 30, // 30s
    gcTime: 1000 * 60 * 5,
    retry: (failureCount, error) => {
      const statusCode = (error as { statusCode?: number })?.statusCode;
      if (statusCode === 401 || statusCode === 403) {
        return false;
      }
      return failureCount < 2;
    },
    refetchOnWindowFocus: false,
  });

  return {
    ...queryResult,
    debouncedQuery: normalizedQuery,
    isQueryValid,
  };
}
