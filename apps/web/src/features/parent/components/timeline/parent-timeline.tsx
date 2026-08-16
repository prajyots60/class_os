'use client';

import * as React from 'react';
import { Card, CardContent, Button, Skeleton } from '@coaching-os/ui';
import { Clock, RefreshCw, CalendarDays } from 'lucide-react';
import { TimelineEventCard } from './timeline-event-card';
import { useParentTimeline } from '../../hooks/use-parent-timeline';
import type { ParentTimelineEventDTO } from '../../types/parent-ui.types';

interface ParentTimelineProps {
  studentId?: string | null;
  onNavigateRoute?: (route: string) => void;
}

export function ParentTimeline({ studentId = null, onNavigateRoute }: ParentTimelineProps) {
  const { data, isLoading, isError, refetch } = useParentTimeline(studentId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full rounded-md" />
        <div className="space-y-3">
          <Skeleton className="h-28 rounded-lg" />
          <Skeleton className="h-28 rounded-lg" />
          <Skeleton className="h-28 rounded-lg" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Card className="border border-[hsl(var(--destructive)/0.3)] p-6 text-center">
        <CardContent className="space-y-3 pt-2">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(var(--destructive)/0.1)] text-[hsl(var(--destructive))]">
            <Clock className="h-5 w-5" aria-hidden="true" />
          </div>
          <h4 className="text-sm font-semibold text-[hsl(var(--foreground))]">
            Unable to Load Timeline Activity
          </h4>
          <p className="text-xs text-[hsl(var(--muted-foreground))] max-w-sm mx-auto">
            A network error occurred while fetching the timeline.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="gap-2 min-h-[44px]"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const events = data.items;

  if (events.length === 0) {
    return (
      <Card className="border border-dashed border-[hsl(var(--border))] text-center p-6 sm:p-8">
        <CardContent className="space-y-2 pt-2">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(var(--muted)/0.4)] text-[hsl(var(--muted-foreground))]">
            <CalendarDays className="h-5 w-5" aria-hidden="true" />
          </div>
          <h4 className="text-sm font-semibold text-[hsl(var(--foreground))]">
            {studentId ? 'No Activity Recorded for Selected Child' : 'No Recent Activity Yet'}
          </h4>
          <p className="text-xs text-[hsl(var(--muted-foreground))] max-w-sm mx-auto">
            Activity events from your children&apos;s coaching institutes will appear here automatically as attendance, homework, test marks, or fees are recorded.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Group events into Today, Yesterday, and Earlier
  const groupEventsByDay = (items: ParentTimelineEventDTO[]) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const isSameDay = (d1: Date, d2: Date) =>
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate();

    const groups: { [key: string]: ParentTimelineEventDTO[] } = {
      Today: [],
      Yesterday: [],
      Earlier: [],
    };

    for (const item of items) {
      const itemDate = new Date(item.occurredAt);
      if (isSameDay(itemDate, today)) {
        groups.Today.push(item);
      } else if (isSameDay(itemDate, yesterday)) {
        groups.Yesterday.push(item);
      } else {
        groups.Earlier.push(item);
      }
    }

    return groups;
  };

  const grouped = groupEventsByDay(events);

  return (
    <div className="space-y-6" role="region" aria-label="Unified child activity timeline">
      {Object.entries(grouped).map(([dayLabel, dayEvents]) => {
        if (dayEvents.length === 0) return null;

        return (
          <div key={dayLabel} className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.1)] px-2.5 py-1 rounded-md">
                {dayLabel}
              </span>
              <div className="h-[1px] flex-1 bg-[hsl(var(--border))]" />
            </div>

            <div className="grid gap-3">
              {dayEvents.map((evt) => (
                <TimelineEventCard
                  key={evt.id}
                  event={evt}
                  onNavigate={onNavigateRoute}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
