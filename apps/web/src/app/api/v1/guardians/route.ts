/**
 * GET /api/v1/guardians — List guardians (tenant-scoped)
 */
import { type NextRequest } from 'next/server';
import {
  ListInstituteParentsUseCase,
  PrismaInstituteParentRepository,
  PrismaParentIdentityRepository,
  AuthorizationEngine,
  CAPABILITIES,
  type InstituteParentStatus,
} from '@coaching-os/identity';
import { ValidationError } from '@coaching-os/shared';
import { generateRequestId } from '@coaching-os/observability';
import { withV1ReadGuard, apiCollection, methodNotAllowed } from '../_lib/v1-guard';
import { v1ListGuardiansQuerySchema } from '../_lib/v1-validators';

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  return withV1ReadGuard(req, requestId, async (ctx) => {
    AuthorizationEngine.requireCapability(ctx, CAPABILITIES.GUARDIAN_READ);

    const { searchParams } = new URL(req.url);
    const raw = {
      search: searchParams.get('search') ?? undefined,
      status: searchParams.get('status') ?? undefined,
      cursor: searchParams.get('cursor') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
    };

    const parsed = v1ListGuardiansQuerySchema.safeParse(raw);
    if (!parsed.success) {
      throw new ValidationError('Invalid query parameters.', parsed.error.flatten().fieldErrors as Record<string, unknown>);
    }

    const parentRepo = new PrismaInstituteParentRepository();
    const parentIdentityRepo = new PrismaParentIdentityRepository();
    const useCase = new ListInstituteParentsUseCase(parentRepo, parentIdentityRepo);

    const guardians = await useCase.execute(ctx, {
      status: parsed.data.status as InstituteParentStatus | undefined,
      limit: parsed.data.limit,
    });

    const pageSize = parsed.data.limit ?? guardians.length;
    const hasMore = guardians.length === pageSize;
    const lastItem = guardians.length > 0 ? guardians[guardians.length - 1] : null;

    return apiCollection(guardians, {
      cursor: parsed.data.cursor ?? null,
      nextCursor: hasMore && lastItem ? lastItem.id : null,
      hasMore,
      pageSize,
      total: guardians.length,
    }, requestId);
  });
}

export async function POST() { return methodNotAllowed(['GET']); }
export async function PUT() { return methodNotAllowed(['GET']); }
export async function PATCH() { return methodNotAllowed(['GET']); }
export async function DELETE() { return methodNotAllowed(['GET']); }
