import type { InstituteEntity } from '../entities/institute.entity';
import type { InstituteMembershipEntity } from '../entities/institute-membership.entity';

export interface OnboardInstituteResult {
  institute: InstituteEntity;
  membership: InstituteMembershipEntity;
}

export interface InstituteOnboardingRepository {
  /**
   * Atomically persists a new Institute and its primary Owner Membership within a single transaction.
   * Interface contract to be implemented by infrastructure (e.g. PrismaOnboardInstituteRepository).
   */
  onboard(
    institute: InstituteEntity,
    membership: InstituteMembershipEntity,
  ): Promise<OnboardInstituteResult>;
}
