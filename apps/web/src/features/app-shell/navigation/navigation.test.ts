import { describe, it, expect } from 'vitest';
import { APP_NAVIGATION_CONFIG } from './navigation-config';
import { filterNavigationByRole } from './navigation-visibility';

describe('Navigation Architecture & Role Filtering Suite', () => {
  it('APP_NAVIGATION_CONFIG contains valid sections and non-empty items', () => {
    expect(APP_NAVIGATION_CONFIG.length).toBeGreaterThan(0);
    const allHrefs = new Set<string>();

    APP_NAVIGATION_CONFIG.forEach((section) => {
      expect(section.id).toBeDefined();
      expect(section.label).toBeDefined();
      expect(section.items.length).toBeGreaterThan(0);

      section.items.forEach((item) => {
        expect(item.id).toBeDefined();
        expect(item.label).toBeDefined();
        expect(item.href).toBeDefined();
        expect(item.iconName).toBeDefined();
        // Check no duplicate hrefs
        expect(allHrefs.has(item.href)).toBe(false);
        allHrefs.add(item.href);
      });
    });
  });

  it('Owner role receives 100% of configured navigation items', () => {
    const ownerNav = filterNavigationByRole('owner');
    const totalConfigItems = APP_NAVIGATION_CONFIG.reduce(
      (acc, s) => acc + s.items.length,
      0,
    );
    const totalOwnerItems = ownerNav.reduce((acc, s) => acc + s.items.length, 0);

    expect(totalOwnerItems).toBe(totalConfigItems);
  });

  it('Teacher role sees Overview, Management, Academics, Communication, but NOT Finance (Billing)', () => {
    const teacherNav = filterNavigationByRole('teacher');
    const sectionIds = teacherNav.map((s) => s.id);

    expect(sectionIds).toContain('overview');
    expect(sectionIds).toContain('academics');
    expect(sectionIds).toContain('communication');
    // Teacher canonical capabilities do not include billing:read
    expect(sectionIds).not.toContain('finance');
  });

  it('Parent role receives Student, Academic, Attendance, Test, Billing, Announcement navigation items', () => {
    const parentNav = filterNavigationByRole('parent');
    const parentItemIds = parentNav.flatMap((s) => s.items.map((i) => i.id));

    expect(parentItemIds).toContain('dashboard');
    expect(parentItemIds).toContain('students');
    expect(parentItemIds).toContain('academic-hierarchy');
    expect(parentItemIds).toContain('attendance');
    expect(parentItemIds).toContain('tests');
    expect(parentItemIds).toContain('billing');
    expect(parentItemIds).toContain('announcements');
    // Parent does not have staff:read
    expect(parentItemIds).not.toContain('staff');
  });

  it('Unknown role receives deny-by-default — only items without capability requirements', () => {
    const unknownNav = filterNavigationByRole('unknown_role');
    const unknownItemIds = unknownNav.flatMap((s) => s.items.map((i) => i.id));

    expect(unknownItemIds).toEqual(['dashboard']);
  });
});
