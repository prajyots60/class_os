import { describe, expect, it, beforeEach, vi } from 'vitest';
import { AuthorizationError, ConflictError, NotFoundError, ValidationError } from '@coaching-os/shared';
import { InstituteParentStudentEntity } from '../../domain/entities/institute-parent-student.entity';
import { InstituteParentEntity } from '../../domain/entities/institute-parent.entity';
import { StudentEntity } from '../../domain/entities/student.entity';
import type { InstituteParentStudentRepository } from '../../domain/repositories/institute-parent-student.repository';
import type { InstituteParentRepository } from '../../domain/repositories/institute-parent.repository';
import type { StudentRepository } from '../../domain/repositories/student.repository';
import type { TenantContext } from './membership.use-cases';
import {
  CreateInstituteParentStudentUseCase,
  GetInstituteParentStudentUseCase,
  ListStudentGuardiansUseCase,
  ListParentStudentsUseCase,
  UpdateInstituteParentStudentUseCase,
  SetPrimaryGuardianUseCase,
  ArchiveInstituteParentStudentUseCase,
} from './institute-parent-student.use-cases';

describe('InstituteParentStudent Use Cases', () => {
  const instAId = '10000000-0000-4000-a000-000000000001';
  const instBId = '10000000-0000-4000-a000-000000000002';

  const ownerContext: TenantContext = {
    userId: 'user-owner',
    instituteId: instAId,
    membershipId: 'mem-owner',
    role: 'owner',
    status: 'active',
  };

  const assistantContext: TenantContext = {
    userId: 'user-assistant',
    instituteId: instAId,
    membershipId: 'mem-assistant',
    role: 'assistant',
    status: 'active',
  };

  const teacherContext: TenantContext = {
    userId: 'user-teacher',
    instituteId: instAId,
    membershipId: 'mem-teacher',
    role: 'teacher',
    status: 'active',
  };

  const parentUserContext: TenantContext = {
    userId: 'user-parent',
    instituteId: instAId,
    membershipId: 'mem-parent',
    role: 'parent',
    status: 'active',
  };

  let mockRelRepo: InstituteParentStudentRepository;
  let mockParentRepo: InstituteParentRepository;
  let mockStudentRepo: StudentRepository;

  let createUseCase: CreateInstituteParentStudentUseCase;
  let getUseCase: GetInstituteParentStudentUseCase;
  let listGuardiansUseCase: ListStudentGuardiansUseCase;
  let listStudentsUseCase: ListParentStudentsUseCase;
  let updateUseCase: UpdateInstituteParentStudentUseCase;
  let setPrimaryUseCase: SetPrimaryGuardianUseCase;
  let archiveUseCase: ArchiveInstituteParentStudentUseCase;

  const mockParent = InstituteParentEntity.create({
    id: 'parent-crm-1',
    instituteId: instAId,
    parentIdentityId: 'parent-ident-1',
    notes: 'Confidential staff notes for CRM',
  });

  const mockStudent = StudentEntity.create({
    id: 'student-1',
    instituteId: instAId,
    admissionNumber: 'ADM-101',
    firstName: 'Aarav',
    lastName: 'Sharma',
  });

  beforeEach(() => {
    mockRelRepo = {
      findById: vi.fn(),
      findByPair: vi.fn(),
      listByStudentId: vi.fn(),
      listByInstituteParentId: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      setPrimaryGuardian: vi.fn(),
      archive: vi.fn(),
      exists: vi.fn(),
    };

    mockParentRepo = {
      findById: vi.fn(),
      findByParentIdentityId: vi.fn(),
      listByInstitute: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      exists: vi.fn(),
    };

    mockStudentRepo = {
      findById: vi.fn(),
      findByAdmissionNumber: vi.fn(),
      listByInstitute: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      existsByAdmissionNumber: vi.fn(),
    };

    createUseCase = new CreateInstituteParentStudentUseCase(mockRelRepo, mockParentRepo, mockStudentRepo);
    getUseCase = new GetInstituteParentStudentUseCase(mockRelRepo);
    listGuardiansUseCase = new ListStudentGuardiansUseCase(mockRelRepo, mockStudentRepo);
    listStudentsUseCase = new ListParentStudentsUseCase(mockRelRepo, mockParentRepo);
    updateUseCase = new UpdateInstituteParentStudentUseCase(mockRelRepo);
    setPrimaryUseCase = new SetPrimaryGuardianUseCase(mockRelRepo);
    archiveUseCase = new ArchiveInstituteParentStudentUseCase(mockRelRepo);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 1. CreateInstituteParentStudentUseCase
  // ───────────────────────────────────────────────────────────────────────────
  describe('CreateInstituteParentStudentUseCase', () => {
    it('should successfully create a guardian relationship when authorized', async () => {
      vi.mocked(mockParentRepo.findById).mockResolvedValue(mockParent);
      vi.mocked(mockStudentRepo.findById).mockResolvedValue(mockStudent);
      vi.mocked(mockRelRepo.exists).mockResolvedValue(false);

      const createdEntity = InstituteParentStudentEntity.create({
        id: 'rel-1',
        instituteId: instAId,
        instituteParentId: mockParent.id,
        studentId: mockStudent.id,
        relationshipType: 'father',
        isPrimary: false,
      });
      vi.mocked(mockRelRepo.create).mockResolvedValue(createdEntity);

      const result = await createUseCase.execute(ownerContext, {
        instituteParentId: mockParent.id,
        studentId: mockStudent.id,
        relationshipType: 'father',
      });

      expect(result.id).toBe('rel-1');
      expect(result.relationshipType).toBe('father');
      expect(result.isPrimary).toBe(false);
      expect(mockRelRepo.create).toHaveBeenCalledOnce();
    });

    it('should throw NotFoundError if target parent record is missing or cross-tenant', async () => {
      vi.mocked(mockParentRepo.findById).mockResolvedValue(null);

      await expect(
        createUseCase.execute(ownerContext, {
          instituteParentId: 'missing-parent',
          studentId: mockStudent.id,
          relationshipType: 'father',
        }),
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError if target student record is missing or cross-tenant', async () => {
      vi.mocked(mockParentRepo.findById).mockResolvedValue(mockParent);
      vi.mocked(mockStudentRepo.findById).mockResolvedValue(null);

      await expect(
        createUseCase.execute(ownerContext, {
          instituteParentId: mockParent.id,
          studentId: 'missing-student',
          relationshipType: 'father',
        }),
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ConflictError if relationship pair already exists', async () => {
      vi.mocked(mockParentRepo.findById).mockResolvedValue(mockParent);
      vi.mocked(mockStudentRepo.findById).mockResolvedValue(mockStudent);
      vi.mocked(mockRelRepo.exists).mockResolvedValue(true);

      await expect(
        createUseCase.execute(ownerContext, {
          instituteParentId: mockParent.id,
          studentId: mockStudent.id,
          relationshipType: 'father',
        }),
      ).rejects.toThrow(ConflictError);
    });

    it('should throw AuthorizationError when teacher or parent role attempts creation', async () => {
      await expect(
        createUseCase.execute(teacherContext, {
          instituteParentId: mockParent.id,
          studentId: mockStudent.id,
          relationshipType: 'father',
        }),
      ).rejects.toThrow(AuthorizationError);

      await expect(
        createUseCase.execute(parentUserContext, {
          instituteParentId: mockParent.id,
          studentId: mockStudent.id,
          relationshipType: 'father',
        }),
      ).rejects.toThrow(AuthorizationError);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. GetInstituteParentStudentUseCase
  // ───────────────────────────────────────────────────────────────────────────
  describe('GetInstituteParentStudentUseCase', () => {
    it('should retrieve a relationship by ID for staff roles', async () => {
      const relEntity = InstituteParentStudentEntity.create({
        id: 'rel-1',
        instituteId: instAId,
        instituteParentId: mockParent.id,
        studentId: mockStudent.id,
        relationshipType: 'mother',
      });
      vi.mocked(mockRelRepo.findById).mockResolvedValue(relEntity);

      const result = await getUseCase.execute(teacherContext, 'rel-1');
      expect(result.id).toBe('rel-1');
      expect(result.relationshipType).toBe('mother');
    });

    it('should throw NotFoundError for missing or cross-tenant relationship ID', async () => {
      vi.mocked(mockRelRepo.findById).mockResolvedValue(null);

      await expect(getUseCase.execute(ownerContext, 'rel-cross')).rejects.toThrow(NotFoundError);
    });

    it('should throw AuthorizationError for parent role', async () => {
      await expect(getUseCase.execute(parentUserContext, 'rel-1')).rejects.toThrow(AuthorizationError);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. ListStudentGuardians & ListParentStudents UseCases
  // ───────────────────────────────────────────────────────────────────────────
  describe('List Guardians & Students', () => {
    it('should list guardians for a valid student', async () => {
      vi.mocked(mockStudentRepo.findById).mockResolvedValue(mockStudent);
      const relEntity = InstituteParentStudentEntity.create({
        id: 'rel-1',
        instituteId: instAId,
        instituteParentId: mockParent.id,
        studentId: mockStudent.id,
        relationshipType: 'guardian',
        isPrimary: true,
      });
      vi.mocked(mockRelRepo.listByStudentId).mockResolvedValue([relEntity]);

      const result = await listGuardiansUseCase.execute(teacherContext, mockStudent.id);
      expect(result).toHaveLength(1);
      expect(result[0].isPrimary).toBe(true);
    });

    it('should throw NotFoundError when listing guardians for a missing or cross-tenant student', async () => {
      vi.mocked(mockStudentRepo.findById).mockResolvedValue(null);

      await expect(listGuardiansUseCase.execute(ownerContext, 'missing-student')).rejects.toThrow(NotFoundError);
    });

    it('should list students for a valid parent', async () => {
      vi.mocked(mockParentRepo.findById).mockResolvedValue(mockParent);
      const relEntity = InstituteParentStudentEntity.create({
        id: 'rel-1',
        instituteId: instAId,
        instituteParentId: mockParent.id,
        studentId: mockStudent.id,
        relationshipType: 'father',
      });
      vi.mocked(mockRelRepo.listByInstituteParentId).mockResolvedValue([relEntity]);

      const result = await listStudentsUseCase.execute(assistantContext, mockParent.id);
      expect(result).toHaveLength(1);
      expect(result[0].studentId).toBe(mockStudent.id);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. UpdateInstituteParentStudentUseCase
  // ───────────────────────────────────────────────────────────────────────────
  describe('UpdateInstituteParentStudentUseCase', () => {
    it('should update relationship type when authorized', async () => {
      const relEntity = InstituteParentStudentEntity.create({
        id: 'rel-1',
        instituteId: instAId,
        instituteParentId: mockParent.id,
        studentId: mockStudent.id,
        relationshipType: 'father',
      });
      vi.mocked(mockRelRepo.findById).mockResolvedValue(relEntity);
      vi.mocked(mockRelRepo.update).mockImplementation(async (e) => e);

      const result = await updateUseCase.execute(assistantContext, {
        relationshipId: 'rel-1',
        relationshipType: 'guardian',
      });

      expect(result.relationshipType).toBe('guardian');
      expect(mockRelRepo.update).toHaveBeenCalledOnce();
    });

    it('should throw ValidationError when attempting to update an archived relationship', async () => {
      const archivedEntity = InstituteParentStudentEntity.from({
        id: 'rel-archived',
        instituteId: instAId,
        instituteParentId: mockParent.id,
        studentId: mockStudent.id,
        relationshipType: 'father',
        isPrimary: false,
        status: 'archived',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: new Date(),
      });
      vi.mocked(mockRelRepo.findById).mockResolvedValue(archivedEntity);

      await expect(
        updateUseCase.execute(ownerContext, {
          relationshipId: 'rel-archived',
          relationshipType: 'mother',
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('should throw AuthorizationError for teacher role', async () => {
      await expect(
        updateUseCase.execute(teacherContext, {
          relationshipId: 'rel-1',
          relationshipType: 'mother',
        }),
      ).rejects.toThrow(AuthorizationError);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 5. SetPrimaryGuardianUseCase
  // ───────────────────────────────────────────────────────────────────────────
  describe('SetPrimaryGuardianUseCase', () => {
    it('should promote relationship to primary guardian when authorized', async () => {
      const relEntity = InstituteParentStudentEntity.create({
        id: 'rel-1',
        instituteId: instAId,
        instituteParentId: mockParent.id,
        studentId: mockStudent.id,
        relationshipType: 'father',
        isPrimary: false,
      });
      const promotedEntity = InstituteParentStudentEntity.from({
        id: relEntity.id,
        instituteId: relEntity.instituteId,
        instituteParentId: relEntity.instituteParentId,
        studentId: relEntity.studentId,
        relationshipType: relEntity.relationshipType,
        isPrimary: true,
        status: relEntity.status,
        createdAt: relEntity.createdAt,
        updatedAt: new Date(),
        deletedAt: relEntity.deletedAt,
      });

      vi.mocked(mockRelRepo.findById)
        .mockResolvedValueOnce(relEntity)
        .mockResolvedValueOnce(promotedEntity);

      const result = await setPrimaryUseCase.execute(assistantContext, 'rel-1');
      expect(result.isPrimary).toBe(true);
      expect(mockRelRepo.setPrimaryGuardian).toHaveBeenCalledWith(instAId, mockStudent.id, 'rel-1');
    });

    it('should be idempotent if relationship is already primary', async () => {
      const primaryEntity = InstituteParentStudentEntity.create({
        id: 'rel-1',
        instituteId: instAId,
        instituteParentId: mockParent.id,
        studentId: mockStudent.id,
        relationshipType: 'mother',
        isPrimary: true,
      });
      vi.mocked(mockRelRepo.findById).mockResolvedValue(primaryEntity);

      const result = await setPrimaryUseCase.execute(ownerContext, 'rel-1');
      expect(result.isPrimary).toBe(true);
      expect(mockRelRepo.setPrimaryGuardian).not.toHaveBeenCalled();
    });

    it('should throw ValidationError if setting archived relationship as primary', async () => {
      const archivedEntity = InstituteParentStudentEntity.from({
        id: 'rel-1',
        instituteId: instAId,
        instituteParentId: mockParent.id,
        studentId: mockStudent.id,
        relationshipType: 'father',
        isPrimary: false,
        status: 'archived',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: new Date(),
      });
      vi.mocked(mockRelRepo.findById).mockResolvedValue(archivedEntity);

      await expect(setPrimaryUseCase.execute(ownerContext, 'rel-1')).rejects.toThrow(ValidationError);
    });

    it('should throw AuthorizationError when teacher role attempts to set primary', async () => {
      await expect(setPrimaryUseCase.execute(teacherContext, 'rel-1')).rejects.toThrow(AuthorizationError);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 6. ArchiveInstituteParentStudentUseCase
  // ───────────────────────────────────────────────────────────────────────────
  describe('ArchiveInstituteParentStudentUseCase', () => {
    it('should archive an active relationship when performed by owner', async () => {
      const activeEntity = InstituteParentStudentEntity.create({
        id: 'rel-1',
        instituteId: instAId,
        instituteParentId: mockParent.id,
        studentId: mockStudent.id,
        relationshipType: 'father',
        isPrimary: true,
      });
      const archivedEntity = InstituteParentStudentEntity.from({
        id: activeEntity.id,
        instituteId: activeEntity.instituteId,
        instituteParentId: activeEntity.instituteParentId,
        studentId: activeEntity.studentId,
        relationshipType: activeEntity.relationshipType,
        isPrimary: false,
        status: 'archived',
        createdAt: activeEntity.createdAt,
        updatedAt: new Date(),
        deletedAt: new Date(),
      });

      vi.mocked(mockRelRepo.findById)
        .mockResolvedValueOnce(activeEntity)
        .mockResolvedValueOnce(archivedEntity);

      const result = await archiveUseCase.execute(ownerContext, 'rel-1');
      expect(result.status).toBe('archived');
      expect(result.isPrimary).toBe(false);
      expect(mockRelRepo.archive).toHaveBeenCalledWith(instAId, 'rel-1');
    });

    it('should be idempotent if relationship is already archived', async () => {
      const archivedEntity = InstituteParentStudentEntity.from({
        id: 'rel-1',
        instituteId: instAId,
        instituteParentId: mockParent.id,
        studentId: mockStudent.id,
        relationshipType: 'father',
        isPrimary: false,
        status: 'archived',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: new Date(),
      });
      vi.mocked(mockRelRepo.findById).mockResolvedValue(archivedEntity);

      const result = await archiveUseCase.execute(ownerContext, 'rel-1');
      expect(result.status).toBe('archived');
      expect(mockRelRepo.archive).not.toHaveBeenCalled();
    });

    it('should throw AuthorizationError when assistant or teacher role attempts archive', async () => {
      await expect(archiveUseCase.execute(assistantContext, 'rel-1')).rejects.toThrow(AuthorizationError);
      await expect(archiveUseCase.execute(teacherContext, 'rel-1')).rejects.toThrow(AuthorizationError);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 7. Privacy & Anti-Recursion DTO Boundaries
  // ───────────────────────────────────────────────────────────────────────────
  describe('DTO Boundary & Privacy Safety', () => {
    it('should guarantee DTOs contain zero staff notes, passwords, or recursive entity trees', async () => {
      const relEntity = InstituteParentStudentEntity.create({
        id: 'rel-1',
        instituteId: instAId,
        instituteParentId: mockParent.id,
        studentId: mockStudent.id,
        relationshipType: 'mother',
      });
      vi.mocked(mockRelRepo.findById).mockResolvedValue(relEntity);

      const result = await getUseCase.execute(teacherContext, 'rel-1');

      expect(result).not.toHaveProperty('notes');
      expect(result).not.toHaveProperty('staffNotes');
      expect(result).not.toHaveProperty('parent');
      expect(result).not.toHaveProperty('student');
      expect(result).not.toHaveProperty('parentIdentity');
      expect(result).toEqual({
        id: 'rel-1',
        instituteId: instAId,
        instituteParentId: mockParent.id,
        studentId: mockStudent.id,
        relationshipType: 'mother',
        isPrimary: false,
        status: 'active',
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
        deletedAt: null,
      });
    });
  });
});
