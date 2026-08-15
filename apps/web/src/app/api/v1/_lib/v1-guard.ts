import { type NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedSession, requireParentAuth, type ParentAuthContext } from '@coaching-os/auth';
import {
  GetUserMembershipsUseCase,
  ResolveInstituteMembershipUseCase,
  PrismaInstituteMembershipRepository,
  ParentAuthorizationEngine,
  type TenantContext,
  type AuthorizedStudentContext,
} from '@coaching-os/identity';
import { ZodError } from 'zod';
import { AuthenticationError, ValidationError } from '@coaching-os/shared';
import { generateRequestId, toErrorResponse } from '@coaching-os/observability';
import { assertReadRateLimit, assertMutationRateLimit, RateLimitLimitError } from './rate-limiter';

export { type TenantContext };

/**
 * API V1 Response envelope builders — canonical stable shapes per ADR-0015
 */
export function apiSuccess<T>(
  data: T,
  requestId: string,
  status = 200,
  extraHeaders?: Record<string, string>,
): NextResponse {
  return NextResponse.json(
    {
      success: true,
      data,
      meta: { requestId, timestamp: new Date().toISOString() },
    },
    {
      status,
      headers: {
        'x-request-id': requestId,
        'Cache-Control': 'no-store, max-age=0, private',
        ...extraHeaders,
      },
    },
  );
}

export function apiCollection<T>(
  data: T[],
  pagination: {
    cursor: string | null;
    nextCursor: string | null;
    hasMore: boolean;
    pageSize: number;
    total?: number;
  },
  requestId: string,
  status = 200,
): NextResponse {
  return NextResponse.json(
    {
      success: true,
      data,
      pagination,
      meta: { requestId, timestamp: new Date().toISOString() },
    },
    {
      status,
      headers: {
        'x-request-id': requestId,
        'Cache-Control': 'no-store, max-age=0, private',
      },
    },
  );
}

export function methodNotAllowed(allow: string[]): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: 'HTTP method not allowed on this endpoint.',
      },
      meta: { requestId: generateRequestId(), timestamp: new Date().toISOString() },
    },
    {
      status: 405,
      headers: { Allow: allow.join(', ') },
    },
  );
}

/**
 * Resolves the server-authoritative TenantContext from the authenticated session.
 *
 * INVARIANTS:
 *  - Never trusts client-supplied instituteId / userId / role / membershipId.
 *  - Derives all tenant fields from DB-verified session + InstituteMembership lookup.
 *  - Throws AuthenticationError (401) if session is missing/invalid.
 *  - Throws AuthorizationError (403) if no active membership exists.
 */
export async function resolveV1TenantContext(req: NextRequest): Promise<TenantContext> {
  const session = await getAuthenticatedSession(req.headers);
  if (!session || !session.user) {
    throw new AuthenticationError('Authentication is required to access this resource.');
  }

  const userId = session.user.id;
  const membershipRepo = new PrismaInstituteMembershipRepository();
  const getMemberships = new GetUserMembershipsUseCase(membershipRepo);

  const memberships = await getMemberships.execute({
    userId,
    authenticatedUserId: userId,
    activeOnly: true,
  });

  if (memberships.length === 0) {
    throw new AuthenticationError('User does not belong to any active institute.');
  }

  // Server-authoritative: use the first active membership's instituteId
  const primaryMembership = memberships[0];
  const resolveMembership = new ResolveInstituteMembershipUseCase(membershipRepo);

  return resolveMembership.execute({
    userId,
    requestedInstituteId: primaryMembership.instituteId,
  });
}

/**
 * Standard V1 error response handler.
 * Wraps toErrorResponse with ADR-0015 envelope shape.
 * Rate-limit errors receive Retry-After header.
 */
export function handleV1Error(error: unknown, requestId: string): NextResponse {
  if (error instanceof RateLimitLimitError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: 'Rate limit exceeded. Please slow down and try again.',
        },
        meta: { requestId, timestamp: new Date().toISOString() },
      },
      {
        status: 429,
        headers: {
          'x-request-id': requestId,
          'Retry-After': String(error.retryAfterSeconds),
          'Cache-Control': 'no-store',
        },
      },
    );
  }

  if (error instanceof ZodError || (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError')) {
    const issues = (error as ZodError).issues;
    const message = Array.isArray(issues) ? issues.map((e) => e.message).join('; ') : 'Invalid request body payload.';
    return toErrorResponse(new ValidationError(message), requestId) as NextResponse;
  }

  // Delegate to existing observability error handler (strips stack/DB details)
  return toErrorResponse(error, requestId) as NextResponse;
}

/**
 * Wraps a READ route handler with: rate-limit → auth → tenant → handler.
 */
export async function withV1ReadGuard(
  req: NextRequest,
  requestId: string,
  handler: (ctx: TenantContext) => Promise<NextResponse>,
): Promise<NextResponse> {
  try {
    assertReadRateLimit(req);
    const ctx = await resolveV1TenantContext(req);
    assertReadRateLimit(req, ctx.userId);
    return await handler(ctx);
  } catch (err) {
    return handleV1Error(err, requestId);
  }
}

/**
 * Wraps a MUTATION route handler with: rate-limit → auth → tenant → handler.
 */
export async function withV1MutationGuard(
  req: NextRequest,
  requestId: string,
  handler: (ctx: TenantContext) => Promise<NextResponse>,
): Promise<NextResponse> {
  try {
    assertMutationRateLimit(req);
    const ctx = await resolveV1TenantContext(req);
    assertMutationRateLimit(req, ctx.userId);
    return await handler(ctx);
  } catch (err) {
    return handleV1Error(err, requestId);
  }
}

/**
 * Wraps a Parent API route handler with: rate-limit → requireParentAuth → handler.
 */
export async function withParentAuthGuard(
  req: NextRequest,
  requestId: string,
  handler: (ctx: ParentAuthContext) => Promise<NextResponse>,
): Promise<NextResponse> {
  try {
    assertReadRateLimit(req);
    const parentCtx = await requireParentAuth(req.headers);
    assertReadRateLimit(req, parentCtx.userId);
    return await handler(parentCtx);
  } catch (err) {
    return handleV1Error(err, requestId);
  }
}

/**
 * Wraps a Parent Student API route handler with:
 * rate-limit → requireParentAuth → requireStudentAccess (Universal 404 Masking) → handler.
 */
export async function withParentStudentGuard(
  req: NextRequest,
  requestId: string,
  studentId: string,
  handler: (
    parentCtx: ParentAuthContext,
    studentCtx: AuthorizedStudentContext,
  ) => Promise<NextResponse>,
): Promise<NextResponse> {
  try {
    assertReadRateLimit(req);
    const parentCtx = await requireParentAuth(req.headers);
    assertReadRateLimit(req, parentCtx.userId);

    const engine = new ParentAuthorizationEngine();
    const studentCtx = await engine.requireStudentAccess(parentCtx, studentId);

    return await handler(parentCtx, studentCtx);
  } catch (err) {
    return handleV1Error(err, requestId);
  }
}
