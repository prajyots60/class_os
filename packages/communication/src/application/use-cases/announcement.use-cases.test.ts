import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CAPABILITIES } from '@coaching-os/identity';
import { AuthorizationError, NotFoundError, ValidationError } from '@coaching-os/shared';
import { AnnouncementEntity } from '../../domain/entities/announcement.entity';
import type { AnnouncementRepository } from '../../domain/repositories/announcement.repository';
import {
  ArchiveAnnouncementUseCase,
  CreateAnnouncementUseCase,
  DeleteDraftAnnouncementUseCase,
  GetAnnouncementUseCase,
  ListAnnouncementsUseCase,
  PublishAnnouncementUseCase,
  RequestContext,
  UpdateDraftAnnouncementUseCase,
} from './announcement.use-cases';

class InMemoryAnnouncementRepository implements AnnouncementRepository {
  private announcements: Map<string, AnnouncementEntity> = new Map();

  async findById(instituteId: string, id: string): Promise<AnnouncementEntity | null> {
    const found = this.announcements.get(id);
    if (found && found.instituteId === instituteId) {
      return found;
    }
    return null;
  }

  async findMany(options: {
    instituteId: string;
    batchId?: string;
    status?: 'draft' | 'published' | 'archived';
  }): Promise<AnnouncementEntity[]> {
    let result = Array.from(this.announcements.values()).filter(
      (a) => a.instituteId === options.instituteId,
    );

    if (options.batchId) {
      result = result.filter((a) => a.targetBatchId === options.batchId);
    }
    if (options.status) {
      result = result.filter((a) => a.status === options.status);
    }

    return result;
  }

  async save(announcement: AnnouncementEntity): Promise<AnnouncementEntity> {
    this.announcements.set(announcement.id, announcement);
    return announcement;
  }

  async deleteDraft(instituteId: string, id: string): Promise<void> {
    const existing = await this.findById(instituteId, id);
    if (existing) {
      this.announcements.delete(id);
    }
  }
}

describe('Announcement Use Cases Suite', () => {
  let repository: InMemoryAnnouncementRepository;
  let mockBatchChecker: { findById: (instituteId: string, id: string) => Promise<unknown | null> };
  let mockEventBus: { publish: (eventName: string, payload: unknown) => Promise<void> | void };

  const ownerCtx: RequestContext = {
    instituteId: 'inst-1',
    userId: 'user-owner',
    role: 'owner',
    capabilities: [
      CAPABILITIES.ANNOUNCEMENT_READ,
      CAPABILITIES.ANNOUNCEMENT_CREATE,
      CAPABILITIES.ANNOUNCEMENT_UPDATE,
      CAPABILITIES.ANNOUNCEMENT_DELETE,
      CAPABILITIES.ANNOUNCEMENT_PUBLISH,
    ],
  };

  const unauthorizedCtx: RequestContext = {
    instituteId: 'inst-1',
    userId: 'user-parent',
    role: 'parent',
    capabilities: [CAPABILITIES.ANNOUNCEMENT_READ],
  };

  beforeEach(() => {
    repository = new InMemoryAnnouncementRepository();
    mockBatchChecker = {
      findById: vi.fn(async (_instituteId: string, _id: string) => ({ id: 'batch-1' })),
    };
    mockEventBus = {
      publish: vi.fn(async () => undefined),
    };
  });

  describe('CreateAnnouncementUseCase', () => {
    it('creates an institute-wide announcement when authorized', async () => {
      const useCase = new CreateAnnouncementUseCase(repository, mockBatchChecker);
      const result = await useCase.execute(ownerCtx, {
        targetType: 'institute',
        title: 'Institute Reopening',
        content: 'Classes resume Monday.',
      });

      expect(result.id).toBeDefined();
      expect(result.instituteId).toBe('inst-1');
      expect(result.targetType).toBe('institute');
      expect(result.targetBatchId).toBeNull();
      expect(result.status).toBe('draft');
    });

    it('creates a batch-targeted announcement when batch is verified', async () => {
      const useCase = new CreateAnnouncementUseCase(repository, mockBatchChecker);
      const result = await useCase.execute(ownerCtx, {
        targetType: 'batch',
        targetBatchId: 'batch-1',
        title: 'Batch Physics Quiz',
        content: 'Prepare chapter 4.',
      });

      expect(result.targetType).toBe('batch');
      expect(result.targetBatchId).toBe('batch-1');
      expect(mockBatchChecker.findById).toHaveBeenCalledWith('inst-1', 'batch-1');
    });

    it('rejects batch-targeted creation if batch is not found in institute', async () => {
      mockBatchChecker.findById = vi.fn(async () => null);
      const useCase = new CreateAnnouncementUseCase(repository, mockBatchChecker);

      await expect(
        useCase.execute(ownerCtx, {
          targetType: 'batch',
          targetBatchId: 'foreign-batch',
          title: 'Title',
          content: 'Content',
        }),
      ).rejects.toThrow(NotFoundError);
    });

    it('throws AuthorizationError when user lacks ANNOUNCEMENT_CREATE capability', async () => {
      const useCase = new CreateAnnouncementUseCase(repository, mockBatchChecker);

      await expect(
        useCase.execute(unauthorizedCtx, {
          targetType: 'institute',
          title: 'Title',
          content: 'Content',
        }),
      ).rejects.toThrow(AuthorizationError);
    });
  });

  describe('PublishAnnouncementUseCase', () => {
    it('publishes draft announcement and emits communication.announcement.published event', async () => {
      const createUseCase = new CreateAnnouncementUseCase(repository, mockBatchChecker);
      const created = await createUseCase.execute(ownerCtx, {
        targetType: 'institute',
        title: 'Title',
        content: 'Content',
      });

      const publishUseCase = new PublishAnnouncementUseCase(repository, mockEventBus);
      const published = await publishUseCase.execute(ownerCtx, created.id);

      expect(published.status).toBe('published');
      expect(published.publishedAt).not.toBeNull();
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        'communication.announcement.published',
        expect.objectContaining({
          eventType: 'communication.announcement.published',
          instituteId: 'inst-1',
          payload: expect.objectContaining({
            announcementId: created.id,
            targetType: 'institute',
            title: 'Title',
          }),
        }),
      );
    });

    it('throws AuthorizationError when user lacks ANNOUNCEMENT_PUBLISH capability', async () => {
      const publishUseCase = new PublishAnnouncementUseCase(repository, mockEventBus);
      await expect(publishUseCase.execute(unauthorizedCtx, 'ann-1')).rejects.toThrow(
        AuthorizationError,
      );
    });

    it('throws NotFoundError for non-existent or foreign announcement', async () => {
      const publishUseCase = new PublishAnnouncementUseCase(repository, mockEventBus);
      await expect(publishUseCase.execute(ownerCtx, 'non-existent')).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe('ArchiveAnnouncementUseCase', () => {
    it('archives a published announcement', async () => {
      const createUseCase = new CreateAnnouncementUseCase(repository, mockBatchChecker);
      const created = await createUseCase.execute(ownerCtx, {
        targetType: 'institute',
        title: 'Title',
        content: 'Content',
      });

      const publishUseCase = new PublishAnnouncementUseCase(repository);
      await publishUseCase.execute(ownerCtx, created.id);

      const archiveUseCase = new ArchiveAnnouncementUseCase(repository);
      const archived = await archiveUseCase.execute(ownerCtx, created.id);

      expect(archived.status).toBe('archived');
    });

    it('throws ValidationError if attempting to archive a draft announcement', async () => {
      const createUseCase = new CreateAnnouncementUseCase(repository, mockBatchChecker);
      const created = await createUseCase.execute(ownerCtx, {
        targetType: 'institute',
        title: 'Title',
        content: 'Content',
      });

      const archiveUseCase = new ArchiveAnnouncementUseCase(repository);
      await expect(archiveUseCase.execute(ownerCtx, created.id)).rejects.toThrow(
        ValidationError,
      );
    });
  });

  describe('UpdateDraftAnnouncementUseCase & DeleteDraftAnnouncementUseCase', () => {
    it('allows updating a draft announcement', async () => {
      const createUseCase = new CreateAnnouncementUseCase(repository, mockBatchChecker);
      const created = await createUseCase.execute(ownerCtx, {
        targetType: 'institute',
        title: 'Old Title',
        content: 'Old Content',
      });

      const updateUseCase = new UpdateDraftAnnouncementUseCase(repository, mockBatchChecker);
      const updated = await updateUseCase.execute(ownerCtx, created.id, {
        title: 'New Title',
      });

      expect(updated.title).toBe('New Title');
    });

    it('rejects updating a published announcement', async () => {
      const createUseCase = new CreateAnnouncementUseCase(repository, mockBatchChecker);
      const created = await createUseCase.execute(ownerCtx, {
        targetType: 'institute',
        title: 'Title',
        content: 'Content',
      });

      const publishUseCase = new PublishAnnouncementUseCase(repository);
      await publishUseCase.execute(ownerCtx, created.id);

      const updateUseCase = new UpdateDraftAnnouncementUseCase(repository, mockBatchChecker);
      await expect(
        updateUseCase.execute(ownerCtx, created.id, { title: 'Changed' }),
      ).rejects.toThrow(ValidationError);
    });

    it('allows deleting a draft announcement', async () => {
      const createUseCase = new CreateAnnouncementUseCase(repository, mockBatchChecker);
      const created = await createUseCase.execute(ownerCtx, {
        targetType: 'institute',
        title: 'Draft to Delete',
        content: 'Content',
      });

      const deleteUseCase = new DeleteDraftAnnouncementUseCase(repository);
      await deleteUseCase.execute(ownerCtx, created.id);

      const getUseCase = new GetAnnouncementUseCase(repository);
      await expect(getUseCase.execute(ownerCtx, created.id)).rejects.toThrow(NotFoundError);
    });

    it('prevents deleting a published announcement', async () => {
      const createUseCase = new CreateAnnouncementUseCase(repository, mockBatchChecker);
      const created = await createUseCase.execute(ownerCtx, {
        targetType: 'institute',
        title: 'Title',
        content: 'Content',
      });

      const publishUseCase = new PublishAnnouncementUseCase(repository);
      await publishUseCase.execute(ownerCtx, created.id);

      const deleteUseCase = new DeleteDraftAnnouncementUseCase(repository);
      await expect(deleteUseCase.execute(ownerCtx, created.id)).rejects.toThrow(
        ValidationError,
      );
    });
  });
});
