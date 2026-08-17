import { AuthenticationError, AuthorizationError } from '@coaching-os/shared';
import type { DashboardReadRepository } from '../../domain/repositories/dashboard-read.repository';
import type { AssistantDashboardDTO } from '../dto/dashboard.dto';
import { getInstituteLocalTodayRange } from '../services/timezone-boundary.service';

export interface GetAssistantDashboardInput {
  instituteId: string;
  authenticatedUserId: string;
  userRole: string;
  referenceDate?: Date;
}

export class GetAssistantDashboardUseCase {
  constructor(private readonly repository: DashboardReadRepository) {}

  public async execute(input: GetAssistantDashboardInput): Promise<AssistantDashboardDTO> {
    if (!input.authenticatedUserId) {
      throw new AuthenticationError('Authentication is required to access the Assistant Dashboard.');
    }

    if (!input.instituteId) {
      throw new AuthorizationError('Tenant context is required to access the Assistant Dashboard.');
    }

    // Role check: Only assistant or owner can view Assistant dashboard
    if (input.userRole !== 'assistant' && input.userRole !== 'owner') {
      throw new AuthorizationError('Assistant role required to access Assistant Dashboard.');
    }

    const refDate = input.referenceDate || new Date();
    const tempRange = getInstituteLocalTodayRange('Asia/Kolkata', refDate);
    const data = await this.repository.getAssistantData(
      input.instituteId,
      input.authenticatedUserId,
      tempRange.todayIso,
      tempRange.startOfDay,
      tempRange.endOfDay,
    );

    const timezone = data.timezone || 'Asia/Kolkata';
    const range = getInstituteLocalTodayRange(timezone, refDate);

    const finalData = timezone !== 'Asia/Kolkata'
      ? await this.repository.getAssistantData(
          input.instituteId,
          input.authenticatedUserId,
          range.todayIso,
          range.startOfDay,
          range.endOfDay,
        )
      : data;

    return {
      instituteId: input.instituteId,
      assistantUserId: input.authenticatedUserId,
      timezone: finalData.timezone,
      todayIso: range.todayIso,
      collection: {
        collectedTodayAmount: finalData.collectedTodayAmount,
        transactionCount: finalData.transactionCount,
        pendingReceiptCount: finalData.pendingReceiptCount,
        targetPath: '/billing',
      },
      admissions: {
        admissionsTodayCount: finalData.admissionsTodayCount,
        pendingEnrollmentsCount: finalData.pendingEnrollmentsCount,
        targetPath: '/enrollments',
      },
      quickActions: [
        {
          id: 'record-payment',
          label: 'Record Payment',
          targetPath: '/billing',
          requiredCapability: 'billing:payment:record',
        },
        {
          id: 'new-admission',
          label: 'New Student Admission',
          targetPath: '/students',
          requiredCapability: 'student:admit',
        },
      ],
    };
  }
}
