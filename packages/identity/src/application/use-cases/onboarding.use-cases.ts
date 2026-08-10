import { logger } from '@coaching-os/observability';
import { ConflictError, ValidationError } from '@coaching-os/shared';
import { InstituteEntity } from '../../domain/entities/institute.entity';
import { InstituteMembershipEntity } from '../../domain/entities/institute-membership.entity';
import type { InstituteRepository } from '../../domain/repositories/institute.repository';
import type {
  InstituteOnboardingRepository,
  OnboardInstituteResult,
} from '../../domain/repositories/institute-onboarding.repository';

export interface OnboardInstituteCommand {
  authenticatedUserId: string;
  name: string;
  phone: string;
  email: string;
  timezone?: string;
  slug?: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
}

export class OnboardInstituteUseCase {
  constructor(
    private readonly onboardingRepository: InstituteOnboardingRepository,
    private readonly instituteRepository: InstituteRepository,
  ) {}

  public async execute(command: OnboardInstituteCommand): Promise<OnboardInstituteResult> {
    if (!command.authenticatedUserId || !command.authenticatedUserId.trim()) {
      throw new ValidationError('Authenticated User ID is required for institute onboarding.');
    }

    logger.info(
      {
        userId: command.authenticatedUserId,
        name: command.name,
      },
      'identity.onboarding.started',
    );

    // 1. Construct Institute domain entity (validates name, slug, phone, email & normalizes slug)
    const institute = InstituteEntity.create({
      name: command.name,
      slug: command.slug,
      phone: command.phone,
      email: command.email,
      timezone: command.timezone,
      logoUrl: command.logoUrl,
      primaryColor: command.primaryColor,
    });

    // 2. Fail-fast slug check before transaction boundary
    const existingInstitute = await this.instituteRepository.findBySlug(institute.slug);
    if (existingInstitute) {
      logger.warn(
        {
          userId: command.authenticatedUserId,
          slug: institute.slug,
        },
        'identity.onboarding.create.conflict',
      );
      throw new ConflictError(`An institute with slug '${institute.slug}' already exists.`);
    }

    // 3. Construct InstituteMembership domain entity with SERVER-CONTROLLED invariants
    const membership = InstituteMembershipEntity.create({
      userId: command.authenticatedUserId.trim(),
      instituteId: institute.id,
      role: 'owner',
      status: 'active',
    });

    try {
      // 4. Delegate atomic unit of work to onboarding repository interface (Phase 1.4.2 implements Prisma $transaction)
      const result = await this.onboardingRepository.onboard(institute, membership);

      logger.info(
        {
          userId: command.authenticatedUserId,
          instituteId: result.institute.id,
          membershipId: result.membership.id,
          slug: result.institute.slug,
        },
        'identity.onboarding.create.success',
      );

      return result;
    } catch (error) {
      logger.error(
        {
          userId: command.authenticatedUserId,
          err: error,
        },
        'identity.onboarding.failed',
      );
      throw error;
    }
  }
}
