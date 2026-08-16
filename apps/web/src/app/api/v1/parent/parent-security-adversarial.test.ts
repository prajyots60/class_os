import { describe, it, expect, beforeEach } from 'vitest';
import crypto from 'node:crypto';
import { NextRequest } from 'next/server';
import { db } from '@coaching-os/database';
import { signSessionToken } from '@coaching-os/auth';

// Route Handlers
import { GET as hubGET } from './hub/route';
import { GET as timelineGET } from './timeline/route';
import { GET as notificationsGET } from './notifications/route';
import { GET as unreadCountGET } from './notifications/unread-count/route';
import { POST as markReadPOST } from './notifications/[id]/read/route';
import { GET as attendanceGET } from './students/[id]/attendance/route';
import { GET as homeworkGET } from './students/[id]/homework/route';
import { GET as assessmentsGET } from './students/[id]/assessments/route';
import { GET as billingGET } from './students/[id]/billing/route';
import { GET as receiptGET } from './students/[id]/receipts/[receiptId]/route';

describe('Phase 5.11 — Parent PWA Security, Privacy & Adversarial E2E Matrix', () => {
  // Test Multi-Tenant Fixtures
  let instituteA: { id: string; name: string };
  let instituteB: { id: string; name: string };

  let pidA: { id: string };
  let pidB: { id: string };

  let userA: { id: string };
  let userB: { id: string };

  let studentA1: { id: string };
  let studentA2: { id: string };
  let studentB1: { id: string };
  let studentB2: { id: string };

  let childProfileA1: { id: string };
  let childProfileA2: { id: string };
  let childProfileB1: { id: string };
  let childProfileB2: { id: string };

  let invoiceA1: { id: string };
  let invoiceB1: { id: string };

  let paymentA1: { id: string };
  let paymentB1: { id: string };

  let receiptA1: { id: string };
  let receiptB1: { id: string };

  let notificationA: { id: string };
  let notificationB: { id: string };

  let sessionTokenA: string;
  let sessionTokenB: string;

  beforeEach(async () => {
    const rawId = Date.now().toString();

    // 1. Create Institute A & B
    instituteA = await db.institute.create({
      data: {
        name: `Inst A ${rawId}`,
        slug: `inst-a-${rawId}-${crypto.randomUUID().slice(0, 4)}`,
        phone: `+9198${Math.floor(10000000 + Math.random() * 90000000)}`,
        email: `insta-${rawId}@test.com`,
      },
    });

    instituteB = await db.institute.create({
      data: {
        name: `Inst B ${rawId}`,
        slug: `inst-b-${rawId}-${crypto.randomUUID().slice(0, 4)}`,
        phone: `+9197${Math.floor(10000000 + Math.random() * 90000000)}`,
        email: `instb-${rawId}@test.com`,
      },
    });

    // 2. Create Parent A & Parent B Identities & Users
    const phoneA = `+9196${Math.floor(10000000 + Math.random() * 90000000)}`;
    pidA = await db.parentIdentity.create({ data: { phone: phoneA, status: 'active' } });
    userA = await db.user.create({
      data: {
        parentIdentityId: pidA.id,
        email: `parentA-${crypto.randomUUID().slice(0, 6)}@test.com`,
        name: 'Parent User A',
        phone: phoneA,
        status: 'active',
      },
    });
    const sessTokenA = `token-A-${crypto.randomUUID()}`;
    await db.session.create({
      data: {
        userId: userA.id,
        token: sessTokenA,
        expiresAt: new Date(Date.now() + 86400000),
      },
    });
    sessionTokenA = signSessionToken(sessTokenA);

    const phoneB = `+9195${Math.floor(10000000 + Math.random() * 90000000)}`;
    pidB = await db.parentIdentity.create({ data: { phone: phoneB, status: 'active' } });
    userB = await db.user.create({
      data: {
        parentIdentityId: pidB.id,
        email: `parentB-${crypto.randomUUID().slice(0, 6)}@test.com`,
        name: 'Parent User B',
        phone: phoneB,
        status: 'active',
      },
    });
    const sessTokenB = `token-B-${crypto.randomUUID()}`;
    await db.session.create({
      data: {
        userId: userB.id,
        token: sessTokenB,
        expiresAt: new Date(Date.now() + 86400000),
      },
    });
    sessionTokenB = signSessionToken(sessTokenB);

    // 3. Create Students:
    // Student A1 -> Inst A (Parent A)
    // Student A2 -> Inst B (Parent A - Cross Institute)
    // Student B1 -> Inst A (Parent B)
    // Student B2 -> Inst B (Parent B - Cross Institute)
    studentA1 = await db.student.create({
      data: {
        instituteId: instituteA.id,
        firstName: 'Student',
        lastName: 'A1',
        admissionNumber: `ADM-A1-${crypto.randomUUID().slice(0, 6)}`,
        status: 'active',
      },
    });

    studentA2 = await db.student.create({
      data: {
        instituteId: instituteB.id,
        firstName: 'Student',
        lastName: 'A2',
        admissionNumber: `ADM-A2-${crypto.randomUUID().slice(0, 6)}`,
        status: 'active',
      },
    });

    studentB1 = await db.student.create({
      data: {
        instituteId: instituteA.id,
        firstName: 'Student',
        lastName: 'B1',
        admissionNumber: `ADM-B1-${crypto.randomUUID().slice(0, 6)}`,
        status: 'active',
      },
    });

    studentB2 = await db.student.create({
      data: {
        instituteId: instituteB.id,
        firstName: 'Student',
        lastName: 'B2',
        admissionNumber: `ADM-B2-${crypto.randomUUID().slice(0, 6)}`,
        status: 'active',
      },
    });

    // 4. Link Parents to Students
    const instParentA1 = await db.instituteParent.create({
      data: { instituteId: instituteA.id, parentIdentityId: pidA.id, status: 'active' },
    });
    await db.instituteParentStudent.create({
      data: { instituteId: instituteA.id, instituteParentId: instParentA1.id, studentId: studentA1.id, relationshipType: 'father', status: 'active' },
    });

    const instParentA2 = await db.instituteParent.create({
      data: { instituteId: instituteB.id, parentIdentityId: pidA.id, status: 'active' },
    });
    await db.instituteParentStudent.create({
      data: { instituteId: instituteB.id, instituteParentId: instParentA2.id, studentId: studentA2.id, relationshipType: 'father', status: 'active' },
    });

    const instParentB1 = await db.instituteParent.create({
      data: { instituteId: instituteA.id, parentIdentityId: pidB.id, status: 'active' },
    });
    await db.instituteParentStudent.create({
      data: { instituteId: instituteA.id, instituteParentId: instParentB1.id, studentId: studentB1.id, relationshipType: 'father', status: 'active' },
    });

    const instParentB2 = await db.instituteParent.create({
      data: { instituteId: instituteB.id, parentIdentityId: pidB.id, status: 'active' },
    });
    await db.instituteParentStudent.create({
      data: { instituteId: instituteB.id, instituteParentId: instParentB2.id, studentId: studentB2.id, relationshipType: 'father', status: 'active' },
    });

    childProfileA1 = await db.childProfile.create({ data: { parentIdentityId: pidA.id, name: 'Child A1' } });
    await db.studentLink.create({ data: { childProfileId: childProfileA1.id, instituteId: instituteA.id, studentId: studentA1.id } });

    childProfileA2 = await db.childProfile.create({ data: { parentIdentityId: pidA.id, name: 'Child A2' } });
    await db.studentLink.create({ data: { childProfileId: childProfileA2.id, instituteId: instituteB.id, studentId: studentA2.id } });

    childProfileB1 = await db.childProfile.create({ data: { parentIdentityId: pidB.id, name: 'Child B1' } });
    await db.studentLink.create({ data: { childProfileId: childProfileB1.id, instituteId: instituteA.id, studentId: studentB1.id } });

    childProfileB2 = await db.childProfile.create({ data: { parentIdentityId: pidB.id, name: 'Child B2' } });
    await db.studentLink.create({ data: { childProfileId: childProfileB2.id, instituteId: instituteB.id, studentId: studentB2.id } });

    // 5. Create Subjects, Batches & Enrollments for A1 and B1
    const subjectA = await db.subject.create({ data: { instituteId: instituteA.id, name: 'Physics', code: `PHY-${rawId}` } });
    const batchA = await db.batch.create({ data: { instituteId: instituteA.id, subjectId: subjectA.id, name: 'Physics Batch 1', code: `BAT-A-${rawId}` } });
    const enrA1 = await db.enrollment.create({ data: { instituteId: instituteA.id, studentId: studentA1.id, batchId: batchA.id, status: 'active' } });
    const enrB1 = await db.enrollment.create({ data: { instituteId: instituteA.id, studentId: studentB1.id, batchId: batchA.id, status: 'active' } });

    // 6. Create Billing, Payments & Receipts
    const planA = await db.billingPlan.create({ data: { enrollmentId: enrA1.id, amount: 20000, type: 'one_time', billingStartDate: new Date() } });
    invoiceA1 = await db.invoice.create({
      data: { billingPlanId: planA.id, amount: 20000, status: 'partial', dueDate: new Date() },
    });
    paymentA1 = await db.payment.create({
      data: { invoiceId: invoiceA1.id, amount: 10000, paymentMode: 'upi', receivedOn: new Date(), remarks: `REF-A1-${rawId}` },
    });
    receiptA1 = await db.receipt.create({
      data: { instituteId: instituteA.id, paymentId: paymentA1.id, receiptNumber: `RCPT-A1-${rawId}` },
    });

    const planB = await db.billingPlan.create({ data: { enrollmentId: enrB1.id, amount: 20000, type: 'one_time', billingStartDate: new Date() } });
    invoiceB1 = await db.invoice.create({
      data: { billingPlanId: planB.id, amount: 20000, status: 'paid', dueDate: new Date() },
    });
    paymentB1 = await db.payment.create({
      data: { invoiceId: invoiceB1.id, amount: 20000, paymentMode: 'upi', receivedOn: new Date(), remarks: `REF-B1-${rawId}` },
    });
    receiptB1 = await db.receipt.create({
      data: { instituteId: instituteA.id, paymentId: paymentB1.id, receiptNumber: `RCPT-B1-${rawId}` },
    });

    // 7. Create Notifications & Timeline Activities
    notificationA = await db.notification.create({
      data: {
        instituteId: instituteA.id,
        recipientUserId: userA.id,
        recipientType: 'parent',
        priority: 'high',
        category: 'attendance',
        title: 'Attendance Alert A1',
        message: 'A1 was present today.',
      },
    });

    notificationB = await db.notification.create({
      data: {
        instituteId: instituteA.id,
        recipientUserId: userB.id,
        recipientType: 'parent',
        priority: 'high',
        category: 'attendance',
        title: 'Attendance Alert B1',
        message: 'B1 was absent today.',
      },
    });

    await db.activity.create({
      data: {
        instituteId: instituteA.id,
        studentId: studentA1.id,
        eventType: 'attendance.recorded',
        title: 'A1 Attendance',
        description: 'Student A1 marked Present',
        actorName: 'Faculty',
        occurredAt: new Date(),
      },
    });

    await db.activity.create({
      data: {
        instituteId: instituteA.id,
        studentId: studentB1.id,
        eventType: 'attendance.recorded',
        title: 'B1 Attendance',
        description: 'Student B1 marked Absent',
        actorName: 'Faculty',
        occurredAt: new Date(),
      },
    });
  });

  // ============================================================================
  // SECTION 1: AUTHENTICATION & SESSION SECURITY (PARENT-SEC-001 - 010)
  // ============================================================================
  describe('Authentication & Session Security (PARENT-SEC-001 - 010)', () => {
    it('PARENT-SEC-001: unauthenticated request without session cookie returns 401', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/parent/hub');
      const res = await hubGET(req);
      expect(res.status).toBe(401);
    });

    it('PARENT-SEC-002: invalid session token string returns 401', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/parent/hub', {
        headers: { Cookie: 'better-auth.session_token=invalid-fake-token' },
      });
      const res = await hubGET(req);
      expect(res.status).toBe(401);
    });

    it('PARENT-SEC-003: expired session token returns 401', async () => {
      const expiredSess = await db.session.create({
        data: {
          userId: userA.id,
          token: `token-exp-${crypto.randomUUID()}`,
          expiresAt: new Date(Date.now() - 10000),
        },
      });
      const signedExpired = signSessionToken(expiredSess.token);
      const req = new NextRequest('http://localhost:3000/api/v1/parent/hub', {
        headers: { Cookie: `better-auth.session_token=${signedExpired}` },
      });
      const res = await hubGET(req);
      expect(res.status).toBe(401);
    });

    it('PARENT-SEC-004: malformed session token signature returns 401', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/parent/hub', {
        headers: { Cookie: 'better-auth.session_token=token-A-12345.tampered-sig' },
      });
      const res = await hubGET(req);
      expect(res.status).toBe(401);
    });

    it('PARENT-SEC-005: forged session token signature returns 401', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/parent/hub', {
        headers: { Cookie: `better-auth.session_token=${sessionTokenA}extra` },
      });
      const res = await hubGET(req);
      expect(res.status).toBe(401);
    });

    it('PARENT-SEC-006: staff user without ParentIdentity attempting Parent endpoints returns 401', async () => {
      const staffUser = await db.user.create({
        data: {
          email: `staff-${crypto.randomUUID().slice(0, 6)}@test.com`,
          name: 'Staff Member',
          phone: `+9194${Math.floor(10000000 + Math.random() * 90000000)}`,
          status: 'active',
        },
      });
      const staffSess = await db.session.create({
        data: {
          userId: staffUser.id,
          token: `token-staff-${crypto.randomUUID()}`,
          expiresAt: new Date(Date.now() + 86400000),
        },
      });
      const signedStaff = signSessionToken(staffSess.token);
      const req = new NextRequest('http://localhost:3000/api/v1/parent/hub', {
        headers: { Cookie: `better-auth.session_token=${signedStaff}` },
      });
      const res = await hubGET(req);
      expect(res.status).toBe(401);
    });

    it('PARENT-SEC-007: Cookie-based auth enforcement: missing cookie returns 401 even with arbitrary headers', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/parent/hub', {
        headers: { Authorization: `Bearer ${sessionTokenA}` },
      });
      const res = await hubGET(req);
      expect(res.status).toBe(401);
    });
  });

  // ============================================================================
  // SECTION 2: AUTHORIZATION, CROSS-PARENT & IDOR (PARENT-SEC-011 - 020)
  // ============================================================================
  describe('Authorization, Cross-Parent & IDOR Protection (PARENT-SEC-011 - 020)', () => {
    it('PARENT-SEC-011: Parent A accesses authorized Student A1 attendance -> 200 OK', async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/v1/parent/students/${studentA1.id}/attendance`,
        { headers: { Cookie: `better-auth.session_token=${sessionTokenA}` } },
      );
      const res = await attendanceGET(req, { params: Promise.resolve({ id: studentA1.id }) });
      expect(res.status).toBe(200);
    });

    it('PARENT-SEC-012: Parent A accesses Student B1 (Parent B) attendance -> 404 NOT_FOUND Masked', async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/v1/parent/students/${studentB1.id}/attendance`,
        { headers: { Cookie: `better-auth.session_token=${sessionTokenA}` } },
      );
      const res = await attendanceGET(req, { params: Promise.resolve({ id: studentB1.id }) });
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error.message).toMatch(/not found or unauthorized/i);
    });

    it('PARENT-SEC-013: Parent A accesses random non-existent UUID -> 404 NOT_FOUND Masked', async () => {
      const randomUuid = crypto.randomUUID();
      const req = new NextRequest(
        `http://localhost:3000/api/v1/parent/students/${randomUuid}/attendance`,
        { headers: { Cookie: `better-auth.session_token=${sessionTokenA}` } },
      );
      const res = await attendanceGET(req, { params: Promise.resolve({ id: randomUuid }) });
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error.message).toMatch(/not found or unauthorized/i);
    });

    it('PARENT-SEC-014: Parent A accesses Student A2 (Institute B) -> 200 OK (Cross-Institute Authorized)', async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/v1/parent/students/${studentA2.id}/attendance`,
        { headers: { Cookie: `better-auth.session_token=${sessionTokenA}` } },
      );
      const res = await attendanceGET(req, { params: Promise.resolve({ id: studentA2.id }) });
      expect(res.status).toBe(200);
    });

    it('PARENT-SEC-015: Client-supplied x-institute-id header cannot bypass authorization', async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/v1/parent/students/${studentB1.id}/attendance`,
        {
          headers: {
            Cookie: `better-auth.session_token=${sessionTokenA}`,
            'x-institute-id': instituteA.id,
          },
        },
      );
      const res = await attendanceGET(req, { params: Promise.resolve({ id: studentB1.id }) });
      expect(res.status).toBe(404);
    });

    it('PARENT-SEC-016: Parent A attempts to access student after relationship unlinking -> 404 NOT_FOUND', async () => {
      await db.studentLink.deleteMany({ where: { childProfileId: childProfileA1.id } });
      await db.instituteParentStudent.deleteMany({ where: { studentId: studentA1.id } });
      const req = new NextRequest(
        `http://localhost:3000/api/v1/parent/students/${studentA1.id}/attendance`,
        { headers: { Cookie: `better-auth.session_token=${sessionTokenA}` } },
      );
      const res = await attendanceGET(req, { params: Promise.resolve({ id: studentA1.id }) });
      expect(res.status).toBe(404);
    });
  });

  // ============================================================================
  // SECTION 3: ACADEMIC PRIVACY (ATTENDANCE, HOMEWORK, ASSESSMENTS) (PARENT-SEC-021 - 030)
  // ============================================================================
  describe('Academic Privacy & Data Isolation (PARENT-SEC-021 - 030)', () => {
    it('PARENT-SEC-021: Parent A requests Student B1 homework -> 404 NOT_FOUND', async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/v1/parent/students/${studentB1.id}/homework`,
        { headers: { Cookie: `better-auth.session_token=${sessionTokenA}` } },
      );
      const res = await homeworkGET(req, { params: Promise.resolve({ id: studentB1.id }) });
      expect(res.status).toBe(404);
    });

    it('PARENT-SEC-022: Draft homework assignments are excluded from parent homework feed', async () => {
      const batchA = await db.batch.findFirstOrThrow({ where: { instituteId: instituteA.id } });
      await db.homework.create({
        data: {
          instituteId: instituteA.id,
          batchId: batchA.id,
          title: 'Draft Physics HW',
          publishedAt: null,
        },
      });

      const req = new NextRequest(
        `http://localhost:3000/api/v1/parent/students/${studentA1.id}/homework`,
        { headers: { Cookie: `better-auth.session_token=${sessionTokenA}` } },
      );
      const res = await homeworkGET(req, { params: Promise.resolve({ id: studentA1.id }) });
      expect(res.status).toBe(200);
      const body = await res.json();
      const titles = body.data.homework.map((h: { title: string }) => h.title);
      expect(titles).not.toContain('Draft Physics HW');
    });

    it('PARENT-SEC-023: Parent A requests Student B1 assessments -> 404 NOT_FOUND', async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/v1/parent/students/${studentB1.id}/assessments`,
        { headers: { Cookie: `better-auth.session_token=${sessionTokenA}` } },
      );
      const res = await assessmentsGET(req, { params: Promise.resolve({ id: studentB1.id }) });
      expect(res.status).toBe(404);
    });

    it('PARENT-SEC-024: Draft assessment tests are excluded from parent assessment feed', async () => {
      const batchA = await db.batch.findFirstOrThrow({ where: { instituteId: instituteA.id } });
      await db.test.create({
        data: {
          instituteId: instituteA.id,
          batchId: batchA.id,
          title: 'Draft Unit Test',
          status: 'draft',
          maximumMarks: 100,
        },
      });

      const req = new NextRequest(
        `http://localhost:3000/api/v1/parent/students/${studentA1.id}/assessments`,
        { headers: { Cookie: `better-auth.session_token=${sessionTokenA}` } },
      );
      const res = await assessmentsGET(req, { params: Promise.resolve({ id: studentA1.id }) });
      expect(res.status).toBe(200);
      const body = await res.json();
      const titles = body.data.assessments.map((t: { title: string }) => t.title);
      expect(titles).not.toContain('Draft Unit Test');
    });
  });

  // ============================================================================
  // SECTION 4: FINANCIAL & RECEIPT PRIVACY (PARENT-SEC-031 - 040)
  // ============================================================================
  describe('Financial & Receipt Privacy (PARENT-SEC-031 - 040)', () => {
    it('PARENT-SEC-031: Parent A requests Student B1 billing summary -> 404 NOT_FOUND', async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/v1/parent/students/${studentB1.id}/billing`,
        { headers: { Cookie: `better-auth.session_token=${sessionTokenA}` } },
      );
      const res = await billingGET(req, { params: Promise.resolve({ id: studentB1.id }) });
      expect(res.status).toBe(404);
    });

    it('PARENT-SEC-032: Parent A requests Student B1 receipt via API -> 404 NOT_FOUND', async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/v1/parent/students/${studentB1.id}/receipts/${receiptB1.id}`,
        { headers: { Cookie: `better-auth.session_token=${sessionTokenA}` } },
      );
      const res = await receiptGET(req, { params: Promise.resolve({ id: studentB1.id, receiptId: receiptB1.id }) });
      expect(res.status).toBe(404);
    });

    it('PARENT-SEC-033: Parent A requests Student A1 with Student B1 receiptId -> 404 NOT_FOUND (Dual Authorization)', async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/v1/parent/students/${studentA1.id}/receipts/${receiptB1.id}`,
        { headers: { Cookie: `better-auth.session_token=${sessionTokenA}` } },
      );
      const res = await receiptGET(req, { params: Promise.resolve({ id: studentA1.id, receiptId: receiptB1.id }) });
      expect(res.status).toBe(404);
    });

    it('PARENT-SEC-034: Receipt endpoint returns exact DTO without leaking raw database attributes', async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/v1/parent/students/${studentA1.id}/receipts/${receiptA1.id}`,
        { headers: { Cookie: `better-auth.session_token=${sessionTokenA}` } },
      );
      const res = await receiptGET(req, { params: Promise.resolve({ id: studentA1.id, receiptId: receiptA1.id }) });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.id).toBe(receiptA1.id);
      expect(body.data.receiptNumber).toBeDefined();
      expect(body.data.payment.amount).toBe(10000);
      expect(body.data.paymentGatewaySecret).toBeUndefined();
      expect(body.data.internalAuditKey).toBeUndefined();
    });
  });

  // ============================================================================
  // SECTION 5: NOTIFICATIONS & TIMELINE PRIVACY (PARENT-SEC-041 - 050)
  // ============================================================================
  describe('Notification & Timeline Privacy (PARENT-SEC-041 - 050)', () => {
    it('PARENT-SEC-041: Parent A lists notifications -> returns strictly Parent A notifications', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/parent/notifications', {
        headers: { Cookie: `better-auth.session_token=${sessionTokenA}` },
      });
      const res = await notificationsGET(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      const ids = body.data.map((n: { id: string }) => n.id);
      expect(ids).toContain(notificationA.id);
      expect(ids).not.toContain(notificationB.id);
    });

    it('PARENT-SEC-042: Parent A unread count ignores Parent B notifications', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/parent/notifications/unread-count', {
        headers: { Cookie: `better-auth.session_token=${sessionTokenA}` },
      });
      const res = await unreadCountGET(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.unreadCount).toBe(1);
    });

    it('PARENT-SEC-043: Parent A attempts to mark Parent B notification as read -> 404 NOT_FOUND', async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/v1/parent/notifications/${notificationB.id}/read`,
        { method: 'POST', headers: { Cookie: `better-auth.session_token=${sessionTokenA}` } },
      );
      const res = await markReadPOST(req, { params: Promise.resolve({ id: notificationB.id }) });
      expect(res.status).toBe(404);
    });

    it('PARENT-SEC-044: Parent A timeline contains Student A1 & A2 events only', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/parent/timeline', {
        headers: { Cookie: `better-auth.session_token=${sessionTokenA}` },
      });
      const res = await timelineGET(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      const studentIds = body.data.map((e: { studentId: string }) => e.studentId);
      expect(studentIds).toContain(studentA1.id);
      expect(studentIds).not.toContain(studentB1.id);
    });

    it('PARENT-SEC-045: Parent A requests timeline with unauthorized ?studentId=<Student B1> -> 404 NOT_FOUND', async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/v1/parent/timeline?studentId=${studentB1.id}`,
        { headers: { Cookie: `better-auth.session_token=${sessionTokenA}` } },
      );
      const res = await timelineGET(req);
      expect(res.status).toBe(404);
    });
  });

  // ============================================================================
  // SECTION 6: HTTP METHOD SAFETY & MASS ASSIGNMENT (PARENT-SEC-051 - 055)
  // ============================================================================
  describe('HTTP Method Safety & Mass Assignment (PARENT-SEC-051 - 055)', () => {
    it('PARENT-SEC-051: Unsupported POST on read-only academic route -> 405 Method Not Allowed', async () => {
      const { POST: academicPOST } = await import('./students/[id]/attendance/route');
      const req = new NextRequest(
        `http://localhost:3000/api/v1/parent/students/${studentA1.id}/attendance`,
        { method: 'POST', headers: { Cookie: `better-auth.session_token=${sessionTokenA}` } },
      );
      const res = await academicPOST();
      expect(res.status).toBe(405);
    });

    it('PARENT-SEC-052: Unsupported POST on read-only billing route -> 405 Method Not Allowed', async () => {
      const { POST: billingPOST } = await import('./students/[id]/billing/route');
      const req = new NextRequest(
        `http://localhost:3000/api/v1/parent/students/${studentA1.id}/billing`,
        { method: 'POST', headers: { Cookie: `better-auth.session_token=${sessionTokenA}` } },
      );
      const res = await billingPOST();
      expect(res.status).toBe(405);
    });

    it('PARENT-SEC-053: Unsupported POST on timeline route -> 405 Method Not Allowed', async () => {
      const { POST: timelinePOST } = await import('./timeline/route');
      const res = await timelinePOST();
      expect(res.status).toBe(405);
    });

    it('PARENT-SEC-054: Query parameter tampering on GET endpoints is ignored safely', async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/v1/parent/students/${studentA1.id}/attendance?role=admin&studentId=${studentB1.id}`,
        {
          method: 'GET',
          headers: { Cookie: `better-auth.session_token=${sessionTokenA}` },
        },
      );
      const res = await attendanceGET(req, { params: Promise.resolve({ id: studentA1.id }) });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.student.id).toBe(studentA1.id);
    });

    it('PARENT-SEC-055: Unexpected query parameters on hub route do not cause internal error', async () => {
      const req = new NextRequest(
        'http://localhost:3000/api/v1/parent/hub?randomParam=12345&inject=drop_table',
        { headers: { Cookie: `better-auth.session_token=${sessionTokenA}` } },
      );
      const res = await hubGET(req);
      expect(res.status).toBe(200);
    });
  });
});
