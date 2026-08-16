'use client';

import * as React from 'react';
import { Card, CardContent, Button, Badge, Skeleton } from '@coaching-os/ui';
import { Bell, Check, CheckCheck, Building2, Clock, AlertCircle } from 'lucide-react';
import {
  useParentNotifications,
  useMarkNotificationAsRead,
} from '../../hooks/use-parent-notifications';

interface NotificationPanelProps {
  onClose?: () => void;
}

export function NotificationPanel({ onClose }: NotificationPanelProps = {}) {
  const [filter, setFilter] = React.useState<'all' | 'unread'>('all');
  const { data, isLoading, isError, refetch } = useParentNotifications(
    filter === 'unread' ? false : undefined,
  );
  const markReadMutation = useMarkNotificationAsRead();

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-10 w-full rounded-md" />
        <Skeleton className="h-20 w-full rounded-lg" />
        <Skeleton className="h-20 w-full rounded-lg" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Card className="border border-[hsl(var(--destructive)/0.3)] p-6 text-center m-4">
        <CardContent className="space-y-2 pt-2">
          <AlertCircle className="mx-auto h-6 w-6 text-[hsl(var(--destructive))]" aria-hidden="true" />
          <h4 className="text-sm font-semibold text-[hsl(var(--foreground))]">
            Unable to Load Notifications
          </h4>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="min-h-[44px]">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const notifications = data.items;

  return (
    <div className="space-y-4" role="region" aria-label="Notifications panel">
      {/* Header & Filter Controls */}
      <div className="flex items-center justify-between gap-2 border-b border-[hsl(var(--border))] pb-3">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-[hsl(var(--primary))]" aria-hidden="true" />
          <h3 className="text-sm font-bold text-[hsl(var(--foreground))]">
            Notifications
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1" role="group" aria-label="Notification filter">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
              className="min-h-[44px] text-xs px-3"
            >
              All
            </Button>
            <Button
              variant={filter === 'unread' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('unread')}
              className="min-h-[44px] text-xs px-3"
            >
              Unread
            </Button>
          </div>

          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="min-h-[44px] text-xs"
              aria-label="Close notification panel"
            >
              Close
            </Button>
          )}
        </div>
      </div>

      {/* Notification List */}
      {notifications.length === 0 ? (
        <Card className="border border-dashed border-[hsl(var(--border))] text-center p-6">
          <CardContent className="space-y-2 pt-2">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(var(--muted)/0.4)] text-[hsl(var(--muted-foreground))]">
              <CheckCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <h4 className="text-sm font-semibold text-[hsl(var(--foreground))]">
              {filter === 'unread' ? 'You are all caught up!' : 'No Notifications Yet'}
            </h4>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              {filter === 'unread'
                ? 'No unread notifications right now.'
                : 'Important alerts regarding your children will appear here.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((notif) => {
            const timeAgo = notif.createdAt
              ? new Date(notif.createdAt).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true,
                })
              : 'Time N/A';

            return (
              <Card
                key={notif.id}
                className={`border p-3 transition-all ${
                  !notif.isRead
                    ? 'border-blue-500/40 bg-blue-500/5 text-[hsl(var(--foreground))] shadow-xs'
                    : 'border-[hsl(var(--border))] bg-[hsl(var(--card))] opacity-85'
                }`}
              >
                <CardContent className="p-0 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {!notif.isRead && (
                        <Badge variant="secondary" className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30 text-[10px] font-bold">
                          🔴 Unread
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {notif.category}
                      </Badge>
                    </div>

                    <span className="text-[11px] text-[hsl(var(--muted-foreground))] flex items-center gap-1">
                      <Clock className="h-3 w-3" aria-hidden="true" />
                      {timeAgo}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-[hsl(var(--foreground))]">
                      {notif.title}
                    </h4>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                      {notif.message}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[hsl(var(--border)/0.5)]">
                    <span className="text-[11px] text-[hsl(var(--muted-foreground))] flex items-center gap-1">
                      <Building2 className="h-3 w-3 text-[hsl(var(--primary))]" aria-hidden="true" />
                      {notif.instituteName}
                    </span>

                    {!notif.isRead && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markReadMutation.mutate(notif.id)}
                        disabled={markReadMutation.isPending}
                        className="min-h-[44px] min-w-[44px] gap-1 text-[11px] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)] py-1 h-auto"
                        aria-label={`Mark notification "${notif.title}" as read`}
                      >
                        <Check className="h-3 w-3" aria-hidden="true" />
                        <span>Mark Read</span>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
