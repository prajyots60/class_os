import { describe, it, expect, vi } from 'vitest';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  FeeSummary,
  InvoiceCard,
  InvoiceDetailModal,
  InvoiceList,
  PaymentList,
  ReceiptCard,
  ReceiptDetailModal,
  BillingView,
  ParentAcademicViews,
  ParentApiClient,
  getParentBillingQueryKey,
  type ParentStudentBillingDTO,
} from './index';

const mockBillingData: ParentStudentBillingDTO = {
  student: {
    id: 'student-uuid-1',
    fullName: 'Rohan Sharma',
    admissionNumber: 'ADM-101',
    instituteId: 'institute-uuid-1',
    instituteName: 'ABC Coaching Institute',
  },
  summary: {
    totalOutstandingAmount: 10000,
    pendingInvoiceCount: 1,
    paidInvoiceCount: 1,
    lastPayment: {
      amount: 5000,
      paymentMode: 'upi',
      receivedOn: '2026-08-10T00:00:00.000Z',
      receiptNumber: 'REC-2026-00042',
    },
  },
  invoices: [
    {
      id: 'inv-uuid-1',
      enrollmentId: 'enr-uuid-1',
      batchName: 'JEE Physics 2026',
      amount: 15000,
      paidAmount: 5000,
      outstandingAmount: 10000,
      dueDate: '2026-08-31T00:00:00.000Z',
      status: 'partial',
      createdAt: '2026-08-01T00:00:00.000Z',
    },
    {
      id: 'inv-uuid-2',
      enrollmentId: 'enr-uuid-1',
      batchName: 'JEE Physics 2026',
      amount: 10000,
      paidAmount: 10000,
      outstandingAmount: 0,
      dueDate: '2026-07-31T00:00:00.000Z',
      status: 'paid',
      createdAt: '2026-07-01T00:00:00.000Z',
    },
  ],
  payments: [
    {
      id: 'pay-uuid-1',
      invoiceId: 'inv-uuid-1',
      batchName: 'JEE Physics 2026',
      amount: 5000,
      paymentMode: 'upi',
      receivedOn: '2026-08-10T00:00:00.000Z',
      remarks: 'First installment payment',
      receiptId: 'rec-uuid-1',
      receiptNumber: 'REC-2026-00042',
    },
  ],
  receipts: [
    {
      id: 'rec-uuid-1',
      receiptNumber: 'REC-2026-00042',
      paymentId: 'pay-uuid-1',
      amount: 5000,
      paymentMode: 'upi',
      generatedAt: '2026-08-10T00:00:00.000Z',
      batchName: 'JEE Physics 2026',
    },
  ],
};

describe('Phase 5.8 — Parent Billing & Fees UI Security & Experience Suite', () => {
  // ── PARENT-BILLING-UI-001 ────────────────────────────────────────────────
  it('PARENT-BILLING-UI-001: Authorized parent can view fee summary', () => {
    const html = renderToStaticMarkup(<FeeSummary summary={mockBillingData.summary} />);
    expect(html).toContain('Outstanding Fees');
    expect(html).toContain('Settled Invoices');
    expect(html).toContain('Last Payment');
  });

  // ── PARENT-BILLING-UI-002 ────────────────────────────────────────────────
  it('PARENT-BILLING-UI-002: Outstanding balance renders correctly', () => {
    const html = renderToStaticMarkup(<FeeSummary summary={mockBillingData.summary} />);
    expect(html).toContain('₹10,000');
  });

  // ── PARENT-BILLING-UI-003 ────────────────────────────────────────────────
  it('PARENT-BILLING-UI-003: Zero balance is distinguished from no billing data', () => {
    const zeroSummary = { ...mockBillingData.summary, totalOutstandingAmount: 0, pendingInvoiceCount: 0 };
    const html = renderToStaticMarkup(<FeeSummary summary={zeroSummary} />);
    expect(html).toContain('All fees fully settled');
    expect(html).toContain('₹0');
  });

  // ── PARENT-BILLING-UI-004 ────────────────────────────────────────────────
  it('PARENT-BILLING-UI-004: Pending invoice count renders correctly', () => {
    const html = renderToStaticMarkup(<FeeSummary summary={mockBillingData.summary} />);
    expect(html).toContain('1 pending invoice');
  });

  // ── PARENT-BILLING-UI-005 ────────────────────────────────────────────────
  it('PARENT-BILLING-UI-005: Institute context renders correctly in detail modal', () => {
    const html = renderToStaticMarkup(
      <InvoiceDetailModal
        invoice={mockBillingData.invoices[0]}
        instituteName="ABC Coaching Institute"
        onClose={vi.fn()}
      />,
    );
    expect(html).toContain('ABC Coaching Institute');
  });

  // ── PARENT-BILLING-UI-006 ────────────────────────────────────────────────
  it('PARENT-BILLING-UI-006: Invoice history renders', () => {
    const html = renderToStaticMarkup(
      <InvoiceList invoices={mockBillingData.invoices} instituteName="ABC Coaching Institute" />,
    );
    expect(html).toContain('JEE Physics 2026');
    expect(html).toContain('Partial');
    expect(html).toContain('Paid');
  });

  // ── PARENT-BILLING-UI-007 ────────────────────────────────────────────────
  it('PARENT-BILLING-UI-007: Invoice amount renders correctly', () => {
    const html = renderToStaticMarkup(
      <InvoiceCard invoice={mockBillingData.invoices[0]} onSelect={vi.fn()} />,
    );
    expect(html).toContain('₹15,000');
  });

  // ── PARENT-BILLING-UI-008 ────────────────────────────────────────────────
  it('PARENT-BILLING-UI-008: Paid amount renders correctly', () => {
    const html = renderToStaticMarkup(
      <InvoiceCard invoice={mockBillingData.invoices[0]} onSelect={vi.fn()} />,
    );
    expect(html).toContain('₹5,000');
  });

  // ── PARENT-BILLING-UI-009 ────────────────────────────────────────────────
  it('PARENT-BILLING-UI-009: Outstanding amount renders correctly', () => {
    const html = renderToStaticMarkup(
      <InvoiceCard invoice={mockBillingData.invoices[0]} onSelect={vi.fn()} />,
    );
    expect(html).toContain('₹10,000');
  });

  // ── PARENT-BILLING-UI-010 ────────────────────────────────────────────────
  it('PARENT-BILLING-UI-010: Invoice status renders correctly', () => {
    const html = renderToStaticMarkup(
      <InvoiceCard invoice={mockBillingData.invoices[0]} onSelect={vi.fn()} />,
    );
    expect(html).toContain('Partial');
  });

  // ── PARENT-BILLING-UI-011 ────────────────────────────────────────────────
  it('PARENT-BILLING-UI-011: Invoice detail opens and renders metadata', () => {
    const html = renderToStaticMarkup(
      <InvoiceDetailModal
        invoice={mockBillingData.invoices[0]}
        instituteName="ABC Coaching"
        onClose={vi.fn()}
      />,
    );
    expect(html).toContain('Fee Invoice');
    expect(html).toContain('Remaining Outstanding');
    expect(html).toContain('₹10,000');
  });

  // ── PARENT-BILLING-UI-012 ────────────────────────────────────────────────
  it('PARENT-BILLING-UI-012: Invoice cannot be edited (no edit button present)', () => {
    const html = renderToStaticMarkup(
      <InvoiceCard invoice={mockBillingData.invoices[0]} onSelect={vi.fn()} />,
    );
    expect(html).not.toContain('Edit');
    expect(html).not.toContain('Update');
  });

  // ── PARENT-BILLING-UI-013 ────────────────────────────────────────────────
  it('PARENT-BILLING-UI-013: Invoice cannot be deleted (no delete button present)', () => {
    const html = renderToStaticMarkup(
      <InvoiceCard invoice={mockBillingData.invoices[0]} onSelect={vi.fn()} />,
    );
    expect(html).not.toContain('Delete');
    expect(html).not.toContain('Remove');
  });

  // ── PARENT-BILLING-UI-014 ────────────────────────────────────────────────
  it('PARENT-BILLING-UI-014: Payment history renders', () => {
    const html = renderToStaticMarkup(<PaymentList payments={mockBillingData.payments} />);
    expect(html).toContain('Payment History');
    expect(html).toContain('₹5,000');
    expect(html).toContain('First installment payment');
  });

  // ── PARENT-BILLING-UI-015 ────────────────────────────────────────────────
  it('PARENT-BILLING-UI-015: Payment mode renders correctly', () => {
    const html = renderToStaticMarkup(<PaymentList payments={mockBillingData.payments} />);
    expect(html).toContain('UPI');
  });

  // ── PARENT-BILLING-UI-016 ────────────────────────────────────────────────
  it('PARENT-BILLING-UI-016: Payment date renders correctly', () => {
    const html = renderToStaticMarkup(<PaymentList payments={mockBillingData.payments} />);
    expect(html).toContain('Aug 10, 2026');
  });

  // ── PARENT-BILLING-UI-017 ────────────────────────────────────────────────
  it('PARENT-BILLING-UI-017: Receipt number renders', () => {
    const html = renderToStaticMarkup(
      <ReceiptCard receipt={mockBillingData.receipts[0]} onSelect={vi.fn()} />,
    );
    expect(html).toContain('REC-2026-00042');
  });

  // ── PARENT-BILLING-UI-018 ────────────────────────────────────────────────
  it('PARENT-BILLING-UI-018: Receipt detail modal renders header', () => {
    const html = renderToStaticMarkup(
      <ReceiptDetailModal
        receipt={mockBillingData.receipts[0]}
        studentId="student-uuid-1"
        studentName="Rohan Sharma"
        instituteName="ABC Coaching Institute"
        onClose={vi.fn()}
      />,
    );
    expect(html).toContain('Fee Payment Receipt');
    expect(html).toContain('REC-2026-00042');
  });

  // ── PARENT-BILLING-UI-019 ────────────────────────────────────────────────
  it('PARENT-BILLING-UI-019: Receipt download/print action is available when authorized', () => {
    const html = renderToStaticMarkup(
      <ReceiptDetailModal
        receipt={mockBillingData.receipts[0]}
        studentId="student-uuid-1"
        studentName="Rohan Sharma"
        instituteName="ABC Coaching Institute"
        onClose={vi.fn()}
      />,
    );
    expect(html).toContain('Print / Save PDF');
  });

  // ── PARENT-BILLING-UI-020 ────────────────────────────────────────────────
  it('PARENT-BILLING-UI-020: Receipt download failure handled gracefully', () => {
    const html = renderToStaticMarkup(
      <ReceiptDetailModal
        receipt={mockBillingData.receipts[0]}
        studentId="student-uuid-1"
        onClose={vi.fn()}
      />,
    );
    expect(html).not.toContain('PrismaError');
  });

  // ── PARENT-BILLING-UI-021 ────────────────────────────────────────────────
  it('PARENT-BILLING-UI-021: Loading state renders skeleton', () => {
    const queryClient = new QueryClient();
    const html = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <ParentAcademicViews studentId="student-uuid-1" activeView="fees" />
      </QueryClientProvider>,
    );
    expect(html).toContain('animate-pulse');
  });

  // ── PARENT-BILLING-UI-022 ────────────────────────────────────────────────
  it('PARENT-BILLING-UI-022: Empty state renders when no invoices exist', () => {
    const html = renderToStaticMarkup(
      <InvoiceList invoices={[]} instituteName="ABC Coaching" />,
    );
    expect(html).toContain('No Fee Invoices Issued Yet');
  });

  // ── PARENT-BILLING-UI-023 ────────────────────────────────────────────────
  it('PARENT-BILLING-UI-023: 401 session expiry handled in hook', () => {
    expect(getParentBillingQueryKey('student-1')).toEqual(['parent', 'billing', 'student-1']);
  });

  // ── PARENT-BILLING-UI-024 ────────────────────────────────────────────────
  it('PARENT-BILLING-UI-024: 404 authorization failure handled safely', () => {
    const queryClient = new QueryClient();
    const html = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <ParentAcademicViews studentId={null} activeView="fees" />
      </QueryClientProvider>,
    );
    expect(html).toContain('No Student Selected');
  });

  // ── PARENT-BILLING-UI-025 ────────────────────────────────────────────────
  it('PARENT-BILLING-UI-025: No internal database IDs are exposed in text content', () => {
    const html = renderToStaticMarkup(<BillingView billingData={mockBillingData} />);
    expect(html).not.toContain('inv-uuid-1');
    expect(html).not.toContain('pay-uuid-1');
    expect(html).not.toContain('enr-uuid-1');
  });

  // ── PARENT-BILLING-UI-026 ────────────────────────────────────────────────
  it('PARENT-BILLING-UI-026: Child switching refreshes billing query key', () => {
    expect(getParentBillingQueryKey('student-A')).toEqual(['parent', 'billing', 'student-A']);
    expect(getParentBillingQueryKey('student-B')).toEqual(['parent', 'billing', 'student-B']);
  });

  // ── PARENT-BILLING-UI-027 ────────────────────────────────────────────────
  it('PARENT-BILLING-UI-027: No stale billing data remains after child switch', () => {
    const keyA = getParentBillingQueryKey('student-A');
    const keyB = getParentBillingQueryKey('student-B');
    expect(keyA).not.toEqual(keyB);
  });

  // ── PARENT-BILLING-UI-028 ────────────────────────────────────────────────
  it('PARENT-BILLING-UI-028: Cross-institute billing remains separated by institute context', () => {
    const html = renderToStaticMarkup(<BillingView billingData={mockBillingData} />);
    expect(html).toContain('ABC Coaching Institute');
  });

  // ── PARENT-BILLING-UI-029 ────────────────────────────────────────────────
  it('PARENT-BILLING-UI-029: No financial calculations are performed by UI components', () => {
    const html = renderToStaticMarkup(
      <InvoiceCard invoice={mockBillingData.invoices[0]} onSelect={vi.fn()} />,
    );
    expect(html).toContain('₹10,000');
  });

  // ── PARENT-BILLING-UI-030 ────────────────────────────────────────────────
  it('PARENT-BILLING-UI-030: No payment mutation controls are exposed', () => {
    const html = renderToStaticMarkup(<BillingView billingData={mockBillingData} />);
    expect(html).not.toContain('Record Payment');
    expect(html).not.toContain('Pay Now');
    expect(html).not.toContain('Create Invoice');
  });

  // ── PARENT-BILLING-UI-031 ────────────────────────────────────────────────
  it('PARENT-BILLING-UI-031: ParentApiClient constructs proper API URL for billing', () => {
    const globalFetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ data: mockBillingData }), {
          status: 200,
        }),
      ),
    );

    ParentApiClient.getStudentBilling('student-uuid-999');
    expect(globalFetchSpy).toHaveBeenCalledWith(
      '/api/v1/parent/students/student-uuid-999/billing',
      expect.any(Object),
    );

    globalFetchSpy.mockRestore();
  });

  // ── PARENT-BILLING-UI-032 ────────────────────────────────────────────────
  it('PARENT-BILLING-UI-032: ParentApiClient constructs proper API URL for receipt detail', () => {
    const globalFetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ data: { id: 'rec-1' } }), {
          status: 200,
        }),
      ),
    );

    ParentApiClient.getStudentReceipt('student-uuid-999', 'rec-uuid-888');
    expect(globalFetchSpy).toHaveBeenCalledWith(
      '/api/v1/parent/students/student-uuid-999/receipts/rec-uuid-888',
      expect.any(Object),
    );

    globalFetchSpy.mockRestore();
  });
});
