'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ParentApiClient } from '../api/v1-parent-client';
import type { ParentNotificationDTO, ParentUnreadCountDTO } from '../types/parent-ui.types';

export function getParentNotificationsQueryKey(isRead?: boolean) {
  return ['parent', 'notifications', isRead ?? 'all'] as const;
}

export function getParentUnreadCountQueryKey() {
  return ['parent', 'notifications', 'unread-count'] as const;
}

export function useParentNotifications(isRead?: boolean) {
  return useQuery<{ items: ParentNotificationDTO[]; nextCursor: string | null; hasMore: boolean }, Error>({
    queryKey: getParentNotificationsQueryKey(isRead),
    queryFn: () => ParentApiClient.getNotifications({ isRead }),
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

export function useParentUnreadCount() {
  return useQuery<ParentUnreadCountDTO, Error>({
    queryKey: getParentUnreadCountQueryKey(),
    queryFn: () => ParentApiClient.getUnreadNotificationCount(),
    staleTime: 1000 * 30, // 30 seconds
    gcTime: 1000 * 60 * 5,
    refetchOnWindowFocus: true,
  });
}

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) =>
      ParentApiClient.markNotificationAsRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parent', 'notifications'] });
    },
  });
}
