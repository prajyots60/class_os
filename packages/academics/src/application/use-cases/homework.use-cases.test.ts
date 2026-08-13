import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  cleanTestDatabase,
  createTestBatch,
  createTestInstitute,
  createTestUser,
  validateTestEnvironment,
} from '@coaching-os/database';
import {
  AuthorizationError,
  NotFoundError,
  ValidationError,
} from '@coaching-os/shared';
import {
  CreateInstituteMembershipUseCase,
  CreateSubjectUseCase,
  PrismaBatchRepository,
  PrismaInstituteMembershipRepository,
  PrismaSubjectRepository,
  type TenantContext,
} from '@coaching-os/identity';
import { PrismaHomeworkRepository } from '../../infrastructure/repositories/prisma-homework.repository';
import {
  CreateHomeworkUseCase,
  DeleteHomeworkUseCase,
  GetHomeworkUseCase,
  ListHomeworkForBatchUseCase,
  PublishHomeworkUseCase,
  UpdateHomeworkUseCase,
} from './homework.use-cases';

describe('Phase 2.3 — Homework Workflow Integration & Security Suite', () => {
  let membershipRepo: PrismaInstituteMembershipRepository;
  let subjectRepo: PrismaSubjectRepository;
  let batchRepo: PrismaBatchRepository;
  let homeworkRepo: PrismaHomeworkRepository;

  let createMembershipUseCase: CreateInstituteMembershipUseCase;
  let createSubjectUseCase: CreateSubjectUseCase;

  let createHomeworkUseCase: CreateHomeworkUseCase;
  let getHomeworkUseCase: GetHomeworkUseCase;
  let listHomeworkUseCase: ListHomeworkForBatchUseCase;
  let updateHomeworkUseCase: UpdateHomeworkUseCase;
  let publishHomeworkUseCase: PublishHomeworkUseCase;
  let deleteHomeworkUseCase: DeleteHomeworkUseCase;

  // Institute A (Owner & Batch A)
  let ownerContextA: TenantContext;
  let batchAId: string;

  // Institute B (Adversarial Tenant)
  let ownerContextB: TenantContext;
  let batchBId: string;

  beforeEach(async () => {
    validateTestEnvironment();
    await cleanTestDatabase();

    membershipRepo = new PrismaInstituteMembershipRepository();
    subjectRepo = new PrismaSubjectRepository();
    batchRepo = new PrismaBatchRepository();
    homeworkRepo = new PrismaHomeworkRepository();

    createMembershipUseCase = new CreateInstituteMembershipUseCase(membershipRepo);
    createSubjectUseCase = new CreateSubjectUseCase(subjectRepo);

    createHomeworkUseCase = new CreateHomeworkUseCase(homeworkRepo, batchRepo);
    getHomeworkUseCase = new GetHomeworkUseCase(homeworkRepo);
    listHomeworkUseCase = new ListHomeworkForBatchUseCase(homeworkRepo, batchRepo);
    updateHomeworkUseCase = new UpdateHomeworkUseCase(homeworkRepo);
    publishHomeworkUseCase = new PublishHomeworkUseCase(homeworkRepo);
    deleteHomeworkUseCase = new DeleteHomeworkUseCase(homeworkRepo);

    // Setup Institute A
    const instA = await createTestInstitute({
      name: 'Apex Academy A',
      slug: `apex-a-${crypto.randomUUID().substring(0, 6)}`,
    });

    const userOwnerA = await createTestUser();
    const ownerMemA = await createMembershipUseCase.execute({
      userId: userOwnerA.id,
      instituteId: instA.id,
      role: 'owner',
    });

    ownerContextA = {
      userId: userOwnerA.id,
      instituteId: instA.id,
      membershipId: ownerMemA.id,
      role: 'owner',
      status: 'active',
    };

    const subjectA = await createSubjectUseCase.execute(ownerContextA, {
      name: 'Physics',
      code: 'PHY-101',
    });

    const batchA = await createTestBatch(instA.id, subjectA.id, {
      name: 'Batch Alpha 2026',
      code: 'PHY-ALPHA-26',
    });
    batchAId = batchA.id;

    // Setup Institute B (Adversarial Tenant)
    const instB = await createTestInstitute({
      name: 'Beta Institute B',
      slug: `beta-b-${crypto.randomUUID().substring(0, 6)}`,
    });

    const userOwnerB = await createTestUser();
    const ownerMemB = await createMembershipUseCase.execute({
      userId: userOwnerB.id,
      instituteId: instB.id,
      role: 'owner',
    });

    ownerContextB = {
      userId: userOwnerB.id,
      instituteId: instB.id,
      membershipId: ownerMemB.id,
      role: 'owner',
      status: 'active',
    };

    const subjectB = await createSubjectUseCase.execute(ownerContextB, {
      name: 'Chemistry',
      code: 'CHE-101',
    });

    const batchB = await createTestBatch(instB.id, subjectB.id, {
      name: 'Batch Beta 2026',
      code: 'CHE-BETA-26',
    });
    batchBId = batchB.id;
  });

  afterEach(async () => {
    await cleanTestDatabase();
  });

  describe('1. Homework Creation & Draft State Lifecycle', () => {
    it('should create homework in DRAFT state (publishedAt === null)', async () => {
      const homework = await createHomeworkUseCase.execute(ownerContextA, {
        batchId: batchAId,
        title: 'Physics Chapter 3 Exercises',
        description: 'Complete problems 1 through 10',
        attachmentUrl: 'https://cdn.coachingos.test/homework/ch3.pdf',
      });

      expect(homework.id).toBeDefined();
      expect(homework.instituteId).toBe(ownerContextA.instituteId);
      expect(homework.batchId).toBe(batchAId);
      expect(homework.title).toBe('Physics Chapter 3 Exercises');
      expect(homework.description).toBe('Complete problems 1 through 10');
      expect(homework.attachmentUrl).toBe('https://cdn.coachingos.test/homework/ch3.pdf');
      expect(homework.isPublished).toBe(false);
      expect(homework.publishedAt).toBeNull();
    });

    it('should allow editing draft homework details', async () => {
      const created = await createHomeworkUseCase.execute(ownerContextA, {
        batchId: batchAId,
        title: 'Initial Title',
      });

      const updated = await updateHomeworkUseCase.execute(ownerContextA, created.id, {
        title: 'Updated Title',
        description: 'Added detailed instructions',
      });

      expect(updated.title).toBe('Updated Title');
      expect(updated.description).toBe('Added detailed instructions');
    });

    it('should list homework for a batch', async () => {
      await createHomeworkUseCase.execute(ownerContextA, {
        batchId: batchAId,
        title: 'Homework 1',
      });
      await createHomeworkUseCase.execute(ownerContextA, {
        batchId: batchAId,
        title: 'Homework 2',
      });

      const list = await listHomeworkUseCase.execute(ownerContextA, batchAId);
      expect(list.length).toBe(2);
    });

    it('should delete draft homework', async () => {
      const created = await createHomeworkUseCase.execute(ownerContextA, {
        batchId: batchAId,
        title: 'Temporary Homework',
      });

      const deleted = await deleteHomeworkUseCase.execute(ownerContextA, created.id);
      expect(deleted).toBe(true);

      await expect(getHomeworkUseCase.execute(ownerContextA, created.id)).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe('2. Explicit Publication State Machine & Immutability', () => {
    it('should publish draft homework using PublishHomeworkUseCase and assign server timestamp', async () => {
      const draft = await createHomeworkUseCase.execute(ownerContextA, {
        batchId: batchAId,
        title: 'Physics Homework',
      });

      expect(draft.isPublished).toBe(false);

      const published = await publishHomeworkUseCase.execute(ownerContextA, draft.id);

      expect(published.isPublished).toBe(true);
      expect(published.publishedAt).not.toBeNull();
    });

    it('should be IDEMPOTENT when publishing an already published homework', async () => {
      const draft = await createHomeworkUseCase.execute(ownerContextA, {
        batchId: batchAId,
        title: 'Physics Homework',
      });

      const firstPublish = await publishHomeworkUseCase.execute(ownerContextA, draft.id);
      const secondPublish = await publishHomeworkUseCase.execute(ownerContextA, draft.id);

      expect(secondPublish.publishedAt).toBe(firstPublish.publishedAt);
    });

    it('PUBLICATION IMMUTABILITY: should REJECT updating details once published', async () => {
      const draft = await createHomeworkUseCase.execute(ownerContextA, {
        batchId: batchAId,
        title: 'Physics Homework',
      });

      await publishHomeworkUseCase.execute(ownerContextA, draft.id);

      await expect(
        updateHomeworkUseCase.execute(ownerContextA, draft.id, {
          title: 'Attempted Post-Publish Edit',
        }),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('3. Adversarial Multi-Tenant Security Suite', () => {
    it('HOMEWORK-SEC-01: should reject unauthenticated request lacking ACADEMIC_WRITE capability', async () => {
      const parentContext: TenantContext = {
        userId: crypto.randomUUID(),
        instituteId: ownerContextA.instituteId,
        membershipId: crypto.randomUUID(),
        role: 'parent',
        status: 'active',
      };

      await expect(
        createHomeworkUseCase.execute(parentContext, {
          batchId: batchAId,
          title: 'Unauthorized Homework',
        }),
      ).rejects.toThrow(AuthorizationError);
    });

    it('HOMEWORK-SEC-02: should reject Institute A attempting to create homework targeting Batch B (belonging to Institute B)', async () => {
      await expect(
        createHomeworkUseCase.execute(ownerContextA, {
          batchId: batchBId, // Batch belongs to Institute B
          title: 'Cross-Tenant Homework',
        }),
      ).rejects.toThrow(NotFoundError);
    });

    it('HOMEWORK-SEC-03: should return NotFound when Institute B attempts to read Homework A', async () => {
      const hwA = await createHomeworkUseCase.execute(ownerContextA, {
        batchId: batchAId,
        title: 'Homework A',
      });

      await expect(getHomeworkUseCase.execute(ownerContextB, hwA.id)).rejects.toThrow(
        NotFoundError,
      );
    });

    it('HOMEWORK-SEC-04: should return NotFound when Institute B attempts to update Homework A', async () => {
      const hwA = await createHomeworkUseCase.execute(ownerContextA, {
        batchId: batchAId,
        title: 'Homework A',
      });

      await expect(
        updateHomeworkUseCase.execute(ownerContextB, hwA.id, {
          title: 'Malicious Update',
        }),
      ).rejects.toThrow(NotFoundError);
    });

    it('HOMEWORK-SEC-05: should return NotFound when Institute B attempts to publish Homework A', async () => {
      const hwA = await createHomeworkUseCase.execute(ownerContextA, {
        batchId: batchAId,
        title: 'Homework A',
      });

      await expect(publishHomeworkUseCase.execute(ownerContextB, hwA.id)).rejects.toThrow(
        NotFoundError,
      );
    });

    it('HOMEWORK-SEC-06 & SEC-07: should REJECT client attempt to inject instituteId or publishedAt in payload', async () => {
      await expect(
        createHomeworkUseCase.execute(ownerContextA, {
          batchId: batchAId,
          title: 'Spoofed Homework',
          instituteId: ownerContextB.instituteId, // Injected instituteId
        } as any),
      ).rejects.toThrow(zodErrorOrValidationError());

      await expect(
        createHomeworkUseCase.execute(ownerContextA, {
          batchId: batchAId,
          title: 'Spoofed Homework',
          publishedAt: '2026-08-13T00:00:00Z', // Injected publishedAt
        } as any),
      ).rejects.toThrow(zodErrorOrValidationError());
    });

    it('HOMEWORK-SEC-09: should return NotFound when Institute B attempts to delete Homework A', async () => {
      const hwA = await createHomeworkUseCase.execute(ownerContextA, {
        batchId: batchAId,
        title: 'Homework A',
      });

      await expect(deleteHomeworkUseCase.execute(ownerContextB, hwA.id)).rejects.toThrow(
        NotFoundError,
      );
    });
  });
});

function zodErrorOrValidationError() {
  return /unrecognized_keys|Unrecognized key|Validation error|invalid_type/i;
}
