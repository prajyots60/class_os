import { describe, it, expect } from 'vitest';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { GuardianPrimaryBadge, GuardianRelationshipStatusBadge } from './guardian-status-badge';
import { StudentGuardiansSkeleton } from './student-guardians-skeleton';
import { StudentGuardiansEmptyState } from './student-guardians-empty-state';
import { PrimaryReplacementModal } from './primary-replacement-modal';
import { ArchiveGuardianModal } from './archive-guardian-modal';
import { EditGuardianModal } from './edit-guardian-modal';
import { AddGuardianModal } from './add-guardian-modal';
import type { StudentGuardianSummaryDTO } from '../types/guardian-ui.types';

const mockGuardian: StudentGuardianSummaryDTO = {
  id: 'rel-1',
  relationshipId: 'rel-1',
  instituteParentId: 'parent-1',
  relationshipType: 'mother',
  isPrimary: true,
  status: 'active',
  parentName: 'Priya Sharma',
  parentPhone: '+919876543210',
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
};

describe('Guardian Presentation Component Suite', () => {
  it('renders Primary Guardian badge when isPrimary is true', () => {
    const html = renderToStaticMarkup(<GuardianPrimaryBadge isPrimary={true} />);
    expect(html).toContain('Primary');
  });

  it('does not render Primary Guardian badge when isPrimary is false', () => {
    const html = renderToStaticMarkup(<GuardianPrimaryBadge isPrimary={false} />);
    expect(html).toBe('');
  });

  it('renders Active relationship status badge correctly', () => {
    const html = renderToStaticMarkup(<GuardianRelationshipStatusBadge status="active" />);
    expect(html).toContain('Active');
  });

  it('renders Archived relationship status badge correctly', () => {
    const html = renderToStaticMarkup(<GuardianRelationshipStatusBadge status="archived" />);
    expect(html).toContain('Archived');
  });

  it('renders StudentGuardiansSkeleton animated placeholders', () => {
    const html = renderToStaticMarkup(<StudentGuardiansSkeleton />);
    expect(html).toContain('animate-pulse');
  });

  it('renders StudentGuardiansEmptyState with Add Guardian button when authorized', () => {
    const html = renderToStaticMarkup(
      <StudentGuardiansEmptyState canCreate={true} onAddGuardian={() => {}} />,
    );
    expect(html).toContain('No guardians linked yet');
    expect(html).toContain('Add Guardian');
  });

  it('does not render Add Guardian button in empty state when unauthorized', () => {
    const html = renderToStaticMarkup(
      <StudentGuardiansEmptyState canCreate={false} onAddGuardian={() => {}} />,
    );
    expect(html).toContain('No guardians linked yet');
    expect(html).not.toContain('Add Guardian');
  });

  it('renders Primary Replacement Confirmation Modal with proper messaging', () => {
    const html = renderToStaticMarkup(
      <PrimaryReplacementModal
        isOpen={true}
        onClose={() => {}}
        onConfirm={() => {}}
        currentPrimaryName="Priya Sharma"
        newPrimaryCandidateName="Amit Sharma"
      />,
    );
    expect(html).toContain('Make Primary Guardian?');
    expect(html).toContain('Priya Sharma');
    expect(html).toContain('Amit Sharma');
    expect(html).toContain('Make Primary');
  });

  it('renders Archive Guardian Modal explaining entity safety invariants', () => {
    const html = renderToStaticMarkup(
      <ArchiveGuardianModal
        isOpen={true}
        onClose={() => {}}
        onConfirm={() => {}}
        guardianName="Priya Sharma"
        relationshipTypeLabel="Mother"
      />,
    );
    expect(html).toContain('Archive Guardian Relationship?');
    expect(html).toContain('The parent record and student record will not be deleted');
    expect(html).toContain('Archive Relationship');
  });

  it('renders Edit Guardian Modal with relationship type select options', () => {
    const html = renderToStaticMarkup(
      <EditGuardianModal
        isOpen={true}
        onClose={() => {}}
        onSubmit={async () => {}}
        guardian={mockGuardian}
      />,
    );
    expect(html).toContain('Edit Relationship Type');
    expect(html).toContain('Priya Sharma');
    expect(html).toContain('Mother');
    expect(html).toContain('Father');
    expect(html).toContain('Guardian');
  });

  it('renders Add Guardian Modal with relationship options and primary toggle', () => {
    const html = renderToStaticMarkup(
      <AddGuardianModal
        isOpen={true}
        onClose={() => {}}
        onSubmit={async () => {}}
        existingPrimaryGuardianName="Priya Sharma"
      />,
    );
    expect(html).toContain('Add Student Guardian');
    expect(html).toContain('Select Existing Parent');
    expect(html).toContain('Mark as Primary Guardian');
  });
});
