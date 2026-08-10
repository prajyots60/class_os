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
        // 1. Fetch user to verify existence and get phone/name details
        const user = await tx.user.findUnique({
          where: { id: membership.userId },
        });

        if (!user) {
          throw new NotFoundError(`User with ID ${membership.userId} not found.`);
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

        // 3. Atomically update User to link active institute staff status
        const updatedUser = await tx.user.update({
          where: { id: user.id },
          data: {
            instituteId: createdInstitute.id,
            status: membership.status === 'active' ? 'active' : 'suspended',
          },
        });

        // 4. Upsert ParentIdentity for user phone (ensures tenant membership relation link)
        const phone = user.phone || `+9198${Math.floor(10000000 + Math.random() * 90000000)}`;
        const parentIdentity = await tx.parentIdentity.upsert({
          where: { phone },
          create: { phone },
          update: {},
        });

        // 5. Create InstituteParent record for tenant identity link
        const instituteParent = await tx.instituteParent.create({
          data: {
            instituteId: createdInstitute.id,
            name: user.name,
            primaryPhone: phone,
          },
        });

        // 6. PERSIST ACTUAL InstituteMembership DATABASE ROW in institute_memberships table
        const createdMembershipRow = await tx.instituteMembership.create({
          data: {
            id: membership.id,
            parentIdentityId: parentIdentity.id,
            instituteId: createdInstitute.id,
            instituteParentId: instituteParent.id,
          },
        });

        const createdMembership = InstituteMembershipEntity.from({
          id: createdMembershipRow.id,
          userId: updatedUser.id,
          instituteId: createdInstitute.id,
          role: 'owner',
          status: membership.status,
          createdAt: createdInstitute.createdAt,
          updatedAt: createdInstitute.updatedAt,
        });

        return {
          institute: this.toInstituteDomain(createdInstitute),
          membership: createdMembership,
        };
      });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new ConflictError(
          `An institute with slug '${institute.slug}' or duplicate membership already exists.`,
        );
      }
      if (error?.code === 'P2025') {
        throw new NotFoundError(`User with ID ${membership.userId} not found.`);
      }
      throw error;
    }
  }
}
