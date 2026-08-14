import type { PrismaClient } from '@coaching-os/database';
import { ConflictError, NotFoundError } from '@coaching-os/shared';
import { InvoiceEntity } from '../../domain/entities/invoice.entity';
import type { InvoiceStatus } from '../../domain/enums/invoice-status.enum';
import type { InvoiceRepository } from '../../domain/repositories/invoice.repository';

export class PrismaInvoiceRepository implements InvoiceRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private mapToDomain(record: {
    id: string;
    billingPlanId: string;
    amount: { toNumber(): number } | number;
    dueDate: Date;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }): InvoiceEntity {
    const amount = typeof record.amount === 'number' ? record.amount : record.amount.toNumber();

    return InvoiceEntity.reconstitute({
      id: record.id,
      billingPlanId: record.billingPlanId,
      amount,
      dueDate: record.dueDate,
      status: record.status as InvoiceStatus,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  public async save(invoice: InvoiceEntity, instituteId: string, tx?: unknown): Promise<void> {
    const client = (tx as PrismaClient) || this.prisma;

    // 1. Verify tenant ownership of target BillingPlan before save
    const billingPlan = await client.billingPlan.findFirst({
      where: {
        id: invoice.billingPlanId,
        enrollment: {
          instituteId,
        },
      },
    });

    if (!billingPlan) {
      throw new NotFoundError(
        `BillingPlan with ID ${invoice.billingPlanId} not found in this institute`
      );
    }

    try {
      await client.invoice.upsert({
        where: { id: invoice.id },
        create: {
          id: invoice.id,
          billingPlanId: invoice.billingPlanId,
          amount: invoice.amount,
          dueDate: invoice.dueDate,
          status: invoice.status,
          createdAt: invoice.createdAt,
          updatedAt: invoice.updatedAt,
        },
        update: {
          status: invoice.status,
          updatedAt: invoice.updatedAt,
        },
      });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new ConflictError(`Invoice with ID ${invoice.id} already exists`);
      }
      if (error?.code === 'P2025') {
        throw new NotFoundError(`Invoice with ID ${invoice.id} not found`);
      }
      throw error;
    }
  }

  public async findById(id: string, instituteId: string, tx?: unknown): Promise<InvoiceEntity | null> {
    const client = (tx as PrismaClient) || this.prisma;

    if (tx && typeof (tx as any).$executeRaw === 'function') {
      try {
        await (tx as any).$executeRaw`SELECT id FROM invoices WHERE id = ${id}::uuid FOR UPDATE`;
      } catch {
        // Ignore lock errors if raw query unsupported e.g. mock
      }
    }

    const record = await client.invoice.findFirst({
      where: {
        id,
        billingPlan: {
          enrollment: {
            instituteId,
          },
        },
      },
    });

    if (!record) {
      return null;
    }

    return this.mapToDomain(record);
  }

  public async findByBillingPlanId(
    billingPlanId: string,
    instituteId: string,
    tx?: unknown
  ): Promise<InvoiceEntity[]> {
    const client = (tx as PrismaClient) || this.prisma;

    const records = await client.invoice.findMany({
      where: {
        billingPlanId,
        billingPlan: {
          enrollment: {
            instituteId,
          },
        },
      },
      orderBy: {
        dueDate: 'asc',
      },
    });

    return records.map((rec) => this.mapToDomain(rec));
  }
}
