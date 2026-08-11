import * as React from 'react';
import { StudentContent } from '../../../../features/student';

export const metadata = {
  title: 'Students | CoachingOS',
  description: 'Manage student profiles, admission lifecycles, and standing statuses for your coaching institute.',
};

/**
 * /students — Student Staff CRM & Admission Page
 *
 * ARCHITECTURAL CONTRACT:
 * - Server Component composition boundary (< 20 lines).
 * - Protected by parent (workspace)/layout.tsx (session verification & tenant context).
 * - Delegates interactive UI rendering, capability checking, and API interaction to StudentContent.
 */
export default function StudentsPage() {
  return <StudentContent />;
}
