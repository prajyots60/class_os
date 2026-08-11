import * as React from 'react';
import { redirect } from 'next/navigation';
import { requireAuthSession, resolveServerTenantContext } from '../../../lib/auth-guards';
import { AppShell, filterNavigationByRole } from '../../../features/app-shell';
import { getCapabilitiesForRole } from '@coaching-os/identity';

/**
 * (app)/(workspace)/layout.tsx
 *
 * Workspace Layout for Authenticated Institute Tenants.
 *
 * ARCHITECTURAL CONTRACT:
 * - Async Server Component wrapping all tenant-required workspace routes (/dashboard, /students, etc.).
 * - Verifies session authentication and resolves server tenant context.
 * - Redirects users without an active institute membership to /onboarding before any workspace HTML is rendered.
 * - Transforms server state into explicit presentation DTOs (user, tenant, institute).
 * - Computes role capability-filtered navigation server-side before rendering the presentation shell.
 * - Wraps workspace page children inside the production <AppShell> (sidebar, header, navigation).
 */
export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 1. Session verification
  const session = await requireAuthSession('/dashboard');

  // 2. Resolve server tenant state directly from domain use-cases
  const tenantState = await resolveServerTenantContext(session.user.id);

  // 3. Redirect users with no active institute to /onboarding
  if (!tenantState.hasTenant || !tenantState.institute) {
    redirect('/onboarding');
  }

  const { tenantContext, institute } = tenantState;

  // 4. Transform into presentation DTOs for the AppShell
  const userDisplay = {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
  };

  const capabilities = Array.from(getCapabilitiesForRole(tenantContext.role));

  const tenantDisplay = {
    role: tenantContext.role,
    status: tenantContext.status,
    capabilities,
  };

  const instituteDisplay = {
    name: institute.name,
    slug: institute.slug,
    status: institute.status,
  };

  // Compute capability-filtered navigation sections server-side
  const navigationSections = filterNavigationByRole(tenantContext.role);

  return (
    <AppShell
      user={userDisplay}
      tenant={tenantDisplay}
      institute={instituteDisplay}
      navigationSections={navigationSections}
    >
      {children}
    </AppShell>
  );
}
