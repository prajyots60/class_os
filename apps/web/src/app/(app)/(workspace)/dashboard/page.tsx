import type { Metadata } from 'next';
import { requireAuthSession, resolveServerTenantContext } from '../../../../lib/auth-guards';
import { OwnerDashboardView, TeacherDashboardView } from '../../../../features/dashboard';

export const metadata: Metadata = {
  title: 'Dashboard — CoachingOS',
  description: 'Operational overview of your coaching institute.',
};

/**
 * /dashboard — Authenticated Workspace Dashboard Page.
 *
 * ARCHITECTURE:
 * Server Component composition page resolving role context server-side.
 * Renders role-tailored dashboard view:
 * - 'teacher' -> <TeacherDashboardView />
 * - 'owner' (default) -> <OwnerDashboardView />
 */
export default async function DashboardPage() {
  const session = await requireAuthSession('/dashboard');
  const tenantState = await resolveServerTenantContext(session.user.id);
  const role = tenantState.hasTenant ? tenantState.tenantContext.role : 'owner';

  if (role === 'teacher') {
    return <TeacherDashboardView />;
  }

  return <OwnerDashboardView />;
}
