import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireAuthSession, resolveServerTenantContext } from '../../lib/auth-guards';
import { DashboardContent } from '../../features/dashboard/dashboard-content';

export const metadata: Metadata = {
  title: 'Dashboard — CoachingOS',
  description: 'Manage your coaching institute from the CoachingOS Dashboard.',
};

/**
 * /dashboard — Protected application page.
 *
 * ARCHITECTURE:
 * This is an async Server Component. Authentication and tenant resolution occur
 * entirely server-side before any HTML is sent to the browser.
 *
 * Security chain:
 *   1. requireAuthSession('/dashboard')
 *      - Reads the Better Auth session cookie via next/headers (server-side only)
 *      - No session → hard redirect to /sign-in?callbackUrl=%2Fdashboard
 *        (no flash, no client JS required)
 *   2. resolveServerTenantContext(session.user.id)
 *      - Calls domain use-cases directly — no HTTP self-call to /api/dashboard/context
 *      - No active tenant → redirect to /onboarding
 *   3. <DashboardContent> receives ONLY minimum presentation data
 *      - No raw session object, no full TenantContext, no DB internals
 *
 * INVARIANTS:
 * - No client-supplied userId, instituteId, role, or status is trusted.
 * - No protected content is rendered before authentication and authorization succeed.
 * - Direct URL navigation is equally protected as in-app link navigation.
 */
export default async function DashboardPage() {
  // 1. Require authenticated session — redirects to /sign-in if unauthenticated
  const session = await requireAuthSession('/dashboard');

  // 2. Resolve tenant context via domain use-cases (no HTTP self-call)
  const tenantState = await resolveServerTenantContext(session.user.id);

  // 3. Redirect to onboarding if user has no active institute membership
  if (!tenantState.hasTenant) {
    redirect('/onboarding');
  }

  const { tenantContext, institute } = tenantState;

  // 4. Institute data guard — redirect if institute data is unavailable
  if (!institute) {
    redirect('/onboarding');
  }

  // 5. Render dashboard — pass ONLY presentation-safe data to the client component
  return (
    <DashboardContent
      user={{
        name: session.user.name,
        email: session.user.email,
      }}
      tenant={{
        role: tenantContext.role,
        status: tenantContext.status,
      }}
      institute={{
        name: institute.name,
        slug: institute.slug,
        status: institute.status,
      }}
    />
  );
}
