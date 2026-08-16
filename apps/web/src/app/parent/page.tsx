import type { Metadata } from 'next';
import { ParentDashboardContent } from '../../features/parent';

export const metadata: Metadata = {
  title: 'Parent Hub — CoachingOS',
  description: 'Parent PWA dashboard for viewing your linked children and daily coaching activities.',
};

/**
 * /parent — Parent PWA Home / Dashboard Page.
 */
export default function ParentHomePage() {
  return <ParentDashboardContent />;
}
