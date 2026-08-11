import { NextResponse, type NextRequest } from 'next/server';
import { getAuthenticatedSession } from '@coaching-os/auth';
import {
  CreateStudentUseCase,
  ListStudentsUseCase,
  GetUserMembershipsUseCase,
  ResolveInstituteMembershipUseCase,
  PrismaStudentRepository,
  PrismaInstituteMembershipRepository,
  createStudentSchema,
  listStudentsQuerySchema,
} from '@coaching-os/identity';
import { AuthenticationError, ValidationError } from '@coaching-os/shared';
import { getOrCreateRequestId, toErrorResponse } from '@coaching-os/observability';

/**
 * Helper to resolve trusted server-side TenantContext for the authenticated session.
 */
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
    const rawQuery = {
      search: searchParams.get('search') ?? undefined,
      status: searchParams.get('status') ?? undefined,
      admissionStatus: searchParams.get('admissionStatus') ?? undefined,
      page: searchParams.get('page') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
    };

    const queryParse = listStudentsQuerySchema.safeParse(rawQuery);
    if (!queryParse.success) {
      throw new ValidationError(
        'Invalid list students query parameters.',
        queryParse.error.flatten().fieldErrors,
      );
    }

    const studentRepo = new PrismaStudentRepository();
    const useCase = new ListStudentsUseCase(studentRepo);

    const students = await useCase.execute(tenantContext, queryParse.data);

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

    const parseResult = createStudentSchema.safeParse(rawBody);
    if (!parseResult.success) {
      const fieldErrors = parseResult.error.flatten().fieldErrors;
      throw new ValidationError('Invalid student creation payload.', fieldErrors);
    }

    const studentRepo = new PrismaStudentRepository();
    const useCase = new CreateStudentUseCase(studentRepo);

    const created = await useCase.execute(tenantContext, parseResult.data);

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
