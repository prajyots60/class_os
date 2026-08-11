import { NextResponse, type NextRequest } from 'next/server';
import { getAuthenticatedSession } from '@coaching-os/auth';
import {
  GetInstituteParentUseCase,
  UpdateInstituteParentUseCase,
  ArchiveInstituteParentUseCase,
  GetUserMembershipsUseCase,
  ResolveInstituteMembershipUseCase,
  PrismaInstituteParentRepository,
  PrismaParentIdentityRepository,
  PrismaInstituteMembershipRepository,
  updateInstituteParentSchema,
  instituteParentParamsSchema,
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
  const parse = instituteParentParamsSchema.safeParse(resolved);
  if (!parse.success) {
    const fieldErrors = parse.error.flatten().fieldErrors;
    throw new ValidationError('Invalid Institute Parent ID format.', fieldErrors);
  }
  return parse.data.id;
}

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const requestId = getOrCreateRequestId(req.headers);

  try {
    const id = await getRouteId(props.params);
    const tenantContext = await resolveTenantContext(req);

    const instParentRepo = new PrismaInstituteParentRepository();
    const parentIdentityRepo = new PrismaParentIdentityRepository();
    const useCase = new GetInstituteParentUseCase(instParentRepo, parentIdentityRepo);

    const parent = await useCase.execute(tenantContext, { id });

    return NextResponse.json(
      {
        success: true,
        data: parent,
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

export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const requestId = getOrCreateRequestId(req.headers);

  try {
    const id = await getRouteId(props.params);
    const tenantContext = await resolveTenantContext(req);

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      throw new ValidationError('Malformed JSON payload.');
    }

    const parseResult = updateInstituteParentSchema.safeParse(rawBody);
    if (!parseResult.success) {
      const fieldErrors = parseResult.error.flatten().fieldErrors;
      throw new ValidationError('Invalid institute parent update payload.', fieldErrors);
    }

    const instParentRepo = new PrismaInstituteParentRepository();
    const parentIdentityRepo = new PrismaParentIdentityRepository();
    const useCase = new UpdateInstituteParentUseCase(instParentRepo, parentIdentityRepo);

    const updated = await useCase.execute(tenantContext, {
      id,
      ...parseResult.data,
    });

    return NextResponse.json(
      {
        success: true,
        data: updated,
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

export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const requestId = getOrCreateRequestId(req.headers);

  try {
    const id = await getRouteId(props.params);
    const tenantContext = await resolveTenantContext(req);

    const instParentRepo = new PrismaInstituteParentRepository();
    const parentIdentityRepo = new PrismaParentIdentityRepository();
    const useCase = new ArchiveInstituteParentUseCase(instParentRepo, parentIdentityRepo);

    const archived = await useCase.execute(tenantContext, { id });

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

export async function POST() {
  return methodNotAllowedResponse(['GET', 'PATCH', 'DELETE']);
}

export async function PUT() {
  return methodNotAllowedResponse(['GET', 'PATCH', 'DELETE']);
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
