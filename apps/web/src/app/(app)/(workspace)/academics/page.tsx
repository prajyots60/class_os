import * as React from 'react';
import { AcademicWorkspace } from '../../../../features/academic';

export const metadata = {
  title: 'Academic Workspace | CoachingOS',
  description: 'Manage academic programs, subjects, program-subject mappings, and batches for your coaching institute.',
};

/**
 * /academics — Staff Academic Workspace Page
 *
 * ARCHITECTURAL CONTRACT:
 * - Server Component composition boundary (< 20 lines).
 * - Protected by parent (workspace)/layout.tsx (session verification & tenant context).
 * - Delegates interactive UI rendering, capability checking, and API interaction to AcademicWorkspace.
 */
export default function AcademicsPage() {
  return <AcademicWorkspace />;
}
