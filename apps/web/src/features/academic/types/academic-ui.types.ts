import type { BatchStatus } from '@coaching-os/identity/client';

export interface ApiAcademicListResponse<T> {
  success: boolean;
  data: T[];
  error?: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}

export interface ApiAcademicResponse<T> {
  success: boolean;
  data: T | null;
  error?: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}

export interface ApiActionResponse {
  success: boolean;
  message?: string;
  data?: unknown;
  error?: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}

export interface StaffMemberDTO {
  id: string;
  userId: string;
  role: string;
  status: string;
}

export interface CreateProgramFormValues {
  code: string;
  name: string;
  description?: string;
}

export interface EditProgramFormValues {
  name?: string;
  description?: string;
}

export interface CreateSubjectFormValues {
  code: string;
  name: string;
  description?: string;
}

export interface EditSubjectFormValues {
  name?: string;
  description?: string;
}

export interface CreateProgramSubjectFormValues {
  programId: string;
  subjectId: string;
}

export interface CreateBatchFormValues {
  code: string;
  name: string;
  subjectId: string;
  programId?: string;
  teacherId?: string;
  capacity?: number;
  startDate?: string;
  endDate?: string;
}

export interface EditBatchFormValues {
  name?: string;
  programId?: string;
  capacity?: number;
  startDate?: string;
  endDate?: string;
}

export interface AssignTeacherFormValues {
  teacherId: string | null;
}

export interface ChangeBatchStatusFormValues {
  status: BatchStatus;
}
