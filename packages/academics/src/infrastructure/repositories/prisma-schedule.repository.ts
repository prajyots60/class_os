import { db } from '@coaching-os/database';
import { ConflictError, NotFoundError, ValidationError } from '@coaching-os/shared';
import { ScheduleEntity } from '../../domain/entities/schedule.entity';
import type { DayOfWeekValue } from '../../domain/value-objects/day-of-week.vo';
import type { ScheduleRepository } from '../../domain/repositories/schedule.repository';

export class PrismaScheduleRepository implements ScheduleRepository {
  public async create(entity: ScheduleEntity): Promise<ScheduleEntity> {
    try {
      const record = await db.schedule.create({
        data: {
          id: entity.id,
          batchId: entity.batchId,
          dayOfWeek: entity.dayOfWeek.value,
          startTime: entity.startTime.value,
          endTime: entity.endTime.value,
          teacherId: entity.teacherId,
          createdAt: entity.createdAt,
        },
      });

      return this.toDomainEntity(record);
    } catch (error: any) {
      if (error?.code === 'P2003') {
        throw new ValidationError(
          `Foreign key constraint failure: Target Batch or Teacher reference does not exist.`,
        );
      }
      throw error;
    }
  }

  public async findById(batchId: string, id: string): Promise<ScheduleEntity | null> {
    if (!batchId || !id) return null;

    const record = await db.schedule.findFirst({
      where: { id, batchId },
    });

    if (!record) return null;
    return this.toDomainEntity(record);
  }

  public async listByBatch(batchId: string): Promise<ScheduleEntity[]> {
    if (!batchId) return [];

    const records = await db.schedule.findMany({
      where: { batchId },
      orderBy: { createdAt: 'asc' },
    });

    return records.map((record) => this.toDomainEntity(record));
  }

  public async update(entity: ScheduleEntity): Promise<ScheduleEntity> {
    const existing = await this.findById(entity.batchId, entity.id);
    if (!existing) {
      throw new NotFoundError(
        `Schedule record "${entity.id}" not found under batch "${entity.batchId}".`,
      );
    }

    try {
      const record = await db.schedule.update({
        where: { id: entity.id },
        data: {
          dayOfWeek: entity.dayOfWeek.value,
          startTime: entity.startTime.value,
          endTime: entity.endTime.value,
          teacherId: entity.teacherId,
        },
      });

      return this.toDomainEntity(record);
    } catch (error: any) {
      if (error?.code === 'P2025') {
        throw new NotFoundError(
          `Schedule record "${entity.id}" not found under batch "${entity.batchId}".`,
        );
      }
      throw error;
    }
  }

  public async delete(batchId: string, id: string): Promise<void> {
    const existing = await this.findById(batchId, id);
    if (!existing) {
      throw new NotFoundError(
        `Schedule record "${id}" not found under batch "${batchId}".`,
      );
    }

    await db.schedule.delete({
      where: { id },
    });
  }

  private toDomainEntity(record: {
    id: string;
    batchId: string;
    dayOfWeek: string;
    startTime: string;
    endTime: string;
    teacherId: string | null;
    createdAt: Date;
  }): ScheduleEntity {
    return ScheduleEntity.from({
      id: record.id,
      batchId: record.batchId,
      dayOfWeek: record.dayOfWeek as DayOfWeekValue,
      startTime: record.startTime,
      endTime: record.endTime,
      teacherId: record.teacherId,
      createdAt: record.createdAt,
    });
  }
}
