import type { SubjectDTO, SubjectEntity } from '../../domain/entities/subject.entity';

export type { SubjectDTO };

/**
 * Converts a Subject domain entity into a SubjectDTO.
 */
export function toSubjectDTO(entity: SubjectEntity): SubjectDTO {
  return entity.toDTO();
}
