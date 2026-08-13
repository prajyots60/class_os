import type { ScheduleEntity } from '../entities/schedule.entity';

export interface ScheduleRepository {
  create(entity: ScheduleEntity): Promise<ScheduleEntity>;
  findById(batchId: string, id: string): Promise<ScheduleEntity | null>;
  listByBatch(batchId: string): Promise<ScheduleEntity[]>;
  update(entity: ScheduleEntity): Promise<ScheduleEntity>;
  delete(batchId: string, id: string): Promise<void>;
}
