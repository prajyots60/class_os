import { type NextRequest } from 'next/server';
import { generateRequestId } from '@coaching-os/observability';
import {
  PrismaChildProfileRepository,
  GetChildProfileUseCase,
  UpdateChildProfileUseCase,
  DeleteChildProfileUseCase,
  updateChildProfileSchema,
} from '@coaching-os/identity';
import {
  apiSuccess,
  withParentAuthGuard,
  methodNotAllowed,
} from '../../../_lib/v1-guard';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = generateRequestId();
  const { id } = await params;

  return withParentAuthGuard(req, requestId, async (parentCtx) => {
    const repo = new PrismaChildProfileRepository();
    const useCase = new GetChildProfileUseCase(repo);
    const profile = await useCase.execute(parentCtx.parentIdentityId, id);

    return apiSuccess(profile, requestId, 200);
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = generateRequestId();
  const { id } = await params;

  return withParentAuthGuard(req, requestId, async (parentCtx) => {
    const rawBody = await req.json().catch(() => ({}));
    const validated = updateChildProfileSchema.parse(rawBody);

    const repo = new PrismaChildProfileRepository();
    const useCase = new UpdateChildProfileUseCase(repo);
    const updated = await useCase.execute(parentCtx.parentIdentityId, id, validated);

    return apiSuccess(updated, requestId, 200);
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = generateRequestId();
  const { id } = await params;

  return withParentAuthGuard(req, requestId, async (parentCtx) => {
    const repo = new PrismaChildProfileRepository();
    const useCase = new DeleteChildProfileUseCase(repo);
    await useCase.execute(parentCtx.parentIdentityId, id);

    return apiSuccess({ deleted: true, id }, requestId, 200);
  });
}

export async function POST() {
  return methodNotAllowed(['GET', 'PATCH', 'DELETE']);
}

export async function PUT() {
  return methodNotAllowed(['GET', 'PATCH', 'DELETE']);
}
