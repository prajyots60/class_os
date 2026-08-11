/**
 * navigation-visibility.ts
 *
 * Pure capability-based navigation filtering engine.
 *
 * ARCHITECTURAL PRINCIPLES:
 * - Uses `getCapabilitiesForRole(role)` from `@coaching-os/identity`.
 * - Items without explicit `capability` requirements are visible to all authenticated roles.
 * - Items requiring a capability are checked against the role's canonical capability set.
 * - Sections with 0 visible items after filtering are omitted.
 * - SECURITY NOTE: Navigation filtering is a UX convenience, NOT an authorization boundary.
 *   All server endpoints and domain use cases MUST independently enforce authorization.
 */

import { getCapabilitiesForRole, type Capability } from '@coaching-os/identity';
import { APP_NAVIGATION_CONFIG } from './navigation-config';
import type { NavigationSection } from './navigation-types';

/**
 * Filters the workspace navigation configuration based on the user's role.
 *
 * @param role - The user's institute membership role ('owner', 'teacher', 'assistant', 'parent')
 * @returns Filtered array of NavigationSection objects containing only permitted items.
 */
export function filterNavigationByRole(role: string): readonly NavigationSection[] {
  const roleCapabilities: ReadonlySet<Capability> = getCapabilitiesForRole(role);


  return APP_NAVIGATION_CONFIG.map((section) => {
    const visibleItems = section.items.filter((item) => {
      // No capability requirement -> visible to everyone
      if (!item.capability) return true;
      // Require the role to possess the capability
      return roleCapabilities.has(item.capability);
    });

    return {
      ...section,
      items: visibleItems,
    };
  }).filter((section) => section.items.length > 0);
}
