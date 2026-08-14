import type { ActivityEntity } from '../../domain/entities/activity.entity';
import type { ActivityEventType } from '../../domain/types';

export interface ActivityDTO {
  id: string;
  instituteId: string;
  studentId: string;
  eventType: ActivityEventType;
  title: string;
  description: string;
  occurredAt: string;
  actorName: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export function toActivityDTO(entity: ActivityEntity): ActivityDTO {
  return {
    id: entity.id,
    instituteId: entity.instituteId,
    studentId: entity.studentId,
    eventType: entity.eventType,
    title: entity.title,
    description: entity.description,
    occurredAt: entity.occurredAt.toISOString(),
    actorName: entity.actorName,
    metadata: entity.metadata,
    createdAt: entity.createdAt.toISOString(),
  };
}
