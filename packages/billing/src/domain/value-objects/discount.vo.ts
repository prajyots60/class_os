import { ValidationError } from '@coaching-os/shared';
import type { DiscountType } from '../enums/discount-type.enum';

function round2(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

export class Discount {
  private readonly _type: DiscountType;
  private readonly _value: number;

  private constructor(type: DiscountType, value: number) {
    this._type = type;
    this._value = round2(value);
  }

  public static create(type: DiscountType, value?: number | null): Discount {
    if (!type || (type !== 'none' && type !== 'percentage' && type !== 'fixed')) {
      throw new ValidationError(`Invalid discount type: ${type}`);
    }

    if (type === 'none') {
      return new Discount('none', 0);
    }

    if (value === undefined || value === null || typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
      throw new ValidationError(`Discount value is required for discount type '${type}'`);
    }

    if (value < 0) {
      throw new ValidationError(`Discount value cannot be negative (${value})`);
    }

    if (type === 'percentage' && value > 100) {
      throw new ValidationError(`Percentage discount cannot exceed 100% (${value}%)`);
    }

    return new Discount(type, value);
  }

  public static none(): Discount {
    return new Discount('none', 0);
  }

  public get type(): DiscountType {
    return this._type;
  }

  public get value(): number {
    return this._value;
  }

  /**
   * Calculates discount amount given a base amount.
   * Enforces 2-decimal precision.
   */
  public calculateDiscount(baseAmount: number): number {
    if (typeof baseAmount !== 'number' || isNaN(baseAmount) || !isFinite(baseAmount) || baseAmount < 0) {
      throw new ValidationError(`Base amount must be a valid non-negative number (${baseAmount})`);
    }

    const roundedBase = round2(baseAmount);

    if (this._type === 'none') {
      return 0;
    }

    if (this._type === 'percentage') {
      const discount = round2(roundedBase * (this._value / 100));
      return Math.min(discount, roundedBase);
    }

    // fixed discount
    if (this._value > roundedBase) {
      throw new ValidationError(
        `Fixed discount (${this._value}) cannot exceed base billing amount (${roundedBase})`,
      );
    }

    return round2(this._value);
  }

  /**
   * Calculates final bill amount after applying discount.
   * Invariant: finalAmount >= 0.
   */
  public calculateFinalAmount(baseAmount: number): number {
    const roundedBase = round2(baseAmount);
    const discountAmount = this.calculateDiscount(roundedBase);
    const finalAmount = round2(roundedBase - discountAmount);

    if (finalAmount < 0) {
      throw new ValidationError(`Final bill amount cannot be negative (${finalAmount})`);
    }

    return finalAmount;
  }
}
