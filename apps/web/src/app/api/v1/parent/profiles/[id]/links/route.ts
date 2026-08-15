import { type NextRequest } from 'next/server';
import { generateRequestId } from '@coaching-os/observability';
import {
  PrismaChildProfileRepository,
  PrismaStudentLinkRepository,
  CreateStudentLinkUseCase,
  ListStudentLinksUseCase,
  createStudentLinkSchema,
} from '@coaching-os/identity';
import {
  apiSuccess,
  withParentAuthGuard,
  methodNotAllowed,
} from '../../../../_lib/v1-guard';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = generateRequestId();
  const { id } = await params;

  return withParentAuthGuard(req, requestId, async (parentCtx) => {
    const childProfileRepo = new PrismaChildProfileRepository();
    const studentLinkRepo = new PrismaStudentLinkRepository();

    const useCase = new ListStudentLinksUseCase(childProfileRepo, studentLinkRepo);
    const links = await useCase.execute(parentCtx.parentIdentityId, id);

    return apiSuccess(links, requestId, 200);
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = generateRequestId();
  const { id } = await params;

  return withParentAuthGuard(req, requestId, async (parentCtx) => {
    const rawBody = await req.json().catch(() => ({}));
    const validated = createStudentLinkSchema.parse(rawBody);

    const childProfileRepo = new PrismaChildProfileRepository();
    const studentLinkRepo = new PrismaStudentLinkRepository();

    const useCase = new CreateStudentLinkUseCase(childProfileRepo, studentLinkRepo);
    const link = await useCase.execute(
      parentCtx.parentIdentityId,
      id,
      validated,
    );

    return apiSuccess(link, requestId, 201);
  });
}

export async function PUT() {
  return methodNotAllowed(['GET', 'POST']);
}

export async function DELETE() {
  return methodNotAllowed(['GET', 'POST']);
}

export async function PATCH() {
  return methodNotAllowed(['GET', 'POST']);
}
