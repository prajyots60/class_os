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

    // Query attendance records for authorized enrollments
    const attendanceRecords = await db.attendance.findMany({
      where: {
        instituteId: authz.instituteId,
        enrollmentId: { in: enrollmentIds },
      },
      include: {
        session: {
          select: {
            id: true,
            date: true,
            startTime: true,
            endTime: true,
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
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const totalSessions = attendanceRecords.length;
    const presentCount = attendanceRecords.filter((r) => r.status === 'present').length;
    const absentCount = attendanceRecords.filter((r) => r.status === 'absent').length;
    const excusedCount = attendanceRecords.filter((r) => r.status === 'late').length;
    const percentage = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 100;

    const data = {
      student: {
        id: student.id,
        fullName: `${student.firstName} ${student.lastName}`.trim(),
        admissionNumber: student.admissionNumber,
        instituteId: student.instituteId,
        instituteName: student.institute.name,
      },
      summary: {
        totalSessions,
        presentCount,
        absentCount,
        excusedCount,
        percentage,
      },
      records: attendanceRecords.map((r) => ({
        id: r.id,
        sessionId: r.sessionId,
        sessionDate: r.session.date.toISOString(),
        batchName: r.session.batch.name,
        subject: r.session.batch.subject?.name || null,
        status: r.status,
        recordedAt: r.createdAt.toISOString(),
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
