import { describe, it, expect } from 'vitest';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { InstituteParentStatusBadge } from './institute-parent-status-badge';
import { InstituteParentEmptyState } from './institute-parent-empty-state';
import { InstituteParentCard } from './institute-parent-card';
import { InstituteParentDetailsModal } from './institute-parent-details-modal';
import { InstituteParentTable } from './institute-parent-table';

const mockParent = {
  id: 'ip-1',
  instituteId: 'inst-1',
  parentIdentityId: 'pi-1',
  status: 'active' as const,
  notes: 'Prefers evening call',
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
  parentIdentity: {
    id: 'pi-1',
    phone: '+919876543210',
    name: 'Rahul Sharma',
    avatarUrl: null,
    status: 'active' as const,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
  },
};

describe('InstituteParent Presentation Component Suite', () => {
  it('renders Active status badge correctly', () => {
    const html = renderToStaticMarkup(<InstituteParentStatusBadge status="active" />);
    expect(html).toContain('Active');
  });

  it('renders Inactive status badge correctly', () => {
    const html = renderToStaticMarkup(<InstituteParentStatusBadge status="inactive" />);
    expect(html).toContain('Inactive');
  });

  it('renders EmptyState with Add button when canCreate is true', () => {
    const html = renderToStaticMarkup(
      <InstituteParentEmptyState
        hasFilters={false}
        canCreate={true}
        onAddParent={() => {}}
      />,
    );
    expect(html).toContain('No parent relationships yet');
    expect(html).toContain('Add First Parent');
  });

  it('renders Mobile Card view with parent identity and notes', () => {
    const html = renderToStaticMarkup(
      <InstituteParentCard
        parent={mockParent}
        canUpdate={true}
        canArchive={true}
        onViewDetails={() => {}}
        onEdit={() => {}}
        onArchive={() => {}}
      />,
    );

    expect(html).toContain('Rahul Sharma');
    expect(html).toContain('+919876543210');
    expect(html).toContain('Prefers evening call');
    expect(html).toContain('Details');
    expect(html).toContain('Edit');
    expect(html).toContain('Archive');
  });

  it('renders Desktop Table with parent record columns', () => {
    const html = renderToStaticMarkup(
      <InstituteParentTable
        parents={[mockParent]}
        canUpdate={true}
        canArchive={true}
        onViewDetails={() => {}}
        onEdit={() => {}}
        onArchive={() => {}}
      />,
    );

    expect(html).toContain('Rahul Sharma');
    expect(html).toContain('+919876543210');
    expect(html).toContain('Global: active');
    expect(html).toContain('Active');
    expect(html).toContain('Prefers evening call');
  });

  it('renders Details Modal separating Global Identity from Tenant CRM Record', () => {
    const html = renderToStaticMarkup(
      <InstituteParentDetailsModal
        parent={mockParent}
        isOpen={true}
        onClose={() => {}}
      />,
    );

    expect(html).toContain('Global CoachingOS Identity');
    expect(html).toContain('Institute CRM Record');
    expect(html).toContain('pi-1');
    expect(html).toContain('Prefers evening call');
  });
});
