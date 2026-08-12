import { db } from '@coaching-os/database';
import { ConflictError, NotFoundError, ValidationError } from '@coaching-os/shared';
import { SubjectEntity, type SubjectStatus } from '../../domain/entities/subject.entity';
import type {
  ListSubjectsOptions,
  SubjectRepository,
} from '../../domain/repositories/subject.repository';

export class PrismaSubjectRepository implements SubjectRepository {
  public async create(entity: SubjectEntity): Promise<SubjectEntity> {
    try {
      const record = await db.subject.create({
        data: {
          id: entity.id,
          instituteId: entity.instituteId,
          name: entity.name,
          code: entity.code.value,
          description: entity.description,
          status: entity.status as SubjectStatus,
          createdAt: entity.createdAt,
          updatedAt: entity.updatedAt,
          deletedAt: entity.deletedAt,
        },
      });

      return this.toDomainEntity(record);
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new ConflictError(
          `Subject with code "${entity.code.value}" or name "${entity.name}" already exists in institute "${entity.instituteId}".`,
        );
      }
      if (error?.code === 'P2003') {
        throw new ValidationError(
          `Foreign key constraint failure: Target institute "${entity.instituteId}" does not exist.`,
        );
      }
      throw error;
    }
  }

  public async findById(instituteId: string, id: string): Promise<SubjectEntity | null> {
    if (!instituteId || !id) return null;

    const record = await db.subject.findFirst({
      where: { id, instituteId },
    });

    if (!record) return null;
    return this.toDomainEntity(record);
  }

  public async findByCode(instituteId: string, code: string): Promise<SubjectEntity | null> {
    if (!instituteId || !code) return null;

    const record = await db.subject.findUnique({
      where: {
        subject_code_unique: {
          instituteId,
          code: code.trim().toUpperCase(),
        },
      },
    });

    if (!record) return null;
    return this.toDomainEntity(record);
  }

  public async findByName(instituteId: string, name: string): Promise<SubjectEntity | null> {
    if (!instituteId || !name) return null;

    const record = await db.subject.findUnique({
      where: {
        subject_name_unique: {
          instituteId,
          name: name.trim(),
        },
      },
    });

    if (!record) return null;
    return this.toDomainEntity(record);
  }

  public async listByInstitute(
    instituteId: string,
    options?: ListSubjectsOptions,
  ): Promise<SubjectEntity[]> {
    if (!instituteId) return [];

    const page = Math.max(1, options?.page ?? 1);
    const limit = Math.max(1, Math.min(100, options?.limit ?? 50));
    const skip = (page - 1) * limit;

    const whereClause: any = {
      instituteId,
      ...(options?.status ? { status: options.status } : {}),
    };

    if (options?.search && options.search.trim() !== '') {
      const searchTerm = options.search.trim();
      whereClause.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { code: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    const records = await db.subject.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    return records.map((record) => this.toDomainEntity(record));
  }

  public async update(entity: SubjectEntity): Promise<SubjectEntity> {
    const existing = await this.findById(entity.instituteId, entity.id);
    if (!existing) {
      throw new NotFoundError(
        `Subject record "${entity.id}" not found in institute "${entity.instituteId}".`,
      );
    }

    try {
      const record = await db.subject.update({
        where: { id: entity.id },
        data: {
          name: entity.name,
          description: entity.description,
          status: entity.status as SubjectStatus,
          updatedAt: entity.updatedAt,
          deletedAt: entity.deletedAt,
        },
      });

      return this.toDomainEntity(record);
    } catch (error: any) {
      if (error?.code === 'P2025') {
        throw new NotFoundError(
          `Subject record "${entity.id}" not found in institute "${entity.instituteId}".`,
        );
      }
      if (error?.code === 'P2002') {
        throw new ConflictError(
          `Subject with name "${entity.name}" already exists in institute "${entity.instituteId}".`,
        );
      }
      throw error;
    }
  }

  public async existsByCode(instituteId: string, code: string): Promise<boolean> {
    if (!instituteId || !code) return false;

    const count = await db.subject.count({
      where: {
        instituteId,
        code: code.trim().toUpperCase(),
      },
    });

    return count > 0;
  }

  public async existsByName(instituteId: string, name: string): Promise<boolean> {
    if (!instituteId || !name) return false;

    const count = await db.subject.count({
      where: {
        instituteId,
        name: name.trim(),
      },
    });

    return count > 0;
  }

  private toDomainEntity(record: {
    id: string;
    instituteId: string;
    name: string;
    code: string;
    description: string | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  }): SubjectEntity {
    return SubjectEntity.from({
      id: record.id,
      instituteId: record.instituteId,
      name: record.name,
      code: record.code,
      description: record.description,
      status: record.status as SubjectStatus,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      deletedAt: record.deletedAt,
    });
  }
}
