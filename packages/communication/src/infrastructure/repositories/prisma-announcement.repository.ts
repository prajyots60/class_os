import { db } from '@coaching-os/database';
import { ConflictError, NotFoundError } from '@coaching-os/shared';
import { AnnouncementEntity } from '../../domain/entities/announcement.entity';
import type {
  AnnouncementRepository,
  ListAnnouncementsOptions,
} from '../../domain/repositories/announcement.repository';

export class PrismaAnnouncementRepository implements AnnouncementRepository {
  async findById(instituteId: string, id: string): Promise<AnnouncementEntity | null> {
    try {
      const row = await db.announcement.findFirst({
        where: {
          id,
          instituteId,
        },
      });

      if (!row) {
        return null;
      }

      return this.toEntity(row);
    } catch (error) {
      this.handlePrismaError(error);
      throw error;
    }
  }

  async findMany(options: ListAnnouncementsOptions): Promise<AnnouncementEntity[]> {
    try {
      const whereClause: {
        instituteId: string;
        batchId?: string | null;
        publishedAt?: { not: null } | null;
      } = {
        instituteId: options.instituteId,
      };

      if (options.batchId) {
        whereClause.batchId = options.batchId;
      }

      if (options.status === 'published') {
        whereClause.publishedAt = { not: null };
      } else if (options.status === 'draft') {
        whereClause.publishedAt = null;
      }

      const rows = await db.announcement.findMany({
        where: whereClause,
        orderBy: {
          createdAt: 'desc',
        },
        take: options.limit ?? 20,
        skip: options.offset ?? 0,
      });

      return rows.map((row) => this.toEntity(row));
    } catch (error) {
      this.handlePrismaError(error);
      throw error;
    }
  }

  async save(announcement: AnnouncementEntity): Promise<AnnouncementEntity> {
    try {
      const data = {
        instituteId: announcement.instituteId,
        batchId: announcement.targetBatchId,
        title: announcement.title,
        body: announcement.content,
        publishedAt: announcement.publishedAt,
        updatedAt: announcement.updatedAt,
      };

      const row = await db.announcement.upsert({
        where: {
          id: announcement.id,
        },
        create: {
          id: announcement.id,
          ...data,
          createdAt: announcement.createdAt,
        },
        update: data,
      });

      return this.toEntity(row);
    } catch (error) {
      this.handlePrismaError(error);
      throw error;
    }
  }

  async deleteDraft(instituteId: string, id: string): Promise<void> {
    try {
      const existing = await db.announcement.findFirst({
        where: {
          id,
          instituteId,
        },
      });

      if (!existing) {
        throw new NotFoundError(`Announcement with id ${id} not found`);
      }

      await db.announcement.delete({
        where: {
          id,
        },
      });
    } catch (error) {
      this.handlePrismaError(error);
      throw error;
    }
  }

  private toEntity(row: {
    id: string;
    instituteId: string;
    batchId: string | null;
    title: string;
    body: string;
    publishedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): AnnouncementEntity {
    return AnnouncementEntity.create({
      id: row.id,
      instituteId: row.instituteId,
      targetType: row.batchId ? 'batch' : 'institute',
      targetBatchId: row.batchId,
      title: row.title,
      content: row.body,
      publishedAt: row.publishedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  private handlePrismaError(error: unknown): void {
    if (typeof error === 'object' && error !== null && 'code' in error) {
      const code = (error as { code: string }).code;
      if (code === 'P2002') {
        throw new ConflictError('An announcement conflict occurred');
      }
      if (code === 'P2025') {
        throw new NotFoundError('Announcement record not found');
      }
    }
  }
}
