import { AuthorizationError, NotFoundError, ValidationError } from '@coaching-os/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BillingPlanEntity } from '../../domain/entities/billing-plan.entity';
import { InvoiceEntity } from '../../domain/entities/invoice.entity';
import { PaymentEntity } from '../../domain/entities/payment.entity';
import type { PaymentMode } from '../../domain/enums/payment-mode.enum';
import type { BillingPlanRepository } from '../../domain/repositories/billing-plan.repository';
import type { InvoiceRepository } from '../../domain/repositories/invoice.repository';
import type { PaymentRepository } from '../../domain/repositories/payment.repository';
import { GetPaymentUseCase, RecordPaymentUseCase } from './payment.use-cases';

class InMemoryBillingPlanRepository implements BillingPlanRepository {
  private plans = new Map<string, BillingPlanEntity>();

  public async create(plan: BillingPlanEntity): Promise<BillingPlanEntity> {
    this.plans.set(`${plan.instituteId}:${plan.id}`, plan);
    return plan;
  }

  public async findById(instituteId: string, id: string): Promise<BillingPlanEntity | null> {
    return this.plans.get(`${instituteId}:${id}`) || null;
  }

  public async findByEnrollmentId(enrollmentId: string, instituteId: string): Promise<BillingPlanEntity | null> {
    for (const plan of this.plans.values()) {
      if (plan.instituteId === instituteId && plan.enrollmentId === enrollmentId) {
        return plan;
      }
    }
    return null;
  }

  public async update(plan: BillingPlanEntity): Promise<BillingPlanEntity> {
    this.plans.set(`${plan.instituteId}:${plan.id}`, plan);
    return plan;
  }

  public async findMany(instituteId: string): Promise<BillingPlanEntity[]> {
    return Array.from(this.plans.values()).filter((p) => p.instituteId === instituteId);
  }
}

class InMemoryInvoiceRepository implements InvoiceRepository {
  private invoices = new Map<string, InvoiceEntity>();

  public async save(invoice: InvoiceEntity, instituteId: string): Promise<void> {
    this.invoices.set(`${instituteId}:${invoice.id}`, invoice);
  }

  public async findById(id: string, instituteId: string): Promise<InvoiceEntity | null> {
    return this.invoices.get(`${instituteId}:${id}`) || null;
  }

  public async findByBillingPlanId(billingPlanId: string, instituteId: string): Promise<InvoiceEntity[]> {
    const results: InvoiceEntity[] = [];
    for (const [key, inv] of this.invoices.entries()) {
      if (key.startsWith(`${instituteId}:`) && inv.billingPlanId === billingPlanId) {
        results.push(inv);
      }
    }
    return results;
  }

  public async findMany(instituteId: string): Promise<InvoiceEntity[]> {
    return Array.from(this.invoices.values()).filter((k) => k.billingPlanId);
  }
}

class InMemoryPaymentRepository implements PaymentRepository {
  private payments = new Map<string, PaymentEntity>();

  public async save(payment: PaymentEntity, instituteId: string): Promise<void> {
    this.payments.set(`${instituteId}:${payment.id}`, payment);
  }

  public async findById(id: string, instituteId: string): Promise<PaymentEntity | null> {
    return this.payments.get(`${instituteId}:${id}`) || null;
  }

  public async findByInvoiceId(invoiceId: string, instituteId: string): Promise<PaymentEntity[]> {
    const results: PaymentEntity[] = [];
    for (const [key, p] of this.payments.entries()) {
      if (key.startsWith(`${instituteId}:`) && p.invoiceId === invoiceId) {
        results.push(p);
      }
    }
    return results.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  public async findByIdempotencyTuple(
    invoiceId: string,
    amount: number,
    paymentMode: PaymentMode,
    receivedOn: Date,
    instituteId: string
  ): Promise<PaymentEntity | null> {
    for (const [key, p] of this.payments.entries()) {
      if (
        key.startsWith(`${instituteId}:`) &&
        p.invoiceId === invoiceId &&
        p.amount === amount &&
        p.paymentMode === paymentMode &&
        p.receivedOn.toISOString().split('T')[0] === receivedOn.toISOString().split('T')[0]
      ) {
        return p;
      }
    }
    return null;
  }

  public async findMany(instituteId: string): Promise<PaymentEntity[]> {
    return Array.from(this.payments.values());
  }
}

describe('Payment Use Cases', () => {
  let billingPlanRepo: InMemoryBillingPlanRepository;
  let invoiceRepo: InMemoryInvoiceRepository;
  let paymentRepo: InMemoryPaymentRepository;
  let eventBus: { publish: (eventName: string, payload: unknown) => void };
  let recordUseCase: RecordPaymentUseCase;
  let getUseCase: GetPaymentUseCase;

  const instituteId = 'inst-100';
  const enrollmentId = 'enr-200';
  const userId = 'user-staff-1';

  beforeEach(() => {
    billingPlanRepo = new InMemoryBillingPlanRepository();
    invoiceRepo = new InMemoryInvoiceRepository();
    paymentRepo = new InMemoryPaymentRepository();
    eventBus = { publish: vi.fn() };

    recordUseCase = new RecordPaymentUseCase(
      billingPlanRepo,
      invoiceRepo,
      paymentRepo,
      undefined,
      eventBus
    );
    getUseCase = new GetPaymentUseCase(paymentRepo);
  });

  describe('RecordPaymentUseCase', () => {
    it('records a valid Cash payment and transitions invoice status to partial', async () => {
      const plan = BillingPlanEntity.create({
        instituteId,
        enrollmentId,
        type: 'one_time',
        amount: 10000,
        billingStartDate: '2026-08-01',
      });
      await billingPlanRepo.create(plan);

      const invoice = InvoiceEntity.create({
        billingPlanId: plan.id,
        amount: 10000,
        dueDate: '2026-08-15',
        status: 'pending',
      });
      await invoiceRepo.save(invoice, instituteId);

      const dto = await recordUseCase.execute(
        instituteId,
        {
          invoiceId: invoice.id,
          amount: 3000,
          paymentMode: 'cash',
          receivedOn: '2026-08-14',
          remarks: 'Initial cash deposit',
        },
        { userId, capabilities: ['payment:record'] }
      );

      expect(dto.id).toBeDefined();
      expect(dto.invoiceId).toBe(invoice.id);
      expect(dto.amount).toBe(3000);
      expect(dto.paymentMode).toBe('cash');
      expect(dto.collectedBy).toBe(userId);

      // Verify invoice status recalculated to partial
      const updatedInvoice = await invoiceRepo.findById(invoice.id, instituteId);
      expect(updatedInvoice?.status).toBe('partial');

      // Verify PaymentRecorded event emitted
      expect(eventBus.publish).toHaveBeenCalledWith(
        'billing.payment.recorded',
        expect.objectContaining({
          paymentId: dto.id,
          invoiceId: invoice.id,
          amount: 3000,
          paymentMode: 'cash',
          newInvoiceStatus: 'partial',
          outstandingBalance: 7000,
        })
      );
    });

    it('records multiple partial payments ending in full payment (pending -> partial -> paid)', async () => {
      const plan = BillingPlanEntity.create({
        instituteId,
        enrollmentId,
        type: 'one_time',
        amount: 10000,
        billingStartDate: '2026-08-01',
      });
      await billingPlanRepo.create(plan);

      const invoice = InvoiceEntity.create({
        billingPlanId: plan.id,
        amount: 10000,
        dueDate: '2026-08-15',
        status: 'pending',
      });
      await invoiceRepo.save(invoice, instituteId);

      // Payment 1: 3000 UPI
      await recordUseCase.execute(
        instituteId,
        { invoiceId: invoice.id, amount: 3000, paymentMode: 'upi' },
        { userId, capabilities: ['payment:record'] }
      );
      let inv = await invoiceRepo.findById(invoice.id, instituteId);
      expect(inv?.status).toBe('partial');

      // Payment 2: 2000 Bank Transfer
      await recordUseCase.execute(
        instituteId,
        { invoiceId: invoice.id, amount: 2000, paymentMode: 'bank_transfer' },
        { userId, capabilities: ['payment:record'] }
      );
      inv = await invoiceRepo.findById(invoice.id, instituteId);
      expect(inv?.status).toBe('partial');

      // Payment 3: 5000 Cash (Remaining balance)
      await recordUseCase.execute(
        instituteId,
        { invoiceId: invoice.id, amount: 5000, paymentMode: 'cash' },
        { userId, capabilities: ['payment:record'] }
      );
      inv = await invoiceRepo.findById(invoice.id, instituteId);
      expect(inv?.status).toBe('paid');
      expect(inv?.calculateOutstanding(10000)).toBe(0);
    });

    it('R-010: rejects overpayment attempt when payment exceeds remaining outstanding balance', async () => {
      const plan = BillingPlanEntity.create({
        instituteId,
        enrollmentId,
        type: 'one_time',
        amount: 10000,
        billingStartDate: '2026-08-01',
      });
      await billingPlanRepo.create(plan);

      const invoice = InvoiceEntity.create({
        billingPlanId: plan.id,
        amount: 10000,
        dueDate: '2026-08-15',
        status: 'pending',
      });
      await invoiceRepo.save(invoice, instituteId);

      // Payment 1: 9000 (Outstanding remaining = 1000)
      await recordUseCase.execute(
        instituteId,
        { invoiceId: invoice.id, amount: 9000, paymentMode: 'cash' },
        { userId, capabilities: ['payment:record'] }
      );

      // Payment 2: 2000 (Exceeds remaining 1000 balance -> MUST throw ValidationError)
      await expect(
        recordUseCase.execute(
          instituteId,
          { invoiceId: invoice.id, amount: 2000, paymentMode: 'cash' },
          { userId, capabilities: ['payment:record'] }
        )
      ).rejects.toThrow(ValidationError);
    });

    it('rejects recording payments against an already paid invoice', async () => {
      const plan = BillingPlanEntity.create({
        instituteId,
        enrollmentId,
        type: 'one_time',
        amount: 5000,
        billingStartDate: '2026-08-01',
      });
      await billingPlanRepo.create(plan);

      const invoice = InvoiceEntity.create({
        billingPlanId: plan.id,
        amount: 5000,
        dueDate: '2026-08-15',
        status: 'pending',
      });
      await invoiceRepo.save(invoice, instituteId);

      // Full payment
      await recordUseCase.execute(
        instituteId,
        { invoiceId: invoice.id, amount: 5000, paymentMode: 'upi' },
        { userId, capabilities: ['payment:record'] }
      );

      // Attempt additional payment on paid invoice
      await expect(
        recordUseCase.execute(
          instituteId,
          { invoiceId: invoice.id, amount: 100, paymentMode: 'cash' },
          { userId, capabilities: ['payment:record'] }
        )
      ).rejects.toThrow(ValidationError);
    });

    it('R-009: returns existing PaymentDTO on idempotent repeat request', async () => {
      const plan = BillingPlanEntity.create({
        instituteId,
        enrollmentId,
        type: 'one_time',
        amount: 10000,
        billingStartDate: '2026-08-01',
      });
      await billingPlanRepo.create(plan);

      const invoice = InvoiceEntity.create({
        billingPlanId: plan.id,
        amount: 10000,
        dueDate: '2026-08-15',
        status: 'pending',
      });
      await invoiceRepo.save(invoice, instituteId);

      const paymentInput = {
        invoiceId: invoice.id,
        amount: 3000,
        paymentMode: 'upi' as const,
        receivedOn: '2026-08-14',
      };

      const p1 = await recordUseCase.execute(instituteId, paymentInput, {
        userId,
        capabilities: ['payment:record'],
      });

      const p2 = await recordUseCase.execute(instituteId, paymentInput, {
        userId,
        capabilities: ['payment:record'],
      });

      expect(p2.id).toBe(p1.id);
      const payments = await paymentRepo.findByInvoiceId(invoice.id, instituteId);
      expect(payments).toHaveLength(1);
    });

    it('rejects zero or negative payment amounts', async () => {
      await expect(
        recordUseCase.execute(
          instituteId,
          { invoiceId: 'inv-1', amount: 0, paymentMode: 'cash' },
          { userId, capabilities: ['payment:record'] }
        )
      ).rejects.toThrow(ValidationError);

      await expect(
        recordUseCase.execute(
          instituteId,
          { invoiceId: 'inv-1', amount: -100, paymentMode: 'cash' },
          { userId, capabilities: ['payment:record'] }
        )
      ).rejects.toThrow(ValidationError);
    });

    it('rejects invalid payment modes', async () => {
      await expect(
        recordUseCase.execute(
          instituteId,
          { invoiceId: 'inv-1', amount: 500, paymentMode: 'credit_card' as any },
          { userId, capabilities: ['payment:record'] }
        )
      ).rejects.toThrow(ValidationError);
    });

    it('rejects future receivedOn dates', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 5);

      await expect(
        recordUseCase.execute(
          instituteId,
          {
            invoiceId: 'inv-1',
            amount: 500,
            paymentMode: 'cash',
            receivedOn: tomorrow.toISOString(),
          },
          { userId, capabilities: ['payment:record'] }
        )
      ).rejects.toThrow(ValidationError);
    });

    it('rejects missing payment:record capability when capabilities provided', async () => {
      await expect(
        recordUseCase.execute(
          instituteId,
          { invoiceId: 'inv-1', amount: 500, paymentMode: 'cash' },
          { userId, capabilities: ['billing:read'] }
        )
      ).rejects.toThrow(AuthorizationError);
    });

    it('throws NotFoundError for non-existent or foreign tenant invoice', async () => {
      await expect(
        recordUseCase.execute(
          instituteId,
          { invoiceId: 'non-existent-inv', amount: 500, paymentMode: 'cash' },
          { userId, capabilities: ['payment:record'] }
        )
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('GetPaymentUseCase', () => {
    it('retrieves payment for owner tenant and throws NotFoundError for foreign tenant', async () => {
      const payment = PaymentEntity.create({
        invoiceId: 'inv-100',
        amount: 4000,
        paymentMode: 'upi',
        receivedOn: '2026-08-14',
      });
      await paymentRepo.save(payment, 'inst-A');

      // Tenant A retrieves
      const dto = await getUseCase.execute('inst-A', payment.id, { capabilities: ['billing:read'] });
      expect(dto.id).toBe(payment.id);
      expect(dto.amount).toBe(4000);

      // Tenant B attempt MUST throw NotFoundError
      await expect(
        getUseCase.execute('inst-B', payment.id, { capabilities: ['billing:read'] })
      ).rejects.toThrow(NotFoundError);
    });

    it('rejects retrieval when billing:read capability is missing', async () => {
      await expect(
        getUseCase.execute('inst-A', 'pay-1', { capabilities: ['other:capability'] })
      ).rejects.toThrow(AuthorizationError);
    });
  });
});
