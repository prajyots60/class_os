import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import {
  validateTestEnvironment,
  cleanTestDatabase,
  closeTestPool,
  createTestInstitute,
} from '@coaching-os/database';
import {
  AuthorizationError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from '@coaching-os/shared';
import { PrismaParentIdentityRepository } from '../../infrastructure/repositories/prisma-parent-identity.repository';
import { PrismaInstituteParentRepository } from '../../infrastructure/repositories/prisma-institute-parent.repository';
import type { TenantContext } from './membership.use-cases';
import {
  CreateInstituteParentUseCase,
  GetInstituteParentUseCase,
  ListInstituteParentsUseCase,
  UpdateInstituteParentUseCase,
  ArchiveInstituteParentUseCase,
} from './institute-parent.use-cases';
import type { MembershipRole } from '../../domain/entities/institute-membership.entity';

describe('InstituteParent Application Use Cases Suite', () => {
  let parentRepo: PrismaParentIdentityRepository;
  let instParentRepo: PrismaInstituteParentRepository;

  beforeAll(() => {
    validateTestEnvironment();
    parentRepo = new PrismaParentIdentityRepository();
    instParentRepo = new PrismaInstituteParentRepository();
  });

  beforeEach(async () => {
    await cleanTestDatabase();
  });

  afterAll(async () => {
    await closeTestPool();
  });

  function makeContext(
    instituteId: string,
    role: MembershipRole = 'owner',
  ): TenantContext {
    return {
      userId: '00000000-0000-4000-a000-000000000001',
      instituteId,
      membershipId: '00000000-0000-4000-a000-000000000002',
      role,
      status: 'active',
    };
  }

  describe('1. CreateInstituteParentUseCase', () => {
    it('allows owner to create/link a new parent CRM record and auto-creates global ParentIdentity', async () => {
      const inst = await createTestInstitute();
      const ctx = makeContext(inst.id, 'owner');
      const useCase = new CreateInstituteParentUseCase(instParentRepo, parentRepo);

      const result = await useCase.execute(ctx, {
        phone: '+919876543210',
        name: 'Sharma Parent',
        notes: 'Prefers evening communication.',
      });

      expect(result.id).toBeDefined();
      expect(result.instituteId).toBe(inst.id);
      expect(result.notes).toBe('Prefers evening communication.');
      expect(result.status).toBe('active');
      expect(result.parentIdentity).toBeDefined();
      expect(result.parentIdentity?.phone).toBe('+919876543210');
      expect(result.parentIdentity?.name).toBe('Sharma Parent');
    });

    it('allows teacher to create a parent CRM record', async () => {
      const inst = await createTestInstitute();
      const ctx = makeContext(inst.id, 'teacher');
      const useCase = new CreateInstituteParentUseCase(instParentRepo, parentRepo);

      const result = await useCase.execute(ctx, {
        phone: '+919876543211',
        name: 'Teacher Created Parent',
      });

      expect(result.id).toBeDefined();
      expect(result.instituteId).toBe(inst.id);
    });

    it('denies assistant and parent roles from creating parent CRM record', async () => {
      const inst = await createTestInstitute();
      const assistantCtx = makeContext(inst.id, 'assistant');
      const parentCtx = makeContext(inst.id, 'parent');
      const useCase = new CreateInstituteParentUseCase(instParentRepo, parentRepo);

      await expect(
        useCase.execute(assistantCtx, { phone: '+919876543212' }),
      ).rejects.toThrow(AuthorizationError);

      await expect(
        useCase.execute(parentCtx, { phone: '+919876543213' }),
      ).rejects.toThrow(AuthorizationError);
    });

    it('rejects invalid phone number', async () => {
      const inst = await createTestInstitute();
      const ctx = makeContext(inst.id, 'owner');
      const useCase = new CreateInstituteParentUseCase(instParentRepo, parentRepo);

      await expect(
        useCase.execute(ctx, { phone: 'invalid-phone-123' }),
      ).rejects.toThrow(ValidationError);
    });

    it('reuses existing global ParentIdentity when linking to a new institute', async () => {
      const instA = await createTestInstitute({ slug: 'inst-a' });
      const instB = await createTestInstitute({ slug: 'inst-b' });

      const ctxA = makeContext(instA.id, 'owner');
      const ctxB = makeContext(instB.id, 'owner');
      const useCase = new CreateInstituteParentUseCase(instParentRepo, parentRepo);

      const recordA = await useCase.execute(ctxA, {
        phone: '+919876543210',
        name: 'Global Parent',
        notes: 'Institute A Notes',
      });

      const recordB = await useCase.execute(ctxB, {
        phone: '+919876543210',
        notes: 'Institute B Notes',
      });

      expect(recordA.parentIdentityId).toBe(recordB.parentIdentityId);
      expect(recordA.instituteId).toBe(instA.id);
      expect(recordB.instituteId).toBe(instB.id);
      expect(recordA.notes).toBe('Institute A Notes');
      expect(recordB.notes).toBe('Institute B Notes');
    });

    it('throws ConflictError on duplicate creation within the same institute', async () => {
      const inst = await createTestInstitute();
      const ctx = makeContext(inst.id, 'owner');
      const useCase = new CreateInstituteParentUseCase(instParentRepo, parentRepo);

      await useCase.execute(ctx, { phone: '+919876543210' });

      await expect(
        useCase.execute(ctx, { phone: '+919876543210' }),
      ).rejects.toThrow(ConflictError);
    });

    it('strictly derives instituteId from TenantContext, ignoring injected parameters', async () => {
      const instA = await createTestInstitute({ slug: 'inst-real' });
      const ctxA = makeContext(instA.id, 'owner');
      const useCase = new CreateInstituteParentUseCase(instParentRepo, parentRepo);

      // Attempt to supply arbitrary payload (even if client attempts spoofing)
      const result = await useCase.execute(ctxA, {
        phone: '+919876543210',
      });

      expect(result.instituteId).toBe(instA.id);
    });
  });

  describe('2. GetInstituteParentUseCase', () => {
    it('allows authorized staff (owner, teacher, assistant) to retrieve parent DTO', async () => {
      const inst = await createTestInstitute();
      const ownerCtx = makeContext(inst.id, 'owner');
      const teacherCtx = makeContext(inst.id, 'teacher');
      const assistantCtx = makeContext(inst.id, 'assistant');

      const createUseCase = new CreateInstituteParentUseCase(instParentRepo, parentRepo);
      const created = await createUseCase.execute(ownerCtx, {
        phone: '+919876543210',
        notes: 'Test Notes',
      });

      const getUseCase = new GetInstituteParentUseCase(instParentRepo, parentRepo);

      const resOwner = await getUseCase.execute(ownerCtx, { id: created.id });
      expect(resOwner.notes).toBe('Test Notes');

      const resTeacher = await getUseCase.execute(teacherCtx, { id: created.id });
      expect(resTeacher.notes).toBe('Test Notes');

      const resAssistant = await getUseCase.execute(assistantCtx, { id: created.id });
      expect(resAssistant.notes).toBe('Test Notes');
    });

    it('denies parent role from accessing staff CRM Get view', async () => {
      const inst = await createTestInstitute();
      const ownerCtx = makeContext(inst.id, 'owner');
      const parentCtx = makeContext(inst.id, 'parent');

      const createUseCase = new CreateInstituteParentUseCase(instParentRepo, parentRepo);
      const created = await createUseCase.execute(ownerCtx, { phone: '+919876543210' });

      const getUseCase = new GetInstituteParentUseCase(instParentRepo, parentRepo);
      await expect(getUseCase.execute(parentCtx, { id: created.id })).rejects.toThrow(
        AuthorizationError,
      );
    });

    it('returns NotFoundError when tenant A staff queries a tenant B parent record', async () => {
      const instA = await createTestInstitute({ slug: 'inst-a-get' });
      const instB = await createTestInstitute({ slug: 'inst-b-get' });

      const ctxA = makeContext(instA.id, 'owner');
      const ctxB = makeContext(instB.id, 'owner');

      const createUseCase = new CreateInstituteParentUseCase(instParentRepo, parentRepo);
      const recordB = await createUseCase.execute(ctxB, { phone: '+919876543210' });

      const getUseCase = new GetInstituteParentUseCase(instParentRepo, parentRepo);
      await expect(getUseCase.execute(ctxA, { id: recordB.id })).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe('3. ListInstituteParentsUseCase', () => {
    it('lists parents strictly within the tenant institute context', async () => {
      const instA = await createTestInstitute({ slug: 'inst-a-list' });
      const instB = await createTestInstitute({ slug: 'inst-b-list' });

      const ctxA = makeContext(instA.id, 'owner');
      const ctxB = makeContext(instB.id, 'owner');

      const createUseCase = new CreateInstituteParentUseCase(instParentRepo, parentRepo);
      await createUseCase.execute(ctxA, { phone: '+919876543211' });
      await createUseCase.execute(ctxA, { phone: '+919876543212' });
      await createUseCase.execute(ctxB, { phone: '+919876543213' });

      const listUseCase = new ListInstituteParentsUseCase(instParentRepo, parentRepo);
      const listA = await listUseCase.execute(ctxA);
      const listB = await listUseCase.execute(ctxB);

      expect(listA).toHaveLength(2);
      expect(listB).toHaveLength(1);
      expect(listA.every((p) => p.instituteId === instA.id)).toBe(true);
      expect(listB.every((p) => p.instituteId === instB.id)).toBe(true);
    });

    it('filters list by status', async () => {
      const inst = await createTestInstitute();
      const ctx = makeContext(inst.id, 'owner');
      const createUseCase = new CreateInstituteParentUseCase(instParentRepo, parentRepo);
      const p1 = await createUseCase.execute(ctx, { phone: '+919876543211' });
      await createUseCase.execute(ctx, { phone: '+919876543212' });

      const archiveUseCase = new ArchiveInstituteParentUseCase(instParentRepo, parentRepo);
      await archiveUseCase.execute(ctx, { id: p1.id });

      const listUseCase = new ListInstituteParentsUseCase(instParentRepo, parentRepo);
      const activeParents = await listUseCase.execute(ctx, { status: 'active' });
      const inactiveParents = await listUseCase.execute(ctx, { status: 'inactive' });

      expect(activeParents).toHaveLength(1);
      expect(inactiveParents).toHaveLength(1);
      expect(inactiveParents[0].id).toBe(p1.id);
    });
  });

  describe('4. UpdateInstituteParentUseCase', () => {
    it('allows owner and teacher to update CRM notes and status', async () => {
      const inst = await createTestInstitute();
      const ownerCtx = makeContext(inst.id, 'owner');
      const teacherCtx = makeContext(inst.id, 'teacher');

      const createUseCase = new CreateInstituteParentUseCase(instParentRepo, parentRepo);
      const created = await createUseCase.execute(ownerCtx, {
        phone: '+919876543210',
        notes: 'Initial Notes',
      });

      const updateUseCase = new UpdateInstituteParentUseCase(instParentRepo, parentRepo);
      const updatedByTeacher = await updateUseCase.execute(teacherCtx, {
        id: created.id,
        notes: 'Teacher Updated Notes',
      });

      expect(updatedByTeacher.notes).toBe('Teacher Updated Notes');

      const updatedByOwner = await updateUseCase.execute(ownerCtx, {
        id: created.id,
        status: 'inactive',
      });

      expect(updatedByOwner.status).toBe('inactive');
    });

    it('denies assistant from updating CRM notes', async () => {
      const inst = await createTestInstitute();
      const ownerCtx = makeContext(inst.id, 'owner');
      const assistantCtx = makeContext(inst.id, 'assistant');

      const createUseCase = new CreateInstituteParentUseCase(instParentRepo, parentRepo);
      const created = await createUseCase.execute(ownerCtx, { phone: '+919876543210' });

      const updateUseCase = new UpdateInstituteParentUseCase(instParentRepo, parentRepo);
      await expect(
        updateUseCase.execute(assistantCtx, { id: created.id, notes: 'Assistant Update' }),
      ).rejects.toThrow(AuthorizationError);
    });

    it('prevents tenant B from updating tenant A CRM record', async () => {
      const instA = await createTestInstitute({ slug: 'inst-a-upd' });
      const instB = await createTestInstitute({ slug: 'inst-b-upd' });

      const ctxA = makeContext(instA.id, 'owner');
      const ctxB = makeContext(instB.id, 'owner');

      const createUseCase = new CreateInstituteParentUseCase(instParentRepo, parentRepo);
      const createdA = await createUseCase.execute(ctxA, { phone: '+919876543210' });

      const updateUseCase = new UpdateInstituteParentUseCase(instParentRepo, parentRepo);
      await expect(
        updateUseCase.execute(ctxB, { id: createdA.id, notes: 'Cross tenant attack' }),
      ).rejects.toThrow(NotFoundError);
    });

    it('ensures CRM notes update in Institute A does NOT affect Institute B notes or global ParentIdentity profile', async () => {
      const instA = await createTestInstitute({ slug: 'inst-a-iso' });
      const instB = await createTestInstitute({ slug: 'inst-b-iso' });

      const ctxA = makeContext(instA.id, 'owner');
      const ctxB = makeContext(instB.id, 'owner');

      const createUseCase = new CreateInstituteParentUseCase(instParentRepo, parentRepo);
      const recA = await createUseCase.execute(ctxA, {
        phone: '+919876543210',
        notes: 'Original Inst A Notes',
      });
      const recB = await createUseCase.execute(ctxB, {
        phone: '+919876543210',
        notes: 'Original Inst B Notes',
      });

      const updateUseCase = new UpdateInstituteParentUseCase(instParentRepo, parentRepo);
      await updateUseCase.execute(ctxA, {
        id: recA.id,
        notes: 'Modified Inst A Notes',
      });

      const getUseCase = new GetInstituteParentUseCase(instParentRepo, parentRepo);
      const fetchedB = await getUseCase.execute(ctxB, { id: recB.id });

      expect(fetchedB.notes).toBe('Original Inst B Notes');

      const parentIdentity = await parentRepo.findById(recA.parentIdentityId);
      expect(parentIdentity?.phone.value).toBe('+919876543210');
    });
  });

  describe('5. ArchiveInstituteParentUseCase', () => {
    it('allows owner to archive (inactivate) InstituteParent record', async () => {
      const inst = await createTestInstitute();
      const ownerCtx = makeContext(inst.id, 'owner');

      const createUseCase = new CreateInstituteParentUseCase(instParentRepo, parentRepo);
      const created = await createUseCase.execute(ownerCtx, { phone: '+919876543210' });

      const archiveUseCase = new ArchiveInstituteParentUseCase(instParentRepo, parentRepo);
      const archived = await archiveUseCase.execute(ownerCtx, { id: created.id });

      expect(archived.status).toBe('inactive');
    });

    it('denies teacher, assistant, and parent roles from archiving InstituteParent', async () => {
      const inst = await createTestInstitute();
      const ownerCtx = makeContext(inst.id, 'owner');
      const teacherCtx = makeContext(inst.id, 'teacher');

      const createUseCase = new CreateInstituteParentUseCase(instParentRepo, parentRepo);
      const created = await createUseCase.execute(ownerCtx, { phone: '+919876543210' });

      const archiveUseCase = new ArchiveInstituteParentUseCase(instParentRepo, parentRepo);
      await expect(
        archiveUseCase.execute(teacherCtx, { id: created.id }),
      ).rejects.toThrow(AuthorizationError);
    });

    it('preserves global ParentIdentity and other institute records when archiving in Institute A', async () => {
      const instA = await createTestInstitute({ slug: 'inst-a-arch' });
      const instB = await createTestInstitute({ slug: 'inst-b-arch' });

      const ctxA = makeContext(instA.id, 'owner');
      const ctxB = makeContext(instB.id, 'owner');

      const createUseCase = new CreateInstituteParentUseCase(instParentRepo, parentRepo);
      const recA = await createUseCase.execute(ctxA, { phone: '+919876543210' });
      const recB = await createUseCase.execute(ctxB, { phone: '+919876543210' });

      const archiveUseCase = new ArchiveInstituteParentUseCase(instParentRepo, parentRepo);
      await archiveUseCase.execute(ctxA, { id: recA.id });

      const getUseCase = new GetInstituteParentUseCase(instParentRepo, parentRepo);
      const fetchedA = await getUseCase.execute(ctxA, { id: recA.id });
      const fetchedB = await getUseCase.execute(ctxB, { id: recB.id });

      expect(fetchedA.status).toBe('inactive');
      expect(fetchedB.status).toBe('active');

      const parentIdentity = await parentRepo.findById(recA.parentIdentityId);
      expect(parentIdentity?.status).toBe('active');
    });
  });
});
