import type { PrismaClient } from '@coaching-os/database';
import { logger } from '@coaching-os/observability';
import { AuthorizationError, NotFoundError, ValidationError } from '@coaching-os/shared';
import { PaymentEntity } from '../../domain/entities/payment.entity';
import type { PaymentMode } from '../../domain/enums/payment-mode.enum';
import { isValidPaymentMode } from '../../domain/enums/payment-mode.enum';
import type { BillingPlanRepository } from '../../domain/repositories/billing-plan.repository';
import type { InvoiceRepository } from '../../domain/repositories/invoice.repository';
import type { PaymentRepository } from '../../domain/repositories/payment.repository';
import type { PaymentDTO, RecordPaymentInput } from '../dto/payment.dto';
import { toPaymentDTO } from '../dto/payment.dto';
import type { EventBus } from './invoice.use-cases';

const moduleLogger = logger.child({ module: 'billing' });

export interface PaymentRecordedEventPayload {
  paymentId: string;
  invoiceId: string;
  billingPlanId: string;
  instituteId: string;
  enrollmentId: string;
  amount: number;
  paymentMode: PaymentMode;
  receivedOn: string;
  collectedBy: string | null;
  newInvoiceStatus: string;
  outstandingBalance: number;
  recordedAt: string;
}

export class RecordPaymentUseCase {
  constructor(
    private readonly billingPlanRepository: BillingPlanRepository,
    private readonly invoiceRepository: InvoiceRepository,
    private readonly paymentRepository: PaymentRepository,
    private readonly prisma?: PrismaClient,
    private readonly eventBus?: EventBus
  ) {}

  public async execute(
    instituteId: string,
    input: RecordPaymentInput,
    userContext?: { userId?: string; capabilities?: string[] }
  ): Promise<PaymentDTO> {
    // 1. Validate mandatory IDs & Tenant Context
    if (!instituteId?.trim()) {
      throw new ValidationError('Institute ID is required');
    }
    if (!input.invoiceId?.trim()) {
      throw new ValidationError('Invoice ID is required');
    }

    const cleanInstituteId = instituteId.trim();
    const cleanInvoiceId = input.invoiceId.trim();

    // 2. Capability Authorization Check (payment:record)
    if (userContext?.capabilities) {
      const hasCap =
        userContext.capabilities.includes('payment:record') ||
        userContext.capabilities.includes('billing:write');
      if (!hasCap) {
        throw new AuthorizationError('Permission denied: payment:record capability required');
      }
    }

    // 3. Validate Amount (> 0)
    if (typeof input.amount !== 'number' || isNaN(input.amount) || input.amount <= 0) {
      throw new ValidationError(`Payment amount must be strictly positive (> 0.00). Received ${input.amount}`);
    }
    const cleanAmount = Math.round((input.amount + Number.EPSILON) * 100) / 100;

    // 4. Validate Payment Mode
    if (!isValidPaymentMode(input.paymentMode)) {
      throw new ValidationError(`Invalid payment mode: ${input.paymentMode}. Must be cash, upi, or bank_transfer`);
    }

    // 5. Parse & Validate receivedOn Date
    let parsedReceivedOn: Date;
    if (input.receivedOn) {
      parsedReceivedOn = input.receivedOn instanceof Date ? input.receivedOn : new Date(input.receivedOn);
      if (isNaN(parsedReceivedOn.getTime())) {
        throw new ValidationError('Invalid receivedOn date format');
      }
    } else {
      parsedReceivedOn = new Date();
    }

    const todayEnd = new Date();
    todayEnd.setUTCHours(23, 59, 59, 999);
    if (parsedReceivedOn.getTime() > todayEnd.getTime()) {
      throw new ValidationError('receivedOn date cannot be in the future');
    }

    // 6. Resolve collectedBy
    const collectedBy = input.collectedBy !== undefined
      ? (input.collectedBy ? input.collectedBy.trim() : null)
      : (userContext?.userId ? userContext.userId.trim() : null);

    // 7. Application-Level Idempotency Protection (R-009)
    const existingPayment = await this.paymentRepository.findByIdempotencyTuple(
      cleanInvoiceId,
      cleanAmount,
      input.paymentMode,
      parsedReceivedOn,
      cleanInstituteId
    );

    if (existingPayment) {
      moduleLogger.info('billing.payment.idempotent_return', {
        paymentId: existingPayment.id,
        invoiceId: cleanInvoiceId,
        instituteId: cleanInstituteId,
      });
      return toPaymentDTO(existingPayment);
    }

    // 8. Transactional Financial Operations (R-010 Overpayment & R-011 Concurrency)
    let payment: PaymentEntity;
    let newInvoiceStatus: string;
    let newOutstanding: number;
    let billingPlanId: string;
    let enrollmentId: string;

    const executeTransaction = async (txClient?: unknown) => {
      // 8a. Load Invoice within tenant boundary (using txClient if available)
      const invoice = await this.invoiceRepository.findById(cleanInvoiceId, cleanInstituteId, txClient);
      if (!invoice) {
        throw new NotFoundError(`Invoice with ID ${cleanInvoiceId} not found in this institute`);
      }

      // 8b. Load BillingPlan for validation & event metadata
      const plan = await this.billingPlanRepository.findById(cleanInstituteId, invoice.billingPlanId);
      if (!plan) {
        throw new NotFoundError(`BillingPlan with ID ${invoice.billingPlanId} not found in this institute`);
      }
      billingPlanId = plan.id;
      enrollmentId = plan.enrollmentId;

      // 8c. Validate receivedOn >= plan.billingStartDate
      const startDateUtc = new Date(plan.billingStartDate.getTime());
      startDateUtc.setUTCHours(0, 0, 0, 0);
      const receivedUtc = new Date(parsedReceivedOn.getTime());
      receivedUtc.setUTCHours(0, 0, 0, 0);

      if (receivedUtc.getTime() < startDateUtc.getTime()) {
        throw new ValidationError('receivedOn date cannot be earlier than plan billing start date');
      }

      // 8d. Load all existing payments for invoice to compute current outstanding (using txClient if available)
      const existingPayments = await this.paymentRepository.findByInvoiceId(cleanInvoiceId, cleanInstituteId, txClient);
      const currentPaid = existingPayments.reduce((sum, p) => sum + p.amount, 0);
      const roundedCurrentPaid = Math.round((currentPaid + Number.EPSILON) * 100) / 100;
      const outstanding = invoice.calculateOutstanding(roundedCurrentPaid);

      // 8e. R-010 Overpayment Protection Policy
      if (cleanAmount > outstanding) {
        throw new ValidationError('Payment amount exceeds remaining invoice outstanding balance');
      }

      // 8f. Create Payment Entity
      payment = PaymentEntity.create({
        invoiceId: cleanInvoiceId,
        amount: cleanAmount,
        paymentMode: input.paymentMode,
        receivedOn: parsedReceivedOn,
        collectedBy,
        remarks: input.remarks,
      });

      // 8g. Recalculate Invoice status & update InvoiceEntity
      const newTotalPaid = Math.round((roundedCurrentPaid + cleanAmount + Number.EPSILON) * 100) / 100;
      invoice.updateStatusFromPayments(newTotalPaid);

      // 8h. Persist Payment & updated Invoice in atomic transaction
      await this.paymentRepository.save(payment, cleanInstituteId, txClient);
      await this.invoiceRepository.save(invoice, cleanInstituteId, txClient);

      newInvoiceStatus = invoice.status;
      newOutstanding = invoice.calculateOutstanding(newTotalPaid);
    };

    if (this.prisma && typeof (this.prisma as any).$transaction === 'function') {
      await (this.prisma as any).$transaction(async (tx: unknown) => {
        await executeTransaction(tx);
      });
    } else {
      await executeTransaction();
    }

    // 9. Post-Commit Domain Event Emission
    moduleLogger.info('billing.payment.recorded.success', {
      paymentId: payment!.id,
      invoiceId: cleanInvoiceId,
      instituteId: cleanInstituteId,
      amount: payment!.amount,
    });

    if (this.eventBus) {
      try {
        await this.eventBus.publish('billing.payment.recorded', {
          paymentId: payment!.id,
          invoiceId: cleanInvoiceId,
          billingPlanId: billingPlanId!,
          instituteId: cleanInstituteId,
          enrollmentId: enrollmentId!,
          amount: payment!.amount,
          paymentMode: payment!.paymentMode,
          receivedOn: payment!.receivedOn.toISOString().split('T')[0],
          collectedBy: payment!.collectedBy,
          newInvoiceStatus: newInvoiceStatus!,
          outstandingBalance: newOutstanding!,
          recordedAt: payment!.createdAt.toISOString(),
        } satisfies PaymentRecordedEventPayload);
      } catch (err: any) {
        moduleLogger.warn('billing.payment.event_publish_failed', {
          error: err.message,
          paymentId: payment!.id,
        });
      }
    }

    return toPaymentDTO(payment!);
  }
}

export class GetPaymentUseCase {
  constructor(private readonly paymentRepository: PaymentRepository) {}

  public async execute(
    instituteId: string,
    paymentId: string,
    userContext?: { capabilities?: string[] }
  ): Promise<PaymentDTO> {
    if (!instituteId?.trim()) {
      throw new ValidationError('Institute ID is required');
    }
    if (!paymentId?.trim()) {
      throw new ValidationError('Payment ID is required');
    }

    const cleanInstituteId = instituteId.trim();
    const cleanPaymentId = paymentId.trim();

    if (userContext?.capabilities) {
      const hasCap =
        userContext.capabilities.includes('billing:read') ||
        userContext.capabilities.includes('payment:read');
      if (!hasCap) {
        throw new AuthorizationError('Permission denied: billing:read capability required');
      }
    }

    const payment = await this.paymentRepository.findById(cleanPaymentId, cleanInstituteId);
    if (!payment) {
      throw new NotFoundError(`Payment with ID ${cleanPaymentId} not found in this institute`);
    }

    return toPaymentDTO(payment);
  }
}
