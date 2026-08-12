import { db } from '@coaching-os/database';
import { ConflictError, NotFoundError, ValidationError } from '@coaching-os/shared';
import { BatchEntity, type BatchStatus } from '../../domain/entities/batch.entity';
import type {
  BatchRepository,
  ListBatchesOptions,
} from '../../domain/repositories/batch.repository';

export class PrismaBatchRepository implements BatchRepository {
  public async create(entity: BatchEntity): Promise<BatchEntity> {
    try {
      const record = await db.batch.create({
        data: {
          id: entity.id,
          instituteId: entity.instituteId,
          subjectId: entity.subjectId,
          programId: entity.programId,
          teacherId: entity.teacherId,
          name: entity.name,
          code: entity.code.value,
          capacity: entity.capacity,
          status: entity.status as BatchStatus,
          startDate: entity.startDate,
          endDate: entity.endDate,
          createdAt: entity.createdAt,
          updatedAt: entity.updatedAt,
          deletedAt: entity.deletedAt,
        },
      });

      return this.toDomainEntity(record);
    } catch (error: any) {
      if (error?.code === 'P2002') {
        const target = error.meta?.target;
        if (Array.isArray(target) && target.includes('code')) {
          throw new ConflictError(
            `Batch with code "${entity.code.value}" already exists in institute "${entity.instituteId}".`,
          );
        }
        throw new ConflictError(
          `Batch with code "${entity.code.value}" or name "${entity.name}" under subject "${entity.subjectId}" already exists in institute "${entity.instituteId}".`,
        );
      }
      if (error?.code === 'P2003') {
        throw new ValidationError(
          `Foreign key constraint failure: Target Institute, Subject, Program, or Teacher reference does not exist.`,
        );
      }
      throw error;
    }
  }

  public async findById(instituteId: string, id: string): Promise<BatchEntity | null> {
    if (!instituteId || !id) return null;

    const record = await db.batch.findFirst({
      where: { id, instituteId },
    });

    if (!record) return null;
    return this.toDomainEntity(record);
  }

  public async findByCode(instituteId: string, code: string): Promise<BatchEntity | null> {
    if (!instituteId || !code) return null;

    const record = await db.batch.findUnique({
      where: {
        batch_code_unique: {
          instituteId,
          code: code.trim().toUpperCase(),
        },
      },
    });

    if (!record) return null;
    return this.toDomainEntity(record);
  }

  public async findByNameAndSubject(
    instituteId: string,
    subjectId: string,
    name: string,
  ): Promise<BatchEntity | null> {
    if (!instituteId || !subjectId || !name) return null;

    const record = await db.batch.findUnique({
      where: {
        batch_subject_name_unique: {
          instituteId,
          subjectId,
          name: name.trim(),
        },
      },
    });

    if (!record) return null;
    return this.toDomainEntity(record);
  }

  public async listByInstitute(
    instituteId: string,
    options?: ListBatchesOptions,
  ): Promise<BatchEntity[]> {
    if (!instituteId) return [];

    const page = Math.max(1, options?.page ?? 1);
    const limit = Math.max(1, Math.min(100, options?.limit ?? 50));
    const skip = (page - 1) * limit;

    const whereClause: any = {
      instituteId,
      ...(options?.status ? { status: options.status } : {}),
      ...(options?.subjectId ? { subjectId: options.subjectId } : {}),
      ...(options?.programId ? { programId: options.programId } : {}),
      ...(options?.teacherId ? { teacherId: options.teacherId } : {}),
    };

    if (options?.search && options.search.trim() !== '') {
      const searchTerm = options.search.trim();
      whereClause.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { code: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    const records = await db.batch.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    return records.map((record) => this.toDomainEntity(record));
  }

  public async update(entity: BatchEntity): Promise<BatchEntity> {
    const existing = await this.findById(entity.instituteId, entity.id);
    if (!existing) {
      throw new NotFoundError(
        `Batch record "${entity.id}" not found in institute "${entity.instituteId}".`,
      );
    }

    try {
      const record = await db.batch.update({
        where: { id: entity.id },
        data: {
          programId: entity.programId,
          teacherId: entity.teacherId,
          name: entity.name,
          capacity: entity.capacity,
          status: entity.status as BatchStatus,
          startDate: entity.startDate,
          endDate: entity.endDate,
          updatedAt: entity.updatedAt,
          deletedAt: entity.deletedAt,
        },
      });

      return this.toDomainEntity(record);
    } catch (error: any) {
      if (error?.code === 'P2025') {
        throw new NotFoundError(
          `Batch record "${entity.id}" not found in institute "${entity.instituteId}".`,
        );
      }
      if (error?.code === 'P2002') {
        throw new ConflictError(
          `Batch with name "${entity.name}" under subject "${entity.subjectId}" already exists in institute "${entity.instituteId}".`,
        );
      }
      throw error;
    }
  }

  public async existsByCode(instituteId: string, code: string): Promise<boolean> {
    if (!instituteId || !code) return false;

    const count = await db.batch.count({
      where: {
        instituteId,
        code: code.trim().toUpperCase(),
      },
    });

    return count > 0;
  }

  public async existsByNameAndSubject(
    instituteId: string,
    subjectId: string,
    name: string,
  ): Promise<boolean> {
    if (!instituteId || !subjectId || !name) return false;

    const count = await db.batch.count({
      where: {
        instituteId,
        subjectId,
        name: name.trim(),
      },
    });

    return count > 0;
  }

  private toDomainEntity(record: {
    id: string;
    instituteId: string;
    subjectId: string;
    programId: string | null;
    teacherId: string | null;
    name: string;
    code: string;
    capacity: number | null;
    status: string;
    startDate: Date | null;
    endDate: Date | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  }): BatchEntity {
    return BatchEntity.from({
      id: record.id,
      instituteId: record.instituteId,
      subjectId: record.subjectId,
      programId: record.programId,
      teacherId: record.teacherId,
      name: record.name,
      code: record.code,
      capacity: record.capacity,
      status: record.status as BatchStatus,
      startDate: record.startDate,
      endDate: record.endDate,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      deletedAt: record.deletedAt,
    });
  }
}
