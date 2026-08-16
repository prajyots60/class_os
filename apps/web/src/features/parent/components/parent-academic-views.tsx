'use client';

import * as React from 'react';
import { useParentAttendance } from '../hooks/use-parent-attendance';
import { useParentHomework } from '../hooks/use-parent-homework';
import { useParentAssessments } from '../hooks/use-parent-assessments';
import { AttendanceSummary } from './attendance/attendance-summary';
import { AttendanceList } from './attendance/attendance-list';
import { HomeworkList } from './homework/homework-list';
import { AssessmentList } from './assessments/assessment-list';
import { Skeleton, Card, CardContent } from '@coaching-os/ui';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@coaching-os/ui';

interface ParentAcademicViewsProps {
  studentId: string | null;
  studentName?: string;
  activeView: 'attendance' | 'homework' | 'assessments';
}

export function ParentAcademicViews({
  studentId,
  studentName = 'Student',
  activeView,
}: ParentAcademicViewsProps) {
  const attendanceQuery = useParentAttendance(activeView === 'attendance' ? studentId : null);
  const homeworkQuery = useParentHomework(activeView === 'homework' ? studentId : null);
  const assessmentsQuery = useParentAssessments(activeView === 'assessments' ? studentId : null);

  if (!studentId) {
    return (
      <Card className="border border-dashed border-[hsl(var(--border))] text-center p-6">
        <CardContent className="space-y-2 pt-2">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(var(--muted)/0.4)] text-[hsl(var(--muted-foreground))]">
            <AlertCircle className="h-5 w-5" aria-hidden="true" />
          </div>
          <h4 className="text-sm font-semibold text-[hsl(var(--foreground))]">
            No Student Selected
          </h4>
          <p className="text-xs text-[hsl(var(--muted-foreground))] max-w-sm mx-auto">
            Please select an authorized child profile to view academic attendance, homework, and assessment logs.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Render Attendance View
  if (activeView === 'attendance') {
    if (attendanceQuery.isLoading) {
      return (
        <div className="space-y-4">
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
            <Skeleton className="h-24 rounded-lg" />
            <Skeleton className="h-24 rounded-lg" />
            <Skeleton className="h-24 rounded-lg" />
            <Skeleton className="h-24 rounded-lg" />
          </div>
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
      );
    }

    if (attendanceQuery.isError || !attendanceQuery.data) {
      return (
        <Card className="border border-[hsl(var(--destructive)/0.3)] p-6 text-center">
          <CardContent className="space-y-3 pt-2">
            <AlertCircle className="mx-auto h-8 w-8 text-[hsl(var(--destructive))]" aria-hidden="true" />
            <h4 className="text-sm font-semibold text-[hsl(var(--foreground))]">
              Unable to Load Attendance
            </h4>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              A network or authorization error occurred while fetching attendance data for {studentName}.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => attendanceQuery.refetch()}
              className="gap-2 min-h-[44px]"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              Retry
            </Button>
          </CardContent>
        </Card>
      );
    }

    const { summary, records } = attendanceQuery.data;

    return (
      <div className="space-y-4">
        <AttendanceSummary summary={summary} />
        <AttendanceList records={records} />
      </div>
    );
  }

  // Render Homework View
  if (activeView === 'homework') {
    if (homeworkQuery.isLoading) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-11 w-full rounded-md" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-36 rounded-lg" />
            <Skeleton className="h-36 rounded-lg" />
          </div>
        </div>
      );
    }

    if (homeworkQuery.isError || !homeworkQuery.data) {
      return (
        <Card className="border border-[hsl(var(--destructive)/0.3)] p-6 text-center">
          <CardContent className="space-y-3 pt-2">
            <AlertCircle className="mx-auto h-8 w-8 text-[hsl(var(--destructive))]" aria-hidden="true" />
            <h4 className="text-sm font-semibold text-[hsl(var(--foreground))]">
              Unable to Load Homework
            </h4>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              A network or authorization error occurred while fetching homework assignments for {studentName}.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => homeworkQuery.refetch()}
              className="gap-2 min-h-[44px]"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              Retry
            </Button>
          </CardContent>
        </Card>
      );
    }

    const { homework } = homeworkQuery.data;
    return <HomeworkList homework={homework} />;
  }

  // Render Assessments View
  if (assessmentsQuery.isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
        </div>
        <Skeleton className="h-32 w-full rounded-lg" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-36 rounded-lg" />
          <Skeleton className="h-36 rounded-lg" />
        </div>
      </div>
    );
  }

  if (assessmentsQuery.isError || !assessmentsQuery.data) {
    return (
      <Card className="border border-[hsl(var(--destructive)/0.3)] p-6 text-center">
        <CardContent className="space-y-3 pt-2">
          <AlertCircle className="mx-auto h-8 w-8 text-[hsl(var(--destructive))]" aria-hidden="true" />
          <h4 className="text-sm font-semibold text-[hsl(var(--foreground))]">
            Unable to Load Assessment Results
          </h4>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            A network or authorization error occurred while fetching test results for {studentName}.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => assessmentsQuery.refetch()}
            className="gap-2 min-h-[44px]"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { summary, assessments } = assessmentsQuery.data;
  return <AssessmentList summary={summary} assessments={assessments} />;
}
