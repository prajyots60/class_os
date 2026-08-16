import { type NextRequest } from 'next/server';
import { generateRequestId } from '@coaching-os/observability';
import { ParentAuthorizationEngine } from '@coaching-os/identity';
import { db } from '@coaching-os/database';
import { NotFoundError } from '@coaching-os/shared';
import {
  apiSuccess,
  withParentAuthGuard,
  methodNotAllowed,
} from '../../../../_lib/v1-guard';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = generateRequestId();
  const { id: studentId } = await params;

  return withParentAuthGuard(req, requestId, async (parentCtx) => {
    const authzEngine = new ParentAuthorizationEngine();
    const authz = await authzEngine.authorizeStudent(parentCtx, studentId);

    if (!authz) {
      throw new NotFoundError(`Student "${studentId}" not found or unauthorized.`);
    }

    // Fetch student & institute details
    const student = await db.student.findFirst({
      where: { id: authz.studentId, instituteId: authz.instituteId },
      include: { institute: true },
    });

    if (!student) {
      throw new NotFoundError(`Student "${studentId}" details not found.`);
    }

    // Find active enrollments to extract batch IDs
    const enrollments = await db.enrollment.findMany({
      where: {
        studentId: authz.studentId,
        instituteId: authz.instituteId,
        status: 'active',
      },
      select: {
        batchId: true,
      },
    });

    const batchIds = enrollments.map((e) => e.batchId);

    // Query published homework ONLY (draft homework is strictly excluded)
    const homeworkRecords = await db.homework.findMany({
      where: {
        instituteId: authz.instituteId,
        batchId: { in: batchIds },
        publishedAt: {
          not: null,
        },
      },
      include: {
        batch: {
          select: {
            id: true,
            name: true,
            subject: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const data = {
      student: {
        id: student.id,
        fullName: `${student.firstName} ${student.lastName}`.trim(),
        admissionNumber: student.admissionNumber,
        instituteId: student.instituteId,
        instituteName: student.institute.name,
      },
      homework: homeworkRecords.map((h) => ({
        id: h.id,
        batchId: h.batchId,
        batchName: h.batch.name,
        subject: h.batch.subject?.name || null,
        title: h.title,
        description: h.description,
        attachmentUrl: h.attachmentUrl,
        publishedAt: h.publishedAt ? h.publishedAt.toISOString() : null,
        createdAt: h.createdAt.toISOString(),
      })),
    };

    return apiSuccess(data, requestId, 200);
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
