import { MarksEntity } from '../entities/marks.entity';

/**
 * Marks Repository Interface
 *
 * Provides persistence contract for Marks entities.
 * Every query MUST be explicitly scoped by `instituteId` (ACADEMIC-006).
 */
export interface MarksRepository {
  /**
   * Find all marks recorded for a test within an institute.
   */
  findByTestId(instituteId: string, testId: string): Promise<MarksEntity[]>;

  /**
   * Find mark for a specific test and enrollment within an institute.
   */
  findByTestAndEnrollment(
    instituteId: string,
    testId: string,
    enrollmentId: string,
  ): Promise<MarksEntity | null>;

  /**
   * Atomically upsert multiple marks records for a test and mark test status as marks_entered.
   */
  upsertMany(instituteId: string, testId: string, marks: MarksEntity[]): Promise<MarksEntity[]>;
}
