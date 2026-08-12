'use client';

import React from 'react';
import { Card, CardContent } from '@coaching-os/ui';

export function StaffSkeleton() {
  return (
    <div className="space-y-4" data-testid="staff-skeleton">
      {/* Desktop Skeleton */}
      <div className="hidden md:block border border-border rounded-lg overflow-hidden bg-card">
        <div className="h-10 bg-muted/40 border-b border-border px-4 py-2" />
        <div className="divide-y divide-border">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-4 flex items-center justify-between gap-4 animate-pulse">
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-muted rounded w-1/4" />
                <div className="h-3 bg-muted/60 rounded w-1/3" />
              </div>
              <div className="h-6 bg-muted rounded w-20" />
              <div className="h-6 bg-muted rounded w-20" />
              <div className="h-8 bg-muted rounded w-8" />
            </div>
          ))}
        </div>
      </div>

      {/* Mobile Card Skeleton */}
      <div className="block md:hidden space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="p-4 space-y-3 animate-pulse border-border">
            <CardContent className="p-0 space-y-3">
              <div className="h-4 bg-muted rounded w-1/2" />
              <div className="h-3 bg-muted/60 rounded w-3/4" />
              <div className="flex gap-2 pt-2">
                <div className="h-6 bg-muted rounded w-16" />
                <div className="h-6 bg-muted rounded w-16" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
