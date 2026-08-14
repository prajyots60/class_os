import type { AnnouncementEntity } from '../../domain/entities/announcement.entity';
import type { AnnouncementStatus, AnnouncementTargetType } from '../../domain/types';

export interface AnnouncementDTO {
  id: string;
  instituteId: string;
  targetType: AnnouncementTargetType;
  targetBatchId: string | null;
  title: string;
  content: string;
  status: AnnouncementStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export function toAnnouncementDTO(entity: AnnouncementEntity): AnnouncementDTO {
  return {
    id: entity.id,
    instituteId: entity.instituteId,
    targetType: entity.targetType,
    targetBatchId: entity.targetBatchId,
    title: entity.title,
    content: entity.content,
    status: entity.status,
    publishedAt: entity.publishedAt ? entity.publishedAt.toISOString() : null,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
}
