import * as React from 'react';
import { EnrollmentContent } from '../../../../features/enrollment';

export const metadata = {
  title: 'Enrollments | CoachingOS',
  description: 'Manage student batch enrollments, lifecycle transitions, and atomic transfers for your coaching institute.',
};

/**
 * /enrollments — Staff Student Enrollment Workspace Page
 *
 * ARCHITECTURAL CONTRACT:
 * - Server Component composition boundary (< 20 lines).
 * - Protected by parent (workspace)/layout.tsx (session verification & tenant context).
 * - Delegates interactive UI rendering, capability checking, and API interaction to EnrollmentContent.
 */
export default function EnrollmentsPage() {
  return <EnrollmentContent />;
}
