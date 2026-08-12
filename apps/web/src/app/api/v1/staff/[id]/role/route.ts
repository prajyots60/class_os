/**
 * PATCH /api/v1/staff/[id]/role — Update staff member role.
 */
import { type NextRequest } from 'next/server';
import {
  UpdateStaffRoleUseCase,
  PrismaInstituteMembershipRepository,
  toStaffMembershipDTO,
} from '@coaching-os/identity';
import { ValidationError } from '@coaching-os/shared';
import { generateRequestId } from '@coaching-os/observability';
import { withV1MutationGuard, apiSuccess, methodNotAllowed } from '../../../_lib/v1-guard';
import { staffParamSchema, v1UpdateStaffRoleSchema } from '../../../_lib/v1-validators';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const requestId = generateRequestId();
  return withV1MutationGuard(req, requestId, async (ctx) => {
    const { id } = await params;
    const paramParse = staffParamSchema.safeParse({ id });
    if (!paramParse.success) {
      throw new ValidationError('Invalid staff membership ID format.', paramParse.error.flatten().fieldErrors as Record<string, unknown>);
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new ValidationError('Malformed JSON request body.');
    }

    const parsed = v1UpdateStaffRoleSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError('Validation failed for role update payload.', parsed.error.flatten().fieldErrors as Record<string, unknown>);
    }

    const repo = new PrismaInstituteMembershipRepository();
    const useCase = new UpdateStaffRoleUseCase(repo);

    const updated = await useCase.execute({
      id: paramParse.data.id,
      role: parsed.data.role,
      tenantContext: ctx,
    });

    return apiSuccess(toStaffMembershipDTO(updated), requestId);
  });
}

export async function GET() { return methodNotAllowed(['PATCH']); }
export async function POST() { return methodNotAllowed(['PATCH']); }
export async function PUT() { return methodNotAllowed(['PATCH']); }
export async function DELETE() { return methodNotAllowed(['PATCH']); }
