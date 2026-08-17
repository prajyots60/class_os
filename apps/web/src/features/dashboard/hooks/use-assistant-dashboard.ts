'use client';

import { useQuery } from '@tanstack/react-query';
import { DashboardApiClient } from '../api/dashboard-client';
import type { AssistantDashboardDTO } from '@coaching-os/administration';

export const ASSISTANT_DASHBOARD_QUERY_KEY = ['dashboard', 'assistant'] as const;

export function useAssistantDashboard() {
  return useQuery<AssistantDashboardDTO, Error>({
    queryKey: ASSISTANT_DASHBOARD_QUERY_KEY,
    queryFn: () => DashboardApiClient.getAssistantDashboard(),
    staleTime: 1000 * 60 * 2, // 2 minutes
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
}
