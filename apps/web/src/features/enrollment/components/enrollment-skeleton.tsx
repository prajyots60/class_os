import * as React from 'react';

export function EnrollmentSkeleton() {
  return (
    <div className="space-y-4 animate-pulse" data-testid="enrollment-skeleton">
      {/* Header skeleton */}
      <div className="h-10 bg-[hsl(var(--muted))] rounded-md w-1/3" />
      {/* Filters skeleton */}
      <div className="h-12 bg-[hsl(var(--muted))] rounded-xl w-full" />
      {/* Table skeleton */}
      <div className="border border-[hsl(var(--border))] rounded-xl p-4 space-y-3 bg-[hsl(var(--card))]">
        <div className="h-6 bg-[hsl(var(--muted))] rounded w-full" />
        <div className="h-12 bg-[hsl(var(--muted))] rounded w-full" />
        <div className="h-12 bg-[hsl(var(--muted))] rounded w-full" />
        <div className="h-12 bg-[hsl(var(--muted))] rounded w-full" />
      </div>
    </div>
  );
}
