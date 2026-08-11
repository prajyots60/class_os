import * as React from 'react';
import { InstituteParentContent } from '../../../../features/institute-parent';

export const metadata = {
  title: 'Parents | CoachingOS',
  description: 'Manage parent relationships, contact details, and operational CRM records for your coaching institute.',
};

/**
 * /parents — InstituteParent Staff CRM Page
 *
 * ARCHITECTURAL CONTRACT:
 * - Server Component composition boundary (< 30 lines).
 * - Protected by parent (workspace)/layout.tsx (session verification & tenant context).
 * - Delegates interactive UI rendering, capability checking, and API interaction to InstituteParentContent.
 */
export default function ParentsPage() {
  return <InstituteParentContent />;
}
