/**
 * dashboard.dto.ts
 *
 * Strongly typed DTO contracts for Phase 6 Staff Dashboards.
 *
 * INVARIANTS:
 * - Exposed DTOs contain ONLY serializable primitives (strings, numbers, booleans, arrays, plain objects).
 * - Zero Prisma model objects or domain entity instances.
 * - Zero sensitive credentials or internal DB metadata exposed.
 */

export interface OwnerAttendanceSummaryDTO {
  sessionsToday: number;
  sessionsTaken: number;
  eligibleStudents: number;
  presentStudents: number;
  sessionCompletionPercentage: number;
  studentAttendancePercentage: number;
  targetPath: string;
}

export interface OwnerPendingFeeSummaryDTO {
  pendingAmount: number;
  pendingInvoiceCount: number;
  overdueStudentCount: number;
  targetPath: string;
}

export interface OwnerOperationalSummaryDTO {
  scheduledClassesCount: number;
  scheduledTestsCount: number;
}

export interface OwnerAnnouncementDTO {
  id: string;
  title: string;
  publishedAt: string | null;
  targetScope: string;
}

export interface OwnerQuickActionDTO {
  id: string;
  label: string;
  targetPath: string;
  requiredCapability: string;
}

export interface OwnerDashboardDTO {
  instituteId: string;
  instituteName: string;
  timezone: string;
  todayIso: string;
  attendance: OwnerAttendanceSummaryDTO;
  fees: OwnerPendingFeeSummaryDTO;
  operational: OwnerOperationalSummaryDTO;
  recentAnnouncements: OwnerAnnouncementDTO[];
  quickActions: OwnerQuickActionDTO[];
}

export interface TeacherSessionDTO {
  id: string;
  batchId: string;
  batchName: string;
  subjectName: string;
  startTime: string | null;
  endTime: string | null;
  status: string;
  attendanceTaken: boolean;
}

export interface TeacherPendingHomeworkDTO {
  batchId: string;
  batchName: string;
  subjectName: string;
  lastHomeworkDate: string | null;
}

export interface TeacherUpcomingTestDTO {
  id: string;
  batchId: string;
  batchName: string;
  title: string;
  testDate: string;
  status: string;
}

export interface TeacherDashboardDTO {
  instituteId: string;
  teacherUserId: string;
  timezone: string;
  todayIso: string;
  todaySessions: TeacherSessionDTO[];
  pendingHomework: TeacherPendingHomeworkDTO[];
  upcomingTests: TeacherUpcomingTestDTO[];
}

export interface AssistantCollectionSummaryDTO {
  collectedTodayAmount: number;
  transactionCount: number;
  pendingReceiptCount: number;
  targetPath: string;
}

export interface AssistantAdmissionsSummaryDTO {
  admissionsTodayCount: number;
  pendingEnrollmentsCount: number;
  targetPath: string;
}

export interface AssistantQuickActionDTO {
  id: string;
  label: string;
  targetPath: string;
  requiredCapability: string;
}

export interface AssistantDashboardDTO {
  instituteId: string;
  assistantUserId: string;
  timezone: string;
  todayIso: string;
  collection: AssistantCollectionSummaryDTO;
  admissions: AssistantAdmissionsSummaryDTO;
  quickActions: AssistantQuickActionDTO[];
}
