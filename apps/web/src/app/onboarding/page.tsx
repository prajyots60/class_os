import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireAuthSession, resolveServerTenantContext } from '../../lib/auth-guards';
import { OnboardingContent } from '../../features/onboarding/onboarding-content';

export const metadata: Metadata = {
  title: 'Setup Your Institute — CoachingOS',
  description: 'Create your coaching institute workspace on CoachingOS.',
};

/**
 * /onboarding — Protected application page.
 *
 * ARCHITECTURE:
 * This is an async Server Component. Authentication and tenant resolution occur
 * entirely server-side before any HTML is sent to the browser.
 *
 * Security chain:
 *   1. requireAuthSession('/onboarding')
 *      - Reads the Better Auth session cookie via next/headers (server-side only)
 *      - No session → hard redirect to /sign-in?callbackUrl=%2Fonboarding
 *   2. resolveServerTenantContext(session.user.id)
 *      - Calls domain use-cases directly — no HTTP self-call
 *      - Has active tenant → redirect to /dashboard
 *        (prevents tenant-duplication abuse via repeated onboarding)
 *   3. <OnboardingContent> receives only userEmail to pre-fill the contact field
 *
 * INVARIANTS:
 * - Unauthenticated users never see the form — they are redirected before render.
 * - Users who already have a tenant cannot access onboarding again.
 * - Direct URL navigation is equally protected as in-app link navigation.
 */
export default async function OnboardingPage() {
  // 1. Require authenticated session — redirects to /sign-in if unauthenticated
  const session = await requireAuthSession('/onboarding');

  // 2. Resolve tenant state to check if user already has an active institute
  const tenantState = await resolveServerTenantContext(session.user.id);

  // 3. Redirect to dashboard if user already has an active tenant
  //    (prevents duplicate onboarding and tenant abuse)
  if (tenantState.hasTenant) {
    redirect('/dashboard');
  }

  // 4. Render onboarding form — user is authenticated and has no tenant
  return <OnboardingContent userEmail={session.user.email} />;
}
