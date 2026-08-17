/**
 * dashboard-read.repository.ts
 *
 * Framework-independent repository interface for Staff Dashboard read projections.
 */

export interface OwnerDashboardData {
  instituteName: string;
  timezone: string;
  sessionsToday: number;
  sessionsTaken: number;
  eligibleStudents: number;
  presentStudents: number;
  scheduledClassesCount: number;
  scheduledTestsCount: number;
  pendingFeeAmount: number;
  pendingInvoiceCount: number;
  overdueStudentCount: number;
  recentAnnouncements: Array<{
    id: string;
    title: string;
    publishedAt: Date | string | null;
    targetScope: string;
  }>;
}

export interface TeacherDashboardData {
  timezone: string;
  todaySessions: Array<{
    id: string;
    batchId: string;
    batchName: string;
    subjectName: string;
    startTime: string | null;
    endTime: string | null;
    status: string;
    attendanceTaken: boolean;
  }>;
  pendingHomework: Array<{
    batchId: string;
    batchName: string;
    subjectName: string;
    lastHomeworkDate: Date | null;
  }>;
  upcomingTests: Array<{
    id: string;
    batchId: string;
    batchName: string;
    title: string;
    testDate: Date;
    status: string;
  }>;
}

export interface AssistantDashboardData {
  timezone: string;
  collectedTodayAmount: number;
  transactionCount: number;
  pendingReceiptCount: number;
  admissionsTodayCount: number;
  pendingEnrollmentsCount: number;
}

export interface DashboardReadRepository {
  getOwnerData(
    instituteId: string,
    todayIso: string,
    startOfDay: Date,
    endOfDay: Date,
  ): Promise<OwnerDashboardData>;

  getTeacherData(
    instituteId: string,
    teacherUserId: string,
    todayIso: string,
    startOfDay: Date,
    endOfDay: Date,
  ): Promise<TeacherDashboardData>;

  getAssistantData(
    instituteId: string,
    assistantUserId: string,
    todayIso: string,
    startOfDay: Date,
    endOfDay: Date,
  ): Promise<AssistantDashboardData>;
}
