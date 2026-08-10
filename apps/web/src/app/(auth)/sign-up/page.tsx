import type { Metadata } from 'next';
import { SignUpForm } from '../../../features/auth/sign-up';

export const metadata: Metadata = {
  title: 'Create Account — CoachingOS',
  description:
    'Create your CoachingOS account to set up and manage your coaching institute workspace.',
};

/**
 * /sign-up — Public registration page.
 *
 * ARCHITECTURE:
 * - This page is a thin Server Component composition boundary.
 * - All form interaction and auth client logic lives in <SignUpForm />.
 * - No database, Prisma, or Better Auth server imports belong here.
 *
 * ALREADY AUTHENTICATED HANDLING:
 * The <SignUpForm /> Client Component checks the Better Auth session via
 * useSession() on mount and redirects to /onboarding if a valid session
 * is already present. This keeps the page itself a Server Component.
 *
 * DEFER TO LATER PHASES:
 * - Email verification UI (Phase 0.12.6+)
 * - OAuth / social login (Deferred)
 * - Password reset (Deferred)
 */
export default function SignUpPage() {
  return <SignUpForm />;
}
