import { describe, expect, it, beforeEach, vi } from 'vitest';
import { AuthorizationError, NotFoundError, ValidationError } from '@coaching-os/shared';
import { InstituteEntity, type InstituteStatus } from '../../domain/entities/institute.entity';
import type { InstituteRepository } from '../../domain/repositories/institute.repository';
import type { TenantContext } from './membership.use-cases';
import {
  GetInstituteSettingsUseCase,
  UpdateInstituteSettingsUseCase,
} from './settings.use-cases';

class InMemoryInstituteRepository implements InstituteRepository {
  private institutes = new Map<string, InstituteEntity>();

  public async create(institute: InstituteEntity): Promise<InstituteEntity> {
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

describe('Institute Settings & Branding Use Cases', () => {
  let repository: InMemoryInstituteRepository;
  let testInstitute: InstituteEntity;

  beforeEach(async () => {
    repository = new InMemoryInstituteRepository();
    testInstitute = InstituteEntity.create({
      id: 'inst_123',
      name: 'Pinnacle Classes',
      slug: 'pinnacle-classes',
      phone: '+919876543210',
      email: 'info@pinnacle.com',
      logoUrl: 'https://cdn.pinnacle.com/logo.png',
      primaryColor: '#0F172A',
      timezone: 'Asia/Kolkata',
    });
    await repository.create(testInstitute);
  });

  describe('GetInstituteSettingsUseCase', () => {
    it('allows owner to retrieve institute settings', async () => {
      const useCase = new GetInstituteSettingsUseCase(repository);
      const ownerContext: TenantContext = {
        userId: 'usr_owner',
        instituteId: 'inst_123',
        membershipId: 'mem_owner',
        role: 'owner',
        status: 'active',
      };

      const settings = await useCase.execute({ tenantContext: ownerContext });

      expect(settings.id).toBe('inst_123');
      expect(settings.name).toBe('Pinnacle Classes');
      expect(settings.slug).toBe('pinnacle-classes');
      expect(settings.phone).toBe('+919876543210');
      expect(settings.email).toBe('info@pinnacle.com');
      expect(settings.logoUrl).toBe('https://cdn.pinnacle.com/logo.png');
      expect(settings.primaryColor).toBe('#0F172A');
      expect(settings.timezone).toBe('Asia/Kolkata');
    });

    it('allows staff members (teacher, assistant) with read capability to retrieve settings', async () => {
      const useCase = new GetInstituteSettingsUseCase(repository);

      const teacherContext: TenantContext = {
        userId: 'usr_teacher',
        instituteId: 'inst_123',
        membershipId: 'mem_teacher',
        role: 'teacher',
        status: 'active',
      };

      const settings = await useCase.execute({ tenantContext: teacherContext });
      expect(settings.id).toBe('inst_123');
    });

    it('denies settings access to parent role lacking settings/institute read capabilities', async () => {
      const useCase = new GetInstituteSettingsUseCase(repository);

      const parentContext: TenantContext = {
        userId: 'usr_parent',
        instituteId: 'inst_123',
        membershipId: 'mem_parent',
        role: 'parent',
        status: 'active',
      };

      await expect(
        useCase.execute({ tenantContext: parentContext }),
      ).rejects.toThrow(AuthorizationError);
    });

    it('denies settings access to inactive or malformed TenantContext', async () => {
      const useCase = new GetInstituteSettingsUseCase(repository);

      const suspendedContext = {
        userId: 'usr_owner',
        instituteId: 'inst_123',
        membershipId: 'mem_owner',
        role: 'owner',
        status: 'suspended',
      } as TenantContext;

      await expect(
        useCase.execute({ tenantContext: suspendedContext }),
      ).rejects.toThrow(AuthorizationError);
    });

    it('throws NotFoundError if target institute does not exist', async () => {
      const useCase = new GetInstituteSettingsUseCase(repository);

      const ownerContext: TenantContext = {
        userId: 'usr_owner',
        instituteId: 'inst_NON_EXISTENT',
        membershipId: 'mem_owner',
        role: 'owner',
        status: 'active',
      };

      await expect(
        useCase.execute({ tenantContext: ownerContext }),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('UpdateInstituteSettingsUseCase', () => {
    it('allows owner to update valid settings and branding fields', async () => {
      const useCase = new UpdateInstituteSettingsUseCase(repository);
      const ownerContext: TenantContext = {
        userId: 'usr_owner',
        instituteId: 'inst_123',
        membershipId: 'mem_owner',
        role: 'owner',
        status: 'active',
      };

      const updated = await useCase.execute({
        tenantContext: ownerContext,
        details: {
          name: 'Pinnacle Learning Hub',
          phone: '+919999888777',
          email: 'support@pinnaclehub.com',
          primaryColor: '#3B82F6',
          logoUrl: 'https://cdn.pinnacle.com/new-logo.png',
        },
      });

      expect(updated.name).toBe('Pinnacle Learning Hub');
      expect(updated.phone).toBe('+919999888777');
      expect(updated.email).toBe('support@pinnaclehub.com');
      expect(updated.primaryColor).toBe('#3B82F6');
      expect(updated.logoUrl).toBe('https://cdn.pinnacle.com/new-logo.png');
    });

    it('rejects update request from unauthorized roles (teacher, assistant, parent) BEFORE repository operations', async () => {
      const spyFindById = vi.spyOn(repository, 'findById');
      const spyUpdate = vi.spyOn(repository, 'update');
      const useCase = new UpdateInstituteSettingsUseCase(repository);

      const teacherContext: TenantContext = {
        userId: 'usr_teacher',
        instituteId: 'inst_123',
        membershipId: 'mem_teacher',
        role: 'teacher',
        status: 'active',
      };

      await expect(
        useCase.execute({
          tenantContext: teacherContext,
          details: { name: 'Unauthorized Name' },
        }),
      ).rejects.toThrow(AuthorizationError);

      expect(spyFindById).not.toHaveBeenCalled();
      expect(spyUpdate).not.toHaveBeenCalled();
    });

    it('rejects invalid primary color HEX format', async () => {
      const useCase = new UpdateInstituteSettingsUseCase(repository);
      const ownerContext: TenantContext = {
        userId: 'usr_owner',
        instituteId: 'inst_123',
        membershipId: 'mem_owner',
        role: 'owner',
        status: 'active',
      };

      const invalidColors = ['rgb(255, 0, 0)', 'red', '#12345', 'hsl(0, 100%, 50%)', '#GGGGGG'];

      for (const color of invalidColors) {
        await expect(
          useCase.execute({
            tenantContext: ownerContext,
            details: { primaryColor: color },
          }),
        ).rejects.toThrow(ValidationError);
      }
    });

    it('rejects non-HTTPS logo URLs', async () => {
      const useCase = new UpdateInstituteSettingsUseCase(repository);
      const ownerContext: TenantContext = {
        userId: 'usr_owner',
        instituteId: 'inst_123',
        membershipId: 'mem_owner',
        role: 'owner',
        status: 'active',
      };

      const invalidUrls = ['http://cdn.pinnacle.com/logo.png', 'javascript:alert(1)', 'ftp://logo.png', 'not-a-url'];

      for (const url of invalidUrls) {
        await expect(
          useCase.execute({
            tenantContext: ownerContext,
            details: { logoUrl: url },
          }),
        ).rejects.toThrow(ValidationError);
      }
    });

    it('prevents mutation of protected identity attributes (id, slug, status, createdAt)', async () => {
      const useCase = new UpdateInstituteSettingsUseCase(repository);
      const ownerContext: TenantContext = {
        userId: 'usr_owner',
        instituteId: 'inst_123',
        membershipId: 'mem_owner',
        role: 'owner',
        status: 'active',
      };

      const updated = await useCase.execute({
        tenantContext: ownerContext,
        details: {
          name: 'Pinnacle High',
          // @ts-expect-expected malicious payload testing protected fields
          ...({ id: 'hacked_id', slug: 'hacked-slug', status: 'archived' } as any),
        },
      });

      expect(updated.id).toBe('inst_123');
      expect(updated.slug).toBe('pinnacle-classes');
      expect(updated.status).toBe('active');
      expect(updated.name).toBe('Pinnacle High');
    });

    it('throws NotFoundError if caller institute ID does not exist', async () => {
      const useCase = new UpdateInstituteSettingsUseCase(repository);
      const ownerContext: TenantContext = {
        userId: 'usr_owner',
        instituteId: 'inst_NON_EXISTENT',
        membershipId: 'mem_owner',
        role: 'owner',
        status: 'active',
      };

      await expect(
        useCase.execute({
          tenantContext: ownerContext,
          details: { name: 'New Name' },
        }),
      ).rejects.toThrow(NotFoundError);
    });
  });
});
