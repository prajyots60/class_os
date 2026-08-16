import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@coaching-os/database';
import { signSessionToken } from '@coaching-os/auth';
import { GET as billingGET, POST as billingPOST } from './students/[id]/billing/route';
import { GET as receiptDetailGET, POST as receiptDetailPOST } from './students/[id]/receipts/[receiptId]/route';

describe('Phase 5.8 — Parent Billing REST Routes Security & Isolation Matrix', () => {
  let pidA: { id: string };
  let pidB: { id: string };
  let userA: { id: string };
  let userB: { id: string };
  let institute: { id: string };
  let batch: { id: string };
  let studentA: { id: string; instituteId: string };
  let studentB: { id: string; instituteId: string };
  let enrollmentA: { id: string };
  let billingPlanA: { id: string };
  let invoiceA: { id: string };
  let paymentA: { id: string };
  let receiptA: { id: string };
  let validSessionTokenA: string;
  let validSessionTokenB: string;

  beforeEach(async () => {
    // 1. Create Institute & Batch
    const rawId = Date.now().toString();
    institute = await db.institute.create({
      data: {
        name: `Test Institute ${rawId}`,
        slug: `inst-bill-${rawId}`,
        phone: `+9199${Math.floor(10000000 + Math.random() * 90000000)}`,
        email: `inst-bill-${rawId}@test.com`,
      },
    });

    const subject = await db.subject.create({
      data: {
        instituteId: institute.id,
        name: 'Mathematics',
        code: `SUB-BILL-${Date.now()}`,
      },
    });

    batch = await db.batch.create({
      data: {
        instituteId: institute.id,
        subjectId: subject.id,
        name: 'JEE Math Batch 2026',
        code: `BATCH-BILL-${Date.now()}`,
      },
    });

    // 2. Create Parent Identities & Users
    const phoneA = `+9198${Math.floor(10000000 + Math.random() * 90000000)}`;
    pidA = await db.parentIdentity.create({
      data: {
        phone: phoneA,
        status: 'active',
      },
    });
    userA = await db.user.create({
      data: {
        parentIdentityId: pidA.id,
        email: `parent-bill-a-${Date.now()}@example.com`,
        name: 'Parent User A',
        phone: phoneA,
        status: 'active',
      },
    });

    const phoneB = `+9197${Math.floor(10000000 + Math.random() * 90000000)}`;
    pidB = await db.parentIdentity.create({
      data: {
        phone: phoneB,
        status: 'active',
      },
    });
    userB = await db.user.create({
      data: {
        parentIdentityId: pidB.id,
        email: `parent-bill-b-${Date.now()}@example.com`,
        name: 'Parent User B',
        phone: phoneB,
        status: 'active',
      },
    });

    // 3. Create Students
    studentA = await db.student.create({
      data: {
        instituteId: institute.id,
        firstName: 'Rohan',
        lastName: 'Sharma',
        admissionNumber: `ADM-A-${Date.now()}`,
        status: 'active',
      },
    });

    studentB = await db.student.create({
      data: {
        instituteId: institute.id,
        firstName: 'Meera',
        lastName: 'Patel',
        admissionNumber: `ADM-B-${Date.now()}`,
        status: 'active',
      },
    });

    // 4. Link Parent A -> Student A
    const childProfileA = await db.childProfile.create({
      data: {
        parentIdentityId: pidA.id,
        name: 'Rohan Sharma',
      },
    });

    const instParentA = await db.instituteParent.create({
      data: {
        instituteId: institute.id,
        parentIdentityId: pidA.id,
        status: 'active',
      },
    });

    await db.instituteParentStudent.create({
      data: {
        instituteId: institute.id,
        instituteParentId: instParentA.id,
        studentId: studentA.id,
        relationshipType: 'father',
        status: 'active',
      },
    });

    await db.studentLink.create({
      data: {
        childProfileId: childProfileA.id,
        instituteId: institute.id,
        studentId: studentA.id,
      },
    });

    // 5. Link Parent B -> Student B
    const childProfileB = await db.childProfile.create({
      data: {
        parentIdentityId: pidB.id,
        name: 'Meera Patel',
      },
    });

    const instParentB = await db.instituteParent.create({
      data: {
        instituteId: institute.id,
        parentIdentityId: pidB.id,
        status: 'active',
      },
    });

    await db.instituteParentStudent.create({
      data: {
        instituteId: institute.id,
        instituteParentId: instParentB.id,
        studentId: studentB.id,
        relationshipType: 'mother',
        status: 'active',
      },
    });

    await db.studentLink.create({
      data: {
        childProfileId: childProfileB.id,
        instituteId: institute.id,
        studentId: studentB.id,
      },
    });

    // 6. Sessions
    const tokenStrA = `sess-token-bill-a-${Date.now()}`;
    await db.session.create({
      data: {
        userId: userA.id,
        token: tokenStrA,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    validSessionTokenA = signSessionToken(tokenStrA);

    const tokenStrB = `sess-token-bill-b-${Date.now()}`;
    await db.session.create({
      data: {
        userId: userB.id,
        token: tokenStrB,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    validSessionTokenB = signSessionToken(tokenStrB);

    // 7. Create Enrollment, BillingPlan, Invoice, Payment, Receipt for Student A
    enrollmentA = await db.enrollment.create({
      data: {
        instituteId: institute.id,
        studentId: studentA.id,
        batchId: batch.id,
        status: 'active',
      },
    });

    billingPlanA = await db.billingPlan.create({
      data: {
        enrollmentId: enrollmentA.id,
        type: 'one_time',
        amount: 15000.0,
        billingStartDate: new Date('2026-08-01'),
      },
    });

    invoiceA = await db.invoice.create({
      data: {
        billingPlanId: billingPlanA.id,
        amount: 15000.0,
        dueDate: new Date('2026-08-31'),
        status: 'partial',
      },
    });

    paymentA = await db.payment.create({
      data: {
        invoiceId: invoiceA.id,
        amount: 5000.0,
        paymentMode: 'upi',
        receivedOn: new Date('2026-08-10'),
        remarks: 'First installment payment',
      },
    });

    receiptA = await db.receipt.create({
      data: {
        instituteId: institute.id,
        paymentId: paymentA.id,
        receiptNumber: `REC-2026-${Math.floor(10000 + Math.random() * 90000)}`,
      },
    });
  });

  describe('GET /api/v1/parent/students/[id]/billing', () => {
    it('PARENT-BILLING-API-001: returns 401 when request is unauthenticated', async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/v1/parent/students/${studentA.id}/billing`,
      );
      const res = await billingGET(req, { params: Promise.resolve({ id: studentA.id }) });
      expect(res.status).toBe(401);
    });

    it('PARENT-BILLING-API-002: returns 401 when session is expired', async () => {
      const expTokenStr = `exp-bill-token-${Date.now()}`;
      await db.session.create({
        data: {
          userId: userA.id,
          token: expTokenStr,
          expiresAt: new Date(Date.now() - 1000),
        },
      });
      const expiredToken = signSessionToken(expTokenStr);

      const req = new NextRequest(
        `http://localhost:3000/api/v1/parent/students/${studentA.id}/billing`,
        { headers: { Cookie: `better-auth.session_token=${expiredToken}` } },
      );
      const res = await billingGET(req, { params: Promise.resolve({ id: studentA.id }) });
      expect(res.status).toBe(401);
    });

    it('PARENT-BILLING-API-003: returns 401 when parent identity is suspended', async () => {
      await db.parentIdentity.update({
        where: { id: pidA.id },
        data: { status: 'suspended' },
      });

      const req = new NextRequest(
        `http://localhost:3000/api/v1/parent/students/${studentA.id}/billing`,
        { headers: { Cookie: `better-auth.session_token=${validSessionTokenA}` } },
      );
      const res = await billingGET(req, { params: Promise.resolve({ id: studentA.id }) });
      expect(res.status).toBe(401);
    });

    it('PARENT-BILLING-API-004: returns 401 when parent identity is deactivated', async () => {
      await db.parentIdentity.update({
        where: { id: pidA.id },
        data: { status: 'deactivated' },
      });

      const req = new NextRequest(
        `http://localhost:3000/api/v1/parent/students/${studentA.id}/billing`,
        { headers: { Cookie: `better-auth.session_token=${validSessionTokenA}` } },
      );
      const res = await billingGET(req, { params: Promise.resolve({ id: studentA.id }) });
      expect(res.status).toBe(401);
    });

    it('PARENT-BILLING-API-005: returns 404 Universal Masking when parent is unauthorized for target student', async () => {
      // Parent B attempting to access Student A's billing
      const req = new NextRequest(
        `http://localhost:3000/api/v1/parent/students/${studentA.id}/billing`,
        { headers: { Cookie: `better-auth.session_token=${validSessionTokenB}` } },
      );
      const res = await billingGET(req, { params: Promise.resolve({ id: studentA.id }) });
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error.code).toBe('NOT_FOUND');
    });

    it('PARENT-BILLING-API-006: returns 404 Universal Masking for non-existent student ID', async () => {
      const nonExistentUuid = '00000000-0000-4000-a000-000000000000';
      const req = new NextRequest(
        `http://localhost:3000/api/v1/parent/students/${nonExistentUuid}/billing`,
        { headers: { Cookie: `better-auth.session_token=${validSessionTokenA}` } },
      );
      const res = await billingGET(req, { params: Promise.resolve({ id: nonExistentUuid }) });
      expect(res.status).toBe(404);
    });

    it('PARENT-BILLING-API-007: client-supplied parentIdentityId in query params is ignored', async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/v1/parent/students/${studentA.id}/billing?parentIdentityId=${pidB.id}`,
        { headers: { Cookie: `better-auth.session_token=${validSessionTokenA}` } },
      );
      const res = await billingGET(req, { params: Promise.resolve({ id: studentA.id }) });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.student.id).toBe(studentA.id);
    });

    it('PARENT-BILLING-API-008: client-supplied instituteId cannot bypass tenant authorization', async () => {
      const otherUuid = '00000000-0000-4000-a000-000000000001';
      const req = new NextRequest(
        `http://localhost:3000/api/v1/parent/students/${studentA.id}/billing?instituteId=${otherUuid}`,
        { headers: { Cookie: `better-auth.session_token=${validSessionTokenA}` } },
      );
      const res = await billingGET(req, { params: Promise.resolve({ id: studentA.id }) });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.student.instituteId).toBe(institute.id);
    });

    it('PARENT-BILLING-API-009: returns 200 with student details, summary, invoices, payments, and receipts for authorized student', async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/v1/parent/students/${studentA.id}/billing`,
        { headers: { Cookie: `better-auth.session_token=${validSessionTokenA}` } },
      );
      const res = await billingGET(req, { params: Promise.resolve({ id: studentA.id }) });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.data.student.fullName).toBe('Rohan Sharma');
      expect(body.data.summary.totalOutstandingAmount).toBe(10000); // 15000 - 5000 = 10000
      expect(body.data.summary.pendingInvoiceCount).toBe(1);
      expect(body.data.invoices.length).toBe(1);
      expect(body.data.invoices[0].amount).toBe(15000);
      expect(body.data.invoices[0].paidAmount).toBe(5000);
      expect(body.data.invoices[0].outstandingAmount).toBe(10000);
      expect(body.data.payments.length).toBe(1);
      expect(body.data.receipts.length).toBe(1);
    });

    it('PARENT-BILLING-API-010: calculates total outstanding balance and last payment server-side', async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/v1/parent/students/${studentA.id}/billing`,
        { headers: { Cookie: `better-auth.session_token=${validSessionTokenA}` } },
      );
      const res = await billingGET(req, { params: Promise.resolve({ id: studentA.id }) });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.data.summary.lastPayment).not.toBeNull();
      expect(body.data.summary.lastPayment.amount).toBe(5000);
      expect(body.data.summary.lastPayment.paymentMode).toBe('upi');
    });

    it('PARENT-BILLING-API-015: handles student with zero invoices gracefully', async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/v1/parent/students/${studentB.id}/billing`,
        { headers: { Cookie: `better-auth.session_token=${validSessionTokenB}` } },
      );
      const res = await billingGET(req, { params: Promise.resolve({ id: studentB.id }) });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.data.summary.totalOutstandingAmount).toBe(0);
      expect(body.data.invoices.length).toBe(0);
      expect(body.data.payments.length).toBe(0);
      expect(body.data.receipts.length).toBe(0);
    });

    it('PARENT-BILLING-API-013: rejects POST method with 405 Method Not Allowed', async () => {
      const res = await billingPOST();
      expect(res.status).toBe(405);
    });
  });

  describe('GET /api/v1/parent/students/[id]/receipts/[receiptId]', () => {
    it('PARENT-BILLING-API-011: Parent B cannot access Parent A student receipt detail (404 Universal Masking)', async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/v1/parent/students/${studentA.id}/receipts/${receiptA.id}`,
        { headers: { Cookie: `better-auth.session_token=${validSessionTokenB}` } },
      );
      const res = await receiptDetailGET(req, {
        params: Promise.resolve({ id: studentA.id, receiptId: receiptA.id }),
      });
      expect(res.status).toBe(404);
    });

    it('PARENT-BILLING-API-012: Receipt detail endpoint returns 200 for authorized parent and receipt owner', async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/v1/parent/students/${studentA.id}/receipts/${receiptA.id}`,
        { headers: { Cookie: `better-auth.session_token=${validSessionTokenA}` } },
      );
      const res = await receiptDetailGET(req, {
        params: Promise.resolve({ id: studentA.id, receiptId: receiptA.id }),
      });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.data.id).toBe(receiptA.id);
      expect(body.data.student.fullName).toBe('Rohan Sharma');
      expect(body.data.payment.amount).toBe(5000);
      expect(body.data.payment.paymentMode).toBe('upi');
    });

    it('PARENT-BILLING-API-014: rejects POST method on receipt detail route with 405 Method Not Allowed', async () => {
      const res = await receiptDetailPOST();
      expect(res.status).toBe(405);
    });

    it('PARENT-BILLING-API-016: staff-only internal fields (collectedBy) are not exposed in parent API payload', async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/v1/parent/students/${studentA.id}/billing`,
        { headers: { Cookie: `better-auth.session_token=${validSessionTokenA}` } },
      );
      const res = await billingGET(req, { params: Promise.resolve({ id: studentA.id }) });
      const body = await res.json();
      expect(body.data.payments[0].collectedBy).toBeUndefined();
    });
  });
});
