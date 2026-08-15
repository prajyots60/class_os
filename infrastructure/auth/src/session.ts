import crypto from 'node:crypto';
import { auth } from './auth';
import { db } from '@coaching-os/database';
import { serverConfig } from '@coaching-os/config';
import { AuthenticationError, AuthorizationError } from '@coaching-os/shared';
import {
  PrismaParentIdentityRepository,
  ResolveParentIdentityForUserUseCase,
  type ParentIdentityDTO,
} from '@coaching-os/identity';

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

export interface AuthenticatedParentContext {
  userId: string;
  parentIdentityId: string;
  parentIdentity: ParentIdentityDTO;
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
    throw new AuthenticationError('UNAUTHORIZED: Valid authentication session is required.');
  }
  return session;
}

/**
 * Resolves the authenticated parent identity for a request.
 * Returns null if unauthenticated or no parent identity is associated.
 */
export async function resolveAuthenticatedParentIdentity(
  headers: Headers,
  options?: { autoCreateIfMissing?: boolean },
): Promise<AuthenticatedParentContext | null> {
  const session = await getAuthenticatedSession(headers);
  if (!session || !session.user) {
    return null;
  }

  const repo = new PrismaParentIdentityRepository();
  const resolveUseCase = new ResolveParentIdentityForUserUseCase(repo);

  const parentDTO = await resolveUseCase.execute({
    userId: session.user.id,
    autoCreateIfMissing: options?.autoCreateIfMissing ?? false,
  });

  if (!parentDTO) {
    return null;
  }

  if (parentDTO.status === 'suspended') {
    throw new AuthenticationError('ACCOUNT_SUSPENDED: Parent identity is suspended.');
  }

  if (parentDTO.status === 'deactivated') {
    throw new AuthenticationError('UNAUTHENTICATED: Parent identity is deactivated.');
  }

  return {
    userId: session.user.id,
    parentIdentityId: parentDTO.id,
    parentIdentity: parentDTO,
  };
}

/**
 * Requires an authenticated ParentIdentity for a request.
 * Throws AuthenticationError if unauthenticated or deactivated.
 * Throws AuthorizationError if user has no linked ParentIdentity.
 */
export async function requireParentIdentity(
  headers: Headers,
  options?: { autoCreateIfMissing?: boolean },
): Promise<AuthenticatedParentContext> {
  const session = await getAuthenticatedSession(headers);
  if (!session || !session.user) {
    throw new AuthenticationError('UNAUTHENTICATED: Valid authentication session is required.');
  }

  const result = await resolveAuthenticatedParentIdentity(headers, options);
  if (!result) {
    throw new AuthorizationError(
      'PARENT_IDENTITY_REQUIRED: Authenticated user has no linked ParentIdentity.',
    );
  }

  return result;
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
    throw new AuthorizationError('FORBIDDEN: User account is inactive or not found.');
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

  // 3. Check Parent Identity Institute Membership
  const parentId = user.parentIdentityId;
  let membership = null;
  if (parentId) {
    membership = await db.instituteMembership.findFirst({
      where: {
        instituteId: requestedInstituteId,
        parentIdentityId: parentId,
      },
    });
  } else if (user.phone) {
    membership = await db.instituteMembership.findFirst({
      where: {
        instituteId: requestedInstituteId,
        parentIdentity: {
          phone: user.phone,
        },
      },
    });
  }

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

  throw new AuthorizationError(
    'FORBIDDEN: User does not possess an active membership for the requested institute.',
  );
}

/**
 * Signs a session token with BETTER_AUTH_SECRET for Better Auth session cookies.
 */
export function signSessionToken(token: string): string {
  const secret = serverConfig.BETTER_AUTH_SECRET;
  const hmac = crypto.createHmac('sha256', secret).update(token).digest('base64');
  return `${token}.${hmac}`;
}
