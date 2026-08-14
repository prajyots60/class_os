import {
  cleanTestDatabase,
  closeTestPool,
  db,
  validateTestEnvironment,
} from '@coaching-os/database';
import { NotFoundError } from '@coaching-os/shared';
import crypto from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { BillingPlanEntity } from '../../domain/entities/billing-plan.entity';
import { InvoiceEntity } from '../../domain/entities/invoice.entity';
import { PrismaBillingPlanRepository } from './prisma-billing-plan.repository';
import { PrismaInvoiceRepository } from './prisma-invoice.repository';

describe('PrismaInvoiceRepository Integration & Security Suite', () => {
  let planRepo: PrismaBillingPlanRepository;
  let invoiceRepo: PrismaInvoiceRepository;

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

  beforeAll(() => {
    validateTestEnvironment();
    planRepo = new PrismaBillingPlanRepository(db);
    invoiceRepo = new PrismaInvoiceRepository(db);
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
        name: 'Invoice Test Institute A',
        slug: `inv-inst-a-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        phone: '9876543210',
        email: `inv-a-${Date.now()}-${Math.floor(Math.random() * 1000)}@test.com`,
      },
    });
    instituteA_Id = instA.id;

    const instB = await db.institute.create({
      data: {
        id: crypto.randomUUID(),
        name: 'Invoice Test Institute B',
        slug: `inv-inst-b-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        phone: '9876543211',
        email: `inv-b-${Date.now()}-${Math.floor(Math.random() * 1000)}@test.com`,
      },
    });
    instituteB_Id = instB.id;

    // 2. Create Students
    const studentA = await db.student.create({
      data: {
        id: crypto.randomUUID(),
        instituteId: instituteA_Id,
        admissionNumber: 'ADM-INV-A-001',
        firstName: 'Alice',
        lastName: 'Student',
      },
    });
    studentA_Id = studentA.id;

    const studentB = await db.student.create({
      data: {
        id: crypto.randomUUID(),
        instituteId: instituteB_Id,
        admissionNumber: 'ADM-INV-B-001',
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
        name: 'Physics A',
        code: 'PHY-A',
      },
    });

    const subjB = await db.subject.create({
      data: {
        id: crypto.randomUUID(),
        instituteId: instituteB_Id,
        name: 'Physics B',
        code: 'PHY-B',
      },
    });

    const batchA = await db.batch.create({
      data: {
        id: crypto.randomUUID(),
        instituteId: instituteA_Id,
        subjectId: subjA.id,
        name: 'Batch Inv A',
        code: 'BATCH-INV-A',
      },
    });
    batchA_Id = batchA.id;

    const batchB = await db.batch.create({
      data: {
        id: crypto.randomUUID(),
        instituteId: instituteB_Id,
        subjectId: subjB.id,
        name: 'Batch Inv B',
        code: 'BATCH-INV-B',
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
        enrolledAt: new Date(),
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
        enrolledAt: new Date(),
      },
    });
    enrollmentB_Id = enrollB.id;

    // 5. Create BillingPlans
    const planA = await planRepo.create(
      BillingPlanEntity.create({
        instituteId: instituteA_Id,
        enrollmentId: enrollmentA_Id,
        type: 'monthly',
        amount: 10000,
        billingStartDate: new Date('2026-09-01'),
      })
    );
    planA_Id = planA.id;

    const planB = await planRepo.create(
      BillingPlanEntity.create({
        instituteId: instituteB_Id,
        enrollmentId: enrollmentB_Id,
        type: 'monthly',
        amount: 12000,
        billingStartDate: new Date('2026-09-01'),
      })
    );
    planB_Id = planB.id;
  });

  it('persists and retrieves an Invoice record within tenant context', async () => {
    const invoice = InvoiceEntity.create({
      billingPlanId: planA_Id,
      amount: 10000,
      dueDate: new Date('2026-09-01'),
      status: 'pending',
    });

    await invoiceRepo.save(invoice, instituteA_Id);

    const fetched = await invoiceRepo.findById(invoice.id, instituteA_Id);
    expect(fetched).not.toBeNull();
    expect(fetched?.id).toBe(invoice.id);
    expect(fetched?.billingPlanId).toBe(planA_Id);
    expect(fetched?.amount).toBe(10000);
    expect(fetched?.status).toBe('pending');
  });

  it('enforces multi-tenant isolation on Invoice reads and writes', async () => {
    const invoiceA = InvoiceEntity.create({
      billingPlanId: planA_Id,
      amount: 10000,
      dueDate: new Date('2026-09-01'),
    });

    await invoiceRepo.save(invoiceA, instituteA_Id);

    // Cross-tenant lookup by Institute B returns null
    const fetchedByB = await invoiceRepo.findById(invoiceA.id, instituteB_Id);
    expect(fetchedByB).toBeNull();

    const invoicesByB = await invoiceRepo.findByBillingPlanId(planA_Id, instituteB_Id);
    expect(invoicesByB).toEqual([]);

    // Cross-tenant save attempt (Institute B saving invoice for Institute A's plan) throws NotFoundError
    const maliciousInvoice = InvoiceEntity.create({
      billingPlanId: planA_Id, // Belongs to Institute A
      amount: 5000,
      dueDate: new Date('2026-09-01'),
    });

    await expect(invoiceRepo.save(maliciousInvoice, instituteB_Id)).rejects.toThrow(
      NotFoundError
    );
  });

  it('retrieves multiple invoices for a BillingPlan sorted by dueDate ascending', async () => {
    const inv1 = InvoiceEntity.create({
      billingPlanId: planA_Id,
      amount: 10000,
      dueDate: new Date('2026-10-01'),
    });

    const inv2 = InvoiceEntity.create({
      billingPlanId: planA_Id,
      amount: 10000,
      dueDate: new Date('2026-09-01'),
    });

    await invoiceRepo.save(inv1, instituteA_Id);
    await invoiceRepo.save(inv2, instituteA_Id);

    const list = await invoiceRepo.findByBillingPlanId(planA_Id, instituteA_Id);
    expect(list).toHaveLength(2);
    expect(list[0]?.id).toBe(inv2.id); // 2026-09-01 is earlier
    expect(list[1]?.id).toBe(inv1.id); // 2026-10-01 is later
  });
});
