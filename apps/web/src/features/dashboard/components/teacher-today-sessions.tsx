'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge, buttonVariants } from '@coaching-os/ui';
import { Clock, CalendarCheck, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import type { TeacherSessionDTO } from '@coaching-os/administration';

export interface TeacherTodaySessionsProps {
  sessions: TeacherSessionDTO[];
}

export function TeacherTodaySessions({ sessions }: TeacherTodaySessionsProps) {
  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return 'TBD';
    return timeStr;
  };

  return (
    <Card className="shadow-sm border-[hsl(var(--border))] bg-[hsl(var(--card))] flex flex-col justify-between">
      <div>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-md bg-blue-500/10 text-blue-600">
                <CalendarCheck className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-[hsl(var(--foreground))]">
                  Today&apos;s Classes &amp; Sessions
                </CardTitle>
                <CardDescription className="text-xs text-[hsl(var(--muted-foreground))]">
                  Your assigned sessions for today in institute local time
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="text-xs font-semibold">
              {sessions.length} {sessions.length === 1 ? 'Session' : 'Sessions'} Today
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-3 pt-1">
          {sessions.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[hsl(var(--border))] p-6 text-center">
              <CalendarCheck className="mx-auto h-8 w-8 text-[hsl(var(--muted-foreground))] opacity-50" aria-hidden="true" />
              <p className="mt-2 text-xs font-semibold text-[hsl(var(--foreground))]">
                No classes scheduled for you today
              </p>
              <p className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">
                Your class schedule for today is clear. You can view your overall academic timetable in Academics.
              </p>
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                className="flex flex-col gap-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.15)] p-3.5 sm:flex-row sm:items-center sm:justify-between transition-colors hover:bg-[hsl(var(--muted)/0.3)]"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-bold text-[hsl(var(--foreground))]">
                      {session.batchName}
                    </span>
                    <Badge variant="secondary" className="text-[10px] uppercase font-bold">
                      {session.subjectName}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-[hsl(var(--muted-foreground))]">
                    <span className="flex items-center space-x-1">
                      <Clock className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" aria-hidden="true" />
                      <span>
                        {formatTime(session.startTime)}
                        {session.endTime ? ` - ${session.endTime}` : ''}
                      </span>
                    </span>
                    <span className="capitalize font-medium">
                      Status: {session.status}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end space-x-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-[hsl(var(--border))]">
                  {session.attendanceTaken ? (
                    <Badge variant="outline" className="text-[11px] text-emerald-700 bg-emerald-50 border-emerald-200 flex items-center space-x-1">
                      <CheckCircle2 className="h-3 w-3 mr-1" aria-hidden="true" />
                      <span>Taken</span>
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[11px] text-amber-700 bg-amber-50 border-amber-200 flex items-center space-x-1">
                      <AlertCircle className="h-3 w-3 mr-1" aria-hidden="true" />
                      <span>Pending</span>
                    </Badge>
                  )}

                  <Link
                    href={`/academics?batchId=${session.batchId}&sessionId=${session.id}`}
                    className={buttonVariants({ variant: 'outline', size: 'sm' }) + ' min-h-[44px] justify-center px-3'}
                    aria-label={`Take attendance or view session for ${session.batchName}`}
                  >
                    <span className="text-xs font-semibold">
                      {session.attendanceTaken ? 'View Session' : 'Take Attendance'}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 ml-1.5" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </div>
    </Card>
  );
}
