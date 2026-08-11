import { NextResponse, type NextRequest } from 'next/server';
import { getAuthenticatedSession } from '@coaching-os/auth';
import {
  ListParentStudentsUseCase,
  GetUserMembershipsUseCase,
  ResolveInstituteMembershipUseCase,
  PrismaInstituteParentStudentRepository,
  PrismaInstituteParentRepository,
  PrismaInstituteMembershipRepository,
  parentStudentsParamsSchema,
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

async function getParentId(
  params: { parentId: string } | Promise<{ parentId: string }>,
): Promise<string> {
  const resolved = await params;
  const parse = parentStudentsParamsSchema.safeParse(resolved);
  if (!parse.success) {
    const fieldErrors = parse.error.flatten().fieldErrors;
    throw new ValidationError('Invalid Parent ID format.', fieldErrors);
  }
  return parse.data.parentId;
}

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ parentId: string }> },
) {
  const requestId = getOrCreateRequestId(req.headers);

  try {
    const parentId = await getParentId(props.params);
    const tenantContext = await resolveTenantContext(req);

    const relRepo = new PrismaInstituteParentStudentRepository();
    const parentRepo = new PrismaInstituteParentRepository();
    const useCase = new ListParentStudentsUseCase(relRepo, parentRepo);

    const students = await useCase.execute(tenantContext, parentId);

    return NextResponse.json(
      {
        success: true,
        data: students,
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
  return methodNotAllowedResponse(['GET']);
}

export async function PUT() {
  return methodNotAllowedResponse(['GET']);
}

export async function PATCH() {
  return methodNotAllowedResponse(['GET']);
}

export async function DELETE() {
  return methodNotAllowedResponse(['GET']);
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
