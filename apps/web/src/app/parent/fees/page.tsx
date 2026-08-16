import type { Metadata } from 'next';
import { ParentDashboardContent } from '../../../features/parent';

export const metadata: Metadata = {
  title: 'Child Fees, Invoices & Receipts — Parent Hub',
  description: 'View fee status, invoice history, payment records, and official receipts for your linked children.',
};

/**
 * /parent/fees — Parent PWA Child Fees & Billing Page.
 */
export default function ParentFeesPage() {
  return <ParentDashboardContent initialTab="fees" />;
}
