import { db, type PrismaClient, type Prisma } from '@coaching-os/database';
import { ConflictError, NotFoundError } from '@coaching-os/shared';
import { ActivityEntity } from '../../domain/entities/activity.entity';
import type {
  ActivityRepository,
  ListStudentActivitiesParams,
} from '../../domain/repositories/activity.repository';
import type { ActivityEventType } from '../../domain/types';

export class PrismaActivityRepository implements ActivityRepository {
  constructor(private readonly prisma: PrismaClient = db) {}

  public async save(activity: ActivityEntity): Promise<ActivityEntity> {
    try {
      const data: Prisma.ActivityCreateInput = {
        id: activity.id,
        institute: { connect: { id: activity.instituteId } },
        student: { connect: { id: activity.studentId } },
        eventType: activity.eventType,
        title: activity.title,
        description: activity.description,
        occurredAt: activity.occurredAt,
        actorName: activity.actorName,
        metadata: activity.metadata ? (activity.metadata as Prisma.InputJsonValue) : undefined,
        idempotencyKey: activity.idempotencyKey,
        createdAt: activity.createdAt,
      };

      const record = await this.prisma.activity.upsert({
        where: { id: activity.id },
        create: data,
        update: {
          // Immutable ledger: preserve original data on update
        },
      });

      return this.mapToEntity(record);
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'code' in error) {
        const code = (error as { code: string }).code;
        if (code === 'P2002') {
          throw new ConflictError('Activity record with identical idempotency key already exists');
        }
        if (code === 'P2025') {
          throw new NotFoundError('Referenced institute or student record not found');
        }
      }
      throw error;
    }
  }

  public async findById(
    instituteId: string,
    studentId: string,
    id: string,
  ): Promise<ActivityEntity | null> {
    const record = await this.prisma.activity.findFirst({
      where: {
        id,
        instituteId,
        studentId,
      },
    });

    return record ? this.mapToEntity(record) : null;
  }

  public async findManyForStudent(
    params: ListStudentActivitiesParams,
  ): Promise<{ items: ActivityEntity[]; nextCursor: string | null }> {
    const limit = Math.min(Math.max(params.limit ?? 20, 1), 100);

    const where: Prisma.ActivityWhereInput = {
      instituteId: params.instituteId,
      studentId: params.studentId,
    };

    if (params.eventType) {
      where.eventType = params.eventType;
    }

    if (params.cursor) {
      const cursorRecord = await this.prisma.activity.findFirst({
        where: {
          id: params.cursor,
          instituteId: params.instituteId,
          studentId: params.studentId,
        },
      });

      if (cursorRecord) {
        where.OR = [
          { occurredAt: { lt: cursorRecord.occurredAt } },
          {
            occurredAt: cursorRecord.occurredAt,
            id: { lt: cursorRecord.id },
          },
        ];
      }
    }

    const records = await this.prisma.activity.findMany({
      where,
      orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });

    let nextCursor: string | null = null;
    if (records.length > limit) {
      records.pop();
      const lastItem = records[records.length - 1];
      nextCursor = lastItem ? lastItem.id : null;
    }

    return {
      items: records.map((r) => this.mapToEntity(r)),
      nextCursor,
    };
  }

  public async findBySourceIdempotencyKey(
    instituteId: string,
    studentId: string,
    idempotencyKey: string,
  ): Promise<ActivityEntity | null> {
    const record = await this.prisma.activity.findFirst({
      where: {
        instituteId,
        studentId,
        idempotencyKey,
      },
    });

    return record ? this.mapToEntity(record) : null;
  }

  private mapToEntity(record: {
    id: string;
    instituteId: string;
    studentId: string;
    eventType: string;
    title: string;
    description: string;
    occurredAt: Date;
    actorName: string | null;
    metadata: unknown;
    idempotencyKey: string | null;
    createdAt: Date;
  }): ActivityEntity {
    return ActivityEntity.rehydrate({
      id: record.id,
      instituteId: record.instituteId,
      studentId: record.studentId,
      eventType: record.eventType as ActivityEventType,
      title: record.title,
      description: record.description,
      occurredAt: record.occurredAt,
      actorName: record.actorName,
      metadata: (record.metadata as Record<string, unknown>) ?? null,
      idempotencyKey: record.idempotencyKey,
      createdAt: record.createdAt,
    });
  }
}
