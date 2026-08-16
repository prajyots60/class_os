'use client';

import { useQuery } from '@tanstack/react-query';
import { ParentApiClient } from '../api/v1-parent-client';
import type { ParentStudentAttendanceDTO } from '../types/parent-ui.types';

export function getParentAttendanceQueryKey(studentId: string | null) {
  return ['parent', 'attendance', studentId] as const;
}

export function useParentAttendance(studentId: string | null) {
  return useQuery<ParentStudentAttendanceDTO, Error>({
    queryKey: getParentAttendanceQueryKey(studentId),
    queryFn: () => {
      if (!studentId) {
        throw new Error('Student ID is required to fetch attendance.');
      }
      return ParentApiClient.getStudentAttendance(studentId);
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
