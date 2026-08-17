import { AuthenticationError, AuthorizationError } from '@coaching-os/shared';
import type { DashboardReadRepository } from '../../domain/repositories/dashboard-read.repository';
import type { OwnerDashboardDTO } from '../dto/dashboard.dto';
import { getInstituteLocalTodayRange } from '../services/timezone-boundary.service';

export interface GetOwnerDashboardInput {
  instituteId: string;
  authenticatedUserId: string;
  userRole: string;
  referenceDate?: Date;
}

export class GetOwnerDashboardUseCase {
  constructor(private readonly repository: DashboardReadRepository) {}

  public async execute(input: GetOwnerDashboardInput): Promise<OwnerDashboardDTO> {
    if (!input.authenticatedUserId) {
      throw new AuthenticationError('Authentication is required to access the Owner Dashboard.');
    }

    if (!input.instituteId) {
      throw new AuthorizationError('Tenant context is required to access the Owner Dashboard.');
    }

    // Role check: Only owner (or authorized institute admin) can view Owner dashboard
    if (input.userRole !== 'owner') {
      throw new AuthorizationError('Owner role required to access Owner Dashboard.');
    }

    // 1. Resolve timezone boundaries
    // Preliminary query will get timezone from repo, or default to Asia/Kolkata
    const refDate = input.referenceDate || new Date();
    // Dummy initial call to get timezone
    const tempRange = getInstituteLocalTodayRange('Asia/Kolkata', refDate);
    const data = await this.repository.getOwnerData(
      input.instituteId,
      tempRange.todayIso,
      tempRange.startOfDay,
      tempRange.endOfDay,
    );

    // If institute timezone is different, re-calculate boundaries accurately
    const timezone = data.timezone || 'Asia/Kolkata';
    const range = getInstituteLocalTodayRange(timezone, refDate);

    const finalData = timezone !== 'Asia/Kolkata'
      ? await this.repository.getOwnerData(
          input.instituteId,
          range.todayIso,
          range.startOfDay,
          range.endOfDay,
        )
      : data;

    // 2. Compute percentages safely
    const sessionCompletionPercentage = finalData.sessionsToday > 0
      ? Math.round((finalData.sessionsTaken / finalData.sessionsToday) * 1000) / 10
      : 0;

    const studentAttendancePercentage = finalData.eligibleStudents > 0
      ? Math.round((finalData.presentStudents / finalData.eligibleStudents) * 1000) / 10
      : 0;

    return {
      instituteId: input.instituteId,
      instituteName: finalData.instituteName,
      timezone: finalData.timezone,
      todayIso: range.todayIso,
      attendance: {
        sessionsToday: finalData.sessionsToday,
        sessionsTaken: finalData.sessionsTaken,
        eligibleStudents: finalData.eligibleStudents,
        presentStudents: finalData.presentStudents,
        sessionCompletionPercentage,
        studentAttendancePercentage,
        targetPath: '/academics',
      },
      fees: {
        pendingAmount: finalData.pendingFeeAmount,
        pendingInvoiceCount: finalData.pendingInvoiceCount,
        overdueStudentCount: finalData.overdueStudentCount,
        targetPath: '/billing',
      },
      operational: {
        scheduledClassesCount: finalData.scheduledClassesCount,
        scheduledTestsCount: finalData.scheduledTestsCount,
      },
      recentAnnouncements: finalData.recentAnnouncements.map((a) => ({
        id: a.id,
        title: a.title,
        publishedAt: a.publishedAt ? new Date(a.publishedAt).toISOString() : null,
        targetScope: a.targetScope,
      })),
      quickActions: [
        {
          id: 'add-student',
          label: 'Add Student',
          targetPath: '/students',
          requiredCapability: 'student:admit',
        },
        {
          id: 'record-fee',
          label: 'Record Fee',
          targetPath: '/billing',
          requiredCapability: 'billing:payment:record',
        },
        {
          id: 'take-attendance',
          label: 'Take Attendance',
          targetPath: '/academics',
          requiredCapability: 'academics:attendance:record',
        },
        {
          id: 'create-test',
          label: 'New Test',
          targetPath: '/academics',
          requiredCapability: 'academics:test:create',
        },
      ],
    };
  }
}
