import {
  cleanTestDatabase,
  closeTestPool,
  db,
  validateTestEnvironment,
} from '@coaching-os/database';
import { ConflictError, NotFoundError } from '@coaching-os/shared';
import crypto from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { BillingPlanEntity } from '../../domain/entities/billing-plan.entity';
import { PrismaBillingPlanRepository } from './prisma-billing-plan.repository';

describe('PrismaBillingPlanRepository Integration & Security Suite', () => {
  let repository: PrismaBillingPlanRepository;

  let instituteA_Id: string;
  let instituteB_Id: string;

  let studentA_Id: string;
  let studentB_Id: string;

  let batchA_Id: string;
  let batchB_Id: string;

  let enrollmentA_Id: string;
  let enrollmentB_Id: string;

  beforeAll(() => {
    validateTestEnvironment();
    repository = new PrismaBillingPlanRepository(db);
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
        name: 'Billing Test Institute A',
        slug: `billing-inst-a-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        phone: '9876543210',
        email: `billing-a-${Date.now()}-${Math.floor(Math.random() * 1000)}@test.com`,
      },
    });
    instituteA_Id = instA.id;

    const instB = await db.institute.create({
      data: {
        id: crypto.randomUUID(),
        name: 'Billing Test Institute B',
        slug: `billing-inst-b-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        phone: '9876543211',
        email: `billing-b-${Date.now()}-${Math.floor(Math.random() * 1000)}@test.com`,
      },
    });
    instituteB_Id = instB.id;

    // 2. Create Students
    const studentA = await db.student.create({
      data: {
        id: crypto.randomUUID(),
        instituteId: instituteA_Id,
        admissionNumber: 'ADM-A-001',
        firstName: 'Alice',
        lastName: 'Student',
      },
    });
    studentA_Id = studentA.id;

    const studentB = await db.student.create({
      data: {
        id: crypto.randomUUID(),
        instituteId: instituteB_Id,
        admissionNumber: 'ADM-B-001',
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
        name: 'Batch A',
        code: 'BATCH-A',
      },
    });
    batchA_Id = batchA.id;

    const batchB = await db.batch.create({
      data: {
        id: crypto.randomUUID(),
        instituteId: instituteB_Id,
        subjectId: subjB.id,
        name: 'Batch B',
        code: 'BATCH-B',
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
  });

  it('persists and retrieves a BillingPlan strictly within tenant context', async () => {
    const plan = BillingPlanEntity.create({
      instituteId: instituteA_Id,
      enrollmentId: enrollmentA_Id,
      type: 'monthly',
      amount: 10000,
      discountType: 'percentage',
      discountValue: 10,
      billingStartDate: new Date('2026-09-01'),
      firstInvoiceAmountOverride: 8000,
    });

    const created = await repository.create(plan);
    expect(created.id).toBe(plan.id);

    const fetched = await repository.findById(instituteA_Id, plan.id);
    expect(fetched).not.toBeNull();
    expect(fetched?.amount).toBe(10000);
    expect(fetched?.discountType).toBe('percentage');
    expect(fetched?.discountValue).toBe(10);
    expect(fetched?.calculateStandardInvoiceAmount()).toBe(9000);
    expect(fetched?.calculateEffectiveFirstInvoiceAmount()).toBe(8000);
  });

  it('enforces multi-tenant isolation (IDOR & cross-tenant lookups fail closed)', async () => {
    const planA = BillingPlanEntity.create({
      instituteId: instituteA_Id,
      enrollmentId: enrollmentA_Id,
      type: 'monthly',
      amount: 5000,
      billingStartDate: new Date('2026-09-01'),
    });
    await repository.create(planA);

    // Cross-tenant lookup by Institute B returns null
    const fetchedByB = await repository.findById(instituteB_Id, planA.id);
    expect(fetchedByB).toBeNull();

    const fetchedByEnrollmentB = await repository.findByEnrollmentId(
      instituteB_Id,
      enrollmentA_Id,
    );
    expect(fetchedByEnrollmentB).toBeNull();

    // Cross-tenant update by Institute B fails with NotFoundError
    planA.updateDiscount('fixed', 500);
    const planAForB = BillingPlanEntity.reconstitute({
      id: planA.id,
      instituteId: instituteB_Id,
      enrollmentId: planA.enrollmentId,
      type: planA.type,
      amount: planA.amount,
      discount: planA.discount,
      billingStartDate: planA.billingStartDate,
      firstInvoiceAmountOverride: planA.firstInvoiceAmountOverride,
      createdAt: planA.createdAt,
      updatedAt: planA.updatedAt,
    });

    await expect(repository.update(planAForB)).rejects.toThrow(NotFoundError);
  });

  it('enforces BIL-004: unique billing plan constraint per enrollment', async () => {
    const plan1 = BillingPlanEntity.create({
      instituteId: instituteA_Id,
      enrollmentId: enrollmentA_Id,
      type: 'monthly',
      amount: 5000,
      billingStartDate: new Date('2026-09-01'),
    });
    await repository.create(plan1);

    const plan2 = BillingPlanEntity.create({
      instituteId: instituteA_Id,
      enrollmentId: enrollmentA_Id,
      type: 'one_time',
      amount: 15000,
      billingStartDate: new Date('2026-09-01'),
    });

    await expect(repository.create(plan2)).rejects.toThrow(ConflictError);
  });
});
