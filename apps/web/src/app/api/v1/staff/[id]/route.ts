/**
 * /api/v1/staff/[id] — Get or remove a staff membership
 */
import { type NextRequest } from 'next/server';
import {
  GetStaffMembershipUseCase,
  RemoveStaffMemberUseCase,
  PrismaInstituteMembershipRepository,
  AuthorizationEngine,
  CAPABILITIES,
  toStaffMembershipDTO,
} from '@coaching-os/identity';
import { ValidationError } from '@coaching-os/shared';
import { generateRequestId } from '@coaching-os/observability';
import { withV1ReadGuard, withV1MutationGuard, apiSuccess, methodNotAllowed } from '../../_lib/v1-guard';
import { staffParamSchema } from '../../_lib/v1-validators';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  const requestId = generateRequestId();
  return withV1ReadGuard(req, requestId, async (ctx) => {
    AuthorizationEngine.requireCapability(ctx, CAPABILITIES.STAFF_READ);

    const { id } = await params;
    const paramParse = staffParamSchema.safeParse({ id });
    if (!paramParse.success) {
      throw new ValidationError('Invalid staff membership ID format.', paramParse.error.flatten().fieldErrors as Record<string, unknown>);
    }

    const repo = new PrismaInstituteMembershipRepository();
    const useCase = new GetStaffMembershipUseCase(repo);

    const membership = await useCase.execute({
      id: paramParse.data.id,
      tenantContext: ctx,
    });

    return apiSuccess(toStaffMembershipDTO(membership), requestId);
  });
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const requestId = generateRequestId();
  return withV1MutationGuard(req, requestId, async (ctx) => {
    const { id } = await params;
    const paramParse = staffParamSchema.safeParse({ id });
    if (!paramParse.success) {
      throw new ValidationError('Invalid staff membership ID format.', paramParse.error.flatten().fieldErrors as Record<string, unknown>);
    }

    const repo = new PrismaInstituteMembershipRepository();
    const useCase = new RemoveStaffMemberUseCase(repo);

    await useCase.execute({
      id: paramParse.data.id,
      tenantContext: ctx,
    });

    return apiSuccess({ message: 'Staff membership removed successfully.' }, requestId, 200);
  });
}

export async function POST() { return methodNotAllowed(['GET', 'DELETE']); }
export async function PUT() { return methodNotAllowed(['GET', 'DELETE']); }
export async function PATCH() { return methodNotAllowed(['GET', 'DELETE']); }
