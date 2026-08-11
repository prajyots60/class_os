/**
 * navigation-types.ts
 *
 * Strongly-typed definitions for the workspace navigation architecture.
 */

import type { Capability } from '@coaching-os/identity';

export interface NavigationItem {
  id: string;
  label: string;
  href: string;
  /** Name of the Lucide icon to render */
  iconName: string;
  /** Optional RBAC capability requirement for visibility */
  capability?: Capability;
  /** Whether the route has been fully implemented in the product */
  isImplemented: boolean;
  /** Short status description if not implemented (e.g. "Coming Soon") */
  badgeText?: string;
}

export interface NavigationSection {
  id: string;
  label: string;
  items: NavigationItem[];
}
