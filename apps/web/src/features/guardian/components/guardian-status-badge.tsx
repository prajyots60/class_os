'use client';

import React from 'react';
import { Badge } from '@coaching-os/ui';
import { Star, ShieldAlert, CheckCircle2 } from 'lucide-react';
import type { GuardianRelationshipStatus } from '../types/guardian-ui.types';

export interface GuardianPrimaryBadgeProps {
  isPrimary: boolean;
  className?: string;
}

export function GuardianPrimaryBadge({ isPrimary, className = '' }: GuardianPrimaryBadgeProps) {
  if (!isPrimary) return null;

  return (
    <Badge
      variant="outline"
      className={`bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 gap-1 font-semibold text-[11px] uppercase tracking-wider ${className}`}
      data-testid="primary-guardian-badge"
    >
      <Star className="h-3 w-3 fill-amber-500 text-amber-500 shrink-0" aria-hidden="true" />
      <span>Primary</span>
    </Badge>
  );
}

export interface GuardianRelationshipStatusBadgeProps {
  status: GuardianRelationshipStatus;
  className?: string;
}

export function GuardianRelationshipStatusBadge({ status, className = '' }: GuardianRelationshipStatusBadgeProps) {
  if (status === 'archived') {
    return (
      <Badge
        variant="outline"
        className={`bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20 gap-1 font-medium text-[11px] ${className}`}
        data-testid="archived-relationship-badge"
      >
        <ShieldAlert className="h-3 w-3 text-slate-500 shrink-0" aria-hidden="true" />
        <span>Archived</span>
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className={`bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 gap-1 font-medium text-[11px] ${className}`}
      data-testid="active-relationship-badge"
    >
      <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" aria-hidden="true" />
      <span>Active</span>
    </Badge>
  );
}
