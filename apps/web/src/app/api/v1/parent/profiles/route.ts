import { type NextRequest } from 'next/server';
import { generateRequestId } from '@coaching-os/observability';
import {
  PrismaChildProfileRepository,
  CreateChildProfileUseCase,
  ListChildProfilesUseCase,
  createChildProfileSchema,
} from '@coaching-os/identity';
import {
  apiSuccess,
  withParentAuthGuard,
  methodNotAllowed,
} from '../../_lib/v1-guard';

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();

  return withParentAuthGuard(req, requestId, async (parentCtx) => {
    const rawBody = await req.json().catch(() => ({}));
    const validated = createChildProfileSchema.parse(rawBody);

    const repo = new PrismaChildProfileRepository();
    const useCase = new CreateChildProfileUseCase(repo);
    const profile = await useCase.execute(parentCtx.parentIdentityId, validated);

    return apiSuccess(profile, requestId, 201);
  });
}

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();

  return withParentAuthGuard(req, requestId, async (parentCtx) => {
    const repo = new PrismaChildProfileRepository();
    const useCase = new ListChildProfilesUseCase(repo);
    const profiles = await useCase.execute(parentCtx.parentIdentityId);

    return apiSuccess(profiles, requestId, 200);
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
