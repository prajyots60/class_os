/**
 * navigation-config.ts
 *
 * Centralized navigation configuration for CoachingOS workspace.
 *
 * ARCHITECTURAL RULES:
 * - Single source of truth for desktop sidebar and mobile navigation drawer.
 * - Routes marked with `isImplemented: false` are rendered with clear visual
 *   indicators ("Coming Soon") without creating dead/broken links.
 * - `capability` specifies the RBAC capability required for visibility.
 */

import type { NavigationSection } from './navigation-types';

export const APP_NAVIGATION_CONFIG: readonly NavigationSection[] = Object.freeze([
  {
    id: 'overview',
    label: 'Overview',
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        href: '/dashboard',
        iconName: 'LayoutDashboard',
        isImplemented: true,
      },
    ],
  },
  {
    id: 'management',
    label: 'Management',
    items: [
      {
        id: 'students',
        label: 'Students',
        href: '/students',
        iconName: 'Users',
        capability: 'student:read',
        isImplemented: false,
        badgeText: 'Soon',
      },
      {
        id: 'staff',
        label: 'Staff & Team',
        href: '/staff',
        iconName: 'UserCheck',
        capability: 'staff:read',
        isImplemented: false,
        badgeText: 'Soon',
      },
    ],
  },
  {
    id: 'academics',
    label: 'Academics',
    items: [
      {
        id: 'batches',
        label: 'Batches & Schedules',
        href: '/batches',
        iconName: 'BookOpen',
        capability: 'academic:read',
        isImplemented: false,
        badgeText: 'Soon',
      },
      {
        id: 'attendance',
        label: 'Attendance',
        href: '/attendance',
        iconName: 'CalendarCheck',
        capability: 'attendance:read',
        isImplemented: false,
        badgeText: 'Soon',
      },
      {
        id: 'tests',
        label: 'Tests & Marks',
        href: '/tests',
        iconName: 'FileText',
        capability: 'test:read',
        isImplemented: false,
        badgeText: 'Soon',
      },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    items: [
      {
        id: 'billing',
        label: 'Fees & Billing',
        href: '/billing',
        iconName: 'CreditCard',
        capability: 'billing:read',
        isImplemented: false,
        badgeText: 'Soon',
      },
    ],
  },
  {
    id: 'communication',
    label: 'Communication',
    items: [
      {
        id: 'announcements',
        label: 'Announcements',
        href: '/announcements',
        iconName: 'Megaphone',
        capability: 'announcement:read',
        isImplemented: false,
        badgeText: 'Soon',
      },
    ],
  },
]);

