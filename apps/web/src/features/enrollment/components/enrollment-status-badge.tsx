import * as React from 'react';
import { Badge } from '@coaching-os/ui';
import type { EnrollmentStatus } from '../types/enrollment-ui.types';

export interface EnrollmentStatusBadgeProps {
  status: EnrollmentStatus;
  className?: string;
}

export function EnrollmentStatusBadge({ status, className = '' }: EnrollmentStatusBadgeProps) {
  switch (status) {
    case 'active':
      return (
        <Badge
          variant="outline"
          className={`bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 ${className}`}
        >
          Active
        </Badge>
      );
    case 'pending':
      return (
        <Badge
          variant="outline"
          className={`bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800 ${className}`}
        >
          Pending
        </Badge>
      );
    case 'completed':
      return (
        <Badge
          variant="outline"
          className={`bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800 ${className}`}
        >
          Completed
        </Badge>
      );
    case 'withdrawn':
      return (
        <Badge
          variant="outline"
          className={`bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800 ${className}`}
        >
          Withdrawn
        </Badge>
      );
    case 'transferred':
      return (
        <Badge
          variant="outline"
          className={`bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800 ${className}`}
        >
          Transferred
        </Badge>
      );
    case 'cancelled':
      return (
        <Badge
          variant="outline"
          className={`bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 ${className}`}
        >
          Cancelled
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}
