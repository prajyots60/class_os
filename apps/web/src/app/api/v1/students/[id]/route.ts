/**
 * GET   /api/v1/students/[id]  — Get single student (tenant-scoped)
 * PATCH /api/v1/students/[id]  — Update student profile (explicit fields only)
 * POST  — 405
 * PUT   — 405
 * DELETE — 405
 */
import { type NextRequest } from 'next/server';
import {
  GetStudentUseCase,
  UpdateStudentUseCase,
  PrismaStudentRepository,
  AuthorizationEngine,
  CAPABILITIES,
} from '@coaching-os/identity';
import { ValidationError } from '@coaching-os/shared';
import { generateRequestId } from '@coaching-os/observability';
import {
  withV1ReadGuard,
  withV1MutationGuard,
  apiSuccess,
  methodNotAllowed,
} from '../../_lib/v1-guard';
import { uuidParamSchema, v1UpdateStudentSchema } from '../../_lib/v1-validators';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  const requestId = generateRequestId();
  return withV1ReadGuard(req, requestId, async (ctx) => {
    AuthorizationEngine.requireCapability(ctx, CAPABILITIES.STUDENT_READ);

    const { id } = await params;
    const paramParse = uuidParamSchema.safeParse({ id });
    if (!paramParse.success) {
      throw new ValidationError('Invalid student ID format.', paramParse.error.flatten().fieldErrors as Record<string, unknown>);
    }

    const repo = new PrismaStudentRepository();
    const useCase = new GetStudentUseCase(repo);

    // Use case enforces instituteId scoping; cross-tenant returns 404 (not 403)
    const student = await useCase.execute(ctx, { id: paramParse.data.id });
    return apiSuccess(student, requestId);
  });
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const requestId = generateRequestId();
  return withV1MutationGuard(req, requestId, async (ctx) => {
    AuthorizationEngine.requireCapability(ctx, CAPABILITIES.STUDENT_UPDATE);

    const { id } = await params;
    const paramParse = uuidParamSchema.safeParse({ id });
    if (!paramParse.success) {
      throw new ValidationError('Invalid student ID format.', paramParse.error.flatten().fieldErrors as Record<string, unknown>);
    }

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      throw new ValidationError('Malformed JSON request body.');
    }

    // Strict validator — rejects status, role, instituteId, admissionNumber, etc.
    const bodyParse = v1UpdateStudentSchema.safeParse(rawBody);
    if (!bodyParse.success) {
      throw new ValidationError('Invalid update payload.', bodyParse.error.flatten().fieldErrors as Record<string, unknown>);
    }

    const repo = new PrismaStudentRepository();
    const useCase = new UpdateStudentUseCase(repo);

    const updated = await useCase.execute(ctx, {
      id: paramParse.data.id,
      ...bodyParse.data,
    });

    return apiSuccess(updated, requestId);
  });
}

export async function POST() { return methodNotAllowed(['GET', 'PATCH']); }
export async function PUT() { return methodNotAllowed(['GET', 'PATCH']); }
export async function DELETE() { return methodNotAllowed(['GET', 'PATCH']); }
