import type { ProgramDTO, ProgramEntity } from '../../domain/entities/program.entity';

export type { ProgramDTO };

/**
 * Converts a Program domain entity into a ProgramDTO.
 */
export function toProgramDTO(entity: ProgramEntity): ProgramDTO {
  return entity.toDTO();
}
