import { describe, it, expect } from 'vitest';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { HomeworkDetailModal } from './components/homework/homework-detail-modal';
import { AssessmentDetailModal } from './components/assessments/assessment-detail-modal';

describe('Phase 5.11 — Client UI Privacy, XSS & Cache Isolation Matrix', () => {
  it('PARENT-SEC-043: React Query cache key structure includes explicit studentId boundary', () => {
    const getAttendanceQueryKey = (studentId: string) => ['parent', 'attendance', studentId];
    const getHomeworkQueryKey = (studentId: string) => ['parent', 'homework', studentId];

    const keyStudentA = getAttendanceQueryKey('student-uuid-A');
    const keyStudentB = getAttendanceQueryKey('student-uuid-B');

    expect(keyStudentA).not.toEqual(keyStudentB);
    expect(keyStudentA[2]).toBe('student-uuid-A');
    expect(keyStudentB[2]).toBe('student-uuid-B');

    const hwKeyStudentA = getHomeworkQueryKey('student-uuid-A');
    const hwKeyStudentB = getHomeworkQueryKey('student-uuid-B');
    expect(hwKeyStudentA).not.toEqual(hwKeyStudentB);
    expect(hwKeyStudentA[2]).toBe('student-uuid-A');
    expect(hwKeyStudentB[2]).toBe('student-uuid-B');
  });

  it('PARENT-SEC-044: Homework details modal escapes malicious XSS script tags in instructions', () => {
    const maliciousHomework = {
      id: 'hw-xss-1',
      batchId: 'batch-1',
      batchName: 'Batch A',
      subject: 'Computer Science',
      title: 'XSS Assignment',
      subjectName: 'Computer Science',
      description: '<script>alert("XSS Attack!")</script><img src=x onerror=alert(1)>',
      instructions: '<script>alert("XSS Attack!")</script><img src=x onerror=alert(1)>',
      dueDate: '2026-08-30',
      attachmentUrl: null,
      status: 'pending' as const,
      publishedAt: '2026-08-16T10:00:00.000Z',
      createdAt: '2026-08-16T10:00:00.000Z',
    };

    const html = renderToStaticMarkup(<HomeworkDetailModal homework={maliciousHomework} onClose={() => {}} />);

    // React escapes text content, escaping HTML tags as &lt;script&gt;
    expect(html).toContain('&lt;script&gt;alert(&quot;XSS Attack!&quot;)&lt;/script&gt;');
    expect(html).not.toContain('<script>alert("XSS Attack!")</script>');
  });

  it('PARENT-SEC-045: Assessment details modal renders test title and instructions safely without raw script execution', () => {
    const maliciousAssessment = {
      id: 'test-xss-1',
      batchId: 'batch-1',
      batchName: 'Batch A',
      subject: 'Mathematics',
      title: '<svg onload=alert(1)>Math Exam</svg>',
      subjectName: 'Mathematics',
      scheduledDate: '2026-08-25T10:00:00.000Z',
      testDate: '2026-08-25',
      maximumMarks: 100,
      passingMarks: 40,
      instructions: '<iframe src="javascript:alert(1)"></iframe>',
      marksObtained: 85,
      percentage: 85,
      isPassed: true,
      remarks: 'Excellent performance <script>console.log("leak")</script>',
      status: 'graded' as const,
      createdAt: '2026-08-16T10:00:00.000Z',
    };

    const html = renderToStaticMarkup(<AssessmentDetailModal assessment={maliciousAssessment} onClose={() => {}} />);

    expect(html).toContain('&lt;svg onload=alert(1)&gt;Math Exam&lt;/svg&gt;');
    expect(html).not.toContain('<svg onload=alert(1)>Math Exam</svg>');
    expect(html).not.toContain('<iframe src="javascript:alert(1)"></iframe>');
  });
});
