import { db } from '@coaching-os/database';
import { ConflictError, NotFoundError } from '@coaching-os/shared';
import {
  InstituteMembershipEntity,
  type MembershipRole,
  type MembershipStatus,
} from '../../domain/entities/institute-membership.entity';
import type { InstituteMembershipRepository } from '../../domain/repositories/institute-membership.repository';

export class PrismaInstituteMembershipRepository implements InstituteMembershipRepository {
  public async create(membership: InstituteMembershipEntity): Promise<InstituteMembershipEntity> {
    // 1. Verify target user exists
    const user = await db.user.findUnique({
      where: { id: membership.userId },
    });

    if (!user) {
      throw new NotFoundError(`User with ID ${membership.userId} not found.`);
    }

    // 2. Verify target institute exists
    const institute = await db.institute.findUnique({
      where: { id: membership.instituteId },
    });

    if (!institute) {
      throw new NotFoundError(`Institute with ID ${membership.instituteId} not found.`);
    }

    // 3. Handle staff membership role (owner, teacher, assistant)
    if (['owner', 'teacher', 'assistant'].includes(membership.role)) {
      // Check if user is already assigned to this or another institute
      if (user.instituteId === membership.instituteId) {
        throw new ConflictError(
          `User ${membership.userId} is already a member of institute ${membership.instituteId}.`,
        );
      }

      try {
        await db.user.update({
          where: { id: user.id },
          data: {
            instituteId: membership.instituteId,
            status: membership.status === 'active' ? 'active' : 'suspended',
          },
        });

        return InstituteMembershipEntity.from({
          id: `mem:${user.id}:${membership.instituteId}`,
          userId: user.id,
          instituteId: membership.instituteId,
          role: membership.role,
          status: membership.status,
          createdAt: membership.createdAt,
          updatedAt: membership.updatedAt,
        });
      } catch (error: any) {
        if (error?.code === 'P2002') {
          throw new ConflictError(
            `User ${membership.userId} is already a member of institute ${membership.instituteId}.`,
          );
        }
        throw error;
      }
    }

    // 4. Handle parent membership role ('parent')
    let parentIdentity = user.phone
      ? await db.parentIdentity.findUnique({ where: { phone: user.phone } })
      : null;

    if (!parentIdentity) {
      const phone = user.phone || `+9198${Math.floor(10000000 + Math.random() * 90000000)}`;
      parentIdentity = await db.parentIdentity.upsert({
        where: { phone },
        create: { phone },
        update: {},
      });
    }

    let instituteParent = await db.instituteParent.findUnique({
      where: {
        institute_parent_unique: {
          instituteId: membership.instituteId,
          parentIdentityId: parentIdentity.id,
        },
      },
    });

    if (!instituteParent) {
      instituteParent = await db.instituteParent.create({
        data: {
          instituteId: membership.instituteId,
          parentIdentityId: parentIdentity.id,
        },
      });
    }

    // Check duplicate parent membership
    const existingMembership = await db.instituteMembership.findFirst({
      where: {
        parentIdentityId: parentIdentity.id,
        instituteId: membership.instituteId,
      },
    });

    if (existingMembership) {
      throw new ConflictError(
        `User ${membership.userId} is already a member of institute ${membership.instituteId}.`,
      );
    }

    try {
      const created = await db.instituteMembership.create({
        data: {
          id: membership.id,
          parentIdentityId: parentIdentity.id,
          instituteId: membership.instituteId,
          instituteParentId: instituteParent.id,
        },
      });

      return InstituteMembershipEntity.from({
        id: created.id,
        userId: user.id,
        instituteId: created.instituteId,
        role: 'parent',
        status: membership.status,
        createdAt: membership.createdAt,
        updatedAt: membership.updatedAt,
      });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new ConflictError(
          `User ${membership.userId} is already a member of institute ${membership.instituteId}.`,
        );
      }
      throw error;
    }
  }

  public async findById(id: string): Promise<InstituteMembershipEntity | null> {
    // 1. Check synthetic colon-delimited staff membership ID: mem:${userId}:${instituteId}
    if (id.startsWith('mem:')) {
      const [, userId, instituteId] = id.split(':');
      if (userId && instituteId) {
        const user = await db.user.findUnique({ where: { id: userId } });
        if (user && user.instituteId === instituteId) {
          return InstituteMembershipEntity.from({
            id,
            userId: user.id,
            instituteId,
            role: 'owner',
            status: user.status === 'active' ? 'active' : 'suspended',
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
          });
        }
      }
    }

    const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    if (isValidUuid) {
      // 2. Check parent institute membership by UUID
      const parentMembership = await db.instituteMembership.findUnique({
        where: { id },
        include: { parentIdentity: true },
      });

      if (parentMembership) {
        const user = await db.user.findFirst({
          where: { phone: parentMembership.parentIdentity.phone },
        });
        return InstituteMembershipEntity.from({
          id: parentMembership.id,
          userId: user ? user.id : parentMembership.parentIdentityId,
          instituteId: parentMembership.instituteId,
          role: 'parent',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      // 3. Check direct staff user by UUID
      const staffUser = await db.user.findUnique({ where: { id } });
      if (staffUser && staffUser.instituteId) {
        return InstituteMembershipEntity.from({
          id: `mem:${staffUser.id}:${staffUser.instituteId}`,
          userId: staffUser.id,
          instituteId: staffUser.instituteId,
          role: 'owner',
          status: staffUser.status === 'active' ? 'active' : 'suspended',
          createdAt: staffUser.createdAt,
          updatedAt: staffUser.updatedAt,
        });
      }
    }

    return null;
  }

  public async findByUserAndInstitute(
    userId: string,
    instituteId: string,
  ): Promise<InstituteMembershipEntity | null> {
    const isValidUserId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
    if (!isValidUserId) {
      return null;
    }

    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return null;
    }

    // 1. Check direct staff user institute assignment
    if (user.instituteId === instituteId) {
      return InstituteMembershipEntity.from({
        id: `mem:${user.id}:${instituteId}`,
        userId: user.id,
        instituteId,
        role: 'owner',
        status: user.status === 'active' ? 'active' : 'suspended',
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      });
    }

    // 2. Check parent identity membership
    if (user.phone) {
      const parentIdentity = await db.parentIdentity.findUnique({
        where: { phone: user.phone },
      });

      if (parentIdentity) {
        const membership = await db.instituteMembership.findFirst({
          where: {
            parentIdentityId: parentIdentity.id,
            instituteId,
          },
        });

        if (membership) {
          return InstituteMembershipEntity.from({
            id: membership.id,
            userId: user.id,
            instituteId,
            role: 'parent',
            status: 'active',
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }
    }

    return null;
  }

  public async findByUserId(userId: string): Promise<InstituteMembershipEntity[]> {
    const isValidUserId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
    if (!isValidUserId) {
      return [];
    }

    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return [];
    }

    const memberships: InstituteMembershipEntity[] = [];

    if (user.instituteId) {
      memberships.push(
        InstituteMembershipEntity.from({
          id: `mem:${user.id}:${user.instituteId}`,
          userId: user.id,
          instituteId: user.instituteId,
          role: 'owner',
          status: user.status === 'active' ? 'active' : 'suspended',
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        }),
      );
    }

    if (user.phone) {
      const parentIdentity = await db.parentIdentity.findUnique({
        where: { phone: user.phone },
        include: { memberships: true },
      });

      if (parentIdentity) {
        for (const m of parentIdentity.memberships) {
          memberships.push(
            InstituteMembershipEntity.from({
              id: m.id,
              userId: user.id,
              instituteId: m.instituteId,
              role: 'parent',
              status: 'active',
              createdAt: new Date(),
              updatedAt: new Date(),
            }),
          );
        }
      }
    }

    return memberships;
  }

  public async findByInstituteId(instituteId: string): Promise<InstituteMembershipEntity[]> {
    const isValidInstId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(instituteId);
    if (!isValidInstId) {
      return [];
    }

    const memberships: InstituteMembershipEntity[] = [];

    // Staff members
    const staffUsers = await db.user.findMany({
      where: { instituteId },
    });

    for (const u of staffUsers) {
      memberships.push(
        InstituteMembershipEntity.from({
          id: `mem:${u.id}:${instituteId}`,
          userId: u.id,
          instituteId,
          role: 'owner',
          status: u.status === 'active' ? 'active' : 'suspended',
          createdAt: u.createdAt,
          updatedAt: u.updatedAt,
        }),
      );
    }

    // Parent members
    const parentMemberships = await db.instituteMembership.findMany({
      where: { instituteId },
      include: { parentIdentity: true },
    });

    for (const pm of parentMemberships) {
      const user = await db.user.findFirst({
        where: { phone: pm.parentIdentity.phone },
      });
      memberships.push(
        InstituteMembershipEntity.from({
          id: pm.id,
          userId: user ? user.id : pm.parentIdentityId,
          instituteId,
          role: 'parent',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );
    }

    return memberships;
  }

  public async findStaffByInstituteId(
    instituteId: string,
    filters?: { role?: MembershipRole; status?: MembershipStatus },
  ): Promise<InstituteMembershipEntity[]> {
    const allMembers = await this.findByInstituteId(instituteId);
    return allMembers.filter((m) => {
      if (!m.isStaff) return false;
      if (filters?.role && m.role !== filters.role) return false;
      if (filters?.status && m.status !== filters.status) return false;
      return true;
    });
  }

  public async updateStatus(
    id: string,
    status: MembershipStatus,
  ): Promise<InstituteMembershipEntity> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundError(`Membership with ID ${id} not found.`);
    }

    if (id.startsWith('mem:') || existing.role !== 'parent') {
      await db.user.update({
        where: { id: existing.userId },
        data: {
          status: status === 'active' ? 'active' : 'suspended',
        },
      });
    }

    if (status === 'removed') {
      existing.remove();
    } else if (status === 'suspended') {
      existing.suspend();
    } else if (status === 'active') {
      existing.activate();
    }

    return existing;
  }

  public async updateRole(
    id: string,
    role: MembershipRole,
  ): Promise<InstituteMembershipEntity> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundError(`Membership with ID ${id} not found.`);
    }

    existing.updateRole(role);
    return existing;
  }

  public async delete(id: string): Promise<void> {
    const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (isValidUuid) {
      const existing = await db.instituteMembership.findUnique({
        where: { id },
      });

      if (existing) {
        await db.instituteMembership.delete({
          where: { id },
        });
      }
    }
  }
}
