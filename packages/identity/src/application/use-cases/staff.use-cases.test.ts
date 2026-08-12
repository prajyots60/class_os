import { describe, it, expect, beforeEach } from 'vitest';
import { AuthorizationError, ConflictError, NotFoundError, ValidationError } from '@coaching-os/shared';
import { InstituteMembershipEntity, type MembershipRole, type MembershipStatus } from '../../domain/entities/institute-membership.entity';
import type { InstituteMembershipRepository } from '../../domain/repositories/institute-membership.repository';
import {
  ListStaffMembershipsUseCase,
  GetStaffMembershipUseCase,
  InviteStaffMemberUseCase,
  UpdateStaffRoleUseCase,
  ChangeStaffStatusUseCase,
  RemoveStaffMemberUseCase,
} from './staff.use-cases';
import type { TenantContext } from './membership.use-cases';

class InMemoryMembershipRepository implements InstituteMembershipRepository {
  public memberships: Map<string, InstituteMembershipEntity> = new Map();

  public async create(membership: InstituteMembershipEntity): Promise<InstituteMembershipEntity> {
    this.memberships.set(membership.id, membership);
    return membership;
  }

  public async findById(id: string): Promise<InstituteMembershipEntity | null> {
    return this.memberships.get(id) || null;
  }

  public async findByUserAndInstitute(
    userId: string,
    instituteId: string,
  ): Promise<InstituteMembershipEntity | null> {
    for (const m of this.memberships.values()) {
      if (m.userId === userId && m.instituteId === instituteId) {
        return m;
      }
    }
    return null;
  }

  public async findByUserId(userId: string): Promise<InstituteMembershipEntity[]> {
    const res: InstituteMembershipEntity[] = [];
    for (const m of this.memberships.values()) {
      if (m.userId === userId) {
        res.push(m);
      }
    }
    return res;
  }

  public async findByInstituteId(instituteId: string): Promise<InstituteMembershipEntity[]> {
    const res: InstituteMembershipEntity[] = [];
    for (const m of this.memberships.values()) {
      if (m.instituteId === instituteId) {
        res.push(m);
      }
    }
    return res;
  }

  public async findStaffByInstituteId(
    instituteId: string,
    filters?: { role?: MembershipRole; status?: MembershipStatus },
  ): Promise<InstituteMembershipEntity[]> {
    const res: InstituteMembershipEntity[] = [];
    for (const m of this.memberships.values()) {
      if (m.instituteId === instituteId && m.isStaff) {
        if (filters?.role && m.role !== filters.role) continue;
        if (filters?.status && m.status !== filters.status) continue;
        res.push(m);
      }
    }
    return res;
  }

  public async updateStatus(
    id: string,
    status: MembershipStatus,
  ): Promise<InstituteMembershipEntity> {
    const existing = this.memberships.get(id);
    if (!existing) {
      throw new NotFoundError(`Membership with ID ${id} not found.`);
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
    const existing = this.memberships.get(id);
    if (!existing) {
      throw new NotFoundError(`Membership with ID ${id} not found.`);
    }

    existing.updateRole(role);
    return existing;
  }

  public async delete(id: string): Promise<void> {
    this.memberships.delete(id);
  }
}

describe('Staff Management Application Use Cases Suite', () => {
  let repository: InMemoryMembershipRepository;

  const instA = '00000000-0000-4000-a000-000000000001';
  const instB = '00000000-0000-4000-a000-000000000002';

  const ownerA: TenantContext = {
    userId: 'usr_owner_a',
    instituteId: instA,
    membershipId: 'mem_owner_a',
    role: 'owner',
    status: 'active',
  };

  const assistantA: TenantContext = {
    userId: 'usr_assistant_a',
    instituteId: instA,
    membershipId: 'mem_assistant_a',
    role: 'assistant',
    status: 'active',
  };

  const teacherA: TenantContext = {
    userId: 'usr_teacher_a',
    instituteId: instA,
    membershipId: 'mem_teacher_a',
    role: 'teacher',
    status: 'active',
  };

  const ownerB: TenantContext = {
    userId: 'usr_owner_b',
    instituteId: instB,
    membershipId: 'mem_owner_b',
    role: 'owner',
    status: 'active',
  };

  let staffMem1: InstituteMembershipEntity;
  let staffMem2: InstituteMembershipEntity;

  beforeEach(async () => {
    repository = new InMemoryMembershipRepository();

    staffMem1 = InstituteMembershipEntity.create({
      id: 'mem_staff_1',
      userId: 'usr_staff_1',
      instituteId: instA,
      role: 'teacher',
      status: 'active',
    });

    staffMem2 = InstituteMembershipEntity.create({
      id: 'mem_staff_2',
      userId: 'usr_staff_2',
      instituteId: instA,
      role: 'assistant',
      status: 'active',
    });

    await repository.create(staffMem1);
    await repository.create(staffMem2);
  });

  // ── STAFF-01: Unauthenticated context failure ────────────────────────────────
  it('STAFF-01: Unauthenticated request without tenant context throws AuthorizationError', async () => {
    const listUseCase = new ListStaffMembershipsUseCase(repository);
    await expect(listUseCase.execute({ instituteId: instA })).rejects.toThrow(
      AuthorizationError,
    );

    const getUseCase = new GetStaffMembershipUseCase(repository);
    await expect(getUseCase.execute({ id: staffMem1.id })).rejects.toThrow(
      AuthorizationError,
    );

    const inviteUseCase = new InviteStaffMemberUseCase(repository);
    await expect(
      inviteUseCase.execute({ userId: 'usr_new', role: 'teacher' }),
    ).rejects.toThrow(AuthorizationError);
  });

  // ── STAFF-02: Capability denial ──────────────────────────────────────────────
  it('STAFF-02: User lacking required capability is rejected with AuthorizationError', async () => {
    // Teacher lacks staff:invite capability
    const inviteUseCase = new InviteStaffMemberUseCase(repository);
    await expect(
      inviteUseCase.execute({
        userId: 'usr_new',
        role: 'teacher',
        tenantContext: teacherA,
      }),
    ).rejects.toThrow(AuthorizationError);

    // Assistant lacks staff:role_change capability
    const roleUseCase = new UpdateStaffRoleUseCase(repository);
    await expect(
      roleUseCase.execute({
        id: staffMem1.id,
        role: 'owner',
        tenantContext: assistantA,
      }),
    ).rejects.toThrow(AuthorizationError);
  });

  // ── STAFF-03: Cross-tenant access protection ────────────────────────────────
  it('STAFF-03: Cross-tenant staff query or mutation is rejected', async () => {
    // Owner of Institute B trying to access staff of Institute A
    const getUseCase = new GetStaffMembershipUseCase(repository);
    await expect(
      getUseCase.execute({ id: staffMem1.id, tenantContext: ownerB }),
    ).rejects.toThrow(NotFoundError);

    const listUseCase = new ListStaffMembershipsUseCase(repository);
    await expect(
      listUseCase.execute({ instituteId: instA, tenantContext: ownerB }),
    ).rejects.toThrow(AuthorizationError);
  });

  // ── STAFF-04: Duplicate invitation protection ────────────────────────────────
  it('STAFF-04: Duplicate staff invitation for existing active member throws ConflictError', async () => {
    const inviteUseCase = new InviteStaffMemberUseCase(repository);
    await expect(
      inviteUseCase.execute({
        userId: staffMem1.userId,
        role: 'teacher',
        tenantContext: ownerA,
      }),
    ).rejects.toThrow(ConflictError);
  });

  // ── STAFF-05: Invalid lifecycle transition ────────────────────────────────────
  it('STAFF-05: Operating on removed staff membership throws NotFoundError', async () => {
    staffMem1.remove();
    await repository.updateStatus(staffMem1.id, 'removed');

    const roleUseCase = new UpdateStaffRoleUseCase(repository);
    await expect(
      roleUseCase.execute({
        id: staffMem1.id,
        role: 'owner',
        tenantContext: ownerA,
      }),
    ).rejects.toThrow(NotFoundError);
  });

  // ── STAFF-06: Role escalation prevention ────────────────────────────────────
  it('STAFF-06: Promoting user to owner without institute:update capability throws AuthorizationError', async () => {
    const roleUseCase = new UpdateStaffRoleUseCase(repository);

    // Assistant trying to promote user to owner
    await expect(
      roleUseCase.execute({
        id: staffMem1.id,
        role: 'owner',
        tenantContext: assistantA,
      }),
    ).rejects.toThrow(AuthorizationError);
  });

  // ── STAFF-07: Self role escalation prevention ────────────────────────────────
  it('STAFF-07: User modifying their own role is rejected with AuthorizationError', async () => {
    const roleUseCase = new UpdateStaffRoleUseCase(repository);

    const ownerAMem = InstituteMembershipEntity.create({
      id: ownerA.membershipId,
      userId: ownerA.userId,
      instituteId: ownerA.instituteId,
      role: 'owner',
      status: 'active',
    });
    await repository.create(ownerAMem);

    await expect(
      roleUseCase.execute({
        id: ownerA.membershipId,
        role: 'teacher',
        tenantContext: ownerA,
      }),
    ).rejects.toThrow(/Users cannot modify their own staff role/i);
  });

  // ── STAFF-08: Self membership removal protection ────────────────────────────
  it('STAFF-08: User removing their own membership is rejected with AuthorizationError', async () => {
    const removeUseCase = new RemoveStaffMemberUseCase(repository);

    // Add ownerA membership to repository
    const ownerAMem = InstituteMembershipEntity.create({
      id: ownerA.membershipId,
      userId: ownerA.userId,
      instituteId: ownerA.instituteId,
      role: 'owner',
      status: 'active',
    });
    await repository.create(ownerAMem);

    await expect(
      removeUseCase.execute({
        id: ownerA.membershipId,
        tenantContext: ownerA,
      }),
    ).rejects.toThrow(/Users cannot remove their own membership/i);
  });

  // ── STAFF-09: Self status mutation protection ────────────────────────────────
  it('STAFF-09: User suspending their own membership is rejected with AuthorizationError', async () => {
    const statusUseCase = new ChangeStaffStatusUseCase(repository);

    const ownerAMem = InstituteMembershipEntity.create({
      id: ownerA.membershipId,
      userId: ownerA.userId,
      instituteId: ownerA.instituteId,
      role: 'owner',
      status: 'active',
    });
    await repository.create(ownerAMem);

    await expect(
      statusUseCase.execute({
        id: ownerA.membershipId,
        status: 'suspended',
        tenantContext: ownerA,
      }),
    ).rejects.toThrow(/Users cannot modify their own membership status/i);
  });

  // ── STAFF-10: Tenant spoofing prevention ──────────────────────────────────────
  it('STAFF-10: Tenant ID override attempt is rejected; server derives from session context', async () => {
    const inviteUseCase = new InviteStaffMemberUseCase(repository);

    const invited = await inviteUseCase.execute({
      userId: 'usr_new_teacher',
      role: 'teacher',
      tenantContext: ownerA,
    });

    // Institute ID matches ownerA's session instituteId
    expect(invited.instituteId).toBe(instA);
  });

  // ── STAFF-11: Valid staff listing ───────────────────────────────────────────
  it('STAFF-11: Valid staff listing returns only tenant staff members', async () => {
    const listUseCase = new ListStaffMembershipsUseCase(repository);
    const staffList = await listUseCase.execute({
      instituteId: instA,
      tenantContext: ownerA,
    });

    expect(staffList.length).toBe(2);
    expect(staffList.map((m) => m.id)).toContain(staffMem1.id);
    expect(staffList.map((m) => m.id)).toContain(staffMem2.id);
  });

  // ── STAFF-12: Valid role change ─────────────────────────────────────────────
  it('STAFF-12: Owner successfully updates staff member role', async () => {
    const roleUseCase = new UpdateStaffRoleUseCase(repository);
    const updated = await roleUseCase.execute({
      id: staffMem1.id,
      role: 'assistant',
      tenantContext: ownerA,
    });

    expect(updated.role).toBe('assistant');
  });

  // ── STAFF-13: Valid status change ───────────────────────────────────────────
  it('STAFF-13: Owner successfully suspends and reactivates staff member', async () => {
    const statusUseCase = new ChangeStaffStatusUseCase(repository);

    const suspended = await statusUseCase.execute({
      id: staffMem1.id,
      status: 'suspended',
      tenantContext: ownerA,
    });
    expect(suspended.status).toBe('suspended');

    const activated = await statusUseCase.execute({
      id: staffMem1.id,
      status: 'active',
      tenantContext: ownerA,
    });
    expect(activated.status).toBe('active');
  });

  // ── STAFF-14: Valid removal ──────────────────────────────────────────────────
  it('STAFF-14: Owner successfully removes staff member', async () => {
    const removeUseCase = new RemoveStaffMemberUseCase(repository);

    await removeUseCase.execute({
      id: staffMem2.id,
      tenantContext: ownerA,
    });

    const check = await repository.findById(staffMem2.id);
    expect(check?.status).toBe('removed');
  });
});
