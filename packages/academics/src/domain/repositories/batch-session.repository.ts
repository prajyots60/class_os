import type { BatchSessionEntity, SessionStatus } from '../entities/batch-session.entity';

export interface ListBatchSessionsOptions {
  status?: SessionStatus;
  startDate?: Date | string;
  endDate?: Date | string;
  page?: number;
  limit?: number;
}

export interface BatchSessionRepository {
  create(entity: BatchSessionEntity): Promise<BatchSessionEntity>;
  createMany(entities: BatchSessionEntity[]): Promise<BatchSessionEntity[]>;
  findById(instituteId: string, id: string): Promise<BatchSessionEntity | null>;
  listByBatch(instituteId: string, batchId: string, options?: ListBatchSessionsOptions): Promise<BatchSessionEntity[]>;
  listByBatchAndDateRange(
    instituteId: string,
    batchId: string,
    startDate: Date | string,
    endDate: Date | string,
  ): Promise<BatchSessionEntity[]>;
  findByBatchDateAndTime(
    instituteId: string,
    batchId: string,
    date: Date | string,
    startTime?: string | null,
  ): Promise<BatchSessionEntity | null>;
  update(entity: BatchSessionEntity): Promise<BatchSessionEntity>;
}
