/**
 * app-shell-types.ts
 *
 * Presentation DTO definitions for the Authenticated Application Shell.
 *
 * SECURITY INVARIANTS:
 * - Only presentation-safe data is passed to client components.
 * - Raw Prisma models, database entities, auth tokens, and session objects are NEVER exposed.
 */

import type { NavigationSection } from '../navigation/navigation-types';

export interface UserDisplay {
  id: string;
  name: string;
  email: string;
}

export interface TenantDisplay {
  role: string;
  status: string;
  capabilities: readonly string[];
}

export interface InstituteDisplay {
  name: string;
  slug: string;
  status: string;
  logoUrl?: string | null;
}

export interface AppShellProps {
  user: UserDisplay;
  tenant: TenantDisplay;
  institute: InstituteDisplay;
  navigationSections?: readonly NavigationSection[];
  children: React.ReactNode;
}

