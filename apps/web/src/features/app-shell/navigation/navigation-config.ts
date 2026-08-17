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
        id: 'parents',
        label: 'Parents',
        href: '/parents',
        iconName: 'Users',
        capability: 'parent:read',
        isImplemented: true,
      },
      {
        id: 'students',
        label: 'Students',
        href: '/students',
        iconName: 'Users',
        capability: 'student:read',
        isImplemented: true,
      },
      {
        id: 'enrollments',
        label: 'Enrollments',
        href: '/enrollments',
        iconName: 'UserCheck',
        capability: 'enrollment:read',
        isImplemented: true,
      },
      {
        id: 'staff',
        label: 'Staff & Team',
        href: '/staff',
        iconName: 'UserCheck',
        capability: 'staff:read',
        isImplemented: true,
      },
    ],
  },
  {
    id: 'academics',
    label: 'Academics',
    items: [
      {
        id: 'academic-hierarchy',
        label: 'Academic Workspace',
        href: '/academics',
        iconName: 'BookOpen',
        capability: 'program:read',
        isImplemented: true,
      },
      {
        id: 'attendance',
        label: 'Attendance',
        href: '/academics?tab=attendance',
        iconName: 'CalendarCheck',
        capability: 'academic:read',
        isImplemented: true,
      },
      {
        id: 'tests',
        label: 'Tests & Marks',
        href: '/academics?tab=tests',
        iconName: 'FileText',
        capability: 'academic:read',
        isImplemented: true,
      },
      {
        id: 'reports',
        label: 'Operational Reports',
        href: '/reports',
        iconName: 'BarChart3',
        capability: 'academic:read',
        isImplemented: true,
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
        isImplemented: true,
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
        href: '/communication/announcements',
        iconName: 'Megaphone',
        capability: 'announcement:read',
        isImplemented: true,
      },
      {
        id: 'notifications',
        label: 'Notifications',
        href: '/communication/notifications',
        iconName: 'Bell',
        capability: 'notification:read',
        isImplemented: true,
      },
    ],
  },
  {
    id: 'settings',
    label: 'Administration',
    items: [
      {
        id: 'settings',
        label: 'Settings & Branding',
        href: '/settings',
        iconName: 'Settings',
        capability: 'settings:read',
        isImplemented: true,
      },
    ],
  },
]);

