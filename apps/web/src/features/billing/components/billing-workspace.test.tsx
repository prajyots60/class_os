import { describe, it, expect, vi } from 'vitest';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BillingWorkspace, BillingWorkspaceInner } from './BillingWorkspace';
import { BillingOverviewView } from './BillingOverviewView';
import { RecordPaymentModal } from './RecordPaymentModal';
import { ReceiptDetailsModal } from './ReceiptDetailsModal';
import { InvoiceStatusBadge, PaymentModeBadge, FeeTypeBadge } from './BillingStatusBadge';
import { formatCurrency, formatDate, isInvoiceOverdue } from '../utils/formatters';
import type { InvoiceDTO, PaymentDTO, ReceiptDTO } from '../types';

const mockInvoice: InvoiceDTO = {
  id: 'inv-300',
  instituteId: 'inst-1',
  billingPlanId: 'bp-100',
  enrollmentId: 'enr-200',
  studentName: 'Aarav Sharma',
  batchName: 'Physics Batch A',
  invoiceNumber: 'INV-2026-00042',
  amount: 10000,
  paidAmount: 3000,
  outstanding: 7000,
  dueDate: '2026-07-01', // Past date -> overdue
  status: 'partial',
  isOverdue: true,
  createdAt: '2026-08-01T00:00:00Z',
  updatedAt: '2026-08-01T00:00:00Z',
};

const mockPayment: PaymentDTO = {
  id: 'pay-500',
  instituteId: 'inst-1',
  invoiceId: 'inv-300',
  invoiceNumber: 'INV-2026-00042',
  studentName: 'Aarav Sharma',
  amount: 3000,
  paymentMode: 'upi',
  receivedOn: '2026-08-10',
  collectedBy: 'Staff User',
  receiptId: 'rec-700',
  receiptNumber: 'REC-2026-00001',
  createdAt: '2026-08-10T10:00:00Z',
};

const mockReceipt: ReceiptDTO = {
  id: 'rec-700',
  instituteId: 'inst-1',
  paymentId: 'pay-500',
  receiptNumber: 'REC-2026-00001',
  amount: 3000,
  paymentMode: 'upi',
  generatedAt: '2026-08-10T10:05:00Z',
  downloadUrl: null,
};

describe('Phase 3.6.1 — Staff Billing Workspace UI Component Suite', () => {
  describe('1. Financial Formatters & Overdue Invariants', () => {
    it('formats currency into Indian Rupee (INR) notation', () => {
      expect(formatCurrency(10000)).toContain('10,000.00');
      expect(formatCurrency(3333.34)).toContain('3,333.34');
      expect(formatCurrency(0)).toContain('0.00');
      expect(formatCurrency(null)).toBe('₹0.00');
    });

    it('formats ISO dates accurately', () => {
      expect(formatDate('2026-08-14')).toContain('2026');
      expect(formatDate(null)).toBe('—');
    });

    it('computes derived overdue status correctly', () => {
      expect(isInvoiceOverdue('2020-01-01', 'pending')).toBe(true);
      expect(isInvoiceOverdue('2020-01-01', 'paid')).toBe(false); // Paid invoices are never overdue
      expect(isInvoiceOverdue('2099-01-01', 'pending')).toBe(false);
    });
  });

  describe('2. Status & Badge Components', () => {
    it('renders invoice status badges and overdue indicator', () => {
      const html = renderToStaticMarkup(
        <InvoiceStatusBadge status="partial" isOverdue={true} />
      );
      expect(html).toContain('Partially Paid');
      expect(html).toContain('Overdue');
    });

    it('renders payment mode badges', () => {
      const html = renderToStaticMarkup(<PaymentModeBadge mode="upi" />);
      expect(html).toContain('UPI');
    });

    it('renders fee type badges', () => {
      const html = renderToStaticMarkup(<FeeTypeBadge type="installment" />);
      expect(html).toContain('Installment');
    });
  });

  describe('3. Billing Workspace Navigation & Capability Degradation', () => {
    it('renders workspace shell when user possesses billing:read', () => {
      const html = renderToStaticMarkup(
        <BillingWorkspaceInner userCapabilities={['billing:read']} />
      );
      expect(html).toContain('Billing Workspace');
      expect(html).toContain('Overview');
      expect(html).toContain('Billing Plans');
      expect(html).toContain('Invoices');
      expect(html).toContain('Payments');
      expect(html).toContain('Receipts');
    });

    it('renders Access Denied (403) when user lacks billing:read', () => {
      const html = renderToStaticMarkup(<BillingWorkspaceInner userCapabilities={[]} />);
      expect(html).toContain('Access Denied (403)');
      expect(html).toContain('billing:read');
    });
  });

  describe('4. Billing Overview View', () => {
    it('renders aggregate metrics cards and activity feeds', () => {
      const html = renderToStaticMarkup(
        <BillingOverviewView
          invoices={[mockInvoice]}
          payments={[mockPayment]}
          loading={false}
          canWriteBilling={true}
          canRecordPayment={true}
          onOpenCreatePlan={vi.fn()}
          onOpenGenerateInvoice={vi.fn()}
          onSelectInvoice={vi.fn()}
          onSelectPayment={vi.fn()}
          onNavigateTab={vi.fn()}
        />
      );

      expect(html).toContain('Total Outstanding');
      expect(html).toContain('Pending Collection');
      expect(html).toContain('Overdue Invoices');
      expect(html).toContain('Total Collected');
      expect(html).toContain('INV-2026-00042');
      expect(html).toContain('Aarav Sharma');
    });
  });

  describe('5. Record Payment Modal & Financial Balance Safety (R-UI-004)', () => {
    it('renders financial summary box with current outstanding and balance preview', () => {
      const html = renderToStaticMarkup(
        <RecordPaymentModal
          isOpen={true}
          invoice={mockInvoice}
          onClose={vi.fn()}
          onSuccess={vi.fn()}
        />
      );

      expect(html).toContain('Record Payment — INV-2026-00042');
      expect(html).toContain('Invoice Amount');
      expect(html).toContain('Previously Paid');
      expect(html).toContain('Current Outstanding');
      expect(html).toContain('Remaining Balance After Payment');
    });
  });

  describe('6. Receipt Details Modal & Disabled PDF Boundary (R-UI-005)', () => {
    it('renders receipt details and disabled PDF download button', () => {
      const html = renderToStaticMarkup(
        <ReceiptDetailsModal isOpen={true} receipt={mockReceipt} onClose={vi.fn()} />
      );

      expect(html).toContain('Official Fee Receipt');
      expect(html).toContain('REC-2026-00001');
      expect(html).toContain('Download PDF');
      expect(html).toContain('disabled');
      expect(html).toContain('PDF storage worker integration will be enabled in a future update');
    });
  });
});
