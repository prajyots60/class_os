import { NotFoundError, ValidationError } from '@coaching-os/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BillingPlanEntity } from '../../domain/entities/billing-plan.entity';
import { InvoiceEntity } from '../../domain/entities/invoice.entity';
import type { BillingPlanRepository } from '../../domain/repositories/billing-plan.repository';
import type { InvoiceRepository } from '../../domain/repositories/invoice.repository';
import {
  GenerateInvoiceUseCase,
  GetInvoiceUseCase,
} from './invoice.use-cases';

class InMemoryBillingPlanRepository implements BillingPlanRepository {
  private plans = new Map<string, BillingPlanEntity>();

  public async create(plan: BillingPlanEntity): Promise<BillingPlanEntity> {
    this.plans.set(`${plan.instituteId}:${plan.id}`, plan);
    return plan;
  }

  public async findById(instituteId: string, id: string): Promise<BillingPlanEntity | null> {
    return this.plans.get(`${instituteId}:${id}`) || null;
  }

  public async findByEnrollmentId(
    instituteId: string,
    enrollmentId: string
  ): Promise<BillingPlanEntity | null> {
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
}

class InMemoryInvoiceRepository implements InvoiceRepository {
  private invoices = new Map<string, InvoiceEntity>();
  private planToInstitute = new Map<string, string>();

  public registerPlanInstitute(billingPlanId: string, instituteId: string): void {
    this.planToInstitute.set(billingPlanId, instituteId);
  }

  public async save(invoice: InvoiceEntity, instituteId: string): Promise<void> {
    this.invoices.set(`${instituteId}:${invoice.id}`, invoice);
    this.planToInstitute.set(invoice.billingPlanId, instituteId);
  }

  public async findById(id: string, instituteId: string): Promise<InvoiceEntity | null> {
    return this.invoices.get(`${instituteId}:${id}`) || null;
  }

  public async findByBillingPlanId(
    billingPlanId: string,
    instituteId: string
  ): Promise<InvoiceEntity[]> {
    const results: InvoiceEntity[] = [];
    for (const [key, inv] of this.invoices.entries()) {
      if (key.startsWith(`${instituteId}:`) && inv.billingPlanId === billingPlanId) {
        results.push(inv);
      }
    }
    return results.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  }
}

describe('Invoice Use Cases', () => {
  let billingPlanRepo: InMemoryBillingPlanRepository;
  let invoiceRepo: InMemoryInvoiceRepository;
  let eventBus: { publish: (eventName: string, payload: unknown) => void };
  let generateUseCase: GenerateInvoiceUseCase;
  let getUseCase: GetInvoiceUseCase;

  const instituteId = 'inst-100';
  const enrollmentId = 'enr-200';

  beforeEach(() => {
    billingPlanRepo = new InMemoryBillingPlanRepository();
    invoiceRepo = new InMemoryInvoiceRepository();
    eventBus = { publish: vi.fn() };
    generateUseCase = new GenerateInvoiceUseCase(billingPlanRepo, invoiceRepo, eventBus);
    getUseCase = new GetInvoiceUseCase(invoiceRepo);
  });

  describe('GenerateInvoiceUseCase — one_time', () => {
    it('generates a one-time invoice and returns it idempotently on repeat calls', async () => {
      const plan = BillingPlanEntity.create({
        instituteId,
        enrollmentId,
        type: 'one_time',
        amount: 15000,
        billingStartDate: '2026-08-17',
      });
      await billingPlanRepo.create(plan);
      invoiceRepo.registerPlanInstitute(plan.id, instituteId);

      // Call #1: Generates invoice
      const dto1 = await generateUseCase.execute(instituteId, {
        billingPlanId: plan.id,
      });

      expect(dto1.billingPlanId).toBe(plan.id);
      expect(dto1.amount).toBe(15000);
      expect(dto1.dueDate).toBe('2026-08-17');
      expect(dto1.status).toBe('pending');
      expect(eventBus.publish).toHaveBeenCalledWith(
        'billing.invoice.generated',
        expect.objectContaining({
          invoiceId: dto1.id,
          amount: 15000,
        })
      );

      // Call #2: Repeat call returns exact same invoice (idempotent)
      const dto2 = await generateUseCase.execute(instituteId, {
        billingPlanId: plan.id,
      });

      expect(dto2.id).toBe(dto1.id);
      expect(dto2.amount).toBe(15000);
    });
  });

  describe('GenerateInvoiceUseCase — monthly', () => {
    it('generates monthly invoices per period and prevents period duplicates', async () => {
      const plan = BillingPlanEntity.create({
        instituteId,
        enrollmentId,
        type: 'monthly',
        amount: 5000,
        billingStartDate: '2026-08-17',
        firstInvoiceAmountOverride: 3000, // Override for first month
      });
      await billingPlanRepo.create(plan);
      invoiceRepo.registerPlanInstitute(plan.id, instituteId);

      // Month 1: 2026-08 (Uses override 3000 and start date 2026-08-17)
      const dtoMonth1 = await generateUseCase.execute(instituteId, {
        billingPlanId: plan.id,
        periodYearMonth: '2026-08',
      });

      expect(dtoMonth1.amount).toBe(3000);
      expect(dtoMonth1.dueDate).toBe('2026-08-17');

      // Month 1 repeat: Returns exact same invoice
      const dtoMonth1Repeat = await generateUseCase.execute(instituteId, {
        billingPlanId: plan.id,
        periodYearMonth: '2026-08',
      });
      expect(dtoMonth1Repeat.id).toBe(dtoMonth1.id);

      // Month 2: 2026-09 (Uses standard amount 5000)
      const dtoMonth2 = await generateUseCase.execute(instituteId, {
        billingPlanId: plan.id,
        periodYearMonth: '2026-09',
      });

      expect(dtoMonth2.id).not.toBe(dtoMonth1.id);
      expect(dtoMonth2.amount).toBe(5000);
      expect(dtoMonth2.dueDate).toBe('2026-09-17');
    });
  });

  describe('GenerateInvoiceUseCase — installment (R-006, R-007, R-008)', () => {
    it('generates scheduled installment invoices with exact integer cent math (R-007)', async () => {
      const plan = BillingPlanEntity.create({
        instituteId,
        enrollmentId,
        type: 'installment',
        amount: 10000,
        billingStartDate: '2026-08-31',
      });
      await billingPlanRepo.create(plan);
      invoiceRepo.registerPlanInstitute(plan.id, instituteId);

      // Installment #1 / 3 -> 3333.34
      const inst1 = await generateUseCase.execute(instituteId, {
        billingPlanId: plan.id,
        installmentNumber: 1,
        totalInstallments: 3,
      });
      expect(inst1.amount).toBe(3333.34);

      // Installment #2 / 3 -> 3333.33
      const inst2 = await generateUseCase.execute(instituteId, {
        billingPlanId: plan.id,
        installmentNumber: 2,
        totalInstallments: 3,
      });
      expect(inst2.amount).toBe(3333.33);

      // Installment #3 / 3 -> 3333.33
      const inst3 = await generateUseCase.execute(instituteId, {
        billingPlanId: plan.id,
        installmentNumber: 3,
        totalInstallments: 3,
      });
      expect(inst3.amount).toBe(3333.33);

      // Repeat Installment #2 -> Returns exact same invoice (idempotent)
      const inst2Repeat = await generateUseCase.execute(instituteId, {
        billingPlanId: plan.id,
        installmentNumber: 2,
        totalInstallments: 3,
      });
      expect(inst2Repeat.id).toBe(inst2.id);
    });

    it('R-006: throws ValidationError if totalInstallments N is changed after installment generation starts', async () => {
      const plan = BillingPlanEntity.create({
        instituteId,
        enrollmentId,
        type: 'installment',
        amount: 10000,
        billingStartDate: '2026-08-31',
      });
      await billingPlanRepo.create(plan);
      invoiceRepo.registerPlanInstitute(plan.id, instituteId);

      // Generate Installment #1 with N = 3
      await generateUseCase.execute(instituteId, {
        billingPlanId: plan.id,
        installmentNumber: 1,
        totalInstallments: 3,
      });

      // Attempt to generate Installment #2 with N = 4 MUST throw ValidationError
      await expect(
        generateUseCase.execute(instituteId, {
          billingPlanId: plan.id,
          installmentNumber: 2,
          totalInstallments: 4,
        })
      ).rejects.toThrow(ValidationError);
    });

    it('R-008: preserves total plan obligation with first invoice override', async () => {
      const plan = BillingPlanEntity.create({
        instituteId,
        enrollmentId,
        type: 'installment',
        amount: 30000,
        billingStartDate: '2026-08-01',
        firstInvoiceAmountOverride: 5000,
      });
      await billingPlanRepo.create(plan);
      invoiceRepo.registerPlanInstitute(plan.id, instituteId);

      const inst1 = await generateUseCase.execute(instituteId, {
        billingPlanId: plan.id,
        installmentNumber: 1,
        totalInstallments: 3,
      });
      expect(inst1.amount).toBe(5000);

      const inst2 = await generateUseCase.execute(instituteId, {
        billingPlanId: plan.id,
        installmentNumber: 2,
        totalInstallments: 3,
      });
      expect(inst2.amount).toBe(12500);

      const inst3 = await generateUseCase.execute(instituteId, {
        billingPlanId: plan.id,
        installmentNumber: 3,
        totalInstallments: 3,
      });
      expect(inst3.amount).toBe(12500);

      expect(inst1.amount + inst2.amount + inst3.amount).toBe(30000);
    });
  });

  describe('GetInvoiceUseCase & Multi-Tenant Isolation', () => {
    it('retrieves invoice for owner tenant and throws NotFoundError for foreign tenant', async () => {
      const plan = BillingPlanEntity.create({
        instituteId: 'inst-A',
        enrollmentId: 'enr-A',
        type: 'one_time',
        amount: 8000,
        billingStartDate: '2026-08-01',
      });
      await billingPlanRepo.create(plan);
      invoiceRepo.registerPlanInstitute(plan.id, 'inst-A');

      const invoiceDto = await generateUseCase.execute('inst-A', {
        billingPlanId: plan.id,
      });

      // Tenant A can retrieve
      const fetched = await getUseCase.execute('inst-A', invoiceDto.id);
      expect(fetched.id).toBe(invoiceDto.id);

      // Tenant B attempt to retrieve Tenant A invoice MUST throw NotFoundError
      await expect(getUseCase.execute('inst-B', invoiceDto.id)).rejects.toThrow(NotFoundError);
    });
  });
});
