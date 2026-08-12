/**
 * enrollment-ui.types.ts
 *
 * UI Type definitions for the Staff Enrollment Workspace.
 */

export type EnrollmentStatus =
  | 'pending'
  | 'active'
  | 'completed'
  | 'withdrawn'
  | 'transferred'
  | 'cancelled';

export interface EnrollmentDTO {
  id: string;
  instituteId: string;
  studentId: string;
  batchId: string;
  status: EnrollmentStatus;
  enrolledAt: string;
  completedAt: string | null;
  withdrawnAt: string | null;
  transferredAt: string | null;
  transferredToBatchId: string | null;
  transferredToEnrollmentId: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface StudentSummary {
  id: string;
  displayName: string;
  admissionNumber: string;
  email?: string | null;
  phone?: string | null;
  admissionStatus: string;
  status: string;
}

export interface BatchSummary {
  id: string;
  name: string;
  code: string;
  subjectId: string;
  subjectName?: string;
  programId?: string;
  programName?: string;
  capacity: number;
  status: string;
}

export interface EnrichedEnrollmentDTO extends EnrollmentDTO {
  student?: StudentSummary;
  batch?: BatchSummary;
}

export interface ApiEnrollmentsListResponse {
  success: boolean;
  data: EnrollmentDTO[];
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface ApiEnrollmentResponse {
  success: boolean;
  data: EnrollmentDTO | null;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface ApiTransferResponse {
  success: boolean;
  data: {
    source: EnrollmentDTO;
    destination: EnrollmentDTO;
  } | null;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface ApiActionResponse {
  success: boolean;
  data?: unknown;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface CreateEnrollmentFormValues {
  studentId: string;
  batchId: string;
  status?: 'pending' | 'active';
  enrolledAt?: string;
}

export interface TransferEnrollmentFormValues {
  targetBatchId: string;
}

export interface EnrollmentFilterState {
  status: 'all' | EnrollmentStatus;
  search: string;
  studentId?: string;
  batchId?: string;
}
