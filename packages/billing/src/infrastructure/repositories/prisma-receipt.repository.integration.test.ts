import {
  cleanTestDatabase,
  closeTestPool,
  db,
  validateTestEnvironment,
} from '@coaching-os/database';
import { NotFoundError } from '@coaching-os/shared';
import crypto from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { GenerateReceiptUseCase, GetReceiptUseCase } from '../../application/use-cases/receipt.use-cases';
import { BillingPlanEntity } from '../../domain/entities/billing-plan.entity';
import { InvoiceEntity } from '../../domain/entities/invoice.entity';
import { PaymentEntity } from '../../domain/entities/payment.entity';
import { ReceiptEntity } from '../../domain/entities/receipt.entity';
import { PrismaBillingPlanRepository } from './prisma-billing-plan.repository';
import { PrismaInvoiceRepository } from './prisma-invoice.repository';
import { PrismaPaymentRepository } from './prisma-payment.repository';
import { PrismaReceiptRepository } from './prisma-receipt.repository';

describe('PrismaReceiptRepository Integration & Security Suite', () => {
  let planRepo: PrismaBillingPlanRepository;
  let invoiceRepo: PrismaInvoiceRepository;
  let paymentRepo: PrismaPaymentRepository;
  let receiptRepo: PrismaReceiptRepository;

  let generateUseCase: GenerateReceiptUseCase;
  let getUseCase: GetReceiptUseCase;

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

  let paymentA_Id: string;
  let paymentB_Id: string;

  beforeAll(() => {
    validateTestEnvironment();
    planRepo = new PrismaBillingPlanRepository(db);
    invoiceRepo = new PrismaInvoiceRepository(db);
    paymentRepo = new PrismaPaymentRepository(db);
    receiptRepo = new PrismaReceiptRepository(db);

    generateUseCase = new GenerateReceiptUseCase(paymentRepo, receiptRepo, db);
    getUseCase = new GetReceiptUseCase(receiptRepo);
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
        name: 'Receipt Test Institute A',
        slug: `rcpt-inst-a-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        phone: '9876543210',
        email: `rcpt-a-${Date.now()}-${Math.floor(Math.random() * 1000)}@test.com`,
      },
    });
    instituteA_Id = instA.id;

    const instB = await db.institute.create({
      data: {
        id: crypto.randomUUID(),
        name: 'Receipt Test Institute B',
        slug: `rcpt-inst-b-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        phone: '9876543211',
        email: `rcpt-b-${Date.now()}-${Math.floor(Math.random() * 1000)}@test.com`,
      },
    });
    instituteB_Id = instB.id;

    // 2. Create Students
    const studentA = await db.student.create({
      data: {
        id: crypto.randomUUID(),
        instituteId: instituteA_Id,
        admissionNumber: 'ADM-RCPT-A-001',
        firstName: 'Alice',
        lastName: 'ReceiptStudent',
      },
    });
    studentA_Id = studentA.id;

    const studentB = await db.student.create({
      data: {
        id: crypto.randomUUID(),
        instituteId: instituteB_Id,
        admissionNumber: 'ADM-RCPT-B-001',
        firstName: 'Bob',
        lastName: 'ReceiptStudent',
      },
    });
    studentB_Id = studentB.id;

    // 3. Create Subjects & Batches
    const subjA = await db.subject.create({
      data: {
        id: crypto.randomUUID(),
        instituteId: instituteA_Id,
        name: 'Math A Receipt Test',
        code: 'MATH-RCPT-A',
      },
    });

    const subjB = await db.subject.create({
      data: {
        id: crypto.randomUUID(),
        instituteId: instituteB_Id,
        name: 'Math B Receipt Test',
        code: 'MATH-RCPT-B',
      },
    });

    const batchA = await db.batch.create({
      data: {
        id: crypto.randomUUID(),
        instituteId: instituteA_Id,
        subjectId: subjA.id,
        name: 'Batch A Receipt Test',
        code: 'BAT-RCPT-A',
      },
    });
    batchA_Id = batchA.id;

    const batchB = await db.batch.create({
      data: {
        id: crypto.randomUUID(),
        instituteId: instituteB_Id,
        subjectId: subjB.id,
        name: 'Batch B Receipt Test',
        code: 'BAT-RCPT-B',
      },
    });
    batchB_Id = batchB.id;

    // 4. Create Enrollments
    const enrollA = await db.enrollment.create({
      data: {
        id: crypto.randomUUID(),
        instituteId: instituteA_Id,
        studentId: studentA_Id,
        batchId: batchA_Id,
        status: 'active',
      },
    });
    enrollmentA_Id = enrollA.id;

    const enrollB = await db.enrollment.create({
      data: {
        id: crypto.randomUUID(),
        instituteId: instituteB_Id,
        studentId: studentB_Id,
        batchId: batchB_Id,
        status: 'active',
      },
    });
    enrollmentB_Id = enrollB.id;

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
    const invoiceA = InvoiceEntity.create({
      billingPlanId: planA_Id,
      amount: 10000,
      dueDate: new Date('2026-08-15'),
      status: 'pending',
    });
    await invoiceRepo.save(invoiceA, instituteA_Id);
    invoiceA_Id = invoiceA.id;

    const invoiceB = InvoiceEntity.create({
      billingPlanId: planB_Id,
      amount: 12000,
      dueDate: new Date('2026-08-15'),
      status: 'pending',
    });
    await invoiceRepo.save(invoiceB, instituteB_Id);
    invoiceB_Id = invoiceB.id;

    // 7. Create Payments
    const payA = PaymentEntity.create({
      invoiceId: invoiceA_Id,
      amount: 5000,
      paymentMode: 'upi',
      receivedOn: new Date('2026-08-14'),
    });
    await paymentRepo.save(payA, instituteA_Id);
    paymentA_Id = payA.id;

    const payB = PaymentEntity.create({
      invoiceId: invoiceB_Id,
      amount: 6000,
      paymentMode: 'cash',
      receivedOn: new Date('2026-08-14'),
    });
    await paymentRepo.save(payB, instituteB_Id);
    paymentB_Id = payB.id;
  });

  it('persists and retrieves a Receipt record within tenant context', async () => {
    const currentYear = new Date().getUTCFullYear();
    const receiptNum = await receiptRepo.allocateNextReceiptNumber(instituteA_Id, currentYear);

    const receipt = ReceiptEntity.create({
      instituteId: instituteA_Id,
      paymentId: paymentA_Id,
      receiptNumber: receiptNum,
    });

    await receiptRepo.save(receipt, instituteA_Id);

    const byId = await receiptRepo.findById(receipt.id, instituteA_Id);
    expect(byId).not.toBeNull();
    expect(byId?.id).toBe(receipt.id);
    expect(byId?.instituteId).toBe(instituteA_Id);
    expect(byId?.paymentId).toBe(paymentA_Id);
    expect(byId?.receiptNumber).toBe(receiptNum);

    const byPayId = await receiptRepo.findByPaymentId(paymentA_Id, instituteA_Id);
    expect(byPayId).not.toBeNull();
    expect(byPayId?.id).toBe(receipt.id);
  });

  it('enforces multi-tenant isolation: Institute A cannot read, query, or save receipts for Institute B', async () => {
    const currentYear = new Date().getUTCFullYear();
    const receiptNum = await receiptRepo.allocateNextReceiptNumber(instituteB_Id, currentYear);

    const receiptB = ReceiptEntity.create({
      instituteId: instituteB_Id,
      paymentId: paymentB_Id,
      receiptNumber: receiptNum,
    });

    await receiptRepo.save(receiptB, instituteB_Id);

    // Institute A trying to read Institute B receipt -> null / NotFound
    const crossId = await receiptRepo.findById(receiptB.id, instituteA_Id);
    expect(crossId).toBeNull();

    const crossPayId = await receiptRepo.findByPaymentId(paymentB_Id, instituteA_Id);
    expect(crossPayId).toBeNull();

    // Use Case level cross-tenant lookup throws NotFoundError
    await expect(
      getUseCase.execute(receiptB.id, instituteA_Id, { capabilities: ['receipt:read'] })
    ).rejects.toThrow(NotFoundError);

    // Institute A trying to save receipt for Institute B payment -> throws NotFoundError
    const invalidReceipt = ReceiptEntity.create({
      instituteId: instituteA_Id,
      paymentId: paymentB_Id,
      receiptNumber: 'REC-2026-99999',
    });

    await expect(receiptRepo.save(invalidReceipt, instituteA_Id)).rejects.toThrow(NotFoundError);
  });

  it('R-019 Idempotency & Same-Payment Concurrency Test: concurrent receipt generations for SAME payment yield EXACTLY 1 receipt', async () => {
    // Two concurrent GenerateReceipt calls for Payment A
    const results = await Promise.allSettled([
      generateUseCase.execute(
        instituteA_Id,
        { paymentId: paymentA_Id },
        { capabilities: ['receipt:issue'] }
      ),
      generateUseCase.execute(
        instituteA_Id,
        { paymentId: paymentA_Id },
        { capabilities: ['receipt:issue'] }
      ),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    expect(fulfilled).toHaveLength(2);

    const res1 = (results[0] as PromiseFulfilledResult<any>).value;
    const res2 = (results[1] as PromiseFulfilledResult<any>).value;

    // Both callers receive the EXACT same receipt ID & receipt number
    expect(res1.id).toBe(res2.id);
    expect(res1.receiptNumber).toBe(res2.receiptNumber);

    // Verify in database that EXACTLY 1 receipt row exists for paymentA_Id
    const recordsInDb = await db.receipt.findMany({
      where: { paymentId: paymentA_Id },
    });
    expect(recordsInDb).toHaveLength(1);
  });

  it('Different-Payment Concurrency Test: concurrent receipt generations for DIFFERENT payments yield unique receipt numbers', async () => {
    // Create 3 separate payments for Institute A
    const payA2 = PaymentEntity.create({
      invoiceId: invoiceA_Id,
      amount: 2000,
      paymentMode: 'cash',
      receivedOn: new Date('2026-08-14'),
    });
    await paymentRepo.save(payA2, instituteA_Id);

    const payA3 = PaymentEntity.create({
      invoiceId: invoiceA_Id,
      amount: 3000,
      paymentMode: 'bank_transfer',
      receivedOn: new Date('2026-08-14'),
    });
    await paymentRepo.save(payA3, instituteA_Id);

    // Concurrently generate receipts for paymentA_Id, payA2.id, payA3.id
    const results = await Promise.allSettled([
      generateUseCase.execute(
        instituteA_Id,
        { paymentId: paymentA_Id },
        { capabilities: ['receipt:issue'] }
      ),
      generateUseCase.execute(
        instituteA_Id,
        { paymentId: payA2.id },
        { capabilities: ['receipt:issue'] }
      ),
      generateUseCase.execute(
        instituteA_Id,
        { paymentId: payA3.id },
        { capabilities: ['receipt:issue'] }
      ),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    expect(fulfilled).toHaveLength(3);

    const r1 = (results[0] as PromiseFulfilledResult<any>).value;
    const r2 = (results[1] as PromiseFulfilledResult<any>).value;
    const r3 = (results[2] as PromiseFulfilledResult<any>).value;

    const receiptNumbers = new Set([r1.receiptNumber, r2.receiptNumber, r3.receiptNumber]);
    expect(receiptNumbers.size).toBe(3);

    const allReceiptsInDb = await db.receipt.findMany({
      where: { instituteId: instituteA_Id },
    });
    expect(allReceiptsInDb).toHaveLength(3);
  });

  it('Multi-Tenant Numbering Test: Institute A and Institute B generate receipts with institute-scoped sequences', async () => {
    const results = await Promise.allSettled([
      generateUseCase.execute(
        instituteA_Id,
        { paymentId: paymentA_Id },
        { capabilities: ['receipt:issue'] }
      ),
      generateUseCase.execute(
        instituteB_Id,
        { paymentId: paymentB_Id },
        { capabilities: ['receipt:issue'] }
      ),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    expect(fulfilled).toHaveLength(2);

    const rA = (results[0] as PromiseFulfilledResult<any>).value;
    const rB = (results[1] as PromiseFulfilledResult<any>).value;

    const year = new Date().getUTCFullYear();
    // Both institutes start sequence at 00001
    expect(rA.receiptNumber).toBe(`REC-${year}-00001`);
    expect(rB.receiptNumber).toBe(`REC-${year}-00001`);
    expect(rA.instituteId).toBe(instituteA_Id);
    expect(rB.instituteId).toBe(instituteB_Id);
  });
});
