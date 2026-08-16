'use client';

import { useQuery } from '@tanstack/react-query';
import { ParentApiClient } from '../api/v1-parent-client';
import type { ParentTimelineEventDTO } from '../types/parent-ui.types';

export function getParentTimelineQueryKey(studentId: string | null = null) {
  return ['parent', 'timeline', studentId] as const;
}

export function useParentTimeline(studentId: string | null = null) {
  return useQuery<{ items: ParentTimelineEventDTO[]; nextCursor: string | null; hasMore: boolean }, Error>({
    queryKey: getParentTimelineQueryKey(studentId),
    queryFn: () => ParentApiClient.getTimeline({ studentId }),
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10,
    retry: (failureCount, error) => {
      if (error && 'statusCode' in error && (error as { statusCode: number }).statusCode === 401) {
        return false;
      }
      return failureCount < 2;
    },
    refetchOnWindowFocus: false,
  });
}
