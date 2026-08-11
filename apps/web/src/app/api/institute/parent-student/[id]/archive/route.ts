import { NextResponse, type NextRequest } from 'next/server';
import { getAuthenticatedSession } from '@coaching-os/auth';
import {
  ArchiveInstituteParentStudentUseCase,
  GetUserMembershipsUseCase,
  ResolveInstituteMembershipUseCase,
  PrismaInstituteParentStudentRepository,
  PrismaInstituteMembershipRepository,
  instituteParentStudentParamsSchema,
} from '@coaching-os/identity';
import { AuthenticationError, ValidationError } from '@coaching-os/shared';
import { getOrCreateRequestId, toErrorResponse } from '@coaching-os/observability';

async function resolveTenantContext(req: NextRequest) {
  const session = await getAuthenticatedSession(req.headers);
  if (!session || !session.user) {
    throw new AuthenticationError('Valid authentication session is required.');
  }

  const userId = session.user.id;
  const membershipRepo = new PrismaInstituteMembershipRepository();
  const getUserMembershipsUseCase = new GetUserMembershipsUseCase(membershipRepo);

  const activeMemberships = await getUserMembershipsUseCase.execute({
    userId,
    authenticatedUserId: userId,
    activeOnly: true,
  });

  if (activeMemberships.length === 0) {
    throw new AuthenticationError('User does not belong to any active institute tenant.');
  }

  const resolveMembershipUseCase = new ResolveInstituteMembershipUseCase(membershipRepo);
  return resolveMembershipUseCase.execute({
    userId,
    requestedInstituteId: activeMemberships[0].instituteId,
  });
}

async function getRouteId(
  params: { id: string } | Promise<{ id: string }>,
): Promise<string> {
  const resolved = await params;
  const parse = instituteParentStudentParamsSchema.safeParse(resolved);
  if (!parse.success) {
    const fieldErrors = parse.error.flatten().fieldErrors;
    throw new ValidationError('Invalid Relationship ID format.', fieldErrors);
  }
  return parse.data.id;
}

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const requestId = getOrCreateRequestId(req.headers);

  try {
    const id = await getRouteId(props.params);
    const tenantContext = await resolveTenantContext(req);

    const relRepo = new PrismaInstituteParentStudentRepository();
    const useCase = new ArchiveInstituteParentStudentUseCase(relRepo);

    const archived = await useCase.execute(tenantContext, id);

    return NextResponse.json(
      {
        success: true,
        data: archived,
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

export async function GET() {
  return methodNotAllowedResponse(['POST']);
}

export async function PUT() {
  return methodNotAllowedResponse(['POST']);
}

export async function PATCH() {
  return methodNotAllowedResponse(['POST']);
}

export async function DELETE() {
  return methodNotAllowedResponse(['POST']);
}

function methodNotAllowedResponse(allowedMethods: string[]) {
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
        Allow: allowedMethods.join(', '),
      },
    },
  );
}
