import type { BatchEntity, BatchStatus } from '../entities/batch.entity';

export interface ListBatchesOptions {
  status?: BatchStatus;
  subjectId?: string;
  programId?: string;
  teacherId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * BatchRepository Interface
 *
 * Domain repository abstraction for tenant-scoped Batch persistence.
 */
export interface BatchRepository {
  create(batch: BatchEntity): Promise<BatchEntity>;
  findById(instituteId: string, id: string): Promise<BatchEntity | null>;
  findByCode(instituteId: string, code: string): Promise<BatchEntity | null>;
  findByNameAndSubject(instituteId: string, subjectId: string, name: string): Promise<BatchEntity | null>;
  listByInstitute(instituteId: string, options?: ListBatchesOptions): Promise<BatchEntity[]>;
  update(batch: BatchEntity): Promise<BatchEntity>;
  existsByCode(instituteId: string, code: string): Promise<boolean>;
  existsByNameAndSubject(instituteId: string, subjectId: string, name: string): Promise<boolean>;
}
