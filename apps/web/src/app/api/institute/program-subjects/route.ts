import { NextResponse, type NextRequest } from 'next/server';
import { getAuthenticatedSession } from '@coaching-os/auth';
import {
  CreateProgramSubjectUseCase,
  ListProgramSubjectsByProgramUseCase,
  ListProgramSubjectsBySubjectUseCase,
  GetUserMembershipsUseCase,
  ResolveInstituteMembershipUseCase,
  PrismaProgramSubjectRepository,
  PrismaProgramRepository,
  PrismaSubjectRepository,
  PrismaInstituteMembershipRepository,
  createProgramSubjectSchema,
  toProgramSubjectDTO,
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
    const programId = searchParams.get('programId') ?? undefined;
    const subjectId = searchParams.get('subjectId') ?? undefined;

    const psRepo = new PrismaProgramSubjectRepository();
    const programRepo = new PrismaProgramRepository();
    const subjectRepo = new PrismaSubjectRepository();

    let mappings;

    if (programId) {
      const useCase = new ListProgramSubjectsByProgramUseCase(psRepo, programRepo);
      mappings = await useCase.execute(tenantContext, { programId });
    } else if (subjectId) {
      const useCase = new ListProgramSubjectsBySubjectUseCase(psRepo, subjectRepo);
      mappings = await useCase.execute(tenantContext, { subjectId });
    } else {
      const entities = await psRepo.listByInstituteId(tenantContext.instituteId);
      mappings = entities.map((entity) => toProgramSubjectDTO(entity));
    }

    return NextResponse.json(
      {
        success: true,
        data: mappings,
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

    const parseResult = createProgramSubjectSchema.safeParse(rawBody);
    if (!parseResult.success) {
      const fieldErrors = parseResult.error.flatten().fieldErrors;
      throw new ValidationError('Invalid ProgramSubject mapping payload.', fieldErrors);
    }

    const psRepo = new PrismaProgramSubjectRepository();
    const programRepo = new PrismaProgramRepository();
    const subjectRepo = new PrismaSubjectRepository();
    const useCase = new CreateProgramSubjectUseCase(psRepo, programRepo, subjectRepo);

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
