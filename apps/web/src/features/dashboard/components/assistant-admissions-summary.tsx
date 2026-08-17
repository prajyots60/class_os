'use client';

import React from 'react';
import Link from 'next/link';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  buttonVariants,
} from '@coaching-os/ui';
import { UserPlus, ClipboardList, ArrowRight } from 'lucide-react';
import type { AssistantAdmissionsSummaryDTO } from '@coaching-os/administration';

export interface AssistantAdmissionsSummaryProps {
  admissions: AssistantAdmissionsSummaryDTO;
}

export function AssistantAdmissionsSummary({ admissions }: AssistantAdmissionsSummaryProps) {
  return (
    <Card className="shadow-sm border-[hsl(var(--border))] bg-[hsl(var(--card))] flex flex-col justify-between">
      <div>
        <CardHeader className="pb-3">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-md bg-blue-500/10 text-blue-600">
              <UserPlus className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-[hsl(var(--foreground))]">
                Admissions &amp; Enrollments
              </CardTitle>
              <CardDescription className="text-xs text-[hsl(var(--muted-foreground))]">
                Today&apos;s new admissions and pending enrollment actions
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3 pt-1">
          {/* New Admissions Today */}
          <div className="flex items-center justify-between rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.15)] p-3">
            <div className="flex items-center space-x-2">
              <UserPlus className="h-4 w-4 text-blue-500" aria-hidden="true" />
              <span className="text-sm font-semibold text-[hsl(var(--foreground))]">
                New Admissions Today
              </span>
            </div>
            <span
              className="text-xl font-extrabold text-[hsl(var(--foreground))]"
              data-testid="admissions-today-count"
            >
              {admissions.admissionsTodayCount}
            </span>
          </div>

          {/* Pending Enrollments */}
          <div className="flex items-center justify-between rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.15)] p-3">
            <div className="flex items-center space-x-2">
              <ClipboardList className="h-4 w-4 text-amber-500" aria-hidden="true" />
              <div>
                <span className="text-sm font-semibold text-[hsl(var(--foreground))]">
                  Pending Enrollments
                </span>
                <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
                  Awaiting batch assignment
                </p>
              </div>
            </div>
            <span
              className="text-xl font-extrabold text-[hsl(var(--foreground))]"
              data-testid="pending-enrollments-count"
            >
              {admissions.pendingEnrollmentsCount}
            </span>
          </div>
        </CardContent>
      </div>

      <CardFooter className="flex flex-col gap-2 pt-2 border-t border-[hsl(var(--border))]">
        <Link
          href="/students"
          className={buttonVariants({ variant: 'outline', size: 'sm' }) + ' w-full justify-between min-h-[44px]'}
          aria-label="Navigate to Students workspace to manage admissions"
        >
          <span className="font-semibold text-xs">Manage Admissions</span>
          <ArrowRight className="h-3.5 w-3.5 ml-2" aria-hidden="true" />
        </Link>
        <Link
          href={admissions.targetPath || '/enrollments'}
          className={buttonVariants({ variant: 'outline', size: 'sm' }) + ' w-full justify-between min-h-[44px]'}
          aria-label="Navigate to Enrollments workspace to manage pending enrollments"
        >
          <span className="font-semibold text-xs">Manage Enrollments</span>
          <ArrowRight className="h-3.5 w-3.5 ml-2" aria-hidden="true" />
        </Link>
      </CardFooter>
    </Card>
  );
}
