import { describe, expect, it, beforeEach, vi } from 'vitest';
import { AuthorizationError, ConflictError, NotFoundError } from '@coaching-os/shared';
import { InstituteEntity, type InstituteStatus } from '../../domain/entities/institute.entity';
import type { InstituteRepository } from '../../domain/repositories/institute.repository';
import type { TenantContext } from './membership.use-cases';
import {
  CreateInstituteUseCase,
  GetInstituteUseCase,
  UpdateInstituteUseCase,
  ChangeInstituteStatusUseCase,
} from './institute.use-cases';

class InMemoryInstituteRepository implements InstituteRepository {
  private institutes = new Map<string, InstituteEntity>();

  public async create(institute: InstituteEntity): Promise<InstituteEntity> {
    if (Array.from(this.institutes.values()).some((i) => i.slug === institute.slug)) {
      throw new ConflictError(`An institute with slug '${institute.slug}' already exists.`);
    }
    this.institutes.set(institute.id, institute);
    return institute;
  }

  public async findById(id: string): Promise<InstituteEntity | null> {
    return this.institutes.get(id) || null;
  }

  public async findBySlug(slug: string): Promise<InstituteEntity | null> {
    for (const institute of this.institutes.values()) {
      if (institute.slug === slug) {
        return institute;
      }
    }
    return null;
  }

  public async update(institute: InstituteEntity): Promise<InstituteEntity> {
    if (!this.institutes.has(institute.id)) {
      throw new NotFoundError(`Institute with ID ${institute.id} not found.`);
    }
    this.institutes.set(institute.id, institute);
    return institute;
  }

  public async updateStatus(id: string, status: InstituteStatus): Promise<InstituteEntity> {
    const existing = this.institutes.get(id);
    if (!existing) {
      throw new NotFoundError(`Institute with ID ${id} not found.`);
    }
    if (status === 'archived') existing.archive();
    else if (status === 'suspended') existing.suspend();
    else if (status === 'active') existing.activate();

    this.institutes.set(id, existing);
    return existing;
  }
}

describe('Institute Use Cases', () => {
  let repository: InMemoryInstituteRepository;

  beforeEach(() => {
    repository = new InMemoryInstituteRepository();
  });

  describe('CreateInstituteUseCase', () => {
    it('creates and returns a new Institute', async () => {
      const useCase = new CreateInstituteUseCase(repository);
      const institute = await useCase.execute({
        name: 'Vanguard Academy',
        phone: '+919876543210',
        email: 'info@vanguard.com',
      });

      expect(institute.id).toBeDefined();
      expect(institute.name).toBe('Vanguard Academy');
      expect(institute.slug).toBe('vanguard-academy');
    });

    it('throws ConflictError if duplicate slug exists', async () => {
      const useCase = new CreateInstituteUseCase(repository);
      await useCase.execute({
        name: 'Vanguard Academy',
        phone: '+919876543210',
        email: 'info@vanguard.com',
      });

      await expect(
        useCase.execute({
          name: 'Vanguard Academy',
          phone: '+919876543211',
          email: 'other@vanguard.com',
        }),
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('GetInstituteUseCase', () => {
    it('retrieves an institute by ID or slug', async () => {
      const createUseCase = new CreateInstituteUseCase(repository);
      const created = await createUseCase.execute({
        name: 'Test Institute',
        phone: '+919876543210',
        email: 'test@example.com',
      });

      const getUseCase = new GetInstituteUseCase(repository);
      const foundById = await getUseCase.execute({ id: created.id });
      expect(foundById.id).toBe(created.id);

      const foundBySlug = await getUseCase.execute({ slug: created.slug });
      expect(foundBySlug.id).toBe(created.id);
    });

    it('enforces capability and tenantContext boundary authorization', async () => {
      const createUseCase = new CreateInstituteUseCase(repository);
      const created = await createUseCase.execute({
        name: 'Tenant Institute A',
        phone: '+919876543210',
        email: 'a@example.com',
      });

      const getUseCase = new GetInstituteUseCase(repository);

      const ownerCtx: TenantContext = {
        userId: 'usr_1',
        instituteId: created.id,
        membershipId: 'mem_1',
        role: 'owner',
        status: 'active',
      };

      const found = await getUseCase.execute({ id: created.id, tenantContext: ownerCtx });
      expect(found.id).toBe(created.id);

      // Caller requesting institute A with tenantContext for institute B -> throws AuthorizationError
      const crossTenantCtx: TenantContext = {
        ...ownerCtx,
        instituteId: 'other-tenant-id',
      };

      await expect(
        getUseCase.execute({ id: created.id, tenantContext: crossTenantCtx }),
      ).rejects.toThrow(AuthorizationError);
    });
  });

  describe('UpdateInstituteUseCase Security & Capabilities', () => {
    it('allows owner with institute:update capability to modify details', async () => {
      const createUseCase = new CreateInstituteUseCase(repository);
      const created = await createUseCase.execute({
        name: 'Original Name',
        phone: '+919876543210',
        email: 'info@original.com',
      });

      const ownerCtx: TenantContext = {
        userId: 'usr_1',
        instituteId: created.id,
        membershipId: 'mem_1',
        role: 'owner',
        status: 'active',
      };

      const updateUseCase = new UpdateInstituteUseCase(repository);
      const updated = await updateUseCase.execute({
        id: created.id,
        details: { name: 'Updated Name' },
        tenantContext: ownerCtx,
      });

      expect(updated.name).toBe('Updated Name');
    });

    it('rejects update attempt by teacher lacking institute:update capability BEFORE repository write', async () => {
      const createUseCase = new CreateInstituteUseCase(repository);
      const created = await createUseCase.execute({
        name: 'Original Name',
        phone: '+919876543210',
        email: 'info@original.com',
      });

      const teacherCtx: TenantContext = {
        userId: 'usr_2',
        instituteId: created.id,
        membershipId: 'mem_2',
        role: 'teacher',
        status: 'active',
      };

      const spyUpdate = vi.spyOn(repository, 'update');
      const updateUseCase = new UpdateInstituteUseCase(repository);

      await expect(
        updateUseCase.execute({
          id: created.id,
          details: { name: 'Forged Name' },
          tenantContext: teacherCtx,
        }),
      ).rejects.toThrow(AuthorizationError);

      expect(spyUpdate).not.toHaveBeenCalled();
    });

    it('rejects update attempt from cross-tenant context BEFORE repository fetch', async () => {
      const createUseCase = new CreateInstituteUseCase(repository);
      const created = await createUseCase.execute({
        name: 'Original Name',
        phone: '+919876543210',
        email: 'info@original.com',
      });

      const crossTenantCtx: TenantContext = {
        userId: 'usr_1',
        instituteId: 'inst_FOREIGN',
        membershipId: 'mem_1',
        role: 'owner',
        status: 'active',
      };

      const spyFindById = vi.spyOn(repository, 'findById');
      const updateUseCase = new UpdateInstituteUseCase(repository);

      await expect(
        updateUseCase.execute({
          id: created.id,
          details: { name: 'Forged Name' },
          tenantContext: crossTenantCtx,
        }),
      ).rejects.toThrow(AuthorizationError);

      expect(spyFindById).not.toHaveBeenCalled();
    });
  });

  describe('ChangeInstituteStatusUseCase Security & Capabilities', () => {
    it('allows owner to archive institute using institute:archive capability', async () => {
      const createUseCase = new CreateInstituteUseCase(repository);
      const created = await createUseCase.execute({
        name: 'To Archive',
        phone: '+919876543210',
        email: 'archive@example.com',
      });

      const ownerCtx: TenantContext = {
        userId: 'usr_1',
        instituteId: created.id,
        membershipId: 'mem_1',
        role: 'owner',
        status: 'active',
      };

      const changeStatusUseCase = new ChangeInstituteStatusUseCase(repository);
      const updated = await changeStatusUseCase.execute({
        id: created.id,
        status: 'archived',
        tenantContext: ownerCtx,
      });

      expect(updated.status).toBe('archived');
    });

    it('rejects status change attempt by assistant lacking institute capabilities', async () => {
      const createUseCase = new CreateInstituteUseCase(repository);
      const created = await createUseCase.execute({
        name: 'To Suspend',
        phone: '+919876543210',
        email: 'suspend@example.com',
      });

      const assistantCtx: TenantContext = {
        userId: 'usr_3',
        instituteId: created.id,
        membershipId: 'mem_3',
        role: 'assistant',
        status: 'active',
      };

      const changeStatusUseCase = new ChangeInstituteStatusUseCase(repository);

      await expect(
        changeStatusUseCase.execute({
          id: created.id,
          status: 'suspended',
          tenantContext: assistantCtx,
        }),
      ).rejects.toThrow(AuthorizationError);
    });
  });
});
