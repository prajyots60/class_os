import { NextResponse, type NextRequest } from 'next/server';
import { getAuthenticatedSession } from '@coaching-os/auth';
import {
  DeleteProgramSubjectUseCase,
  GetUserMembershipsUseCase,
  ResolveInstituteMembershipUseCase,
  PrismaProgramSubjectRepository,
  PrismaInstituteMembershipRepository,
} from '@coaching-os/identity';
import { AuthenticationError } from '@coaching-os/shared';
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

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ programId: string; subjectId: string }> },
) {
  const requestId = getOrCreateRequestId(req.headers);
  const { programId, subjectId } = await params;

  try {
    const tenantContext = await resolveTenantContext(req);
    const psRepo = new PrismaProgramSubjectRepository();
    const useCase = new DeleteProgramSubjectUseCase(psRepo);

    await useCase.execute(tenantContext, { programId, subjectId });

    return NextResponse.json(
      {
        success: true,
        message: 'ProgramSubject mapping successfully deleted.',
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
