'use client';

import * as React from 'react';
import { Button, Badge } from '@coaching-os/ui';
import { Bell } from 'lucide-react';
import { useParentUnreadCount } from '../../hooks/use-parent-notifications';

interface NotificationBellProps {
  onClick?: () => void;
}

export function NotificationBell({ onClick }: NotificationBellProps) {
  const { data } = useParentUnreadCount();
  const unreadCount = data?.unreadCount ?? 0;

  const ariaLabel = unreadCount > 0
    ? `Notifications (${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''})`
    : 'Notifications (No unread notifications)';

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className="relative min-h-[44px] min-w-[44px] rounded-full p-2 text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))]"
      aria-label={ariaLabel}
    >
      <Bell className="h-5 w-5" aria-hidden="true" />
      {unreadCount > 0 && (
        <Badge
          variant="destructive"
          className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 flex items-center justify-center text-[10px] font-extrabold rounded-full bg-rose-600 text-white border-2 border-[hsl(var(--background))]"
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </Badge>
      )}
    </Button>
  );
}
