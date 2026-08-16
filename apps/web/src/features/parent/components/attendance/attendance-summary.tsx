'use client';

import * as React from 'react';
import { Card, CardContent } from '@coaching-os/ui';
import { CheckCircle2, XCircle, AlertCircle, Award } from 'lucide-react';
import type { ParentAttendanceSummaryDTO } from '../../types/parent-ui.types';

interface AttendanceSummaryProps {
  summary: ParentAttendanceSummaryDTO;
}

export function AttendanceSummary({ summary }: AttendanceSummaryProps) {
  const getPercentageColorClass = (percentage: number) => {
    if (percentage >= 85) return 'text-green-600 bg-green-500/10 border-green-500/20';
    if (percentage >= 75) return 'text-amber-600 bg-amber-500/10 border-amber-500/20';
    return 'text-rose-600 bg-rose-500/10 border-rose-500/20';
  };

  return (
    <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
      {/* Attendance Percentage */}
      <Card className={`border p-3 ${getPercentageColorClass(summary.percentage)}`}>
        <CardContent className="p-0 flex flex-col justify-between h-full">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              Attendance
            </span>
            <Award className="h-4 w-4 text-[hsl(var(--primary))]" aria-hidden="true" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-extrabold tracking-tight">
              {summary.percentage}%
            </div>
            <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">
              {summary.percentage >= 75 ? 'Good standing' : 'Low attendance warning'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Present Count */}
      <Card className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3">
        <CardContent className="p-0 flex flex-col justify-between h-full">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              Present
            </span>
            <CheckCircle2 className="h-4 w-4 text-green-600" aria-hidden="true" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-[hsl(var(--foreground))]">
              {summary.presentCount}
            </div>
            <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">
              out of {summary.totalSessions} sessions
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Absent Count */}
      <Card className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3">
        <CardContent className="p-0 flex flex-col justify-between h-full">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              Absent
            </span>
            <XCircle className="h-4 w-4 text-rose-500" aria-hidden="true" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-[hsl(var(--foreground))]">
              {summary.absentCount}
            </div>
            <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">
              unexcused absences
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Excused / Late Count */}
      <Card className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3">
        <CardContent className="p-0 flex flex-col justify-between h-full">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              Excused / Late
            </span>
            <AlertCircle className="h-4 w-4 text-amber-500" aria-hidden="true" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-[hsl(var(--foreground))]">
              {summary.excusedCount}
            </div>
            <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">
              sessions recorded
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
