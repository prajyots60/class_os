import { auth } from './auth';
import { db } from '@coaching-os/database';

export interface TenantContext {
  userId: string;
  instituteId: string;
  membershipId?: string;
  role: 'owner' | 'teacher' | 'assistant' | 'parent';
  user: {
    id: string;
    name: string;
    email: string;
    status: string;
  };
}

/**
 * Retrieves the authenticated Better Auth session from request headers.
 */
export async function getAuthenticatedSession(headers: Headers) {
  const session = await auth.api.getSession({
    headers,
  });

  if (!session || !session.user) {
    return null;
  }

  return session;
}

/**
 * Requires a valid authenticated session or throws an Unauthorized error.
 */
export async function requireSession(headers: Headers) {
  const session = await getAuthenticatedSession(headers);
  if (!session) {
    throw new Error('UNAUTHORIZED: Valid authentication session is required.');
  }
  return session;
}

/**
 * Resolves and verifies tenant membership for an authenticated user against an institute.
 * Never trusts raw browser-supplied institute_id without verifying database membership.
 */
export async function requireInstituteMembership(
  headers: Headers,
  requestedInstituteId: string,
): Promise<TenantContext> {
  const session = await requireSession(headers);
  const userId = session.user.id;

  // 1. Fetch user record from database
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      institute: true,
    },
  });

  if (!user || user.status !== 'active') {
    throw new Error('FORBIDDEN: User account is inactive or not found.');
  }

  // 2. Check direct institute assignment (Owner / Teacher / Assistant)
  if (user.instituteId === requestedInstituteId) {
    return {
      userId: user.id,
      instituteId: user.instituteId,
      role: 'owner', // Default institute user role context
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        status: user.status,
      },
    };
  }

  // 3. Check Parent Identity Institute Membership if phone exists
  if (user.phone) {
    const membership = await db.instituteMembership.findFirst({
      where: {
        instituteId: requestedInstituteId,
        parentIdentity: {
          phone: user.phone,
        },
      },
    });

    if (membership) {
      return {
        userId: user.id,
        instituteId: requestedInstituteId,
        membershipId: membership.id,
        role: 'parent',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          status: user.status,
        },
      };
    }
  }

  throw new Error(
    `FORBIDDEN: User ${userId} is not an authorized member of institute ${requestedInstituteId}.`,
  );
}
