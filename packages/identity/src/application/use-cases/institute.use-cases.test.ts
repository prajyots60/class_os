import { describe, expect, it, beforeEach } from 'vitest';
import { AuthorizationError, ConflictError, NotFoundError } from '@coaching-os/shared';
import { InstituteEntity, type InstituteStatus } from '../../domain/entities/institute.entity';
import type { InstituteRepository } from '../../domain/repositories/institute.repository';
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

    it('enforces tenantContext boundary authorization', async () => {
      const createUseCase = new CreateInstituteUseCase(repository);
      const created = await createUseCase.execute({
        name: 'Tenant Institute A',
        phone: '+919876543210',
        email: 'a@example.com',
      });

      const getUseCase = new GetInstituteUseCase(repository);

      // Caller requesting institute A with tenantContextId = 'other-tenant-id' -> throws AuthorizationError
      await expect(
        getUseCase.execute({ id: created.id, tenantContextId: 'other-tenant-id' }),
      ).rejects.toThrow(AuthorizationError);
    });
  });

  describe('UpdateInstituteUseCase', () => {
    it('updates allowed mutable fields', async () => {
      const createUseCase = new CreateInstituteUseCase(repository);
      const created = await createUseCase.execute({
        name: 'Original Name',
        phone: '+919876543210',
        email: 'info@original.com',
      });

      const updateUseCase = new UpdateInstituteUseCase(repository);
      const updated = await updateUseCase.execute({
        id: created.id,
        details: {
          name: 'Updated Name',
          phone: '+919999999999',
        },
      });

      expect(updated.name).toBe('Updated Name');
      expect(updated.phone).toBe('+919999999999');
    });

    it('rejects cross-tenant updates', async () => {
      const createUseCase = new CreateInstituteUseCase(repository);
      const created = await createUseCase.execute({
        name: 'Institute A',
        phone: '+919876543210',
        email: 'a@example.com',
      });

      const updateUseCase = new UpdateInstituteUseCase(repository);
      await expect(
        updateUseCase.execute({
          id: created.id,
          tenantContextId: 'wrong-tenant-id',
          details: { name: 'Hacked Name' },
        }),
      ).rejects.toThrow(AuthorizationError);
    });
  });

  describe('ChangeInstituteStatusUseCase', () => {
    it('updates status and logs event', async () => {
      const createUseCase = new CreateInstituteUseCase(repository);
      const created = await createUseCase.execute({
        name: 'Status Test Institute',
        phone: '+919876543210',
        email: 'status@example.com',
      });

      const statusUseCase = new ChangeInstituteStatusUseCase(repository);
      const suspended = await statusUseCase.execute({
        id: created.id,
        status: 'suspended',
      });

      expect(suspended.status).toBe('suspended');
    });
  });
});
