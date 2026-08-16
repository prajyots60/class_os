import { generateRequestId } from '@coaching-os/observability';
import { type NextRequest } from 'next/server';
import { db } from '@coaching-os/database';
import { NotFoundError } from '@coaching-os/shared';
import { ParentAuthorizationEngine } from '@coaching-os/identity';
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

    // Find active enrollments for authorized student in tenant
    const enrollments = await db.enrollment.findMany({
      where: {
        studentId: authz.studentId,
        instituteId: authz.instituteId,
        status: 'active',
      },
      select: {
        id: true,
        batchId: true,
      },
    });

    const enrollmentIds = enrollments.map((e) => e.id);
    const batchIds = enrollments.map((e) => e.batchId);

    // Query published tests ONLY (draft/scheduled/marks_entered tests are excluded)
    const tests = await db.test.findMany({
      where: {
        instituteId: authz.instituteId,
        batchId: { in: batchIds },
        status: 'published',
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
        marks: {
          where: {
            enrollmentId: { in: enrollmentIds },
          },
        },
      },
      orderBy: {
        scheduledDate: 'desc',
      },
    });

    const assessmentItems = tests.map((t) => {
      const markRecord = t.marks[0];
      const marksObtained = markRecord ? Number(markRecord.marksObtained) : null;
      const maximumMarks = t.maximumMarks;
      const percentage =
        marksObtained !== null && maximumMarks > 0
          ? Math.round((marksObtained / maximumMarks) * 100)
          : null;

      return {
        id: t.id,
        batchId: t.batchId,
        batchName: t.batch.name,
        subject: t.batch.subject?.name || null,
        title: t.title,
        maximumMarks,
        marksObtained,
        percentage,
        scheduledDate: t.scheduledDate ? t.scheduledDate.toISOString() : null,
        status: t.status,
        createdAt: t.createdAt.toISOString(),
      };
    });

    const validPercentages = assessmentItems
      .map((i) => i.percentage)
      .filter((p): p is number => p !== null);

    const averagePercentage =
      validPercentages.length > 0
        ? Math.round(
            validPercentages.reduce((acc, curr) => acc + curr, 0) / validPercentages.length,
          )
        : null;

    const highestPercentage =
      validPercentages.length > 0 ? Math.max(...validPercentages) : null;

    const data = {
      student: {
        id: student.id,
        fullName: `${student.firstName} ${student.lastName}`.trim(),
        admissionNumber: student.admissionNumber,
        instituteId: student.instituteId,
        instituteName: student.institute.name,
      },
      summary: {
        totalAssessments: tests.length,
        averagePercentage,
        highestPercentage,
      },
      assessments: assessmentItems,
    };

    return apiSuccess(data, requestId);
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
