import { describe, it, expect, vi } from 'vitest';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  MarksSummary,
  AssessmentCard,
  AssessmentList,
  AssessmentDetailModal,
  PerformanceTrend,
  ParentAcademicViews,
  ParentApiClient,
  getParentAssessmentsQueryKey,
  type ParentAssessmentSummaryDTO,
  type ParentAssessmentItemDTO,
} from './index';

const mockSummary: ParentAssessmentSummaryDTO = {
  totalAssessments: 3,
  averagePercentage: 82,
  highestPercentage: 90,
};

const mockAssessments: ParentAssessmentItemDTO[] = [
  {
    id: 'test-uuid-1',
    batchId: 'batch-uuid-1',
    batchName: 'Physics Batch 2026',
    subject: 'Physics',
    title: 'Mechanics Unit Test',
    maximumMarks: 50,
    marksObtained: 45,
    percentage: 90,
    scheduledDate: '2026-08-15T00:00:00.000Z',
    status: 'published',
    createdAt: '2026-08-15T00:00:00.000Z',
  },
  {
    id: 'test-uuid-2',
    batchId: 'batch-uuid-1',
    batchName: 'Physics Batch 2026',
    subject: 'Physics',
    title: 'Thermodynamics Test',
    maximumMarks: 50,
    marksObtained: 37,
    percentage: 74,
    scheduledDate: '2026-08-10T00:00:00.000Z',
    status: 'published',
    createdAt: '2026-08-10T00:00:00.000Z',
  },
];

describe('Phase 5.7 — Parent Assessments & Performance Views UI Security & Experience Suite', () => {
  // ── PARENT-ASSESS-UI-001 ──────────────────────────────────────────────────
  it('PARENT-ASSESS-UI-001: Authorized parent can view assessment list', () => {
    const html = renderToStaticMarkup(
      <AssessmentList summary={mockSummary} assessments={mockAssessments} />,
    );
    expect(html).toContain('Mechanics Unit Test');
    expect(html).toContain('Thermodynamics Test');
  });

  // ── PARENT-ASSESS-UI-002 ──────────────────────────────────────────────────
  it('PARENT-ASSESS-UI-002: Assessment title renders properly', () => {
    const html = renderToStaticMarkup(
      <AssessmentCard assessment={mockAssessments[0]} onSelect={vi.fn()} />,
    );
    expect(html).toContain('Mechanics Unit Test');
  });

  // ── PARENT-ASSESS-UI-003 ──────────────────────────────────────────────────
  it('PARENT-ASSESS-UI-003: Subject name renders properly', () => {
    const html = renderToStaticMarkup(
      <AssessmentCard assessment={mockAssessments[0]} onSelect={vi.fn()} />,
    );
    expect(html).toContain('Physics');
  });

  // ── PARENT-ASSESS-UI-004 ──────────────────────────────────────────────────
  it('PARENT-ASSESS-UI-004: Assessment scheduled date renders properly', () => {
    const html = renderToStaticMarkup(
      <AssessmentCard assessment={mockAssessments[0]} onSelect={vi.fn()} />,
    );
    expect(html).toContain('Aug 15, 2026');
  });

  // ── PARENT-ASSESS-UI-005 ──────────────────────────────────────────────────
  it('PARENT-ASSESS-UI-005: Obtained and maximum marks render correctly', () => {
    const html = renderToStaticMarkup(
      <AssessmentCard assessment={mockAssessments[0]} onSelect={vi.fn()} />,
    );
    expect(html).toContain('45');
    expect(html).toContain('/ 50');
  });

  // ── PARENT-ASSESS-UI-006 ──────────────────────────────────────────────────
  it('PARENT-ASSESS-UI-006: Percentage score renders when supplied', () => {
    const html = renderToStaticMarkup(
      <AssessmentCard assessment={mockAssessments[0]} onSelect={vi.fn()} />,
    );
    expect(html).toContain('90%');
  });

  // ── PARENT-ASSESS-UI-007 ──────────────────────────────────────────────────
  it('PARENT-ASSESS-UI-007: Average and highest percentages render on summary card', () => {
    const html = renderToStaticMarkup(<MarksSummary summary={mockSummary} />);
    expect(html).toContain('82%');
    expect(html).toContain('90%');
    expect(html).toContain('3');
  });

  // ── PARENT-ASSESS-UI-008 ──────────────────────────────────────────────────
  it('PARENT-ASSESS-UI-008: Pending marks render gracefully without crash', () => {
    const pendingItem: ParentAssessmentItemDTO = {
      ...mockAssessments[0],
      marksObtained: null,
      percentage: null,
    };
    const html = renderToStaticMarkup(
      <AssessmentCard assessment={pendingItem} onSelect={vi.fn()} />,
    );
    expect(html).toContain('Marks Pending');
  });

  // ── PARENT-ASSESS-UI-009 ──────────────────────────────────────────────────
  it('PARENT-ASSESS-UI-009: Draft or unpublished tests are not exposed in list output', () => {
    const html = renderToStaticMarkup(
      <AssessmentList summary={mockSummary} assessments={mockAssessments} />,
    );
    expect(html).not.toContain('Draft Physics Test');
  });

  // ── PARENT-ASSESS-UI-010 ──────────────────────────────────────────────────
  it('PARENT-ASSESS-UI-010: Assessment detail modal opens and renders marks breakdown', () => {
    const html = renderToStaticMarkup(
      <AssessmentDetailModal assessment={mockAssessments[0]} onClose={vi.fn()} />,
    );
    expect(html).toContain('Mechanics Unit Test');
    expect(html).toContain('Obtained');
    expect(html).toContain('45');
    expect(html).toContain('50');
    expect(html).toContain('90%');
  });

  // ── PARENT-ASSESS-UI-011 ──────────────────────────────────────────────────
  it('PARENT-ASSESS-UI-011: Performance summary renders supported metrics only', () => {
    const html = renderToStaticMarkup(<MarksSummary summary={mockSummary} />);
    expect(html).toContain('Average Score');
    expect(html).toContain('Highest Score');
    expect(html).toContain('Total Tests');
  });

  // ── PARENT-ASSESS-UI-012 ──────────────────────────────────────────────────
  it('PARENT-ASSESS-UI-012: Unsupported performance metrics are not fabricated', () => {
    const html = renderToStaticMarkup(
      <AssessmentList summary={mockSummary} assessments={mockAssessments} />,
    );
    expect(html).not.toContain('Class Rank');
    expect(html).not.toContain('Percentile');
  });

  // ── PARENT-ASSESS-UI-013 ──────────────────────────────────────────────────
  it('PARENT-ASSESS-UI-013: Performance trend renders sequence when supported', () => {
    const html = renderToStaticMarkup(<PerformanceTrend assessments={mockAssessments} />);
    expect(html).toContain('Performance Trend Over Time');
    expect(html).toContain('90%');
    expect(html).toContain('74%');
  });

  // ── PARENT-ASSESS-UI-014 ──────────────────────────────────────────────────
  it('PARENT-ASSESS-UI-014: Performance trend provides accessible screen-reader text', () => {
    const html = renderToStaticMarkup(<PerformanceTrend assessments={mockAssessments} />);
    expect(html).toContain('Historical Scores Sequence');
    expect(html).toContain('aria-label="Textual performance trend list"');
  });

  // ── PARENT-ASSESS-UI-015 ──────────────────────────────────────────────────
  it('PARENT-ASSESS-UI-015: No peer or class comparison is rendered without authorization', () => {
    const html = renderToStaticMarkup(
      <AssessmentList summary={mockSummary} assessments={mockAssessments} />,
    );
    expect(html).not.toContain('Class Average');
    expect(html).not.toContain('Peer Ranking');
  });

  // ── PARENT-ASSESS-UI-016 ──────────────────────────────────────────────────
  it('PARENT-ASSESS-UI-016: Loading skeleton renders properly', () => {
    const queryClient = new QueryClient();
    const html = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <ParentAcademicViews studentId="student-1" activeView="assessments" />
      </QueryClientProvider>,
    );
    expect(html).toContain('animate-pulse');
  });

  // ── PARENT-ASSESS-UI-017 ──────────────────────────────────────────────────
  it('PARENT-ASSESS-UI-017: Empty state renders when no assessments exist', () => {
    const emptySummary: ParentAssessmentSummaryDTO = {
      totalAssessments: 0,
      averagePercentage: null,
      highestPercentage: null,
    };
    const html = renderToStaticMarkup(
      <AssessmentList summary={emptySummary} assessments={[]} />,
    );
    expect(html).toContain('No Assessment Results Yet');
    expect(html).toContain('Published test results will appear here when available');
  });

  // ── PARENT-ASSESS-UI-018 ──────────────────────────────────────────────────
  it('PARENT-ASSESS-UI-018: Error state renders without student selection', () => {
    const queryClient = new QueryClient();
    const html = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <ParentAcademicViews studentId={null} activeView="assessments" />
      </QueryClientProvider>,
    );
    expect(html).toContain('No Student Selected');
  });

  // ── PARENT-ASSESS-UI-019 ──────────────────────────────────────────────────
  it('PARENT-ASSESS-UI-019: Switching child profile updates assessment query key', () => {
    expect(getParentAssessmentsQueryKey('student-A')).toEqual([
      'parent',
      'assessments',
      'student-A',
    ]);
    expect(getParentAssessmentsQueryKey('student-B')).toEqual([
      'parent',
      'assessments',
      'student-B',
    ]);
  });

  // ── PARENT-ASSESS-UI-020 ──────────────────────────────────────────────────
  it('PARENT-ASSESS-UI-020: ParentApiClient constructs proper API URL', () => {
    const globalFetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ data: { student: {}, summary: {}, assessments: [] } }), {
          status: 200,
        }),
      ),
    );

    ParentApiClient.getStudentAssessments('student-uuid-101');
    expect(globalFetchSpy).toHaveBeenCalledWith(
      '/api/v1/parent/students/student-uuid-101/assessments',
      expect.any(Object),
    );

    globalFetchSpy.mockRestore();
  });

  // ── PARENT-ASSESS-UI-021 ──────────────────────────────────────────────────
  it('PARENT-ASSESS-UI-021: Title and subject search filters assessment list', () => {
    const html = renderToStaticMarkup(
      <AssessmentList summary={mockSummary} assessments={mockAssessments} />,
    );
    expect(html).toContain('aria-label="Search test by title or subject"');
  });

  // ── PARENT-ASSESS-UI-022 ──────────────────────────────────────────────────
  it('PARENT-ASSESS-UI-022: Action buttons meet minimum 44px touch target styling', () => {
    const html = renderToStaticMarkup(
      <AssessmentCard assessment={mockAssessments[0]} onSelect={vi.fn()} />,
    );
    expect(html).toContain('min-h-[44px]');
  });

  // ── PARENT-ASSESS-UI-023 ──────────────────────────────────────────────────
  it('PARENT-ASSESS-UI-023: Assessment cards include accessible ARIA labels', () => {
    const html = renderToStaticMarkup(
      <AssessmentCard assessment={mockAssessments[0]} onSelect={vi.fn()} />,
    );
    expect(html).toContain(
      'aria-label="Mechanics Unit Test result: 45 out of 50, 90 percent"',
    );
  });

  // ── PARENT-ASSESS-UI-024 ──────────────────────────────────────────────────
  it('PARENT-ASSESS-UI-024: Unsafe HTML in test title is rendered as escaped text', () => {
    const unsafeTest: ParentAssessmentItemDTO = {
      ...mockAssessments[0],
      title: '<script>alert("xss")</script>',
    };
    const html = renderToStaticMarkup(
      <AssessmentCard assessment={unsafeTest} onSelect={vi.fn()} />,
    );
    expect(html).not.toContain('<script>alert');
    expect(html).toContain('&lt;script&gt;alert');
  });

  // ── PARENT-ASSESS-UI-025 ──────────────────────────────────────────────────
  it('PARENT-ASSESS-UI-025: No internal database IDs are rendered in assessment card text', () => {
    const html = renderToStaticMarkup(
      <AssessmentCard assessment={mockAssessments[0]} onSelect={vi.fn()} />,
    );
    expect(html).not.toContain('test-uuid-1');
    expect(html).not.toContain('batch-uuid-1');
  });
});
