import * as React from 'react';
import { Skeleton } from '@coaching-os/ui';

export function StudentSkeleton() {
  return (
    <div className="space-y-6" data-testid="student-skeleton">
      {/* Header Skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>

      {/* Filter Toolbar Skeleton */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between bg-[hsl(var(--card))] p-4 rounded-xl border border-[hsl(var(--border))]">
        <Skeleton className="h-10 w-full md:w-72" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-36" />
          <Skeleton className="h-10 w-36" />
        </div>
      </div>

      {/* Table Skeleton (Desktop) */}
      <div className="hidden md:block border border-[hsl(var(--border))] rounded-xl bg-[hsl(var(--card))] overflow-hidden">
        <div className="p-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
          <div className="grid grid-cols-6 gap-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16 ml-auto" />
          </div>
        </div>
        <div className="divide-y divide-[hsl(var(--border))]">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-4 grid grid-cols-6 gap-4 items-center">
              <div className="space-y-1">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-3.5 w-24" />
              </div>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-8 w-20 ml-auto rounded-lg" />
            </div>
          ))}
        </div>
      </div>

      {/* Mobile Card Skeleton */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="p-4 border border-[hsl(var(--border))] rounded-xl bg-[hsl(var(--card))] space-y-3">
            <div className="flex justify-between items-start">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-40" />
            <div className="pt-2 border-t border-[hsl(var(--border))] flex justify-end gap-2">
              <Skeleton className="h-8 w-20 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
