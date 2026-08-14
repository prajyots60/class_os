import type { AnnouncementEntity } from '../entities/announcement.entity';
import type { AnnouncementStatus } from '../types';

export interface ListAnnouncementsOptions {
  instituteId: string;
  batchId?: string;
  status?: AnnouncementStatus;
  limit?: number;
  offset?: number;
}

export interface AnnouncementRepository {
  findById(instituteId: string, id: string): Promise<AnnouncementEntity | null>;
  findMany(options: ListAnnouncementsOptions): Promise<AnnouncementEntity[]>;
  save(announcement: AnnouncementEntity): Promise<AnnouncementEntity>;
  deleteDraft(instituteId: string, id: string): Promise<void>;
}
