import * as React from 'react';
import { Badge } from '@coaching-os/ui';
import type { StudentAdmissionStatus, StudentStatus } from '../types/student-ui.types';

export interface StudentAdmissionStatusBadgeProps {
  status: StudentAdmissionStatus;
  className?: string;
}

export function StudentAdmissionStatusBadge({ status, className = '' }: StudentAdmissionStatusBadgeProps) {
  switch (status) {
    case 'admitted':
      return (
        <Badge
          variant="outline"
          className={`bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 ${className}`}
        >
          Admitted
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
    case 'rejected':
      return (
        <Badge
          variant="outline"
          className={`bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800 ${className}`}
        >
          Rejected
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

export interface StudentStatusBadgeProps {
  status: StudentStatus;
  className?: string;
}

export function StudentStatusBadge({ status, className = '' }: StudentStatusBadgeProps) {
  switch (status) {
    case 'active':
      return (
        <Badge
          variant="outline"
          className={`bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-800 ${className}`}
        >
          Active
        </Badge>
      );
    case 'inactive':
      return (
        <Badge
          variant="outline"
          className={`bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-400 dark:border-yellow-800 ${className}`}
        >
          Inactive
        </Badge>
      );
    case 'archived':
      return (
        <Badge
          variant="outline"
          className={`bg-zinc-100 text-zinc-600 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700 ${className}`}
        >
          Archived
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}
