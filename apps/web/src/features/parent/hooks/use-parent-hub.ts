'use client';

import { useQuery } from '@tanstack/react-query';
import { ParentApiClient } from '../api/v1-parent-client';
import type { ParentHubDTO } from '../types/parent-ui.types';

export const PARENT_HUB_QUERY_KEY = ['parent', 'hub'] as const;

export function useParentHub() {
  return useQuery<ParentHubDTO, Error>({
    queryKey: PARENT_HUB_QUERY_KEY,
    queryFn: () => ParentApiClient.getParentHub(),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10,
    retry: (failureCount, error) => {
      // Do not retry 401 unauthenticated errors
      if (error && 'statusCode' in error && (error as { statusCode: number }).statusCode === 401) {
        return false;
      }
      return failureCount < 2;
    },
    refetchOnWindowFocus: false,
  });
}
