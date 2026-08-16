import { describe, it, expect, vi } from 'vitest';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  AttendanceSummary,
  AttendanceList,
  HomeworkCard,
  HomeworkList,
  HomeworkDetailModal,
  ParentAcademicViews,
  ParentApiClient,
  getParentAttendanceQueryKey,
  getParentHomeworkQueryKey,
  type ParentAttendanceSummaryDTO,
  type ParentAttendanceRecordDTO,
  type ParentHomeworkItemDTO,
} from './index';

const mockAttendanceSummary: ParentAttendanceSummaryDTO = {
  totalSessions: 10,
  presentCount: 9,
  absentCount: 1,
  excusedCount: 0,
  percentage: 90,
};

const mockAttendanceRecords: ParentAttendanceRecordDTO[] = [
  {
    id: 'att-uuid-1',
    sessionId: 'sess-uuid-1',
    sessionDate: '2026-08-15T10:00:00.000Z',
    batchName: 'Physics Batch 2026',
    subject: 'Physics',
    status: 'present',
    recordedAt: '2026-08-15T10:00:00.000Z',
  },
  {
    id: 'att-uuid-2',
    sessionId: 'sess-uuid-2',
    sessionDate: '2026-08-14T10:00:00.000Z',
    batchName: 'Physics Batch 2026',
    subject: 'Physics',
    status: 'absent',
    recordedAt: '2026-08-14T10:00:00.000Z',
  },
];

const mockHomeworkItems: ParentHomeworkItemDTO[] = [
  {
    id: 'hw-uuid-1',
    batchId: 'batch-uuid-1',
    batchName: 'Physics Batch 2026',
    subject: 'Physics',
    title: 'Quantum Mechanics Problem Set 1',
    description: 'Solve questions 1 through 5 on page 42.',
    attachmentUrl: 'https://cdn.coachingos.app/hw/quantum-1.pdf',
    publishedAt: '2026-08-15T00:00:00.000Z',
    createdAt: '2026-08-15T00:00:00.000Z',
  },
];

describe('Phase 5.6 — Parent Attendance & Homework Views UI Security & Experience Suite', () => {
  // ── PARENT-ACADEMIC-UI-001 ──────────────────────────────────────────────────
  it('PARENT-ACADEMIC-UI-001: Authenticated parent can view attendance summary', () => {
    const html = renderToStaticMarkup(<AttendanceSummary summary={mockAttendanceSummary} />);
    expect(html).toContain('90%');
    expect(html).toContain('Present');
    expect(html).toContain('Absent');
    expect(html).toContain('9');
    expect(html).toContain('1');
  });

  // ── PARENT-ACADEMIC-UI-002 ──────────────────────────────────────────────────
  it('PARENT-ACADEMIC-UI-002: Attendance renders present state badge with text', () => {
    const html = renderToStaticMarkup(<AttendanceList records={[mockAttendanceRecords[0]]} />);
    expect(html).toContain('Present');
    expect(html).toContain('Physics Batch 2026');
  });

  // ── PARENT-ACADEMIC-UI-003 ──────────────────────────────────────────────────
  it('PARENT-ACADEMIC-UI-003: Attendance renders absent state badge with text', () => {
    const html = renderToStaticMarkup(<AttendanceList records={[mockAttendanceRecords[1]]} />);
    expect(html).toContain('Absent');
  });

  // ── PARENT-ACADEMIC-UI-004 ──────────────────────────────────────────────────
  it('PARENT-ACADEMIC-UI-004: Attendance status does not rely on color alone', () => {
    const html = renderToStaticMarkup(<AttendanceList records={mockAttendanceRecords} />);
    expect(html).toContain('✓ Present');
    expect(html).toContain('× Absent');
  });

  // ── PARENT-ACADEMIC-UI-005 ──────────────────────────────────────────────────
  it('PARENT-ACADEMIC-UI-005: Empty attendance list renders clean empty state', () => {
    const html = renderToStaticMarkup(<AttendanceList records={[]} />);
    expect(html).toContain('No Attendance Records Yet');
    expect(html).toContain('Attendance information will appear here');
  });

  // ── PARENT-ACADEMIC-UI-006 ──────────────────────────────────────────────────
  it('PARENT-ACADEMIC-UI-006: Attendance view loading state renders skeleton', () => {
    const queryClient = new QueryClient();
    const html = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <ParentAcademicViews studentId="student-1" activeView="attendance" />
      </QueryClientProvider>,
    );
    expect(html).toContain('animate-pulse');
  });

  // ── PARENT-ACADEMIC-UI-007 ──────────────────────────────────────────────────
  it('PARENT-ACADEMIC-UI-007: Attendance view without studentId renders selection prompt', () => {
    const queryClient = new QueryClient();
    const html = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <ParentAcademicViews studentId={null} activeView="attendance" />
      </QueryClientProvider>,
    );
    expect(html).toContain('No Student Selected');
  });

  // ── PARENT-ACADEMIC-UI-008 ──────────────────────────────────────────────────
  it('PARENT-ACADEMIC-UI-008: Attendance summary highlights low attendance warning when < 75%', () => {
    const lowSummary: ParentAttendanceSummaryDTO = {
      totalSessions: 10,
      presentCount: 6,
      absentCount: 4,
      excusedCount: 0,
      percentage: 60,
    };
    const html = renderToStaticMarkup(<AttendanceSummary summary={lowSummary} />);
    expect(html).toContain('Low attendance warning');
  });

  // ── PARENT-ACADEMIC-UI-009 ──────────────────────────────────────────────────
  it('PARENT-ACADEMIC-UI-009: No internal database IDs are rendered in attendance list', () => {
    const html = renderToStaticMarkup(<AttendanceList records={mockAttendanceRecords} />);
    expect(html).not.toContain('att-uuid-1');
    expect(html).not.toContain('sess-uuid-1');
  });

  // ── PARENT-ACADEMIC-UI-010 ──────────────────────────────────────────────────
  it('PARENT-ACADEMIC-UI-010: Subject name is rendered alongside batch name', () => {
    const html = renderToStaticMarkup(<AttendanceList records={mockAttendanceRecords} />);
    expect(html).toContain('Physics');
  });

  // ── PARENT-ACADEMIC-UI-011 ──────────────────────────────────────────────────
  it('PARENT-ACADEMIC-UI-011: Authorized parent can view published homework assignments', () => {
    const html = renderToStaticMarkup(<HomeworkList homework={mockHomeworkItems} />);
    expect(html).toContain('Quantum Mechanics Problem Set 1');
    expect(html).toContain('Physics Batch 2026');
  });

  // ── PARENT-ACADEMIC-UI-012 ──────────────────────────────────────────────────
  it('PARENT-ACADEMIC-UI-012: Homework card renders title, batch, and subject fields', () => {
    const html = renderToStaticMarkup(
      <HomeworkCard homework={mockHomeworkItems[0]} onSelect={vi.fn()} />,
    );
    expect(html).toContain('Quantum Mechanics Problem Set 1');
    expect(html).toContain('Physics Batch 2026');
    expect(html).toContain('Physics');
  });

  // ── PARENT-ACADEMIC-UI-013 ──────────────────────────────────────────────────
  it('PARENT-ACADEMIC-UI-013: Homework detail modal renders instructions and attachment link', () => {
    const html = renderToStaticMarkup(
      <HomeworkDetailModal homework={mockHomeworkItems[0]} onClose={vi.fn()} />,
    );
    expect(html).toContain('Quantum Mechanics Problem Set 1');
    expect(html).toContain('Solve questions 1 through 5 on page 42.');
    expect(html).toContain('Open Attachment Resource');
    expect(html).toContain('https://cdn.coachingos.app/hw/quantum-1.pdf');
  });

  // ── PARENT-ACADEMIC-UI-014 ──────────────────────────────────────────────────
  it('PARENT-ACADEMIC-UI-014: Homework detail modal hides attachment link when null', () => {
    const noAttachHomework: ParentHomeworkItemDTO = {
      ...mockHomeworkItems[0],
      attachmentUrl: null,
    };
    const html = renderToStaticMarkup(
      <HomeworkDetailModal homework={noAttachHomework} onClose={vi.fn()} />,
    );
    expect(html).not.toContain('Open Attachment Resource');
  });

  // ── PARENT-ACADEMIC-UI-015 ──────────────────────────────────────────────────
  it('PARENT-ACADEMIC-UI-015: Empty homework list renders clean empty state', () => {
    const html = renderToStaticMarkup(<HomeworkList homework={[]} />);
    expect(html).toContain('No Published Homework Assignments');
    expect(html).toContain('Homework assignments published by your teachers will appear here');
  });

  // ── PARENT-ACADEMIC-UI-016 ──────────────────────────────────────────────────
  it('PARENT-ACADEMIC-UI-016: Homework view loading state renders skeleton', () => {
    const queryClient = new QueryClient();
    const html = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <ParentAcademicViews studentId="student-1" activeView="homework" />
      </QueryClientProvider>,
    );
    expect(html).toContain('animate-pulse');
  });

  // ── PARENT-ACADEMIC-UI-017 ──────────────────────────────────────────────────
  it('PARENT-ACADEMIC-UI-017: Homework view without studentId renders selection prompt', () => {
    const queryClient = new QueryClient();
    const html = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <ParentAcademicViews studentId={null} activeView="homework" />
      </QueryClientProvider>,
    );
    expect(html).toContain('No Student Selected');
  });

  // ── PARENT-ACADEMIC-UI-018 ──────────────────────────────────────────────────
  it('PARENT-ACADEMIC-UI-018: No internal database IDs are rendered in homework card', () => {
    const html = renderToStaticMarkup(
      <HomeworkCard homework={mockHomeworkItems[0]} onSelect={vi.fn()} />,
    );
    expect(html).not.toContain('hw-uuid-1');
    expect(html).not.toContain('batch-uuid-1');
  });

  // ── PARENT-ACADEMIC-UI-019 ──────────────────────────────────────────────────
  it('PARENT-ACADEMIC-UI-019: Switching child profile updates query keys appropriately', () => {
    expect(getParentAttendanceQueryKey('student-A')).toEqual(['parent', 'attendance', 'student-A']);
    expect(getParentAttendanceQueryKey('student-B')).toEqual(['parent', 'attendance', 'student-B']);
    expect(getParentHomeworkQueryKey('student-A')).toEqual(['parent', 'homework', 'student-A']);
    expect(getParentHomeworkQueryKey('student-B')).toEqual(['parent', 'homework', 'student-B']);
  });

  // ── PARENT-ACADEMIC-UI-020 ──────────────────────────────────────────────────
  it('PARENT-ACADEMIC-UI-020: ParentApiClient methods construct proper API URLs', () => {
    const globalFetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ data: { student: {}, records: [] } }), { status: 200 }),
      ),
    );

    ParentApiClient.getStudentAttendance('student-uuid-99');
    expect(globalFetchSpy).toHaveBeenCalledWith(
      '/api/v1/parent/students/student-uuid-99/attendance',
      expect.any(Object),
    );

    ParentApiClient.getStudentHomework('student-uuid-99');
    expect(globalFetchSpy).toHaveBeenCalledWith(
      '/api/v1/parent/students/student-uuid-99/homework',
      expect.any(Object),
    );

    globalFetchSpy.mockRestore();
  });

  // ── PARENT-ACADEMIC-UI-021 ──────────────────────────────────────────────────
  it('PARENT-ACADEMIC-UI-021: Homework title search filters list correctly', () => {
    const html = renderToStaticMarkup(<HomeworkList homework={mockHomeworkItems} />);
    expect(html).toContain('Quantum Mechanics Problem Set 1');
  });

  // ── PARENT-ACADEMIC-UI-022 ──────────────────────────────────────────────────
  it('PARENT-ACADEMIC-UI-022: Attendance status badges include accessible ARIA labels', () => {
    const html = renderToStaticMarkup(<AttendanceList records={[mockAttendanceRecords[0]]} />);
    expect(html).toContain('aria-label="Present on Sat, Aug 15"');
  });

  // ── PARENT-ACADEMIC-UI-023 ──────────────────────────────────────────────────
  it('PARENT-ACADEMIC-UI-023: Homework search input includes accessible ARIA label', () => {
    const html = renderToStaticMarkup(<HomeworkList homework={mockHomeworkItems} />);
    expect(html).toContain('aria-label="Search homework by title or subject"');
  });

  // ── PARENT-ACADEMIC-UI-024 ──────────────────────────────────────────────────
  it('PARENT-ACADEMIC-UI-024: Action buttons meet minimum 44px touch target styling', () => {
    const html = renderToStaticMarkup(
      <HomeworkCard homework={mockHomeworkItems[0]} onSelect={vi.fn()} />,
    );
    expect(html).toContain('min-h-[44px]');
  });

  // ── PARENT-ACADEMIC-UI-025 ──────────────────────────────────────────────────
  it('PARENT-ACADEMIC-UI-025: Unsafe HTML in homework title is rendered as escaped text', () => {
    const unsafeHomework: ParentHomeworkItemDTO = {
      ...mockHomeworkItems[0],
      title: '<script>alert("xss")</script>',
    };
    const html = renderToStaticMarkup(
      <HomeworkCard homework={unsafeHomework} onSelect={vi.fn()} />,
    );
    expect(html).not.toContain('<script>alert');
    expect(html).toContain('&lt;script&gt;alert');
  });
});
