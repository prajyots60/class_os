'use client';

import React from 'react';
import { useAssistantDashboard } from '../hooks/use-assistant-dashboard';
import { AssistantCollectionCard } from './assistant-collection-card';
import { AssistantAdmissionsSummary } from './assistant-admissions-summary';
import { AssistantQuickActions } from './assistant-quick-actions';
import { Card, CardHeader, CardTitle, CardDescription, CardFooter, Button, Skeleton, Badge } from '@coaching-os/ui';
import { AlertTriangle, RefreshCw, Briefcase, Calendar, Globe } from 'lucide-react';

export function AssistantDashboardView() {
  const { data, isLoading, isError, error, refetch, isRefetching } = useAssistantDashboard();

  // 1. Loading Experience — layout-matched skeletons, no misleading zeros
  if (isLoading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6" data-testid="assistant-dashboard-loading">
        {/* Header skeleton */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-[hsl(var(--border))] pb-4">
          <div className="space-y-2">
            <Skeleton className="h-7 w-52" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-6 w-32" />
        </div>

        {/* Collection card skeleton */}
        <Skeleton className="h-72 w-full rounded-xl" />

        {/* Lower grid skeleton */}
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-60 w-full rounded-xl" />
          <Skeleton className="h-60 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  // 2. Error Experience — safe message, retry action, no internal details
  if (isError || !data) {
    const userSafeMessage =
      error?.message && !error.message.includes('Prisma') && !error.message.includes('SQL')
        ? error.message
        : 'Unable to load Assistant Dashboard operational data. Please verify network connectivity and try again.';

    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6" data-testid="assistant-dashboard-error">
        <Card className="border-[hsl(var(--destructive)/0.5)] bg-[hsl(var(--card))] shadow-sm">
          <CardHeader>
            <div className="flex items-center space-x-2 text-[hsl(var(--destructive))]">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
              <CardTitle className="text-lg font-bold">Dashboard Data Unavailable</CardTitle>
            </div>
            <CardDescription className="text-sm text-[hsl(var(--muted-foreground))]">
              {userSafeMessage}
            </CardDescription>
          </CardHeader>
          <CardFooter className="pt-2 border-t border-[hsl(var(--border))]">
            <Button
              variant="outline"
              onClick={() => refetch()}
              disabled={isRefetching}
              className="min-h-[44px]"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} aria-hidden="true" />
              Retry Dashboard Load
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Format ISO date for header display without browser timezone business logic
  const formatHeaderDate = (isoStr: string) => {
    try {
      const [year, month, day] = isoStr.split('-').map((v) => parseInt(v, 10));
      const date = new Date(Date.UTC(year, month - 1, day));
      return new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(date);
    } catch {
      return isoStr;
    }
  };

  // 3. Operational Data Render
  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6" data-testid="assistant-dashboard-view">
      {/* Header Landmark */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[hsl(var(--border))] pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <Briefcase className="h-6 w-6 text-primary" aria-hidden="true" />
            <h1 className="text-2xl font-bold tracking-tight text-[hsl(var(--foreground))]">
              Administrative Operations
            </h1>
          </div>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
            Today&apos;s collection, receipts, admissions &amp; front-desk actions
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="flex items-center space-x-1 py-1 px-2.5 text-xs font-semibold">
            <Calendar className="h-3.5 w-3.5 mr-1 text-[hsl(var(--muted-foreground))]" aria-hidden="true" />
            <span>{formatHeaderDate(data.todayIso)}</span>
          </Badge>
          <Badge variant="secondary" className="flex items-center space-x-1 py-1 px-2.5 text-xs">
            <Globe className="h-3.5 w-3.5 mr-1 text-[hsl(var(--muted-foreground))]" aria-hidden="true" />
            <span>{data.timezone}</span>
          </Badge>
        </div>
      </header>

      {/* Main Operational Workspace */}
      <main className="space-y-6">
        {/* Primary metric: Today's Collection — full width prominence */}
        <section aria-label="Today's Collection Summary">
          <AssistantCollectionCard collection={data.collection} />
        </section>

        {/* Secondary operational grid */}
        <section className="grid gap-6 md:grid-cols-2" aria-label="Admissions and Quick Actions">
          <AssistantAdmissionsSummary admissions={data.admissions} />
          <AssistantQuickActions quickActions={data.quickActions} />
        </section>
      </main>
    </div>
  );
}
