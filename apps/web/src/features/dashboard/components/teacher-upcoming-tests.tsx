'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, buttonVariants, Badge } from '@coaching-os/ui';
import { FileText, Calendar, ArrowRight } from 'lucide-react';
import type { TeacherUpcomingTestDTO } from '@coaching-os/administration';

export interface TeacherUpcomingTestsProps {
  tests: TeacherUpcomingTestDTO[];
}

export function TeacherUpcomingTests({ tests }: TeacherUpcomingTestsProps) {
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return new Intl.DateTimeFormat('en-IN', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }).format(date);
    } catch {
      return dateStr;
    }
  };

  return (
    <Card className="shadow-sm border-[hsl(var(--border))] bg-[hsl(var(--card))] flex flex-col justify-between">
      <div>
        <CardHeader className="pb-3">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-md bg-purple-500/10 text-purple-600">
              <FileText className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-[hsl(var(--foreground))]">
                Upcoming Tests (Next 7 Days)
              </CardTitle>
              <CardDescription className="text-xs text-[hsl(var(--muted-foreground))]">
                Scheduled tests &amp; examinations for your batches
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3 pt-1">
          {tests.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[hsl(var(--border))] p-6 text-center">
              <FileText className="mx-auto h-8 w-8 text-[hsl(var(--muted-foreground))] opacity-50" aria-hidden="true" />
              <p className="mt-2 text-xs font-semibold text-[hsl(var(--foreground))]">
                No upcoming tests scheduled
              </p>
              <p className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">
                There are no examinations scheduled for your batches in the next 7 days.
              </p>
            </div>
          ) : (
            tests.map((testItem) => (
              <div
                key={testItem.id}
                className="flex items-center justify-between rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.15)] p-3 transition-colors hover:bg-[hsl(var(--muted)/0.3)]"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-[hsl(var(--foreground))]">
                      {testItem.title}
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      {testItem.batchName}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-1.5 text-[11px] text-[hsl(var(--muted-foreground))]">
                    <Calendar className="h-3 w-3" aria-hidden="true" />
                    <span>Scheduled: {formatDate(testItem.testDate)}</span>
                  </div>
                </div>
                <Badge variant="secondary" className="text-[10px] capitalize">
                  {testItem.status}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </div>

      <CardFooter className="pt-2 border-t border-[hsl(var(--border))]">
        <Link
          href="/academics?tab=tests"
          className={buttonVariants({ variant: 'outline', size: 'default' }) + ' w-full justify-between min-h-[44px]'}
          aria-label="Navigate to Academics workspace to manage tests"
        >
          <span className="font-semibold text-xs">View Tests &amp; Assessments</span>
          <ArrowRight className="h-4 w-4 ml-2" aria-hidden="true" />
        </Link>
      </CardFooter>
    </Card>
  );
}
