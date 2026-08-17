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

  public async findMany(
    instituteId: string,
    filter?: {
      billingPlanId?: string;
      enrollmentId?: string;
      studentId?: string;
      status?: string;
      overdue?: boolean;
      cursor?: string;
      limit?: number;
    }
  ): Promise<InvoiceEntity[]> {
    const where: any = {
      billingPlan: {
        enrollment: {
          instituteId,
        },
      },
    };

    if (filter?.billingPlanId) {
      where.billingPlanId = filter.billingPlanId;
    }
    if (filter?.enrollmentId) {
      where.billingPlan.enrollmentId = filter.enrollmentId;
    }
    if (filter?.studentId) {
      where.billingPlan.enrollment = {
        ...where.billingPlan.enrollment,
        studentId: filter.studentId,
      };
    }
    if (filter?.status) {
      where.status = filter.status;
    }
    if (filter?.overdue !== undefined) {
      const now = new Date();
      if (filter.overdue) {
        where.dueDate = { lt: now };
        where.status = { not: 'paid' };
      } else {
        where.OR = [
          { dueDate: { gte: now } },
          { status: 'paid' },
        ];
      }
    }

    const records = await this.prisma.invoice.findMany({
      where,
      take: filter?.limit ?? 20,
      ...(filter?.cursor
        ? {
            skip: 1,
            cursor: { id: filter.cursor },
          }
        : {}),
      orderBy: { dueDate: 'asc' },
    });

    return records.map((rec) => this.mapToDomain(rec));
  }

  public async listOperationalInvoices(
    instituteId: string,
    options?: {
      billingPlanId?: string;
      enrollmentId?: string;
      studentId?: string;
      status?: string;
      overdue?: boolean;
      search?: string;
      page?: number;
      pageSize?: number;
      sortBy?: 'dueDate' | 'amount' | 'createdAt' | 'status';
      sortOrder?: 'asc' | 'desc';
    },
  ) {
    if (!instituteId) {
      return { items: [], total: 0, page: 1, pageSize: 25, totalPages: 0 };
    }

    const page = Math.max(1, options?.page ?? 1);
    const pageSize = Math.max(1, Math.min(100, options?.pageSize ?? 25));
    const skip = (page - 1) * pageSize;

    const where: any = {
      billingPlan: {
        enrollment: {
          instituteId,
        },
      },
      ...(options?.billingPlanId ? { billingPlanId: options.billingPlanId } : {}),
      ...(options?.status ? { status: options.status } : {}),
    };

    if (options?.enrollmentId) {
      where.billingPlan.enrollmentId = options.enrollmentId;
    }

    if (options?.studentId) {
      where.billingPlan.enrollment = {
        ...where.billingPlan.enrollment,
        studentId: options.studentId,
      };
    }

    if (options?.overdue !== undefined) {
      const now = new Date();
      if (options.overdue) {
        where.dueDate = { lt: now };
        where.status = { not: 'paid' };
      } else {
        where.OR = [{ dueDate: { gte: now } }, { status: 'paid' }];
      }
    }

    if (options?.search && options.search.trim() !== '') {
      const s = options.search.trim();
      const isUuid = s.length === 36 && /^[0-9a-fA-F-]{36}$/.test(s);
      where.AND = [
        {
          OR: [
            ...(isUuid ? [{ id: s }] : []),
            {
              billingPlan: {
                enrollment: {
                  student: {
                    OR: [
                      { firstName: { contains: s, mode: 'insensitive' } },
                      { lastName: { contains: s, mode: 'insensitive' } },
                      { admissionNumber: { contains: s, mode: 'insensitive' } },
                    ],
                  },
                },
              },
            },
          ],
        },
      ];
    }

    const sortField = options?.sortBy || 'dueDate';
    const sortDir = options?.sortOrder || 'desc';
    const orderBy: any = {};
    orderBy[sortField] = sortDir;

    const [records, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        include: {
          billingPlan: {
            include: {
              enrollment: {
                include: {
                  student: true,
                },
              },
            },
          },
          payments: true,
        },
        orderBy: [orderBy, { id: 'asc' }],
        skip,
        take: pageSize,
      }),
      this.prisma.invoice.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    const items = records.map((inv: any) => {
      const student = inv.billingPlan?.enrollment?.student;
      const studentName = student ? `${student.firstName} ${student.lastName}`.trim() : undefined;
      const shortId = inv.id.slice(0, 8).toUpperCase();
      const amountVal = typeof inv.amount === 'number' ? inv.amount : inv.amount?.toNumber?.() ?? Number(inv.amount);
      const paidVal = (inv.payments || []).reduce((acc: number, p: any) => {
        const pAmt = typeof p.amount === 'number' ? p.amount : p.amount?.toNumber?.() ?? Number(p.amount);
        return acc + pAmt;
      }, 0);

      return {
        id: inv.id,
        invoiceNumber: `INV-${shortId}`,
        studentId: student?.id,
        studentName: studentName || 'Student',
        admissionNumber: student?.admissionNumber || '',
        amount: amountVal,
        paidAmount: paidVal,
        outstandingAmount: Math.max(0, amountVal - paidVal),
        dueDateIso: inv.dueDate.toISOString().split('T')[0] || '',
        status: inv.status,
        createdAtIso: inv.createdAt.toISOString().split('T')[0] || '',
      };
    });

    return {
      items,
      total,
      page,
      pageSize,
      totalPages,
    };
  }
}

