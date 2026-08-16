'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@coaching-os/ui';
import { Activity, Bell, CheckCircle2, Clock, Info } from 'lucide-react';
import type { ParentHubStudentSummaryDTO } from '../types/parent-ui.types';

export interface ParentActivityItem {
  id: string;
  timestamp: string;
  title: string;
  description: string;
  category: 'attendance' | 'academic' | 'communication' | 'system';
}

interface TodayActivityProps {
  student: ParentHubStudentSummaryDTO | null;
  activities?: ParentActivityItem[];
}

export function TodayActivity({ student, activities = [] }: TodayActivityProps) {
  const getCategoryIcon = (category: ParentActivityItem['category']) => {
    switch (category) {
      case 'attendance':
        return <CheckCircle2 className="h-4 w-4 text-[hsl(var(--primary))]" aria-hidden="true" />;
      case 'communication':
        return <Bell className="h-4 w-4 text-blue-500" aria-hidden="true" />;
      case 'academic':
        return <Clock className="h-4 w-4 text-amber-500" aria-hidden="true" />;
      default:
        return <Info className="h-4 w-4 text-[hsl(var(--muted-foreground))]" aria-hidden="true" />;
    }
  };

  return (
    <Card className="border border-[hsl(var(--border))] shadow-sm">
      <CardHeader className="flex-row items-center justify-between pb-3 space-y-0">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-[hsl(var(--primary))]" aria-hidden="true" />
          <CardTitle className="text-base font-bold text-[hsl(var(--foreground))]">
            Today&apos;s Activity Feed
          </CardTitle>
        </div>
        <span className="text-xs text-[hsl(var(--muted-foreground))]">Read-Only</span>
      </CardHeader>

      <CardContent className="pt-1">
        {!student ? (
          <div className="rounded-md border border-dashed border-[hsl(var(--border))] p-6 text-center">
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              Select a child profile to view daily activities.
            </p>
          </div>
        ) : activities.length === 0 ? (
          <div className="rounded-md border border-dashed border-[hsl(var(--border))] p-6 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(var(--muted)/0.4)] text-[hsl(var(--muted-foreground))] mb-2">
              <Clock className="h-5 w-5" aria-hidden="true" />
            </div>
            <p className="text-xs font-medium text-[hsl(var(--foreground))] mb-1">
              No activity today
            </p>
            <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
              {student.fullName} has no logged activities or notices for today.
            </p>
          </div>
        ) : (
          <div className="relative space-y-3 before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-[hsl(var(--border))]">
            {activities.map((item) => (
              <div key={item.id} className="relative flex items-start gap-3 pl-8 text-xs">
                <div className="absolute left-1.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[hsl(var(--background))] ring-2 ring-[hsl(var(--border))]">
                  {getCategoryIcon(item.category)}
                </div>

                <div className="flex-1 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-2.5 shadow-2xs">
                  <div className="flex items-center justify-between font-semibold text-[hsl(var(--foreground))] mb-0.5">
                    <span>{item.title}</span>
                    <time className="text-[10px] font-normal text-[hsl(var(--muted-foreground))]">
                      {item.timestamp}
                    </time>
                  </div>
                  <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
