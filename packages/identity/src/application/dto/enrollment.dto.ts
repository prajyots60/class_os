import type { EnrollmentDTO, EnrollmentEntity } from '../../domain/entities/enrollment.entity';

export type { EnrollmentDTO };

export interface StudentEnrollmentSummaryDTO {
  id: string;
  studentId: string;
  batchId: string;
  batchName: string;
  batchCode: string;
  subjectName: string;
  programName: string | null;
  status: string;
  enrolledAt: string;
}

export interface BatchEnrollmentSummaryDTO {
  id: string;
  studentId: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  batchId: string;
  status: string;
  enrolledAt: string;
}

/**
 * Converts an Enrollment domain entity into a flat EnrollmentDTO.
 */
export function toEnrollmentDTO(entity: EnrollmentEntity): EnrollmentDTO {
  return entity.toDTO();
}
