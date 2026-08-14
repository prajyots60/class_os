import {
  cleanTestDatabase,
  closeTestPool,
  db,
  validateTestEnvironment,
} from '@coaching-os/database';
import { NotFoundError, ValidationError } from '@coaching-os/shared';
import crypto from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { RecordPaymentUseCase } from '../../application/use-cases/payment.use-cases';
import { BillingPlanEntity } from '../../domain/entities/billing-plan.entity';
import { InvoiceEntity } from '../../domain/entities/invoice.entity';
import { PaymentEntity } from '../../domain/entities/payment.entity';
import { PrismaBillingPlanRepository } from './prisma-billing-plan.repository';
import { PrismaInvoiceRepository } from './prisma-invoice.repository';
import { PrismaPaymentRepository } from './prisma-payment.repository';

describe('PrismaPaymentRepository Integration & Security Suite', () => {
  let planRepo: PrismaBillingPlanRepository;
  let invoiceRepo: PrismaInvoiceRepository;
  let paymentRepo: PrismaPaymentRepository;
  let recordUseCase: RecordPaymentUseCase;

  let instituteA_Id: string;
  let instituteB_Id: string;

  let studentA_Id: string;
  let studentB_Id: string;

  let batchA_Id: string;
  let batchB_Id: string;

  let enrollmentA_Id: string;
  let enrollmentB_Id: string;

  let planA_Id: string;
  let planB_Id: string;

  let invoiceA_Id: string;
  let invoiceB_Id: string;

  beforeAll(() => {
    validateTestEnvironment();
    planRepo = new PrismaBillingPlanRepository(db);
    invoiceRepo = new PrismaInvoiceRepository(db);
    paymentRepo = new PrismaPaymentRepository(db);
    recordUseCase = new RecordPaymentUseCase(planRepo, invoiceRepo, paymentRepo, db);
  });

  afterAll(async () => {
    await closeTestPool();
  });

  beforeEach(async () => {
    await cleanTestDatabase();

    // 1. Create Tenant Institutes
    const instA = await db.institute.create({
      data: {
        id: crypto.randomUUID(),
        name: 'Payment Test Institute A',
        slug: `pay-inst-a-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        phone: '9876543210',
        email: `pay-a-${Date.now()}-${Math.floor(Math.random() * 1000)}@test.com`,
      },
    });
    instituteA_Id = instA.id;

    const instB = await db.institute.create({
      data: {
        id: crypto.randomUUID(),
        name: 'Payment Test Institute B',
        slug: `pay-inst-b-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        phone: '9876543211',
        email: `pay-b-${Date.now()}-${Math.floor(Math.random() * 1000)}@test.com`,
      },
    });
    instituteB_Id = instB.id;

    // 2. Create Students
    const studentA = await db.student.create({
      data: {
        id: crypto.randomUUID(),
        instituteId: instituteA_Id,
        admissionNumber: 'ADM-PAY-A-001',
        firstName: 'Alice',
        lastName: 'Student',
      },
    });
    studentA_Id = studentA.id;

    const studentB = await db.student.create({
      data: {
        id: crypto.randomUUID(),
        instituteId: instituteB_Id,
        admissionNumber: 'ADM-PAY-B-001',
        firstName: 'Bob',
        lastName: 'Student',
      },
    });
    studentB_Id = studentB.id;

    // 3. Create Subjects & Batches
    const subjA = await db.subject.create({
      data: {
        id: crypto.randomUUID(),
        instituteId: instituteA_Id,
        name: 'Math A',
        code: 'MATH-A',
      },
    });

    const subjB = await db.subject.create({
      data: {
        id: crypto.randomUUID(),
        instituteId: instituteB_Id,
        name: 'Math B',
        code: 'MATH-B',
      },
    });

    const batchA = await db.batch.create({
      data: {
        id: crypto.randomUUID(),
        instituteId: instituteA_Id,
        subjectId: subjA.id,
        name: 'Batch A 2026',
        code: 'BAT-A-2026',
      },
    });
    batchA_Id = batchA.id;

    const batchB = await db.batch.create({
      data: {
        id: crypto.randomUUID(),
        instituteId: instituteB_Id,
        subjectId: subjB.id,
        name: 'Batch B 2026',
        code: 'BAT-B-2026',
      },
    });
    batchB_Id = batchB.id;

    // 4. Create Enrollments
    const enrollmentA = await db.enrollment.create({
      data: {
        id: crypto.randomUUID(),
        instituteId: instituteA_Id,
        studentId: studentA_Id,
        batchId: batchA_Id,
        status: 'active',
      },
    });
    enrollmentA_Id = enrollmentA.id;

    const enrollmentB = await db.enrollment.create({
      data: {
        id: crypto.randomUUID(),
        instituteId: instituteB_Id,
        studentId: studentB_Id,
        batchId: batchB_Id,
        status: 'active',
      },
    });
    enrollmentB_Id = enrollmentB.id;

    // 5. Create Billing Plans
    const planAEntity = BillingPlanEntity.create({
      instituteId: instituteA_Id,
      enrollmentId: enrollmentA_Id,
      type: 'one_time',
      amount: 10000,
      billingStartDate: '2026-08-01',
    });
    await planRepo.create(planAEntity);
    planA_Id = planAEntity.id;

    const planBEntity = BillingPlanEntity.create({
      instituteId: instituteB_Id,
      enrollmentId: enrollmentB_Id,
      type: 'one_time',
      amount: 12000,
      billingStartDate: '2026-08-01',
    });
    await planRepo.create(planBEntity);
    planB_Id = planBEntity.id;

    // 6. Create Invoices
    const invoiceAEntity = InvoiceEntity.create({
      billingPlanId: planA_Id,
      amount: 10000,
      dueDate: '2026-08-15',
      status: 'pending',
    });
    await invoiceRepo.save(invoiceAEntity, instituteA_Id);
    invoiceA_Id = invoiceAEntity.id;

    const invoiceBEntity = InvoiceEntity.create({
      billingPlanId: planB_Id,
      amount: 12000,
      dueDate: '2026-08-15',
      status: 'pending',
    });
    await invoiceRepo.save(invoiceBEntity, instituteB_Id);
    invoiceB_Id = invoiceBEntity.id;
  });

  it('persists and retrieves a Payment record within tenant context', async () => {
    const payment = PaymentEntity.create({
      invoiceId: invoiceA_Id,
      amount: 4000,
      paymentMode: 'upi',
      receivedOn: '2026-08-14',
      remarks: 'Integration test payment',
    });

    await paymentRepo.save(payment, instituteA_Id);

    const fetched = await paymentRepo.findById(payment.id, instituteA_Id);
    expect(fetched).not.toBeNull();
    expect(fetched?.id).toBe(payment.id);
    expect(fetched?.amount).toBe(4000);
    expect(fetched?.paymentMode).toBe('upi');
    expect(fetched?.remarks).toBe('Integration test payment');

    const byInvoice = await paymentRepo.findByInvoiceId(invoiceA_Id, instituteA_Id);
    expect(byInvoice).toHaveLength(1);
    expect(byInvoice[0]?.id).toBe(payment.id);
  });

  it('enforces multi-tenant isolation: Institute A cannot read, query, or save payments for Institute B', async () => {
    const paymentB = PaymentEntity.create({
      invoiceId: invoiceB_Id,
      amount: 6000,
      paymentMode: 'bank_transfer',
      receivedOn: '2026-08-14',
    });
    await paymentRepo.save(paymentB, instituteB_Id);

    // Tenant B can read
    const fetchedB = await paymentRepo.findById(paymentB.id, instituteB_Id);
    expect(fetchedB?.id).toBe(paymentB.id);

    // Tenant A attempt to read Payment B returns null
    const crossFetch = await paymentRepo.findById(paymentB.id, instituteA_Id);
    expect(crossFetch).toBeNull();

    // Tenant A attempt to find by invoice for Invoice B returns empty
    const crossInvoiceFetch = await paymentRepo.findByInvoiceId(invoiceB_Id, instituteA_Id);
    expect(crossInvoiceFetch).toEqual([]);

    // Tenant A attempt to save payment against Invoice B throws NotFoundError
    const invalidCrossPayment = PaymentEntity.create({
      invoiceId: invoiceB_Id,
      amount: 1000,
      paymentMode: 'cash',
    });
    await expect(paymentRepo.save(invalidCrossPayment, instituteA_Id)).rejects.toThrow(NotFoundError);
  });

  it('R-011 Real PostgreSQL Concurrency Test: concurrent payment attempts against same invoice maintain consistency and reject overpayment', async () => {
    // Invoice A amount = ₹10,000.
    // Execute two concurrent payment attempts: Request A = ₹7,000, Request B = ₹7,000.
    // Total attempted = ₹14,000 > ₹10,000.
    // Under PostgreSQL transaction isolation & row locks, exactly one transaction MUST succeed and the other MUST fail with ValidationError (or conflict abort).

    const results = await Promise.allSettled([
      recordUseCase.execute(
        instituteA_Id,
        { invoiceId: invoiceA_Id, amount: 7000, paymentMode: 'upi', receivedOn: '2026-08-14' },
        { capabilities: ['payment:record'] }
      ),
      recordUseCase.execute(
        instituteA_Id,
        { invoiceId: invoiceA_Id, amount: 7000, paymentMode: 'cash', receivedOn: '2026-08-14' },
        { capabilities: ['payment:record'] }
      ),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    if (fulfilled.length !== 1) {
      console.log('Concurrency test results:', JSON.stringify(results, null, 2));
    }
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    // Verify rejection reason is ValidationError
    const rejectedReason = (rejected[0] as PromiseRejectedResult).reason;
    expect(rejectedReason).toBeInstanceOf(ValidationError);

    // Verify database state: total payments recorded against Invoice A is strictly 1 (amount = ₹7,000)
    const storedPayments = await paymentRepo.findByInvoiceId(invoiceA_Id, instituteA_Id);
    expect(storedPayments).toHaveLength(1);
    expect(storedPayments[0]?.amount).toBe(7000);

    // Verify Invoice status is partial (7000 paid out of 10000)
    const updatedInvoice = await invoiceRepo.findById(invoiceA_Id, instituteA_Id);
    expect(updatedInvoice?.status).toBe('partial');
    expect(updatedInvoice?.calculateOutstanding(7000)).toBe(3000);
    });
});
