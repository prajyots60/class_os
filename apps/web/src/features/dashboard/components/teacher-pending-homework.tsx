'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, buttonVariants, Badge } from '@coaching-os/ui';
import { BookOpen, Calendar, ArrowRight } from 'lucide-react';
import type { TeacherPendingHomeworkDTO } from '@coaching-os/administration';

export interface TeacherPendingHomeworkProps {
  homework: TeacherPendingHomeworkDTO[];
}

export function TeacherPendingHomework({ homework }: TeacherPendingHomeworkProps) {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'No homework assigned recently';
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('en-IN', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };

  return (
    <Card className="shadow-sm border-[hsl(var(--border))] bg-[hsl(var(--card))] flex flex-col justify-between">
      <div>
        <CardHeader className="pb-3">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-md bg-amber-500/10 text-amber-600">
              <BookOpen className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-[hsl(var(--foreground))]">
                Homework Attention
              </CardTitle>
              <CardDescription className="text-xs text-[hsl(var(--muted-foreground))]">
                Pending homework updates for your assigned batches
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3 pt-1">
          {homework.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[hsl(var(--border))] p-6 text-center">
              <BookOpen className="mx-auto h-8 w-8 text-[hsl(var(--muted-foreground))] opacity-50" aria-hidden="true" />
              <p className="mt-2 text-xs font-semibold text-[hsl(var(--foreground))]">
                No pending homework alerts
              </p>
              <p className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">
                All active assigned batches have up-to-date homework entries.
              </p>
            </div>
          ) : (
            homework.map((item) => (
              <div
                key={item.batchId}
                className="flex items-center justify-between rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.15)] p-3 transition-colors hover:bg-[hsl(var(--muted)/0.3)]"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-[hsl(var(--foreground))]">
                      {item.batchName}
                    </span>
                    <Badge variant="outline" className="text-[10px] uppercase">
                      {item.subjectName}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-1.5 text-[11px] text-[hsl(var(--muted-foreground))]">
                    <Calendar className="h-3 w-3" aria-hidden="true" />
                    <span>Last: {formatDate(item.lastHomeworkDate)}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </div>

      <CardFooter className="pt-2 border-t border-[hsl(var(--border))]">
        <Link
          href="/academics?tab=homework"
          className={buttonVariants({ variant: 'outline', size: 'default' }) + ' w-full justify-between min-h-[44px]'}
          aria-label="Navigate to Academics workspace to manage homework"
        >
          <span className="font-semibold text-xs">Manage Homework</span>
          <ArrowRight className="h-4 w-4 ml-2" aria-hidden="true" />
        </Link>
      </CardFooter>
    </Card>
  );
}
