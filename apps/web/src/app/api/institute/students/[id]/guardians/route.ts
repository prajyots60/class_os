import { NextResponse, type NextRequest } from 'next/server';
import { getAuthenticatedSession } from '@coaching-os/auth';
import {
  ListStudentGuardiansUseCase,
  CreateInstituteParentStudentUseCase,
  GetUserMembershipsUseCase,
  ResolveInstituteMembershipUseCase,
  PrismaInstituteParentStudentRepository,
  PrismaInstituteParentRepository,
  PrismaStudentRepository,
  PrismaInstituteMembershipRepository,
  studentGuardiansParamsSchema,
  createInstituteParentStudentSchema,
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

async function getStudentId(
  params: { id: string } | Promise<{ id: string }>,
): Promise<string> {
  const resolved = await params;
  const parse = studentGuardiansParamsSchema.safeParse({ studentId: resolved.id });
  if (!parse.success) {
    const fieldErrors = parse.error.flatten().fieldErrors;
    throw new ValidationError('Invalid Student ID format.', fieldErrors);
  }
  return parse.data.studentId;
}

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const requestId = getOrCreateRequestId(req.headers);

  try {
    const studentId = await getStudentId(props.params);
    const tenantContext = await resolveTenantContext(req);

    const relRepo = new PrismaInstituteParentStudentRepository();
    const studentRepo = new PrismaStudentRepository();
    const useCase = new ListStudentGuardiansUseCase(relRepo, studentRepo);

    const guardians = await useCase.execute(tenantContext, studentId);

    return NextResponse.json(
      {
        success: true,
        data: guardians,
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

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const requestId = getOrCreateRequestId(req.headers);

  try {
    const studentId = await getStudentId(props.params);
    const tenantContext = await resolveTenantContext(req);

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      throw new ValidationError('Malformed JSON payload.');
    }

    const parseResult = createInstituteParentStudentSchema.safeParse(rawBody);
    if (!parseResult.success) {
      const fieldErrors = parseResult.error.flatten().fieldErrors;
      throw new ValidationError('Invalid relationship creation payload.', fieldErrors);
    }

    const relRepo = new PrismaInstituteParentStudentRepository();
    const parentRepo = new PrismaInstituteParentRepository();
    const studentRepo = new PrismaStudentRepository();
    const useCase = new CreateInstituteParentStudentUseCase(relRepo, parentRepo, studentRepo);

    const created = await useCase.execute(tenantContext, {
      studentId,
      instituteParentId: parseResult.data.instituteParentId,
      relationshipType: parseResult.data.relationshipType,
      isPrimary: parseResult.data.isPrimary,
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
