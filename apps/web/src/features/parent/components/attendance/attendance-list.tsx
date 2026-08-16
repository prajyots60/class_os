'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@coaching-os/ui';
import { Calendar, CheckCircle2, XCircle, AlertCircle, Clock, BookOpen } from 'lucide-react';
import type { ParentAttendanceRecordDTO } from '../../types/parent-ui.types';

interface AttendanceListProps {
  records: ParentAttendanceRecordDTO[];
}

export function AttendanceList({ records }: AttendanceListProps) {
  if (records.length === 0) {
    return (
      <Card className="border border-dashed border-[hsl(var(--border))] text-center p-6 sm:p-8">
        <CardContent className="space-y-2 pt-2">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(var(--muted)/0.4)] text-[hsl(var(--muted-foreground))]">
            <Calendar className="h-5 w-5" aria-hidden="true" />
          </div>
          <h4 className="text-sm font-semibold text-[hsl(var(--foreground))]">
            No Attendance Records Yet
          </h4>
          <p className="text-xs text-[hsl(var(--muted-foreground))] max-w-sm mx-auto">
            Attendance information will appear here once classes and session logs are recorded by the institute.
          </p>
        </CardContent>
      </Card>
    );
  }

  const renderStatusBadge = (record: ParentAttendanceRecordDTO) => {
    const formattedDate = new Date(record.sessionDate).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });

    switch (record.status) {
      case 'present':
        return (
          <Badge
            variant="secondary"
            className="bg-green-500/15 text-green-700 dark:text-green-400 gap-1 min-h-[44px] min-w-[44px] px-3 py-1.5 border border-green-500/30"
            aria-label={`Present on ${formattedDate}`}
          >
            <CheckCircle2 className="h-4 w-4 text-green-600" aria-hidden="true" />
            <span className="font-bold">✓ Present</span>
          </Badge>
        );
      case 'absent':
        return (
          <Badge
            variant="destructive"
            className="gap-1 min-h-[44px] min-w-[44px] px-3 py-1.5"
            aria-label={`Absent on ${formattedDate}`}
          >
            <XCircle className="h-4 w-4" aria-hidden="true" />
            <span className="font-bold">× Absent</span>
          </Badge>
        );
      case 'late':
        return (
          <Badge
            variant="secondary"
            className="bg-amber-500/15 text-amber-700 dark:text-amber-400 gap-1 min-h-[44px] min-w-[44px] px-3 py-1.5 border border-amber-500/30"
            aria-label={`Late on ${formattedDate}`}
          >
            <Clock className="h-4 w-4 text-amber-600" aria-hidden="true" />
            <span className="font-bold">🕒 Late</span>
          </Badge>
        );
      default:
        return (
          <Badge
            variant="outline"
            className="gap-1 min-h-[44px] min-w-[44px] px-3 py-1.5"
            aria-label={`Excused on ${formattedDate}`}
          >
            <AlertCircle className="h-4 w-4 text-[hsl(var(--muted-foreground))]" aria-hidden="true" />
            <span className="font-bold">— Excused</span>
          </Badge>
        );
    }
  };

  return (
    <Card className="border border-[hsl(var(--border))] shadow-sm">
      <CardHeader className="flex-row items-center justify-between pb-3 space-y-0">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-[hsl(var(--primary))]" aria-hidden="true" />
          <CardTitle className="text-base font-bold text-[hsl(var(--foreground))]">
            Session Attendance History
          </CardTitle>
        </div>
        <span className="text-xs text-[hsl(var(--muted-foreground))]">
          {records.length} Session{records.length > 1 ? 's' : ''}
        </span>
      </CardHeader>

      <CardContent className="pt-1 space-y-3">
        {records.map((record) => {
          const formattedDate = new Date(record.sessionDate).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          });

          return (
            <div
              key={record.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3 text-sm shadow-2xs hover:bg-[hsl(var(--muted)/0.15)] transition-colors"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[hsl(var(--foreground))] truncate">
                    {formattedDate}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
                  <span className="font-medium text-[hsl(var(--foreground))]">
                    {record.batchName}
                  </span>
                  {record.subject && (
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-3 w-3" aria-hidden="true" />
                      {record.subject}
                    </span>
                  )}
                </div>
              </div>

              <div className="self-start sm:self-center shrink-0">{renderStatusBadge(record)}</div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
