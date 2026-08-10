import { NextResponse, type NextRequest } from 'next/server';
import { getAuthenticatedSession } from '@coaching-os/auth';
import {
  GetUserMembershipsUseCase,
  ResolveInstituteMembershipUseCase,
  PrismaInstituteMembershipRepository,
  PrismaInstituteRepository,
} from '@coaching-os/identity';
import { AuthenticationError } from '@coaching-os/shared';
import { getOrCreateRequestId, toErrorResponse } from '@coaching-os/observability';

export async function GET(req: NextRequest) {
  const requestId = getOrCreateRequestId(req.headers);

  try {
    // 1. Authenticate session — server-controlled identity boundary
    const session = await getAuthenticatedSession(req.headers);
    if (!session || !session.user) {
      throw new AuthenticationError('Valid authentication session is required.');
    }

    const userId = session.user.id;

    // 2. Resolve all active memberships for the authenticated user
    //    SECURITY: userId is derived from the trusted server-side session, never from the request.
    const membershipRepo = new PrismaInstituteMembershipRepository();
    const getUserMembershipsUseCase = new GetUserMembershipsUseCase(membershipRepo);

    const activeMemberships = await getUserMembershipsUseCase.execute({
      userId,
      authenticatedUserId: userId,
      activeOnly: true,
    });

    // 3. No active tenant association — signal client to redirect to onboarding
    if (activeMemberships.length === 0) {
      return NextResponse.json(
        { hasTenant: false },
        {
          status: 200,
          headers: {
            'x-request-id': requestId,
            'Cache-Control': 'no-store, max-age=0',
          },
        },
      );
    }

    // 4. Resolve the first active membership through the canonical TenantContext gateway.
    //    ResolveInstituteMembershipUseCase enforces active membership status check.
    const firstMembership = activeMemberships[0];
    const resolveMembershipUseCase = new ResolveInstituteMembershipUseCase(membershipRepo);

    const tenantContext = await resolveMembershipUseCase.execute({
      userId,
      requestedInstituteId: firstMembership.instituteId,
    });

    // 5. Fetch safe institute display data (name, slug, status) for the dashboard
    const instituteRepo = new PrismaInstituteRepository();
    const institute = await instituteRepo.findById(tenantContext.instituteId);

    return NextResponse.json(
      {
        hasTenant: true,
        tenantContext: {
          userId: tenantContext.userId,
          instituteId: tenantContext.instituteId,
          membershipId: tenantContext.membershipId,
          role: tenantContext.role,
          status: tenantContext.status,
        },
        institute: institute
          ? {
              name: institute.name,
              slug: institute.slug,
              status: institute.status,
            }
          : null,
      },
      {
        status: 200,
        headers: {
          'x-request-id': requestId,
          'Cache-Control': 'no-store, max-age=0',
        },
      },
    );
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}

export async function POST() {
  return methodNotAllowedResponse();
}

export async function PUT() {
  return methodNotAllowedResponse();
}

export async function PATCH() {
  return methodNotAllowedResponse();
}

export async function DELETE() {
  return methodNotAllowedResponse();
}

function methodNotAllowedResponse() {
  return NextResponse.json(
    {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'HTTP method not allowed.',
      },
    },
    {
      status: 405,
      headers: {
        Allow: 'GET',
      },
    },
  );
}
