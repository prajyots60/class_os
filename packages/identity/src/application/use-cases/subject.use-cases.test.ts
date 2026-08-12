import { AuthorizationError, ConflictError, NotFoundError } from '@coaching-os/shared';
import crypto from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { SubjectEntity } from '../../domain/entities/subject.entity';
import type { SubjectRepository, ListSubjectsOptions } from '../../domain/repositories/subject.repository';
import type { TenantContext } from './membership.use-cases';
import {
  CreateSubjectUseCase,
  GetSubjectUseCase,
  ListSubjectsUseCase,
  UpdateSubjectUseCase,
  ActivateSubjectUseCase,
  ArchiveSubjectUseCase,
} from './subject.use-cases';

class InMemorySubjectRepository implements SubjectRepository {
  public subjects: SubjectEntity[] = [];

  public async create(entity: SubjectEntity): Promise<SubjectEntity> {
    const existingCode = this.subjects.find(
      (s) => s.instituteId === entity.instituteId && s.code.value === entity.code.value,
    );
    if (existingCode) {
      throw new ConflictError(
        `A subject with code "${entity.code.value}" already exists in institute "${entity.instituteId}".`,
      );
    }

    const existingName = this.subjects.find(
      (s) => s.instituteId === entity.instituteId && s.name.toLowerCase() === entity.name.toLowerCase(),
    );
    if (existingName) {
      throw new ConflictError(
        `A subject with name "${entity.name}" already exists in institute "${entity.instituteId}".`,
      );
    }

    this.subjects.push(entity);
    return entity;
  }

  public async findById(instituteId: string, id: string): Promise<SubjectEntity | null> {
    const subj = this.subjects.find((s) => s.instituteId === instituteId && s.id === id);
    return subj || null;
  }

  public async findByCode(instituteId: string, code: string): Promise<SubjectEntity | null> {
    const subj = this.subjects.find(
      (s) => s.instituteId === instituteId && s.code.value === code.toUpperCase().trim(),
    );
    return subj || null;
  }

  public async findByName(instituteId: string, name: string): Promise<SubjectEntity | null> {
    const subj = this.subjects.find(
      (s) => s.instituteId === instituteId && s.name.toLowerCase() === name.trim().toLowerCase(),
    );
    return subj || null;
  }

  public async listByInstitute(instituteId: string, options?: ListSubjectsOptions): Promise<SubjectEntity[]> {
    return this.subjects.filter((s) => {
      if (s.instituteId !== instituteId) return false;
      if (options?.status && s.status !== options.status) return false;
      if (options?.search) {
        const term = options.search.toLowerCase();
        const matches = s.name.toLowerCase().includes(term) || s.code.value.toLowerCase().includes(term);
        if (!matches) return false;
      }
      return true;
    });
  }

  public async update(entity: SubjectEntity): Promise<SubjectEntity> {
    const idx = this.subjects.findIndex((s) => s.instituteId === entity.instituteId && s.id === entity.id);
    if (idx === -1) {
      throw new NotFoundError(`Subject "${entity.id}" not found.`);
    }
    this.subjects[idx] = entity;
    return entity;
  }

  public async existsByCode(instituteId: string, code: string): Promise<boolean> {
    return this.subjects.some(
      (s) => s.instituteId === instituteId && s.code.value === code.toUpperCase().trim(),
    );
  }

  public async existsByName(instituteId: string, name: string): Promise<boolean> {
    return this.subjects.some(
      (s) => s.instituteId === instituteId && s.name.toLowerCase() === name.trim().toLowerCase(),
    );
  }
}

describe('Subject Application Use Cases Suite', () => {
  let repository: InMemorySubjectRepository;
  let instA: string;
  let instB: string;
  let ownerContextA: TenantContext;
  let parentContextA: TenantContext;
  let ownerContextB: TenantContext;

  beforeEach(() => {
    repository = new InMemorySubjectRepository();
    instA = crypto.randomUUID();
    instB = crypto.randomUUID();

    ownerContextA = {
      instituteId: instA,
      userId: crypto.randomUUID(),
      membershipId: crypto.randomUUID(),
      role: 'owner',
      status: 'active',
    };

    parentContextA = {
      instituteId: instA,
      userId: crypto.randomUUID(),
      membershipId: crypto.randomUUID(),
      role: 'parent',
      status: 'active',
    };

    ownerContextB = {
      instituteId: instB,
      userId: crypto.randomUUID(),
      membershipId: crypto.randomUUID(),
      role: 'owner',
      status: 'active',
    };
  });

  describe('CreateSubjectUseCase', () => {
    it('creates a subject in draft state when authorized', async () => {
      const useCase = new CreateSubjectUseCase(repository);
      const dto = await useCase.execute(ownerContextA, {
        name: 'Physics',
        code: 'PHY-101',
        description: 'General Physics',
      });

      expect(dto.id).toBeDefined();
      expect(dto.instituteId).toBe(instA);
      expect(dto.name).toBe('Physics');
      expect(dto.code).toBe('PHY-101');
      expect(dto.status).toBe('draft');
    });

    it('rejects creation if user lacks subject:create capability', async () => {
      const useCase = new CreateSubjectUseCase(repository);
      await expect(
        useCase.execute(parentContextA, {
          name: 'Unauthorized',
          code: 'UNAUTH-01',
        }),
      ).rejects.toThrow(AuthorizationError);
    });
  });

  describe('GetSubjectUseCase & ListSubjectsUseCase', () => {
    it('retrieves subject and enforces tenant isolation', async () => {
      const createUseCase = new CreateSubjectUseCase(repository);
      const created = await createUseCase.execute(ownerContextA, {
        name: 'Chemistry',
        code: 'CHEM-101',
      });

      const getUseCase = new GetSubjectUseCase(repository);
      const dto = await getUseCase.execute(ownerContextA, { id: created.id });
      expect(dto.name).toBe('Chemistry');

      await expect(
        getUseCase.execute(ownerContextB, { id: created.id }),
      ).rejects.toThrow(NotFoundError);
    });

    it('lists subjects isolated per tenant', async () => {
      const createUseCase = new CreateSubjectUseCase(repository);
      await createUseCase.execute(ownerContextA, { name: 'Subj 1', code: 'S1' });
      await createUseCase.execute(ownerContextA, { name: 'Subj 2', code: 'S2' });
      await createUseCase.execute(ownerContextB, { name: 'Subj 1', code: 'S1' });

      const listUseCase = new ListSubjectsUseCase(repository);
      const listA = await listUseCase.execute(ownerContextA);
      expect(listA).toHaveLength(2);

      const listB = await listUseCase.execute(ownerContextB);
      expect(listB).toHaveLength(1);
    });
  });

  describe('UpdateSubjectUseCase & Lifecycle', () => {
    it('updates subject name and description', async () => {
      const createUseCase = new CreateSubjectUseCase(repository);
      const created = await createUseCase.execute(ownerContextA, {
        name: 'Math',
        code: 'MATH-101',
      });

      const updateUseCase = new UpdateSubjectUseCase(repository);
      const updated = await updateUseCase.execute(ownerContextA, {
        id: created.id,
        name: 'Mathematics',
        description: 'Advanced Mathematics',
      });

      expect(updated.name).toBe('Mathematics');
      expect(updated.description).toBe('Advanced Mathematics');
    });

    it('activates and archives subject', async () => {
      const createUseCase = new CreateSubjectUseCase(repository);
      const created = await createUseCase.execute(ownerContextA, {
        name: 'Biology',
        code: 'BIO-101',
      });

      const activateUseCase = new ActivateSubjectUseCase(repository);
      const activated = await activateUseCase.execute(ownerContextA, { id: created.id });
      expect(activated.status).toBe('active');

      const archiveUseCase = new ArchiveSubjectUseCase(repository);
      const archived = await archiveUseCase.execute(ownerContextA, { id: created.id });
      expect(archived.status).toBe('archived');
    });
  });
});
