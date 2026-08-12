/**
 * POST /api/v1/staff/invite — Explicit endpoint to invite a new staff member.
 */
import { type NextRequest } from 'next/server';
import {
  InviteStaffMemberUseCase,
  PrismaInstituteMembershipRepository,
  toStaffMembershipDTO,
} from '@coaching-os/identity';
import { db } from '@coaching-os/database';
import { ValidationError, NotFoundError } from '@coaching-os/shared';
import { generateRequestId } from '@coaching-os/observability';
import { withV1MutationGuard, apiSuccess, methodNotAllowed } from '../../_lib/v1-guard';
import { v1InviteStaffSchema } from '../../_lib/v1-validators';

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  return withV1MutationGuard(req, requestId, async (ctx) => {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new ValidationError('Malformed JSON request body.');
    }

    const parsed = v1InviteStaffSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError('Validation failed for staff invitation payload.', parsed.error.flatten().fieldErrors as Record<string, unknown>);
    }

    let targetUserId = parsed.data.userId;

    if (!targetUserId && parsed.data.email) {
      const targetUser = await db.user.findUnique({
        where: { email: parsed.data.email.toLowerCase().trim() },
      });
      if (!targetUser) {
        throw new NotFoundError(`No registered user found with email '${parsed.data.email}'. The staff member must register an account first.`);
      }
      targetUserId = targetUser.id;
    } else if (parsed.data.email && targetUserId) {
      const targetUser = await db.user.findUnique({
        where: { email: parsed.data.email.toLowerCase().trim() },
      });
      if (!targetUser) {
        throw new NotFoundError(`No registered user found with email '${parsed.data.email}'. The staff member must register an account first.`);
      }
      targetUserId = targetUser.id;
    }

    if (!targetUserId) {
      throw new ValidationError('User identifier could not be resolved.');
    }

    const repo = new PrismaInstituteMembershipRepository();
    const useCase = new InviteStaffMemberUseCase(repo);

    const created = await useCase.execute({
      userId: targetUserId,
      role: parsed.data.role,
      tenantContext: ctx,
    });

    return apiSuccess(toStaffMembershipDTO(created), requestId, 201);
  });
}

export async function GET() { return methodNotAllowed(['POST']); }
export async function PUT() { return methodNotAllowed(['POST']); }
export async function PATCH() { return methodNotAllowed(['POST']); }
export async function DELETE() { return methodNotAllowed(['POST']); }
