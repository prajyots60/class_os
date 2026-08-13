import { db } from '@coaching-os/database';
import { ConflictError, NotFoundError, ValidationError } from '@coaching-os/shared';
import { TestEntity, type TestProps, type TestStatus } from '../../domain/entities/test.entity';
import { TestRepository } from '../../domain/repositories/test.repository';

export class PrismaTestRepository implements TestRepository {
  private mapToDomain(model: {
    id: string;
    instituteId: string;
    batchId: string;
    title: string;
    maximumMarks: number;
    scheduledDate: Date | null;
    status: TestStatus;
    createdAt: Date;
    updatedAt: Date;
  }): TestEntity {
    const props: TestProps = {
      id: model.id,
      instituteId: model.instituteId,
      batchId: model.batchId,
      title: model.title,
      maximumMarks: model.maximumMarks,
      scheduledDate: model.scheduledDate,
      status: model.status as TestStatus,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    };
    return TestEntity.from(props);
  }

  public async findById(instituteId: string, id: string): Promise<TestEntity | null> {
    const model = await db.test.findFirst({
      where: {
        id,
        instituteId,
      },
    });

    if (!model) return null;
    return this.mapToDomain(model);
  }

  public async listByBatch(instituteId: string, batchId: string): Promise<TestEntity[]> {
    const models = await db.test.findMany({
      where: {
        instituteId,
        batchId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return models.map((m) => this.mapToDomain(m));
  }

  public async create(entity: TestEntity): Promise<TestEntity> {
    try {
      const model = await db.test.create({
        data: {
          id: entity.id,
          instituteId: entity.instituteId,
          batchId: entity.batchId,
          title: entity.title,
          maximumMarks: entity.maximumMarks,
          scheduledDate: entity.scheduledDate,
          status: entity.status,
          createdAt: entity.createdAt,
          updatedAt: entity.updatedAt,
        },
      });

      return this.mapToDomain(model);
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new ConflictError(`Test record with ID "${entity.id}" already exists.`);
      }
      if (error?.code === 'P2003') {
        throw new ValidationError(
          `Foreign key constraint failure: Target institute "${entity.instituteId}" or batch "${entity.batchId}" does not exist.`,
        );
      }
      throw error;
    }
  }

  public async update(entity: TestEntity): Promise<TestEntity> {
    const existing = await this.findById(entity.instituteId, entity.id);
    if (!existing) {
      throw new NotFoundError(
        `Test with ID "${entity.id}" not found in institute "${entity.instituteId}".`,
      );
    }

    try {
      const model = await db.test.update({
        where: {
          id: entity.id,
        },
        data: {
          title: entity.title,
          maximumMarks: entity.maximumMarks,
          scheduledDate: entity.scheduledDate,
          status: entity.status,
          updatedAt: entity.updatedAt,
        },
      });

      return this.mapToDomain(model);
    } catch (error: any) {
      if (error?.code === 'P2025') {
        throw new NotFoundError(`Test with ID "${entity.id}" not found.`);
      }
      throw error;
    }
  }

  public async delete(instituteId: string, id: string): Promise<boolean> {
    const existing = await this.findById(instituteId, id);
    if (!existing) {
      return false;
    }

    await db.test.delete({
      where: {
        id,
      },
    });

    return true;
  }
}
