'use client';

import * as React from 'react';
import { Button } from '@coaching-os/ui';
import { SearchX, FilterX, AlertTriangle, RefreshCw } from 'lucide-react';

export interface OperationalTableEmptyProps {
  isFiltered: boolean;
  resourceName?: string;
  onClearFilters?: () => void;
}

export function OperationalTableEmpty({
  isFiltered,
  resourceName = 'records',
  onClearFilters,
}: OperationalTableEmptyProps) {
  return (
    <div
      className="flex flex-col items-center justify-center p-8 text-center bg-[hsl(var(--card))]"
      data-testid="operational-table-empty"
    >
      <div className="p-3 rounded-full bg-[hsl(var(--muted)/0.5)] text-[hsl(var(--muted-foreground))] mb-3">
        {isFiltered ? <FilterX className="h-6 w-6" /> : <SearchX className="h-6 w-6" />}
      </div>
      <h3 className="text-sm font-semibold text-[hsl(var(--foreground))]">
        {isFiltered ? `No ${resourceName} match these filters.` : `No ${resourceName} found.`}
      </h3>
      <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1 max-w-sm">
        {isFiltered
          ? 'Try adjusting your search query or clearing active filter parameters.'
          : `There are currently no ${resourceName} registered in this system.`}
      </p>

      {isFiltered && onClearFilters && (
        <Button
          variant="outline"
          size="sm"
          onClick={onClearFilters}
          aria-label="Clear filters"
          data-testid="empty-clear-filters-button"
          className="mt-4 min-h-[44px]"
        >
          <FilterX className="h-3.5 w-3.5 mr-1.5" />
          <span>Clear filters</span>
        </Button>
      )}
    </div>
  );
}

export interface OperationalTableErrorProps {
  message?: string;
  onRetry?: () => void;
}

export function OperationalTableError({
  message = 'Unable to load table data. Please try again.',
  onRetry,
}: OperationalTableErrorProps) {
  return (
    <div
      className="flex flex-col items-center justify-center p-8 text-center bg-[hsl(var(--card))] border border-[hsl(var(--destructive)/0.3)] rounded-lg"
      data-testid="operational-table-error"
    >
      <div className="p-3 rounded-full bg-[hsl(var(--destructive)/0.1)] text-[hsl(var(--destructive))] mb-3">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <h3 className="text-sm font-semibold text-[hsl(var(--foreground))]">Table Data Error</h3>
      <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1 max-w-sm">
        {message && !message.includes('Prisma') && !message.includes('SQL')
          ? message
          : 'Unable to load table data right now. Please verify connectivity and retry.'}
      </p>

      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          aria-label="Retry loading table data"
          data-testid="table-error-retry-button"
          className="mt-4 min-h-[44px]"
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          <span>Retry Load</span>
        </Button>
      )}
    </div>
  );
}

export interface OperationalTableSkeletonProps {
  rows?: number;
  columns?: number;
}

export function OperationalTableSkeleton({ rows = 5, columns = 5 }: OperationalTableSkeletonProps) {
  return (
    <div className="space-y-3 p-4 bg-[hsl(var(--card))]" data-testid="operational-table-skeleton">
      <div className="flex items-center justify-between pb-2 border-b border-[hsl(var(--border))]">
        <div className="h-4 w-32 bg-[hsl(var(--muted)/0.6)] rounded animate-pulse" />
        <div className="h-4 w-20 bg-[hsl(var(--muted)/0.6)] rounded animate-pulse" />
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center justify-between py-2 space-x-4">
          {Array.from({ length: columns }).map((_, c) => (
            <div
              key={c}
              className={`h-4 bg-[hsl(var(--muted)/0.4)] rounded animate-pulse ${
                c === 0 ? 'w-1/4' : 'w-1/6'
              }`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
