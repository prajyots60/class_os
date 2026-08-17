import { db } from '@coaching-os/database';
import { ConflictError, NotFoundError, ValidationError } from '@coaching-os/shared';
import { BatchSessionEntity, type SessionStatus, type AttendanceSource } from '../../domain/entities/batch-session.entity';
import type {
  BatchSessionRepository,
  ListBatchSessionsOptions,
} from '../../domain/repositories/batch-session.repository';

export class PrismaBatchSessionRepository implements BatchSessionRepository {
  public async create(entity: BatchSessionEntity): Promise<BatchSessionEntity> {
    try {
      const record = await db.batchSession.create({
        data: {
          id: entity.id,
          instituteId: entity.instituteId,
          batchId: entity.batchId,
          date: entity.date,
          startTime: entity.startTime ? entity.startTime.value : null,
          endTime: entity.endTime ? entity.endTime.value : null,
          status: entity.status as SessionStatus,
          attendanceTaken: entity.attendanceTaken,
          source: entity.source as AttendanceSource | null,
          substituteTeacherId: entity.substituteTeacherId,
          createdAt: entity.createdAt,
          updatedAt: entity.updatedAt,
        },
      });

      return this.toDomainEntity(record);
    } catch (error: any) {
      if (error?.code === 'P2003') {
        throw new ValidationError(
          `Foreign key constraint failure: Target Institute, Batch, or Substitute Teacher reference does not exist.`,
        );
      }
      throw error;
    }
  }

  public async createMany(entities: BatchSessionEntity[]): Promise<BatchSessionEntity[]> {
    if (entities.length === 0) return [];

    const createdEntities: BatchSessionEntity[] = [];

    // Atomic transaction creating missing sessions
    await db.$transaction(async (tx) => {
      for (const entity of entities) {
        // Idempotency check: see if session already exists for batch, date and startTime
        const existing = await tx.batchSession.findFirst({
          where: {
            instituteId: entity.instituteId,
            batchId: entity.batchId,
            date: entity.date,
            startTime: entity.startTime ? entity.startTime.value : null,
          },
        });

        if (existing) {
          createdEntities.push(this.toDomainEntity(existing));
        } else {
          const record = await tx.batchSession.create({
            data: {
              id: entity.id,
              instituteId: entity.instituteId,
              batchId: entity.batchId,
              date: entity.date,
              startTime: entity.startTime ? entity.startTime.value : null,
              endTime: entity.endTime ? entity.endTime.value : null,
              status: entity.status as SessionStatus,
              attendanceTaken: entity.attendanceTaken,
              source: entity.source as AttendanceSource | null,
              substituteTeacherId: entity.substituteTeacherId,
              createdAt: entity.createdAt,
              updatedAt: entity.updatedAt,
            },
          });
          createdEntities.push(this.toDomainEntity(record));
        }
      }
    });

    return createdEntities;
  }

  public async findById(instituteId: string, id: string): Promise<BatchSessionEntity | null> {
    if (!instituteId || !id) return null;

    const record = await db.batchSession.findFirst({
      where: { id, instituteId },
    });

    if (!record) return null;
    return this.toDomainEntity(record);
  }

  public async listByBatch(
    instituteId: string,
    batchId: string,
    options?: ListBatchSessionsOptions,
  ): Promise<BatchSessionEntity[]> {
    if (!instituteId || !batchId) return [];

    const page = Math.max(1, options?.page ?? 1);
    const limit = Math.max(1, Math.min(100, options?.limit ?? 50));
    const skip = (page - 1) * limit;

    const whereClause: any = {
      instituteId,
      batchId,
      ...(options?.status ? { status: options.status } : {}),
    };

    if (options?.startDate || options?.endDate) {
      whereClause.date = {};
      if (options.startDate) {
        whereClause.date.gte = this.normalizeToUtcDate(options.startDate);
      }
      if (options.endDate) {
        whereClause.date.lte = this.normalizeToUtcDate(options.endDate);
      }
    }

    const records = await db.batchSession.findMany({
      where: whereClause,
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      skip,
      take: limit,
    });

    return records.map((record) => this.toDomainEntity(record));
  }

  public async listByBatchAndDateRange(
    instituteId: string,
    batchId: string,
    startDate: Date | string,
    endDate: Date | string,
  ): Promise<BatchSessionEntity[]> {
    if (!instituteId || !batchId) return [];

    const start = this.normalizeToUtcDate(startDate);
    const end = this.normalizeToUtcDate(endDate);

    const records = await db.batchSession.findMany({
      where: {
        instituteId,
        batchId,
        date: {
          gte: start,
          lte: end,
        },
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });

    return records.map((record) => this.toDomainEntity(record));
  }

  public async findByBatchDateAndTime(
    instituteId: string,
    batchId: string,
    date: Date | string,
    startTime?: string | null,
  ): Promise<BatchSessionEntity | null> {
    if (!instituteId || !batchId) return null;

    const normalizedDate = this.normalizeToUtcDate(date);

    const record = await db.batchSession.findFirst({
      where: {
        instituteId,
        batchId,
        date: normalizedDate,
        startTime: startTime ? startTime.trim() : null,
      },
    });

    if (!record) return null;
    return this.toDomainEntity(record);
  }

  public async update(entity: BatchSessionEntity): Promise<BatchSessionEntity> {
    const existing = await this.findById(entity.instituteId, entity.id);
    if (!existing) {
      throw new NotFoundError(
        `BatchSession record "${entity.id}" not found in institute "${entity.instituteId}".`,
      );
    }

    try {
      const record = await db.batchSession.update({
        where: { id: entity.id },
        data: {
          startTime: entity.startTime ? entity.startTime.value : null,
          endTime: entity.endTime ? entity.endTime.value : null,
          status: entity.status as SessionStatus,
          attendanceTaken: entity.attendanceTaken,
          source: entity.source as AttendanceSource | null,
          substituteTeacherId: entity.substituteTeacherId,
          updatedAt: entity.updatedAt,
        },
      });

      return this.toDomainEntity(record);
    } catch (error: any) {
      if (error?.code === 'P2025') {
        throw new NotFoundError(
          `BatchSession record "${entity.id}" not found in institute "${entity.instituteId}".`,
        );
      }
      throw error;
    }
  }

  public async listSessions(
    instituteId: string,
    options?: {
      batchId?: string;
      subjectId?: string;
      teacherId?: string;
      status?: string;
      attendanceStatus?: 'taken' | 'pending';
      startDate?: string;
      endDate?: string;
      search?: string;
      page?: number;
      pageSize?: number;
      sortBy?: 'date' | 'status' | 'createdAt';
      sortOrder?: 'asc' | 'desc';
      teacherUserIdFilter?: string;
    },
  ) {
    if (!instituteId) {
      return { items: [], total: 0, page: 1, pageSize: 25, totalPages: 0 };
    }

    const page = Math.max(1, options?.page ?? 1);
    const pageSize = Math.max(1, Math.min(100, options?.pageSize ?? 25));
    const skip = (page - 1) * pageSize;

    const whereClause: any = {
      instituteId,
      ...(options?.batchId ? { batchId: options.batchId } : {}),
      ...(options?.status ? { status: options.status } : {}),
      ...(options?.attendanceStatus
        ? { attendanceTaken: options.attendanceStatus === 'taken' }
        : {}),
    };

    if (options?.subjectId) {
      whereClause.batch = { subjectId: options.subjectId };
    }

    if (options?.teacherId || options?.teacherUserIdFilter) {
      const teacherTarget = options.teacherId || options.teacherUserIdFilter;
      whereClause.OR = [
        { batch: { teacherId: teacherTarget } },
        { substituteTeacherId: teacherTarget },
      ];
    }

    if (options?.startDate || options?.endDate) {
      whereClause.date = {};
      if (options.startDate) {
        whereClause.date.gte = this.normalizeToUtcDate(options.startDate);
      }
      if (options.endDate) {
        whereClause.date.lte = this.normalizeToUtcDate(options.endDate);
      }
    }

    if (options?.search && options.search.trim() !== '') {
      const s = options.search.trim();
      whereClause.AND = [
        {
          OR: [
            { batch: { name: { contains: s, mode: 'insensitive' } } },
            { batch: { code: { contains: s, mode: 'insensitive' } } },
            { batch: { subject: { name: { contains: s, mode: 'insensitive' } } } },
          ],
        },
      ];
    }

    const sortField = options?.sortBy || 'date';
    const sortDir = options?.sortOrder || 'asc';
    const orderBy: any = {};
    orderBy[sortField] = sortDir;

    const [records, total] = await Promise.all([
      db.batchSession.findMany({
        where: whereClause,
        include: {
          batch: {
            include: {
              subject: true,
              teacher: {
                include: {
                  parentIdentity: true,
                },
              },
            },
          },
        },
        orderBy: [orderBy, { id: 'asc' }],
        skip,
        take: pageSize,
      }),
      db.batchSession.count({ where: whereClause }),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    const items = records.map((record: any) => {
      const teacherIdentity = record.batch?.teacher?.parentIdentity;
      const teacherName = teacherIdentity?.name || undefined;
      return {
        id: record.id,
        instituteId: record.instituteId,
        batchId: record.batchId,
        batchName: record.batch?.name || 'Unknown Batch',
        batchCode: record.batch?.code || '',
        subjectName: record.batch?.subject?.name,
        teacherName,
        dateIso: record.date.toISOString().split('T')[0] || '',
        startTime: record.startTime || undefined,
        endTime: record.endTime || undefined,
        status: record.status,
        attendanceTaken: record.attendanceTaken,
      };
    });


    return {
      items,
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  private normalizeToUtcDate(dateInput: Date | string): Date {

    const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  }

  private toDomainEntity(record: {
    id: string;
    instituteId: string;
    batchId: string;
    date: Date;
    startTime: string | null;
    endTime: string | null;
    status: string;
    attendanceTaken: boolean;
    source: string | null;
    substituteTeacherId: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): BatchSessionEntity {
    return BatchSessionEntity.from({
      id: record.id,
      instituteId: record.instituteId,
      batchId: record.batchId,
      date: record.date,
      startTime: record.startTime,
      endTime: record.endTime,
      status: record.status as SessionStatus,
      attendanceTaken: record.attendanceTaken,
      source: record.source as AttendanceSource | null,
      substituteTeacherId: record.substituteTeacherId,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
