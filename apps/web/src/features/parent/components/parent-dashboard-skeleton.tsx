'use client';

import * as React from 'react';
import { Skeleton, Card, CardContent, CardHeader } from '@coaching-os/ui';

export function ParentDashboardSkeleton() {
  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      {/* Header Skeleton */}
      <header className="w-full border-b border-[hsl(var(--border))] bg-[hsl(var(--background))] px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
          <Skeleton className="h-9 w-20 rounded-md" />
        </div>
      </header>

      {/* Main Content Skeleton */}
      <main className="mx-auto max-w-4xl space-y-4 p-4 sm:p-6">
        {/* Child Switcher Skeleton */}
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-11 flex-1 rounded-md" />
            <Skeleton className="h-11 flex-1 rounded-md" />
          </div>
        </div>

        {/* Child Card Skeleton */}
        <Card className="border border-[hsl(var(--border))]">
          <CardHeader className="flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-1.5">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-20 w-full rounded-lg" />
          </CardContent>
        </Card>

        {/* Today Overview Skeleton */}
        <Card className="border border-[hsl(var(--border))]">
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-36" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-14 rounded-lg" />
              <Skeleton className="h-14 rounded-lg" />
            </div>
            <Skeleton className="h-16 w-full rounded-lg" />
          </CardContent>
        </Card>

        {/* Today Activity Skeleton */}
        <Card className="border border-[hsl(var(--border))]">
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-40" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
