import { AuthorizationError, ConflictError, NotFoundError } from '@coaching-os/shared';
import crypto from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { ProgramEntity, type ProgramStatus } from '../../domain/entities/program.entity';
import type { ProgramRepository, ListProgramsOptions } from '../../domain/repositories/program.repository';
import type { TenantContext } from './membership.use-cases';
import {
  CreateProgramUseCase,
  GetProgramUseCase,
  ListProgramsUseCase,
  UpdateProgramUseCase,
  ActivateProgramUseCase,
  ArchiveProgramUseCase,
} from './program.use-cases';

class InMemoryProgramRepository implements ProgramRepository {
  public programs: ProgramEntity[] = [];

  public async create(entity: ProgramEntity): Promise<ProgramEntity> {
    const existingCode = this.programs.find(
      (p) => p.instituteId === entity.instituteId && p.code.value === entity.code.value,
    );
    if (existingCode) {
      throw new ConflictError(
        `A program with code "${entity.code.value}" already exists in institute "${entity.instituteId}".`,
      );
    }

    const existingName = this.programs.find(
      (p) => p.instituteId === entity.instituteId && p.name.toLowerCase() === entity.name.toLowerCase(),
    );
    if (existingName) {
      throw new ConflictError(
        `A program with name "${entity.name}" already exists in institute "${entity.instituteId}".`,
      );
    }

    this.programs.push(entity);
    return entity;
  }

  public async findById(instituteId: string, id: string): Promise<ProgramEntity | null> {
    const prog = this.programs.find((p) => p.instituteId === instituteId && p.id === id);
    return prog || null;
  }

  public async findByCode(instituteId: string, code: string): Promise<ProgramEntity | null> {
    const prog = this.programs.find(
      (p) => p.instituteId === instituteId && p.code.value === code.toUpperCase().trim(),
    );
    return prog || null;
  }

  public async findByName(instituteId: string, name: string): Promise<ProgramEntity | null> {
    const prog = this.programs.find(
      (p) => p.instituteId === instituteId && p.name.toLowerCase() === name.trim().toLowerCase(),
    );
    return prog || null;
  }

  public async listByInstitute(instituteId: string, options?: ListProgramsOptions): Promise<ProgramEntity[]> {
    return this.programs.filter((p) => {
      if (p.instituteId !== instituteId) return false;
      if (options?.status && p.status !== options.status) return false;
      if (options?.search) {
        const term = options.search.toLowerCase();
        const matches = p.name.toLowerCase().includes(term) || p.code.value.toLowerCase().includes(term);
        if (!matches) return false;
      }
      return true;
    });
  }

  public async update(entity: ProgramEntity): Promise<ProgramEntity> {
    const idx = this.programs.findIndex((p) => p.instituteId === entity.instituteId && p.id === entity.id);
    if (idx === -1) {
      throw new NotFoundError(`Program "${entity.id}" not found.`);
    }
    this.programs[idx] = entity;
    return entity;
  }

  public async existsByCode(instituteId: string, code: string): Promise<boolean> {
    return this.programs.some(
      (p) => p.instituteId === instituteId && p.code.value === code.toUpperCase().trim(),
    );
  }

  public async existsByName(instituteId: string, name: string): Promise<boolean> {
    return this.programs.some(
      (p) => p.instituteId === instituteId && p.name.toLowerCase() === name.trim().toLowerCase(),
    );
  }
}

describe('Program Application Use Cases Suite', () => {
  let repository: InMemoryProgramRepository;
  let instA: string;
  let instB: string;
  let ownerContextA: TenantContext;
  let parentContextA: TenantContext;
  let ownerContextB: TenantContext;

  beforeEach(() => {
    repository = new InMemoryProgramRepository();
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
      role: 'parent', // parent role has program:read, but lacks program:create/update/archive
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

  describe('CreateProgramUseCase', () => {
    it('creates a program in draft state when authorized', async () => {
      const useCase = new CreateProgramUseCase(repository);
      const dto = await useCase.execute(ownerContextA, {
        name: 'JEE Mains 2027',
        code: 'JEE-2027',
        description: 'Two year engineering coaching program',
      });

      expect(dto.id).toBeDefined();
      expect(dto.instituteId).toBe(instA);
      expect(dto.name).toBe('JEE Mains 2027');
      expect(dto.code).toBe('JEE-2027');
      expect(dto.status).toBe('draft');
    });

    it('rejects creation if user lacks program:create capability', async () => {
      const useCase = new CreateProgramUseCase(repository);
      await expect(
        useCase.execute(parentContextA, {
          name: 'Unauthorized',
          code: 'UNAUTH-01',
        }),
      ).rejects.toThrow(AuthorizationError);
    });

    it('rejects duplicate program code or name in same institute', async () => {
      const useCase = new CreateProgramUseCase(repository);
      await useCase.execute(ownerContextA, {
        name: 'JEE 2027',
        code: 'JEE-2027',
      });

      await expect(
        useCase.execute(ownerContextA, {
          name: 'Different Name',
          code: 'JEE-2027',
        }),
      ).rejects.toThrow(ConflictError);

      await expect(
        useCase.execute(ownerContextA, {
          name: 'JEE 2027',
          code: 'DIFFERENT-CODE',
        }),
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('GetProgramUseCase & ListProgramsUseCase', () => {
    it('retrieves program and enforces tenant isolation', async () => {
      const createUseCase = new CreateProgramUseCase(repository);
      const created = await createUseCase.execute(ownerContextA, {
        name: 'NEET 2027',
        code: 'NEET-2027',
      });

      const getUseCase = new GetProgramUseCase(repository);
      const dto = await getUseCase.execute(ownerContextA, { id: created.id });
      expect(dto.name).toBe('NEET 2027');

      await expect(
        getUseCase.execute(ownerContextB, { id: created.id }),
      ).rejects.toThrow(NotFoundError);
    });

    it('lists programs isolated per tenant', async () => {
      const createUseCase = new CreateProgramUseCase(repository);
      await createUseCase.execute(ownerContextA, { name: 'Prog 1', code: 'P1' });
      await createUseCase.execute(ownerContextA, { name: 'Prog 2', code: 'P2' });
      await createUseCase.execute(ownerContextB, { name: 'Prog 1', code: 'P1' });

      const listUseCase = new ListProgramsUseCase(repository);
      const listA = await listUseCase.execute(ownerContextA);
      expect(listA).toHaveLength(2);

      const listB = await listUseCase.execute(ownerContextB);
      expect(listB).toHaveLength(1);
    });
  });

  describe('UpdateProgramUseCase & Lifecycle', () => {
    it('updates program name and description', async () => {
      const createUseCase = new CreateProgramUseCase(repository);
      const created = await createUseCase.execute(ownerContextA, {
        name: 'Old Name',
        code: 'OLD-01',
      });

      const updateUseCase = new UpdateProgramUseCase(repository);
      const updated = await updateUseCase.execute(ownerContextA, {
        id: created.id,
        name: 'New Name',
        description: 'Updated Description',
      });

      expect(updated.name).toBe('New Name');
      expect(updated.description).toBe('Updated Description');
    });

    it('activates and archives program', async () => {
      const createUseCase = new CreateProgramUseCase(repository);
      const created = await createUseCase.execute(ownerContextA, {
        name: 'Lifecycle Test',
        code: 'LIFE-01',
      });

      const activateUseCase = new ActivateProgramUseCase(repository);
      const activated = await activateUseCase.execute(ownerContextA, { id: created.id });
      expect(activated.status).toBe('active');

      const archiveUseCase = new ArchiveProgramUseCase(repository);
      const archived = await archiveUseCase.execute(ownerContextA, { id: created.id });
      expect(archived.status).toBe('archived');
    });
  });
});
