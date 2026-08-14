import type { PrismaClient } from '@coaching-os/database';
import { ConflictError, NotFoundError } from '@coaching-os/shared';
import { PaymentEntity } from '../../domain/entities/payment.entity';
import type { PaymentMode } from '../../domain/enums/payment-mode.enum';
import type { PaymentRepository } from '../../domain/repositories/payment.repository';

export class PrismaPaymentRepository implements PaymentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private mapToDomain(record: {
    id: string;
    invoiceId: string;
    amount: { toNumber(): number } | number;
    paymentMode: string;
    receivedOn: Date;
    collectedBy: string | null;
    remarks: string | null;
    createdAt: Date;
  }): PaymentEntity {
    const amount = typeof record.amount === 'number' ? record.amount : record.amount.toNumber();

    return PaymentEntity.reconstitute({
      id: record.id,
      invoiceId: record.invoiceId,
      amount,
      paymentMode: record.paymentMode as PaymentMode,
      receivedOn: record.receivedOn,
      collectedBy: record.collectedBy,
      remarks: record.remarks,
      createdAt: record.createdAt,
    });
  }

  public async save(payment: PaymentEntity, instituteId: string, tx?: unknown): Promise<void> {
    const client = (tx as PrismaClient) || this.prisma;

    // 1. Verify tenant ownership chain: Payment -> Invoice -> BillingPlan -> Enrollment -> Institute
    const invoice = await client.invoice.findFirst({
      where: {
        id: payment.invoiceId,
        billingPlan: {
          enrollment: {
            instituteId,
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundError(
        `Invoice with ID ${payment.invoiceId} not found in this institute`
      );
    }

    try {
      await client.payment.upsert({
        where: { id: payment.id },
        create: {
          id: payment.id,
          invoiceId: payment.invoiceId,
          amount: payment.amount,
          paymentMode: payment.paymentMode,
          receivedOn: payment.receivedOn,
          collectedBy: payment.collectedBy,
          remarks: payment.remarks,
          createdAt: payment.createdAt,
        },
        update: {
          // Fields are immutable per contract; upsert allows idempotent save
        },
      });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new ConflictError(`Payment with ID ${payment.id} already exists`);
      }
      if (error?.code === 'P2025') {
        throw new NotFoundError(`Payment with ID ${payment.id} not found`);
      }
      throw error;
    }
  }

  public async findById(id: string, instituteId: string, tx?: unknown): Promise<PaymentEntity | null> {
    const client = (tx as PrismaClient) || this.prisma;

    const record = await client.payment.findFirst({
      where: {
        id,
        invoice: {
          billingPlan: {
            enrollment: {
              instituteId,
            },
          },
        },
      },
    });

    if (!record) {
      return null;
    }

    return this.mapToDomain(record);
  }

  public async findByInvoiceId(
    invoiceId: string,
    instituteId: string,
    tx?: unknown
  ): Promise<PaymentEntity[]> {
    const client = (tx as PrismaClient) || this.prisma;

    const records = await client.payment.findMany({
      where: {
        invoiceId,
        invoice: {
          billingPlan: {
            enrollment: {
              instituteId,
            },
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return records.map((rec) => this.mapToDomain(rec));
  }

  public async findByIdempotencyTuple(
    invoiceId: string,
    amount: number,
    paymentMode: PaymentMode,
    receivedOn: Date,
    instituteId: string,
    tx?: unknown
  ): Promise<PaymentEntity | null> {
    const client = (tx as PrismaClient) || this.prisma;

    const receivedStart = new Date(receivedOn.getTime());
    receivedStart.setUTCHours(0, 0, 0, 0);
    const receivedEnd = new Date(receivedOn.getTime());
    receivedEnd.setUTCHours(23, 59, 59, 999);

    const record = await client.payment.findFirst({
      where: {
        invoiceId,
        amount,
        paymentMode,
        receivedOn: {
          gte: receivedStart,
          lte: receivedEnd,
        },
        invoice: {
          billingPlan: {
            enrollment: {
              instituteId,
            },
          },
        },
      },
    });

    if (!record) {
      return null;
    }

    return this.mapToDomain(record);
  }
}
