import type { PrismaClient } from '@coaching-os/database';
import { ConflictError, NotFoundError } from '@coaching-os/shared';
import { ReceiptEntity } from '../../domain/entities/receipt.entity';
import type { ReceiptRepository } from '../../domain/repositories/receipt.repository';

export class PrismaReceiptRepository implements ReceiptRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private mapToDomain(record: {
    id: string;
    instituteId: string;
    paymentId: string;
    receiptNumber: string;
    generatedAt: Date;
  }): ReceiptEntity {
    return ReceiptEntity.reconstitute({
      id: record.id,
      instituteId: record.instituteId,
      paymentId: record.paymentId,
      receiptNumber: record.receiptNumber,
      generatedAt: record.generatedAt,
    });
  }

  public async save(receipt: ReceiptEntity, instituteId: string, tx?: unknown): Promise<void> {
    const client = (tx as PrismaClient) || this.prisma;

    // 1. Verify tenant ownership chain: Receipt -> Payment -> Invoice -> BillingPlan -> Enrollment -> Institute
    const payment = await client.payment.findFirst({
      where: {
        id: receipt.paymentId,
        invoice: {
          billingPlan: {
            enrollment: {
              instituteId,
            },
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundError(
        `Payment with ID ${receipt.paymentId} not found in this institute`
      );
    }

    try {
      await client.receipt.upsert({
        where: { id: receipt.id },
        create: {
          id: receipt.id,
          instituteId: receipt.instituteId,
          paymentId: receipt.paymentId,
          receiptNumber: receipt.receiptNumber,
          generatedAt: receipt.generatedAt,
        },
        update: {
          // Receipts are immutable per contract
        },
      });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new ConflictError(
          `Receipt with ID ${receipt.id} or paymentId ${receipt.paymentId} already exists`
        );
      }
      if (error?.code === 'P2025') {
        throw new NotFoundError(`Receipt with ID ${receipt.id} not found`);
      }
      throw error;
    }
  }

  public async findById(id: string, instituteId: string, tx?: unknown): Promise<ReceiptEntity | null> {
    const client = (tx as PrismaClient) || this.prisma;

    const record = await client.receipt.findFirst({
      where: {
        id,
        instituteId,
      },
    });

    if (!record) {
      return null;
    }

    return this.mapToDomain(record);
  }

  public async findByPaymentId(
    paymentId: string,
    instituteId: string,
    tx?: unknown
  ): Promise<ReceiptEntity | null> {
    const client = (tx as PrismaClient) || this.prisma;

    const record = await client.receipt.findFirst({
      where: {
        paymentId,
        instituteId,
      },
    });

    if (!record) {
      return null;
    }

    return this.mapToDomain(record);
  }

  public async allocateNextReceiptNumber(
    instituteId: string,
    year: number,
    tx?: unknown
  ): Promise<string> {
    const client = (tx as PrismaClient) || this.prisma;

    if (tx && typeof (tx as any).$executeRaw === 'function') {
      try {
        await (tx as any).$executeRaw`SELECT id FROM institutes WHERE id = ${instituteId}::uuid FOR UPDATE`;
      } catch {
        // Ignore lock errors if raw query unsupported e.g. mock
      }
    }

    const count = await client.receipt.count({
      where: {
        instituteId,
        receiptNumber: {
          startsWith: `REC-${year}-`,
        },
      },
    });

    const nextSeq = count + 1;
    const seqPadded = String(nextSeq).padStart(5, '0');
    return `REC-${year}-${seqPadded}`;
  }
}
