import { ValidationError } from '@coaching-os/shared';

export interface CreateReceiptProps {
  id?: string;
  instituteId: string;
  paymentId: string;
  receiptNumber: string;
  generatedAt?: Date;
}

export interface ReconstituteReceiptProps {
  id: string;
  instituteId: string;
  paymentId: string;
  receiptNumber: string;
  generatedAt: Date;
}

export class ReceiptEntity {
  private readonly _id: string;
  private readonly _instituteId: string;
  private readonly _paymentId: string;
  private readonly _receiptNumber: string;
  private readonly _generatedAt: Date;

  private constructor(props: ReconstituteReceiptProps) {
    this._id = props.id;
    this._instituteId = props.instituteId;
    this._paymentId = props.paymentId;
    this._receiptNumber = props.receiptNumber;
    this._generatedAt = new Date(props.generatedAt.getTime());

    this.validate();
  }

  private validate(): void {
    if (!this._id || !this._id.trim()) {
      throw new ValidationError('Receipt ID is required');
    }
    if (!this._instituteId || !this._instituteId.trim()) {
      throw new ValidationError('Institute ID is required');
    }
    if (!this._paymentId || !this._paymentId.trim()) {
      throw new ValidationError('Payment ID is required');
    }
    if (!this._receiptNumber || !this._receiptNumber.trim()) {
      throw new ValidationError('Receipt number is required');
    }
    if (!(this._generatedAt instanceof Date) || isNaN(this._generatedAt.getTime())) {
      throw new ValidationError('Valid generatedAt date is required');
    }
  }

  public static create(props: CreateReceiptProps): ReceiptEntity {
    const id = props.id?.trim() || crypto.randomUUID();
    const generatedAt = props.generatedAt ? new Date(props.generatedAt.getTime()) : new Date();

    return new ReceiptEntity({
      id,
      instituteId: props.instituteId?.trim(),
      paymentId: props.paymentId?.trim(),
      receiptNumber: props.receiptNumber?.trim(),
      generatedAt,
    });
  }

  public static reconstitute(props: ReconstituteReceiptProps): ReceiptEntity {
    return new ReceiptEntity({
      id: props.id?.trim(),
      instituteId: props.instituteId?.trim(),
      paymentId: props.paymentId?.trim(),
      receiptNumber: props.receiptNumber?.trim(),
      generatedAt: new Date(props.generatedAt.getTime()),
    });
  }

  // 100% Immutable Getters - No setters or mutation methods exist
  public get id(): string {
    return this._id;
  }

  public get instituteId(): string {
    return this._instituteId;
  }

  public get paymentId(): string {
    return this._paymentId;
  }

  public get receiptNumber(): string {
    return this._receiptNumber;
  }

  public get generatedAt(): Date {
    return new Date(this._generatedAt.getTime());
  }
}
