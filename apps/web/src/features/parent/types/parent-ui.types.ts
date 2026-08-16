import type {
  ParentHubDTO,
  ParentHubIdentityDTO,
  ParentHubProfileSummaryDTO,
  ParentHubStudentSummaryDTO,
  ParentHubInstituteSummaryDTO,
  ParentHubMetaDTO,
} from '@coaching-os/identity';

export type {
  ParentHubDTO,
  ParentHubIdentityDTO,
  ParentHubProfileSummaryDTO,
  ParentHubStudentSummaryDTO,
  ParentHubInstituteSummaryDTO,
  ParentHubMetaDTO,
};

export interface ParentDashboardState {
  selectedProfileId: string | null;
  activeTab?: 'overview' | 'attendance' | 'homework';
}

export interface ParentApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  requestId?: string;
}

export interface ParentAttendanceSummaryDTO {
  totalSessions: number;
  presentCount: number;
  absentCount: number;
  excusedCount: number;
  percentage: number;
}

export interface ParentAttendanceRecordDTO {
  id: string;
  sessionId: string;
  sessionDate: string;
  batchName: string;
  subject: string | null;
  status: 'present' | 'absent' | 'excused' | 'late';
  recordedAt: string;
}

export interface ParentStudentAttendanceDTO {
  student: {
    id: string;
    fullName: string;
    admissionNumber: string;
    instituteId: string;
    instituteName: string;
  };
  summary: ParentAttendanceSummaryDTO;
  records: ParentAttendanceRecordDTO[];
}

export interface ParentHomeworkItemDTO {
  id: string;
  batchId: string;
  batchName: string;
  subject: string | null;
  title: string;
  description: string | null;
  attachmentUrl: string | null;
  publishedAt: string;
  createdAt: string;
}

export interface ParentStudentHomeworkDTO {
  student: {
    id: string;
    fullName: string;
    admissionNumber: string;
    instituteId: string;
    instituteName: string;
  };
  homework: ParentHomeworkItemDTO[];
}

