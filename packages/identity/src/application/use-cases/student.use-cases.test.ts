import { AuthorizationError, ConflictError, NotFoundError, ValidationError } from '@coaching-os/shared';
import crypto from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { StudentEntity } from '../../domain/entities/student.entity';
import type { StudentRepository } from '../../domain/repositories/student.repository';
import type { TenantContext } from './membership.use-cases';
import {
  ActivateStudentUseCase,
  AdmitStudentUseCase,
  ArchiveStudentUseCase,
  CancelStudentAdmissionUseCase,
  CreateStudentUseCase,
  DeactivateStudentUseCase,
  GetStudentUseCase,
  ListStudentsUseCase,
  RejectStudentUseCase,
  UpdateStudentUseCase,
} from './student.use-cases';

/**
 * InMemoryStudentRepository for application use-case unit testing.
 */
class InMemoryStudentRepository implements StudentRepository {
  public students: StudentEntity[] = [];

  public async create(entity: StudentEntity): Promise<StudentEntity> {
    const existing = this.students.find(
      (s) => s.instituteId === entity.instituteId && s.admissionNumber === entity.admissionNumber,
    );
    if (existing) {
      throw new ConflictError(
        `A student with admission number "${entity.admissionNumber}" already exists in institute "${entity.instituteId}".`,
      );
    }
    this.students.push(entity);
    return entity;
  }

  public async findById(instituteId: string, id: string): Promise<StudentEntity | null> {
    const student = this.students.find((s) => s.instituteId === instituteId && s.id === id);
    return student || null;
  }

  public async findByAdmissionNumber(
    instituteId: string,
    admissionNumber: string,
  ): Promise<StudentEntity | null> {
    const student = this.students.find(
      (s) => s.instituteId === instituteId && s.admissionNumber === admissionNumber.trim(),
    );
    return student || null;
  }

  public async listByInstitute(
    instituteId: string,
    options?: { status?: string; admissionStatus?: string; search?: string; page?: number; limit?: number },
  ): Promise<StudentEntity[]> {
    return this.students.filter((s) => {
      if (s.instituteId !== instituteId) return false;
      if (options?.status && s.status !== options.status) return false;
      if (options?.admissionStatus && s.admissionStatus !== options.admissionStatus) return false;
      if (options?.search) {
        const term = options.search.toLowerCase();
        const matches =
          s.firstName.toLowerCase().includes(term) ||
          s.lastName.toLowerCase().includes(term) ||
          s.admissionNumber.toLowerCase().includes(term);
        if (!matches) return false;
      }
      return true;
    });
  }

  public async update(entity: StudentEntity): Promise<StudentEntity> {
    const index = this.students.findIndex(
      (s) => s.instituteId === entity.instituteId && s.id === entity.id,
    );
    if (index === -1) {
      throw new NotFoundError(
        `Student record "${entity.id}" not found in institute "${entity.instituteId}".`,
      );
    }
    this.students[index] = entity;
    return entity;
  }

  public async existsByAdmissionNumber(
    instituteId: string,
    admissionNumber: string,
  ): Promise<boolean> {
    return this.students.some(
      (s) => s.instituteId === instituteId && s.admissionNumber === admissionNumber.trim(),
    );
  }
}

describe('Student Application Use Cases Suite', () => {
  let repository: InMemoryStudentRepository;
  let instituteA_Id: string;
  let instituteB_Id: string;

  // Context Fixtures
  let ownerContextA: TenantContext;
  let adminContextA: TenantContext;
  let teacherContextA: TenantContext;
  let ownerContextB: TenantContext;

  beforeEach(() => {
    repository = new InMemoryStudentRepository();
    instituteA_Id = crypto.randomUUID();
    instituteB_Id = crypto.randomUUID();

    ownerContextA = {
      instituteId: instituteA_Id,
      userId: crypto.randomUUID(),
      membershipId: crypto.randomUUID(),
      role: 'owner',
      status: 'active',
    };

    adminContextA = {
      instituteId: instituteA_Id,
      userId: crypto.randomUUID(),
      membershipId: crypto.randomUUID(),
      role: 'assistant', // assistant role has student:create/update, but lacks student:archive
      status: 'active',
    };

    teacherContextA = {
      instituteId: instituteA_Id,
      userId: crypto.randomUUID(),
      membershipId: crypto.randomUUID(),
      role: 'teacher', // teacher role lacks student:create and student:archive
      status: 'active',
    };

    ownerContextB = {
      instituteId: instituteB_Id,
      userId: crypto.randomUUID(),
      membershipId: crypto.randomUUID(),
      role: 'owner',
      status: 'active',
    };
  });

  // ── 1. CreateStudentUseCase ──────────────────────────────────────────────────

  describe('CreateStudentUseCase', () => {
    it('1.1 creates a pending student when authorized', async () => {
      const useCase = new CreateStudentUseCase(repository);
      const dto = await useCase.execute(ownerContextA, {
        admissionNumber: 'ADM-001',
        firstName: 'Aarav',
        lastName: 'Sharma',
        dateOfBirth: '2010-05-15',
        phone: '+919876543210',
      });

      expect(dto.id).toBeDefined();
      expect(dto.instituteId).toBe(instituteA_Id);
      expect(dto.admissionNumber).toBe('ADM-001');
      expect(dto.firstName).toBe('Aarav');
      expect(dto.lastName).toBe('Sharma');
      expect(dto.displayName).toBe('Aarav Sharma');
      expect(dto.admissionStatus).toBe('pending');
      expect(dto.status).toBe('inactive');
    });

    it('1.2 creates an admitted active student if admissionStatus is admitted', async () => {
      const useCase = new CreateStudentUseCase(repository);
      const dto = await useCase.execute(adminContextA, {
        admissionNumber: 'ADM-002',
        firstName: 'Ananya',
        lastName: 'Roy',
        admissionStatus: 'admitted',
      });

      expect(dto.admissionStatus).toBe('admitted');
      expect(dto.status).toBe('active');
    });

    it('1.3 rejects creation if actor lacks student:create capability', async () => {
      const useCase = new CreateStudentUseCase(repository);
      await expect(
        useCase.execute(teacherContextA, {
          admissionNumber: 'ADM-003',
          firstName: 'Unauthorized',
          lastName: 'User',
        }),
      ).rejects.toThrow(AuthorizationError);
    });

    it('1.4 rejects duplicate admission number within same tenant', async () => {
      const useCase = new CreateStudentUseCase(repository);
      await useCase.execute(ownerContextA, {
        admissionNumber: 'ADM-100',
        firstName: 'First',
        lastName: 'Student',
      });

      await expect(
        useCase.execute(ownerContextA, {
          admissionNumber: 'ADM-100', // DUPLICATE
          firstName: 'Second',
          lastName: 'Student',
        }),
      ).rejects.toThrow(ConflictError);
    });
  });

  // ── 2. GetStudentUseCase ─────────────────────────────────────────────────────

  describe('GetStudentUseCase', () => {
    it('2.1 retrieves student profile for active tenant', async () => {
      const createUseCase = new CreateStudentUseCase(repository);
      const created = await createUseCase.execute(ownerContextA, {
        admissionNumber: 'ADM-201',
        firstName: 'Kavya',
        lastName: 'Iyer',
      });

      const getUseCase = new GetStudentUseCase(repository);
      const dto = await getUseCase.execute(ownerContextA, { id: created.id });

      expect(dto.id).toBe(created.id);
      expect(dto.firstName).toBe('Kavya');
    });

    it('2.2 returns NotFoundError (not 403) for cross-tenant lookup', async () => {
      const createUseCase = new CreateStudentUseCase(repository);
      const createdA = await createUseCase.execute(ownerContextA, {
        admissionNumber: 'ADM-202',
        firstName: 'Secret',
        lastName: 'StudentA',
      });

      const getUseCase = new GetStudentUseCase(repository);
      await expect(
        getUseCase.execute(ownerContextB, { id: createdA.id }),
      ).rejects.toThrow(NotFoundError);
    });
  });

  // ── 3. ListStudentsUseCase ───────────────────────────────────────────────────

  describe('ListStudentsUseCase', () => {
    it('3.1 lists students strictly isolated to active tenant', async () => {
      const createUseCase = new CreateStudentUseCase(repository);
      await createUseCase.execute(ownerContextA, {
        admissionNumber: 'ADM-301',
        firstName: 'InstA_Student1',
        lastName: 'Test',
      });
      await createUseCase.execute(ownerContextA, {
        admissionNumber: 'ADM-302',
        firstName: 'InstA_Student2',
        lastName: 'Test',
      });
      await createUseCase.execute(ownerContextB, {
        admissionNumber: 'ADM-301',
        firstName: 'InstB_Student1',
        lastName: 'Test',
      });

      const listUseCase = new ListStudentsUseCase(repository);
      const listA = await listUseCase.execute(ownerContextA);
      expect(listA).toHaveLength(2);

      const listB = await listUseCase.execute(ownerContextB);
      expect(listB).toHaveLength(1);
      expect(listB[0].firstName).toBe('InstB_Student1');
    });
  });

  // ── 4. UpdateStudentUseCase ──────────────────────────────────────────────────

  describe('UpdateStudentUseCase', () => {
    it('4.1 updates profile and contact info', async () => {
      const createUseCase = new CreateStudentUseCase(repository);
      const created = await createUseCase.execute(ownerContextA, {
        admissionNumber: 'ADM-401',
        firstName: 'Dev',
        lastName: 'Mehta',
      });

      const updateUseCase = new UpdateStudentUseCase(repository);
      const updated = await updateUseCase.execute(ownerContextA, {
        id: created.id,
        firstName: 'Devendra',
        city: 'Pune',
      });

      expect(updated.firstName).toBe('Devendra');
      expect(updated.city).toBe('Pune');
    });

    it('4.2 rejects attempt to update admissionNumber', async () => {
      const createUseCase = new CreateStudentUseCase(repository);
      const created = await createUseCase.execute(ownerContextA, {
        admissionNumber: 'ADM-402',
        firstName: 'Immutable',
        lastName: 'Test',
      });

      const updateUseCase = new UpdateStudentUseCase(repository);
      await expect(
        updateUseCase.execute(ownerContextA, {
          id: created.id,
          admissionNumber: 'ADM-HACKED',
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('4.3 rejects cross-tenant update with NotFoundError', async () => {
      const createUseCase = new CreateStudentUseCase(repository);
      const createdA = await createUseCase.execute(ownerContextA, {
        admissionNumber: 'ADM-403',
        firstName: 'CrossTenant',
        lastName: 'Target',
      });

      const updateUseCase = new UpdateStudentUseCase(repository);
      await expect(
        updateUseCase.execute(ownerContextB, {
          id: createdA.id,
          firstName: 'Hacked',
        }),
      ).rejects.toThrow(NotFoundError);
    });
  });

  // ── 5. Admission State Machine Use Cases ─────────────────────────────────────

  describe('Admission State Machine Use Cases', () => {
    it('5.1 admits a pending student setting status to active', async () => {
      const createUseCase = new CreateStudentUseCase(repository);
      const created = await createUseCase.execute(ownerContextA, {
        admissionNumber: 'ADM-501',
        firstName: 'Pending',
        lastName: 'Student',
      });

      expect(created.admissionStatus).toBe('pending');
      expect(created.status).toBe('inactive');

      const admitUseCase = new AdmitStudentUseCase(repository);
      const admitted = await admitUseCase.execute(ownerContextA, {
        id: created.id,
        admissionDate: '2026-08-11',
      });

      expect(admitted.admissionStatus).toBe('admitted');
      expect(admitted.status).toBe('active');
    });

    it('5.2 rejects student admission', async () => {
      const createUseCase = new CreateStudentUseCase(repository);
      const created = await createUseCase.execute(ownerContextA, {
        admissionNumber: 'ADM-502',
        firstName: 'Reject',
        lastName: 'Target',
      });

      const rejectUseCase = new RejectStudentUseCase(repository);
      const rejected = await rejectUseCase.execute(ownerContextA, { id: created.id });

      expect(rejected.admissionStatus).toBe('rejected');
      expect(rejected.status).toBe('inactive');
    });

    it('5.3 cancels student admission', async () => {
      const createUseCase = new CreateStudentUseCase(repository);
      const created = await createUseCase.execute(ownerContextA, {
        admissionNumber: 'ADM-503',
        firstName: 'Cancel',
        lastName: 'Target',
      });

      const cancelUseCase = new CancelStudentAdmissionUseCase(repository);
      const cancelled = await cancelUseCase.execute(ownerContextA, { id: created.id });

      expect(cancelled.admissionStatus).toBe('cancelled');
      expect(cancelled.status).toBe('inactive');
    });
  });

  // ── 6. Student Lifecycle State Machine Use Cases ─────────────────────────────

  describe('Student Lifecycle State Machine Use Cases', () => {
    it('6.1 prevents activating a non-admitted student', async () => {
      const createUseCase = new CreateStudentUseCase(repository);
      const pendingStudent = await createUseCase.execute(ownerContextA, {
        admissionNumber: 'ADM-601',
        firstName: 'NonAdmitted',
        lastName: 'Student',
      });

      const activateUseCase = new ActivateStudentUseCase(repository);
      await expect(
        activateUseCase.execute(ownerContextA, { id: pendingStudent.id }),
      ).rejects.toThrow(ValidationError);
    });

    it('6.2 deactivates an active admitted student', async () => {
      const createUseCase = new CreateStudentUseCase(repository);
      const admittedStudent = await createUseCase.execute(ownerContextA, {
        admissionNumber: 'ADM-602',
        firstName: 'Active',
        lastName: 'Student',
        admissionStatus: 'admitted',
      });

      expect(admittedStudent.status).toBe('active');

      const deactivateUseCase = new DeactivateStudentUseCase(repository);
      const deactivated = await deactivateUseCase.execute(ownerContextA, {
        id: admittedStudent.id,
      });

      expect(deactivated.status).toBe('inactive');

      // Re-activating should succeed
      const activateUseCase = new ActivateStudentUseCase(repository);
      const reActivated = await activateUseCase.execute(ownerContextA, {
        id: admittedStudent.id,
      });
      expect(reActivated.status).toBe('active');
    });

    it('6.3 archives student setting status to archived and deletedAt timestamp', async () => {
      const createUseCase = new CreateStudentUseCase(repository);
      const student = await createUseCase.execute(ownerContextA, {
        admissionNumber: 'ADM-603',
        firstName: 'Archive',
        lastName: 'Target',
        admissionStatus: 'admitted',
      });

      const archiveUseCase = new ArchiveStudentUseCase(repository);
      const archived = await archiveUseCase.execute(ownerContextA, { id: student.id });

      expect(archived.status).toBe('archived');
      expect(archived.deletedAt).not.toBeNull();
    });

    it('6.4 rejects archive request if user lacks student:archive capability', async () => {
      const createUseCase = new CreateStudentUseCase(repository);
      const student = await createUseCase.execute(ownerContextA, {
        admissionNumber: 'ADM-604',
        firstName: 'NoArchiveCap',
        lastName: 'Student',
      });

      const archiveUseCase = new ArchiveStudentUseCase(repository);
      // Admin context lacks student:archive capability
      await expect(
        archiveUseCase.execute(adminContextA, { id: student.id }),
      ).rejects.toThrow(AuthorizationError);
    });
  });
});
