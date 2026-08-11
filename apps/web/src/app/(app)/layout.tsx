import * as React from 'react';
import { headers } from 'next/headers';
import { requireAuthSession } from '../../lib/auth-guards';

/**
 * (app)/layout.tsx
 *
 * Authenticated Root Route Group Layout.
 *
 * ARCHITECTURAL CONTRACT:
 * - This is an async Server Component.
 * - Enforces session authentication via requireAuthSession() for all sub-routes
 *   (/dashboard, /onboarding, /students, etc.) before rendering any HTML.
 * - Does NOT perform tenant resolution here because /onboarding renders when
 *   user has no active tenant (hasTenant: false).
 * - Tenant workspace routes are nested inside (workspace)/layout.tsx.
 */
export default async function AuthenticatedAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const requestHeaders = await headers();
  // Get current pathname or default to /dashboard for callback redirect
  const referer = requestHeaders.get('referer');
  const pathname = referer ? new URL(referer).pathname : '/dashboard';

  // Session authentication guard
  await requireAuthSession(pathname);

  return <>{children}</>;
}
