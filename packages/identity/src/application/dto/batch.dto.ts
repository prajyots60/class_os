import type { BatchDTO, BatchEntity } from '../../domain/entities/batch.entity';

export type { BatchDTO };

/**
 * Converts a Batch domain entity into a BatchDTO.
 */
export function toBatchDTO(entity: BatchEntity): BatchDTO {
  return entity.toDTO();
}
