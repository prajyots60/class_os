import type { ProgramSubjectDTO, ProgramSubjectEntity } from '../../domain/entities/program-subject.entity';

export type { ProgramSubjectDTO };

/**
 * Converts a ProgramSubject domain entity into a ProgramSubjectDTO.
 */
export function toProgramSubjectDTO(entity: ProgramSubjectEntity): ProgramSubjectDTO {
  return entity.toDTO();
}
