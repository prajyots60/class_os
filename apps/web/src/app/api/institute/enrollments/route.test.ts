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

describe('API /api/institute/enrollments End-to-End Suite (Phase 1.11.4)', () => {
  beforeAll(() => {
    validateTestEnvironment();
  });

  beforeEach(async () => {
    await cleanTestDatabase();
  });

  afterAll(async () => {
    await closeTestPool();
  });

  async function createAuthenticatedSession(prefix = 'enrollment_api_user') {
    const email = `${prefix}_${Date.now()}_${Math.floor(Math.random() * 99999)}@test.com`;
    const password = 'SecureTestPassword123!';
    const signUpResponse = await auth.api.signUpEmail({
      body: { email, password, name: 'Enrollment API Test User' },
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
        name: `Enrollment Test Institute ${suffix}`,
        phone: '+919876543210',
        email: `inst_${suffix}_${Date.now()}@test.com`,
        slug: `enr-${suffix}-${Date.now()}-${Math.floor(Math.random() * 999)}`,
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
        admissionNumber: `ADM-${prefix}-${Date.now()}`,
        firstName: 'Enrollment',
        lastName: 'Student',
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

  // ── 1. Authentication & Guard Checks ────────────────────────────────────────

  describe('1. Authentication & Method Security', () => {
    it('returns 401 when listing enrollments without session', async () => {
      const req = new NextRequest('http://localhost:3000/api/institute/enrollments', { method: 'GET' });
      const res = await listGET(req);
      expect(res.status).toBe(401);
    });

    it('returns 401 when creating enrollment without session', async () => {
      const req = new NextRequest('http://localhost:3000/api/institute/enrollments', {
        method: 'POST',
        headers: new Headers({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ studentId: '123e4567-e89b-12d3-a456-426614174000', batchId: '123e4567-e89b-12d3-a456-426614174001' }),
      });
      const res = await createPOST(req);
      expect(res.status).toBe(401);
    });

    it('returns 405 for unsupported HTTP methods on /api/institute/enrollments', async () => {
      expect((await rootPUT()).status).toBe(405);
      expect((await rootPATCH()).status).toBe(405);
      expect((await rootDELETE()).status).toBe(405);
    });
  });

  // ── 2. Validation Defenses ───────────────────────────────────────────────────

  describe('2. Validation & Parameter Injection Defenses', () => {
    it('rejects malformed JSON payload with 400', async () => {
      const { cookieHeader } = await createAuthenticatedSession();
      await onboardInstitute(cookieHeader, 'val1');

      const req = new NextRequest('http://localhost:3000/api/institute/enrollments', {
        method: 'POST',
        headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieHeader }),
        body: '{ malformed-json',
      });
      const res = await createPOST(req);
      expect(res.status).toBe(400);
    });

    it('rejects client injection of instituteId via .strict() schema', async () => {
      const { cookieHeader } = await createAuthenticatedSession();
      await onboardInstitute(cookieHeader, 'val2');
      const { student, batch } = await setupStudentAndBatch(cookieHeader, 'V2');

      const req = new NextRequest('http://localhost:3000/api/institute/enrollments', {
        method: 'POST',
        headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieHeader }),
        body: JSON.stringify({
          studentId: student.id,
          batchId: batch.id,
          instituteId: 'hacked-tenant-id', // Forbidden injected field
        }),
      });
      const res = await createPOST(req);
      expect(res.status).toBe(400);
    });
  });

  // ── 3. Lifecycle & Atomic Transfer End-to-End Workflows ───────────────────────

  describe('3. Core Enrollment & Lifecycle API Workflows', () => {
    it('creates, lists, activates, completes, and archives an enrollment record', async () => {
      const { cookieHeader } = await createAuthenticatedSession();
      await onboardInstitute(cookieHeader, 'flow1');
      const { student, batch } = await setupStudentAndBatch(cookieHeader, 'F1');

      // 1. Create Pending Enrollment
      const createReq = new NextRequest('http://localhost:3000/api/institute/enrollments', {
        method: 'POST',
        headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieHeader }),
        body: JSON.stringify({
          studentId: student.id,
          batchId: batch.id,
          status: 'pending',
        }),
      });
      const createRes = await createPOST(createReq);
      expect(createRes.status).toBe(201);
      const enrollment = (await createRes.json()).data;
      expect(enrollment.id).toBeDefined();
      expect(enrollment.studentId).toBe(student.id);
      expect(enrollment.batchId).toBe(batch.id);
      expect(enrollment.status).toBe('pending');

      // 2. Activate Enrollment
      const actReq = new NextRequest(`http://localhost:3000/api/institute/enrollments/${enrollment.id}/activate`, {
        method: 'POST',
        headers: new Headers({ cookie: cookieHeader }),
      });
      const actRes = await activatePOST(actReq, { params: Promise.resolve({ id: enrollment.id }) });
      expect(actRes.status).toBe(200);
      const activated = (await actRes.json()).data;
      expect(activated.status).toBe('active');

      // 3. Complete Enrollment
      const compReq = new NextRequest(`http://localhost:3000/api/institute/enrollments/${enrollment.id}/complete`, {
        method: 'POST',
        headers: new Headers({ cookie: cookieHeader }),
      });
      const compRes = await completePOST(compReq, { params: Promise.resolve({ id: enrollment.id }) });
      expect(compRes.status).toBe(200);
      const completed = (await compRes.json()).data;
      expect(completed.status).toBe('completed');
      expect(completed.completedAt).toBeDefined();

      // 4. Archive Enrollment
      const archReq = new NextRequest(`http://localhost:3000/api/institute/enrollments/${enrollment.id}`, {
        method: 'DELETE',
        headers: new Headers({ cookie: cookieHeader }),
      });
      const archRes = await archiveDELETE(archReq, { params: Promise.resolve({ id: enrollment.id }) });
      expect(archRes.status).toBe(200);
      const archived = (await archRes.json()).data;
      expect(archived.deletedAt).toBeDefined();
    });

    it('executes atomic student batch transfer preserving historical source batchId', async () => {
      const { cookieHeader } = await createAuthenticatedSession();
      await onboardInstitute(cookieHeader, 'transfer1');
      const { student, batch: sourceBatch } = await setupStudentAndBatch(cookieHeader, 'T1Src');

      // Create target batch
      const { batch: targetBatch } = await setupStudentAndBatch(cookieHeader, 'T1Tgt');

      // 1. Create and Activate Source Enrollment
      const createReq = new NextRequest('http://localhost:3000/api/institute/enrollments', {
        method: 'POST',
        headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieHeader }),
        body: JSON.stringify({
          studentId: student.id,
          batchId: sourceBatch.id,
          status: 'active',
        }),
      });
      const sourceEnrollment = (await (await createPOST(createReq)).json()).data;

      // 2. Call Transfer Endpoint
      const transferReq = new NextRequest(`http://localhost:3000/api/institute/enrollments/${sourceEnrollment.id}/transfer`, {
        method: 'POST',
        headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieHeader }),
        body: JSON.stringify({ targetBatchId: targetBatch.id }),
      });

      const transferRes = await transferPOST(transferReq, { params: Promise.resolve({ id: sourceEnrollment.id }) });
      expect(transferRes.status).toBe(200);
      const transferData = (await transferRes.json()).data;

      expect(transferData.source.status).toBe('transferred');
      expect(transferData.source.batchId).toBe(sourceBatch.id); // Historical preservation invariant!
      expect(transferData.source.transferredToBatchId).toBe(targetBatch.id);

      expect(transferData.destination.status).toBe('active');
      expect(transferData.destination.batchId).toBe(targetBatch.id);
    });

    it('enforces multi-tenant isolation across two separate institutes', async () => {
      const { cookieHeader: cookieA } = await createAuthenticatedSession('tenantA');
      await onboardInstitute(cookieA, 'tenA');
      const { student: studentA, batch: batchA } = await setupStudentAndBatch(cookieA, 'TA');

      const { cookieHeader: cookieB } = await createAuthenticatedSession('tenantB');
      await onboardInstitute(cookieB, 'tenB');

      // Inst A creates enrollment
      const createReq = new NextRequest('http://localhost:3000/api/institute/enrollments', {
        method: 'POST',
        headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieA }),
        body: JSON.stringify({ studentId: studentA.id, batchId: batchA.id, status: 'active' }),
      });
      const enrA = (await (await createPOST(createReq)).json()).data;

      // Inst B tries to GET enrA -> 404
      const crossGetReq = new NextRequest(`http://localhost:3000/api/institute/enrollments/${enrA.id}`, {
        method: 'GET',
        headers: new Headers({ cookie: cookieB }),
      });
      const crossGetRes = await getByIdGET(crossGetReq, { params: Promise.resolve({ id: enrA.id }) });
      expect(crossGetRes.status).toBe(404);
    });
  });
});
