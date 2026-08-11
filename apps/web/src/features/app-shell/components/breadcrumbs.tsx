'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbsProps {
  customLabel?: string;
  className?: string;
}

/**
 * Maps raw route slugs into clean human-readable titles.
 */
function formatSegmentLabel(segment: string): string {
  const map: Record<string, string> = {
    dashboard: 'Dashboard',
    onboarding: 'Onboarding',
    students: 'Students',
    staff: 'Staff',
    batches: 'Batches',
    attendance: 'Attendance',
    tests: 'Tests & Marks',
    billing: 'Fees & Billing',
    announcements: 'Announcements',
  };

  if (map[segment.toLowerCase()]) return map[segment.toLowerCase()];

  return segment
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Breadcrumbs — semantic navigation breadcrumb component.
 * WCAG 2.1 AA compliant with aria-label="Breadcrumb" and aria-current="page".
 */
export function Breadcrumbs({ customLabel, className = '' }: BreadcrumbsProps) {
  const pathname = usePathname();

  const segments = (pathname || '')
    .split('/')
    .filter(Boolean);

  if (segments.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className={`flex items-center text-xs ${className}`}>
      <ol className="flex items-center space-x-1.5 flex-wrap">
        <li>
          <Link
            href="/dashboard"
            className="flex items-center text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
            aria-label="Dashboard Home"
          >
            <Home className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </li>

        {segments.map((segment, index) => {
          const isLast = index === segments.length - 1;
          const href = `/${segments.slice(0, index + 1).join('/')}`;
          const label = isLast && customLabel ? customLabel : formatSegmentLabel(segment);

          return (
            <li key={href} className="flex items-center space-x-1.5">
              <ChevronRight className="h-3 w-3 shrink-0 text-[hsl(var(--muted-foreground))]" aria-hidden="true" />
              {isLast ? (
                <span
                  aria-current="page"
                  className="font-medium text-[hsl(var(--foreground))]"
                >
                  {label}
                </span>
              ) : (
                <Link
                  href={href}
                  className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
                >
                  {label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
