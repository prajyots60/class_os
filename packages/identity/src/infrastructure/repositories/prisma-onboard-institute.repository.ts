import { db, type Institute as PrismaInstitute } from '@coaching-os/database';
import { ConflictError, NotFoundError } from '@coaching-os/shared';
import { InstituteEntity, type InstituteStatus } from '../../domain/entities/institute.entity';
import { InstituteMembershipEntity } from '../../domain/entities/institute-membership.entity';
import type {
  InstituteOnboardingRepository,
  OnboardInstituteResult,
} from '../../domain/repositories/institute-onboarding.repository';

export class PrismaOnboardInstituteRepository implements InstituteOnboardingRepository {
  private toInstituteDomain(prismaInstitute: PrismaInstitute): InstituteEntity {
    return InstituteEntity.from({
      id: prismaInstitute.id,
      name: prismaInstitute.name,
      slug: prismaInstitute.slug,
      phone: prismaInstitute.phone,
      email: prismaInstitute.email,
      logoUrl: prismaInstitute.logoUrl,
      primaryColor: prismaInstitute.primaryColor,
      timezone: prismaInstitute.timezone,
      status: prismaInstitute.status as InstituteStatus,
      createdAt: prismaInstitute.createdAt,
      updatedAt: prismaInstitute.updatedAt,
    });
  }

  public async onboard(
    institute: InstituteEntity,
    membership: InstituteMembershipEntity,
  ): Promise<OnboardInstituteResult> {
    try {
      return await db.$transaction(async (tx) => {
        // 1. Create Institute record in PostgreSQL
        const createdInstitute = await tx.institute.create({
          data: {
            id: institute.id,
            name: institute.name,
            slug: institute.slug,
            phone: institute.phone,
            email: institute.email,
            logoUrl: institute.logoUrl,
            primaryColor: institute.primaryColor,
            timezone: institute.timezone,
            status: institute.status,
            createdAt: institute.createdAt,
            updatedAt: institute.updatedAt,
          },
        });

        // 2. Atomically link User to Institute as active owner
        const updatedUser = await tx.user.update({
          where: { id: membership.userId },
          data: {
            instituteId: createdInstitute.id,
            status: membership.status === 'active' ? 'active' : 'suspended',
          },
        });

        const createdMembership = InstituteMembershipEntity.from({
          id: `mem:${updatedUser.id}:${createdInstitute.id}`,
          userId: updatedUser.id,
          instituteId: createdInstitute.id,
          role: 'owner',
          status: membership.status,
          createdAt: updatedUser.updatedAt,
          updatedAt: updatedUser.updatedAt,
        });

        return {
          institute: this.toInstituteDomain(createdInstitute),
          membership: createdMembership,
        };
      });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new ConflictError(`An institute with slug '${institute.slug}' already exists.`);
      }
      if (error?.code === 'P2025') {
        throw new NotFoundError(`User with ID ${membership.userId} not found.`);
      }
      throw error;
    }
  }
}
