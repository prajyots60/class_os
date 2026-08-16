import type { Metadata } from 'next';
import { ParentDashboardContent } from '../../../features/parent';

export const metadata: Metadata = {
  title: 'Child Assessments & Performance — Parent Hub',
  description: 'View published test results, marks, and performance trends for your linked children.',
};

/**
 * /parent/assessments — Parent PWA Child Assessments Page.
 */
export default function ParentAssessmentsPage() {
  return <ParentDashboardContent initialTab="assessments" />;
}
