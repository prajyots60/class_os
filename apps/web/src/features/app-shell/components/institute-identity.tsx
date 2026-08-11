import * as React from 'react';
import { Badge } from '@coaching-os/ui';
import type { InstituteDisplay } from '../types/app-shell-types';

export interface InstituteIdentityProps {
  institute: InstituteDisplay;
  role: string;
  className?: string;
}

/**
 * Deterministically generates a 2-letter uppercase initials badge from an institute name.
 * e.g. "Sharma Physics Classes" -> "SP", "Vanguard Academy" -> "VA", "Apex" -> "AP"
 */
function getInstituteInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'CO';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/**
 * InstituteIdentity — displays the current institute workspace branding and role.
 * Safe presentation component receiving pre-resolved server data.
 */
export function InstituteIdentity({ institute, role, className = '' }: InstituteIdentityProps) {
  const initials = getInstituteInitials(institute.name);

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {institute.logoUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={institute.logoUrl}
          alt={`${institute.name} logo`}
          className="h-10 w-10 shrink-0 rounded-lg object-cover shadow-sm border border-[hsl(var(--border))]"
        />
      ) : (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--primary))] font-bold text-white shadow-sm">
          {initials}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-sm font-bold text-[hsl(var(--foreground))]" title={institute.name}>
          {institute.name}
        </h2>
        <div className="mt-0.5 flex items-center space-x-1.5">
          <Badge variant="outline" className="px-1.5 py-0 text-[10px] capitalize font-medium">
            {role}
          </Badge>
        </div>
      </div>
    </div>
  );
}
