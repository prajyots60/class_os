import type { StudentDTO, StudentEntity } from '../../domain/entities/student.entity';

export type { StudentDTO };

/**
 * Converts a Student domain entity into a StudentDTO.
 */
export function toStudentDTO(entity: StudentEntity): StudentDTO {
  return entity.toDTO();
}
