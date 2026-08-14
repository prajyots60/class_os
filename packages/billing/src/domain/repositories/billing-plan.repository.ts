import type { BillingPlanEntity } from '../entities/billing-plan.entity';

/**
 * BillingPlanRepository Interface
 *
 * Domain repository abstraction for tenant-scoped BillingPlan persistence.
 *
 * ARCHITECTURAL CONTRACT:
 * - Framework-independent, zero Prisma or HTTP dependencies.
 * - Operates strictly on `BillingPlanEntity` domain entities.
 * - EVERY query method requires `instituteId` as an explicit parameter to enforce
 *   strict multi-tenant isolation at the persistence boundary.
 * - Cross-tenant lookups return null.
 * - Financial History Rule: No destructive delete() method.
 */
export interface BillingPlanRepository {
  /**
   * Persists a new BillingPlan domain entity.
   * Throws ConflictError if duplicate enrollment billing plan constraint (BIL-004) is violated.
   */
  create(plan: BillingPlanEntity): Promise<BillingPlanEntity>;

  /**
   * Look up a BillingPlan by ID strictly within tenant context.
   * Cross-tenant lookups return null.
   */
  findById(instituteId: string, id: string): Promise<BillingPlanEntity | null>;

  /**
   * Look up a BillingPlan for a specific enrollment strictly within tenant context.
   * Cross-tenant lookups return null.
   */
  findByEnrollmentId(instituteId: string, enrollmentId: string): Promise<BillingPlanEntity | null>;

  /**
   * Query BillingPlan collection strictly within tenant context.
   */
  findMany(
    instituteId: string,
    filter?: {
      enrollmentId?: string;
      studentId?: string;
      feeType?: string;
      cursor?: string;
      limit?: number;
    }
  ): Promise<BillingPlanEntity[]>;

  /**
   * Update an existing BillingPlan entity strictly within tenant context.
   * Throws NotFoundError if plan does not exist within the specified tenant.
   */
  update(plan: BillingPlanEntity): Promise<BillingPlanEntity>;
}
