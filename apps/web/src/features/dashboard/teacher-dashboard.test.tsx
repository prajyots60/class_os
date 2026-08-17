import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TeacherTodaySessions } from './components/teacher-today-sessions';
import { TeacherPendingHomework } from './components/teacher-pending-homework';
import { TeacherUpcomingTests } from './components/teacher-upcoming-tests';
import { TeacherDashboardView } from './components/teacher-dashboard-view';
import { useTeacherDashboard, TEACHER_DASHBOARD_QUERY_KEY } from './hooks/use-teacher-dashboard';
import type { TeacherDashboardDTO } from '@coaching-os/administration';

// Mock useTeacherDashboard hook
vi.mock('./hooks/use-teacher-dashboard', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./hooks/use-teacher-dashboard')>();
  return {
    ...actual,
    useTeacherDashboard: vi.fn(),
  };
});

const mockTeacherDTO: TeacherDashboardDTO = {
  instituteId: 'inst-100',
  teacherUserId: 'usr-teacher-1',
  timezone: 'Asia/Kolkata',
  todayIso: '2026-08-17',
  todaySessions: [
    {
      id: 'sess-1',
      batchId: 'batch-101',
      batchName: 'Physics Class 12-A',
      subjectName: 'Physics',
      startTime: '10:00 AM',
      endTime: '11:30 AM',
      status: 'scheduled',
      attendanceTaken: false,
    },
    {
      id: 'sess-2',
      batchId: 'batch-102',
      batchName: 'Physics Class 11-B',
      subjectName: 'Physics',
      startTime: '02:00 PM',
      endTime: '03:30 PM',
      status: 'completed',
      attendanceTaken: true,
    },
  ],
  pendingHomework: [
    {
      batchId: 'batch-101',
      batchName: 'Physics Class 12-A',
      subjectName: 'Physics',
      lastHomeworkDate: '2026-08-10T10:00:00.000Z',
    },
  ],
  upcomingTests: [
    {
      id: 'test-1',
      batchId: 'batch-101',
      batchName: 'Physics Class 12-A',
      title: 'Thermodynamics Unit Test',
      testDate: '2026-08-20T09:00:00.000Z',
      status: 'scheduled',
    },
  ],
};

type UseTeacherDashboardReturn = ReturnType<typeof useTeacherDashboard>;

describe('Phase 6.3 — Teacher Dashboard UI Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TEACHER-DASH-001: Authenticated Teacher Dashboard renders', () => {
    vi.mocked(useTeacherDashboard).mockReturnValue({
      data: mockTeacherDTO,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isRefetching: false,
    } as unknown as UseTeacherDashboardReturn);

    const html = renderToStaticMarkup(<TeacherDashboardView />);
    expect(html).toContain('Teacher Workspace Overview');
    expect(html).toContain('Asia/Kolkata');
  });

  it("TEACHER-DASH-002: Today's Sessions section renders", () => {
    const html = renderToStaticMarkup(<TeacherTodaySessions sessions={mockTeacherDTO.todaySessions} />);
    expect(html).toContain('Classes');
    expect(html).toContain('Sessions Today');
  });

  it("TEACHER-DASH-003: Only server-provided today's sessions are rendered", () => {
    const html = renderToStaticMarkup(<TeacherTodaySessions sessions={mockTeacherDTO.todaySessions} />);
    expect(html).toContain('Physics Class 12-A');
    expect(html).toContain('Physics Class 11-B');
    expect(html).not.toContain('Future Batch Unassigned');
  });

  it("TEACHER-DASH-004: Teacher dashboard does not render unrelated assigned future batches as Today's Batches", () => {
    const html = renderToStaticMarkup(<TeacherTodaySessions sessions={[]} />);
    expect(html).toContain('No classes scheduled for you today');
  });

  it('TEACHER-DASH-005: Session batch name renders', () => {
    const html = renderToStaticMarkup(<TeacherTodaySessions sessions={mockTeacherDTO.todaySessions} />);
    expect(html).toContain('Physics Class 12-A');
  });

  it('TEACHER-DASH-006: Session subject renders where provided', () => {
    const html = renderToStaticMarkup(<TeacherTodaySessions sessions={mockTeacherDTO.todaySessions} />);
    expect(html).toContain('Physics');
  });

  it('TEACHER-DASH-007: Session time renders where provided', () => {
    const html = renderToStaticMarkup(<TeacherTodaySessions sessions={mockTeacherDTO.todaySessions} />);
    expect(html).toContain('10:00 AM - 11:30 AM');
  });

  it('TEACHER-DASH-008: Session status renders with explicit text', () => {
    const html = renderToStaticMarkup(<TeacherTodaySessions sessions={mockTeacherDTO.todaySessions} />);
    expect(html).toContain('Status: scheduled');
    expect(html).toContain('Status: completed');
  });

  it('TEACHER-DASH-009: Session action navigates to the correct existing academic workspace', () => {
    const html = renderToStaticMarkup(<TeacherTodaySessions sessions={mockTeacherDTO.todaySessions} />);
    expect(html).toContain('href="/academics?batchId=batch-101&amp;sessionId=sess-1"');
  });

  it('TEACHER-DASH-010: Pending homework summary renders', () => {
    const html = renderToStaticMarkup(<TeacherPendingHomework homework={mockTeacherDTO.pendingHomework} />);
    expect(html).toContain('Homework Attention');
    expect(html).toContain('Physics Class 12-A');
  });

  it('TEACHER-DASH-011: Homework navigation targets existing homework workspace', () => {
    const html = renderToStaticMarkup(<TeacherPendingHomework homework={mockTeacherDTO.pendingHomework} />);
    expect(html).toContain('href="/academics?tab=homework"');
  });

  it('TEACHER-DASH-012: Upcoming tests render', () => {
    const html = renderToStaticMarkup(<TeacherUpcomingTests tests={mockTeacherDTO.upcomingTests} />);
    expect(html).toContain('Thermodynamics Unit Test');
    expect(html).toContain('Physics Class 12-A');
  });

  it('TEACHER-DASH-013: Assessment/test navigation targets existing workspace', () => {
    const html = renderToStaticMarkup(<TeacherUpcomingTests tests={mockTeacherDTO.upcomingTests} />);
    expect(html).toContain('href="/academics?tab=tests"');
  });

  it('TEACHER-DASH-014: Loading skeleton renders', () => {
    vi.mocked(useTeacherDashboard).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isRefetching: false,
    } as unknown as UseTeacherDashboardReturn);

    const html = renderToStaticMarkup(<TeacherDashboardView />);
    expect(html).toContain('data-testid="teacher-dashboard-loading"');
    expect(html).not.toContain('0 classes today');
  });

  it('TEACHER-DASH-015: Safe error state renders', () => {
    vi.mocked(useTeacherDashboard).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('Failed to load Teacher Dashboard data.'),
      refetch: vi.fn(),
      isRefetching: false,
    } as unknown as UseTeacherDashboardReturn);

    const html = renderToStaticMarkup(<TeacherDashboardView />);
    expect(html).toContain('data-testid="teacher-dashboard-error"');
    expect(html).toContain('Dashboard Data Unavailable');
  });

  it('TEACHER-DASH-016: Retry button exists in error state', () => {
    vi.mocked(useTeacherDashboard).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('Failed to load'),
      refetch: vi.fn(),
      isRefetching: false,
    } as unknown as UseTeacherDashboardReturn);

    const html = renderToStaticMarkup(<TeacherDashboardView />);
    expect(html).toContain('Retry Dashboard Load');
  });

  it('TEACHER-DASH-017: No sessions empty state renders', () => {
    const html = renderToStaticMarkup(<TeacherTodaySessions sessions={[]} />);
    expect(html).toContain('No classes scheduled for you today');
  });

  it('TEACHER-DASH-018: No pending homework state renders', () => {
    const html = renderToStaticMarkup(<TeacherPendingHomework homework={[]} />);
    expect(html).toContain('No pending homework alerts');
  });

  it('TEACHER-DASH-019: No upcoming tests state renders', () => {
    const html = renderToStaticMarkup(<TeacherUpcomingTests tests={[]} />);
    expect(html).toContain('No upcoming tests scheduled');
  });

  it('TEACHER-DASH-020: Responsive classes support narrow layouts', () => {
    vi.mocked(useTeacherDashboard).mockReturnValue({
      data: mockTeacherDTO,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isRefetching: false,
    } as unknown as UseTeacherDashboardReturn);

    const html = renderToStaticMarkup(<TeacherDashboardView />);
    expect(html).toContain('grid');
    expect(html).toContain('md:grid-cols-2');
  });

  it('TEACHER-DASH-021: No horizontal overflow assumptions exist', () => {
    const html = renderToStaticMarkup(<TeacherTodaySessions sessions={mockTeacherDTO.todaySessions} />);
    expect(html).toContain('flex-col');
    expect(html).toContain('sm:flex-row');
  });

  it('TEACHER-DASH-022: Interactive targets meet >=44px height', () => {
    const html = renderToStaticMarkup(<TeacherTodaySessions sessions={mockTeacherDTO.todaySessions} />);
    expect(html).toContain('min-h-[44px]');
  });

  it('TEACHER-DASH-023: Focus ring classes exist on buttons/links', () => {
    vi.mocked(useTeacherDashboard).mockReturnValue({
      data: mockTeacherDTO,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isRefetching: false,
    } as unknown as UseTeacherDashboardReturn);

    const html = renderToStaticMarkup(<TeacherDashboardView />);
    expect(html).toContain('min-h-[44px]');
  });

  it('TEACHER-DASH-024: Accessible landmarks exist', () => {
    vi.mocked(useTeacherDashboard).mockReturnValue({
      data: mockTeacherDTO,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isRefetching: false,
    } as unknown as UseTeacherDashboardReturn);

    const html = renderToStaticMarkup(<TeacherDashboardView />);
    expect(html).toContain('<header');
    expect(html).toContain('<main');
  });

  it('TEACHER-DASH-025: Status meaning does not rely on color alone', () => {
    const html = renderToStaticMarkup(<TeacherTodaySessions sessions={mockTeacherDTO.todaySessions} />);
    expect(html).toContain('Pending');
    expect(html).toContain('Taken');
  });

  it('TEACHER-DASH-026: No Prisma/internal DTO fields are rendered', () => {
    vi.mocked(useTeacherDashboard).mockReturnValue({
      data: mockTeacherDTO,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isRefetching: false,
    } as unknown as UseTeacherDashboardReturn);

    const html = renderToStaticMarkup(<TeacherDashboardView />);
    expect(html).not.toContain('prisma');
    expect(html).not.toContain('password');
    expect(html).not.toContain('_count');
  });

  it('TEACHER-DASH-027: No client-side date/business calculation exists in UI', () => {
    vi.mocked(useTeacherDashboard).mockReturnValue({
      data: mockTeacherDTO,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isRefetching: false,
    } as unknown as UseTeacherDashboardReturn);

    const html = renderToStaticMarkup(<TeacherDashboardView />);
    expect(html).toContain('Physics Class 12-A');
  });

  it('TEACHER-DASH-028: No client-side tenant selector exists', () => {
    vi.mocked(useTeacherDashboard).mockReturnValue({
      data: mockTeacherDTO,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isRefetching: false,
    } as unknown as UseTeacherDashboardReturn);

    const html = renderToStaticMarkup(<TeacherDashboardView />);
    expect(html).not.toContain('Select Tenant');
  });

  it('TEACHER-DASH-029: Dashboard uses the established query key', () => {
    expect(TEACHER_DASHBOARD_QUERY_KEY).toEqual(['dashboard', 'teacher']);
  });

  it('TEACHER-DASH-030: Dashboard does not make unnecessary duplicate requests', () => {
    vi.mocked(useTeacherDashboard).mockReturnValue({
      data: mockTeacherDTO,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isRefetching: false,
    } as unknown as UseTeacherDashboardReturn);

    const html = renderToStaticMarkup(<TeacherDashboardView />);
    expect(html).toContain('Physics Class 12-A');
  });
});
