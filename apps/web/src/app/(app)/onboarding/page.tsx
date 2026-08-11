import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireAuthSession, resolveServerTenantContext } from '../../../lib/auth-guards';
import { OnboardingContent } from '../../../features/onboarding/onboarding-content';

export const metadata: Metadata = {
  title: 'Setup Your Institute — CoachingOS',
  description: 'Create your coaching institute workspace on CoachingOS.',
};

/**
 * /onboarding — Authenticated Institute Setup Page.
 *
 * ARCHITECTURE:
 * Rendered inside (app)/layout.tsx (session authenticated).
 * Intentionally rendered outside (workspace) layout (no AppShell sidebar/header).
 *
 * Security chain:
 *   1. Session authentication enforced by (app)/layout.tsx & requireAuthSession()
 *   2. resolveServerTenantContext(session.user.id)
 *      - Has active tenant -> hard redirect to /dashboard (prevents duplicate onboarding)
 *      - No tenant -> renders standalone full-page <OnboardingContent>
 */
export default async function OnboardingPage() {
  // 1. Require authenticated session
  const session = await requireAuthSession('/onboarding');

  // 2. Resolve tenant state to check if user already has an active institute
  const tenantState = await resolveServerTenantContext(session.user.id);

  // 3. Redirect to dashboard if user already has an active tenant
  if (tenantState.hasTenant) {
    redirect('/dashboard');
  }

  // 4. Render standalone onboarding setup UI — user is authenticated and has no tenant
  return <OnboardingContent userEmail={session.user.email} />;
}
