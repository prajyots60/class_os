import { ValidationError } from '@coaching-os/shared';
import crypto from 'node:crypto';
import type { BillingType } from '../enums/billing-type.enum';
import { isValidBillingType } from '../enums/billing-type.enum';
import type { DiscountType } from '../enums/discount-type.enum';
import { Discount } from '../value-objects/discount.vo';

function round2(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

export interface BillingPlanProps {
  id: string;
  instituteId: string;
  enrollmentId: string;
  type: BillingType;
  amount: number;
  discount: Discount;
  billingStartDate: Date;
  firstInvoiceAmountOverride?: number | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateBillingPlanProps {
  id?: string;
  instituteId: string;
  enrollmentId: string;
  type: BillingType;
  amount: number;
  discountType?: DiscountType | null;
  discountValue?: number | null;
  billingStartDate: Date | string;
  firstInvoiceAmountOverride?: number | null;
}

export class BillingPlanEntity {
  private readonly _id: string;
  private readonly _instituteId: string;
  private readonly _enrollmentId: string;
  private _type: BillingType;
  private _amount: number;
  private _discount: Discount;
  private _billingStartDate: Date;
  private _firstInvoiceAmountOverride: number | null;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  private constructor(props: BillingPlanProps) {
    this.validateId(props.id, 'BillingPlan ID');
    this.validateId(props.instituteId, 'Institute ID');
    this.validateId(props.enrollmentId, 'Enrollment ID (BIL-001)');
    this.validateAmount(props.amount, 'Base billing amount');

    if (!isValidBillingType(props.type)) {
      throw new ValidationError(`Invalid billing type: ${props.type}`);
    }

    if (!(props.billingStartDate instanceof Date) || isNaN(props.billingStartDate.getTime())) {
      throw new ValidationError('Invalid billing start date');
    }

    if (
      props.firstInvoiceAmountOverride !== undefined &&
      props.firstInvoiceAmountOverride !== null
    ) {
      this.validateAmount(props.firstInvoiceAmountOverride, 'First invoice amount override');
    }

    this._id = props.id.trim();
    this._instituteId = props.instituteId.trim();
    this._enrollmentId = props.enrollmentId.trim();
    this._type = props.type;
    this._amount = round2(props.amount);
    this._discount = props.discount;
    this._billingStartDate = new Date(props.billingStartDate.getTime());
    this._firstInvoiceAmountOverride =
      props.firstInvoiceAmountOverride !== undefined && props.firstInvoiceAmountOverride !== null
        ? round2(props.firstInvoiceAmountOverride)
        : null;
    this._createdAt = props.createdAt ? new Date(props.createdAt.getTime()) : new Date();
    this._updatedAt = props.updatedAt ? new Date(props.updatedAt.getTime()) : new Date();
  }

  private validateId(val: string, fieldName: string): void {
    if (!val || typeof val !== 'string' || val.trim() === '') {
      throw new ValidationError(`${fieldName} cannot be empty`);
    }
  }

  private validateAmount(val: number, fieldName: string): void {
    if (typeof val !== 'number' || isNaN(val) || !isFinite(val)) {
      throw new ValidationError(`${fieldName} must be a valid number`);
    }

    if (val < 0) {
      throw new ValidationError(`${fieldName} cannot be negative (${val})`);
    }
  }

  public static create(props: CreateBillingPlanProps): BillingPlanEntity {
    const startDate =
      props.billingStartDate instanceof Date
        ? props.billingStartDate
        : new Date(props.billingStartDate);

    const discount = Discount.create(props.discountType || 'none', props.discountValue);

    return new BillingPlanEntity({
      id: props.id || crypto.randomUUID(),
      instituteId: props.instituteId,
      enrollmentId: props.enrollmentId,
      type: props.type,
      amount: props.amount,
      discount,
      billingStartDate: startDate,
      firstInvoiceAmountOverride: props.firstInvoiceAmountOverride,
    });
  }

  public static reconstitute(props: BillingPlanProps): BillingPlanEntity {
    return new BillingPlanEntity(props);
  }

  // ── Getters ─────────────────────────────────────────────────────────────────

  public get id(): string {
    return this._id;
  }

  public get instituteId(): string {
    return this._instituteId;
  }

  public get enrollmentId(): string {
    return this._enrollmentId;
  }

  public get type(): BillingType {
    return this._type;
  }

  public get amount(): number {
    return this._amount;
  }

  public get discount(): Discount {
    return this._discount;
  }

  public get discountType(): DiscountType {
    return this._discount.type;
  }

  public get discountValue(): number | null {
    return this._discount.type === 'none' ? null : this._discount.value;
  }

  public get billingStartDate(): Date {
    return new Date(this._billingStartDate.getTime());
  }

  public get firstInvoiceAmountOverride(): number | null {
    return this._firstInvoiceAmountOverride;
  }

  public get createdAt(): Date {
    return new Date(this._createdAt.getTime());
  }

  public get updatedAt(): Date {
    return new Date(this._updatedAt.getTime());
  }

  // ── Calculations & Business Behavior ──────────────────────────────────────

  /**
   * Standard invoice amount = base amount - discount.
   */
  public calculateStandardInvoiceAmount(): number {
    return this._discount.calculateFinalAmount(this._amount);
  }

  /**
   * Effective first invoice amount:
   * Returns override if present, otherwise standard invoice amount.
   */
  public calculateEffectiveFirstInvoiceAmount(): number {
    if (this._firstInvoiceAmountOverride !== null) {
      return this._firstInvoiceAmountOverride;
    }
    return this.calculateStandardInvoiceAmount();
  }

  // ── State Mutators ─────────────────────────────────────────────────────────

  public updateDiscount(discountType: DiscountType, discountValue?: number | null): void {
    const newDiscount = Discount.create(discountType, discountValue);
    // Verify discount against base amount
    newDiscount.calculateFinalAmount(this._amount);
    this._discount = newDiscount;
    this._updatedAt = new Date();
  }

  public updateFirstInvoiceOverride(overrideAmount?: number | null): void {
    if (overrideAmount !== undefined && overrideAmount !== null) {
      this.validateAmount(overrideAmount, 'First invoice amount override');
      this._firstInvoiceAmountOverride = round2(overrideAmount);
    } else {
      this._firstInvoiceAmountOverride = null;
    }
    this._updatedAt = new Date();
  }
}
