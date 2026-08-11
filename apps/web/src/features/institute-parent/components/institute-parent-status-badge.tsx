import * as React from 'react';
import { Badge } from '@coaching-os/ui';

export interface InstituteParentStatusBadgeProps {
  status: 'active' | 'inactive';
  className?: string;
}

/**
 * InstituteParentStatusBadge — renders tenant-local CRM standing.
 */
export function InstituteParentStatusBadge({
  status,
  className = '',
}: InstituteParentStatusBadgeProps) {
  if (status === 'active') {
    return (
      <Badge
        variant="default"
        className={`bg-[hsl(var(--primary))] text-white border-transparent text-[10px] uppercase tracking-wider font-bold ${className}`}
      >
        Active
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className={`bg-[hsl(var(--muted)/0.4)] text-[hsl(var(--muted-foreground))] border-[hsl(var(--border))] text-[10px] uppercase tracking-wider font-medium ${className}`}
    >
      Inactive
    </Badge>
  );
}
