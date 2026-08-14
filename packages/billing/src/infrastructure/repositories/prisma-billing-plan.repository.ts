import type { PrismaClient } from '@coaching-os/database';
import { ConflictError, NotFoundError } from '@coaching-os/shared';
import { BillingPlanEntity } from '../../domain/entities/billing-plan.entity';
import type { BillingType } from '../../domain/enums/billing-type.enum';
import type { DiscountType } from '../../domain/enums/discount-type.enum';
import type { BillingPlanRepository } from '../../domain/repositories/billing-plan.repository';
import { Discount } from '../../domain/value-objects/discount.vo';

export class PrismaBillingPlanRepository implements BillingPlanRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private mapToDomain(record: {
    id: string;
    enrollmentId: string;
    type: string;
    amount: { toNumber(): number } | number;
    discountType: string | null;
    discountValue: { toNumber(): number } | number | null;
    billingStartDate: Date;
    firstInvoiceAmountOverride: { toNumber(): number } | number | null;
    createdAt: Date;
    updatedAt: Date;
    enrollment: { instituteId: string };
  }): BillingPlanEntity {
    const amount = typeof record.amount === 'number' ? record.amount : record.amount.toNumber();

    const discountType = (record.discountType as DiscountType) || 'none';
    const rawDiscountValue =
      record.discountValue !== null && record.discountValue !== undefined
        ? typeof record.discountValue === 'number'
          ? record.discountValue
          : record.discountValue.toNumber()
        : null;

    const discount = Discount.create(discountType, rawDiscountValue);

    const override =
      record.firstInvoiceAmountOverride !== null && record.firstInvoiceAmountOverride !== undefined
        ? typeof record.firstInvoiceAmountOverride === 'number'
          ? record.firstInvoiceAmountOverride
          : record.firstInvoiceAmountOverride.toNumber()
        : null;

    return BillingPlanEntity.reconstitute({
      id: record.id,
      instituteId: record.enrollment.instituteId,
      enrollmentId: record.enrollmentId,
      type: record.type as BillingType,
      amount,
      discount,
      billingStartDate: record.billingStartDate,
      firstInvoiceAmountOverride: override,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  public async create(plan: BillingPlanEntity): Promise<BillingPlanEntity> {
    const existing = await this.findByEnrollmentId(plan.instituteId, plan.enrollmentId);
    if (existing) {
      throw new ConflictError(
        `An active billing plan already exists for enrollment ${plan.enrollmentId} (BIL-004)`,
      );
    }

    try {
      const record = await this.prisma.billingPlan.create({
        data: {
          id: plan.id,
          enrollmentId: plan.enrollmentId,
          type: plan.type,
          amount: plan.amount,
          discountType: plan.discountType,
          discountValue: plan.discountValue,
          billingStartDate: plan.billingStartDate,
          firstInvoiceAmountOverride: plan.firstInvoiceAmountOverride,
          createdAt: plan.createdAt,
          updatedAt: plan.updatedAt,
        },
        include: {
          enrollment: {
            select: { instituteId: true },
          },
        },
      });

      return this.mapToDomain(record);
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new ConflictError(
          `An active billing plan already exists for enrollment ${plan.enrollmentId} (BIL-004)`,
        );
      }
      if (error?.code === 'P2003') {
        throw new NotFoundError(
          `Enrollment with ID ${plan.enrollmentId} does not exist in database`,
        );
      }
      throw error;
    }
  }

  public async findById(instituteId: string, id: string): Promise<BillingPlanEntity | null> {
    const record = await this.prisma.billingPlan.findFirst({
      where: {
        id,
        enrollment: {
          instituteId,
        },
      },
      include: {
        enrollment: {
          select: { instituteId: true },
        },
      },
    });

    if (!record) {
      return null;
    }

    return this.mapToDomain(record);
  }

  public async findByEnrollmentId(
    instituteId: string,
    enrollmentId: string,
  ): Promise<BillingPlanEntity | null> {
    const record = await this.prisma.billingPlan.findFirst({
      where: {
        enrollmentId,
        enrollment: {
          instituteId,
        },
      },
      include: {
        enrollment: {
          select: { instituteId: true },
        },
      },
    });

    if (!record) {
      return null;
    }

    return this.mapToDomain(record);
  }

  public async update(plan: BillingPlanEntity): Promise<BillingPlanEntity> {
    // 1. Verify tenant scoping
    const existing = await this.findById(plan.instituteId, plan.id);
    if (!existing) {
      throw new NotFoundError(`BillingPlan with ID ${plan.id} not found in this institute`);
    }

    try {
      const record = await this.prisma.billingPlan.update({
        where: { id: plan.id },
        data: {
          type: plan.type,
          amount: plan.amount,
          discountType: plan.discountType,
          discountValue: plan.discountValue,
          billingStartDate: plan.billingStartDate,
          firstInvoiceAmountOverride: plan.firstInvoiceAmountOverride,
          updatedAt: plan.updatedAt,
        },
        include: {
          enrollment: {
            select: { instituteId: true },
          },
        },
      });

      return this.mapToDomain(record);
    } catch (error: any) {
      if (error?.code === 'P2025') {
        throw new NotFoundError(`BillingPlan with ID ${plan.id} not found`);
      }
      throw error;
    }
  }
}
