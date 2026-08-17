import type { Metadata } from 'next';
import { OwnerDashboardView } from '../../../../features/dashboard';

export const metadata: Metadata = {
  title: 'Owner Dashboard — CoachingOS',
  description: 'Operational overview of your coaching institute.',
};

/**
 * /dashboard — Authenticated Owner Dashboard Workspace Page.
 *
 * ARCHITECTURE:
 * Server Component composition rendering <OwnerDashboardView />.
 * Authenticated session resolution, layout framing, and navigation shell
 * are handled by (workspace)/layout.tsx parent.
 */
export default function DashboardPage() {
  return <OwnerDashboardView />;
}
