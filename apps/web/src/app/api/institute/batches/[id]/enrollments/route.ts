import { NextResponse, type NextRequest } from 'next/server';
import { getAuthenticatedSession } from '@coaching-os/auth';
import {
  ListEnrollmentsUseCase,
  GetUserMembershipsUseCase,
  ResolveInstituteMembershipUseCase,
  PrismaEnrollmentRepository,
  PrismaBatchRepository,
  PrismaInstituteMembershipRepository,
  batchParamsSchema,
  listEnrollmentsQuerySchema,
  type EnrollmentStatus,
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

async function getBatchId(
  params: { id: string } | Promise<{ id: string }>,
): Promise<string> {
  const resolved = await params;
  const parse = batchParamsSchema.safeParse(resolved);
  if (!parse.success) {
    const fieldErrors = parse.error.flatten().fieldErrors;
    throw new ValidationError('Invalid Batch ID format.', fieldErrors);
  }
  return parse.data.id;
}

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const requestId = getOrCreateRequestId(req.headers);

  try {
    const batchId = await getBatchId(props.params);
    const tenantContext = await resolveTenantContext(req);

    const { searchParams } = new URL(req.url);
    const queryInput = {
      batchId,
      status: searchParams.get('status') ?? undefined,
      page: searchParams.get('page') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
    };

    const parseResult = listEnrollmentsQuerySchema.safeParse(queryInput);
    if (!parseResult.success) {
      const fieldErrors = parseResult.error.flatten().fieldErrors;
      throw new ValidationError('Invalid query parameters.', fieldErrors);
    }

    const enrollmentRepo = new PrismaEnrollmentRepository();
    const batchRepo = new PrismaBatchRepository();
    const useCase = new ListEnrollmentsUseCase(enrollmentRepo, batchRepo);

    const enrollments = await useCase.execute(tenantContext, {
      batchId,
      status: parseResult.data.status as EnrollmentStatus | undefined,
      page: parseResult.data.page,
      limit: parseResult.data.limit,
    });

    return NextResponse.json(
      {
        success: true,
        data: enrollments,
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
