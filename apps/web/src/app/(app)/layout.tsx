import * as React from 'react';

/**
 * (app)/layout.tsx
 *
 * Authenticated Root Route Group Layout.
 *
 * ARCHITECTURAL CONTRACT:
 * - This is a Server Component layout wrapping all authenticated routes (/onboarding, /dashboard, etc.).
 * - Sub-layouts and pages ((workspace)/layout.tsx, onboarding/page.tsx) independently invoke
 *   requireAuthSession() with their exact route parameters before rendering any HTML.
 * - Does NOT perform tenant resolution here because /onboarding renders when user has no active tenant.
 */
export default function AuthenticatedAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
