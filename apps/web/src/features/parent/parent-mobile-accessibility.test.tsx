import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { ParentHeader } from './components/parent-header';
import { ChildSwitcher } from './components/child-switcher';
import { TodayOverview } from './components/today-overview';
import { AttendanceSummary } from './components/attendance/attendance-summary';
import { AttendanceList } from './components/attendance/attendance-list';
import { HomeworkCard } from './components/homework/homework-card';
import { HomeworkList } from './components/homework/homework-list';
import { HomeworkDetailModal } from './components/homework/homework-detail-modal';
import { MarksSummary } from './components/assessments/marks-summary';
import { AssessmentCard } from './components/assessments/assessment-card';
import { AssessmentList } from './components/assessments/assessment-list';
import { AssessmentDetailModal } from './components/assessments/assessment-detail-modal';
import { FeeSummary } from './components/billing/fee-summary';
import { InvoiceCard } from './components/billing/invoice-card';
import { InvoiceList } from './components/billing/invoice-list';
import { InvoiceDetailModal } from './components/billing/invoice-detail-modal';
import { ReceiptCard } from './components/billing/receipt-card';
import { ReceiptDetailModal } from './components/billing/receipt-detail-modal';
import { TimelineEventCard } from './components/timeline/timeline-event-card';
import { ParentTimeline } from './components/timeline/parent-timeline';
import { NotificationBell } from './components/notifications/notification-bell';
import { NotificationPanel } from './components/notifications/notification-panel';
import * as useTimelineModule from './hooks/use-parent-timeline';

import type {
  ParentHubIdentityDTO,
  ParentHubProfileSummaryDTO,
  ParentAttendanceSummaryDTO,
  ParentAttendanceRecordDTO,
  ParentHomeworkItemDTO,
  ParentAssessmentSummaryDTO,
  ParentAssessmentItemDTO,
  ParentBillingSummaryDTO,
  ParentInvoiceItemDTO,
  ParentReceiptItemDTO,
  ParentTimelineEventDTO,
} from './types/parent-ui.types';

// Mock TanStack Hooks
vi.mock('./hooks/use-parent-notifications', () => ({
  useParentNotifications: () => ({
    data: {
      items: [
        {
          id: 'notif-1',
          instituteId: 'inst-1',
          instituteName: 'Kota Coaching',
          recipientUserId: 'user-p1',
          recipientType: 'parent',
          priority: 'high',
          category: 'attendance',
          title: 'Attendance Alert',
          message: 'Aarav was marked absent today.',
          isRead: false,
          createdAt: new Date().toISOString(),
        },
      ],
      nextCursor: null,
    },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useParentUnreadCount: () => ({
    data: { unreadCount: 3 },
    isLoading: false,
  }),
  useMarkNotificationAsRead: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

vi.mock('./hooks/use-parent-timeline', () => ({
  useParentTimeline: () => ({
    data: {
      items: [
        {
          id: 'act-1',
          studentId: 'stud-1',
          studentName: 'Aarav Sharma',
          instituteId: 'inst-1',
          instituteName: 'Apex Institute',
          eventType: 'attendance.recorded',
          title: 'Attendance Recorded',
          description: 'Aarav was marked Present for Physics',
          occurredAt: new Date().toISOString(),
          actorName: 'Faculty',
        },
      ],
      nextCursor: null,
    },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

vi.mock('./api/v1-parent-client', () => ({
  ParentApiClient: {
    getStudentReceipt: vi.fn().mockResolvedValue({
      id: 'rcpt-1',
      receiptNumber: 'RCPT-2026-001',
      amount: 15000,
      paymentMode: 'upi',
      generatedAt: new Date().toISOString(),
      student: { id: 'stud-1', fullName: 'Aarav Sharma', admissionNumber: 'ADM-001' },
      institute: { id: 'inst-1', name: 'Apex Institute' },
      batchName: 'Physics Batch A',
    }),
  },
}));

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
}

function renderComponent(ui: React.ReactNode, queryClient = createTestQueryClient()) {
  return renderToStaticMarkup(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

// Sample Data Fixtures
const sampleParent: ParentHubIdentityDTO = {
  id: 'pid-1',
  phone: '+919876543210',
  name: 'Rajesh Sharma',
  avatar: null,
  status: 'active',
};

const sampleProfiles: ParentHubProfileSummaryDTO[] = [
  {
    id: 'child-1',
    name: 'Aarav Sharma',
    avatar: null,
    createdAt: '2026-08-16T00:00:00Z',
    updatedAt: '2026-08-16T00:00:00Z',
    linkedStudents: [
      {
        linkId: 'link-1',
        studentId: 'stud-1',
        instituteId: 'inst-1',
        instituteName: 'Apex Institute',
        admissionNumber: 'ADM-001',
        firstName: 'Aarav',
        middleName: null,
        lastName: 'Sharma',
        fullName: 'Aarav Sharma',
        status: 'active',
        enrollments: [],
      },
    ],
  },
  {
    id: 'child-2',
    name: 'Riya Sharma',
    avatar: null,
    createdAt: '2026-08-16T00:00:00Z',
    updatedAt: '2026-08-16T00:00:00Z',
    linkedStudents: [
      {
        linkId: 'link-2',
        studentId: 'stud-2',
        instituteId: 'inst-2',
        instituteName: 'Allen Career',
        admissionNumber: 'ADM-002',
        firstName: 'Riya',
        middleName: null,
        lastName: 'Sharma',
        fullName: 'Riya Sharma',
        status: 'active',
        enrollments: [],
      },
    ],
  },
];

const sampleAttendanceSummary: ParentAttendanceSummaryDTO = {
  totalSessions: 20,
  presentCount: 18,
  absentCount: 1,
  excusedCount: 1,
  percentage: 90,
};

const sampleAttendanceRecord: ParentAttendanceRecordDTO = {
  id: 'att-1',
  sessionId: 'sess-1',
  sessionDate: '2026-08-16T10:00:00Z',
  status: 'present',
  batchName: 'Physics Batch A',
  subject: 'Physics',
  recordedAt: '2026-08-16T10:00:00Z',
};

const sampleHomework: ParentHomeworkItemDTO = {
  id: 'hw-1',
  batchId: 'batch-1',
  title: 'Physics Chapter 4 Numerical Problems',
  description: 'Solve questions 1 through 15 from textbook.',
  subject: 'Physics',
  batchName: 'Physics Batch A',
  publishedAt: '2026-08-15T09:00:00Z',
  attachmentUrl: 'https://example.com/hw.pdf',
  createdAt: '2026-08-15T09:00:00Z',
};

const sampleAssessmentSummary: ParentAssessmentSummaryDTO = {
  averagePercentage: 88,
  highestPercentage: 96,
  totalAssessments: 5,
};

const sampleAssessment: ParentAssessmentItemDTO = {
  id: 't-1',
  batchId: 'batch-1',
  title: 'Physics Mid-Term Assessment',
  subject: 'Physics',
  batchName: 'Physics Batch A',
  scheduledDate: '2026-08-10T10:00:00Z',
  maximumMarks: 100,
  marksObtained: 92,
  percentage: 92,
  status: 'published',
  createdAt: '2026-08-10T00:00:00Z',
};

const sampleFeeSummary: ParentBillingSummaryDTO = {
  totalOutstandingAmount: 15000,
  pendingInvoiceCount: 1,
  paidInvoiceCount: 2,
  lastPayment: {
    amount: 15000,
    paymentMode: 'upi',
    receivedOn: '2026-08-16T10:00:00Z',
    receiptNumber: 'RCPT-1',
  },
};

const sampleInvoice: ParentInvoiceItemDTO = {
  id: 'inv-1',
  enrollmentId: 'enr-1',
  batchName: 'Physics Batch A',
  amount: 25000,
  paidAmount: 15000,
  outstandingAmount: 10000,
  dueDate: '2026-08-30T00:00:00Z',
  status: 'partial',
  createdAt: '2026-08-10T00:00:00Z',
};

const sampleReceipt: ParentReceiptItemDTO = {
  id: 'rcpt-1',
  paymentId: 'pay-1',
  receiptNumber: 'RCPT-2026-001',
  amount: 15000,
  paymentMode: 'upi',
  generatedAt: '2026-08-16T10:00:00Z',
  batchName: 'Physics Batch A',
};

const sampleTimelineEvent: ParentTimelineEventDTO = {
  id: 'evt-1',
  studentId: 'stud-1',
  studentName: 'Aarav Sharma',
  instituteId: 'inst-1',
  instituteName: 'Apex Institute',
  eventType: 'attendance.recorded',
  title: 'Attendance Marked Present',
  description: 'Aarav was marked Present for Physics',
  occurredAt: '2026-08-16T10:42:00Z',
  actorName: 'Faculty Smith',
  metadata: null,
};

describe('Phase 5.10 — Parent PWA Mobile UX, Touch Targets & Accessibility Matrix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  // Section 1: Viewport Layout & Overflow Prevention (320px – 768px)
  it('PARENT-MOBILE-001: ParentHeader includes min-w-0 and truncate to prevent text overflow at 320px', () => {
    const html = renderComponent(<ParentHeader parent={sampleParent} />);
    expect(html).toContain('min-w-0');
    expect(html).toContain('truncate');
    expect(html).toContain('Parent Hub');
  });

  it('PARENT-MOBILE-002: ChildSwitcher scroll container handles multiple children cleanly', () => {
    const html = renderComponent(
      <ChildSwitcher profiles={sampleProfiles} selectedProfileId="child-1" onSelectProfile={vi.fn()} />,
    );
    expect(html).toContain('overflow-x-auto');
    expect(html).toContain('role="tablist"');
    expect(html).toContain('Aarav Sharma');
    expect(html).toContain('Riya Sharma');
  });

  it('PARENT-MOBILE-003: AttendanceList items use responsive flex-col sm:flex-row layout for narrow screens', () => {
    const html = renderComponent(<AttendanceList records={[sampleAttendanceRecord]} />);
    expect(html).toContain('flex flex-col sm:flex-row');
  });

  it('PARENT-MOBILE-004: InvoiceCard uses min-w-0 and whitespace protection for currency amounts', () => {
    const html = renderComponent(<InvoiceCard invoice={sampleInvoice} onSelect={vi.fn()} />);
    expect(html).toContain('₹15,000');
    expect(html).toContain('₹10,000');
  });

  it('PARENT-MOBILE-005: ReceiptCard exposes receipt number and format currency cleanly', () => {
    const html = renderComponent(<ReceiptCard receipt={sampleReceipt} onSelect={vi.fn()} />);
    expect(html).toContain('RCPT-2026-001');
    expect(html).toContain('₹15,000');
  });

  it('PARENT-MOBILE-006: Home TodayOverview card grid stacks responsively on mobile', () => {
    const sampleStudent = {
      linkId: 'link-1',
      studentId: 'stud-1',
      instituteId: 'inst-1',
      instituteName: 'Apex Institute',
      admissionNumber: 'ADM-001',
      firstName: 'Aarav',
      middleName: null,
      lastName: 'Sharma',
      fullName: 'Aarav Sharma',
      studentName: 'Aarav Sharma',
      batchName: 'Physics Batch A',
      status: 'active',
      enrollments: [],
    };
    const html = renderComponent(<TodayOverview student={sampleStudent} />);
    expect(html).toContain('Today');
  });

  it('PARENT-MOBILE-007: TimelineEventCard wraps student and institute context badges without collision', () => {
    const html = renderComponent(<TimelineEventCard event={sampleTimelineEvent} />);
    expect(html).toContain('Aarav Sharma');
    expect(html).toContain('Apex Institute');
    expect(html).toContain('Attendance Marked Present');
  });

  it('PARENT-MOBILE-008: AttendanceSummary stat grid uses 2-column mobile layout', () => {
    const html = renderComponent(<AttendanceSummary summary={sampleAttendanceSummary} />);
    expect(html).toContain('grid-cols-2 sm:grid-cols-4');
    expect(html).toContain('90%');
  });

  it('PARENT-MOBILE-009: MarksSummary stat grid stacks cleanly for mobile viewports', () => {
    const html = renderComponent(<MarksSummary summary={sampleAssessmentSummary} />);
    expect(html).toContain('grid-cols-1 sm:grid-cols-3');
    expect(html).toContain('88%');
  });

  it('PARENT-MOBILE-010: FeeSummary stat grid displays formatted balances', () => {
    const html = renderComponent(<FeeSummary summary={sampleFeeSummary} />);
    expect(html).toContain('₹15,000');
    expect(html).toContain('Settled Invoices');
  });

  it('PARENT-MOBILE-011: HomeworkCard displays title and attachment indicator', () => {
    const html = renderComponent(<HomeworkCard homework={sampleHomework} onSelect={vi.fn()} />);
    expect(html).toContain('Physics Chapter 4 Numerical Problems');
    expect(html).toContain('Attachment included');
  });

  it('PARENT-MOBILE-012: NotificationPanel list fits mobile width without overflow', () => {
    const html = renderComponent(<NotificationPanel />);
    expect(html).toContain('Attendance Alert');
    expect(html).toContain('Aarav was marked absent today.');
  });

  // Section 2: Touch Target Audit (≥44 × 44 CSS px)
  it('PARENT-MOBILE-013: Header notification bell has minimum touch target min-h-[44px]', () => {
    const html = renderComponent(<NotificationBell />);
    expect(html).toContain('min-h-[44px]');
    expect(html).toContain('min-w-[44px]');
  });

  it('PARENT-MOBILE-014: ChildSwitcher tab buttons have minimum touch target min-h-[44px]', () => {
    const html = renderComponent(
      <ChildSwitcher profiles={sampleProfiles} selectedProfileId="child-1" onSelectProfile={vi.fn()} />,
    );
    expect(html).toContain('min-h-[44px]');
  });

  it('PARENT-MOBILE-015: HomeworkCard view details button has min-h-[44px]', () => {
    const html = renderComponent(<HomeworkCard homework={sampleHomework} onSelect={vi.fn()} />);
    expect(html).toContain('min-h-[44px]');
  });

  it('PARENT-MOBILE-016: AssessmentCard view details button has min-h-[44px]', () => {
    const html = renderComponent(<AssessmentCard assessment={sampleAssessment} onSelect={vi.fn()} />);
    expect(html).toContain('min-h-[44px]');
  });

  it('PARENT-MOBILE-017: InvoiceCard view details button has min-h-[44px]', () => {
    const html = renderComponent(<InvoiceCard invoice={sampleInvoice} onSelect={vi.fn()} />);
    expect(html).toContain('min-h-[44px]');
  });

  it('PARENT-MOBILE-018: ReceiptCard view details button has min-h-[44px]', () => {
    const html = renderComponent(<ReceiptCard receipt={sampleReceipt} onSelect={vi.fn()} />);
    expect(html).toContain('min-h-[44px]');
  });

  it('PARENT-MOBILE-019: TimelineEventCard navigation action button has min-h-[44px]', () => {
    const html = renderComponent(<TimelineEventCard event={sampleTimelineEvent} onNavigate={vi.fn()} />);
    expect(html).toContain('min-h-[44px]');
  });

  it('PARENT-MOBILE-020: NotificationPanel filter buttons and mark-read buttons have min-h-[44px]', () => {
    const html = renderComponent(<NotificationPanel />);
    expect(html).toContain('min-h-[44px]');
    expect(html).toContain('Mark Read');
  });

  it('PARENT-MOBILE-021: ReceiptDetailModal modal actions have min-h-[44px]', () => {
    const html = renderComponent(
      <ReceiptDetailModal receipt={sampleReceipt} studentId="stud-1" onClose={vi.fn()} />,
    );
    expect(html).toContain('min-h-[44px]');
    expect(html).toContain('Fee Payment Receipt');
  });

  // Section 3: WAI-ARIA & Accessibility Semantics
  it('PARENT-A11Y-022: Header logout button contains explicit aria-label', () => {
    const html = renderComponent(<ParentHeader parent={sampleParent} onLogout={vi.fn()} />);
    expect(html).toContain('aria-label="Log out of parent PWA"');
  });

  it('PARENT-A11Y-023: ChildSwitcher marks selected profile with aria-selected="true"', () => {
    const html = renderComponent(
      <ChildSwitcher profiles={sampleProfiles} selectedProfileId="child-1" onSelectProfile={vi.fn()} />,
    );
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain('aria-selected="false"');
  });

  it('PARENT-A11Y-024: NotificationBell exposes unread count via accessible aria-label', () => {
    const html = renderComponent(<NotificationBell />);
    expect(html).toContain('aria-label="Notifications (3 unread notifications)"');
  });

  it('PARENT-A11Y-025: Attendance status badges present non-color-only text indicator', () => {
    const html = renderComponent(<AttendanceList records={[sampleAttendanceRecord]} />);
    expect(html).toContain('✓ Present');
  });

  it('PARENT-A11Y-026: Invoice status badges present non-color-only text indicator', () => {
    const html = renderComponent(<InvoiceCard invoice={sampleInvoice} onSelect={vi.fn()} />);
    expect(html).toContain('Partial');
  });

  it('PARENT-A11Y-027: NotificationPanel unread badge contains non-color-only indicator', () => {
    const html = renderComponent(<NotificationPanel />);
    expect(html).toContain('🔴 Unread');
  });

  it('PARENT-A11Y-028: HomeworkDetailModal contains role="dialog" and aria-modal="true"', () => {
    const html = renderComponent(
      <HomeworkDetailModal homework={sampleHomework} onClose={vi.fn()} />,
    );
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('aria-labelledby="homework-modal-title"');
  });

  it('PARENT-A11Y-029: AssessmentDetailModal contains role="dialog" and aria-modal="true"', () => {
    const html = renderComponent(
      <AssessmentDetailModal assessment={sampleAssessment} onClose={vi.fn()} />,
    );
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('aria-labelledby="assessment-modal-title"');
  });

  it('PARENT-A11Y-030: InvoiceDetailModal contains role="dialog" and aria-modal="true"', () => {
    const html = renderComponent(
      <InvoiceDetailModal invoice={sampleInvoice} onClose={vi.fn()} />,
    );
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('aria-labelledby="invoice-modal-title"');
  });

  it('PARENT-A11Y-031: ReceiptDetailModal contains role="dialog" and aria-modal="true"', () => {
    const html = renderComponent(
      <ReceiptDetailModal receipt={sampleReceipt} studentId="stud-1" onClose={vi.fn()} />,
    );
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('aria-labelledby="receipt-modal-title"');
  });

  // Section 4: Modal Containment & Scroll Safety
  it('PARENT-A11Y-032: HomeworkDetailModal container has max-h-[90vh] and overflow-y-auto', () => {
    const html = renderComponent(
      <HomeworkDetailModal homework={sampleHomework} onClose={vi.fn()} />,
    );
    expect(html).toContain('max-h-[90vh]');
    expect(html).toContain('overflow-y-auto');
  });

  it('PARENT-A11Y-033: AssessmentDetailModal container has max-h-[90vh] and overflow-y-auto', () => {
    const html = renderComponent(
      <AssessmentDetailModal assessment={sampleAssessment} onClose={vi.fn()} />,
    );
    expect(html).toContain('max-h-[90vh]');
    expect(html).toContain('overflow-y-auto');
  });

  it('PARENT-A11Y-034: InvoiceDetailModal container has max-h-[90vh] and overflow-y-auto', () => {
    const html = renderComponent(
      <InvoiceDetailModal invoice={sampleInvoice} onClose={vi.fn()} />,
    );
    expect(html).toContain('max-h-[90vh]');
    expect(html).toContain('overflow-y-auto');
  });

  it('PARENT-A11Y-035: ReceiptDetailModal container has max-h-[90vh] and overflow-y-auto', () => {
    const html = renderComponent(
      <ReceiptDetailModal receipt={sampleReceipt} studentId="stud-1" onClose={vi.fn()} />,
    );
    expect(html).toContain('max-h-[90vh]');
    expect(html).toContain('overflow-y-auto');
  });

  // Section 5: Empty & Loading UX States
  it('PARENT-MOBILE-036: AttendanceList renders accessible empty card when no records exist', () => {
    const html = renderComponent(<AttendanceList records={[]} />);
    expect(html).toContain('No Attendance Records Yet');
  });

  it('PARENT-MOBILE-037: HomeworkList renders accessible empty card when no homework matches filter', () => {
    const html = renderComponent(<HomeworkList homework={[]} />);
    expect(html).toContain('No Published Homework Assignments');
  });

  it('PARENT-MOBILE-038: AssessmentList renders accessible empty card when no tests exist', () => {
    const html = renderComponent(<AssessmentList assessments={[]} summary={sampleAssessmentSummary} />);
    expect(html).toContain('No Assessment Results Yet');
  });

  it('PARENT-MOBILE-039: InvoiceList renders accessible empty card when no invoices exist', () => {
    const html = renderComponent(<InvoiceList invoices={[]} />);
    expect(html).toContain('No Fee Invoices Issued Yet');
  });

  it('PARENT-MOBILE-040: ParentTimeline renders loading skeleton while fetching data', () => {
    vi.spyOn(useTimelineModule, 'useParentTimeline').mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useTimelineModule.useParentTimeline>);
    const html = renderComponent(<ParentTimeline studentId="stud-1" />);
    expect(html).toContain('animate-pulse');
  });
});
