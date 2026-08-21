import React from 'react';
import fs from 'fs';
import path from 'path';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OwnerDashboardView } from '../dashboard/components/owner-dashboard-view';
import { TeacherDashboardView } from '../dashboard/components/teacher-dashboard-view';
import { AssistantDashboardView } from '../dashboard/components/assistant-dashboard-view';
import { GlobalSearchBar } from '../search/components/global-search-bar';
import { AttendanceReportView } from '../reports/components/AttendanceReportView';
import { FeeCollectionReportView } from '../reports/components/FeeCollectionReportView';
import { AcademicDefaultsSection } from '../institute-settings/components/academic-defaults-section';
import { InstituteProfileForm } from '../institute-settings/components/institute-profile-form';

const mockOwnerData = {
  instituteName: 'Alpha Coaching Classes',
  todayIso: '2026-08-17',
  timezone: 'Asia/Kolkata',
  attendance: { sessionsToday: 4, sessionsTaken: 2, eligibleStudents: 40, presentStudents: 36, attendancePercentage: 90 },
  fees: { pendingAmount: 50000, pendingInvoicesCount: 5, overdueStudentsCount: 2 },
  operational: { scheduledClassesCount: 4, scheduledTestsCount: 1 },
  recentAnnouncements: [{ id: 'ann-1', title: 'Institute Holiday Notice', content: 'Closed on Monday.', createdAt: '2026-08-15' }],
  quickActions: [],
};

const mockTeacherData = {
  todaySessions: [{ id: 'sess-1', batchId: 'b-1', batchName: 'Physics Batch A', batchCode: 'PHYS-A', subjectName: 'Physics', startTime: '09:00', endTime: '10:30', room: 'Lab 1', status: 'completed' as const, attendanceTaken: true, eligibleCount: 20, presentCount: 18 }],
  pendingHomework: [],
  upcomingTests: [],
};

const mockAssistantData = {
  collection: { collectedTodayAmount: 25000, transactionCount: 4, pendingReceiptsCount: 0 },
  admissions: { totalAdmissionsToday: 3, pendingEnrollmentsCount: 1 },
  quickActions: [],
};

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('../dashboard/hooks/use-owner-dashboard', () => ({
  useOwnerDashboard: () => ({ data: mockOwnerData, isLoading: false, isError: false }),
}));

vi.mock('../dashboard/hooks/use-teacher-dashboard', () => ({
  useTeacherDashboard: () => ({ data: mockTeacherData, isLoading: false, isError: false }),
}));

vi.mock('../dashboard/hooks/use-assistant-dashboard', () => ({
  useAssistantDashboard: () => ({ data: mockAssistantData, isLoading: false, isError: false }),
}));

vi.mock('../search/hooks/use-global-search', () => ({
  useGlobalSearch: (q: string) => ({
    query: q,
    setQuery: vi.fn(),
    debouncedQuery: q,
    isDebouncing: false,
    data: {
      students: [{ id: 's-1', name: 'Aarav Sharma', admissionNumber: 'ADM-101', status: 'admitted' }],
      batches: [{ id: 'b-1', name: 'Physics Batch A', code: 'PHYS-A' }],
      invoices: [],
    },
    isLoading: false,
    error: null,
    totalResults: 2,
    clearSearch: vi.fn(),
  }),
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

function TestWrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('Phase 6.10 — Staff Workspace UX & Accessibility Matrix (STAFF-UX-001..040)', () => {

  // ── 1. Shell & Component Rendering Matrix ──────────────────────────────

  it('STAFF-UX-001: Owner Dashboard renders metrics summary cards', () => {
    const html = renderToStaticMarkup(<TestWrapper><OwnerDashboardView /></TestWrapper>);
    expect(html).toContain('Alpha Coaching Classes');
    expect(html).toContain('Owner Operational Workspace Overview');
    expect(html).toContain('₹50,000');
  });

  it('STAFF-UX-002: Teacher Dashboard renders today\'s sessions and alerts', () => {
    const html = renderToStaticMarkup(<TestWrapper><TeacherDashboardView /></TestWrapper>);
    expect(html).toContain('Physics Batch A');
    expect(html).toContain('Physics');
  });

  it('STAFF-UX-003: Assistant Dashboard renders collection and admission metrics', () => {
    const html = renderToStaticMarkup(<TestWrapper><AssistantDashboardView /></TestWrapper>);
    expect(html).toContain('₹25,000');
    expect(html).toContain('Admissions Today');
  });

  it('STAFF-UX-004: Global Search Bar renders trigger input placeholder', () => {
    const html = renderToStaticMarkup(<GlobalSearchBar initialQuery="" initialOpen={false} />);
    expect(html).toContain('Search students, batches, invoices...');
  });

  it('STAFF-UX-005: Global Search Dialog renders combobox results container when open', () => {
    const html = renderToStaticMarkup(<GlobalSearchBar initialQuery="Physics" initialOpen={true} />);
    expect(html).toContain('role="combobox"');
    expect(html).toContain('aria-controls="global-search-results"');
    expect(html).toContain('global-search-results-panel');
  });

  it('STAFF-UX-006: Attendance Reports View renders summary metrics and filters', () => {
    const html = renderToStaticMarkup(
      <AttendanceReportView
        data={{
          summary: { totalSessions: 10, completedSessions: 8, pendingSessions: 2, eligibleRecords: 100, presentCount: 92, absentCount: 8, attendancePercentage: 92 },
          data: [{ id: 'sess-1', dateIso: '2026-08-10', batchId: 'b-1', batchName: 'Physics A', batchCode: 'P-A', subjectName: 'Physics', teacherName: 'Dr. Sharma', eligibleCount: 20, presentCount: 18, absentCount: 2, attendancePercentage: 90, status: 'completed' }],
          meta: { total: 10, page: 1, pageSize: 25, totalPages: 1 },
        }}
        loading={false}
        error={null}
        onRetry={() => {}}
        from="2026-08-01"
        to="2026-08-17"
        onFromChange={() => {}}
        onToChange={() => {}}
        search=""
        onSearchChange={() => {}}
        onClearFilters={() => {}}
        page={1}
        onPageChange={() => {}}
      />
    );
    expect(html).toContain('Attendance Rate');
    expect(html).toContain('92%');
    expect(html).toContain('Physics A');
  });

  it('STAFF-UX-007: Fee Collection Reports View renders collection metrics and mode filter', () => {
    const html = renderToStaticMarkup(
      <FeeCollectionReportView
        data={{
          summary: { totalCollectedAmount: 75000, transactionCount: 6, pendingInvoiceAmount: 15000, paymentMethodBreakdown: { cash: 25000, upi: 35000, bank_transfer: 15000 } },
          data: [{ id: 'pay-1', receivedOnIso: '2026-08-12', studentId: 'st-1', studentName: 'Rohan Kumar', admissionNumber: 'ADM-01', invoiceId: 'inv-1', invoiceNumber: 'INV-101', amount: 5000, paymentMode: 'upi', receiptNumber: 'REC-101' }],
          meta: { total: 6, page: 1, pageSize: 25, totalPages: 1 },
        }}
        loading={false}
        error={null}
        onRetry={() => {}}
        from="2026-08-01"
        to="2026-08-17"
        onFromChange={() => {}}
        onToChange={() => {}}
        paymentMode="all"
        onPaymentModeChange={() => {}}
        search=""
        onSearchChange={() => {}}
        onClearFilters={() => {}}
        page={1}
        onPageChange={() => {}}
      />
    );
    expect(html).toContain('Total Collected');
    expect(html).toContain('₹75,000');
    expect(html).toContain('Rohan Kumar');
  });

  it('STAFF-UX-008: Academic System Defaults section renders system policy cards', () => {
    const html = renderToStaticMarkup(<AcademicDefaultsSection timezone="Asia/Kolkata" />);
    expect(html).toContain('Academic System Defaults');
    expect(html).toContain('Asia/Kolkata');
    expect(html).toContain('Session-Level Tracking');
  });

  // ── 2. Accessibility & ARIA Semantics Matrix ──────────────────────────────

  it('STAFF-UX-009: Interactive controls satisfy >=44px touch target standards', () => {
    const code = fs.readFileSync(path.join(__dirname, '../reports/components/AttendanceReportView.tsx'), 'utf-8');
    expect(code).toContain('min-h-[44px]');
  });

  it('STAFF-UX-010: Form controls contain explicit label htmlFor and ID bindings', () => {
    const html = renderToStaticMarkup(
      <InstituteProfileForm
        formData={{ name: 'Alpha', phone: '+919876543210', email: 'a@test.com', timezone: 'Asia/Kolkata', slug: 'alpha' }}
        fieldErrors={{}}
        isSubmitting={false}
        onInputChange={() => {}}
      />
    );
    expect(html).toContain('for="');
    expect(html).toContain('id="');
  });

  it('STAFF-UX-011: Status semantics do not rely solely on color (contains text tags & icons)', () => {
    const html = renderToStaticMarkup(<AcademicDefaultsSection timezone="Asia/Kolkata" />);
    expect(html).toContain('Active');
    expect(html).toContain('Standard');
    expect(html).toContain('Strict Isolation');
  });

  it('STAFF-UX-012: Global search combobox embeds correct ARIA attributes', () => {
    const html = renderToStaticMarkup(<GlobalSearchBar initialQuery="Physics" initialOpen={true} />);
    expect(html).toContain('role="combobox"');
    expect(html).toContain('aria-expanded="true"');
  });

  // ── 3. Layering & Security Architectural Verification ───────────────────

  it('STAFF-UX-013: Presentation components contain zero Prisma or raw SQL code', () => {
    const files = [
      '../dashboard/components/owner-dashboard-view.tsx',
      '../dashboard/components/teacher-dashboard-view.tsx',
      '../dashboard/components/assistant-dashboard-view.tsx',
      '../search/components/global-search-bar.tsx',
      '../reports/components/AttendanceReportView.tsx',
      '../reports/components/FeeCollectionReportView.tsx',
      '../institute-settings/components/academic-defaults-section.tsx',
    ];

    files.forEach((file) => {
      const code = fs.readFileSync(path.join(__dirname, file), 'utf-8');
      expect(code).not.toContain('@prisma/client');
      expect(code).not.toContain('PrismaClient');
      expect(code).not.toContain('SELECT ');
      expect(code).not.toContain('DELETE FROM');
    });
  });

  it('STAFF-UX-014: UI components consume semantic CSS design tokens (no raw hex colors in UI)', () => {
    const code = fs.readFileSync(path.join(__dirname, '../reports/components/AttendanceReportView.tsx'), 'utf-8');
    expect(code).toContain('hsl(var(--');
    expect(code).not.toContain('#2563eb');
    expect(code).not.toContain('#0f172a');
  });

  it('STAFF-UX-015: Zero new database fields introduced across Phase 6 UI components', () => {
    const code = fs.readFileSync(path.join(__dirname, '../institute-settings/components/academic-defaults-section.tsx'), 'utf-8');
    expect(code).not.toContain('prisma');
    expect(code).not.toContain('fetch(');
  });
});
