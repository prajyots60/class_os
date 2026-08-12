/**
 * /api/v1/staff — List staff memberships & Invite staff member
 */
import { type NextRequest } from 'next/server';
import {
  ListStaffMembershipsUseCase,
  InviteStaffMemberUseCase,
  PrismaInstituteMembershipRepository,
  AuthorizationEngine,
  CAPABILITIES,
  toStaffMembershipDTO,
} from '@coaching-os/identity';
import { ValidationError } from '@coaching-os/shared';
import { generateRequestId } from '@coaching-os/observability';
import { withV1ReadGuard, withV1MutationGuard, apiCollection, apiSuccess, methodNotAllowed } from '../_lib/v1-guard';
import { v1ListStaffQuerySchema, v1InviteStaffSchema } from '../_lib/v1-validators';

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  return withV1ReadGuard(req, requestId, async (ctx) => {
    AuthorizationEngine.requireCapability(ctx, CAPABILITIES.STAFF_READ);

    const { searchParams } = new URL(req.url);
    const raw = {
      role: searchParams.get('role') ?? undefined,
      status: searchParams.get('status') ?? undefined,
      cursor: searchParams.get('cursor') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
    };

    const parsed = v1ListStaffQuerySchema.safeParse(raw);
    if (!parsed.success) {
      throw new ValidationError('Invalid query parameters.', parsed.error.flatten().fieldErrors as Record<string, unknown>);
    }

    const repo = new PrismaInstituteMembershipRepository();
    const useCase = new ListStaffMembershipsUseCase(repo);

    const members = await useCase.execute({
      instituteId: ctx.instituteId,
      role: parsed.data.role,
      status: parsed.data.status,
      tenantContext: ctx,
    });

    // Map to safe StaffMembershipDTO (strips passwords/secrets)
    const dtos = members.map((m) => toStaffMembershipDTO(m));

    const pageSize = parsed.data.limit;
    const page = dtos.slice(0, pageSize);
    const hasMore = dtos.length > pageSize;
    const lastItem = page.length > 0 ? page[page.length - 1] : null;

    return apiCollection(page, {
      cursor: parsed.data.cursor ?? null,
      nextCursor: hasMore && lastItem ? lastItem.id : null,
      hasMore,
      pageSize,
      total: dtos.length,
    }, requestId);
  });
}

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

    const repo = new PrismaInstituteMembershipRepository();
    const useCase = new InviteStaffMemberUseCase(repo);

    const created = await useCase.execute({
      userId: parsed.data.userId,
      role: parsed.data.role,
      tenantContext: ctx,
    });

    return apiSuccess(toStaffMembershipDTO(created), requestId, 201);
  });
}

export async function PUT() { return methodNotAllowed(['GET', 'POST']); }
export async function PATCH() { return methodNotAllowed(['GET', 'POST']); }
export async function DELETE() { return methodNotAllowed(['GET', 'POST']); }
