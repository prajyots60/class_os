import { logger } from '@coaching-os/observability';
import { NotFoundError, ValidationError } from '@coaching-os/shared';
import { InvoiceEntity } from '../../domain/entities/invoice.entity';
import type { BillingPlanRepository } from '../../domain/repositories/billing-plan.repository';
import type { InvoiceRepository } from '../../domain/repositories/invoice.repository';
import {
  addMonthsWithMonthEndCap,
  calculateInstallmentSchedule,
} from '../../domain/services/installment-calculator';
import type { GenerateInvoiceInput, InvoiceDTO } from '../dto/invoice.dto';
import { toInvoiceDTO } from '../dto/invoice.dto';

const moduleLogger = logger.child({ module: 'billing' });

export interface InvoiceGeneratedEventPayload {
  invoiceId: string;
  billingPlanId: string;
  instituteId: string;
  enrollmentId: string;
  amount: number;
  dueDate: string;
  status: 'pending';
  generatedAt: string;
}

export interface EventBus {
  publish(eventName: string, payload: unknown): Promise<void> | void;
}

export class GenerateInvoiceUseCase {
  constructor(
    private readonly billingPlanRepository: BillingPlanRepository,
    private readonly invoiceRepository: InvoiceRepository,
    private readonly eventBus?: EventBus
  ) {}

  public async execute(
    instituteId: string,
    input: GenerateInvoiceInput
  ): Promise<InvoiceDTO> {
    if (!instituteId?.trim()) {
      throw new ValidationError('Institute ID is required');
    }
    if (!input.billingPlanId?.trim()) {
      throw new ValidationError('BillingPlan ID is required');
    }

    const cleanInstituteId = instituteId.trim();
    const cleanPlanId = input.billingPlanId.trim();

    // 1. Load BillingPlan within tenant context
    const plan = await this.billingPlanRepository.findById(cleanInstituteId, cleanPlanId);
    if (!plan) {
      throw new NotFoundError(`BillingPlan with ID ${cleanPlanId} not found in this institute`);
    }

    // 2. Fetch existing invoices for idempotency & consistency validation
    const existingInvoices = await this.invoiceRepository.findByBillingPlanId(
      cleanPlanId,
      cleanInstituteId
    );

    let targetAmount: number;
    let targetDueDate: Date;
    let existingMatch: InvoiceEntity | undefined;

    // 3. Process by BillingType
    if (plan.type === 'one_time') {
      if (existingInvoices.length > 0) {
        // Idempotency: Return existing one-time invoice
        existingMatch = existingInvoices[0];
      } else {
        targetAmount = plan.calculateEffectiveFirstInvoiceAmount();
        targetDueDate = plan.billingStartDate;
      }
    } else if (plan.type === 'monthly') {
      // Determine target period YYYY-MM
      let periodStr = input.periodYearMonth?.trim();
      if (!periodStr) {
        const now = new Date();
        periodStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      }

      const matchYearMonth = (date: Date): string => {
        return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
      };

      // Check idempotency for period
      existingMatch = existingInvoices.find(
        (inv) => matchYearMonth(inv.dueDate) === periodStr
      );

      if (!existingMatch) {
        const startYearMonth = matchYearMonth(plan.billingStartDate);
        const isFirstPeriod = periodStr === startYearMonth;

        if (isFirstPeriod) {
          targetAmount = plan.calculateEffectiveFirstInvoiceAmount();
          targetDueDate = plan.billingStartDate;
        } else {
          targetAmount = plan.calculateStandardInvoiceAmount();
          // Parse target year and month
          const parts = periodStr.split('-');
          const targetYear = parseInt(parts[0] || '', 10);
          const targetMonth = parseInt(parts[1] || '', 10) - 1;

          if (isNaN(targetYear) || isNaN(targetMonth) || targetMonth < 0 || targetMonth > 11) {
            throw new ValidationError(`Invalid periodYearMonth format: ${periodStr}. Expected YYYY-MM`);
          }

          // Preserve start day where possible in UTC, capped by month-end length
          const startDay = plan.billingStartDate.getUTCDate();
          const candidateDate = new Date(Date.UTC(targetYear, targetMonth, startDay));
          if (candidateDate.getUTCMonth() !== targetMonth) {
            candidateDate.setUTCDate(0); // Cap to last day of month in UTC
          }
          targetDueDate = candidateDate;
        }
      }
    } else if (plan.type === 'installment') {
      const k = input.installmentNumber;
      const N = input.totalInstallments;

      if (N === undefined || N === null || !Number.isInteger(N) || N < 2) {
        throw new ValidationError('totalInstallments must be an integer >= 2 for installment billing');
      }

      if (k === undefined || k === null || !Number.isInteger(k) || k < 1 || k > N) {
        throw new ValidationError(`installmentNumber must be between 1 and totalInstallments (${N})`);
      }

      // Calculate schedule for candidate N
      const schedule = calculateInstallmentSchedule({
        baseAmount: plan.amount,
        discount: plan.discount,
        billingStartDate: plan.billingStartDate,
        firstInvoiceAmountOverride: plan.firstInvoiceAmountOverride,
        totalInstallments: N,
      });

      // R-006 Verification: Match existing invoices by dueDate to candidate schedule items
      if (existingInvoices.length > 0) {
        for (const inv of existingInvoices) {
          const expectedItem = schedule.find(
            (item) => item.dueDate.getTime() === inv.dueDate.getTime()
          );
          if (!expectedItem || inv.amount !== expectedItem.amount) {
            throw new ValidationError(
              'Installment count N cannot be changed once installment generation has started.'
            );
          }
        }
      }

      // Idempotency: Check if installment k already exists by target dueDate
      const targetItem = schedule[k - 1];
      if (!targetItem) {
        throw new ValidationError(`Invalid installment index ${k}`);
      }

      existingMatch = existingInvoices.find(
        (inv) => inv.dueDate.getTime() === targetItem.dueDate.getTime()
      );

      if (!existingMatch) {
        targetAmount = targetItem.amount;
        targetDueDate = targetItem.dueDate;
      }
    } else {
      throw new ValidationError(`Unsupported billing type: ${plan.type}`);
    }

    // 4. Return existing invoice if idempotent match found
    if (existingMatch) {
      moduleLogger.info('billing.invoice.idempotent_return', {
        invoiceId: existingMatch.id,
        billingPlanId: plan.id,
        instituteId: cleanInstituteId,
      });
      return toInvoiceDTO(existingMatch);
    }

    // 5. Create new Invoice entity
    const invoice = InvoiceEntity.create({
      billingPlanId: plan.id,
      amount: targetAmount!,
      dueDate: targetDueDate!,
      status: 'pending',
    });

    // 6. Persist to database
    await this.invoiceRepository.save(invoice, cleanInstituteId);

    // 7. Audit log & Domain event emission
    moduleLogger.info('billing.invoice.generate.success', {
      invoiceId: invoice.id,
      billingPlanId: plan.id,
      instituteId: cleanInstituteId,
      amount: invoice.amount,
      dueDate: invoice.dueDate,
    });

    if (this.eventBus) {
      const eventPayload: InvoiceGeneratedEventPayload = {
        invoiceId: invoice.id,
        billingPlanId: plan.id,
        instituteId: cleanInstituteId,
        enrollmentId: plan.enrollmentId,
        amount: invoice.amount,
        dueDate: invoice.dueDate.toISOString().split('T')[0] || invoice.dueDate.toISOString(),
        status: 'pending',
        generatedAt: invoice.createdAt.toISOString(),
      };
      await this.eventBus.publish('billing.invoice.generated', eventPayload);
    }

    return toInvoiceDTO(invoice);
  }
}

export class GetInvoiceUseCase {
  constructor(private readonly invoiceRepository: InvoiceRepository) {}

  public async execute(instituteId: string, invoiceId: string): Promise<InvoiceDTO> {
    if (!instituteId?.trim()) {
      throw new ValidationError('Institute ID is required');
    }
    if (!invoiceId?.trim()) {
      throw new ValidationError('Invoice ID is required');
    }

    const cleanInstituteId = instituteId.trim();
    const cleanInvoiceId = invoiceId.trim();

    const invoice = await this.invoiceRepository.findById(cleanInvoiceId, cleanInstituteId);
    if (!invoice) {
      throw new NotFoundError(`Invoice with ID ${cleanInvoiceId} not found in this institute`);
    }

    return toInvoiceDTO(invoice);
  }
}

export interface ListInvoicesInput {
  billingPlanId?: string;
  enrollmentId?: string;
  studentId?: string;
  status?: string;
  overdue?: boolean;
  cursor?: string;
  limit?: number;
}

export class ListInvoicesUseCase {
  constructor(private readonly invoiceRepository: InvoiceRepository) {}

  public async execute(instituteId: string, filter?: ListInvoicesInput): Promise<InvoiceDTO[]> {
    if (!instituteId?.trim()) {
      throw new ValidationError('Institute ID is required');
    }

    const invoices = await this.invoiceRepository.findMany(instituteId.trim(), filter);
    return invoices.map((inv) => toInvoiceDTO(inv));
  }
}

