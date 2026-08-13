import { HomeworkEntity } from '../entities/homework.entity';

/**
 * Homework Repository Interface
 *
 * Provides persistence contract for Homework entities.
 * Every query MUST be explicitly scoped by `instituteId` (ACADEMIC-006).
 */
export interface HomeworkRepository {
  /**
   * Find homework record by ID, scoped to institute.
   */
  findById(instituteId: string, id: string): Promise<HomeworkEntity | null>;

  /**
   * List all homework records for a given batch within an institute.
   */
  listByBatch(instituteId: string, batchId: string): Promise<HomeworkEntity[]>;

  /**
   * Persist a new homework entity.
   */
  create(entity: HomeworkEntity): Promise<HomeworkEntity>;

  /**
   * Update an existing homework entity.
   */
  update(entity: HomeworkEntity): Promise<HomeworkEntity>;

  /**
   * Delete a homework record by ID, scoped to institute.
   */
  delete(instituteId: string, id: string): Promise<boolean>;
}
