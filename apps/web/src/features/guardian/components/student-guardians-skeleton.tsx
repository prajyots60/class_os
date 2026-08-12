'use client';

import React from 'react';

export function StudentGuardiansSkeleton() {
  return (
    <div className="space-y-4 py-2" data-testid="student-guardians-skeleton">
      <div className="flex items-center justify-between pb-2 border-b border-[hsl(var(--border))]">
        <div className="h-4 w-32 bg-[hsl(var(--muted))] rounded animate-pulse" />
        <div className="h-8 w-28 bg-[hsl(var(--muted))] rounded animate-pulse" />
      </div>

      <div className="space-y-3">
        {[1, 2].map((idx) => (
          <div
            key={idx}
            className="p-4 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] space-y-3 animate-pulse"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="h-4 w-20 bg-[hsl(var(--muted))] rounded" />
                  <div className="h-4 w-16 bg-[hsl(var(--muted))] rounded" />
                </div>
                <div className="h-5 w-40 bg-[hsl(var(--muted))] rounded" />
                <div className="h-3 w-28 bg-[hsl(var(--muted))] rounded" />
              </div>
              <div className="h-8 w-20 bg-[hsl(var(--muted))] rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
