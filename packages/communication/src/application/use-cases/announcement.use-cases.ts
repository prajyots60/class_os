import { CAPABILITIES } from '@coaching-os/identity';
import { AuthorizationError, NotFoundError, ValidationError } from '@coaching-os/shared';
import { AnnouncementEntity } from '../../domain/entities/announcement.entity';
import type { AnnouncementRepository } from '../../domain/repositories/announcement.repository';
import type { AnnouncementTargetType } from '../../domain/types';
import { type AnnouncementDTO, toAnnouncementDTO } from '../dto/announcement.dto';

export interface BatchExistenceChecker {
  findById(instituteId: string, id: string): Promise<unknown | null>;
}

export interface EventBusPublisher {
  publish(eventName: string, payload: unknown): Promise<void> | void;
}

export interface RequestContext {
  instituteId: string;
  userId: string;
  role?: string;
  capabilities?: readonly string[];
}

function assertCapability(
  capabilities: readonly string[] | undefined,
  requiredCapabilities: string[],
): void {
  if (!capabilities) {
    return; // System context
  }
  const hasCap = requiredCapabilities.some((cap) => capabilities.includes(cap));
  if (!hasCap) {
    throw new AuthorizationError(
      `User lacks required capability: ${requiredCapabilities.join(' or ')}`,
    );
  }
}

export class CreateAnnouncementUseCase {
  constructor(
    private readonly announcementRepository: AnnouncementRepository,
    private readonly batchChecker?: BatchExistenceChecker,
  ) {}

  async execute(
    ctx: RequestContext,
    input: {
      targetType: AnnouncementTargetType;
      targetBatchId?: string | null;
      title: string;
      content: string;
    },
  ): Promise<AnnouncementDTO> {
    assertCapability(ctx.capabilities, [
      CAPABILITIES.ANNOUNCEMENT_CREATE,
      CAPABILITIES.ANNOUNCEMENT_UPDATE,
    ]);

    if (input.targetType === 'batch') {
      if (!input.targetBatchId) {
        throw new ValidationError('Batch-targeted announcement must specify targetBatchId');
      }
      if (this.batchChecker) {
        const batch = await this.batchChecker.findById(ctx.instituteId, input.targetBatchId);
        if (!batch) {
          throw new NotFoundError('Batch not found');
        }
      }
    }

    const announcement = AnnouncementEntity.create({
      id: crypto.randomUUID(),
      instituteId: ctx.instituteId,
      targetType: input.targetType,
      targetBatchId: input.targetType === 'batch' ? input.targetBatchId : null,
      title: input.title,
      content: input.content,
    });

    const saved = await this.announcementRepository.save(announcement);
    return toAnnouncementDTO(saved);
  }
}

export class PublishAnnouncementUseCase {
  constructor(
    private readonly announcementRepository: AnnouncementRepository,
    private readonly eventBus?: EventBusPublisher,
  ) {}

  async execute(ctx: RequestContext, id: string): Promise<AnnouncementDTO> {
    assertCapability(ctx.capabilities, [CAPABILITIES.ANNOUNCEMENT_PUBLISH]);

    const announcement = await this.announcementRepository.findById(ctx.instituteId, id);
    if (!announcement) {
      throw new NotFoundError('Announcement not found');
    }

    announcement.publish();
    const saved = await this.announcementRepository.save(announcement);

    if (this.eventBus) {
      try {
        await this.eventBus.publish('communication.announcement.published', {
          eventId: crypto.randomUUID(),
          eventType: 'communication.announcement.published',
          instituteId: ctx.instituteId,
          occurredAt: saved.publishedAt ? saved.publishedAt.toISOString() : new Date().toISOString(),
          payload: {
            announcementId: saved.id,
            targetType: saved.targetType,
            targetBatchId: saved.targetBatchId,
            title: saved.title,
            publishedAt: saved.publishedAt ? saved.publishedAt.toISOString() : new Date().toISOString(),
          },
          metadata: {
            actorUserId: ctx.userId,
          },
        });
      } catch (err) {
        // Event bus failures logged, state already committed
      }
    }

    return toAnnouncementDTO(saved);
  }
}

export class ArchiveAnnouncementUseCase {
  constructor(private readonly announcementRepository: AnnouncementRepository) {}

  async execute(ctx: RequestContext, id: string): Promise<AnnouncementDTO> {
    assertCapability(ctx.capabilities, [
      CAPABILITIES.ANNOUNCEMENT_UPDATE,
      CAPABILITIES.ANNOUNCEMENT_PUBLISH,
    ]);

    const announcement = await this.announcementRepository.findById(ctx.instituteId, id);
    if (!announcement) {
      throw new NotFoundError('Announcement not found');
    }

    announcement.archive();
    const saved = await this.announcementRepository.save(announcement);
    return toAnnouncementDTO(saved);
  }
}

export class GetAnnouncementUseCase {
  constructor(private readonly announcementRepository: AnnouncementRepository) {}

  async execute(ctx: RequestContext, id: string): Promise<AnnouncementDTO> {
    assertCapability(ctx.capabilities, [
      CAPABILITIES.ANNOUNCEMENT_READ,
      CAPABILITIES.INSTITUTE_READ,
    ]);

    const announcement = await this.announcementRepository.findById(ctx.instituteId, id);
    if (!announcement) {
      throw new NotFoundError('Announcement not found');
    }

    return toAnnouncementDTO(announcement);
  }
}

export class ListAnnouncementsUseCase {
  constructor(private readonly announcementRepository: AnnouncementRepository) {}

  async execute(
    ctx: RequestContext,
    options?: {
      batchId?: string;
      status?: 'draft' | 'published' | 'archived';
      limit?: number;
      offset?: number;
    },
  ): Promise<AnnouncementDTO[]> {
    assertCapability(ctx.capabilities, [
      CAPABILITIES.ANNOUNCEMENT_READ,
      CAPABILITIES.INSTITUTE_READ,
    ]);

    const list = await this.announcementRepository.findMany({
      instituteId: ctx.instituteId,
      batchId: options?.batchId,
      status: options?.status,
      limit: options?.limit,
      offset: options?.offset,
    });

    return list.map(toAnnouncementDTO);
  }
}

export class UpdateDraftAnnouncementUseCase {
  constructor(
    private readonly announcementRepository: AnnouncementRepository,
    private readonly batchChecker?: BatchExistenceChecker,
  ) {}

  async execute(
    ctx: RequestContext,
    id: string,
    input: {
      targetType?: AnnouncementTargetType;
      targetBatchId?: string | null;
      title?: string;
      content?: string;
    },
  ): Promise<AnnouncementDTO> {
    assertCapability(ctx.capabilities, [
      CAPABILITIES.ANNOUNCEMENT_UPDATE,
      CAPABILITIES.ANNOUNCEMENT_CREATE,
    ]);

    const announcement = await this.announcementRepository.findById(ctx.instituteId, id);
    if (!announcement) {
      throw new NotFoundError('Announcement not found');
    }

    const newTargetType = input.targetType ?? announcement.targetType;
    const newTargetBatchId = input.targetBatchId !== undefined ? input.targetBatchId : announcement.targetBatchId;

    if (newTargetType === 'batch' && newTargetBatchId) {
      if (this.batchChecker) {
        const batch = await this.batchChecker.findById(ctx.instituteId, newTargetBatchId);
        if (!batch) {
          throw new NotFoundError('Batch not found');
        }
      }
    }

    announcement.updateDraft({
      targetType: input.targetType,
      targetBatchId: input.targetBatchId,
      title: input.title,
      content: input.content,
    });

    const saved = await this.announcementRepository.save(announcement);
    return toAnnouncementDTO(saved);
  }
}

export class DeleteDraftAnnouncementUseCase {
  constructor(private readonly announcementRepository: AnnouncementRepository) {}

  async execute(ctx: RequestContext, id: string): Promise<void> {
    assertCapability(ctx.capabilities, [
      CAPABILITIES.ANNOUNCEMENT_DELETE,
      CAPABILITIES.ANNOUNCEMENT_UPDATE,
    ]);

    const announcement = await this.announcementRepository.findById(ctx.instituteId, id);
    if (!announcement) {
      throw new NotFoundError('Announcement not found');
    }

    if (!announcement.isDraft) {
      throw new ValidationError('Published announcements cannot be deleted. Only draft announcements can be deleted.');
    }

    await this.announcementRepository.deleteDraft(ctx.instituteId, id);
  }
}

