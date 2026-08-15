import { type NextRequest } from 'next/server';
import { generateRequestId } from '@coaching-os/observability';
import {
  PrismaChildProfileRepository,
  PrismaStudentLinkRepository,
  RemoveStudentLinkUseCase,
} from '@coaching-os/identity';
import {
  apiSuccess,
  withParentAuthGuard,
  methodNotAllowed,
} from '../../../../../_lib/v1-guard';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; linkId: string }> },
) {
  const requestId = generateRequestId();
  const { id, linkId } = await params;

  return withParentAuthGuard(req, requestId, async (parentCtx) => {
    const childProfileRepo = new PrismaChildProfileRepository();
    const studentLinkRepo = new PrismaStudentLinkRepository();

    const useCase = new RemoveStudentLinkUseCase(
      childProfileRepo,
      studentLinkRepo,
    );
    await useCase.execute(parentCtx.parentIdentityId, id, linkId);

    return apiSuccess({ deleted: true, linkId }, requestId, 200);
  });
}

export async function GET() {
  return methodNotAllowed(['DELETE']);
}

export async function POST() {
  return methodNotAllowed(['DELETE']);
}

export async function PUT() {
  return methodNotAllowed(['DELETE']);
}

export async function PATCH() {
  return methodNotAllowed(['DELETE']);
}
