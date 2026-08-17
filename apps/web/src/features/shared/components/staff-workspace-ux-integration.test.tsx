/**
 * Phase 6.7 — Staff Workspace UX Integration & Operational Actions UI Test Suite
 * Tests STAFF-UX-001 through STAFF-UX-025
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { OperationalTableRowActions, type RowActionItem } from './operational-table/operational-table-row-actions';
import { OwnerOperationalAttention } from '../../dashboard/components/owner-operational-attention';
import { OwnerQuickActions } from '../../dashboard/components/owner-quick-actions';
import { AssistantCollectionCard } from '../../dashboard/components/assistant-collection-card';
import { Eye, Edit, Trash } from 'lucide-react';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
  useSearchParams: () => ({
    get: (key: string) => {
      if (key === 'tab') return 'invoices';
      if (key === 'search') return 'Rahul';
      return null;
    },
  }),
}));

describe('Phase 6.7 — Staff Workspace UX Integration Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── STAFF-UX-001..008: Dashboard Navigation Journeys ───────────────────────

  it('STAFF-UX-001: Owner quick action Add Student contains correct target link', () => {
    const actions = [
      { id: 'add-student', label: 'Add Student', targetPath: '/students?action=add', requiredCapability: 'student:create' },
    ];
    const html = renderToStaticMarkup(<OwnerQuickActions actions={actions} />);
    expect(html).toContain('href="/students?action=add"');
    expect(html).toContain('Add Student');
  });

  it('STAFF-UX-002: Owner quick action Record Fee contains correct target link', () => {
    const actions = [
      { id: 'record-fee', label: 'Record Fee', targetPath: '/billing?tab=invoices&action=record-payment', requiredCapability: 'billing:write' },
    ];
    const html = renderToStaticMarkup(<OwnerQuickActions actions={actions} />);
    expect(html).toContain('href="/billing?tab=invoices&amp;action=record-payment"');
    expect(html).toContain('Record Fee');
  });

  it('STAFF-UX-003: Owner quick action Take Attendance contains correct target link', () => {
    const actions = [
      { id: 'take-attendance', label: 'Take Attendance', targetPath: '/academics?tab=attendance', requiredCapability: 'academics:write' },
    ];
    const html = renderToStaticMarkup(<OwnerQuickActions actions={actions} />);
    expect(html).toContain('href="/academics?tab=attendance"');
    expect(html).toContain('Take Attendance');
  });

  it('STAFF-UX-004: Owner quick action New Test contains correct target link', () => {
    const actions = [
      { id: 'create-test', label: 'New Test', targetPath: '/academics?tab=tests&action=create', requiredCapability: 'academics:write' },
    ];
    const html = renderToStaticMarkup(<OwnerQuickActions actions={actions} />);
    expect(html).toContain('href="/academics?tab=tests&amp;action=create"');
    expect(html).toContain('New Test');
  });

  it('STAFF-UX-005: Owner Fee Collection card link defaults to /billing?tab=invoices&status=pending', () => {
    const fees = { pendingAmount: 50000, pendingInvoiceCount: 5, overdueStudentCount: 2, targetPath: '/billing?tab=invoices&status=pending' };
    const operational = { scheduledClassesCount: 4, scheduledTestsCount: 1, targetPath: '/academics?tab=sessions' };
    const html = renderToStaticMarkup(<OwnerOperationalAttention fees={fees} operational={operational} />);
    expect(html).toContain('href="/billing?tab=invoices&amp;status=pending"');
  });

  it('STAFF-UX-006: Owner Today Schedule card link points to /academics?tab=sessions', () => {
    const fees = { pendingAmount: 0, pendingInvoiceCount: 0, overdueStudentCount: 0, targetPath: '/billing?tab=invoices&status=pending' };
    const operational = { scheduledClassesCount: 4, scheduledTestsCount: 1, targetPath: '/academics?tab=sessions' };
    const html = renderToStaticMarkup(<OwnerOperationalAttention fees={fees} operational={operational} />);
    expect(html).toContain('href="/academics?tab=sessions"');
  });

  it('STAFF-UX-007: Assistant collection card defaults to /billing?tab=payments', () => {
    const collection = { collectedTodayAmount: 12000, transactionCount: 3, pendingReceiptCount: 1, targetPath: '/billing?tab=payments' };
    const html = renderToStaticMarkup(<AssistantCollectionCard collection={collection} />);
    expect(html).toContain('href="/billing?tab=payments"');
  });

  // ── STAFF-UX-008..015: Row Actions & Accessibility Matrix ─────────────────

  const dummyActions: RowActionItem[] = [
    { id: 'view', label: 'View Details', icon: Eye, onClick: vi.fn() },
    { id: 'edit', label: 'Edit Profile', icon: Edit, onClick: vi.fn() },
    { id: 'delete', label: 'Delete Item', icon: Trash, variant: 'danger', onClick: vi.fn() },
  ];

  it('STAFF-UX-019: OperationalTableRowActions trigger button has min 44px touch target', () => {
    const html = renderToStaticMarkup(<OperationalTableRowActions actions={dummyActions} rowId="row-101" resourceName="Rahul Sharma" />);
    expect(html).toContain('min-w-[44px]');
    expect(html).toContain('min-h-[44px]');
  });

  it('STAFF-UX-020: OperationalTableRowActions trigger button has correct ARIA attributes', () => {
    const html = renderToStaticMarkup(<OperationalTableRowActions actions={dummyActions} rowId="row-101" resourceName="Rahul Sharma" />);
    expect(html).toContain('aria-label="Actions for Rahul Sharma row-101"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-haspopup="true"');
  });

  it('STAFF-UX-021: OperationalTableRowActions renders row-actions-trigger testid', () => {
    const html = renderToStaticMarkup(<OperationalTableRowActions actions={dummyActions} rowId="row-101" resourceName="Rahul Sharma" />);
    expect(html).toContain('data-testid="row-actions-trigger-row-101"');
  });
});
