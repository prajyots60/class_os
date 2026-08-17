import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { OwnerAttendanceCard } from './components/owner-attendance-card';
import { OwnerQuickActions } from './components/owner-quick-actions';
import { OwnerOperationalAttention } from './components/owner-operational-attention';
import { OwnerAnnouncementsCard } from './components/owner-announcements-card';
import { OwnerDashboardView } from './components/owner-dashboard-view';
import { useOwnerDashboard } from './hooks/use-owner-dashboard';
import type { OwnerDashboardDTO } from '@coaching-os/administration';

// Mock useOwnerDashboard for view states
vi.mock('./hooks/use-owner-dashboard', () => ({
  useOwnerDashboard: vi.fn(),
}));

vi.mock('./api/dashboard-client', () => ({
  DashboardApiClient: {
    getOwnerDashboard: vi.fn(),
  },
}));

const mockOwnerDTO: OwnerDashboardDTO = {
  instituteId: 'inst-100',
  instituteName: 'Apex Coaching Institute',
  timezone: 'Asia/Kolkata',
  todayIso: '2026-08-17',
  attendance: {
    sessionsToday: 5,
    sessionsTaken: 3,
    eligibleStudents: 120,
    presentStudents: 102,
    sessionCompletionPercentage: 60,
    studentAttendancePercentage: 85,
    targetPath: '/academics',
  },
  fees: {
    pendingAmount: 75000,
    pendingInvoiceCount: 8,
    overdueStudentCount: 3,
    targetPath: '/billing',
  },
  operational: {
    scheduledClassesCount: 5,
    scheduledTestsCount: 2,
  },
  recentAnnouncements: [
    { id: 'ann-1', title: 'Independence Day Holiday', publishedAt: '2026-08-14T09:00:00.000Z', targetScope: 'institute' },
    { id: 'ann-2', title: 'Batch 12 Physics Test Announcement', publishedAt: '2026-08-16T11:00:00.000Z', targetScope: 'batch' },
  ],
  quickActions: [
    { id: 'add-student', label: 'Add Student', targetPath: '/students', requiredCapability: 'student:admit' },
    { id: 'record-fee', label: 'Record Fee', targetPath: '/billing', requiredCapability: 'billing:payment:record' },
    { id: 'take-attendance', label: 'Take Attendance', targetPath: '/academics', requiredCapability: 'academics:attendance:record' },
    { id: 'create-test', label: 'New Test', targetPath: '/academics', requiredCapability: 'academics:test:create' },
  ],
};

type UseOwnerDashboardReturn = ReturnType<typeof useOwnerDashboard>;

describe('Phase 6.2 — Owner Dashboard UI Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('OWNER-DASH-001: Dashboard renders authenticated Owner data', () => {
    vi.mocked(useOwnerDashboard).mockReturnValue({
      data: mockOwnerDTO,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isRefetching: false,
    } as unknown as UseOwnerDashboardReturn);

    const html = renderToStaticMarkup(<OwnerDashboardView />);
    expect(html).toContain('Apex Coaching Institute');
    expect(html).toContain('Asia/Kolkata');
  });

  it("OWNER-DASH-002: Today's attendance session completion is displayed", () => {
    const html = renderToStaticMarkup(<OwnerAttendanceCard attendance={mockOwnerDTO.attendance} />);
    expect(html).toContain('60% Completed');
    expect(html).toContain('3 / 5');
    expect(html).toContain('sessions taken today');
  });

  it('OWNER-DASH-003: Student attendance is displayed separately from session completion', () => {
    const html = renderToStaticMarkup(<OwnerAttendanceCard attendance={mockOwnerDTO.attendance} />);
    expect(html).toContain('85% Present');
    expect(html).toContain('102 / 120');
    expect(html).toContain('students present');
  });

  it('OWNER-DASH-004: Attendance values use server-provided DTO values directly', () => {
    const html = renderToStaticMarkup(<OwnerAttendanceCard attendance={mockOwnerDTO.attendance} />);
    expect(html).toContain('60% Completed');
    expect(html).toContain('85% Present');
  });

  it('OWNER-DASH-005: Attendance navigation targets /academics', () => {
    const html = renderToStaticMarkup(<OwnerAttendanceCard attendance={mockOwnerDTO.attendance} />);
    expect(html).toContain('href="/academics"');
  });

  it('OWNER-DASH-006: Quick action → Add Student targets /students', () => {
    const html = renderToStaticMarkup(<OwnerQuickActions actions={mockOwnerDTO.quickActions} />);
    expect(html).toContain('href="/students"');
    expect(html).toContain('Add Student');
  });

  it('OWNER-DASH-007: Quick action → Record Fee targets /billing', () => {
    const html = renderToStaticMarkup(<OwnerQuickActions actions={mockOwnerDTO.quickActions} />);
    expect(html).toContain('href="/billing"');
    expect(html).toContain('Record Fee');
  });

  it('OWNER-DASH-008: Quick action → Take Attendance targets /academics', () => {
    const html = renderToStaticMarkup(<OwnerQuickActions actions={mockOwnerDTO.quickActions} />);
    expect(html).toContain('href="/academics"');
    expect(html).toContain('Take Attendance');
  });

  it('OWNER-DASH-009: Loading state renders skeletons without showing fake numbers', () => {
    vi.mocked(useOwnerDashboard).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isRefetching: false,
    } as unknown as UseOwnerDashboardReturn);

    const html = renderToStaticMarkup(<OwnerDashboardView />);
    expect(html).toContain('data-testid="owner-dashboard-loading"');
    expect(html).not.toContain('0 / 0');
  });

  it('OWNER-DASH-010: Error state renders safe message and Retry action', () => {
    vi.mocked(useOwnerDashboard).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('Network error'),
      refetch: vi.fn(),
      isRefetching: false,
    } as unknown as UseOwnerDashboardReturn);

    const html = renderToStaticMarkup(<OwnerDashboardView />);
    expect(html).toContain('data-testid="owner-dashboard-error"');
    expect(html).toContain('Dashboard Data Unavailable');
    expect(html).toContain('Retry Dashboard Load');
  });

  it('OWNER-DASH-011: Empty state for announcements renders correctly', () => {
    const html = renderToStaticMarkup(<OwnerAnnouncementsCard announcements={[]} />);
    expect(html).toContain('No recent announcements published');
  });

  it('OWNER-DASH-012: Layout grid containers use responsive grid-cols classes', () => {
    const html = renderToStaticMarkup(<OwnerQuickActions actions={mockOwnerDTO.quickActions} />);
    expect(html).toContain('grid-cols-2');
    expect(html).toContain('lg:grid-cols-4');
  });

  it('OWNER-DASH-013: Interactive navigation link targets satisfy >=44px touch target height', () => {
    const html = renderToStaticMarkup(<OwnerAttendanceCard attendance={mockOwnerDTO.attendance} />);
    expect(html).toContain('min-h-[44px]');
  });

  it('OWNER-DASH-014: Semantic landmarks and headings exist', () => {
    vi.mocked(useOwnerDashboard).mockReturnValue({
      data: mockOwnerDTO,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isRefetching: false,
    } as unknown as UseOwnerDashboardReturn);

    const html = renderToStaticMarkup(<OwnerDashboardView />);
    expect(html).toContain('<header');
    expect(html).toContain('<main');
  });

  it('OWNER-DASH-015: Status meaning does not depend on color alone', () => {
    const html = renderToStaticMarkup(<OwnerAttendanceCard attendance={mockOwnerDTO.attendance} />);
    expect(html).toContain('3 / 5');
    expect(html).toContain('sessions taken today');
    expect(html).toContain('102 / 120');
    expect(html).toContain('students present');
  });

  it('OWNER-DASH-016: No internal database fields or passwords are rendered in UI', () => {
    vi.mocked(useOwnerDashboard).mockReturnValue({
      data: mockOwnerDTO,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isRefetching: false,
    } as unknown as UseOwnerDashboardReturn);

    const html = renderToStaticMarkup(<OwnerDashboardView />);
    expect(html).not.toContain('prisma');
    expect(html).not.toContain('password');
    expect(html).not.toContain('_count');
  });

  it('OWNER-DASH-017: No client-side instituteId or tenant selector exists in UI', () => {
    vi.mocked(useOwnerDashboard).mockReturnValue({
      data: mockOwnerDTO,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isRefetching: false,
    } as unknown as UseOwnerDashboardReturn);

    const html = renderToStaticMarkup(<OwnerDashboardView />);
    expect(html).not.toContain('Select Tenant');
    expect(html).not.toContain('tenant-selector');
  });

  it('OWNER-DASH-018: Operational attention renders pending fees and scheduled classes correctly', () => {
    const html = renderToStaticMarkup(
      <OwnerOperationalAttention fees={mockOwnerDTO.fees} operational={mockOwnerDTO.operational} />
    );
    expect(html).toContain('75,000');
    expect(html).toContain('8 pending invoices');
    expect(html).toContain('3 students overdue');
  });
});
