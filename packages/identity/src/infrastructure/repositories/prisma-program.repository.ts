import { db } from '@coaching-os/database';
import { ConflictError, NotFoundError, ValidationError } from '@coaching-os/shared';
import { ProgramEntity, type ProgramStatus } from '../../domain/entities/program.entity';
import type {
  ListProgramsOptions,
  ProgramRepository,
} from '../../domain/repositories/program.repository';

export class PrismaProgramRepository implements ProgramRepository {
  public async create(entity: ProgramEntity): Promise<ProgramEntity> {
    try {
      const record = await db.program.create({
        data: {
          id: entity.id,
          instituteId: entity.instituteId,
          name: entity.name,
          code: entity.code.value,
          description: entity.description,
          status: entity.status as ProgramStatus,
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
            `Program with code "${entity.code.value}" already exists in institute "${entity.instituteId}".`,
          );
        }
        throw new ConflictError(
          `Program with code "${entity.code.value}" or name "${entity.name}" already exists in institute "${entity.instituteId}".`,
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

  public async findById(instituteId: string, id: string): Promise<ProgramEntity | null> {
    if (!instituteId || !id) return null;

    const record = await db.program.findFirst({
      where: { id, instituteId },
    });

    if (!record) return null;
    return this.toDomainEntity(record);
  }

  public async findByCode(instituteId: string, code: string): Promise<ProgramEntity | null> {
    if (!instituteId || !code) return null;

    const record = await db.program.findUnique({
      where: {
        program_code_unique: {
          instituteId,
          code: code.trim().toUpperCase(),
        },
      },
    });

    if (!record) return null;
    return this.toDomainEntity(record);
  }

  public async findByName(instituteId: string, name: string): Promise<ProgramEntity | null> {
    if (!instituteId || !name) return null;

    const record = await db.program.findUnique({
      where: {
        program_name_unique: {
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
    options?: ListProgramsOptions,
  ): Promise<ProgramEntity[]> {
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

    const records = await db.program.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    return records.map((record) => this.toDomainEntity(record));
  }

  public async update(entity: ProgramEntity): Promise<ProgramEntity> {
    const existing = await this.findById(entity.instituteId, entity.id);
    if (!existing) {
      throw new NotFoundError(
        `Program record "${entity.id}" not found in institute "${entity.instituteId}".`,
      );
    }

    try {
      const record = await db.program.update({
        where: { id: entity.id },
        data: {
          name: entity.name,
          description: entity.description,
          status: entity.status as ProgramStatus,
          updatedAt: entity.updatedAt,
          deletedAt: entity.deletedAt,
        },
      });

      return this.toDomainEntity(record);
    } catch (error: any) {
      if (error?.code === 'P2025') {
        throw new NotFoundError(
          `Program record "${entity.id}" not found in institute "${entity.instituteId}".`,
        );
      }
      if (error?.code === 'P2002') {
        throw new ConflictError(
          `Program with name "${entity.name}" already exists in institute "${entity.instituteId}".`,
        );
      }
      throw error;
    }
  }

  public async existsByCode(instituteId: string, code: string): Promise<boolean> {
    if (!instituteId || !code) return false;

    const count = await db.program.count({
      where: {
        instituteId,
        code: code.trim().toUpperCase(),
      },
    });

    return count > 0;
  }

  public async existsByName(instituteId: string, name: string): Promise<boolean> {
    if (!instituteId || !name) return false;

    const count = await db.program.count({
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
  }): ProgramEntity {
    return ProgramEntity.from({
      id: record.id,
      instituteId: record.instituteId,
      name: record.name,
      code: record.code,
      description: record.description,
      status: record.status as ProgramStatus,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      deletedAt: record.deletedAt,
    });
  }
}
