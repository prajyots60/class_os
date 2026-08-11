/**
 * auth-guards.ts
 *
 * Server-side session and tenant-context guards for Next.js Server Components.
 *
 * ARCHITECTURAL CONTRACT:
 * - These functions run exclusively in Server Components (async RSC pages).
 * - They import `next/headers` to read cookies server-side — never usable from client components.
 * - Session identity is derived from Better Auth's canonical session cookie only.
 * - Tenant state is resolved directly through the domain use-case chain —
 *   NOT via a self-referential HTTP fetch to /api/dashboard/context.
 * - Client-supplied userId, instituteId, role, or status are NEVER trusted.
 *
 * USAGE:
 *
 *   // In a protected Server Component page:
 *   const session = await requireAuthSession('/dashboard');
 *   const tenantState = await resolveServerTenantContext(session.user.id);
 *
 *   if (!tenantState.hasTenant) {
 *     redirect('/onboarding');
 *   }
 *
 *   // tenantState.tenantContext is now available with verified role, status, instituteId
 */

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAuthenticatedSession } from '@coaching-os/auth';
import {
  GetUserMembershipsUseCase,
  ResolveInstituteMembershipUseCase,
  PrismaInstituteMembershipRepository,
  PrismaInstituteRepository,
  type TenantContext,
} from '@coaching-os/identity';
import { sanitizeCallbackUrl } from '../features/auth/utils/sanitize-callback-url';

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * Safe institute display data for passing to client components.
 * Contains only presentation-safe fields; never exposes raw DB internals.
 */
export interface ServerInstituteDisplay {
  name: string;
  slug: string;
  status: string;
}

/**
 * The resolved server-side tenant state.
 *
 * Discriminated union: either the user has no active institute membership,
 * or they have a fully resolved TenantContext with institute display data.
 */
export type ServerTenantState =
  | { hasTenant: false }
  | {
      hasTenant: true;
      tenantContext: TenantContext;
      institute: ServerInstituteDisplay | null;
    };

/**
 * Minimal user presentation data safe to pass to client components.
 * Never pass the full session object to client components.
 */
export interface ServerUserDisplay {
  id: string;
  name: string;
  email: string;
}

// ── Guard Functions ────────────────────────────────────────────────────────────

/**
 * Requires a valid Better Auth session.
 *
 * If no session is present, redirects to /sign-in with a safe callbackUrl.
 * The callbackUrl is sanitized to prevent open redirects.
 *
 * @param callbackPath - The relative path the user was trying to access (e.g. '/dashboard')
 * @returns The resolved Better Auth session (user identity confirmed server-side)
 *
 * @throws Redirect to /sign-in?callbackUrl=<sanitizedPath> if unauthenticated
 */
export async function requireAuthSession(callbackPath: string) {
  const requestHeaders = await headers();
  const session = await getAuthenticatedSession(requestHeaders);

  if (!session || !session.user) {
    // Sanitize the callback path to prevent open redirects even in server-side redirects
    const safeCallback = sanitizeCallbackUrl(callbackPath);
    const redirectTarget = safeCallback
      ? `/sign-in?callbackUrl=${encodeURIComponent(safeCallback)}`
      : '/sign-in';

    redirect(redirectTarget);
  }

  return session;
}

/**
 * Resolves the tenant context for an authenticated user.
 *
 * Uses the canonical domain use-case chain:
 *   userId → GetUserMembershipsUseCase (activeOnly) → ResolveInstituteMembershipUseCase → TenantContext
 *
 * SECURITY: userId comes from the trusted server-side session, never from the request.
 * No HTTP fetch to /api/dashboard/context — direct domain use-case invocation.
 *
 * @param userId - Server-resolved user ID from a verified Better Auth session
 * @returns ServerTenantState discriminated union
 */
export async function resolveServerTenantContext(userId: string): Promise<ServerTenantState> {
  const membershipRepo = new PrismaInstituteMembershipRepository();
  const getUserMembershipsUseCase = new GetUserMembershipsUseCase(membershipRepo);

  // Resolve all active memberships — userId comes from trusted session
  const activeMemberships = await getUserMembershipsUseCase.execute({
    userId,
    authenticatedUserId: userId,
    activeOnly: true,
  });

  if (activeMemberships.length === 0) {
    return { hasTenant: false };
  }

  // Resolve full TenantContext for the first active membership
  const firstMembership = activeMemberships[0];
  const resolveMembershipUseCase = new ResolveInstituteMembershipUseCase(membershipRepo);

  const tenantContext = await resolveMembershipUseCase.execute({
    userId,
    requestedInstituteId: firstMembership.instituteId,
  });

  // Fetch safe institute display data (name, slug, status)
  const instituteRepo = new PrismaInstituteRepository();
  const institute = await instituteRepo.findById(tenantContext.instituteId);

  return {
    hasTenant: true,
    tenantContext,
    institute: institute
      ? {
          name: institute.name,
          slug: institute.slug,
          status: institute.status,
        }
      : null,
  };
}
