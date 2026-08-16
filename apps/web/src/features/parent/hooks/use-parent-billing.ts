'use client';

import { useQuery } from '@tanstack/react-query';
import { ParentApiClient } from '../api/v1-parent-client';
import type { ParentStudentBillingDTO } from '../types/parent-ui.types';

export function getParentBillingQueryKey(studentId: string | null) {
  return ['parent', 'billing', studentId] as const;
}

export function useParentBilling(studentId: string | null) {
  return useQuery<ParentStudentBillingDTO, Error>({
    queryKey: getParentBillingQueryKey(studentId),
    queryFn: () => {
      if (!studentId) {
        throw new Error('Student ID is required to fetch fee & billing records.');
      }
      return ParentApiClient.getStudentBilling(studentId);
    },
    enabled: Boolean(studentId),
    staleTime: 1000 * 60 * 5, // 5 minutes
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
