import { describe, it, expect, vi } from 'vitest';
import { AuthenticationError, AuthorizationError } from '@coaching-os/shared';
import { GetOwnerDashboardUseCase } from './get-owner-dashboard.use-case';
import { GetTeacherDashboardUseCase } from './get-teacher-dashboard.use-case';
import { GetAssistantDashboardUseCase } from './get-assistant-dashboard.use-case';
import type {
  DashboardReadRepository,
  OwnerDashboardData,
  TeacherDashboardData,
  AssistantDashboardData,
} from '../../domain/repositories/dashboard-read.repository';

class MockDashboardReadRepository implements DashboardReadRepository {
  public mockOwnerData: OwnerDashboardData = {
    instituteName: 'Test Institute',
    timezone: 'Asia/Kolkata',
    sessionsToday: 4,
    sessionsTaken: 3,
    eligibleStudents: 100,
    presentStudents: 90,
    scheduledClassesCount: 4,
    scheduledTestsCount: 1,
    pendingFeeAmount: 50000,
    pendingInvoiceCount: 5,
    overdueStudentCount: 2,
    recentAnnouncements: [
      { id: 'ann-1', title: 'Exam Notice', publishedAt: new Date('2026-08-17T10:00:00Z'), targetScope: 'institute' },
    ],
  };

  public mockTeacherData: TeacherDashboardData = {
    timezone: 'Asia/Kolkata',
    todaySessions: [
      {
        id: 'sess-1',
        batchId: 'batch-1',
        batchName: 'Physics 12',
        subjectName: 'Physics',
        startTime: '10:00',
        endTime: '11:30',
        status: 'scheduled',
        attendanceTaken: false,
      },
    ],
    pendingHomework: [
      { batchId: 'batch-1', batchName: 'Physics 12', subjectName: 'Physics', lastHomeworkDate: null },
    ],
    upcomingTests: [
      { id: 'test-1', batchId: 'batch-1', batchName: 'Physics 12', title: 'Unit Test 1', testDate: new Date('2026-08-18T10:00:00Z'), status: 'scheduled' },
    ],
  };

  public mockAssistantData: AssistantDashboardData = {
    timezone: 'Asia/Kolkata',
    collectedTodayAmount: 15000,
    transactionCount: 3,
    pendingReceiptCount: 1,
    admissionsTodayCount: 2,
    pendingEnrollmentsCount: 1,
  };

  public async getOwnerData(): Promise<OwnerDashboardData> {
    return this.mockOwnerData;
  }

  public async getTeacherData(): Promise<TeacherDashboardData> {
    return this.mockTeacherData;
  }

  public async getAssistantData(): Promise<AssistantDashboardData> {
    return this.mockAssistantData;
  }
}

describe('Dashboard Use Cases', () => {
  const repo = new MockDashboardReadRepository();

  describe('GetOwnerDashboardUseCase', () => {
    const useCase = new GetOwnerDashboardUseCase(repo);

    it('should throw AuthenticationError if unauthenticated', async () => {
      await expect(
        useCase.execute({ instituteId: 'inst-1', authenticatedUserId: '', userRole: 'owner' }),
      ).rejects.toThrow(AuthenticationError);
    });

    it('should throw AuthorizationError if non-owner attempts access', async () => {
      await expect(
        useCase.execute({ instituteId: 'inst-1', authenticatedUserId: 'usr-1', userRole: 'teacher' }),
      ).rejects.toThrow(AuthorizationError);
    });

    it('should compute attendance percentages correctly for owner DTO', async () => {
      const result = await useCase.execute({
        instituteId: 'inst-1',
        authenticatedUserId: 'usr-owner',
        userRole: 'owner',
        referenceDate: new Date('2026-08-17T10:00:00Z'),
      });

      expect(result.instituteId).toBe('inst-1');
      expect(result.attendance.sessionsToday).toBe(4);
      expect(result.attendance.sessionsTaken).toBe(3);
      expect(result.attendance.sessionCompletionPercentage).toBe(75);
      expect(result.attendance.studentAttendancePercentage).toBe(90); // 90 / 100 * 100
      expect(result.fees.pendingAmount).toBe(50000);
      expect(result.recentAnnouncements.length).toBe(1);
    });
  });

  describe('GetTeacherDashboardUseCase', () => {
    const useCase = new GetTeacherDashboardUseCase(repo);

    it('should throw AuthorizationError if non-teacher non-owner attempts access', async () => {
      await expect(
        useCase.execute({ instituteId: 'inst-1', authenticatedUserId: 'usr-1', userRole: 'assistant' }),
      ).rejects.toThrow(AuthorizationError);
    });

    it('should return teacher dashboard DTO with today sessions', async () => {
      const result = await useCase.execute({
        instituteId: 'inst-1',
        authenticatedUserId: 'usr-teacher',
        userRole: 'teacher',
        referenceDate: new Date('2026-08-17T10:00:00Z'),
      });

      expect(result.teacherUserId).toBe('usr-teacher');
      expect(result.todaySessions.length).toBe(1);
      expect(result.todaySessions[0].batchName).toBe('Physics 12');
      expect(result.upcomingTests.length).toBe(1);
    });
  });

  describe('GetAssistantDashboardUseCase', () => {
    const useCase = new GetAssistantDashboardUseCase(repo);

    it('should return assistant dashboard DTO with collection summary', async () => {
      const result = await useCase.execute({
        instituteId: 'inst-1',
        authenticatedUserId: 'usr-assistant',
        userRole: 'assistant',
        referenceDate: new Date('2026-08-17T10:00:00Z'),
      });

      expect(result.assistantUserId).toBe('usr-assistant');
      expect(result.collection.collectedTodayAmount).toBe(15000);
      expect(result.collection.transactionCount).toBe(3);
      expect(result.admissions.admissionsTodayCount).toBe(2);
    });
  });
});
