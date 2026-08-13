/**
 * Phase 2.6 — Staff Academic Workspace UI Types
 *
 * Strongly-typed DTOs, view models, and form payloads for `/api/v1/academics/...` integration.
 */

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
export type SessionStatus = 'scheduled' | 'completed' | 'cancelled';
export type AttendanceStatus = 'present' | 'absent' | 'late';
export type TestStatus = 'draft' | 'scheduled' | 'marks_entered' | 'published';

export interface V1ScheduleDTO {
  id: string;
  instituteId: string;
  batchId: string;
  dayOfWeek: DayOfWeek;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  teacherId?: string | null;
  room?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface V1BatchSessionDTO {
  id: string;
  instituteId: string;
  batchId: string;
  scheduleId?: string | null;
  sessionDate: string; // YYYY-MM-DD
  startTime: string;   // HH:mm
  endTime: string;     // HH:mm
  status: SessionStatus;
  teacherId?: string | null;
  topic?: string | null;
  room?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface V1AttendanceRecordDTO {
  id: string;
  instituteId: string;
  sessionId: string;
  enrollmentId: string;
  status: AttendanceStatus;
  remarks?: string | null;
  createdAt: string;
  updatedAt: string;
  student?: {
    id: string;
    firstName: string;
    lastName: string;
    admissionNumber: string;
  };
}

export interface V1HomeworkDTO {
  id: string;
  instituteId: string;
  batchId: string;
  title: string;
  description: string;
  attachmentUrl?: string | null;
  dueDate?: string | null;
  isPublished: boolean;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface V1TestDTO {
  id: string;
  instituteId: string;
  batchId: string;
  title: string;
  description?: string | null;
  maximumMarks: number;
  passingMarks?: number | null;
  scheduledDate?: string | null;
  status: TestStatus;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface V1MarksDTO {
  id: string;
  instituteId: string;
  testId: string;
  enrollmentId: string;
  marksObtained: number;
  isAbsent: boolean;
  remarks?: string | null;
  createdAt: string;
  updatedAt: string;
  student?: {
    id: string;
    firstName: string;
    lastName: string;
    admissionNumber: string;
  };
}

// Enrollment summary item for attendance & marks entry
export interface V1EnrollmentOption {
  id: string; // enrollmentId
  studentId: string;
  studentName: string;
  admissionNumber: string;
  status: string;
}

// Form payloads
export interface CreateScheduleFormPayload {
  batchId: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  teacherId?: string;
  room?: string;
}

export interface GenerateSessionsFormPayload {
  batchId: string;
  startDate: string;
  endDate: string;
}

export interface RecordAttendanceFormPayload {
  sessionId: string;
  records: Array<{
    enrollmentId: string;
    status: AttendanceStatus;
    remarks?: string;
  }>;
}

export interface CreateHomeworkFormPayload {
  batchId: string;
  title: string;
  description: string;
  attachmentUrl?: string;
  dueDate?: string;
}

export interface UpdateHomeworkFormPayload {
  title?: string;
  description?: string;
  attachmentUrl?: string;
  dueDate?: string;
}

export interface CreateTestFormPayload {
  batchId: string;
  title: string;
  description?: string;
  maximumMarks: number;
  passingMarks?: number;
  scheduledDate?: string;
}

export interface EnterMarksFormPayload {
  records: Array<{
    enrollmentId: string;
    marksObtained: number;
    isAbsent?: boolean;
    remarks?: string;
  }>;
}

// API Response envelopes
export interface ApiV1Response<T> {
  success: boolean;
  data: T;
  meta?: {
    requestId?: string;
    timestamp?: string;
  };
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface ApiV1CollectionResponse<T> {
  success: boolean;
  data: T[];
  pagination?: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  meta?: {
    requestId?: string;
    timestamp?: string;
  };
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}
