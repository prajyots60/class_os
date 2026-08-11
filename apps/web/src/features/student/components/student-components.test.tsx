import { describe, it, expect } from 'vitest';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StudentAdmissionStatusBadge, StudentStatusBadge } from './student-status-badge';
import { StudentEmptyState } from './student-empty-state';
import { StudentCard } from './student-card';
import { StudentTable } from './student-table';
import { StudentDetailsModal } from './student-details-modal';
import type { StudentDTO } from '../types/student-ui.types';

const mockStudent: StudentDTO = {
  id: 'std-1',
  instituteId: 'inst-1',
  admissionNumber: 'ADM-2026-001',
  firstName: 'Aarav',
  middleName: null,
  lastName: 'Patel',
  displayName: 'Aarav Patel',
  dateOfBirth: '2010-05-15T00:00:00.000Z',
  gender: 'male',
  phone: '+919876543210',
  email: 'aarav@example.com',
  address: '123 MG Road',
  city: 'Mumbai',
  state: 'Maharashtra',
  postalCode: '400001',
  admissionDate: null,
  admissionStatus: 'pending',
  status: 'inactive',
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
  deletedAt: null,
};

describe('Student Presentation Component Suite', () => {
  it('renders Pending admission status badge correctly', () => {
    const html = renderToStaticMarkup(<StudentAdmissionStatusBadge status="pending" />);
    expect(html).toContain('Pending');
  });

  it('renders Admitted admission status badge correctly', () => {
    const html = renderToStaticMarkup(<StudentAdmissionStatusBadge status="admitted" />);
    expect(html).toContain('Admitted');
  });

  it('renders Active standing status badge correctly', () => {
    const html = renderToStaticMarkup(<StudentStatusBadge status="active" />);
    expect(html).toContain('Active');
  });

  it('renders EmptyState with Add Student button when canCreate is true', () => {
    const html = renderToStaticMarkup(
      <StudentEmptyState
        isSearchOrFilterActive={false}
        canCreate={true}
        onAddStudentClick={() => {}}
      />,
    );
    expect(html).toContain('No students enrolled yet');
    expect(html).toContain('Add Student');
  });

  it('renders Search EmptyState when search is active', () => {
    const html = renderToStaticMarkup(
      <StudentEmptyState
        isSearchOrFilterActive={true}
        canCreate={true}
        onResetFiltersClick={() => {}}
      />,
    );
    expect(html).toContain('No students match your criteria');
    expect(html).toContain('Reset Filters');
  });

  it('renders Mobile Card view with student details and action controls', () => {
    const html = renderToStaticMarkup(
      <StudentCard
        student={mockStudent}
        canUpdate={true}
        canArchive={true}
        onViewDetails={() => {}}
        onEdit={() => {}}
        onAdmit={() => {}}
        onReject={() => {}}
        onCancel={() => {}}
        onActivate={() => {}}
        onDeactivate={() => {}}
        onArchive={() => {}}
      />,
    );

    expect(html).toContain('Aarav Patel');
    expect(html).toContain('ADM-2026-001');
    expect(html).toContain('+919876543210');
    expect(html).toContain('Admit');
    expect(html).toContain('Reject');
    expect(html).toContain('Cancel');
  });

  it('renders Desktop Table with student columns and lifecycle buttons', () => {
    const html = renderToStaticMarkup(
      <StudentTable
        students={[mockStudent]}
        canUpdate={true}
        canArchive={true}
        onViewDetails={() => {}}
        onEdit={() => {}}
        onAdmit={() => {}}
        onReject={() => {}}
        onCancel={() => {}}
        onActivate={() => {}}
        onDeactivate={() => {}}
        onArchive={() => {}}
      />,
    );

    expect(html).toContain('Aarav Patel');
    expect(html).toContain('ADM-2026-001');
    expect(html).toContain('aarav@example.com');
    expect(html).toContain('Pending');
    expect(html).toContain('Inactive');
  });

  it('renders Student Details Modal displaying student profile information', () => {
    const html = renderToStaticMarkup(
      <StudentDetailsModal
        student={mockStudent}
        isOpen={true}
        onClose={() => {}}
      />,
    );

    expect(html).toContain('Aarav Patel');
    expect(html).toContain('ADM-2026-001');
    expect(html).toContain('aarav@example.com');
    expect(html).toContain('+919876543210');
    expect(html).toContain('Identity &amp; Admission');
  });
});
