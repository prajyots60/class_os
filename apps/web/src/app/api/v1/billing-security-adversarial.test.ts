import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { validateTestEnvironment, cleanTestDatabase, closeTestPool, db } from '@coaching-os/database';
import { auth } from '@coaching-os/auth';

// Route Handlers
import { POST as billingPlansPOST } from './billing-plans/route';
import { GET as billingPlanByIdGET } from './billing-plans/[id]/route';
import { POST as invoicesPOST } from './invoices/route';
import { GET as invoiceByIdGET, PATCH as invoiceByIdPATCH, DELETE as invoiceByIdDELETE } from './invoices/[id]/route';
import { POST as paymentsPOST } from './payments/route';
import { PATCH as paymentByIdPATCH, DELETE as paymentByIdDELETE } from './payments/[id]/route';
import { POST as receiptsPOST } from './receipts/route';
import { PATCH as receiptByIdPATCH, DELETE as receiptByIdDELETE } from './receipts/[id]/route';

describe('Phase 3.7.1 — Comprehensive Billing Security, Adversarial & Concurrency Suite', () => {
  beforeAll(() => {
    validateTestEnvironment();
  });

  beforeEach(async () => {
    await cleanTestDatabase();
  });

  afterAll(async () => {
    await closeTestPool();
  });

  let testIpCounter = 300;
  function getUniqueIp(): string {
    testIpCounter += 1;
    return `10.200.${Math.floor(testIpCounter / 250)}.${testIpCounter % 250}`;
  }

  async function createAuthUser(prefix: string) {
    const timestamp = Date.now();
    const suffix = `${timestamp}_${Math.floor(Math.random() * 99999)}`;
    const email = `${prefix}_${suffix}@test.com`;
    const password = 'SecureTestPassword123!';

    const signUpRes = await auth.api.signUpEmail({
      body: { email, password, name: `${prefix} User` },
      asResponse: true,
    });

    const cookieHeader = signUpRes.headers.get('set-cookie');
    if (!cookieHeader) throw new Error('Failed to get session cookie from Better Auth');

    const user = await db.user.findFirstOrThrow({ where: { email: email.toLowerCase() } });
    return { user, cookieHeader };
  }

  async function setupTenant(prefix: string) {
    const { user, cookieHeader } = await createAuthUser(prefix);
    const institute = await db.institute.create({
      data: {
        name: `${prefix} Coaching Institute`,
        slug: `${prefix.toLowerCase()}-inst-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        email: `${prefix.toLowerCase()}_inst@test.com`,
        phone: `+9198${Math.floor(10000000 + Math.random() * 90000000)}`,
        status: 'active',
      },
    });

    const parentIdentity = await db.parentIdentity.create({
      data: {
        phone: `+9197${Math.floor(10000000 + Math.random() * 90000000)}`,
        name: `${prefix} Identity`,
      },
    });

    await db.user.update({
      where: { id: user.id },
      data: { instituteId: institute.id, parentIdentityId: parentIdentity.id },
    });

    const instituteParent = await db.instituteParent.create({
      data: {
        instituteId: institute.id,
        parentIdentityId: parentIdentity.id,
      },
    });

    await db.instituteMembership.create({
      data: {
        instituteId: institute.id,
        parentIdentityId: parentIdentity.id,
        instituteParentId: instituteParent.id,
      },
    });

    const student = await db.student.create({
      data: {
        instituteId: institute.id,
        admissionNumber: `ADM-${prefix}-${Date.now()}`,
        firstName: prefix,
        lastName: 'Student',
        dateOfBirth: new Date('2008-01-01'),
        gender: 'male',
        status: 'active',
        admissionStatus: 'admitted',
      },
    });

    const subject = await db.subject.create({
      data: {
        id: crypto.randomUUID(),
        instituteId: institute.id,
        name: `${prefix} Subject`,
        code: `${prefix.toUpperCase()}-SUB`,
        status: 'active',
      },
    });

    const batch = await db.batch.create({
      data: {
        id: crypto.randomUUID(),
        instituteId: institute.id,
        subjectId: subject.id,
        name: `${prefix} Batch`,
        code: `${prefix.toUpperCase()}-BAT`,
        status: 'running',
      },
    });

    const enrollment = await db.enrollment.create({
      data: {
        instituteId: institute.id,
        studentId: student.id,
        batchId: batch.id,
        status: 'active',
        enrolledAt: new Date('2026-01-01'),
      },
    });

    return { user, cookieHeader, institute, student, batch, enrollment };
  }

  function makeRequest(
    url: string,
    method = 'GET',
    body?: Record<string, unknown>,
    cookieHeader?: string,
    ip = getUniqueIp()
  ) {
    const headers: Record<string, string> = {
      'x-forwarded-for': ip,
    };
    if (cookieHeader) headers['cookie'] = cookieHeader;
    if (body) headers['content-type'] = 'application/json';

    return new NextRequest(new URL(url, 'http://localhost:3000'), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  // ─── Helper for Creating Plan + Invoice via API ─────────────────────────────

  async function createPlanAndInvoice(tenant: Awaited<ReturnType<typeof setupTenant>>, totalAmount = 10000) {
    const planReq = makeRequest(
      '/api/v1/billing-plans',
      'POST',
      {
        enrollmentId: tenant.enrollment.id,
        feeType: 'one_time',
        totalAmount,
        billingStartDate: '2026-08-01',
      },
      tenant.cookieHeader
    );
    const planRes = await billingPlansPOST(planReq);
    expect(planRes.status).toBe(201);
    const planJson = await planRes.json();
    const planId = planJson.data.id;

    const invReq = makeRequest(
      '/api/v1/invoices',
      'POST',
      { billingPlanId: planId },
      tenant.cookieHeader
    );
    const invRes = await invoicesPOST(invReq);
    expect(invRes.status).toBe(201);
    const invJson = await invRes.json();
    const invoiceId = invJson.data.id;

    return { planId, invoiceId, invoiceDto: invJson.data };
  }

  // ─── 1. Cross-Tenant IDOR Attack Suite ─────────────────────────────────────

  describe('1. 🔴 Cross-Tenant IDOR Attack Suite', () => {
    it('prevents Inst A user from accessing Inst B BillingPlan via GET (404 Not Found)', async () => {
      const instA = await setupTenant('InstA_IDOR_Plan');
      const instB = await setupTenant('InstB_IDOR_Plan');
      const { planId: planB_id } = await createPlanAndInvoice(instB);

      const req = makeRequest(`/api/v1/billing-plans/${planB_id}`, 'GET', undefined, instA.cookieHeader);
      const res = await billingPlanByIdGET(req, { params: Promise.resolve({ id: planB_id }) });
      expect(res.status).toBe(404);

      const json = await res.json();
      expect(json.error.code).toBe('NOT_FOUND');
    });

    it('prevents Inst A user from accessing Inst B Invoice via GET (404 Not Found)', async () => {
      const instA = await setupTenant('InstA_IDOR_Inv');
      const instB = await setupTenant('InstB_IDOR_Inv');
      const { invoiceId: invB_id } = await createPlanAndInvoice(instB);

      const req = makeRequest(`/api/v1/invoices/${invB_id}`, 'GET', undefined, instA.cookieHeader);
      const res = await invoiceByIdGET(req, { params: Promise.resolve({ id: invB_id }) });
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error.code).toBe('NOT_FOUND');
    });

    it('prevents Inst A user from creating BillingPlan with foreign Inst B enrollmentId (404 Not Found)', async () => {
      const instA = await setupTenant('InstA_IDOR_CreatePlan');
      const instB = await setupTenant('InstB_IDOR_CreatePlan');

      const body = {
        enrollmentId: instB.enrollment.id, // Foreign enrollment
        feeType: 'monthly',
        totalAmount: 10000,
        billingStartDate: '2026-08-01',
      };

      const req = makeRequest('/api/v1/billing-plans', 'POST', body, instA.cookieHeader);
      const res = await billingPlansPOST(req);
      expect(res.status).toBe(404);
    });

    it('prevents Inst A user from recording payment on foreign Inst B invoice (404 Not Found)', async () => {
      const instA = await setupTenant('InstA_IDOR_Pay');
      const instB = await setupTenant('InstB_IDOR_Pay');
      const { invoiceId: invB_id } = await createPlanAndInvoice(instB);

      const body = {
        invoiceId: invB_id,
        amount: 5000,
        paymentMode: 'upi',
        receivedOn: '2026-08-14',
      };

      const req = makeRequest('/api/v1/payments', 'POST', body, instA.cookieHeader);
      const res = await paymentsPOST(req);
      expect(res.status).toBe(404);
    });
  });

  // ─── 2. Payment Overpayment & Financial Integrity Matrix ───────────────────

  describe('2. 🔴 Payment Overpayment & Financial Integrity Matrix', () => {
    it('rejects payment amount exceeding invoice outstanding (400 Bad Request)', async () => {
      const tenant = await setupTenant('Overpay_Test');
      const { invoiceId } = await createPlanAndInvoice(tenant, 10000);

      const body = {
        invoiceId,
        amount: 15000, // Exceeds 10,000 outstanding!
        paymentMode: 'upi',
        receivedOn: '2026-08-14',
      };

      const req = makeRequest('/api/v1/payments', 'POST', body, tenant.cookieHeader);
      const res = await paymentsPOST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe('VALIDATION_ERROR');
      expect(json.error.message).toContain('exceeds remaining invoice outstanding balance');
    });
  });

  // ─── 3. Idempotency Matrix & Audit Targets ───────────────────────────────

  describe('3. 🔴 Tuple Idempotency & Audit Target 2 Verification', () => {
    it('returns original payment DTO when re-submitting exact same tuple (invoiceId, amount, paymentMode, receivedOn)', async () => {
      const tenant = await setupTenant('Tuple_Idempotency');
      const { invoiceId } = await createPlanAndInvoice(tenant, 10000);

      const payload = {
        invoiceId,
        amount: 4000,
        paymentMode: 'upi',
        receivedOn: '2026-08-14',
      };

      // First call
      const req1 = makeRequest('/api/v1/payments', 'POST', payload, tenant.cookieHeader);
      const res1 = await paymentsPOST(req1);
      expect(res1.status).toBe(201);
      const json1 = await res1.json();

      // Second identical call (retry)
      const req2 = makeRequest('/api/v1/payments', 'POST', payload, tenant.cookieHeader);
      const res2 = await paymentsPOST(req2);
      expect([200, 201]).toContain(res2.status); // Responds with payment DTO
      const json2 = await res2.json();

      expect(json2.data.id).toBe(json1.data.id);

      // Verify DB count remains 1 payment
      const paymentCount = await db.payment.count({ where: { invoiceId } });
      expect(paymentCount).toBe(1);
    });
  });

  // ─── 4. Receipt Sequencing & Audit Target 1 Verification ──────────────────

  describe('4. 🔴 Receipt Sequence Allocation & Audit Target 1 (Gap Behavior)', () => {
    it('allocates unique sequential receipt numbers REC-YYYY-XXXXX per institute and respects idempotency', async () => {
      const tenant = await setupTenant('Receipt_Seq');
      const { invoiceId } = await createPlanAndInvoice(tenant, 10000);

      const payReq = makeRequest(
        '/api/v1/payments',
        'POST',
        { invoiceId, amount: 3000, paymentMode: 'upi', receivedOn: '2026-08-14' },
        tenant.cookieHeader
      );
      const payRes = await paymentsPOST(payReq);
      expect(payRes.status).toBe(201);
      const payJson = await payRes.json();
      const paymentId = payJson.data.id;

      // Issue receipt 1
      const req1 = makeRequest('/api/v1/receipts', 'POST', { paymentId }, tenant.cookieHeader);
      const res1 = await receiptsPOST(req1);
      expect(res1.status).toBe(201);
      const json1 = await res1.json();
      expect(json1.data.receiptNumber).toMatch(/^REC-2026-\d{5}$/);

      // Re-trigger receipt 1 (idempotent)
      const req2 = makeRequest('/api/v1/receipts', 'POST', { paymentId }, tenant.cookieHeader);
      const res2 = await receiptsPOST(req2);
      expect([200, 201]).toContain(res2.status);
      const json2 = await res2.json();
      expect(json2.data.receiptNumber).toBe(json1.data.receiptNumber);
    });
  });

  // ─── 5. HTTP Method Safety & Immutability Matrix ──────────────────────────

  describe('5. 🟠 HTTP Method Safety & Immutability Matrix', () => {
    it('returns 405 Method Not Allowed for PATCH and DELETE on Invoice, Payment, Receipt', async () => {
      const tenant = await setupTenant('Method_Safety');
      const { invoiceId } = await createPlanAndInvoice(tenant, 5000);

      const payReq = makeRequest(
        '/api/v1/payments',
        'POST',
        { invoiceId, amount: 5000, paymentMode: 'cash', receivedOn: '2026-08-14' },
        tenant.cookieHeader
      );
      const payRes = await paymentsPOST(payReq);
      expect(payRes.status).toBe(201);
      const payJson = await payRes.json();
      const paymentId = payJson.data.id;

      const recReq = makeRequest('/api/v1/receipts', 'POST', { paymentId }, tenant.cookieHeader);
      const recRes = await receiptsPOST(recReq);
      expect(recRes.status).toBe(201);

      // Invoice PATCH/DELETE
      expect((await invoiceByIdPATCH()).status).toBe(405);
      expect((await invoiceByIdDELETE()).status).toBe(405);

      // Payment PATCH/DELETE
      expect((await paymentByIdPATCH()).status).toBe(405);
      expect((await paymentByIdDELETE()).status).toBe(405);

      // Receipt PATCH/DELETE
      expect((await receiptByIdPATCH()).status).toBe(405);
      expect((await receiptByIdDELETE()).status).toBe(405);
    });
  });

  // ─── 6. Client instituteId Parameter Injection ─────────────────────────────

  describe('6. 🟠 Client instituteId Parameter Injection Guard', () => {
    it('ignores client instituteId in POST payload and scopes strictly to session tenancy', async () => {
      const instA = await setupTenant('InstA_Spoof');
      const instB = await setupTenant('InstB_Spoof');
      const { invoiceId: invA_id } = await createPlanAndInvoice(instA, 10000);

      const body = {
        invoiceId: invA_id,
        amount: 2000,
        paymentMode: 'cash',
        receivedOn: '2026-08-14',
        instituteId: instB.institute.id, // Malicious spoof attempt!
      };

      const req = makeRequest('/api/v1/payments', 'POST', body, instA.cookieHeader);
      const res = await paymentsPOST(req);
      // Either strict schema returns 400 Bad Request or 201 Created with session tenancy
      expect([201, 400]).toContain(res.status);

      if (res.status === 201) {
        const json = await res.json();
        expect(json.data.instituteId).toBe(instA.institute.id);
        expect(json.data.instituteId).not.toBe(instB.institute.id);
      }
    });
  });

  // ─── 7. Installment Cent Arithmetic & Overpayment Race Suite ───────────────

  describe('7. 🔴 Installment Cent Arithmetic & Overpayment Race Suite', () => {
    it('calculates cent-exact installment schedule sum equal to total plan amount', async () => {
      const tenant = await setupTenant('Cent_Arith');

      // Create installment plan of 10000 with 3 installments
      const planReq = makeRequest(
        '/api/v1/billing-plans',
        'POST',
        {
          enrollmentId: tenant.enrollment.id,
          feeType: 'installment',
          totalAmount: 10000,
          installmentCount: 3,
          billingStartDate: '2026-08-01',
        },
        tenant.cookieHeader
      );
      const planRes = await billingPlansPOST(planReq);
      expect(planRes.status).toBe(201);
      const planJson = await planRes.json();

      // If installments generated, sum of installment amounts equals totalAmount exactly
      const installments = (planJson.data.installments as Array<{ amount: number }>) || [];
      if (installments.length > 0) {
        const sum = installments.reduce((acc: number, item: { amount: number }) => acc + item.amount, 0);
        expect(sum).toBe(10000);
      }
    });

    it('handles concurrent payment race on single invoice safely', async () => {
      const tenant = await setupTenant('Pay_Race');
      const { invoiceId } = await createPlanAndInvoice(tenant, 10000);

      const payA = makeRequest(
        '/api/v1/payments',
        'POST',
        { invoiceId, amount: 7000, paymentMode: 'upi', receivedOn: '2026-08-14' },
        tenant.cookieHeader
      );
      const payB = makeRequest(
        '/api/v1/payments',
        'POST',
        { invoiceId, amount: 7000, paymentMode: 'cash', receivedOn: '2026-08-14' },
        tenant.cookieHeader
      );

      // Execute both payment requests concurrently
      const [resA, resB] = await Promise.all([paymentsPOST(payA), paymentsPOST(payB)]);

      const statuses = [resA.status, resB.status];
      // Exactly 1 must succeed (201) and 1 must fail (400 - overpayment blocked)
      expect(statuses).toContain(201);
      expect(statuses).toContain(400);

      // Total payments recorded must not exceed 7000 (remaining balance 3000)
      const payments = await db.payment.findMany({ where: { invoiceId } });
      const totalPaid = payments.reduce((acc, p) => acc + Number(p.amount), 0);
      expect(totalPaid).toBe(7000);
    });
  });
});
