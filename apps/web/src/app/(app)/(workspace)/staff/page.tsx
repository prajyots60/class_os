import * as React from 'react';
import { StaffWorkspaceContent } from '../../../../features/staff';

export const metadata = {
  title: 'Staff & Team | CoachingOS',
  description: 'Manage institute staff members, assign roles, and administer team permissions.',
};

/**
 * /staff — Staff & Team Management Page
 *
 * ARCHITECTURAL CONTRACT:
 * - Server Component composition boundary (< 20 lines).
 * - Protected by (workspace)/layout.tsx (session verification & tenant context).
 * - Delegates interactive UI rendering, capability checking, and API interaction to StaffWorkspaceContent.
 */
export default function StaffPage() {
  return <StaffWorkspaceContent />;
}
