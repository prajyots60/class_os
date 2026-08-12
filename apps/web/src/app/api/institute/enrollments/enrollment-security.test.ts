import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import {
  validateTestEnvironment,
  cleanTestDatabase,
  closeTestPool,
  db,
} from '@coaching-os/database';
import { auth } from '@coaching-os/auth';
import { GET as listGET, POST as createPOST, PUT as rootPUT, PATCH as rootPATCH, DELETE as rootDELETE } from './route';
import { GET as getByIdGET, DELETE as archiveDELETE, POST as idPOST, PUT as idPUT, PATCH as idPATCH } from './[id]/route';
import { POST as activatePOST } from './[id]/activate/route';
import { POST as completePOST } from './[id]/complete/route';
import { POST as withdrawPOST } from './[id]/withdraw/route';
import { POST as cancelPOST } from './[id]/cancel/route';
import { POST as transferPOST } from './[id]/transfer/route';
import { GET as studentEnrollmentsGET } from '../students/[id]/enrollments/route';
import { GET as batchEnrollmentsGET } from '../batches/[id]/enrollments/route';
import { POST as onboardPOST } from '../../onboarding/institute/route';
import { POST as createStudentPOST } from '../students/route';
import { POST as admitStudentPOST } from '../students/[id]/admit/route';
import { POST as createProgramPOST } from '../programs/route';
import { POST as createSubjectPOST } from '../subjects/route';
import { POST as createBatchPOST } from '../batches/route';
import { POST as updateBatchStatusPOST } from '../batches/[id]/status/route';

describe('Phase 1.11.5 — Enrollment Security, Multi-Tenant & Concurrency E2E Test Matrix', () => {
  beforeAll(() => {
    validateTestEnvironment();
  });

  beforeEach(async () => {
    await cleanTestDatabase();
  });

  afterAll(async () => {
    await closeTestPool();
  });

  // ── Helper Utilities ─────────────────────────────────────────────────────────

  async function createAuthenticatedSession(prefix = 'enr_sec_user') {
    const email = `${prefix}_${Date.now()}_${Math.floor(Math.random() * 99999)}@test.com`;
    const password = 'SecureTestPassword123!';
    const signUpResponse = await auth.api.signUpEmail({
      body: { email, password, name: 'Enrollment Security Test User' },
      asResponse: true,
    });

    const cookieHeader = signUpResponse.headers.get('set-cookie');
    if (!cookieHeader) throw new Error('No set-cookie header from Better Auth signUpEmail');

    const user = await db.user.findFirstOrThrow({ where: { email: email.toLowerCase() } });
    return { user, cookieHeader };
  }

  async function onboardInstitute(cookieHeader: string, suffix: string) {
    const req = new NextRequest('http://localhost:3000/api/onboarding/institute', {
      method: 'POST',
      headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieHeader }),
      body: JSON.stringify({
        name: `Enrollment Sec Institute ${suffix}`,
        phone: '+919876543210',
        email: `inst_${suffix}_${Date.now()}@test.com`,
        slug: `enr-sec-${suffix}-${Date.now()}-${Math.floor(Math.random() * 999)}`,
      }),
    });
    const res = await onboardPOST(req);
    const body = await res.json();
    return body.data.institute;
  }

  async function setupStudentAndBatch(cookieHeader: string, prefix: string, batchCapacity = 30) {
    // 1. Create and Admit Student
    const studentReq = new NextRequest('http://localhost:3000/api/institute/students', {
      method: 'POST',
      headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieHeader }),
      body: JSON.stringify({
        admissionNumber: `ADM-${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        firstName: 'SecStudent',
        lastName: prefix,
      }),
    });
    const studentRes = await createStudentPOST(studentReq);
    const student = (await studentRes.json()).data;

    const admitReq = new NextRequest(`http://localhost:3000/api/institute/students/${student.id}/admit`, {
      method: 'POST',
      headers: new Headers({ cookie: cookieHeader }),
    });
    const admittedStudentRes = await admitStudentPOST(admitReq, { params: Promise.resolve({ id: student.id }) });
    const admittedStudent = (await admittedStudentRes.json()).data;

    // 2. Create Program, Subject, and Open Batch
    const progReq = new NextRequest('http://localhost:3000/api/institute/programs', {
      method: 'POST',
      headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieHeader }),
      body: JSON.stringify({ name: `Program ${prefix}`, code: `PRG-${prefix}` }),
    });
    const prog = (await (await createProgramPOST(progReq)).json()).data;

    const subjReq = new NextRequest('http://localhost:3000/api/institute/subjects', {
      method: 'POST',
      headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieHeader }),
      body: JSON.stringify({ name: `Subject ${prefix}`, code: `SUB-${prefix}` }),
    });
    const subj = (await (await createSubjectPOST(subjReq)).json()).data;

    const batchReq = new NextRequest('http://localhost:3000/api/institute/batches', {
      method: 'POST',
      headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieHeader }),
      body: JSON.stringify({
        subjectId: subj.id,
        name: `Batch ${prefix}`,
        code: `BCH-${prefix}`,
        capacity: batchCapacity,
      }),
    });
    const batch = (await (await createBatchPOST(batchReq)).json()).data;

    // Open batch
    const statusReq = new NextRequest(`http://localhost:3000/api/institute/batches/${batch.id}/status`, {
      method: 'POST',
      headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieHeader }),
      body: JSON.stringify({ status: 'open' }),
    });
    const openBatch = (await (await updateBatchStatusPOST(statusReq, { params: Promise.resolve({ id: batch.id }) })).json()).data;

    return { student: admittedStudent, program: prog, subject: subj, batch: openBatch };
  }

  // ── ENROLLMENT-01 — Authentication ──────────────────────────────────────────

  describe('ENROLLMENT-01 — Authentication', () => {
    const fakeUuid = '123e4567-e89b-12d3-a456-426614174000';

    it('rejects unauthenticated requests to all enrollment endpoints with 401', async () => {
      const endpoints = [
        { name: 'POST collection', call: () => createPOST(new NextRequest('http://localhost:3000/api/institute/enrollments', { method: 'POST' })) },
        { name: 'GET collection', call: () => listGET(new NextRequest('http://localhost:3000/api/institute/enrollments', { method: 'GET' })) },
        { name: 'GET by ID', call: () => getByIdGET(new NextRequest(`http://localhost:3000/api/institute/enrollments/${fakeUuid}`, { method: 'GET' }), { params: Promise.resolve({ id: fakeUuid }) }) },
        { name: 'DELETE archive', call: () => archiveDELETE(new NextRequest(`http://localhost:3000/api/institute/enrollments/${fakeUuid}`, { method: 'DELETE' }), { params: Promise.resolve({ id: fakeUuid }) }) },
        { name: 'POST activate', call: () => activatePOST(new NextRequest(`http://localhost:3000/api/institute/enrollments/${fakeUuid}/activate`, { method: 'POST' }), { params: Promise.resolve({ id: fakeUuid }) }) },
        { name: 'POST complete', call: () => completePOST(new NextRequest(`http://localhost:3000/api/institute/enrollments/${fakeUuid}/complete`, { method: 'POST' }), { params: Promise.resolve({ id: fakeUuid }) }) },
        { name: 'POST withdraw', call: () => withdrawPOST(new NextRequest(`http://localhost:3000/api/institute/enrollments/${fakeUuid}/withdraw`, { method: 'POST' }), { params: Promise.resolve({ id: fakeUuid }) }) },
        { name: 'POST cancel', call: () => cancelPOST(new NextRequest(`http://localhost:3000/api/institute/enrollments/${fakeUuid}/cancel`, { method: 'POST' }), { params: Promise.resolve({ id: fakeUuid }) }) },
        { name: 'POST transfer', call: () => transferPOST(new NextRequest(`http://localhost:3000/api/institute/enrollments/${fakeUuid}/transfer`, { method: 'POST' }), { params: Promise.resolve({ id: fakeUuid }) }) },
        { name: 'GET student listing', call: () => studentEnrollmentsGET(new NextRequest(`http://localhost:3000/api/institute/students/${fakeUuid}/enrollments`, { method: 'GET' }), { params: Promise.resolve({ id: fakeUuid }) }) },
        { name: 'GET batch listing', call: () => batchEnrollmentsGET(new NextRequest(`http://localhost:3000/api/institute/batches/${fakeUuid}/enrollments`, { method: 'GET' }), { params: Promise.resolve({ id: fakeUuid }) }) },
      ];

      for (const ep of endpoints) {
        const res = await ep.call();
        expect(res.status, `Endpoint ${ep.name} should return 401`).toBe(401);
        const json = await res.json();
        expect(json.error.code).toBe('UNAUTHENTICATED');
      }
    });

    it('returns 405 Method Not Allowed for unsupported HTTP methods', async () => {
      expect((await rootPUT()).status).toBe(405);
      expect((await rootPATCH()).status).toBe(405);
      expect((await rootDELETE()).status).toBe(405);

      expect((await idPOST()).status).toBe(405);
      expect((await idPUT()).status).toBe(405);
      expect((await idPATCH()).status).toBe(405);
    });
  });

  // ── ENROLLMENT-02 — Capability Authorization ─────────────────────────────────

  describe('ENROLLMENT-02 — Capability Authorization', () => {
    it('denies parent role execution of mutation capabilities with HTTP 403', async () => {
      // 1. Create owner session to set up institute and data
      const { cookieHeader: ownerCookie } = await createAuthenticatedSession('sec_owner_cap');
      const inst = await onboardInstitute(ownerCookie, 'capInst');
      const { student, batch } = await setupStudentAndBatch(ownerCookie, 'CAP1');

      // 2. Create parent user with matching phone
      const phone = `+9197${Date.now().toString().slice(-8)}`;
      const email = `parent_user_cap_${Date.now()}@test.com`;
      const password = 'SecureTestPassword123!';
      const signUpResponse = await auth.api.signUpEmail({
        body: { email, password, name: 'Parent Security Test User' },
        asResponse: true,
      });

      const parentCookie = signUpResponse.headers.get('set-cookie');
      if (!parentCookie) throw new Error('No set-cookie header from Better Auth');

      const parentUser = await db.user.findFirstOrThrow({ where: { email: email.toLowerCase() } });
      await db.user.update({
        where: { id: parentUser.id },
        data: { phone },
      });

      const parentIdentity = await db.parentIdentity.create({
        data: { phone },
      });
      const instParent = await db.instituteParent.create({
        data: { instituteId: inst.id, parentIdentityId: parentIdentity.id },
      });
      await db.instituteMembership.create({
        data: {
          instituteId: inst.id,
          parentIdentityId: parentIdentity.id,
          instituteParentId: instParent.id,
        },
      });

      // 3. Parent attempts create enrollment -> 403
      const createReq = new NextRequest('http://localhost:3000/api/institute/enrollments', {
        method: 'POST',
        headers: new Headers({ 'Content-Type': 'application/json', cookie: parentCookie }),
        body: JSON.stringify({ studentId: student.id, batchId: batch.id }),
      });
      const createRes = await createPOST(createReq);
      expect(createRes.status).toBe(403);
      const json = await createRes.json();
      expect(json.error.code).toBe('FORBIDDEN');
    });
  });

  // ── ENROLLMENT-03 — Cross-Tenant Student ─────────────────────────────────────

  describe('ENROLLMENT-03 — Cross-Tenant Student', () => {
    it('returns tenant-safe 404 on create and empty list on list when targeting another institute student', async () => {
      const { cookieHeader: cookieA } = await createAuthenticatedSession('userA_sec03');
      await onboardInstitute(cookieA, 'instA03');
      const { batch: batchA } = await setupStudentAndBatch(cookieA, 'Sec03A');

      const { cookieHeader: cookieB } = await createAuthenticatedSession('userB_sec03');
      await onboardInstitute(cookieB, 'instB03');
      const { student: studentB } = await setupStudentAndBatch(cookieB, 'Sec03B');

      // User A attempts to create enrollment for student B in batch A -> 404
      const createReq = new NextRequest('http://localhost:3000/api/institute/enrollments', {
        method: 'POST',
        headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieA }),
        body: JSON.stringify({ studentId: studentB.id, batchId: batchA.id }),
      });
      const res = await createPOST(createReq);
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error.code).toBe('NOT_FOUND');

      // User A attempts to list enrollments for student B -> 200 with empty list (zero existence disclosure)
      const listReq = new NextRequest(`http://localhost:3000/api/institute/students/${studentB.id}/enrollments`, {
        method: 'GET',
        headers: new Headers({ cookie: cookieA }),
      });
      const listRes = await studentEnrollmentsGET(listReq, { params: Promise.resolve({ id: studentB.id }) });
      expect(listRes.status).toBe(200);
      const listJson = await listRes.json();
      expect(listJson.data).toEqual([]);
    });
  });

  // ── ENROLLMENT-04 — Cross-Tenant Batch ───────────────────────────────────────

  describe('ENROLLMENT-04 — Cross-Tenant Batch', () => {
    it('returns 404 on create and empty list on list when targeting a batch in another institute', async () => {
      const { cookieHeader: cookieA } = await createAuthenticatedSession('userA_sec04');
      await onboardInstitute(cookieA, 'instA04');
      const { student: studentA } = await setupStudentAndBatch(cookieA, 'Sec04A');

      const { cookieHeader: cookieB } = await createAuthenticatedSession('userB_sec04');
      await onboardInstitute(cookieB, 'instB04');
      const { batch: batchB } = await setupStudentAndBatch(cookieB, 'Sec04B');

      const createReq = new NextRequest('http://localhost:3000/api/institute/enrollments', {
        method: 'POST',
        headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieA }),
        body: JSON.stringify({ studentId: studentA.id, batchId: batchB.id }),
      });
      const res = await createPOST(createReq);
      expect(res.status).toBe(404);

      // User A attempts to list batch B's enrollments -> 200 with empty list
      const listReq = new NextRequest(`http://localhost:3000/api/institute/batches/${batchB.id}/enrollments`, {
        method: 'GET',
        headers: new Headers({ cookie: cookieA }),
      });
      const listRes = await batchEnrollmentsGET(listReq, { params: Promise.resolve({ id: batchB.id }) });
      expect(listRes.status).toBe(200);
      const listJson = await listRes.json();
      expect(listJson.data).toEqual([]);
    });
  });

  // ── ENROLLMENT-05 — Cross-Tenant Enrollment ──────────────────────────────────

  describe('ENROLLMENT-05 — Cross-Tenant Enrollment', () => {
    it('blocks reading, modifying, or archiving an enrollment belonging to another institute', async () => {
      const { cookieHeader: cookieA } = await createAuthenticatedSession('userA_sec05');
      await onboardInstitute(cookieA, 'instA05');
      const { student: studentA, batch: batchA } = await setupStudentAndBatch(cookieA, 'Sec05A');

      const { cookieHeader: cookieB } = await createAuthenticatedSession('userB_sec05');
      await onboardInstitute(cookieB, 'instB05');

      // Create enrollment in Inst A
      const createReq = new NextRequest('http://localhost:3000/api/institute/enrollments', {
        method: 'POST',
        headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieA }),
        body: JSON.stringify({ studentId: studentA.id, batchId: batchA.id, status: 'active' }),
      });
      const enrA = (await (await createPOST(createReq)).json()).data;

      // Inst B user attempts operations on Inst A's enrollment -> 404
      const getReq = new NextRequest(`http://localhost:3000/api/institute/enrollments/${enrA.id}`, { method: 'GET', headers: new Headers({ cookie: cookieB }) });
      expect((await getByIdGET(getReq, { params: Promise.resolve({ id: enrA.id }) })).status).toBe(404);

      const actReq = new NextRequest(`http://localhost:3000/api/institute/enrollments/${enrA.id}/activate`, { method: 'POST', headers: new Headers({ cookie: cookieB }) });
      expect((await activatePOST(actReq, { params: Promise.resolve({ id: enrA.id }) })).status).toBe(404);

      const delReq = new NextRequest(`http://localhost:3000/api/institute/enrollments/${enrA.id}`, { method: 'DELETE', headers: new Headers({ cookie: cookieB }) });
      expect((await archiveDELETE(delReq, { params: Promise.resolve({ id: enrA.id }) })).status).toBe(404);
    });
  });

  // ── ENROLLMENT-06 — Cross-Tenant Transfer Target ────────────────────────────

  describe('ENROLLMENT-06 — Cross-Tenant Transfer Target', () => {
    it('aborts transfer and returns 404 when target batch belongs to another institute', async () => {
      const { cookieHeader: cookieA } = await createAuthenticatedSession('userA_sec06');
      await onboardInstitute(cookieA, 'instA06');
      const { student: studentA, batch: batchA } = await setupStudentAndBatch(cookieA, 'Sec06A');

      const { cookieHeader: cookieB } = await createAuthenticatedSession('userB_sec06');
      await onboardInstitute(cookieB, 'instB06');
      const { batch: batchB } = await setupStudentAndBatch(cookieB, 'Sec06B');

      // Create active enrollment in Inst A
      const createReq = new NextRequest('http://localhost:3000/api/institute/enrollments', {
        method: 'POST',
        headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieA }),
        body: JSON.stringify({ studentId: studentA.id, batchId: batchA.id, status: 'active' }),
      });
      const enrA = (await (await createPOST(createReq)).json()).data;

      // Transfer to Batch B (belongs to Inst B) -> 404
      const transferReq = new NextRequest(`http://localhost:3000/api/institute/enrollments/${enrA.id}/transfer`, {
        method: 'POST',
        headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieA }),
        body: JSON.stringify({ targetBatchId: batchB.id }),
      });
      const res = await transferPOST(transferReq, { params: Promise.resolve({ id: enrA.id }) });
      expect(res.status).toBe(404);

      // Verify source enrollment remains active and untransferred in DB
      const dbSource = await db.enrollment.findUnique({ where: { id: enrA.id } });
      expect(dbSource?.status).toBe('active');
      expect(dbSource?.transferredToBatchId).toBeNull();
    });
  });

  // ── ENROLLMENT-07 & ENROLLMENT-23 — Payload Spoofing & Forbidden Fields ─────

  describe('ENROLLMENT-07 & ENROLLMENT-23 — Payload Spoofing & Forbidden Fields', () => {
    it('rejects payloads containing forbidden injection fields with HTTP 400', async () => {
      const { cookieHeader } = await createAuthenticatedSession('sec07_user');
      await onboardInstitute(cookieHeader, 'inst07');
      const { student, batch } = await setupStudentAndBatch(cookieHeader, 'Sec07');

      const forbiddenPayloads = [
        { instituteId: 'foreign-tenant-uuid' },
        { userId: 'foreign-user-uuid' },
        { membershipId: 'foreign-membership-uuid' },
        { role: 'owner' },
        { transferredToBatchId: 'target-batch-uuid' },
        { transferredToEnrollmentId: 'target-enr-uuid' },
        { transferredAt: new Date().toISOString() },
        { deletedAt: new Date().toISOString() },
        { createdAt: new Date().toISOString() },
        { updatedAt: new Date().toISOString() },
      ];

      for (const payload of forbiddenPayloads) {
        const req = new NextRequest('http://localhost:3000/api/institute/enrollments', {
          method: 'POST',
          headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieHeader }),
          body: JSON.stringify({
            studentId: student.id,
            batchId: batch.id,
            ...payload,
          }),
        });

        const res = await createPOST(req);
        expect(res.status, `Payload ${JSON.stringify(payload)} should return 400`).toBe(400);
        const json = await res.json();
        expect(json.error.code).toBe('VALIDATION_ERROR');
      }
    });
  });

  // ── ENROLLMENT-08 — Header Tenant Spoofing ───────────────────────────────────

  describe('ENROLLMENT-08 — Header Tenant Spoofing', () => {
    it('ignores client header spoofing attempts (x-institute-id, x-tenant-id)', async () => {
      const { cookieHeader } = await createAuthenticatedSession('sec08_user');
      const inst = await onboardInstitute(cookieHeader, 'inst08');
      const { student, batch } = await setupStudentAndBatch(cookieHeader, 'Sec08');

      const injectedHeaders = new Headers({
        'Content-Type': 'application/json',
        cookie: cookieHeader,
        'x-institute-id': 'hacked-tenant-id',
        'x-tenant-id': 'hacked-tenant-id',
      });

      const createReq = new NextRequest('http://localhost:3000/api/institute/enrollments', {
        method: 'POST',
        headers: injectedHeaders,
        body: JSON.stringify({ studentId: student.id, batchId: batch.id, status: 'active' }),
      });

      const res = await createPOST(createReq);
      expect(res.status).toBe(201);
      const data = (await res.json()).data;
      expect(data.instituteId).toBe(inst.id); // Session TenantContext authoritative!
      expect(data.instituteId).not.toBe('hacked-tenant-id');
    });
  });

  // ── ENROLLMENT-09 — Role Forgery ──────────────────────────────────────────────

  describe('ENROLLMENT-09 — Role Forgery', () => {
    it('ignores client header role forgery (x-role: owner)', async () => {
      const { cookieHeader } = await createAuthenticatedSession('sec09_user');
      await onboardInstitute(cookieHeader, 'inst09');

      const forgedHeaders = new Headers({
        'Content-Type': 'application/json',
        cookie: cookieHeader,
        'x-role': 'owner',
      });

      const listReq = new NextRequest('http://localhost:3000/api/institute/enrollments', {
        method: 'GET',
        headers: forgedHeaders,
      });

      const res = await listGET(listReq);
      expect(res.status).toBe(200); // Resolves real trusted session membership
    });
  });

  // ── ENROLLMENT-10 — Duplicate Enrollment ──────────────────────────────────────

  describe('ENROLLMENT-10 — Duplicate Enrollment', () => {
    it('rejects duplicate active/pending enrollment for same student and batch with HTTP 409', async () => {
      const { cookieHeader } = await createAuthenticatedSession('sec10_user');
      await onboardInstitute(cookieHeader, 'inst10');
      const { student, batch } = await setupStudentAndBatch(cookieHeader, 'Sec10');

      // 1. Create first enrollment
      const req1 = new NextRequest('http://localhost:3000/api/institute/enrollments', {
        method: 'POST',
        headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieHeader }),
        body: JSON.stringify({ studentId: student.id, batchId: batch.id, status: 'active' }),
      });
      const res1 = await createPOST(req1);
      expect(res1.status).toBe(201);

      // 2. Attempt duplicate enrollment -> 409
      const req2 = new NextRequest('http://localhost:3000/api/institute/enrollments', {
        method: 'POST',
        headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieHeader }),
        body: JSON.stringify({ studentId: student.id, batchId: batch.id, status: 'pending' }),
      });
      const res2 = await createPOST(req2);
      expect(res2.status).toBe(409);
      const json = await res2.json();
      expect(json.error.code).toBe('CONFLICT');
    });

    it('allows re-enrollment creating a NEW Enrollment aggregate instance after withdrawal into a target batch', async () => {
      const { cookieHeader } = await createAuthenticatedSession('sec10_re_user');
      await onboardInstitute(cookieHeader, 'inst10re');
      const { student, batch: batch1 } = await setupStudentAndBatch(cookieHeader, 'Sec10Re1');
      const { batch: batch2 } = await setupStudentAndBatch(cookieHeader, 'Sec10Re2');

      // 1. Create and Activate
      const req1 = new NextRequest('http://localhost:3000/api/institute/enrollments', {
        method: 'POST',
        headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieHeader }),
        body: JSON.stringify({ studentId: student.id, batchId: batch1.id, status: 'active' }),
      });
      const enr1 = (await (await createPOST(req1)).json()).data;

      // 2. Withdraw
      const wReq = new NextRequest(`http://localhost:3000/api/institute/enrollments/${enr1.id}/withdraw`, {
        method: 'POST',
        headers: new Headers({ cookie: cookieHeader }),
      });
      const wRes = await withdrawPOST(wReq, { params: Promise.resolve({ id: enr1.id }) });
      expect(wRes.status).toBe(200);

      // 3. Re-enroll student into batch 2 -> creates NEW enrollment aggregate
      const req2 = new NextRequest('http://localhost:3000/api/institute/enrollments', {
        method: 'POST',
        headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieHeader }),
        body: JSON.stringify({ studentId: student.id, batchId: batch2.id, status: 'active' }),
      });
      const res2 = await createPOST(req2);
      expect(res2.status).toBe(201);
      const enr2 = (await res2.json()).data;
      expect(enr2.id).not.toBe(enr1.id);
      expect(enr2.status).toBe('active');
    });
  });

  // ── ENROLLMENT-11 & ENROLLMENT-21 — State Machine Invariants ─────────────────

  describe('ENROLLMENT-11 & ENROLLMENT-21 — State Machine Invariants', () => {
    it('rejects invalid lifecycle transitions out of terminal states with HTTP 400', async () => {
      const { cookieHeader } = await createAuthenticatedSession('sec11_user');
      await onboardInstitute(cookieHeader, 'inst11');
      const { student, batch } = await setupStudentAndBatch(cookieHeader, 'Sec11');

      // 1. Create and Activate
      const createReq = new NextRequest('http://localhost:3000/api/institute/enrollments', {
        method: 'POST',
        headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieHeader }),
        body: JSON.stringify({ studentId: student.id, batchId: batch.id, status: 'active' }),
      });
      const enr = (await (await createPOST(createReq)).json()).data;

      // 2. Complete Enrollment (Transitions to terminal status 'completed')
      const compReq = new NextRequest(`http://localhost:3000/api/institute/enrollments/${enr.id}/complete`, {
        method: 'POST',
        headers: new Headers({ cookie: cookieHeader }),
      });
      await completePOST(compReq, { params: Promise.resolve({ id: enr.id }) });

      // 3. Attempting to activate a COMPLETED enrollment -> 400 (Terminal state guard)
      const actReq = new NextRequest(`http://localhost:3000/api/institute/enrollments/${enr.id}/activate`, {
        method: 'POST',
        headers: new Headers({ cookie: cookieHeader }),
      });
      const actRes = await activatePOST(actReq, { params: Promise.resolve({ id: enr.id }) });
      expect(actRes.status).toBe(400);

      // 4. Attempting to withdraw a COMPLETED enrollment -> 400
      const wReq = new NextRequest(`http://localhost:3000/api/institute/enrollments/${enr.id}/withdraw`, {
        method: 'POST',
        headers: new Headers({ cookie: cookieHeader }),
      });
      const wRes = await withdrawPOST(wReq, { params: Promise.resolve({ id: enr.id }) });
      expect(wRes.status).toBe(400);

      // 5. Attempting to cancel a COMPLETED enrollment -> 400
      const cReq = new NextRequest(`http://localhost:3000/api/institute/enrollments/${enr.id}/cancel`, {
        method: 'POST',
        headers: new Headers({ cookie: cookieHeader }),
      });
      const cRes = await cancelPOST(cReq, { params: Promise.resolve({ id: enr.id }) });
      expect(cRes.status).toBe(400);
    });
  });

  // ── ENROLLMENT-12 — Student Eligibility ──────────────────────────────────────

  describe('ENROLLMENT-12 — Student Eligibility', () => {
    it('rejects enrollment creation when student is not admitted or active', async () => {
      const { cookieHeader } = await createAuthenticatedSession('sec12_user');
      await onboardInstitute(cookieHeader, 'inst12');
      
      // Setup batch
      const { batch } = await setupStudentAndBatch(cookieHeader, 'Sec12B');

      // Create student who is in 'pending' admission status (not admitted yet)
      const studentReq = new NextRequest('http://localhost:3000/api/institute/students', {
        method: 'POST',
        headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieHeader }),
        body: JSON.stringify({ admissionNumber: `ADM-UNADMITTED-${Date.now()}`, firstName: 'Pending', lastName: 'Student' }),
      });
      const unadmittedStudent = (await (await createStudentPOST(studentReq)).json()).data;

      // Attempt enrollment -> 400
      const createReq = new NextRequest('http://localhost:3000/api/institute/enrollments', {
        method: 'POST',
        headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieHeader }),
        body: JSON.stringify({ studentId: unadmittedStudent.id, batchId: batch.id }),
      });
      const res = await createPOST(createReq);
      expect(res.status).toBe(400);
    });
  });

  // ── ENROLLMENT-13 — Batch Eligibility ────────────────────────────────────────

  describe('ENROLLMENT-13 — Batch Eligibility', () => {
    it('rejects enrollment against batches that are not open or running', async () => {
      const { cookieHeader } = await createAuthenticatedSession('sec13_user');
      await onboardInstitute(cookieHeader, 'inst13');
      const { student, subject } = await setupStudentAndBatch(cookieHeader, 'Sec13');

      // Create batch in default 'draft' status
      const batchReq = new NextRequest('http://localhost:3000/api/institute/batches', {
        method: 'POST',
        headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieHeader }),
        body: JSON.stringify({
          subjectId: subject.id,
          name: 'Draft Batch',
          code: `BCH-DRAFT-${Date.now()}`,
          capacity: 30,
        }),
      });
      const draftBatch = (await (await createBatchPOST(batchReq)).json()).data;

      // Attempt enrollment -> 400
      const createReq = new NextRequest('http://localhost:3000/api/institute/enrollments', {
        method: 'POST',
        headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieHeader }),
        body: JSON.stringify({ studentId: student.id, batchId: draftBatch.id }),
      });
      const res = await createPOST(createReq);
      expect(res.status).toBe(400);
    });
  });

  // ── ENROLLMENT-14 — Capacity Concurrency ──────────────────────────────────────

  describe('ENROLLMENT-14 — Capacity Concurrency', () => {
    it('prevents capacity overflow under concurrent enrollment execution', async () => {
      const { cookieHeader } = await createAuthenticatedSession('sec14_concur');
      await onboardInstitute(cookieHeader, 'inst14');

      // Setup batch with capacity = 1
      const { student: student1, batch } = await setupStudentAndBatch(cookieHeader, 'Sec14_1', 1);

      // Create second admitted student in same institute
      const student2Req = new NextRequest('http://localhost:3000/api/institute/students', {
        method: 'POST',
        headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieHeader }),
        body: JSON.stringify({ admissionNumber: `ADM-SEC14-2-${Date.now()}`, firstName: 'Student', lastName: 'Two' }),
      });
      const student2 = (await (await createStudentPOST(student2Req)).json()).data;
      const admit2Req = new NextRequest(`http://localhost:3000/api/institute/students/${student2.id}/admit`, {
        method: 'POST',
        headers: new Headers({ cookie: cookieHeader }),
      });
      await admitStudentPOST(admit2Req, { params: Promise.resolve({ id: student2.id }) });

      // Trigger concurrent enrollment requests
      const req1 = new NextRequest('http://localhost:3000/api/institute/enrollments', {
        method: 'POST',
        headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieHeader }),
        body: JSON.stringify({ studentId: student1.id, batchId: batch.id, status: 'active' }),
      });

      const req2 = new NextRequest('http://localhost:3000/api/institute/enrollments', {
        method: 'POST',
        headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieHeader }),
        body: JSON.stringify({ studentId: student2.id, batchId: batch.id, status: 'active' }),
      });

      const results = await Promise.allSettled([
        createPOST(req1),
        createPOST(req2),
      ]);

      const fulfilledResponses = results
        .filter((r): r is PromiseFulfilledResult<Response> => r.status === 'fulfilled')
        .map((r) => r.value);

      const statuses = fulfilledResponses.map((res) => res.status);

      // Exactly one succeeds (201) and one fails (409 Conflict)
      expect(statuses).toContain(201);
      expect(statuses).toContain(409);

      // Verify total active enrollments in batch in DB <= capacity (1)
      const countInDb = await db.enrollment.count({
        where: { batchId: batch.id, status: { in: ['pending', 'active'] }, deletedAt: null },
      });
      expect(countInDb).toBe(1);
    });
  });

  // ── ENROLLMENT-16 — Transfer History Tampering ────────────────────────────────

  describe('ENROLLMENT-16 — Transfer History Tampering', () => {
    it('preserves historical source batchId upon transfer and rejects tampering', async () => {
      const { cookieHeader } = await createAuthenticatedSession('sec16_user');
      await onboardInstitute(cookieHeader, 'inst16');
      const { student, batch: sourceBatch } = await setupStudentAndBatch(cookieHeader, 'Sec16Src');
      const { batch: targetBatch } = await setupStudentAndBatch(cookieHeader, 'Sec16Tgt');

      // 1. Create source enrollment
      const createReq = new NextRequest('http://localhost:3000/api/institute/enrollments', {
        method: 'POST',
        headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieHeader }),
        body: JSON.stringify({ studentId: student.id, batchId: sourceBatch.id, status: 'active' }),
      });
      const sourceEnr = (await (await createPOST(createReq)).json()).data;

      // 2. Perform Transfer
      const transferReq = new NextRequest(`http://localhost:3000/api/institute/enrollments/${sourceEnr.id}/transfer`, {
        method: 'POST',
        headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieHeader }),
        body: JSON.stringify({ targetBatchId: targetBatch.id }),
      });
      const res = await transferPOST(transferReq, { params: Promise.resolve({ id: sourceEnr.id }) });
      expect(res.status).toBe(200);

      const data = (await res.json()).data;

      // Check Invariants
      expect(data.source.batchId).toBe(sourceBatch.id); // Original batch untouched!
      expect(data.source.status).toBe('transferred');
      expect(data.source.transferredToBatchId).toBe(targetBatch.id);
      expect(data.source.transferredToEnrollmentId).toBe(data.destination.id);

      expect(data.destination.batchId).toBe(targetBatch.id);
      expect(data.destination.status).toBe('active');
    });
  });

  // ── ENROLLMENT-17 & ENROLLMENT-18 — Privacy, DTO Flatness & Error Safety ──────

  describe('ENROLLMENT-17 & ENROLLMENT-18 — Privacy & Error Safety', () => {
    it('returns flat DTO without leaking recursive graphs or database credentials', async () => {
      const { cookieHeader } = await createAuthenticatedSession('sec17_user');
      await onboardInstitute(cookieHeader, 'inst17');
      const { student, batch } = await setupStudentAndBatch(cookieHeader, 'Sec17');

      const createReq = new NextRequest('http://localhost:3000/api/institute/enrollments', {
        method: 'POST',
        headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieHeader }),
        body: JSON.stringify({ studentId: student.id, batchId: batch.id, status: 'active' }),
      });
      const res = await createPOST(createReq);
      expect(res.status).toBe(201);
      const bodyText = await res.text();

      // Check JSON response for safety
      expect(bodyText).not.toContain('DATABASE_URL');
      expect(bodyText).not.toContain('password');
      expect(bodyText).not.toContain('prisma');
      expect(bodyText).not.toContain('guardians'); // Anti-recursion: no nested graphs!

      const json = JSON.parse(bodyText);
      expect(json.data.id).toBeDefined();
      expect(json.data.instituteId).toBeDefined();
      expect(json.data.studentId).toBe(student.id);
      expect(json.data.batchId).toBe(batch.id);
      expect(json.data.status).toBe('active');
    });
  });
});
