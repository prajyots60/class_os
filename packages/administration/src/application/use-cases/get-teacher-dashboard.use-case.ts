import { AuthenticationError, AuthorizationError } from '@coaching-os/shared';
import type { DashboardReadRepository } from '../../domain/repositories/dashboard-read.repository';
import type { TeacherDashboardDTO } from '../dto/dashboard.dto';
import { getInstituteLocalTodayRange } from '../services/timezone-boundary.service';

export interface GetTeacherDashboardInput {
  instituteId: string;
  authenticatedUserId: string;
  userRole: string;
  referenceDate?: Date;
}

export class GetTeacherDashboardUseCase {
  constructor(private readonly repository: DashboardReadRepository) {}

  public async execute(input: GetTeacherDashboardInput): Promise<TeacherDashboardDTO> {
    if (!input.authenticatedUserId) {
      throw new AuthenticationError('Authentication is required to access the Teacher Dashboard.');
    }

    if (!input.instituteId) {
      throw new AuthorizationError('Tenant context is required to access the Teacher Dashboard.');
    }

    // Role check: Only teacher or owner can view Teacher dashboard
    if (input.userRole !== 'teacher' && input.userRole !== 'owner') {
      throw new AuthorizationError('Teacher role required to access Teacher Dashboard.');
    }

    const refDate = input.referenceDate || new Date();
    const tempRange = getInstituteLocalTodayRange('Asia/Kolkata', refDate);
    const data = await this.repository.getTeacherData(
      input.instituteId,
      input.authenticatedUserId,
      tempRange.todayIso,
      tempRange.startOfDay,
      tempRange.endOfDay,
    );

    const timezone = data.timezone || 'Asia/Kolkata';
    const range = getInstituteLocalTodayRange(timezone, refDate);

    const finalData = timezone !== 'Asia/Kolkata'
      ? await this.repository.getTeacherData(
          input.instituteId,
          input.authenticatedUserId,
          range.todayIso,
          range.startOfDay,
          range.endOfDay,
        )
      : data;

    return {
      instituteId: input.instituteId,
      teacherUserId: input.authenticatedUserId,
      timezone: finalData.timezone,
      todayIso: range.todayIso,
      todaySessions: finalData.todaySessions.map((s) => ({
        id: s.id,
        batchId: s.batchId,
        batchName: s.batchName,
        subjectName: s.subjectName,
        startTime: s.startTime,
        endTime: s.endTime,
        status: s.status,
        attendanceTaken: s.attendanceTaken,
      })),
      pendingHomework: finalData.pendingHomework.map((h) => ({
        batchId: h.batchId,
        batchName: h.batchName,
        subjectName: h.subjectName,
        lastHomeworkDate: h.lastHomeworkDate ? new Date(h.lastHomeworkDate).toISOString() : null,
      })),
      upcomingTests: finalData.upcomingTests.map((t) => ({
        id: t.id,
        batchId: t.batchId,
        batchName: t.batchName,
        title: t.title,
        testDate: new Date(t.testDate).toISOString(),
        status: t.status,
      })),
    };
  }
}
