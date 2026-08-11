import { NextResponse, type NextRequest } from 'next/server';
import { getAuthenticatedSession } from '@coaching-os/auth';
import {
  GetInstituteSettingsUseCase,
  UpdateInstituteSettingsUseCase,
  GetUserMembershipsUseCase,
  ResolveInstituteMembershipUseCase,
  PrismaInstituteRepository,
  PrismaInstituteMembershipRepository,
  updateInstituteSettingsSchema,
} from '@coaching-os/identity';
import { AuthenticationError, ValidationError } from '@coaching-os/shared';
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

    // 2. Resolve active tenant context server-side
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
    const tenantContext = await resolveMembershipUseCase.execute({
      userId,
      requestedInstituteId: activeMemberships[0].instituteId,
    });

    // 3. Execute application use case with trusted TenantContext
    const instituteRepo = new PrismaInstituteRepository();
    const getSettingsUseCase = new GetInstituteSettingsUseCase(instituteRepo);
    const settings = await getSettingsUseCase.execute({ tenantContext });

    // 4. Return clean DTO response
    return NextResponse.json(
      {
        success: true,
        data: settings,
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

export async function PATCH(req: NextRequest) {
  const requestId = getOrCreateRequestId(req.headers);

  try {
    // 1. Authenticate session — server-controlled identity boundary
    const session = await getAuthenticatedSession(req.headers);
    if (!session || !session.user) {
      throw new AuthenticationError('Valid authentication session is required.');
    }

    // 2. Parse JSON body safely
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      throw new ValidationError('Malformed JSON payload.');
    }

    // 3. Validate client input using updateInstituteSettingsSchema
    const parseResult = updateInstituteSettingsSchema.safeParse(rawBody);
    if (!parseResult.success) {
      const fieldErrors = parseResult.error.flatten().fieldErrors;
      throw new ValidationError('Invalid institute settings update payload.', fieldErrors);
    }

    const userId = session.user.id;

    // 4. Resolve active tenant context server-side
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
    const tenantContext = await resolveMembershipUseCase.execute({
      userId,
      requestedInstituteId: activeMemberships[0].instituteId,
    });

    // 5. Execute update use case with trusted TenantContext
    const instituteRepo = new PrismaInstituteRepository();
    const updateSettingsUseCase = new UpdateInstituteSettingsUseCase(instituteRepo);
    const updatedSettings = await updateSettingsUseCase.execute({
      tenantContext,
      details: parseResult.data,
    });

    // 6. Return persisted settings DTO response
    return NextResponse.json(
      {
        success: true,
        data: updatedSettings,
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
        Allow: 'GET, PATCH',
      },
    },
  );
}
