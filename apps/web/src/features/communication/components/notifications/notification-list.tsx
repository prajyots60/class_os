'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Badge, Button, Skeleton, Alert, AlertTitle, AlertDescription } from '@coaching-os/ui';
import { Bell, Check, CheckCheck, AlertCircle, AlertTriangle, Info, Calendar } from 'lucide-react';
import type { NotificationDTO } from '../../types/communication-ui.types';
import { v1CommunicationClient } from '../../api/v1-communication-client';

export interface NotificationListProps {
  userCapabilities?: string[];
}

export function NotificationList({ userCapabilities = [] }: NotificationListProps) {
  const [notifications, setNotifications] = useState<NotificationDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterRead, setFilterRead] = useState<'all' | 'unread'>('all');
  const [markingReadIds, setMarkingReadIds] = useState<Set<string>>(new Set());

  const hasRead = userCapabilities.includes('notification:read');

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await v1CommunicationClient.listNotifications({
        isRead: filterRead === 'unread' ? false : undefined,
      });
      setNotifications(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load notifications';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [filterRead]);

  useEffect(() => {
    let isMounted = true;
    if (hasRead) {
      v1CommunicationClient
        .listNotifications({
          isRead: filterRead === 'unread' ? false : undefined,
        })
        .then((data) => {
          if (isMounted) {
            setNotifications(data);
            setLoading(false);
          }
        })
        .catch((err: unknown) => {
          if (isMounted) {
            const message = err instanceof Error ? err.message : 'Failed to load notifications';
            setError(message);
            setLoading(false);
          }
        });
    }
    return () => {
      isMounted = false;
    };
  }, [filterRead, hasRead]);

  const handleMarkRead = async (id: string) => {
    if (markingReadIds.has(id)) return;

    setMarkingReadIds((prev) => new Set(prev).add(id));
    try {
      const updated = await v1CommunicationClient.markNotificationAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true, readAt: updated.readAt } : n)),
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to mark notification as read';
      alert(`Error: ${message}`);
    } finally {
      setMarkingReadIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  if (!hasRead) {
    return (
      <Alert variant="destructive" className="my-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Permission Denied</AlertTitle>
        <AlertDescription>
          You do not have permission to view notifications.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[hsl(var(--foreground))]">
            Notifications
          </h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            In-app alerts, activity updates, and priority messages for your staff profile.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 bg-[hsl(var(--muted)/0.3)] p-1 rounded-lg border border-[hsl(var(--border))] self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setFilterRead('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              filterRead === 'all'
                ? 'bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow-sm'
                : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
            }`}
            data-testid="notification-filter-all"
          >
            All Alerts
          </button>
          <button
            type="button"
            onClick={() => setFilterRead('unread')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              filterRead === 'unread'
                ? 'bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow-sm'
                : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
            }`}
            data-testid="notification-filter-unread"
          >
            Unread Only
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Notifications</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={fetchNotifications} className="h-7 text-xs">
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Loading Skeletons */}
      {loading && !error && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="p-4 border border-[hsl(var(--border))] rounded-xl bg-[hsl(var(--card))] space-y-2"
            >
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-20" />
              </div>
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && notifications.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 border border-dashed border-[hsl(var(--border))] rounded-xl bg-[hsl(var(--card))] text-center p-6">
          <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3">
            <Bell className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-[hsl(var(--foreground))]">You&apos;re All Caught Up</h3>
          <p className="text-xs text-[hsl(var(--muted-foreground))] max-w-sm mt-1">
            {filterRead === 'unread'
              ? 'You have no unread notifications.'
              : 'No notifications have been received.'}
          </p>
        </div>
      )}

      {/* Notification List */}
      {!loading && !error && notifications.length > 0 && (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 rounded-xl border transition-colors flex items-start gap-4 ${
                !notification.isRead
                  ? 'bg-[hsl(var(--muted)/0.3)] border-primary/30 shadow-sm'
                  : 'bg-[hsl(var(--card))] border-[hsl(var(--border))]'
              }`}
              data-testid={`notification-item-${notification.id}`}
            >
              {/* Unread Dot or Icon */}
              <div className="pt-0.5 shrink-0">
                {!notification.isRead ? (
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-500 block animate-pulse" title="Unread" />
                ) : (
                  <CheckCheck className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                )}
              </div>

              {/* Body Details */}
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    {/* Priority Badge */}
                    {notification.priority === 'critical' && (
                      <Badge variant="destructive" className="text-[10px] uppercase font-bold flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Critical
                      </Badge>
                    )}
                    {notification.priority === 'important' && (
                      <Badge variant="warning" className="text-[10px] uppercase font-bold flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Important
                      </Badge>
                    )}
                    {notification.priority === 'informational' && (
                      <Badge variant="outline" className="text-[10px] uppercase font-semibold flex items-center gap-1">
                        <Info className="h-3 w-3" />
                        Info
                      </Badge>
                    )}

                    <span className="text-[11px] text-[hsl(var(--muted-foreground))] uppercase tracking-wider font-semibold">
                      {notification.category}
                    </span>
                  </div>

                  {/* Timestamp */}
                  <div className="flex items-center gap-1 text-[10px] text-[hsl(var(--muted-foreground))]">
                    <Calendar className="h-3 w-3" />
                    <span>{new Date(notification.createdAt).toLocaleString()}</span>
                  </div>
                </div>

                <h4 className="text-sm font-bold text-[hsl(var(--foreground))]">
                  {notification.title}
                </h4>
                <p className="text-xs text-[hsl(var(--muted-foreground))] whitespace-pre-wrap leading-relaxed">
                  {notification.body}
                </p>
              </div>

              {/* Action: Mark Read Button */}
              {!notification.isRead && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleMarkRead(notification.id)}
                  disabled={markingReadIds.has(notification.id)}
                  className="h-8 text-xs shrink-0 flex items-center gap-1"
                  data-testid={`mark-read-btn-${notification.id}`}
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>{markingReadIds.has(notification.id) ? 'Saving...' : 'Mark Read'}</span>
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
