import { ValidationError } from '@coaching-os/shared';
import crypto from 'node:crypto';
import type { PaymentMode } from '../enums/payment-mode.enum';
import { isValidPaymentMode } from '../enums/payment-mode.enum';

function round2(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

export interface PaymentProps {
  id: string;
  invoiceId: string;
  amount: number;
  paymentMode: PaymentMode;
  receivedOn: Date;
  collectedBy?: string | null;
  remarks?: string | null;
  createdAt?: Date;
}

export interface CreatePaymentProps {
  id?: string;
  invoiceId: string;
  amount: number;
  paymentMode: PaymentMode;
  receivedOn?: Date | string;
  collectedBy?: string | null;
  remarks?: string | null;
}

export class PaymentEntity {
  private readonly _id: string;
  private readonly _invoiceId: string;
  private readonly _amount: number;
  private readonly _paymentMode: PaymentMode;
  private readonly _receivedOn: Date;
  private readonly _collectedBy: string | null;
  private readonly _remarks: string | null;
  private readonly _createdAt: Date;

  private constructor(props: PaymentProps) {
    this.validateId(props.id, 'Payment ID');
    this.validateId(props.invoiceId, 'Invoice ID');
    this.validateAmount(props.amount);

    if (!isValidPaymentMode(props.paymentMode)) {
      throw new ValidationError(`Invalid payment mode: ${props.paymentMode}. Must be cash, upi, or bank_transfer`);
    }

    if (!(props.receivedOn instanceof Date) || isNaN(props.receivedOn.getTime())) {
      throw new ValidationError('Invalid receivedOn date');
    }

    if (props.remarks !== undefined && props.remarks !== null) {
      if (typeof props.remarks !== 'string') {
        throw new ValidationError('Remarks must be a string');
      }
      if (props.remarks.length > 500) {
        throw new ValidationError('Remarks cannot exceed 500 characters');
      }
    }

    this._id = props.id.trim();
    this._invoiceId = props.invoiceId.trim();
    this._amount = round2(props.amount);
    this._paymentMode = props.paymentMode;
    this._receivedOn = new Date(props.receivedOn.getTime());
    this._collectedBy = props.collectedBy ? props.collectedBy.trim() : null;
    this._remarks = props.remarks ? props.remarks.trim() : null;
    this._createdAt = props.createdAt ? new Date(props.createdAt.getTime()) : new Date();
  }

  private validateId(val: string, fieldName: string): void {
    if (!val || typeof val !== 'string' || val.trim() === '') {
      throw new ValidationError(`${fieldName} cannot be empty`);
    }
  }

  private validateAmount(val: number): void {
    if (typeof val !== 'number' || isNaN(val) || !isFinite(val)) {
      throw new ValidationError('Payment amount must be a valid number');
    }
    if (val <= 0) {
      throw new ValidationError(`Payment amount must be strictly positive (> 0.00). Received ${val}`);
    }
  }

  public static create(props: CreatePaymentProps): PaymentEntity {
    const receivedOn = props.receivedOn
      ? props.receivedOn instanceof Date
        ? props.receivedOn
        : new Date(props.receivedOn)
      : new Date();

    return new PaymentEntity({
      id: props.id || crypto.randomUUID(),
      invoiceId: props.invoiceId,
      amount: props.amount,
      paymentMode: props.paymentMode,
      receivedOn,
      collectedBy: props.collectedBy,
      remarks: props.remarks,
    });
  }

  public static reconstitute(props: PaymentProps): PaymentEntity {
    return new PaymentEntity(props);
  }

  // ── Getters (Immutability Enforced: No Setters) ──────────────────────────

  public get id(): string {
    return this._id;
  }

  public get invoiceId(): string {
    return this._invoiceId;
  }

  public get amount(): number {
    return this._amount;
  }

  public get paymentMode(): PaymentMode {
    return this._paymentMode;
  }

  public get receivedOn(): Date {
    return new Date(this._receivedOn.getTime());
  }

  public get collectedBy(): string | null {
    return this._collectedBy;
  }

  public get remarks(): string | null {
    return this._remarks;
  }

  public get createdAt(): Date {
    return new Date(this._createdAt.getTime());
  }
}
