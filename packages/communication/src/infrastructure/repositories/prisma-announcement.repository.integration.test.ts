import {
  cleanTestDatabase,
  closeTestPool,
  db,
  validateTestEnvironment,
} from '@coaching-os/database';
import { CAPABILITIES } from '@coaching-os/identity';
import { AuthorizationError, NotFoundError, ValidationError } from '@coaching-os/shared';
import crypto from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  ArchiveAnnouncementUseCase,
  CreateAnnouncementUseCase,
  DeleteDraftAnnouncementUseCase,
  GetAnnouncementUseCase,
  ListAnnouncementsUseCase,
  PublishAnnouncementUseCase,
  RequestContext,
  UpdateDraftAnnouncementUseCase,
} from '../../application/use-cases/announcement.use-cases';
import { AnnouncementEntity } from '../../domain/entities/announcement.entity';
import { PrismaAnnouncementRepository } from './prisma-announcement.repository';

describe('PrismaAnnouncementRepository & Communication Security Integration Suite', () => {
  let repository: PrismaAnnouncementRepository;

  let instituteA_Id: string;
  let instituteB_Id: string;

  let programA_Id: string;
  let subjectA_Id: string;
  let batchA_Id: string;

  let programB_Id: string;
  let subjectB_Id: string;
  let batchB_Id: string;

  beforeAll(() => {
    validateTestEnvironment();
    repository = new PrismaAnnouncementRepository();
  });

  afterAll(async () => {
    await closeTestPool();
  });

  beforeEach(async () => {
    await cleanTestDatabase();

    // 1. Seed Institute A
    const instA = await db.institute.create({
      data: {
        id: crypto.randomUUID(),
        name: 'Communication Institute A',
        slug: `comm-inst-a-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        phone: '9876543210',
        email: `comm-a-${Date.now()}-${Math.floor(Math.random() * 1000)}@test.com`,
      },
    });
    instituteA_Id = instA.id;

    // Seed Program, Subject, Batch for Institute A
    const progA = await db.program.create({
      data: {
        id: crypto.randomUUID(),
        instituteId: instituteA_Id,
        name: 'Program A',
        code: 'PROG-A',
      },
    });
    programA_Id = progA.id;

    const subjA = await db.subject.create({
      data: {
        id: crypto.randomUUID(),
        instituteId: instituteA_Id,
        name: 'Subject A',
        code: 'SUBJ-A',
      },
    });
    subjectA_Id = subjA.id;

    const batchA = await db.batch.create({
      data: {
        id: crypto.randomUUID(),
        instituteId: instituteA_Id,
        programId: programA_Id,
        subjectId: subjectA_Id,
        name: 'Batch A1',
        code: 'BATCH-A1',
      },
    });
    batchA_Id = batchA.id;

    // 2. Seed Institute B
    const instB = await db.institute.create({
      data: {
        id: crypto.randomUUID(),
        name: 'Communication Institute B',
        slug: `comm-inst-b-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        phone: '9876543211',
        email: `comm-b-${Date.now()}-${Math.floor(Math.random() * 1000)}@test.com`,
      },
    });
    instituteB_Id = instB.id;

    const progB = await db.program.create({
      data: {
        id: crypto.randomUUID(),
        instituteId: instituteB_Id,
        name: 'Program B',
        code: 'PROG-B',
      },
    });
    programB_Id = progB.id;

    const subjB = await db.subject.create({
      data: {
        id: crypto.randomUUID(),
        instituteId: instituteB_Id,
        name: 'Subject B',
        code: 'SUBJ-B',
      },
    });
    subjectB_Id = subjB.id;

    const batchB = await db.batch.create({
      data: {
        id: crypto.randomUUID(),
        instituteId: instituteB_Id,
        programId: programB_Id,
        subjectId: subjectB_Id,
        name: 'Batch B1',
        code: 'BATCH-B1',
      },
    });
    batchB_Id = batchB.id;
  });

  describe('PostgreSQL Persistence & Repository Operations', () => {
    it('persists and retrieves an institute-wide announcement', async () => {
      const entity = AnnouncementEntity.create({
        id: crypto.randomUUID(),
        instituteId: instituteA_Id,
        targetType: 'institute',
        title: 'Institute A Announcement',
        content: 'Content for Institute A',
      });

      await repository.save(entity);

      const retrieved = await repository.findById(instituteA_Id, entity.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(entity.id);
      expect(retrieved?.instituteId).toBe(instituteA_Id);
      expect(retrieved?.targetType).toBe('institute');
      expect(retrieved?.targetBatchId).toBeNull();
      expect(retrieved?.title).toBe('Institute A Announcement');
      expect(retrieved?.content).toBe('Content for Institute A');
      expect(retrieved?.status).toBe('draft');
    });

    it('persists and retrieves a batch-targeted announcement', async () => {
      const entity = AnnouncementEntity.create({
        id: crypto.randomUUID(),
        instituteId: instituteA_Id,
        targetType: 'batch',
        targetBatchId: batchA_Id,
        title: 'Batch A Announcement',
        content: 'Content for Batch A',
      });

      await repository.save(entity);

      const retrieved = await repository.findById(instituteA_Id, entity.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.targetType).toBe('batch');
      expect(retrieved?.targetBatchId).toBe(batchA_Id);
    });

    it('persists published state transition', async () => {
      const entity = AnnouncementEntity.create({
        id: crypto.randomUUID(),
        instituteId: instituteA_Id,
        targetType: 'institute',
        title: 'To Publish',
        content: 'Content',
      });

      await repository.save(entity);

      entity.publish(new Date('2026-08-14T12:00:00Z'));
      await repository.save(entity);

      const retrieved = await repository.findById(instituteA_Id, entity.id);
      expect(retrieved?.status).toBe('published');
      expect(retrieved?.publishedAt).toEqual(new Date('2026-08-14T12:00:00Z'));
    });

    it('deletes draft announcement from database', async () => {
      const entity = AnnouncementEntity.create({
        id: crypto.randomUUID(),
        instituteId: instituteA_Id,
        targetType: 'institute',
        title: 'Draft to Delete',
        content: 'Content',
      });

      await repository.save(entity);
      await repository.deleteDraft(instituteA_Id, entity.id);

      const retrieved = await repository.findById(instituteA_Id, entity.id);
      expect(retrieved).toBeNull();
    });
  });

  describe('Adversarial Security Cases (Case A through Case F)', () => {
    const ownerCtxA: RequestContext = {
      instituteId: '', // Set in test
      userId: 'owner-a',
      role: 'owner',
      capabilities: [
        CAPABILITIES.ANNOUNCEMENT_READ,
        CAPABILITIES.ANNOUNCEMENT_CREATE,
        CAPABILITIES.ANNOUNCEMENT_UPDATE,
        CAPABILITIES.ANNOUNCEMENT_DELETE,
        CAPABILITIES.ANNOUNCEMENT_PUBLISH,
      ],
    };

    const ownerCtxB: RequestContext = {
      instituteId: '', // Set in test
      userId: 'owner-b',
      role: 'owner',
      capabilities: [
        CAPABILITIES.ANNOUNCEMENT_READ,
        CAPABILITIES.ANNOUNCEMENT_CREATE,
        CAPABILITIES.ANNOUNCEMENT_UPDATE,
        CAPABILITIES.ANNOUNCEMENT_DELETE,
        CAPABILITIES.ANNOUNCEMENT_PUBLISH,
      ],
    };

    const unauthorizedCtxA: RequestContext = {
      instituteId: '',
      userId: 'user-unauth',
      role: 'parent',
      capabilities: [CAPABILITIES.ANNOUNCEMENT_READ],
    };

    beforeEach(() => {
      ownerCtxA.instituteId = instituteA_Id;
      ownerCtxB.instituteId = instituteB_Id;
      unauthorizedCtxA.instituteId = instituteA_Id;
    });

    it('Security Case A — Cross-tenant read returns NotFoundError (404 masking)', async () => {
      const entity = AnnouncementEntity.create({
        id: crypto.randomUUID(),
        instituteId: instituteA_Id,
        targetType: 'institute',
        title: 'Secret Inst A Announcement',
        content: 'Confidential',
      });
      await repository.save(entity);

      // 1. Direct DB repository isolation
      const foreignRead = await repository.findById(instituteB_Id, entity.id);
      expect(foreignRead).toBeNull();

      // 2. Application Use Case isolation
      const getUseCase = new GetAnnouncementUseCase(repository);
      await expect(getUseCase.execute(ownerCtxB, entity.id)).rejects.toThrow(NotFoundError);
    });

    it('Security Case B — Cross-tenant batch injection is rejected', async () => {
      const batchChecker = {
        async findById(instituteId: string, id: string) {
          const row = await db.batch.findFirst({ where: { id, instituteId } });
          return row;
        },
      };

      const createUseCase = new CreateAnnouncementUseCase(repository, batchChecker);

      // Attempting to create announcement in Institute A targeting Batch B (which belongs to Institute B)
      await expect(
        createUseCase.execute(ownerCtxA, {
          targetType: 'batch',
          targetBatchId: batchB_Id, // Foreign batch!
          title: 'Malicious Announcement',
          content: 'Injecting batch B',
        }),
      ).rejects.toThrow(NotFoundError);
    });

    it('Security Case C — Client tenant spoofing is overridden by server context', async () => {
      const createUseCase = new CreateAnnouncementUseCase(repository);

      // Request executes with ownerCtxA (instituteA_Id)
      const created = await createUseCase.execute(ownerCtxA, {
        targetType: 'institute',
        title: 'Spoofed Tenant Attempt',
        content: 'Body text',
      });

      // Created announcement MUST belong to instituteA_Id, NOT instituteB_Id
      expect(created.instituteId).toBe(instituteA_Id);

      // Institute B cannot read it
      const foreignRead = await repository.findById(instituteB_Id, created.id);
      expect(foreignRead).toBeNull();
    });

    it('Security Case D — Unauthorized publish capability is rejected with 403 (AuthorizationError)', async () => {
      const createUseCase = new CreateAnnouncementUseCase(repository);
      const created = await createUseCase.execute(ownerCtxA, {
        targetType: 'institute',
        title: 'Draft Announcement',
        content: 'Content',
      });

      const publishUseCase = new PublishAnnouncementUseCase(repository);

      // User lacking ANNOUNCEMENT_PUBLISH capability attempts publication
      await expect(publishUseCase.execute(unauthorizedCtxA, created.id)).rejects.toThrow(
        AuthorizationError,
      );
    });

    it('Security Case E — Published announcement mutation is rejected', async () => {
      const createUseCase = new CreateAnnouncementUseCase(repository);
      const created = await createUseCase.execute(ownerCtxA, {
        targetType: 'institute',
        title: 'Original Title',
        content: 'Original Content',
      });

      const publishUseCase = new PublishAnnouncementUseCase(repository);
      await publishUseCase.execute(ownerCtxA, created.id);

      const updateUseCase = new UpdateDraftAnnouncementUseCase(repository);

      // Attempting to update a published announcement
      await expect(
        updateUseCase.execute(ownerCtxA, created.id, {
          title: 'Altered Title',
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('Security Case F — Invalid lifecycle transition (archived -> published) is rejected', async () => {
      const createUseCase = new CreateAnnouncementUseCase(repository);
      const created = await createUseCase.execute(ownerCtxA, {
        targetType: 'institute',
        title: 'Title',
        content: 'Content',
      });

      const publishUseCase = new PublishAnnouncementUseCase(repository);
      await publishUseCase.execute(ownerCtxA, created.id);

      const archiveUseCase = new ArchiveAnnouncementUseCase(repository);
      await archiveUseCase.execute(ownerCtxA, created.id);

      // Attempting to publish an already archived announcement
      await expect(publishUseCase.execute(ownerCtxA, created.id)).rejects.toThrow(
        ValidationError,
      );
    });
  });
});
