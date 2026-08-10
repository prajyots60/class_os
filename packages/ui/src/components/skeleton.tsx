import * as React from 'react';
import { cn } from '../lib/utils';

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-[var(--radius-md,0.5rem)] bg-[hsl(var(--muted))]', className)}
      {...props}
    />
  );
}
