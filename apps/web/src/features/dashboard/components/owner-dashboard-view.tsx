'use client';

import React from 'react';
import { useOwnerDashboard } from '../hooks/use-owner-dashboard';
import { OwnerAttendanceCard } from './owner-attendance-card';
import { OwnerQuickActions } from './owner-quick-actions';
import { OwnerOperationalAttention } from './owner-operational-attention';
import { OwnerAnnouncementsCard } from './owner-announcements-card';
import { Card, CardHeader, CardTitle, CardDescription, CardFooter, Button, Skeleton, Badge } from '@coaching-os/ui';
import { AlertTriangle, RefreshCw, Building2, Calendar, Globe } from 'lucide-react';

export function OwnerDashboardView() {
  const { data, isLoading, isError, error, refetch, isRefetching } = useOwnerDashboard();

  // 1. Loading Experience (Preserves layout shape with Skeletons)
  if (isLoading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6" data-testid="owner-dashboard-loading">
        {/* Header Skeleton */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-[hsl(var(--border))] pb-4">
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-6 w-32" />
        </div>

        {/* Attendance Card & Quick Actions Skeleton Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>

        {/* Operational Attention Skeleton */}
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  // 2. Error Experience (Safe user-facing message with Retry)
  if (isError || !data) {
    const userSafeMessage = error?.message && !error.message.includes('Prisma') && !error.message.includes('SQL')
      ? error.message
      : 'Unable to load Owner Dashboard operational data. Please verify network connectivity and try again.';

    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6" data-testid="owner-dashboard-error">
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

  // Format today's ISO date into readable locale string
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
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6" data-testid="owner-dashboard-view">
      {/* Header Landmark */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[hsl(var(--border))] pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <Building2 className="h-5 w-5 text-primary" aria-hidden="true" />
            <h1 className="text-2xl font-bold tracking-tight text-[hsl(var(--foreground))]">
              {data.instituteName}
            </h1>
          </div>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
            Owner Operational Workspace Overview
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

      {/* Main Operational Workspace Section */}
      <main className="space-y-6">
        {/* Today's Overview Grid: Attendance & Quick Actions */}
        <section className="grid gap-6 md:grid-cols-2" aria-label="Today's Operational Overview">
          <OwnerAttendanceCard attendance={data.attendance} />
          <OwnerQuickActions actions={data.quickActions} />
        </section>

        {/* Operational Attention Section: Pending Fees & Operational Schedule */}
        <section aria-label="Operational Attention & Schedules">
          <OwnerOperationalAttention fees={data.fees} operational={data.operational} />
        </section>

        {/* Recent Announcements */}
        <section aria-label="Recent Institute Broadcasts">
          <OwnerAnnouncementsCard announcements={data.recentAnnouncements} />
        </section>
      </main>
    </div>
  );
}
