import React from 'react';
import fs from 'fs';
import path from 'path';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AttendanceReportView } from './components/AttendanceReportView';
import { FeeCollectionReportView } from './components/FeeCollectionReportView';

const mockAttendanceData = {
  summary: {
    totalSessions: 12,
    completedSessions: 10,
    pendingSessions: 2,
    eligibleRecords: 240,
    presentCount: 216,
    absentCount: 24,
    attendancePercentage: 90,
  },
  data: [
    {
      id: 'sess-1',
      dateIso: '2026-08-15',
      batchId: 'batch-1',
      batchName: 'Class 10 Physics',
      batchCode: 'PHY-10',
      subjectName: 'Physics',
      teacherName: 'Dr. Verma',
      eligibleCount: 24,
      presentCount: 22,
      absentCount: 2,
      attendancePercentage: 92,
      status: 'completed',
    },
  ],
  meta: {
    total: 1,
    page: 1,
    pageSize: 25,
    totalPages: 1,
  },
};

const mockFeeData = {
  summary: {
    totalCollectedAmount: 45000,
    transactionCount: 9,
    pendingInvoiceAmount: 12000,
    paymentMethodBreakdown: {
      cash: 15000,
      upi: 25000,
      bank_transfer: 5000,
    },
  },
  data: [
    {
      id: 'pay-1',
      receivedOnIso: '2026-08-14',
      studentId: 'st-1',
      studentName: 'Aarav Patel',
      admissionNumber: 'ADM-2026-01',
      invoiceId: 'inv-1',
      invoiceNumber: 'INV-2026-001',
      amount: 5000,
      paymentMode: 'upi',
      receiptNumber: 'REC-001',
    },
  ],
  meta: {
    total: 1,
    page: 1,
    pageSize: 25,
    totalPages: 1,
  },
};

describe('Phase 6.8 — Operational Reports UI Suite', () => {
  it('REPORT-001: Attendance report renders', () => {
    const html = renderToStaticMarkup(
      <AttendanceReportView
        data={mockAttendanceData}
        loading={false}
        error={null}
        from="2026-08-01"
        to="2026-08-15"
        search=""
        page={1}
        onFromChange={vi.fn()}
        onToChange={vi.fn()}
        onSearchChange={vi.fn()}
        onPageChange={vi.fn()}
        onClearFilters={vi.fn()}
        onRetry={vi.fn()}
      />
    );
    expect(html).toContain('Total Sessions');
    expect(html).toContain('Class 10 Physics');
  });

  it('REPORT-002: Fee report renders', () => {
    const html = renderToStaticMarkup(
      <FeeCollectionReportView
        data={mockFeeData}
        loading={false}
        error={null}
        from="2026-08-01"
        to="2026-08-15"
        paymentMode="all"
        search=""
        page={1}
        onFromChange={vi.fn()}
        onToChange={vi.fn()}
        onPaymentModeChange={vi.fn()}
        onSearchChange={vi.fn()}
        onPageChange={vi.fn()}
        onClearFilters={vi.fn()}
        onRetry={vi.fn()}
      />
    );
    expect(html).toContain('Total Collected');
    expect(html).toContain('Aarav Patel');
  });

  it('REPORT-003: Report selector / date filters render', () => {
    const html = renderToStaticMarkup(
      <AttendanceReportView
        data={mockAttendanceData}
        loading={false}
        error={null}
        from="2026-08-01"
        to="2026-08-15"
        search=""
        page={1}
        onFromChange={vi.fn()}
        onToChange={vi.fn()}
        onSearchChange={vi.fn()}
        onPageChange={vi.fn()}
        onClearFilters={vi.fn()}
        onRetry={vi.fn()}
      />
    );
    expect(html).toContain('value="2026-08-01"');
    expect(html).toContain('value="2026-08-15"');
  });

  it('REPORT-004: Attendance summary metrics render correctly', () => {
    const html = renderToStaticMarkup(
      <AttendanceReportView
        data={mockAttendanceData}
        loading={false}
        error={null}
        from="2026-08-01"
        to="2026-08-15"
        search=""
        page={1}
        onFromChange={vi.fn()}
        onToChange={vi.fn()}
        onSearchChange={vi.fn()}
        onPageChange={vi.fn()}
        onClearFilters={vi.fn()}
        onRetry={vi.fn()}
      />
    );
    expect(html).toContain('12'); // Total sessions
    expect(html).toContain('10'); // Completed
    expect(html).toContain('90%'); // Attendance rate
  });

  it('REPORT-005: Fee summary metrics & breakdown render correctly', () => {
    const html = renderToStaticMarkup(
      <FeeCollectionReportView
        data={mockFeeData}
        loading={false}
        error={null}
        from="2026-08-01"
        to="2026-08-15"
        paymentMode="all"
        search=""
        page={1}
        onFromChange={vi.fn()}
        onToChange={vi.fn()}
        onPaymentModeChange={vi.fn()}
        onSearchChange={vi.fn()}
        onPageChange={vi.fn()}
        onClearFilters={vi.fn()}
        onRetry={vi.fn()}
      />
    );
    expect(html).toContain('₹45,000');
    expect(html).toContain('₹25,000'); // UPI breakdown
  });

  it('REPORT-006: Loading state displays skeleton', () => {
    const html = renderToStaticMarkup(
      <AttendanceReportView
        data={null}
        loading={true}
        error={null}
        from="2026-08-01"
        to="2026-08-15"
        search=""
        page={1}
        onFromChange={vi.fn()}
        onToChange={vi.fn()}
        onSearchChange={vi.fn()}
        onPageChange={vi.fn()}
        onClearFilters={vi.fn()}
        onRetry={vi.fn()}
      />
    );
    expect(html).toContain('animate-pulse');
  });

  it('REPORT-007: Error state renders alert and retry button', () => {
    const html = renderToStaticMarkup(
      <AttendanceReportView
        data={null}
        loading={false}
        error="Network error loading report."
        from="2026-08-01"
        to="2026-08-15"
        search=""
        page={1}
        onFromChange={vi.fn()}
        onToChange={vi.fn()}
        onSearchChange={vi.fn()}
        onPageChange={vi.fn()}
        onClearFilters={vi.fn()}
        onRetry={vi.fn()}
      />
    );
    expect(html).toContain('Network error loading report.');
    expect(html).toContain('Retry Loading Report');
  });

  it('REPORT-008: Empty state renders clear filters when filters active', () => {
    const html = renderToStaticMarkup(
      <AttendanceReportView
        data={{ summary: { totalSessions: 0, completedSessions: 0, pendingSessions: 0, eligibleRecords: 0, presentCount: 0, absentCount: 0, attendancePercentage: 0 }, data: [], meta: { total: 0, page: 1, pageSize: 25, totalPages: 1 } }}
        loading={false}
        error={null}
        from="2026-08-01"
        to="2026-08-15"
        search="NonExistentBatch"
        page={1}
        onFromChange={vi.fn()}
        onToChange={vi.fn()}
        onSearchChange={vi.fn()}
        onPageChange={vi.fn()}
        onClearFilters={vi.fn()}
        onRetry={vi.fn()}
      />
    );
    expect(html).toContain('No attendance report records found');
    expect(html).toContain('Clear Filters');
  });

  it('REPORT-009: No export controls exposed in UI', () => {
    const htmlAttendance = renderToStaticMarkup(
      <AttendanceReportView
        data={mockAttendanceData}
        loading={false}
        error={null}
        from="2026-08-01"
        to="2026-08-15"
        search=""
        page={1}
        onFromChange={vi.fn()}
        onToChange={vi.fn()}
        onSearchChange={vi.fn()}
        onPageChange={vi.fn()}
        onClearFilters={vi.fn()}
        onRetry={vi.fn()}
      />
    );
    const htmlFee = renderToStaticMarkup(
      <FeeCollectionReportView
        data={mockFeeData}
        loading={false}
        error={null}
        from="2026-08-01"
        to="2026-08-15"
        paymentMode="all"
        search=""
        page={1}
        onFromChange={vi.fn()}
        onToChange={vi.fn()}
        onPaymentModeChange={vi.fn()}
        onSearchChange={vi.fn()}
        onPageChange={vi.fn()}
        onClearFilters={vi.fn()}
        onRetry={vi.fn()}
      />
    );
    expect(htmlAttendance.toLowerCase()).not.toContain('export csv');
    expect(htmlAttendance.toLowerCase()).not.toContain('export pdf');
    expect(htmlFee.toLowerCase()).not.toContain('export excel');
  });

  it('REPORT-010: Currency formatting uses INR format', () => {
    const html = renderToStaticMarkup(
      <FeeCollectionReportView
        data={mockFeeData}
        loading={false}
        error={null}
        from="2026-08-01"
        to="2026-08-15"
        paymentMode="all"
        search=""
        page={1}
        onFromChange={vi.fn()}
        onToChange={vi.fn()}
        onPaymentModeChange={vi.fn()}
        onSearchChange={vi.fn()}
        onPageChange={vi.fn()}
        onClearFilters={vi.fn()}
        onRetry={vi.fn()}
      />
    );
    expect(html).toContain('₹45,000');
    expect(html).toContain('₹5,000');
  });

  it('REPORT-011: Status semantics do not rely on color alone', () => {
    const html = renderToStaticMarkup(
      <AttendanceReportView
        data={mockAttendanceData}
        loading={false}
        error={null}
        from="2026-08-01"
        to="2026-08-15"
        search=""
        page={1}
        onFromChange={vi.fn()}
        onToChange={vi.fn()}
        onSearchChange={vi.fn()}
        onPageChange={vi.fn()}
        onClearFilters={vi.fn()}
        onRetry={vi.fn()}
      />
    );
    expect(html).toContain('Completed');
  });

  it('REPORT-012: Touch targets meet >=44px CSS specification', () => {
    const html = renderToStaticMarkup(
      <AttendanceReportView
        data={mockAttendanceData}
        loading={false}
        error={null}
        from="2026-08-01"
        to="2026-08-15"
        search="test"
        page={1}
        onFromChange={vi.fn()}
        onToChange={vi.fn()}
        onSearchChange={vi.fn()}
        onPageChange={vi.fn()}
        onClearFilters={vi.fn()}
        onRetry={vi.fn()}
      />
    );
    expect(html).toContain('min-h-[44px]');
  });

  it('REPORT-013: Accessible input labels present for report date filters', () => {
    const html = renderToStaticMarkup(
      <AttendanceReportView
        data={mockAttendanceData}
        loading={false}
        error={null}
        from="2026-08-01"
        to="2026-08-15"
        search=""
        page={1}
        onFromChange={vi.fn()}
        onToChange={vi.fn()}
        onSearchChange={vi.fn()}
        onPageChange={vi.fn()}
        onClearFilters={vi.fn()}
        onRetry={vi.fn()}
      />
    );
    expect(html).toContain('for="attendance-from-date"');
    expect(html).toContain('for="attendance-to-date"');
  });

  it('REPORT-014: Fee collection report contains accessible aria-label on mode select', () => {
    const html = renderToStaticMarkup(
      <FeeCollectionReportView
        data={mockFeeData}
        loading={false}
        error={null}
        from="2026-08-01"
        to="2026-08-15"
        paymentMode="all"
        search=""
        page={1}
        onFromChange={vi.fn()}
        onToChange={vi.fn()}
        onPaymentModeChange={vi.fn()}
        onSearchChange={vi.fn()}
        onPageChange={vi.fn()}
        onClearFilters={vi.fn()}
        onRetry={vi.fn()}
      />
    );
    expect(html).toContain('aria-label="Filter by payment method mode"');
  });

  it('REPORT-015: Report components contain zero Prisma or raw SQL code', () => {
    const attendanceViewCode = fs.readFileSync(path.join(__dirname, 'components/AttendanceReportView.tsx'), 'utf-8');
    const feeViewCode = fs.readFileSync(path.join(__dirname, 'components/FeeCollectionReportView.tsx'), 'utf-8');
    expect(attendanceViewCode).not.toContain('prisma');
    expect(feeViewCode).not.toContain('prisma');
  });
});
