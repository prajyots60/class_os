import type { BillingPlanEntity } from '../../domain/entities/billing-plan.entity';
import type { BillingType } from '../../domain/enums/billing-type.enum';
import type { DiscountType } from '../../domain/enums/discount-type.enum';

export interface BillingPlanDTO {
  id: string;
  instituteId: string;
  enrollmentId: string;
  type: BillingType;
  amount: number;
  discountType: DiscountType;
  discountValue: number | null;
  billingStartDate: string;
  firstInvoiceAmountOverride: number | null;
  standardInvoiceAmount: number;
  effectiveFirstInvoiceAmount: number;
  createdAt: string;
  updatedAt: string;
}

export function toBillingPlanDTO(entity: BillingPlanEntity): BillingPlanDTO {
  return {
    id: entity.id,
    instituteId: entity.instituteId,
    enrollmentId: entity.enrollmentId,
    type: entity.type,
    amount: entity.amount,
    discountType: entity.discountType,
    discountValue: entity.discountValue,
    billingStartDate: entity.billingStartDate.toISOString(),
    firstInvoiceAmountOverride: entity.firstInvoiceAmountOverride,
    standardInvoiceAmount: entity.calculateStandardInvoiceAmount(),
    effectiveFirstInvoiceAmount: entity.calculateEffectiveFirstInvoiceAmount(),
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
}
