import type {
  InstituteMembershipEntity,
  MembershipRole,
  MembershipStatus,
} from '../../domain/entities/institute-membership.entity';

export interface StaffUserSummaryDTO {
  name: string | null;
  email: string | null;
}

/**
 * Safe presentation DTO for Staff / Institute Membership resources in Protected Identity APIs.
 * Excludes sensitive fields (passwords, MFA keys, OAuth tokens, session secrets, system credentials).
 */
export interface StaffMembershipDTO {
  id: string;
  instituteId: string;
  userId: string;
  role: MembershipRole;
  status: MembershipStatus;
  user?: StaffUserSummaryDTO | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Pure deterministic converter from InstituteMembershipEntity to StaffMembershipDTO.
 */
export function toStaffMembershipDTO(
  entity: InstituteMembershipEntity,
  user?: StaffUserSummaryDTO | null,
): StaffMembershipDTO {
  return {
    id: entity.id,
    instituteId: entity.instituteId,
    userId: entity.userId,
    role: entity.role,
    status: entity.status,
    ...(user !== undefined ? { user: user ?? null } : {}),
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
}
