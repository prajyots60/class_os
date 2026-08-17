'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Badge, buttonVariants } from '@coaching-os/ui';
import { CalendarCheck, ArrowRight } from 'lucide-react';
import type { OwnerAttendanceSummaryDTO } from '@coaching-os/administration';

export interface OwnerAttendanceCardProps {
  attendance: OwnerAttendanceSummaryDTO;
}

export function OwnerAttendanceCard({ attendance }: OwnerAttendanceCardProps) {
  const {
    sessionsToday,
    sessionsTaken,
    eligibleStudents,
    presentStudents,
    sessionCompletionPercentage,
    studentAttendancePercentage,
    targetPath,
  } = attendance;

  return (
    <Card className="shadow-sm border-[hsl(var(--border))] bg-[hsl(var(--card))] flex flex-col justify-between">
      <div>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-md bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]">
                <CalendarCheck className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-[hsl(var(--foreground))]">
                  Today&apos;s Attendance
                </CardTitle>
                <CardDescription className="text-xs text-[hsl(var(--muted-foreground))]">
                  Academic session completion &amp; student attendance breakdown
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="text-xs font-semibold">
              Live Tracker
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-2">
          {/* Metric 1: Session Completion */}
          <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.2)] p-3.5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                Session Completion
              </span>
              <span className="text-xs font-bold text-[hsl(var(--foreground))]">
                {sessionCompletionPercentage}% Completed
              </span>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-extrabold text-[hsl(var(--foreground))]">
                {sessionsTaken} / {sessionsToday}
              </span>
              <span className="text-xs text-[hsl(var(--muted-foreground))]">sessions taken today</span>
            </div>
          </div>

          {/* Metric 2: Student Attendance */}
          <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.2)] p-3.5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                Student Attendance
              </span>
              <span className="text-xs font-bold text-[hsl(var(--foreground))]">
                {studentAttendancePercentage}% Present
              </span>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-extrabold text-[hsl(var(--foreground))]">
                {presentStudents} / {eligibleStudents}
              </span>
              <span className="text-xs text-[hsl(var(--muted-foreground))]">students present</span>
            </div>
          </div>
        </CardContent>
      </div>

      <CardFooter className="pt-2 border-t border-[hsl(var(--border))]">
        <Link
          href={targetPath || '/academics'}
          className={buttonVariants({ variant: 'outline', size: 'default' }) + ' w-full justify-between min-h-[44px]'}
          aria-label="Navigate to Academics workspace for attendance details"
        >
          <span className="font-semibold text-xs">View Academic Attendance</span>
          <ArrowRight className="h-4 w-4 ml-2" aria-hidden="true" />
        </Link>
      </CardFooter>
    </Card>
  );
}
