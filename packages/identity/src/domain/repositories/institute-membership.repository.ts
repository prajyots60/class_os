import type {
  InstituteMembershipEntity,
  MembershipRole,
  MembershipStatus,
} from '../entities/institute-membership.entity';

export interface InstituteMembershipRepository {
  create(membership: InstituteMembershipEntity): Promise<InstituteMembershipEntity>;
  findById(id: string): Promise<InstituteMembershipEntity | null>;
  findByUserAndInstitute(
    userId: string,
    instituteId: string,
  ): Promise<InstituteMembershipEntity | null>;
  findByUserId(userId: string): Promise<InstituteMembershipEntity[]>;
  findByInstituteId(instituteId: string): Promise<InstituteMembershipEntity[]>;
  updateStatus(id: string, status: MembershipStatus): Promise<InstituteMembershipEntity>;
  updateRole(id: string, role: MembershipRole): Promise<InstituteMembershipEntity>;
  delete(id: string): Promise<void>;
}
