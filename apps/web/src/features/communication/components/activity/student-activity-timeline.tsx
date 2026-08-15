'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button, Skeleton, Alert, AlertTitle, AlertDescription } from '@coaching-os/ui';
import {
  UserX,
  UserCheck,
  BookOpen,
  FileText,
  CreditCard,
  Receipt,
  Megaphone,
  Activity,
  AlertCircle,
  Calendar,
  User,
} from 'lucide-react';
import type { ActivityDTO, ActivityEventType } from '../../types/communication-ui.types';
import { v1CommunicationClient } from '../../api/v1-communication-client';

export interface StudentActivityTimelineProps {
  studentId: string;
  userCapabilities?: string[];
}

export function StudentActivityTimeline({
  studentId,
  userCapabilities = [],
}: StudentActivityTimelineProps) {
  const [activities, setActivities] = useState<ActivityDTO[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');

  const hasRead = userCapabilities.includes('activity:read');

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await v1CommunicationClient.listStudentActivities(studentId, {
        eventType: eventTypeFilter === 'all' ? undefined : eventTypeFilter,
        limit: 20,
      });
      setActivities(res.items);
      setNextCursor(res.nextCursor);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load activity timeline';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [studentId, eventTypeFilter]);

  useEffect(() => {
    let isMounted = true;
    if (hasRead && studentId) {
      v1CommunicationClient
        .listStudentActivities(studentId, {
          eventType: eventTypeFilter === 'all' ? undefined : eventTypeFilter,
          limit: 20,
        })
        .then((res) => {
          if (isMounted) {
            setActivities(res.items);
            setNextCursor(res.nextCursor);
            setLoading(false);
          }
        })
        .catch((err: unknown) => {
          if (isMounted) {
            const message = err instanceof Error ? err.message : 'Failed to load activity timeline';
            setError(message);
            setLoading(false);
          }
        });
    }
    return () => {
      isMounted = false;
    };
  }, [eventTypeFilter, hasRead, studentId]);

  const handleLoadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await v1CommunicationClient.listStudentActivities(studentId, {
        eventType: eventTypeFilter === 'all' ? undefined : eventTypeFilter,
        limit: 20,
        cursor: nextCursor,
      });
      setActivities((prev) => [...prev, ...res.items]);
      setNextCursor(res.nextCursor);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load more activities';
      alert(`Error: ${message}`);
    } finally {
      setLoadingMore(false);
    }
  };

  if (!hasRead) {
    return (
      <Alert variant="destructive" className="my-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Permission Denied</AlertTitle>
        <AlertDescription>
          You do not have permission to view student activity timelines.
        </AlertDescription>
      </Alert>
    );
  }

  const renderEventIcon = (eventType: ActivityEventType) => {
    switch (eventType) {
      case 'attendance_absent':
        return (
          <div className="h-8 w-8 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center ring-4 ring-[hsl(var(--card))]">
            <UserX className="h-4 w-4" />
          </div>
        );
      case 'attendance_present':
        return (
          <div className="h-8 w-8 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center ring-4 ring-[hsl(var(--card))]">
            <UserCheck className="h-4 w-4" />
          </div>
        );
      case 'homework_assigned':
        return (
          <div className="h-8 w-8 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center ring-4 ring-[hsl(var(--card))]">
            <BookOpen className="h-4 w-4" />
          </div>
        );
      case 'test_result':
        return (
          <div className="h-8 w-8 rounded-full bg-purple-500/10 text-purple-600 flex items-center justify-center ring-4 ring-[hsl(var(--card))]">
            <FileText className="h-4 w-4" />
          </div>
        );
      case 'fee_payment':
        return (
          <div className="h-8 w-8 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center ring-4 ring-[hsl(var(--card))]">
            <CreditCard className="h-4 w-4" />
          </div>
        );
      case 'receipt_issued':
        return (
          <div className="h-8 w-8 rounded-full bg-indigo-500/10 text-indigo-600 flex items-center justify-center ring-4 ring-[hsl(var(--card))]">
            <Receipt className="h-4 w-4" />
          </div>
        );
      case 'announcement':
        return (
          <div className="h-8 w-8 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center ring-4 ring-[hsl(var(--card))]">
            <Megaphone className="h-4 w-4" />
          </div>
        );
      default:
        return (
          <div className="h-8 w-8 rounded-full bg-slate-500/10 text-slate-600 flex items-center justify-center ring-4 ring-[hsl(var(--card))]">
            <Activity className="h-4 w-4" />
          </div>
        );
    }
  };

  return (
    <div className="space-y-6" data-testid="student-activity-timeline">
      {/* Top Filter Bar */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-[hsl(var(--border))]">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <h3 className="text-base font-bold text-[hsl(var(--foreground))]">
            Activity Timeline
          </h3>
        </div>

        {/* Event Type Filter */}
        <select
          value={eventTypeFilter}
          onChange={(e) => setEventTypeFilter(e.target.value)}
          className="h-8 px-2.5 text-xs bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-md text-[hsl(var(--foreground))] font-medium focus:outline-none focus:ring-2 focus:ring-ring"
          data-testid="activity-type-filter"
        >
          <option value="all">All Events</option>
          <option value="attendance_absent">Attendance: Absent</option>
          <option value="attendance_present">Attendance: Present</option>
          <option value="homework_assigned">Homework Assigned</option>
          <option value="test_result">Test Result</option>
          <option value="fee_payment">Fee Payment</option>
          <option value="receipt_issued">Receipt Issued</option>
          <option value="announcement">Announcement</option>
        </select>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Activity Log</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={fetchActivities} className="h-7 text-xs">
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Loading Skeleton */}
      {loading && !error && (
        <div className="space-y-6 pl-4 border-l-2 border-[hsl(var(--border))]">
          {[1, 2, 3].map((i) => (
            <div key={i} className="relative space-y-2">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && activities.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 border border-dashed border-[hsl(var(--border))] rounded-xl bg-[hsl(var(--card))] text-center p-6">
          <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-2">
            <Activity className="h-5 w-5" />
          </div>
          <h4 className="text-sm font-bold text-[hsl(var(--foreground))]">No Activities Recorded</h4>
          <p className="text-xs text-[hsl(var(--muted-foreground))] max-w-xs mt-1">
            Activity events will appear here as attendance, tests, homework, and billing events occur.
          </p>
        </div>
      )}

      {/* Timeline Connected Stream */}
      {!loading && !error && activities.length > 0 && (
        <div className="relative pl-6 space-y-6 before:absolute before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-[hsl(var(--border))]">
          {activities.map((act) => (
            <div
              key={act.id}
              className="relative flex items-start gap-4 group"
              data-testid={`activity-item-${act.id}`}
            >
              {/* Event Icon Pin */}
              <div className="absolute -left-6 top-0 shrink-0">
                {renderEventIcon(act.eventType)}
              </div>

              {/* Event Card Content */}
              <div className="flex-1 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-4 space-y-2 shadow-sm group-hover:border-primary/40 transition-colors">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-bold text-[hsl(var(--foreground))]">
                    {act.title}
                  </span>
                  <div className="flex items-center gap-1 text-[10px] text-[hsl(var(--muted-foreground))]">
                    <Calendar className="h-3 w-3" />
                    <span>{new Date(act.occurredAt).toLocaleString()}</span>
                  </div>
                </div>

                <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
                  {act.description}
                </p>

                {/* Actor Info */}
                {act.actorName && (
                  <div className="pt-2 border-t border-[hsl(var(--border))] flex items-center gap-1 text-[10px] text-[hsl(var(--muted-foreground))] font-medium">
                    <User className="h-3 w-3" />
                    <span>Action by: {act.actorName}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination: Load More */}
      {nextCursor && !loading && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="text-xs h-8"
          >
            {loadingMore ? 'Loading More...' : 'Load Older Activities'}
          </Button>
        </div>
      )}
    </div>
  );
}
