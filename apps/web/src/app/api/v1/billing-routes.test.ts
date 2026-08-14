import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { validateTestEnvironment, cleanTestDatabase, closeTestPool, db } from '@coaching-os/database';
import { auth } from '@coaching-os/auth';

// Route Handlers
import { GET as billingPlansGET, POST as billingPlansPOST } from './billing-plans/route';
import { GET as billingPlanByIdGET, PATCH as billingPlanByIdPATCH } from './billing-plans/[id]/route';
import { GET as invoicesGET, POST as invoicesPOST } from './invoices/route';
import { GET as invoiceByIdGET, PATCH as invoiceByIdPATCH, DELETE as invoiceByIdDELETE } from './invoices/[id]/route';
import { GET as paymentsGET, POST as paymentsPOST } from './payments/route';
import { GET as paymentByIdGET, PATCH as paymentByIdPATCH, DELETE as paymentByIdDELETE } from './payments/[id]/route';
import { POST as receiptsPOST } from './receipts/route';
import { GET as receiptByIdGET, PATCH as receiptByIdPATCH, DELETE as receiptByIdDELETE } from './receipts/[id]/route';

describe('Phase 3.5.1 — Protected Billing APIs Integration & Security Suite', () => {
  beforeAll(() => {
    validateTestEnvironment();
  });

  beforeEach(async () => {
    await cleanTestDatabase();
  });

  afterAll(async () => {
    await closeTestPool();
  });

  let testIpCounter = 200;
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

    const student = await db.student.create({
      data: {
        instituteId: institute.id,
        admissionNumber: `ADM-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        firstName: `${prefix}Student`,
        lastName: 'Test',
        status: 'active',
        admissionStatus: 'admitted',
      },
    });

    const enrollment = await db.enrollment.create({
      data: {
        instituteId: institute.id,
        studentId: student.id,
        batchId: batch.id,
        status: 'active',
        enrolledAt: new Date('2026-08-01'),
      },
    });

    return { user, cookieHeader, institute, subject, batch, student, enrollment };
  }

  // ─── 1. Authentication Tests (401) ────────────────────────────────────────

  it('rejects unauthenticated requests with 401', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/billing-plans', {
      method: 'GET',
      headers: { 'x-forwarded-for': getUniqueIp() },
    });

    const res = await billingPlansGET(req);
    expect(res.status).toBe(401);

    const body = await res.json();
    expect(body.error.code).toBe('UNAUTHENTICATED');
  });

  // ─── 2. BillingPlan API Suite ─────────────────────────────────────────────

  it('creates, lists, retrieves, and updates a BillingPlan via HTTP API', async () => {
    const tenant = await setupTenant('TenantA');

    // 1. Create BillingPlan
    const createReq = new NextRequest('http://localhost:3000/api/v1/billing-plans', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: tenant.cookieHeader,
        'x-forwarded-for': getUniqueIp(),
      },
      body: JSON.stringify({
        enrollmentId: tenant.enrollment.id,
        feeType: 'one_time',
        totalAmount: 15000,
        billingStartDate: '2026-08-01',
      }),
    });

    const createRes = await billingPlansPOST(createReq);
    expect(createRes.status).toBe(201);
    const createBody = await createRes.json();
    expect(createBody.success).toBe(true);
    expect(createBody.data.amount).toBe(15000);
    const planId = createBody.data.id;

    // 2. List BillingPlans
    const listReq = new NextRequest('http://localhost:3000/api/v1/billing-plans', {
      method: 'GET',
      headers: {
        cookie: tenant.cookieHeader,
        'x-forwarded-for': getUniqueIp(),
      },
    });

    const listRes = await billingPlansGET(listReq);
    expect(listRes.status).toBe(200);
    const listBody = await listRes.json();
    expect(listBody.success).toBe(true);
    expect(listBody.data.length).toBe(1);
    expect(listBody.data[0].id).toBe(planId);

    // 3. Get BillingPlan by ID
    const getReq = new NextRequest(`http://localhost:3000/api/v1/billing-plans/${planId}`, {
      method: 'GET',
      headers: {
        cookie: tenant.cookieHeader,
        'x-forwarded-for': getUniqueIp(),
      },
    });

    const getRes = await billingPlanByIdGET(getReq, { params: Promise.resolve({ id: planId }) });
    expect(getRes.status).toBe(200);
    const getBody = await getRes.json();
    expect(getBody.data.id).toBe(planId);

    // 4. Update BillingPlan
    const updateReq = new NextRequest(`http://localhost:3000/api/v1/billing-plans/${planId}`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        cookie: tenant.cookieHeader,
        'x-forwarded-for': getUniqueIp(),
      },
      body: JSON.stringify({
        discountType: 'fixed',
        discountValue: 1000,
      }),
    });

    const updateRes = await billingPlanByIdPATCH(updateReq, { params: Promise.resolve({ id: planId }) });
    expect(updateRes.status).toBe(200);
    const updateBody = await updateRes.json();
    expect(updateBody.data.discountType).toBe('fixed');
    expect(updateBody.data.discountValue).toBe(1000);
  });

  it('rejects duplicate BillingPlan creation for the same enrollment with 409', async () => {
    const tenant = await setupTenant('TenantDup');

    const body = {
      enrollmentId: tenant.enrollment.id,
      feeType: 'one_time',
      totalAmount: 10000,
      billingStartDate: '2026-08-01',
    };

    const req1 = new NextRequest('http://localhost:3000/api/v1/billing-plans', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: tenant.cookieHeader,
        'x-forwarded-for': getUniqueIp(),
      },
      body: JSON.stringify(body),
    });
    const res1 = await billingPlansPOST(req1);
    expect(res1.status).toBe(201);

    const req2 = new NextRequest('http://localhost:3000/api/v1/billing-plans', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: tenant.cookieHeader,
        'x-forwarded-for': getUniqueIp(),
      },
      body: JSON.stringify(body),
    });
    const res2 = await billingPlansPOST(req2);
    expect(res2.status).toBe(409);
  });

  // ─── 3. Invoice API Suite ──────────────────────────────────────────────────

  it('generates, lists, and retrieves Invoices via HTTP API with idempotency', async () => {
    const tenant = await setupTenant('TenantInv');

    // Create Plan
    const planRes = await billingPlansPOST(
      new NextRequest('http://localhost:3000/api/v1/billing-plans', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: tenant.cookieHeader,
          'x-forwarded-for': getUniqueIp(),
        },
        body: JSON.stringify({
          enrollmentId: tenant.enrollment.id,
          feeType: 'one_time',
          totalAmount: 20000,
          billingStartDate: '2026-08-01',
        }),
      })
    );
    const planBody = await planRes.json();
    const planId = planBody.data.id;

    // 1. Generate Invoice
    const genReq1 = new NextRequest('http://localhost:3000/api/v1/invoices', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: tenant.cookieHeader,
        'x-forwarded-for': getUniqueIp(),
      },
      body: JSON.stringify({
        billingPlanId: planId,
      }),
    });

    const genRes1 = await invoicesPOST(genReq1);
    expect(genRes1.status).toBe(201);
    const genBody1 = await genRes1.json();
    expect(genBody1.data.amount).toBe(20000);
    expect(genBody1.data.status).toBe('pending');
    const invoiceId = genBody1.data.id;

    // 2. Idempotent Retry — returns exact same invoice
    const genReq2 = new NextRequest('http://localhost:3000/api/v1/invoices', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: tenant.cookieHeader,
        'x-forwarded-for': getUniqueIp(),
      },
      body: JSON.stringify({
        billingPlanId: planId,
      }),
    });

    const genRes2 = await invoicesPOST(genReq2);
    expect(genRes2.status).toBe(201);
    const genBody2 = await genRes2.json();
    expect(genBody2.data.id).toBe(invoiceId);

    // 3. List Invoices
    const listRes = await invoicesGET(
      new NextRequest('http://localhost:3000/api/v1/invoices', {
        method: 'GET',
        headers: { cookie: tenant.cookieHeader, 'x-forwarded-for': getUniqueIp() },
      })
    );
    expect(listRes.status).toBe(200);
    const listBody = await listRes.json();
    expect(listBody.data.length).toBe(1);

    // 4. Get Invoice Detail
    const getRes = await invoiceByIdGET(
      new NextRequest(`http://localhost:3000/api/v1/invoices/${invoiceId}`, {
        method: 'GET',
        headers: { cookie: tenant.cookieHeader, 'x-forwarded-for': getUniqueIp() },
      }),
      { params: Promise.resolve({ id: invoiceId }) }
    );
    expect(getRes.status).toBe(200);
    const getBody = await getRes.json();
    expect(getBody.data.amount).toBe(20000);
  });

  // ─── 4. Payment API Suite ──────────────────────────────────────────────────

  it('records payment, updates invoice status, rejects overpayment, and supports idempotency', async () => {
    const tenant = await setupTenant('TenantPay');

    // Create Plan & Invoice
    const planRes = await billingPlansPOST(
      new NextRequest('http://localhost:3000/api/v1/billing-plans', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: tenant.cookieHeader,
          'x-forwarded-for': getUniqueIp(),
        },
        body: JSON.stringify({
          enrollmentId: tenant.enrollment.id,
          feeType: 'one_time',
          totalAmount: 10000,
          billingStartDate: '2026-08-01',
        }),
      })
    );
    const planId = (await planRes.json()).data.id;

    const invRes = await invoicesPOST(
      new NextRequest('http://localhost:3000/api/v1/invoices', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: tenant.cookieHeader,
          'x-forwarded-for': getUniqueIp(),
        },
        body: JSON.stringify({ billingPlanId: planId }),
      })
    );
    const invoiceId = (await invRes.json()).data.id;

    // 1. Overpayment Rejection (400)
    const overpayRes = await paymentsPOST(
      new NextRequest('http://localhost:3000/api/v1/payments', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: tenant.cookieHeader,
          'x-forwarded-for': getUniqueIp(),
        },
        body: JSON.stringify({
          invoiceId,
          amount: 15000,
          paymentMode: 'cash',
          receivedOn: '2026-08-10',
        }),
      })
    );
    expect(overpayRes.status).toBe(400);

    // 2. Partial Payment (5000)
    const pay1Res = await paymentsPOST(
      new NextRequest('http://localhost:3000/api/v1/payments', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: tenant.cookieHeader,
          'x-forwarded-for': getUniqueIp(),
        },
        body: JSON.stringify({
          invoiceId,
          amount: 5000,
          paymentMode: 'upi',
          receivedOn: '2026-08-10',
        }),
      })
    );
    expect(pay1Res.status).toBe(201);
    const payment1 = (await pay1Res.json()).data;
    expect(payment1.amount).toBe(5000);

    // Check Invoice Status -> partial
    const invDetail1 = await invoiceByIdGET(
      new NextRequest(`http://localhost:3000/api/v1/invoices/${invoiceId}`, {
        method: 'GET',
        headers: { cookie: tenant.cookieHeader, 'x-forwarded-for': getUniqueIp() },
      }),
      { params: Promise.resolve({ id: invoiceId }) }
    );
    const inv1Body = await invDetail1.json();
    expect(inv1Body.data.status).toBe('partial');

    // 3. Idempotent Retry of Payment 1 -> returns same payment
    const retryRes = await paymentsPOST(
      new NextRequest('http://localhost:3000/api/v1/payments', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: tenant.cookieHeader,
          'x-forwarded-for': getUniqueIp(),
        },
        body: JSON.stringify({
          invoiceId,
          amount: 5000,
          paymentMode: 'upi',
          receivedOn: '2026-08-10',
        }),
      })
    );
    expect(retryRes.status).toBe(201);
    expect((await retryRes.json()).data.id).toBe(payment1.id);
    const listPayRes = await paymentsGET(
      new NextRequest('http://localhost:3000/api/v1/payments', {
        method: 'GET',
        headers: { cookie: tenant.cookieHeader, 'x-forwarded-for': getUniqueIp() },
      })
    );
    expect(listPayRes.status).toBe(200);
    const listPayBody = await listPayRes.json();
    expect(listPayBody.data.length).toBe(1);

    // 5. Get Payment by ID
    const getPayRes = await paymentByIdGET(
      new NextRequest(`http://localhost:3000/api/v1/payments/${payment1.id}`, {
        method: 'GET',
        headers: { cookie: tenant.cookieHeader, 'x-forwarded-for': getUniqueIp() },
      }),
      { params: Promise.resolve({ id: payment1.id }) }
    );
    expect(getPayRes.status).toBe(200);
    const getPayBody = await getPayRes.json();
    expect(getPayBody.data.id).toBe(payment1.id);
  });

  // ─── 5. Receipt API Suite ──────────────────────────────────────────────────

  it('generates and retrieves Receipts with downloadUrl === null', async () => {
    const tenant = await setupTenant('TenantRec');

    const planId = (
      await (
        await billingPlansPOST(
          new NextRequest('http://localhost:3000/api/v1/billing-plans', {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              cookie: tenant.cookieHeader,
              'x-forwarded-for': getUniqueIp(),
            },
            body: JSON.stringify({
              enrollmentId: tenant.enrollment.id,
              feeType: 'one_time',
              totalAmount: 8000,
              billingStartDate: '2026-08-01',
            }),
          })
        )
      ).json()
    ).data.id;

    const invoiceId = (
      await (
        await invoicesPOST(
          new NextRequest('http://localhost:3000/api/v1/invoices', {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              cookie: tenant.cookieHeader,
              'x-forwarded-for': getUniqueIp(),
            },
            body: JSON.stringify({ billingPlanId: planId }),
          })
        )
      ).json()
    ).data.id;

    const paymentId = (
      await (
        await paymentsPOST(
          new NextRequest('http://localhost:3000/api/v1/payments', {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              cookie: tenant.cookieHeader,
              'x-forwarded-for': getUniqueIp(),
            },
            body: JSON.stringify({
              invoiceId,
              amount: 8000,
              paymentMode: 'bank_transfer',
              receivedOn: '2026-08-12',
            }),
          })
        )
      ).json()
    ).data.id;

    // 1. Generate Receipt
    const genRecRes = await receiptsPOST(
      new NextRequest('http://localhost:3000/api/v1/receipts', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: tenant.cookieHeader,
          'x-forwarded-for': getUniqueIp(),
        },
        body: JSON.stringify({ paymentId }),
      })
    );
    expect(genRecRes.status).toBe(201);
    const receiptData = (await genRecRes.json()).data;
    expect(receiptData.receiptNumber).toMatch(/^REC-2026-/);
    expect(receiptData.downloadUrl).toBeNull();
    const receiptId = receiptData.id;

    // 2. Get Receipt Detail
    const getRecRes = await receiptByIdGET(
      new NextRequest(`http://localhost:3000/api/v1/receipts/${receiptId}`, {
        method: 'GET',
        headers: { cookie: tenant.cookieHeader, 'x-forwarded-for': getUniqueIp() },
      }),
      { params: Promise.resolve({ id: receiptId }) }
    );
    expect(getRecRes.status).toBe(200);
    const getRecBody = await getRecRes.json();
    expect(getRecBody.data.id).toBe(receiptId);
    expect(getRecBody.data.downloadUrl).toBeNull();
  });

  // ─── 6. Multi-Tenant Cross-Tenant Masking Suite (404) ──────────────────────

  it('masks foreign tenant resources as 404 Not Found across all Billing APIs', async () => {
    const tenantA = await setupTenant('TenantSecA');
    const tenantB = await setupTenant('TenantSecB');

    // Create Plan & Invoice in Tenant B
    const planBId = (
      await (
        await billingPlansPOST(
          new NextRequest('http://localhost:3000/api/v1/billing-plans', {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              cookie: tenantB.cookieHeader,
              'x-forwarded-for': getUniqueIp(),
            },
            body: JSON.stringify({
              enrollmentId: tenantB.enrollment.id,
              feeType: 'one_time',
              totalAmount: 12000,
              billingStartDate: '2026-08-01',
            }),
          })
        )
      ).json()
    ).data.id;

    const invBId = (
      await (
        await invoicesPOST(
          new NextRequest('http://localhost:3000/api/v1/invoices', {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              cookie: tenantB.cookieHeader,
              'x-forwarded-for': getUniqueIp(),
            },
            body: JSON.stringify({ billingPlanId: planBId }),
          })
        )
      ).json()
    ).data.id;

    // User A attempts to access Tenant B resources -> 404
    const getPlanRes = await billingPlanByIdGET(
      new NextRequest(`http://localhost:3000/api/v1/billing-plans/${planBId}`, {
        method: 'GET',
        headers: { cookie: tenantA.cookieHeader, 'x-forwarded-for': getUniqueIp() },
      }),
      { params: Promise.resolve({ id: planBId }) }
    );
    expect(getPlanRes.status).toBe(404);

    const getInvRes = await invoiceByIdGET(
      new NextRequest(`http://localhost:3000/api/v1/invoices/${invBId}`, {
        method: 'GET',
        headers: { cookie: tenantA.cookieHeader, 'x-forwarded-for': getUniqueIp() },
      }),
      { params: Promise.resolve({ id: invBId }) }
    );
    expect(getInvRes.status).toBe(404);

    // User A attempts to record payment against Tenant B invoice -> 404
    const payRes = await paymentsPOST(
      new NextRequest('http://localhost:3000/api/v1/payments', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: tenantA.cookieHeader,
          'x-forwarded-for': getUniqueIp(),
        },
        body: JSON.stringify({
          invoiceId: invBId,
          amount: 5000,
          paymentMode: 'cash',
          receivedOn: '2026-08-10',
        }),
      })
    );
    expect(payRes.status).toBe(404);
  });

  // ─── 7. Financial Immutability & Method Safety Suite (405) ─────────────────

  it('strictly returns 405 Method Not Allowed for prohibited financial mutations', async () => {

    expect((await invoiceByIdPATCH()).status).toBe(405);
    expect((await invoiceByIdDELETE()).status).toBe(405);

    expect((await paymentByIdPATCH()).status).toBe(405);
    expect((await paymentByIdDELETE()).status).toBe(405);

    expect((await receiptByIdPATCH()).status).toBe(405);
    expect((await receiptByIdDELETE()).status).toBe(405);
  });
});
