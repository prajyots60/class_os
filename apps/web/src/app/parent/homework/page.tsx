import type { Metadata } from 'next';
import { ParentDashboardContent } from '../../../features/parent';

export const metadata: Metadata = {
  title: 'Child Homework — Parent Hub',
  description: 'View published homework assignments and instructions for your linked children.',
};

/**
 * /parent/homework — Parent PWA Child Homework Page.
 */
export default function ParentHomeworkPage() {
  return <ParentDashboardContent initialTab="homework" />;
}
