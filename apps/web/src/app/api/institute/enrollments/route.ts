import { NextResponse, type NextRequest } from 'next/server';
import { getAuthenticatedSession } from '@coaching-os/auth';
import {
  CreateEnrollmentUseCase,
  ListEnrollmentsUseCase,
  GetUserMembershipsUseCase,
  ResolveInstituteMembershipUseCase,
  PrismaEnrollmentRepository,
  PrismaStudentRepository,
  PrismaBatchRepository,
  PrismaInstituteMembershipRepository,
  createEnrollmentSchema,
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

export async function GET(req: NextRequest) {
  const requestId = getOrCreateRequestId(req.headers);

  try {
    const tenantContext = await resolveTenantContext(req);
    const { searchParams } = new URL(req.url);

    const queryInput = {
      studentId: searchParams.get('studentId') ?? undefined,
      batchId: searchParams.get('batchId') ?? undefined,
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
      studentId: parseResult.data.studentId,
      batchId: parseResult.data.batchId,
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

export async function POST(req: NextRequest) {
  const requestId = getOrCreateRequestId(req.headers);

  try {
    const tenantContext = await resolveTenantContext(req);

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      throw new ValidationError('Malformed JSON payload.');
    }

    const parseResult = createEnrollmentSchema.safeParse(rawBody);
    if (!parseResult.success) {
      const fieldErrors = parseResult.error.flatten().fieldErrors;
      throw new ValidationError('Invalid enrollment creation payload.', fieldErrors);
    }

    const enrollmentRepo = new PrismaEnrollmentRepository();
    const studentRepo = new PrismaStudentRepository();
    const batchRepo = new PrismaBatchRepository();

    const useCase = new CreateEnrollmentUseCase(enrollmentRepo, studentRepo, batchRepo);

    const created = await useCase.execute(tenantContext, {
      studentId: parseResult.data.studentId,
      batchId: parseResult.data.batchId,
      status: parseResult.data.status as EnrollmentStatus | undefined,
      enrolledAt: parseResult.data.enrolledAt,
    });

    return NextResponse.json(
      {
        success: true,
        data: created,
      },
      {
        status: 201,
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

export async function PUT() {
  return methodNotAllowedResponse(['GET', 'POST']);
}
export async function PATCH() {
  return methodNotAllowedResponse(['GET', 'POST']);
}
export async function DELETE() {
  return methodNotAllowedResponse(['GET', 'POST']);
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
