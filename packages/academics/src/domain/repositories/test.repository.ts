import { TestEntity } from '../entities/test.entity';

/**
 * Test / Assessment Repository Interface
 *
 * Provides persistence contract for Test entities.
 * Every query MUST be explicitly scoped by `instituteId` (ACADEMIC-006).
 */
export interface TestRepository {
  /**
   * Find a test record by ID, scoped to institute.
   */
  findById(instituteId: string, id: string): Promise<TestEntity | null>;

  /**
   * List all test records for a given batch within an institute.
   */
  listByBatch(instituteId: string, batchId: string): Promise<TestEntity[]>;

  /**
   * Persist a new test entity.
   */
  create(entity: TestEntity): Promise<TestEntity>;

  /**
   * Update an existing test entity.
   */
  update(entity: TestEntity): Promise<TestEntity>;

  /**
   * Delete a test record by ID, scoped to institute.
   */
  delete(instituteId: string, id: string): Promise<boolean>;
}
