import { db } from '@coaching-os/database';
import type {
  DashboardReadRepository,
  OwnerDashboardData,
  TeacherDashboardData,
  AssistantDashboardData,
} from '../../domain/repositories/dashboard-read.repository';

export class PrismaDashboardReadRepository implements DashboardReadRepository {
  public async getOwnerData(
    instituteId: string,
    todayIso: string,
    startOfDay: Date,
    endOfDay: Date,
  ): Promise<OwnerDashboardData> {
    const institute = await db.institute.findUnique({
      where: { id: instituteId },
      select: { name: true, timezone: true },
    });

    const instituteName = institute?.name || 'Coaching Institute';
    const timezone = institute?.timezone || 'Asia/Kolkata';

    // 1. Attendance & Sessions for today
    const sessions = await db.batchSession.findMany({
      where: {
        instituteId,
        date: startOfDay,
      },
      select: {
        id: true,
        batchId: true,
        attendanceTaken: true,
      },
    });

    const sessionsToday = sessions.length;
    const sessionsTaken = sessions.filter((s) => s.attendanceTaken).length;

    const batchIdsToday = Array.from(new Set(sessions.map((s) => s.batchId)));

    const eligibleStudents = batchIdsToday.length > 0
      ? await db.enrollment.count({
          where: {
            instituteId,
            batchId: { in: batchIdsToday },
            status: 'active',
          },
        })
      : 0;

    const presentStudents = await db.attendance.count({
      where: {
        instituteId,
        session: {
          date: startOfDay,
        },
        status: 'present',
      },
    });

    // 2. Scheduled tests for today (scheduledDate = startOfDay)
    const scheduledTestsCount = await db.test.count({
      where: {
        instituteId,
        scheduledDate: startOfDay,
      },
    });

    // 3. Pending fees & overdue invoices
    const pendingInvoices = await db.invoice.findMany({
      where: {
        billingPlan: {
          enrollment: {
            instituteId,
          },
        },
        status: { in: ['pending', 'partial'] },
      },
      select: {
        id: true,
        amount: true,
        dueDate: true,
        billingPlan: {
          select: {
            enrollment: {
              select: {
                studentId: true,
              },
            },
          },
        },
        payments: {
          select: {
            amount: true,
          },
        },
      },
    });

    let pendingFeeAmount = 0;
    const overdueStudentIds = new Set<string>();

    for (const inv of pendingInvoices) {
      const invAmount = typeof inv.amount === 'number' ? inv.amount : (inv.amount as any).toNumber();
      const paidAmount = inv.payments.reduce(
        (sum: number, p) =>
          sum + (typeof p.amount === 'number' ? p.amount : (p.amount as any).toNumber()),
        0,
      );
      const balance = Math.max(0, invAmount - paidAmount);
      pendingFeeAmount += balance;

      if (inv.dueDate < startOfDay && balance > 0) {
        overdueStudentIds.add(inv.billingPlan.enrollment.studentId);
      }
    }

    // 4. Recent announcements
    const announcements = await db.announcement.findMany({
      where: {
        instituteId,
        publishedAt: { not: null },
      },
      orderBy: { publishedAt: 'desc' },
      take: 5,
      select: {
        id: true,
        title: true,
        publishedAt: true,
        batchId: true,
      },
    });

    return {
      instituteName,
      timezone,
      sessionsToday,
      sessionsTaken,
      eligibleStudents,
      presentStudents,
      scheduledClassesCount: sessionsToday,
      scheduledTestsCount,
      pendingFeeAmount,
      pendingInvoiceCount: pendingInvoices.length,
      overdueStudentCount: overdueStudentIds.size,
      recentAnnouncements: announcements.map((a) => ({
        id: a.id,
        title: a.title,
        publishedAt: a.publishedAt,
        targetScope: a.batchId ? 'batch' : 'institute',
      })),
    };
  }

  public async getTeacherData(
    instituteId: string,
    teacherUserId: string,
    todayIso: string,
    startOfDay: Date,
    endOfDay: Date,
  ): Promise<TeacherDashboardData> {
    const institute = await db.institute.findUnique({
      where: { id: instituteId },
      select: { timezone: true },
    });
    const timezone = institute?.timezone || 'Asia/Kolkata';

    // 1. Today's sessions for this teacher (either teacherId matches teacherUserId or substituteTeacherId matches teacherUserId)
    const sessions = await db.batchSession.findMany({
      where: {
        instituteId,
        date: startOfDay,
        OR: [
          { batch: { teacherId: teacherUserId } },
          { substituteTeacherId: teacherUserId },
        ],
      },
      select: {
        id: true,
        batchId: true,
        startTime: true,
        endTime: true,
        status: true,
        attendanceTaken: true,
        batch: {
          select: {
            name: true,
            subject: { select: { name: true } },
          },
        },
      },
      orderBy: [{ startTime: 'asc' }],
    });

    // 2. Pending homework check for assigned active batches (running or open)
    const teacherBatches = await db.batch.findMany({
      where: {
        instituteId,
        teacherId: teacherUserId,
        status: { in: ['running', 'open'] },
      },
      select: {
        id: true,
        name: true,
        subject: { select: { name: true } },
        homework: {
          where: { publishedAt: { not: null } },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true },
        },
      },
    });

    const pendingHomework = teacherBatches.map((b) => ({
      batchId: b.id,
      batchName: b.name,
      subjectName: b.subject.name,
      lastHomeworkDate: b.homework[0]?.createdAt || null,
    }));

    // 3. Upcoming tests (next 7 days)
    const nextWeek = new Date(startOfDay.getTime() + 7 * 24 * 60 * 60 * 1000);
    const tests = await db.test.findMany({
      where: {
        instituteId,
        batch: { teacherId: teacherUserId },
        scheduledDate: {
          gt: startOfDay,
          lte: nextWeek,
        },
      },
      select: {
        id: true,
        batchId: true,
        title: true,
        scheduledDate: true,
        status: true,
        batch: { select: { name: true } },
      },
      orderBy: { scheduledDate: 'asc' },
    });

    return {
      timezone,
      todaySessions: sessions.map((s) => ({
        id: s.id,
        batchId: s.batchId,
        batchName: s.batch.name,
        subjectName: s.batch.subject.name,
        startTime: s.startTime,
        endTime: s.endTime,
        status: s.status,
        attendanceTaken: s.attendanceTaken,
      })),
      pendingHomework,
      upcomingTests: tests.map((t) => ({
        id: t.id,
        batchId: t.batchId,
        batchName: t.batch.name,
        title: t.title,
        testDate: t.scheduledDate || startOfDay,
        status: t.status,
      })),
    };
  }

  public async getAssistantData(
    instituteId: string,
    assistantUserId: string,
    todayIso: string,
    startOfDay: Date,
    endOfDay: Date,
  ): Promise<AssistantDashboardData> {
    const institute = await db.institute.findUnique({
      where: { id: instituteId },
      select: { timezone: true },
    });
    const timezone = institute?.timezone || 'Asia/Kolkata';

    // 1. Today's payments & pending receipts
    const todayPayments = await db.payment.findMany({
      where: {
        invoice: {
          billingPlan: {
            enrollment: {
              instituteId,
            },
          },
        },
        receivedOn: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      select: {
        id: true,
        amount: true,
        receipt: { select: { id: true } },
      },
    });

    const collectedTodayAmount = todayPayments.reduce(
      (sum: number, p) =>
        sum + (typeof p.amount === 'number' ? p.amount : (p.amount as any).toNumber()),
      0,
    );
    const transactionCount = todayPayments.length;
    const pendingReceiptCount = todayPayments.filter((p) => !p.receipt).length;

    // 2. Today's admissions & pending enrollments
    const admissionsTodayCount = await db.student.count({
      where: {
        instituteId,
        admissionStatus: 'admitted',
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    const pendingEnrollmentsCount = await db.enrollment.count({
      where: {
        instituteId,
        status: 'pending',
      },
    });

    return {
      timezone,
      collectedTodayAmount,
      transactionCount,
      pendingReceiptCount,
      admissionsTodayCount,
      pendingEnrollmentsCount,
    };
  }
}
