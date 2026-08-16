import type { Metadata } from 'next';
import { ParentDashboardContent } from '../../../features/parent';

export const metadata: Metadata = {
  title: 'Child Attendance — Parent Hub',
  description: 'View session attendance statistics and logs for your linked children.',
};

/**
 * /parent/attendance — Parent PWA Child Attendance Page.
 */
export default function ParentAttendancePage() {
  return <ParentDashboardContent initialTab="attendance" />;
}
