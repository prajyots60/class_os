import crypto from 'node:crypto';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AuthorizationError, ConflictError, NotFoundError, ValidationError } from '@coaching-os/shared';
import {
  CreateEnrollmentUseCase,
  GetEnrollmentUseCase,
  ListEnrollmentsUseCase,
  ActivateEnrollmentUseCase,
  CompleteEnrollmentUseCase,
  WithdrawEnrollmentUseCase,
  CancelEnrollmentUseCase,
  TransferEnrollmentUseCase,
  ArchiveEnrollmentUseCase,
} from './enrollment.use-cases';
import { EnrollmentEntity } from '../../domain/entities/enrollment.entity';
import { StudentEntity } from '../../domain/entities/student.entity';
import { BatchEntity } from '../../domain/entities/batch.entity';
import type { TenantContext } from './membership.use-cases';
import type { EnrollmentRepository } from '../../domain/repositories/enrollment.repository';
import type { StudentRepository } from '../../domain/repositories/student.repository';
import type { BatchRepository } from '../../domain/repositories/batch.repository';

describe('Enrollment Lifecycle Application Use Cases (Phase 1.11.3)', () => {
  const instituteId = crypto.randomUUID();
  const ownerUserId = crypto.randomUUID();
  const teacherUserId = crypto.randomUUID();
  const parentUserId = crypto.randomUUID();

  const ownerContext: TenantContext = {
    userId: ownerUserId,
    instituteId,
    membershipId: crypto.randomUUID(),
    role: 'owner',
    status: 'active',
  };

  const teacherContext: TenantContext = {
    userId: teacherUserId,
    instituteId,
    membershipId: crypto.randomUUID(),
    role: 'teacher',
    status: 'active',
  };

  const parentContext: TenantContext = {
    userId: parentUserId,
    instituteId,
    membershipId: crypto.randomUUID(),
    role: 'parent',
    status: 'active',
  };

  let mockEnrollmentRepo: any;
  let mockStudentRepo: any;
  let mockBatchRepo: any;

  beforeEach(() => {
    mockEnrollmentRepo = {
      create: vi.fn(),
      findById: vi.fn(),
      findByStudent: vi.fn(),
      findByBatch: vi.fn(),
      findActiveByStudent: vi.fn(),
      findActiveByBatch: vi.fn(),
      findByStudentAndBatch: vi.fn(),
      existsActiveOrPending: vi.fn().mockResolvedValue(false),
      countActiveOrPendingByBatch: vi.fn().mockResolvedValue(0),
      listByInstitute: vi.fn().mockResolvedValue([]),
      update: vi.fn(),
      createWithCapacityCheck: vi.fn().mockImplementation(async (entity: EnrollmentEntity) => entity),
      transferWithCapacityCheck: vi.fn().mockImplementation(async (params: any) => ({
        source: params.sourceEnrollment,
        destination: params.destinationEnrollment,
      })),
    };

    mockStudentRepo = {
      findById: vi.fn(),
    };

    mockBatchRepo = {
      findById: vi.fn(),
      findByTeacherId: vi.fn().mockResolvedValue([]),
    };
  });

  const createDummyStudent = (overrides?: Partial<any>) => {
    return StudentEntity.create({
      id: crypto.randomUUID(),
      instituteId,
      admissionNumber: 'ADM-001',
      firstName: 'Jane',
      lastName: 'Doe',
      admissionStatus: 'admitted',
      status: 'active',
      ...overrides,
    });
  };

  const createDummyBatch = (overrides?: Partial<any>) => {
    return BatchEntity.create({
      id: crypto.randomUUID(),
      instituteId,
      subjectId: crypto.randomUUID(),
      name: 'Batch Alpha',
      code: 'ALPHA-01',
      status: 'open',
      capacity: 30,
      ...overrides,
    });
  };

  // ============================================================================
  // 1. CreateEnrollmentUseCase Tests
  // ============================================================================
  describe('CreateEnrollmentUseCase', () => {
    it('creates an enrollment successfully for admitted student in open batch', async () => {
      const student = createDummyStudent();
      const batch = createDummyBatch();

      mockStudentRepo.findById.mockResolvedValue(student);
      mockBatchRepo.findById.mockResolvedValue(batch);

      const useCase = new CreateEnrollmentUseCase(mockEnrollmentRepo, mockStudentRepo, mockBatchRepo);
      const result = await useCase.execute(ownerContext, {
        studentId: student.id,
        batchId: batch.id,
        status: 'active',
      });

      expect(result.studentId).toBe(student.id);
      expect(result.batchId).toBe(batch.id);
      expect(result.status).toBe('active');
      expect(mockEnrollmentRepo.createWithCapacityCheck).toHaveBeenCalled();
    });

    it('rejects creation if capability check fails (e.g. parent role)', async () => {
      const useCase = new CreateEnrollmentUseCase(mockEnrollmentRepo, mockStudentRepo, mockBatchRepo);
      await expect(
        useCase.execute(parentContext, {
          studentId: crypto.randomUUID(),
          batchId: crypto.randomUUID(),
        }),
      ).rejects.toThrow(AuthorizationError);
    });

    it('throws NotFoundError if student does not exist or belongs to another tenant', async () => {
      mockStudentRepo.findById.mockResolvedValue(null);

      const useCase = new CreateEnrollmentUseCase(mockEnrollmentRepo, mockStudentRepo, mockBatchRepo);
      await expect(
        useCase.execute(ownerContext, {
          studentId: crypto.randomUUID(),
          batchId: crypto.randomUUID(),
        }),
      ).rejects.toThrow(NotFoundError);
    });

    it('throws ValidationError if student admissionStatus is pending or rejected', async () => {
      const student = createDummyStudent({ admissionStatus: 'pending', status: 'inactive' });
      mockStudentRepo.findById.mockResolvedValue(student);

      const useCase = new CreateEnrollmentUseCase(mockEnrollmentRepo, mockStudentRepo, mockBatchRepo);
      await expect(
        useCase.execute(ownerContext, {
          studentId: student.id,
          batchId: crypto.randomUUID(),
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError if student status is inactive', async () => {
      const student = createDummyStudent({ status: 'inactive' });
      mockStudentRepo.findById.mockResolvedValue(student);

      const useCase = new CreateEnrollmentUseCase(mockEnrollmentRepo, mockStudentRepo, mockBatchRepo);
      await expect(
        useCase.execute(ownerContext, {
          studentId: student.id,
          batchId: crypto.randomUUID(),
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError if batch status is draft, completed, or archived', async () => {
      const student = createDummyStudent();
      const batch = createDummyBatch({ status: 'draft' });

      mockStudentRepo.findById.mockResolvedValue(student);
      mockBatchRepo.findById.mockResolvedValue(batch);

      const useCase = new CreateEnrollmentUseCase(mockEnrollmentRepo, mockStudentRepo, mockBatchRepo);
      await expect(
        useCase.execute(ownerContext, {
          studentId: student.id,
          batchId: batch.id,
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('throws ConflictError if student already holds active/pending enrollment in target batch', async () => {
      const student = createDummyStudent();
      const batch = createDummyBatch();

      mockStudentRepo.findById.mockResolvedValue(student);
      mockBatchRepo.findById.mockResolvedValue(batch);
      mockEnrollmentRepo.existsActiveOrPending.mockResolvedValue(true);

      const useCase = new CreateEnrollmentUseCase(mockEnrollmentRepo, mockStudentRepo, mockBatchRepo);
      await expect(
        useCase.execute(ownerContext, {
          studentId: student.id,
          batchId: batch.id,
        }),
      ).rejects.toThrow(ConflictError);
    });
  });

  // ============================================================================
  // 2. Lifecycle Transition Use Cases Tests
  // ============================================================================
  describe('Lifecycle State Machine Use Cases', () => {
    it('activates a pending enrollment', async () => {
      const enrollment = EnrollmentEntity.create({
        instituteId,
        studentId: crypto.randomUUID(),
        batchId: crypto.randomUUID(),
        status: 'pending',
      });
      mockEnrollmentRepo.findById.mockResolvedValue(enrollment);
      mockEnrollmentRepo.update.mockImplementation(async (e: EnrollmentEntity) => e);

      const useCase = new ActivateEnrollmentUseCase(mockEnrollmentRepo);
      const result = await useCase.execute(ownerContext, { id: enrollment.id });

      expect(result.status).toBe('active');
    });

    it('completes an active enrollment', async () => {
      const enrollment = EnrollmentEntity.create({
        instituteId,
        studentId: crypto.randomUUID(),
        batchId: crypto.randomUUID(),
        status: 'active',
      });
      mockEnrollmentRepo.findById.mockResolvedValue(enrollment);
      mockEnrollmentRepo.update.mockImplementation(async (e: EnrollmentEntity) => e);

      const useCase = new CompleteEnrollmentUseCase(mockEnrollmentRepo);
      const result = await useCase.execute(ownerContext, { id: enrollment.id });

      expect(result.status).toBe('completed');
      expect(result.completedAt).not.toBeNull();
    });

    it('withdraws an active enrollment', async () => {
      const enrollment = EnrollmentEntity.create({
        instituteId,
        studentId: crypto.randomUUID(),
        batchId: crypto.randomUUID(),
        status: 'active',
      });
      mockEnrollmentRepo.findById.mockResolvedValue(enrollment);
      mockEnrollmentRepo.update.mockImplementation(async (e: EnrollmentEntity) => e);

      const useCase = new WithdrawEnrollmentUseCase(mockEnrollmentRepo);
      const result = await useCase.execute(ownerContext, { id: enrollment.id });

      expect(result.status).toBe('withdrawn');
      expect(result.withdrawnAt).not.toBeNull();
    });

    it('cancels a pending enrollment', async () => {
      const enrollment = EnrollmentEntity.create({
        instituteId,
        studentId: crypto.randomUUID(),
        batchId: crypto.randomUUID(),
        status: 'pending',
      });
      mockEnrollmentRepo.findById.mockResolvedValue(enrollment);
      mockEnrollmentRepo.update.mockImplementation(async (e: EnrollmentEntity) => e);

      const useCase = new CancelEnrollmentUseCase(mockEnrollmentRepo);
      const result = await useCase.execute(ownerContext, { id: enrollment.id });

      expect(result.status).toBe('cancelled');
    });

    it('rejects state transition from terminal state (e.g. activating a completed enrollment)', async () => {
      const enrollment = EnrollmentEntity.from({
        id: crypto.randomUUID(),
        instituteId,
        studentId: crypto.randomUUID(),
        batchId: crypto.randomUUID(),
        status: 'completed',
        enrolledAt: new Date(),
        completedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockEnrollmentRepo.findById.mockResolvedValue(enrollment);

      const useCase = new ActivateEnrollmentUseCase(mockEnrollmentRepo);
      await expect(useCase.execute(ownerContext, { id: enrollment.id })).rejects.toThrow(ValidationError);
    });
  });

  // ============================================================================
  // 3. TransferEnrollmentUseCase Tests
  // ============================================================================
  describe('TransferEnrollmentUseCase', () => {
    it('executes atomic batch transfer preserving historical source batch', async () => {
      const sourceBatchId = crypto.randomUUID();
      const targetBatchId = crypto.randomUUID();
      const studentId = crypto.randomUUID();

      const sourceEnrollment = EnrollmentEntity.create({
        instituteId,
        studentId,
        batchId: sourceBatchId,
        status: 'active',
      });

      const targetBatch = BatchEntity.create({
        id: targetBatchId,
        instituteId,
        subjectId: crypto.randomUUID(),
        name: 'Batch Beta',
        code: 'BETA-01',
        status: 'running',
      });

      mockEnrollmentRepo.findById.mockResolvedValue(sourceEnrollment);
      mockBatchRepo.findById.mockResolvedValue(targetBatch);

      const useCase = new TransferEnrollmentUseCase(mockEnrollmentRepo, mockBatchRepo);
      const result = await useCase.execute(ownerContext, {
        id: sourceEnrollment.id,
        targetBatchId,
      });

      expect(result.source.status).toBe('transferred');
      expect(result.source.batchId).toBe(sourceBatchId); // Historical preservation invariant!
      expect(result.source.transferredToBatchId).toBe(targetBatchId);
      expect(result.destination.status).toBe('active');
      expect(result.destination.batchId).toBe(targetBatchId);
    });

    it('rejects transfer if source enrollment is non-active (e.g. pending or withdrawn)', async () => {
      const sourceEnrollment = EnrollmentEntity.create({
        instituteId,
        studentId: crypto.randomUUID(),
        batchId: crypto.randomUUID(),
        status: 'pending',
      });
      mockEnrollmentRepo.findById.mockResolvedValue(sourceEnrollment);

      const useCase = new TransferEnrollmentUseCase(mockEnrollmentRepo, mockBatchRepo);
      await expect(
        useCase.execute(ownerContext, {
          id: sourceEnrollment.id,
          targetBatchId: crypto.randomUUID(),
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('rejects transfer if target batch and source batch are identical', async () => {
      const sameBatchId = crypto.randomUUID();
      const sourceEnrollment = EnrollmentEntity.create({
        instituteId,
        studentId: crypto.randomUUID(),
        batchId: sameBatchId,
        status: 'active',
      });
      mockEnrollmentRepo.findById.mockResolvedValue(sourceEnrollment);

      const useCase = new TransferEnrollmentUseCase(mockEnrollmentRepo, mockBatchRepo);
      await expect(
        useCase.execute(ownerContext, {
          id: sourceEnrollment.id,
          targetBatchId: sameBatchId,
        }),
      ).rejects.toThrow(ValidationError);
    });
  });

  // ============================================================================
  // 4. ArchiveEnrollmentUseCase Tests
  // ============================================================================
  describe('ArchiveEnrollmentUseCase', () => {
    it('soft archives an enrollment record', async () => {
      const enrollment = EnrollmentEntity.create({
        instituteId,
        studentId: crypto.randomUUID(),
        batchId: crypto.randomUUID(),
        status: 'active',
      });
      mockEnrollmentRepo.findById.mockResolvedValue(enrollment);
      mockEnrollmentRepo.update.mockImplementation(async (e: EnrollmentEntity) => e);

      const useCase = new ArchiveEnrollmentUseCase(mockEnrollmentRepo);
      const result = await useCase.execute(ownerContext, { id: enrollment.id });

      expect(result.deletedAt).not.toBeNull();
    });

    it('rejects archive attempt without enrollment:archive capability', async () => {
      const useCase = new ArchiveEnrollmentUseCase(mockEnrollmentRepo);
      await expect(
        useCase.execute(teacherContext, { id: crypto.randomUUID() }),
      ).rejects.toThrow(AuthorizationError);
    });
  });
});
