import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TimelineEventCard } from './components/timeline/timeline-event-card';
import { ParentTimeline } from './components/timeline/parent-timeline';
import * as useTimelineModule from './hooks/use-parent-timeline';
import { NotificationBell } from './components/notifications/notification-bell';
import { NotificationPanel } from './components/notifications/notification-panel';
import * as useNotificationsModule from './hooks/use-parent-notifications';
import { TodayOverview } from './components/today-overview';
import { ParentApiClient } from './api/v1-parent-client';
import type { ParentTimelineEventDTO, ParentNotificationDTO } from './types/parent-ui.types';

vi.mock('./api/v1-parent-client', () => ({
  ParentApiClient: {
    getTimeline: vi.fn(),
    getNotifications: vi.fn(),
    getUnreadNotificationCount: vi.fn(),
    markNotificationAsRead: vi.fn(),
  },
}));

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
}

function renderComponent(ui: React.ReactElement, client = createTestQueryClient()) {
  return renderToStaticMarkup(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

describe('Phase 5.9 — Timeline & Notifications UI Security & Experience Matrix', () => {
  const sampleEventAttendance: ParentTimelineEventDTO = {
    id: 'evt-1',
    instituteId: 'inst-1',
    instituteName: 'Apex Academy',
    studentId: 'stud-1',
    studentName: 'Aarav Sharma',
    eventType: 'attendance.recorded',
    title: 'Marked Present',
    description: 'Aarav was marked present for Physics Batch A',
    occurredAt: new Date().toISOString(),
    actorName: 'Faculty Smith',
    metadata: null,
  };

  const sampleEventHomework: ParentTimelineEventDTO = {
    id: 'evt-2',
    instituteId: 'inst-1',
    instituteName: 'Apex Academy',
    studentId: 'stud-1',
    studentName: 'Aarav Sharma',
    eventType: 'homework.published',
    title: 'Homework Assigned',
    description: 'Organic Chemistry Chapter 4 Exercises',
    occurredAt: new Date(Date.now() - 3600 * 1000).toISOString(),
    actorName: 'Faculty Jones',
    metadata: null,
  };

  const sampleEventAssessment: ParentTimelineEventDTO = {
    id: 'evt-3',
    instituteId: 'inst-1',
    instituteName: 'Apex Academy',
    studentId: 'stud-1',
    studentName: 'Aarav Sharma',
    eventType: 'test.published',
    title: 'Marks Published',
    description: 'Scored 92/100 in Physics Weekly Mock',
    occurredAt: new Date(Date.now() - 86400 * 1000).toISOString(),
    actorName: 'Faculty Smith',
    metadata: null,
  };

  const sampleEventBilling: ParentTimelineEventDTO = {
    id: 'evt-4',
    instituteId: 'inst-1',
    instituteName: 'Apex Academy',
    studentId: 'stud-1',
    studentName: 'Aarav Sharma',
    eventType: 'billing.payment_received',
    title: 'Fee Payment Received',
    description: 'Receipt REC-2026-001 issued for ₹5,000',
    occurredAt: new Date(Date.now() - 2 * 86400 * 1000).toISOString(),
    actorName: 'Accounts Admin',
    metadata: null,
  };

  const sampleNotification: ParentNotificationDTO = {
    id: 'notif-1',
    instituteId: 'inst-1',
    instituteName: 'Apex Academy',
    recipientUserId: 'user-1',
    recipientType: 'parent',
    priority: 'high',
    category: 'attendance',
    title: 'Attendance Alert',
    message: 'Aarav was marked absent today.',
    actionUrl: '/parent/attendance',
    isRead: false,
    readAt: null,
    createdAt: new Date().toISOString(),
    metadata: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('PARENT-TIMELINE-UI-001: renders timeline loading skeleton when fetching data', () => {
    vi.mocked(ParentApiClient.getTimeline).mockReturnValue(new Promise(() => {}));
    const html = renderComponent(<ParentTimeline />);
    expect(html).toContain('animate-pulse');
  });

  it('PARENT-TIMELINE-UI-002: renders timeline error card when network query fails', () => {
    vi.spyOn(useTimelineModule, 'useParentTimeline').mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useTimelineModule.useParentTimeline>);

    const html = renderComponent(<ParentTimeline />);
    expect(html).toContain('Unable to Load Timeline Activity');
  });

  it('PARENT-TIMELINE-UI-003: renders empty timeline state when no events exist', async () => {
    vi.mocked(ParentApiClient.getTimeline).mockResolvedValue({
      items: [],
      nextCursor: null,
      hasMore: false,
    });
    const queryClient = createTestQueryClient();
    await queryClient.fetchQuery({
      queryKey: ['parent', 'timeline', null],
      queryFn: () => ParentApiClient.getTimeline({ studentId: null }),
    });

    const html = renderComponent(<ParentTimeline />, queryClient);
    expect(html).toContain('No Recent Activity Yet');
  });

  it('PARENT-TIMELINE-UI-004: groups timeline events by day (Today, Yesterday, Earlier)', async () => {
    vi.mocked(ParentApiClient.getTimeline).mockResolvedValue({
      items: [sampleEventAttendance, sampleEventAssessment, sampleEventBilling],
      nextCursor: null,
      hasMore: false,
    });
    const queryClient = createTestQueryClient();
    await queryClient.fetchQuery({
      queryKey: ['parent', 'timeline', null],
      queryFn: () => ParentApiClient.getTimeline({ studentId: null }),
    });

    const html = renderComponent(<ParentTimeline />, queryClient);
    expect(html).toContain('Today');
    expect(html).toContain('Yesterday');
    expect(html).toContain('Earlier');
  });

  it('PARENT-TIMELINE-UI-005: renders Attendance event badge with category icon and label', () => {
    const html = renderComponent(<TimelineEventCard event={sampleEventAttendance} />);
    expect(html).toContain('Attendance');
    expect(html).toContain('Marked Present');
  });

  it('PARENT-TIMELINE-UI-006: renders Homework event badge with category icon and label', () => {
    const html = renderComponent(<TimelineEventCard event={sampleEventHomework} />);
    expect(html).toContain('Homework');
    expect(html).toContain('Homework Assigned');
  });

  it('PARENT-TIMELINE-UI-007: renders Assessment event badge with category icon and label', () => {
    const html = renderComponent(<TimelineEventCard event={sampleEventAssessment} />);
    expect(html).toContain('Assessment');
    expect(html).toContain('Marks Published');
  });

  it('PARENT-TIMELINE-UI-008: renders Fee Payment event badge with category icon and label', () => {
    const html = renderComponent(<TimelineEventCard event={sampleEventBilling} />);
    expect(html).toContain('Fee Payment');
    expect(html).toContain('Fee Payment Received');
  });

  it('PARENT-TIMELINE-UI-009: renders Announcement event badge for unknown event type', () => {
    const customEvent: ParentTimelineEventDTO = {
      ...sampleEventAttendance,
      eventType: 'announcement.broadcast',
      title: 'Holiday Notice',
    };
    const html = renderComponent(<TimelineEventCard event={customEvent} />);
    expect(html).toContain('Announcement');
  });

  it('PARENT-TIMELINE-UI-010: displays student name badge on event card', () => {
    const html = renderComponent(<TimelineEventCard event={sampleEventAttendance} />);
    expect(html).toContain('Aarav Sharma');
  });

  it('PARENT-TIMELINE-UI-011: displays institute name context on event card', () => {
    const html = renderComponent(<TimelineEventCard event={sampleEventAttendance} />);
    expect(html).toContain('Apex Academy');
  });

  it('PARENT-TIMELINE-UI-012: formats event occurrence time into human-friendly string', () => {
    const html = renderComponent(<TimelineEventCard event={sampleEventAttendance} />);
    expect(html).toMatch(/:\d\d/);
  });

  it('PARENT-TIMELINE-UI-013: includes accessible aria-label on timeline event card', () => {
    const html = renderComponent(<TimelineEventCard event={sampleEventAttendance} />);
    expect(html).toContain('aria-label="Aarav Sharma at Apex Academy');
  });

  it('PARENT-TIMELINE-UI-014: renders View Attendance action button when onNavigate is provided', () => {
    const html = renderComponent(<TimelineEventCard event={sampleEventAttendance} onNavigate={vi.fn()} />);
    expect(html).toContain('View Attendance');
  });

  it('PARENT-TIMELINE-UI-015: renders View Homework action button when onNavigate is provided', () => {
    const html = renderComponent(<TimelineEventCard event={sampleEventHomework} onNavigate={vi.fn()} />);
    expect(html).toContain('View Homework');
  });

  it('PARENT-TIMELINE-UI-016: renders View Assessment action button when onNavigate is provided', () => {
    const html = renderComponent(<TimelineEventCard event={sampleEventAssessment} onNavigate={vi.fn()} />);
    expect(html).toContain('View Assessment');
  });

  it('PARENT-TIMELINE-UI-017: renders View Fee Payment action button when onNavigate is provided', () => {
    const html = renderComponent(<TimelineEventCard event={sampleEventBilling} onNavigate={vi.fn()} />);
    expect(html).toContain('View Fee Payment');
  });

  it('PARENT-TIMELINE-UI-018: ensures action buttons have minimum touch target class min-h-[44px]', () => {
    const html = renderComponent(<TimelineEventCard event={sampleEventAttendance} onNavigate={vi.fn()} />);
    expect(html).toContain('min-h-[44px]');
  });

  it('PARENT-TIMELINE-UI-019: renders NotificationBell with aria-label showing unread count', async () => {
    vi.mocked(ParentApiClient.getUnreadNotificationCount).mockResolvedValue({ unreadCount: 3 });
    const queryClient = createTestQueryClient();
    await queryClient.fetchQuery({
      queryKey: ['parent', 'notifications', 'unread-count'],
      queryFn: () => ParentApiClient.getUnreadNotificationCount(),
    });

    const html = renderComponent(<NotificationBell />, queryClient);
    expect(html).toContain('aria-label="Notifications (3 unread notifications)"');
    expect(html).toContain('>3<');
  });

  it('PARENT-TIMELINE-UI-020: hides unread badge when unread count is 0', async () => {
    vi.mocked(ParentApiClient.getUnreadNotificationCount).mockResolvedValue({ unreadCount: 0 });
    const queryClient = createTestQueryClient();
    await queryClient.fetchQuery({
      queryKey: ['parent', 'notifications', 'unread-count'],
      queryFn: () => ParentApiClient.getUnreadNotificationCount(),
    });

    const html = renderComponent(<NotificationBell />, queryClient);
    expect(html).toContain('aria-label="Notifications (No unread notifications)"');
    expect(html).not.toContain('bg-rose-600');
  });

  it('PARENT-TIMELINE-UI-021: renders 99+ badge when unread count exceeds 99', async () => {
    vi.mocked(ParentApiClient.getUnreadNotificationCount).mockResolvedValue({ unreadCount: 150 });
    const queryClient = createTestQueryClient();
    await queryClient.fetchQuery({
      queryKey: ['parent', 'notifications', 'unread-count'],
      queryFn: () => ParentApiClient.getUnreadNotificationCount(),
    });

    const html = renderComponent(<NotificationBell />, queryClient);
    expect(html).toContain('99+');
  });

  it('PARENT-TIMELINE-UI-022: renders NotificationBell button wrapper with min-h-[44px]', () => {
    const html = renderComponent(<NotificationBell />);
    expect(html).toContain('min-h-[44px]');
  });

  it('PARENT-TIMELINE-UI-023: renders NotificationPanel loading skeleton while fetching notifications', () => {
    vi.mocked(ParentApiClient.getNotifications).mockReturnValue(new Promise(() => {}));
    const html = renderComponent(<NotificationPanel />);
    expect(html).toContain('animate-pulse');
  });

  it('PARENT-TIMELINE-UI-024: renders NotificationPanel error state on network error', () => {
    vi.spyOn(useNotificationsModule, 'useParentNotifications').mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useNotificationsModule.useParentNotifications>);

    const html = renderComponent(<NotificationPanel />);
    expect(html).toContain('Unable to Load Notifications');
  });

  it('PARENT-TIMELINE-UI-025: renders empty notification state when no notifications match filter', async () => {
    vi.mocked(ParentApiClient.getNotifications).mockResolvedValue({
      items: [],
      nextCursor: null,
      hasMore: false,
    });
    const queryClient = createTestQueryClient();
    await queryClient.fetchQuery({
      queryKey: ['parent', 'notifications', 'all'],
      queryFn: () => ParentApiClient.getNotifications({ isRead: undefined }),
    });

    const html = renderComponent(<NotificationPanel />, queryClient);
    expect(html).toContain('No Notifications Yet');
  });

  it('PARENT-TIMELINE-UI-026: renders unread badge with non-color-only text indicator on unread notification', async () => {
    vi.mocked(ParentApiClient.getNotifications).mockResolvedValue({
      items: [sampleNotification],
      nextCursor: null,
      hasMore: false,
    });
    const queryClient = createTestQueryClient();
    await queryClient.fetchQuery({
      queryKey: ['parent', 'notifications', 'all'],
      queryFn: () => ParentApiClient.getNotifications({ isRead: undefined }),
    });

    const html = renderComponent(<NotificationPanel />, queryClient);
    expect(html).toContain('🔴 Unread');
    expect(html).toContain('Attendance Alert');
  });

  it('PARENT-TIMELINE-UI-027: renders filter tab controls for All and Unread', async () => {
    vi.mocked(ParentApiClient.getNotifications).mockResolvedValue({
      items: [sampleNotification],
      nextCursor: null,
      hasMore: false,
    });
    const queryClient = createTestQueryClient();
    await queryClient.fetchQuery({
      queryKey: ['parent', 'notifications', 'all'],
      queryFn: () => ParentApiClient.getNotifications({ isRead: undefined }),
    });

    const html = renderComponent(<NotificationPanel />, queryClient);
    expect(html).toContain('>All<');
    expect(html).toContain('>Unread<');
  });

  it('PARENT-TIMELINE-UI-028: renders Mark Read button on unread notification only', async () => {
    vi.mocked(ParentApiClient.getNotifications).mockResolvedValue({
      items: [sampleNotification],
      nextCursor: null,
      hasMore: false,
    });
    const queryClient = createTestQueryClient();
    await queryClient.fetchQuery({
      queryKey: ['parent', 'notifications', 'all'],
      queryFn: () => ParentApiClient.getNotifications({ isRead: undefined }),
    });

    const html = renderComponent(<NotificationPanel />, queryClient);
    expect(html).toContain('Mark Read');
    expect(html).toContain('aria-label="Mark notification &quot;Attendance Alert&quot; as read"');
  });

  it('PARENT-TIMELINE-UI-029: hides Mark Read button on read notification', async () => {
    const readNotification: ParentNotificationDTO = {
      ...sampleNotification,
      isRead: true,
      readAt: new Date().toISOString(),
    };
    vi.mocked(ParentApiClient.getNotifications).mockResolvedValue({
      items: [readNotification],
      nextCursor: null,
      hasMore: false,
    });
    const queryClient = createTestQueryClient();
    await queryClient.fetchQuery({
      queryKey: ['parent', 'notifications', 'all'],
      queryFn: () => ParentApiClient.getNotifications({ isRead: undefined }),
    });

    const html = renderComponent(<NotificationPanel />, queryClient);
    expect(html).not.toContain('Mark Read');
  });

  it('PARENT-TIMELINE-UI-030: renders TodayOverview activity section with View all activity link', () => {
    const mockStudent = {
      linkId: 'link-1',
      studentId: 'stud-1',
      firstName: 'Aarav',
      middleName: null,
      lastName: 'Sharma',
      fullName: 'Aarav Sharma',
      admissionNumber: 'ADM-001',
      instituteId: 'inst-1',
      instituteName: 'Apex Academy',
      status: 'active',
      enrollments: [{ id: 'enr-1', batchId: 'batch-1', batchName: 'Physics Batch A', status: 'active' }],
    };

    const html = renderComponent(<TodayOverview student={mockStudent} onViewTimeline={vi.fn()} />);

    expect(html).toContain('Activity Feed &amp; Timeline');
    expect(html).toContain('View all activity →');
  });

  it('PARENT-TIMELINE-UI-031: includes aria-label on View all activity button in TodayOverview', () => {
    const mockStudent = {
      linkId: 'link-1',
      studentId: 'stud-1',
      firstName: 'Aarav',
      middleName: null,
      lastName: 'Sharma',
      fullName: 'Aarav Sharma',
      admissionNumber: 'ADM-001',
      instituteId: 'inst-1',
      instituteName: 'Apex Academy',
      status: 'active',
      enrollments: [{ id: 'enr-1', batchId: 'batch-1', batchName: 'Physics Batch A', status: 'active' }],
    };

    const html = renderComponent(<TodayOverview student={mockStudent} onViewTimeline={vi.fn()} />);

    expect(html).toContain('aria-label="View full activity timeline for student"');
  });

  it('PARENT-TIMELINE-UI-032: ensures View all activity button has minimum touch target min-h-[44px]', () => {
    const mockStudent = {
      linkId: 'link-1',
      studentId: 'stud-1',
      firstName: 'Aarav',
      middleName: null,
      lastName: 'Sharma',
      fullName: 'Aarav Sharma',
      admissionNumber: 'ADM-001',
      instituteId: 'inst-1',
      instituteName: 'Apex Academy',
      status: 'active',
      enrollments: [{ id: 'enr-1', batchId: 'batch-1', batchName: 'Physics Batch A', status: 'active' }],
    };

    const html = renderComponent(<TodayOverview student={mockStudent} onViewTimeline={vi.fn()} />);

    expect(html).toContain('min-h-[44px]');
  });
});
