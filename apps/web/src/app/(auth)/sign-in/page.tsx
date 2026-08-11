import * as React from 'react';
import type { Metadata } from 'next';
import { SignInForm } from '../../../features/auth/sign-in';
import { Spinner } from '@coaching-os/ui';

export const metadata: Metadata = {
  title: 'Sign In — CoachingOS',
  description:
    'Sign in to your CoachingOS account to access your coaching institute workspace.',
};

/**
 * /sign-in — Public authentication page.
 *
 * ARCHITECTURE:
 * - This page is a thin Server Component composition boundary (< 30 lines).
 * - All form interaction, auth client logic, and search params handling live in <SignInForm />.
 * - <React.Suspense> wraps <SignInForm /> to handle useSearchParams() during static generation.
 * - No database, Prisma, or Better Auth server imports belong here.
 */
export default function SignInPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex min-h-[300px] items-center justify-center">
          <Spinner size="md" />
        </div>
      }
    >
      <SignInForm />
    </React.Suspense>
  );
}
