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
        // 1. Fetch user to verify existence and check pre-existing staff tenancy
        const user = await tx.user.findUnique({
          where: { id: membership.userId },
        });

        if (!user) {
          throw new NotFoundError(`User with ID ${membership.userId} not found.`);
        }

        if (user.instituteId !== null) {
          throw new ConflictError(
            `User ${membership.userId} is already associated with an active institute tenant.`,
          );
        }

        // 2. Create Institute record in PostgreSQL
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

        // 3. Atomically update User.instituteId IF AND ONLY IF instituteId is still null (concurrency lock)
        const updateResult = await tx.user.updateMany({
          where: {
            id: user.id,
            instituteId: null,
          },
          data: {
            instituteId: createdInstitute.id,
            status: membership.status === 'active' ? 'active' : 'suspended',
          },
        });

        if (updateResult.count === 0) {
          throw new ConflictError(
            `User ${membership.userId} is already associated with an active institute tenant.`,
          );
        }

        const updatedUser = await tx.user.findUniqueOrThrow({
          where: { id: user.id },
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
      if (error instanceof ConflictError || error instanceof NotFoundError) {
        throw error;
      }
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
