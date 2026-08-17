import { type NextRequest } from 'next/server';
import { apiSuccess, methodNotAllowed, withV1ReadGuard } from '../../_lib/v1-guard';
import { generateRequestId } from '@coaching-os/observability';
import { AuthorizationError } from '@coaching-os/shared';
import {
  GetOwnerDashboardUseCase,
  PrismaDashboardReadRepository,
} from '@coaching-os/administration';

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();

  return withV1ReadGuard(req, requestId, async (ctx) => {
    if (ctx.role !== 'owner') {
      throw new AuthorizationError('Owner role required to access Owner Dashboard.');
    }

    const repository = new PrismaDashboardReadRepository();
    const useCase = new GetOwnerDashboardUseCase(repository);

    const dto = await useCase.execute({
      instituteId: ctx.instituteId,
      authenticatedUserId: ctx.userId,
      userRole: ctx.role,
    });

    return apiSuccess(dto, requestId);
  });
}

export async function POST() {
  return methodNotAllowed(['GET']);
}

export async function PUT() {
  return methodNotAllowed(['GET']);
}

export async function PATCH() {
  return methodNotAllowed(['GET']);
}

export async function DELETE() {
  return methodNotAllowed(['GET']);
}
