import { db } from '@coaching-os/database';
import { ConflictError, NotFoundError, ValidationError } from '@coaching-os/shared';
import { HomeworkEntity, type HomeworkProps } from '../../domain/entities/homework.entity';
import { HomeworkRepository } from '../../domain/repositories/homework.repository';

export class PrismaHomeworkRepository implements HomeworkRepository {
  private mapToDomain(model: {
    id: string;
    instituteId: string;
    batchId: string;
    title: string;
    description: string | null;
    attachmentUrl: string | null;
    publishedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): HomeworkEntity {
    const props: HomeworkProps = {
      id: model.id,
      instituteId: model.instituteId,
      batchId: model.batchId,
      title: model.title,
      description: model.description,
      attachmentUrl: model.attachmentUrl,
      publishedAt: model.publishedAt,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    };
    return HomeworkEntity.from(props);
  }

  public async findById(instituteId: string, id: string): Promise<HomeworkEntity | null> {
    const model = await db.homework.findFirst({
      where: {
        id,
        instituteId,
      },
    });

    if (!model) return null;
    return this.mapToDomain(model);
  }

  public async listByBatch(instituteId: string, batchId: string): Promise<HomeworkEntity[]> {
    const models = await db.homework.findMany({
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

  public async create(entity: HomeworkEntity): Promise<HomeworkEntity> {
    try {
      const model = await db.homework.create({
        data: {
          id: entity.id,
          instituteId: entity.instituteId,
          batchId: entity.batchId,
          title: entity.title,
          description: entity.description,
          attachmentUrl: entity.attachmentUrl,
          publishedAt: entity.publishedAt,
          createdAt: entity.createdAt,
          updatedAt: entity.updatedAt,
        },
      });

      return this.mapToDomain(model);
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new ConflictError(`Homework record with ID "${entity.id}" already exists.`);
      }
      if (error?.code === 'P2003') {
        throw new ValidationError(
          `Foreign key constraint failure: Target institute "${entity.instituteId}" or batch "${entity.batchId}" does not exist.`,
        );
      }
      throw error;
    }
  }

  public async update(entity: HomeworkEntity): Promise<HomeworkEntity> {
    const existing = await this.findById(entity.instituteId, entity.id);
    if (!existing) {
      throw new NotFoundError(
        `Homework with ID "${entity.id}" not found in institute "${entity.instituteId}".`,
      );
    }

    try {
      const model = await db.homework.update({
        where: {
          id: entity.id,
        },
        data: {
          title: entity.title,
          description: entity.description,
          attachmentUrl: entity.attachmentUrl,
          publishedAt: entity.publishedAt,
          updatedAt: entity.updatedAt,
        },
      });

      return this.mapToDomain(model);
    } catch (error: any) {
      if (error?.code === 'P2025') {
        throw new NotFoundError(`Homework with ID "${entity.id}" not found.`);
      }
      throw error;
    }
  }

  public async delete(instituteId: string, id: string): Promise<boolean> {
    const existing = await this.findById(instituteId, id);
    if (!existing) {
      return false;
    }

    await db.homework.delete({
      where: {
        id,
      },
    });

    return true;
  }
}
