'use client';

import { useQuery } from '@tanstack/react-query';
import { DashboardApiClient } from '../api/dashboard-client';
import type { OwnerDashboardDTO } from '@coaching-os/administration';

export const OWNER_DASHBOARD_QUERY_KEY = ['dashboard', 'owner'] as const;

export function useOwnerDashboard() {
  return useQuery<OwnerDashboardDTO, Error>({
    queryKey: OWNER_DASHBOARD_QUERY_KEY,
    queryFn: () => DashboardApiClient.getOwnerDashboard(),
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 5,
    retry: (failureCount, error) => {
      // Do not retry 401 unauthenticated or 403 unauthorized errors
      const statusCode = (error as { statusCode?: number })?.statusCode;
      if (statusCode === 401 || statusCode === 403) {
        return false;
      }
      return failureCount < 2;
    },
    refetchOnWindowFocus: false,
  });
}
