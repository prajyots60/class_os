import { describe, expect, it, beforeEach, vi } from 'vitest';
import { ConflictError, ValidationError } from '@coaching-os/shared';
import { InstituteEntity } from '../../domain/entities/institute.entity';
import { InstituteMembershipEntity } from '../../domain/entities/institute-membership.entity';
import type { InstituteRepository } from '../../domain/repositories/institute.repository';
import type {
  InstituteOnboardingRepository,
  OnboardInstituteResult,
} from '../../domain/repositories/institute-onboarding.repository';
import { OnboardInstituteUseCase } from './onboarding.use-cases';
import { ResolveInstituteMembershipUseCase } from './membership.use-cases';

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
    this.institutes.set(institute.id, institute);
    return institute;
  }

  public async updateStatus(id: string, status: any): Promise<InstituteEntity> {
    const existing = this.institutes.get(id);
    if (!existing) throw new Error('Not found');
    this.institutes.set(id, existing);
    return existing;
  }
}

class InMemoryOnboardingRepository implements InstituteOnboardingRepository {
  private institutes = new Map<string, InstituteEntity>();
  private memberships = new Map<string, InstituteMembershipEntity>();

  public async onboard(
    institute: InstituteEntity,
    membership: InstituteMembershipEntity,
  ): Promise<OnboardInstituteResult> {
    this.institutes.set(institute.id, institute);
    this.memberships.set(membership.id, membership);
    return { institute, membership };
  }

  public getMembershipByUserAndInstitute(userId: string, instituteId: string): InstituteMembershipEntity | null {
    for (const m of this.memberships.values()) {
      if (m.userId === userId && m.instituteId === instituteId) {
        return m;
      }
    }
    return null;
  }
}

describe('OnboardInstituteUseCase — Application Orchestration Suite', () => {
  let onboardingRepo: InMemoryOnboardingRepository;
  let instituteRepo: InMemoryInstituteRepository;
  let useCase: OnboardInstituteUseCase;

  beforeEach(() => {
    onboardingRepo = new InMemoryOnboardingRepository();
    instituteRepo = new InMemoryInstituteRepository();
    useCase = new OnboardInstituteUseCase(onboardingRepo, instituteRepo);
  });

  describe('Positive Business Invariants & Orchestration', () => {
    it('1-6. Executes successful onboarding with correct institute details and server-controlled owner membership', async () => {
      const result = await useCase.execute({
        authenticatedUserId: 'usr_founder_1',
        name: 'Apex Academy',
        phone: '+919876543210',
        email: 'info@apex.com',
        timezone: 'Asia/Kolkata',
      });

      expect(result.institute).toBeInstanceOf(InstituteEntity);
      expect(result.membership).toBeInstanceOf(InstituteMembershipEntity);

      expect(result.institute.id).toBeDefined();
      expect(result.institute.name).toBe('Apex Academy');
      expect(result.institute.slug).toBe('apex-academy');
      expect(result.institute.phone).toBe('+919876543210');
      expect(result.institute.email).toBe('info@apex.com');

      // Server-controlled membership invariants
      expect(result.membership.userId).toBe('usr_founder_1');
      expect(result.membership.role).toBe('owner');
      expect(result.membership.status).toBe('active');
      expect(result.membership.instituteId).toBe(result.institute.id);
    });

    it('7-8. Client payload cannot override server-controlled owner role or active status', async () => {
      const result = await useCase.execute({
        authenticatedUserId: 'usr_founder_2',
        name: 'Quantum Classes',
        phone: '+919876543211',
        email: 'contact@quantum.com',
        // Client attempts to pass forged payload properties (cast as any)
        ...({ role: 'teacher', status: 'suspended', instituteId: 'inst_FORGED' } as any),
      });

      expect(result.membership.role).toBe('owner');
      expect(result.membership.status).toBe('active');
      expect(result.membership.instituteId).toBe(result.institute.id);
    });

    it('14 & 18. Returned membership is 100% compatible with ResolveInstituteMembershipUseCase without pre-existing TenantContext', async () => {
      const result = await useCase.execute({
        authenticatedUserId: 'usr_founder_3',
        name: 'Zenith Tutorials',
        phone: '+919876543212',
        email: 'contact@zenith.com',
      });

      // Mock membership lookup for resolver simulation
      const mockMembershipRepo = {
        findByUserAndInstitute: vi.fn().mockResolvedValue(result.membership),
      } as any;

      const resolver = new ResolveInstituteMembershipUseCase(mockMembershipRepo);
      const tenantContext = await resolver.execute({
        userId: 'usr_founder_3',
        requestedInstituteId: result.institute.id,
      });

      expect(tenantContext.userId).toBe('usr_founder_3');
      expect(tenantContext.instituteId).toBe(result.institute.id);
      expect(tenantContext.role).toBe('owner');
      expect(tenantContext.status).toBe('active');
    });
  });

  describe('Validation & Error Semantics', () => {
    it('9. Rejects onboarding if authenticatedUserId is empty or whitespace', async () => {
      await expect(
        useCase.execute({
          authenticatedUserId: '   ',
          name: 'Invalid User Inst',
          phone: '+919876543210',
          email: 'test@example.com',
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('10. Rejects onboarding if institute name is invalid or empty', async () => {
      await expect(
        useCase.execute({
          authenticatedUserId: 'usr_founder_1',
          name: '',
          phone: '+919876543210',
          email: 'test@example.com',
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('11. Rejects onboarding with ConflictError if duplicate slug exists', async () => {
      // First creation in institute repo to simulate pre-existing slug
      await instituteRepo.create(
        InstituteEntity.create({
          name: 'Pre Existing Institute',
          slug: 'pre-existing-institute',
          phone: '+919999999999',
          email: 'existing@example.com',
        }),
      );

      await expect(
        useCase.execute({
          authenticatedUserId: 'usr_founder_1',
          name: 'Pre Existing Institute',
          phone: '+919876543210',
          email: 'new@example.com',
        }),
      ).rejects.toThrow(ConflictError);
    });

    it('16. Propagates onboarding repository failures cleanly', async () => {
      const failingRepo: InstituteOnboardingRepository = {
        onboard: vi.fn().mockRejectedValue(new Error('Database transaction timeout')),
      };

      const failingUseCase = new OnboardInstituteUseCase(failingRepo, instituteRepo);

      await expect(
        failingUseCase.execute({
          authenticatedUserId: 'usr_founder_1',
          name: 'Failing Inst',
          phone: '+919876543210',
          email: 'fail@example.com',
        }),
      ).rejects.toThrow('Database transaction timeout');
    });
  });

  describe('Security & Trust Boundary Unit Tests', () => {
    it('17. Proves onboarding repository receives genuine domain entities, not Prisma models', async () => {
      const spyOnboard = vi.spyOn(onboardingRepo, 'onboard');

      await useCase.execute({
        authenticatedUserId: 'usr_founder_sec',
        name: 'Domain Entity Inst',
        phone: '+919876543210',
        email: 'domain@example.com',
      });

      expect(spyOnboard).toHaveBeenCalledTimes(1);
      const [passedInstitute, passedMembership] = spyOnboard.mock.calls[0];

      expect(passedInstitute).toBeInstanceOf(InstituteEntity);
      expect(passedMembership).toBeInstanceOf(InstituteMembershipEntity);
    });
  });
});
