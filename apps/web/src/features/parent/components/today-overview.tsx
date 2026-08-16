'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@coaching-os/ui';
import { Calendar, Clock, CheckCircle2 } from 'lucide-react';
import type { ParentHubStudentSummaryDTO } from '../types/parent-ui.types';

interface TodayOverviewProps {
  student: ParentHubStudentSummaryDTO | null;
}

export function TodayOverview({ student }: TodayOverviewProps) {
  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  if (!student) {
    return (
      <Card className="border border-[hsl(var(--border))]">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-[hsl(var(--foreground))]">
              Today&apos;s Overview
            </CardTitle>
            <span className="text-xs text-[hsl(var(--muted-foreground))] flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
              {todayFormatted}
            </span>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            No active student selected. Link a student to view today&apos;s schedule and activity status.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-[hsl(var(--border))] shadow-sm">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-bold text-[hsl(var(--foreground))]">
              Today&apos;s Status
            </CardTitle>
            <Badge variant="outline" className="text-[10px]">
              {student.instituteName}
            </Badge>
          </div>
          <p className="text-xs text-[hsl(var(--muted-foreground))] flex items-center gap-1 mt-0.5">
            <Calendar className="h-3 w-3" aria-hidden="true" />
            {todayFormatted}
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-[hsl(var(--primary)/0.1)] px-2.5 py-1 text-xs font-medium text-[hsl(var(--primary))]">
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Active</span>
        </div>
      </CardHeader>

      <CardContent className="pt-1 space-y-3">
        {/* Quick summary grid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.2)] p-2.5">
            <span className="text-[10px] font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider block">
              Linked Student
            </span>
            <span className="font-semibold text-[hsl(var(--foreground))] truncate block mt-0.5">
              {student.fullName}
            </span>
          </div>

          <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.2)] p-2.5">
            <span className="text-[10px] font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider block">
              Enrollments
            </span>
            <span className="font-semibold text-[hsl(var(--foreground))] block mt-0.5">
              {student.enrollments.length} Active Batch{student.enrollments.length !== 1 ? 'es' : ''}
            </span>
          </div>
        </div>

        {/* Notice placeholder boundary for Phase 5.6 integrations */}
        <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-[hsl(var(--foreground))] flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-[hsl(var(--primary))]" aria-hidden="true" />
              Schedule & Attendance Boundary
            </span>
            <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
              Phase 5.6 View
            </span>
          </div>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            {student.enrollments.length > 0
              ? `Currently enrolled in ${student.enrollments.map((e) => e.batchName).join(', ')}. Daily attendance and homework logs will appear in academic views.`
              : 'No active batch enrollments configured.'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
