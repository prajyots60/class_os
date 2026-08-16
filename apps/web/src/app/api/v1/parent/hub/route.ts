import { type NextRequest } from 'next/server';
import { generateRequestId } from '@coaching-os/observability';
import { GetParentHubUseCase } from '@coaching-os/identity';
import {
  apiSuccess,
  withParentAuthGuard,
  methodNotAllowed,
} from '../../_lib/v1-guard';

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();

  return withParentAuthGuard(req, requestId, async (parentCtx) => {
    const useCase = new GetParentHubUseCase();
    const hub = await useCase.execute(parentCtx.parentIdentityId);

    return apiSuccess(hub, requestId, 200);
  });
}

export async function POST() {
  return methodNotAllowed(['GET']);
}

export async function PUT() {
  return methodNotAllowed(['GET']);
}

export async function DELETE() {
  return methodNotAllowed(['GET']);
}

export async function PATCH() {
  return methodNotAllowed(['GET']);
}
