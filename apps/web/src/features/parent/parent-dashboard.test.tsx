import { describe, it, expect, vi } from 'vitest';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  ParentHeader,
  ChildSwitcher,
  ChildSummaryCard,
  InstituteContext,
  TodayOverview,
  TodayActivity,
  ParentDashboardSkeleton,
  ParentDashboardEmpty,
  ParentDashboardError,
  ParentApiClient,
  PARENT_HUB_QUERY_KEY,
  ParentApiError,
  type ParentHubDTO,
  type ParentHubProfileSummaryDTO,
} from './index';

vi.mock('./hooks/use-parent-notifications', () => ({
  useParentUnreadCount: () => ({
    data: { unreadCount: 2 },
    isLoading: false,
    error: null,
  }),
}));

const mockParentHubData: ParentHubDTO = {
  parent: {
    id: 'parent-identity-uuid-12345',
    phone: '+919876543210',
    name: 'Ramesh Sharma',
    avatar: null,
    status: 'active',
  },
  profiles: [
    {
      id: 'profile-uuid-1',
      name: 'Rahul Sharma',
      avatar: null,
      createdAt: '2026-08-16T00:00:00.000Z',
      updatedAt: '2026-08-16T00:00:00.000Z',
      linkedStudents: [
        {
          linkId: 'link-uuid-1',
          studentId: 'student-uuid-1',
          instituteId: 'inst-uuid-1',
          instituteName: 'Alpha Academy',
          admissionNumber: 'ADM-2026-001',
          firstName: 'Rahul',
          middleName: null,
          lastName: 'Sharma',
          fullName: 'Rahul Sharma',
          status: 'active',
          enrollments: [
            {
              id: 'enr-uuid-1',
              batchId: 'batch-uuid-1',
              batchName: 'Physics Batch 2026',
              status: 'active',
            },
          ],
        },
      ],
    },
    {
      id: 'profile-uuid-2',
      name: 'Priya Sharma',
      avatar: null,
      createdAt: '2026-08-16T00:00:00.000Z',
      updatedAt: '2026-08-16T00:00:00.000Z',
      linkedStudents: [
        {
          linkId: 'link-uuid-2',
          studentId: 'student-uuid-2',
          instituteId: 'inst-uuid-2',
          instituteName: 'Beta Coaching',
          admissionNumber: 'ADM-2026-002',
          firstName: 'Priya',
          middleName: null,
          lastName: 'Sharma',
          fullName: 'Priya Sharma',
          status: 'active',
          enrollments: [],
        },
      ],
    },
  ],
  institutes: [
    { id: 'inst-uuid-1', name: 'Alpha Academy', slug: 'alpha-academy', studentCount: 1 },
    { id: 'inst-uuid-2', name: 'Beta Coaching', slug: 'beta-coaching', studentCount: 1 },
  ],
  meta: {
    totalProfiles: 2,
    totalLinks: 2,
    totalInstitutes: 2,
  },
};

describe('Phase 5.5 — Parent Home & Today Activity Dashboard UI Security & Experience Suite', () => {
  // ── PARENT-UI-001 ──────────────────────────────────────────────────────────
  it('PARENT-UI-001: Authenticated parent header renders brand greeting and parent name', () => {
    const html = renderToStaticMarkup(
      <ParentHeader parent={mockParentHubData.parent} onLogout={vi.fn()} />,
    );
    expect(html).toContain('Parent Hub');
    expect(html).toContain('Ramesh Sharma');
  });

  // ── PARENT-UI-002 ──────────────────────────────────────────────────────────
  it('PARENT-UI-002: Parent Hub API data renders in child summary card', () => {
    const html = renderToStaticMarkup(
      <ChildSummaryCard profile={mockParentHubData.profiles[0]} />,
    );
    expect(html).toContain('Rahul Sharma');
    expect(html).toContain('ADM-2026-001');
    expect(html).toContain('Alpha Academy');
    expect(html).toContain('Physics Batch 2026');
  });

  // ── PARENT-UI-003 ──────────────────────────────────────────────────────────
  it('PARENT-UI-003: Multiple child profiles render tablist switcher', () => {
    const html = renderToStaticMarkup(
      <ChildSwitcher
        profiles={mockParentHubData.profiles}
        selectedProfileId="profile-uuid-1"
        onSelectProfile={vi.fn()}
      />,
    );
    expect(html).toContain('role="tablist"');
    expect(html).toContain('Rahul Sharma');
    expect(html).toContain('Priya Sharma');
  });

  // ── PARENT-UI-004 ──────────────────────────────────────────────────────────
  it('PARENT-UI-004: Single child profile hides tab switcher', () => {
    const html = renderToStaticMarkup(
      <ChildSwitcher
        profiles={[mockParentHubData.profiles[0]]}
        selectedProfileId="profile-uuid-1"
        onSelectProfile={vi.fn()}
      />,
    );
    expect(html).toBe('');
  });

  // ── PARENT-UI-005 ──────────────────────────────────────────────────────────
  it('PARENT-UI-005: Multiple connected institutes remain visually distinguishable', () => {
    const html = renderToStaticMarkup(
      <InstituteContext institutes={mockParentHubData.institutes} />,
    );
    expect(html).toContain('Connected Coaching Institutes (2)');
    expect(html).toContain('Alpha Academy');
    expect(html).toContain('Beta Coaching');
    expect(html).toContain('alpha-academy');
  });

  // ── PARENT-UI-006 ──────────────────────────────────────────────────────────
  it('PARENT-UI-006: No child profile empty state renders correctly', () => {
    const html = renderToStaticMarkup(<ParentDashboardEmpty type="no-profiles" />);
    expect(html).toContain('No Child Profiles Configured');
    expect(html).toContain('Your parent account currently has no child profiles');
  });

  // ── PARENT-UI-007 ──────────────────────────────────────────────────────────
  it('PARENT-UI-007: Unlinked child profile state renders correctly', () => {
    const unlinkedProfile: ParentHubProfileSummaryDTO = {
      ...mockParentHubData.profiles[0],
      linkedStudents: [],
    };
    const html = renderToStaticMarkup(<ChildSummaryCard profile={unlinkedProfile} />);
    expect(html).toContain('No students linked yet');
    expect(html).toContain('Unlinked');
  });

  // ── PARENT-UI-008 ──────────────────────────────────────────────────────────
  it('PARENT-UI-008: No activity today state renders correctly', () => {
    const html = renderToStaticMarkup(
      <TodayActivity student={mockParentHubData.profiles[0].linkedStudents[0]} activities={[]} />,
    );
    expect(html).toContain('No activity today');
    expect(html).toContain('has no logged activities or notices for today');
  });

  // ── PARENT-UI-009 ──────────────────────────────────────────────────────────
  it('PARENT-UI-009: Loading skeleton renders placeholders', () => {
    const html = renderToStaticMarkup(<ParentDashboardSkeleton />);
    expect(html).toContain('animate-pulse');
  });

  // ── PARENT-UI-010 ──────────────────────────────────────────────────────────
  it('PARENT-UI-010: Network error renders safe error state with retry', () => {
    const html = renderToStaticMarkup(
      <ParentDashboardError error={new Error('Network offline')} onRetry={vi.fn()} />,
    );
    expect(html).toContain('Unable to Load Parent Dashboard');
    expect(html).toContain('Retry Loading');
  });

  // ── PARENT-UI-011 ──────────────────────────────────────────────────────────
  it('PARENT-UI-011: 401 session expiration renders sign in action', () => {
    const err = new ParentApiError('Unauthorized', 401);
    const html = renderToStaticMarkup(<ParentDashboardError error={err} />);
    expect(html).toContain('Session Expired');
    expect(html).toContain('Sign In Again');
    expect(html).toContain('href="/sign-in"');
  });

  // ── PARENT-UI-012 ──────────────────────────────────────────────────────────
  it('PARENT-UI-012: No internal database IDs are exposed in the HTML markup', () => {
    const html = renderToStaticMarkup(
      <div>
        <ParentHeader parent={mockParentHubData.parent} />
        <ChildSummaryCard profile={mockParentHubData.profiles[0]} />
        <InstituteContext institutes={mockParentHubData.institutes} />
      </div>,
    );
    expect(html).not.toContain('parent-identity-uuid-12345');
    expect(html).not.toContain('profile-uuid-1');
    expect(html).not.toContain('inst-uuid-1');
  });

  // ── PARENT-UI-013 ──────────────────────────────────────────────────────────
  it('PARENT-UI-013: ParentApiClient.getParentHub() sends no authorization query parameters', () => {
    const globalFetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ data: mockParentHubData }), { status: 200 }),
      ),
    );

    ParentApiClient.getParentHub();
    expect(globalFetchSpy).toHaveBeenCalledWith('/api/v1/parent/hub', expect.any(Object));

    const callArg = globalFetchSpy.mock.calls[0][0] as string;
    expect(callArg).not.toContain('parentIdentityId');
    expect(callArg).not.toContain('instituteId');
    expect(callArg).not.toContain('studentId');

    globalFetchSpy.mockRestore();
  });

  // ── PARENT-UI-014 ──────────────────────────────────────────────────────────
  it('PARENT-UI-014: TodayActivity feed is read-only (no mutation inputs or edit controls)', () => {
    const html = renderToStaticMarkup(
      <TodayActivity student={mockParentHubData.profiles[0].linkedStudents[0]} activities={[]} />,
    );
    expect(html).toContain('Read-Only');
    expect(html).not.toContain('<input');
    expect(html).not.toContain('<form');
    expect(html).not.toContain('Edit');
  });

  // ── PARENT-UI-015 ──────────────────────────────────────────────────────────
  it('PARENT-UI-015: Unsafe HTML in profile name is rendered as escaped text', () => {
    const unsafeProfile: ParentHubProfileSummaryDTO = {
      ...mockParentHubData.profiles[0],
      name: '<script>alert("xss")</script>',
    };
    const html = renderToStaticMarkup(<ChildSummaryCard profile={unsafeProfile} />);
    expect(html).not.toContain('<script>alert');
    expect(html).toContain('&lt;script&gt;alert');
  });

  // ── PARENT-UI-[016] ──────────────────────────────────────────────────────────
  it('PARENT-UI-016: ChildSwitcher uses accessible tablist and tab roles', () => {
    const html = renderToStaticMarkup(
      <ChildSwitcher
        profiles={mockParentHubData.profiles}
        selectedProfileId="profile-uuid-1"
        onSelectProfile={vi.fn()}
      />,
    );
    expect(html).toContain('role="tablist"');
    expect(html).toContain('role="tab"');
    expect(html).toContain('aria-selected="true"');
  });

  // ── PARENT-UI-[017] ──────────────────────────────────────────────────────────
  it('PARENT-UI-017: ARIA labels exist on header logout and accessibility controls', () => {
    const html = renderToStaticMarkup(
      <ParentHeader parent={mockParentHubData.parent} onLogout={vi.fn()} />,
    );
    expect(html).toContain('aria-label="Log out of parent PWA"');
  });

  // ── PARENT-UI-018 ──────────────────────────────────────────────────────────
  it('PARENT-UI-018: Header and switcher buttons meet minimum touch target styling', () => {
    const html = renderToStaticMarkup(
      <div>
        <ParentHeader parent={mockParentHubData.parent} onLogout={vi.fn()} />
        <ChildSwitcher
          profiles={mockParentHubData.profiles}
          selectedProfileId="profile-uuid-1"
          onSelectProfile={vi.fn()}
        />
      </div>,
    );
    expect(html).toContain('min-h-[44px]');
  });

  // ── PARENT-UI-019 ──────────────────────────────────────────────────────────
  it('PARENT-UI-019: PARENT_HUB_QUERY_KEY is isolated', () => {
    expect(PARENT_HUB_QUERY_KEY).toEqual(['parent', 'hub']);
  });

  // ── PARENT-UI-020 ──────────────────────────────────────────────────────────
  it('PARENT-UI-020: TodayOverview renders current day status for active student', () => {
    const html = renderToStaticMarkup(
      <TodayOverview student={mockParentHubData.profiles[0].linkedStudents[0]} />,
    );
    expect(html).toContain("Today&#x27;s Status");
    expect(html).toContain('Rahul Sharma');
    expect(html).toContain('1 Active Batch');
  });
});
