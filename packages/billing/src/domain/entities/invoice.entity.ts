import { ValidationError } from '@coaching-os/shared';
import crypto from 'node:crypto';
import type { InvoiceStatus } from '../enums/invoice-status.enum';
import { isValidInvoiceStatus } from '../enums/invoice-status.enum';

function round2(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

export interface InvoiceProps {
  id: string;
  billingPlanId: string;
  amount: number;
  dueDate: Date;
  status?: InvoiceStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateInvoiceProps {
  id?: string;
  billingPlanId: string;
  amount: number;
  dueDate: Date | string;
  status?: InvoiceStatus;
}

export class InvoiceEntity {
  private readonly _id: string;
  private readonly _billingPlanId: string;
  private readonly _amount: number;
  private readonly _dueDate: Date;
  private _status: InvoiceStatus;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  private constructor(props: InvoiceProps) {
    this.validateId(props.id, 'Invoice ID');
    this.validateId(props.billingPlanId, 'BillingPlan ID');
    this.validateAmount(props.amount, 'Invoice amount');

    if (props.status !== undefined && !isValidInvoiceStatus(props.status)) {
      throw new ValidationError(`Invalid invoice status: ${props.status}`);
    }

    if (!(props.dueDate instanceof Date) || isNaN(props.dueDate.getTime())) {
      throw new ValidationError('Invalid invoice due date');
    }

    this._id = props.id.trim();
    this._billingPlanId = props.billingPlanId.trim();
    this._amount = round2(props.amount);
    this._dueDate = new Date(props.dueDate.getTime());
    this._status = props.status || 'pending';
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

  public static create(props: CreateInvoiceProps): InvoiceEntity {
    const dueDate = props.dueDate instanceof Date ? props.dueDate : new Date(props.dueDate);

    return new InvoiceEntity({
      id: props.id || crypto.randomUUID(),
      billingPlanId: props.billingPlanId,
      amount: props.amount,
      dueDate,
      status: props.status || 'pending',
    });
  }

  public static reconstitute(props: InvoiceProps): InvoiceEntity {
    return new InvoiceEntity(props);
  }

  // ── Getters (Immutability Enforced: No Setters for Financial Fields) ─────────

  public get id(): string {
    return this._id;
  }

  public get billingPlanId(): string {
    return this._billingPlanId;
  }

  public get amount(): number {
    return this._amount;
  }

  public get dueDate(): Date {
    return new Date(this._dueDate.getTime());
  }

  public get status(): InvoiceStatus {
    return this._status;
  }

  public get createdAt(): Date {
    return new Date(this._createdAt.getTime());
  }

  public get updatedAt(): Date {
    return new Date(this._updatedAt.getTime());
  }

  // ── Derived Computations ──────────────────────────────────────────────────

  /**
   * Calculates outstanding amount = invoice amount - total paid.
   * Outstanding balance is strictly computed, never persisted.
   */
  public calculateOutstanding(totalPaid: number): number {
    if (typeof totalPaid !== 'number' || isNaN(totalPaid) || totalPaid < 0) {
      throw new ValidationError('totalPaid must be a non-negative number');
    }
    return round2(Math.max(0, this._amount - totalPaid));
  }

  /**
   * Evaluates if invoice is overdue as of a given date (defaulting to current time).
   * Overdue is derived: dueDate < asOfDate AND status != 'paid'.
   */
  public isOverdue(asOfDate: Date = new Date()): boolean {
    if (!(asOfDate instanceof Date) || isNaN(asOfDate.getTime())) {
      throw new ValidationError('Invalid asOfDate for overdue check');
    }
    return asOfDate.getTime() > this._dueDate.getTime() && this._status !== 'paid';
  }

  // ── State Transitions (Payment Engine Integration) ─────────────────────────

  /**
   * Recalculates and updates invoice status based on total accumulated payments.
   * Enforces valid state machine transitions (no backward transitions from 'paid').
   */
  public updateStatusFromPayments(totalPaid: number): void {
    if (typeof totalPaid !== 'number' || isNaN(totalPaid) || totalPaid < 0) {
      throw new ValidationError('totalPaid must be a non-negative number');
    }

    const roundedPaid = round2(totalPaid);
    let newStatus: InvoiceStatus;

    if (roundedPaid <= 0) {
      newStatus = 'pending';
    } else if (roundedPaid < this._amount) {
      newStatus = 'partial';
    } else {
      newStatus = 'paid';
    }

    if (this._status === 'paid' && newStatus !== 'paid') {
      throw new ValidationError(`Cannot transition invoice status from 'paid' to '${newStatus}'`);
    }

    if (this._status === 'partial' && newStatus === 'pending') {
      throw new ValidationError(`Cannot transition invoice status from 'partial' to 'pending'`);
    }

    this._status = newStatus;
    this._updatedAt = new Date();
  }
}
