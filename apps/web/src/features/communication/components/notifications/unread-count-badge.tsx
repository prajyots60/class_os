'use client';

import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { v1CommunicationClient } from '../../api/v1-communication-client';

export interface UnreadCountBadgeProps {
  className?: string;
  refreshIntervalMs?: number;
}

export function UnreadCountBadge({ className = '', refreshIntervalMs = 30000 }: UnreadCountBadgeProps) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let isMounted = true;
    v1CommunicationClient
      .getUnreadNotificationCount()
      .then((res) => {
        if (isMounted) {
          setUnreadCount(res.unreadCount);
        }
      })
      .catch(() => {});

    if (refreshIntervalMs > 0) {
      const timer = setInterval(() => {
        v1CommunicationClient
          .getUnreadNotificationCount()
          .then((res) => {
            if (isMounted) {
              setUnreadCount(res.unreadCount);
            }
          })
          .catch(() => {});
      }, refreshIntervalMs);
      return () => {
        isMounted = false;
        clearInterval(timer);
      };
    }
    return () => {
      isMounted = false;
    };
  }, [refreshIntervalMs]);

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <Bell className="h-5 w-5 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors" />
      {unreadCount > 0 && (
        <span
          className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground text-[10px] font-bold h-4 min-w-[16px] px-1 rounded-full flex items-center justify-center border border-[hsl(var(--background))] animate-in zoom-in"
          aria-live="polite"
          aria-label={`${unreadCount} unread notifications`}
          data-testid="unread-count-badge"
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </div>
  );
}
