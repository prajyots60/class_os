import { db } from '@coaching-os/database';
import type {
  ReportsReadRepository,
  AttendanceReportFilters,
  FeeReportFilters,
} from '../../domain/repositories/reports-read.repository';
import type {
  AttendanceReportResponseDTO,
  AttendanceReportRowDTO,
  FeeCollectionReportResponseDTO,
  FeeCollectionReportRowDTO,
} from '../../application/dto/reports.dto';

export class PrismaReportsReadRepository implements ReportsReadRepository {
  public async getAttendanceReport(filters: AttendanceReportFilters): Promise<AttendanceReportResponseDTO> {
    const {
      instituteId,
      fromIso,
      toIso,
      batchId,
      subjectId,
      teacherId,
      teacherIdScope,
      search,
      page = 1,
      pageSize = 25,
      sortBy = 'date',
      sortOrder = 'asc',
    } = filters;

    const fromDate = new Date(fromIso);
    const toDate = new Date(toIso);

    // Build Prisma query condition
    const whereCondition: Record<string, unknown> = {
      instituteId,
      date: {
        gte: fromDate,
        lte: toDate,
      },
    };

    if (batchId) whereCondition.batchId = batchId;

    const effectiveTeacherId = teacherId || teacherIdScope;
    if (effectiveTeacherId) {
      whereCondition.batch = { teacherId: effectiveTeacherId };
    }

    if (subjectId) {
      whereCondition.batch = {
        ...(whereCondition.batch as Record<string, unknown> || {}),
        subjectId,
      };
    }

    if (search) {
      whereCondition.batch = {
        ...(whereCondition.batch as Record<string, unknown> || {}),
        name: { contains: search, mode: 'insensitive' },
      };
    }

    // 1. Fetch total count of sessions matching criteria
    const totalSessions = await db.batchSession.count({ where: whereCondition as any });

    // 2. Fetch all matching sessions in range to compute overall summary metrics
    const summarySessions = await db.batchSession.findMany({
      where: whereCondition as any,
      select: {
        id: true,
        status: true,
        attendance: {
          select: {
            status: true,
          },
        },
      },
    });

    let completedSessions = 0;
    let pendingSessions = 0;
    let presentCount = 0;
    let absentCount = 0;

    summarySessions.forEach((sess) => {
      if (sess.status === 'completed') completedSessions++;
      if (sess.status === 'scheduled') pendingSessions++;

      sess.attendance.forEach((att) => {
        if (att.status === 'present') presentCount++;
        if (att.status === 'absent') absentCount++;
      });
    });

    const eligibleRecords = presentCount + absentCount;
    const attendancePercentage = eligibleRecords > 0 ? Math.round((presentCount / eligibleRecords) * 100) : 0;

    // 3. Paginated rows fetch
    const skip = (page - 1) * pageSize;
    const orderDirection = sortOrder === 'desc' ? 'desc' : 'asc';
    let orderByClause: Record<string, unknown> = { date: orderDirection };
    if (sortBy === 'status') {
      orderByClause = { status: orderDirection };
    }

    const sessionRows = await db.batchSession.findMany({
      where: whereCondition as any,
      skip,
      take: pageSize,
      orderBy: orderByClause as any,
      select: {
        id: true,
        date: true,
        batchId: true,
        status: true,
        batch: {
          select: {
            name: true,
            code: true,
            teacherId: true,
            subject: { select: { name: true } },
          },
        },
        attendance: {
          select: {
            status: true,
          },
        },
      },
    });

    const rows: AttendanceReportRowDTO[] = sessionRows.map((sess: any) => {
      let rowPresent = 0;
      let rowAbsent = 0;

      (sess.attendance || []).forEach((att: any) => {
        if (att.status === 'present') rowPresent++;
        if (att.status === 'absent') rowAbsent++;
      });

      const rowEligible = rowPresent + rowAbsent;
      const rowPct = rowEligible > 0 ? Math.round((rowPresent / rowEligible) * 100) : 0;

      return {
        id: sess.id,
        dateIso: new Date(sess.date).toISOString().split('T')[0],
        batchId: sess.batchId,
        batchName: sess.batch?.name || 'Batch',
        batchCode: sess.batch?.code || '',
        subjectName: sess.batch?.subject?.name || '—',
        teacherName: sess.batch?.teacherId ? 'Faculty Teacher' : 'Unassigned',
        eligibleCount: rowEligible,
        presentCount: rowPresent,
        absentCount: rowAbsent,
        attendancePercentage: rowPct,
        status: sess.status,
      };
    });

    const totalPages = Math.ceil(totalSessions / pageSize) || 1;

    return {
      summary: {
        totalSessions,
        completedSessions,
        pendingSessions,
        eligibleRecords,
        presentCount,
        absentCount,
        attendancePercentage,
      },
      data: rows,
      meta: {
        total: totalSessions,
        page,
        pageSize,
        totalPages,
      },
    };
  }

  public async getFeeCollectionReport(filters: FeeReportFilters): Promise<FeeCollectionReportResponseDTO> {
    const {
      instituteId,
      fromIso,
      toIso,
      paymentMode,
      search,
      page = 1,
      pageSize = 25,
      sortOrder = 'desc',
    } = filters;

    const fromDate = new Date(fromIso);
    const toDate = new Date(toIso);

    // 1. Fetch institute billing plans & invoices for explicit tenant scoping
    const billingPlans = await db.billingPlan.findMany({
      where: { enrollment: { instituteId } },
      select: { id: true },
    });
    const billingPlanIds = billingPlans.map((bp) => bp.id);

    const invoices = await db.invoice.findMany({
      where: { billingPlanId: { in: billingPlanIds } },
      select: { id: true },
    });
    const invoiceIds = invoices.map((inv) => inv.id);

    const whereCondition: Record<string, unknown> = {
      invoiceId: { in: invoiceIds },
      receivedOn: {
        gte: fromDate,
        lte: toDate,
      },
    };

    if (paymentMode) {
      whereCondition.paymentMode = paymentMode;
    }

    if (search) {
      whereCondition.invoice = {
        billingPlan: {
          enrollment: {
            student: {
              OR: [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { admissionNumber: { contains: search, mode: 'insensitive' } },
              ],
            },
          },
        },
      };
    }

    // 2. Total matching payments count
    const totalPayments = await db.payment.count({ where: whereCondition as any });

    // 3. Aggregate metrics across range
    const allPayments = await db.payment.findMany({
      where: whereCondition as any,
      select: {
        amount: true,
        paymentMode: true,
      },
    });

    let totalCollectedAmount = 0;
    const paymentMethodBreakdown = { cash: 0, upi: 0, bank_transfer: 0 };

    allPayments.forEach((pay: any) => {
      const amt = Number(pay.amount || 0);
      totalCollectedAmount += amt;
      if (pay.paymentMode === 'cash') paymentMethodBreakdown.cash += amt;
      else if (pay.paymentMode === 'upi') paymentMethodBreakdown.upi += amt;
      else if (pay.paymentMode === 'bank_transfer') paymentMethodBreakdown.bank_transfer += amt;
    });

    // Compute pending/outstanding invoice total in institute
    const pendingInvoices = await db.invoice.findMany({
      where: {
        billingPlanId: { in: billingPlanIds },
        status: { in: ['pending', 'partial'] },
      },
      select: {
        amount: true,
        payments: { select: { amount: true } },
      },
    });

    let pendingInvoiceAmount = 0;
    pendingInvoices.forEach((inv: any) => {
      const totalPaid = (inv.payments || []).reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
      const outstanding = Number(inv.amount || 0) - totalPaid;
      if (outstanding > 0) pendingInvoiceAmount += outstanding;
    });

    // 4. Paginated payment rows fetch
    const skip = (page - 1) * pageSize;
    const orderDirection = sortOrder === 'asc' ? 'asc' : 'desc';

    const paymentRows = await db.payment.findMany({
      where: whereCondition as any,
      skip,
      take: pageSize,
      orderBy: { receivedOn: orderDirection },
      select: {
        id: true,
        receivedOn: true,
        amount: true,
        paymentMode: true,
        invoice: {
          select: {
            id: true,
            billingPlan: {
              select: {
                enrollment: {
                  select: {
                    student: {
                      select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        admissionNumber: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const rows: FeeCollectionReportRowDTO[] = paymentRows.map((pay: any) => {
      const student = pay.invoice?.billingPlan?.enrollment?.student;
      const studentName = student ? `${student.firstName} ${student.lastName}`.trim() : 'Student';

      return {
        id: pay.id,
        receivedOnIso: new Date(pay.receivedOn).toISOString().split('T')[0],
        studentId: student?.id || '',
        studentName,
        admissionNumber: student?.admissionNumber || '',
        invoiceId: pay.invoice?.id || '',
        invoiceNumber: pay.invoice?.id ? `INV-${pay.invoice.id.slice(0, 8).toUpperCase()}` : 'INV-001',
        amount: Number(pay.amount || 0),
        paymentMode: pay.paymentMode,
        receiptNumber: pay.id ? `REC-${pay.id.slice(0, 8).toUpperCase()}` : null,
      };
    });

    const totalPages = Math.ceil(totalPayments / pageSize) || 1;

    return {
      summary: {
        totalCollectedAmount,
        transactionCount: totalPayments,
        pendingInvoiceAmount,
        paymentMethodBreakdown,
      },
      data: rows,
      meta: {
        total: totalPayments,
        page,
        pageSize,
        totalPages,
      },
    };
  }
}
