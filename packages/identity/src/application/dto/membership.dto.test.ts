import { describe, expect, it } from 'vitest';
import { InstituteMembershipEntity } from '../../domain/entities/institute-membership.entity';
import { toStaffMembershipDTO } from './membership.dto';

describe('membership.dto (StaffMembershipDTO)', () => {
  it('maps InstituteMembershipEntity to StaffMembershipDTO without sensitive fields', () => {
    const entity = InstituteMembershipEntity.create({
      id: 'mem_123',
      userId: 'usr_456',
      instituteId: 'inst_789',
      role: 'teacher',
      status: 'active',
    });

    const userSummary = {
      name: 'John Doe',
      email: 'john.doe@example.com',
    };

    const dto = toStaffMembershipDTO(entity, userSummary);

    expect(dto).toEqual({
      id: 'mem_123',
      instituteId: 'inst_789',
      userId: 'usr_456',
      role: 'teacher',
      status: 'active',
      user: {
        name: 'John Doe',
        email: 'john.doe@example.com',
      },
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    });

    // Ensure sensitive security fields are absent from keys
    expect(dto).not.toHaveProperty('password');
    expect(dto).not.toHaveProperty('passwordHash');
    expect(dto).not.toHaveProperty('sessionToken');
    expect(dto).not.toHaveProperty('mfaSecret');
  });

  it('handles null user summary gracefully', () => {
    const entity = InstituteMembershipEntity.create({
      id: 'mem_999',
      userId: 'usr_999',
      instituteId: 'inst_789',
      role: 'assistant',
      status: 'suspended',
    });

    const dto = toStaffMembershipDTO(entity, null);

    expect(dto.user).toBeNull();
    expect(dto.role).toBe('assistant');
    expect(dto.status).toBe('suspended');
  });

  it('omits user field when user argument is undefined', () => {
    const entity = InstituteMembershipEntity.create({
      id: 'mem_000',
      userId: 'usr_000',
      instituteId: 'inst_789',
      role: 'owner',
      status: 'active',
    });

    const dto = toStaffMembershipDTO(entity);

    expect(dto).not.toHaveProperty('user');
    expect(dto.role).toBe('owner');
  });
});
