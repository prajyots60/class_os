import type { EnrollmentRepository } from '@coaching-os/identity';
import { logger } from '@coaching-os/observability';
import { ConflictError, NotFoundError, ValidationError } from '@coaching-os/shared';
import { BillingPlanEntity } from '../../domain/entities/billing-plan.entity';
import type { BillingType } from '../../domain/enums/billing-type.enum';
import type { DiscountType } from '../../domain/enums/discount-type.enum';
import type { BillingPlanRepository } from '../../domain/repositories/billing-plan.repository';
import type { BillingPlanDTO } from '../dto/billing-plan.dto';
import { toBillingPlanDTO } from '../dto/billing-plan.dto';

const moduleLogger = logger.child({ module: 'billing' });

export interface CreateBillingPlanInput {
  instituteId: string;
  enrollmentId: string;
  type: BillingType;
  amount: number;
  discountType?: DiscountType | null;
  discountValue?: number | null;
  billingStartDate: Date | string;
  firstInvoiceAmountOverride?: number | null;
}

export interface GetBillingPlanInput {
  instituteId: string;
  id?: string;
  enrollmentId?: string;
}

export interface UpdateBillingPlanInput {
  instituteId: string;
  id: string;
  discountType?: DiscountType;
  discountValue?: number | null;
  firstInvoiceAmountOverride?: number | null;
}

export class CreateBillingPlanUseCase {
  constructor(
    private readonly billingPlanRepository: BillingPlanRepository,
    private readonly enrollmentRepository: EnrollmentRepository,
  ) {}

  public async execute(input: CreateBillingPlanInput): Promise<BillingPlanDTO> {
    if (!input.instituteId?.trim()) {
      throw new ValidationError('Institute ID is required');
    }
    if (!input.enrollmentId?.trim()) {
      throw new ValidationError('Enrollment ID is required (BIL-001)');
    }

    const instituteId = input.instituteId.trim();
    const enrollmentId = input.enrollmentId.trim();

    // 1. Verify Enrollment exists in tenant context
    const enrollment = await this.enrollmentRepository.findById(instituteId, enrollmentId);
    if (!enrollment) {
      throw new NotFoundError(`Enrollment with ID ${enrollmentId} not found in this institute`);
    }

    // 2. Verify BIL-004: One BillingPlan per enrollment
    const existingPlan = await this.billingPlanRepository.findByEnrollmentId(instituteId, enrollmentId);
    if (existingPlan) {
      throw new ConflictError(`An active billing plan already exists for enrollment ${enrollmentId} (BIL-004)`);
    }

    // 3. Construct BillingPlan entity
    const plan = BillingPlanEntity.create({
      instituteId,
      enrollmentId,
      type: input.type,
      amount: input.amount,
      discountType: input.discountType,
      discountValue: input.discountValue,
      billingStartDate: input.billingStartDate,
      firstInvoiceAmountOverride: input.firstInvoiceAmountOverride,
    });

    // 4. Persist entity
    const savedPlan = await this.billingPlanRepository.create(plan);

    // 5. Audit Log Event
    moduleLogger.info('billing.plan.create.success', {
      planId: savedPlan.id,
      instituteId: savedPlan.instituteId,
      enrollmentId: savedPlan.enrollmentId,
      type: savedPlan.type,
      amount: savedPlan.amount,
    });

    return toBillingPlanDTO(savedPlan);
  }
}

export class GetBillingPlanUseCase {
  constructor(private readonly billingPlanRepository: BillingPlanRepository) {}

  public async execute(input: GetBillingPlanInput): Promise<BillingPlanDTO> {
    if (!input.instituteId?.trim()) {
      throw new ValidationError('Institute ID is required');
    }

    const instituteId = input.instituteId.trim();
    let plan: BillingPlanEntity | null = null;

    if (input.id?.trim()) {
      plan = await this.billingPlanRepository.findById(instituteId, input.id.trim());
    } else if (input.enrollmentId?.trim()) {
      plan = await this.billingPlanRepository.findByEnrollmentId(instituteId, input.enrollmentId.trim());
    } else {
      throw new ValidationError('Either plan ID or enrollment ID must be provided');
    }

    if (!plan) {
      throw new NotFoundError('BillingPlan not found');
    }

    return toBillingPlanDTO(plan);
  }
}

export class UpdateBillingPlanUseCase {
  constructor(private readonly billingPlanRepository: BillingPlanRepository) {}

  public async execute(input: UpdateBillingPlanInput): Promise<BillingPlanDTO> {
    if (!input.instituteId?.trim()) {
      throw new ValidationError('Institute ID is required');
    }
    if (!input.id?.trim()) {
      throw new ValidationError('BillingPlan ID is required');
    }

    const instituteId = input.instituteId.trim();
    const id = input.id.trim();

    const plan = await this.billingPlanRepository.findById(instituteId, id);
    if (!plan) {
      throw new NotFoundError('BillingPlan not found');
    }

    if (input.discountType !== undefined) {
      plan.updateDiscount(input.discountType, input.discountValue);
    }

    if (input.firstInvoiceAmountOverride !== undefined) {
      plan.updateFirstInvoiceOverride(input.firstInvoiceAmountOverride);
    }

    const updatedPlan = await this.billingPlanRepository.update(plan);

    moduleLogger.info('billing.plan.update.success', {
      planId: updatedPlan.id,
      instituteId: updatedPlan.instituteId,
      discountType: updatedPlan.discountType,
    });

    return toBillingPlanDTO(updatedPlan);
  }
}
