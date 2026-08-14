import * as React from 'react';
import { BillingWorkspace } from '../../../../features/billing';

export const metadata = {
  title: 'Fees & Billing Workspace | CoachingOS',
  description: 'Manage billing plans, track invoices, record payments, and issue fee receipts.',
};

/**
 * /billing — Staff Fees & Billing Workspace Page
 *
 * ARCHITECTURAL CONTRACT:
 * - Server Component composition boundary (< 20 lines).
 * - Protected by parent (workspace)/layout.tsx (session verification & tenant context).
 * - Delegates interactive UI rendering, capability checking, and API interaction to BillingWorkspace.
 */
export default function BillingPage() {
  return <BillingWorkspace />;
}
