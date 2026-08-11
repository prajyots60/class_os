import * as React from 'react';
import { Skeleton, Card } from '@coaching-os/ui';

/**
 * InstituteParentSkeleton — loading skeleton placeholder for parent CRM list.
 */
export function InstituteParentSkeleton() {
  return (
    <div className="space-y-4" data-testid="parent-list-skeleton">
      {/* Header controls skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <Skeleton className="h-10 w-64 rounded-md" />
        <Skeleton className="h-10 w-32 rounded-md" />
      </div>

      {/* Table skeleton for desktop */}
      <Card className="hidden md:block p-4 border-[hsl(var(--border))]">
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-[hsl(var(--border))]">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between py-3">
              <div className="flex items-center space-x-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-8 w-20 rounded-md" />
            </div>
          ))}
        </div>
      </Card>

      {/* Card list skeleton for mobile */}
      <div className="md:hidden space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="p-4 border-[hsl(var(--border))] space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-3 w-full" />
            <div className="flex justify-end gap-2 pt-2">
              <Skeleton className="h-8 w-16 rounded-md" />
              <Skeleton className="h-8 w-16 rounded-md" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
