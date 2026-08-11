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
import { GET as getByIdGET, PATCH as updatePATCH, DELETE as archiveDELETE, POST as idPOST, PUT as idPUT } from './[id]/route';
import { POST as admitPOST } from './[id]/admit/route';
import { POST as rejectPOST } from './[id]/reject/route';
import { POST as cancelPOST } from './[id]/cancel/route';
import { POST as activatePOST } from './[id]/activate/route';
import { POST as deactivatePOST } from './[id]/deactivate/route';
import { POST as archiveEndpointPOST } from './[id]/archive/route';
import { POST as onboardPOST } from '../../onboarding/institute/route';

describe('API /api/institute/students Security, Validation & Tenant Isolation Suite', () => {
  beforeAll(() => {
    validateTestEnvironment();
  });

  beforeEach(async () => {
    await cleanTestDatabase();
  });

  afterAll(async () => {
    await closeTestPool();
  });

  /**
   * Helper: create an authenticated user session via Better Auth API.
   */
  async function createAuthenticatedSession(prefix = 'student_api_user') {
    const email = prefix.includes('@')
      ? prefix
      : `${prefix}_${Date.now()}_${Math.floor(Math.random() * 99999)}@test.com`;
    const password = 'SecureTestPassword123!';
    const signUpResponse = await auth.api.signUpEmail({
      body: { email, password, name: 'Student API Test User' },
      asResponse: true,
    });

    const cookieHeader = signUpResponse.headers.get('set-cookie');
    if (!cookieHeader) throw new Error('No set-cookie header from Better Auth signUpEmail');

    const user = await db.user.findFirstOrThrow({ where: { email: email.toLowerCase() } });
    const headers = new Headers({ cookie: cookieHeader });

    return { user, headers, cookieHeader };
  }

  /**
   * Helper: onboard an institute for the user session.
   */
  async function onboardInstitute(cookieHeader: string, suffix: string) {
    const onboardHeaders = new Headers({
      'Content-Type': 'application/json',
      cookie: cookieHeader,
    });
    const req = new NextRequest('http://localhost:3000/api/onboarding/institute', {
      method: 'POST',
      headers: onboardHeaders,
      body: JSON.stringify({
        name: `Student Test Institute ${suffix}`,
        phone: '+919876543210',
        email: `${suffix}_${Date.now()}@test.com`,
        slug: `std-${suffix}-${Date.now()}-${Math.floor(Math.random() * 999)}`,
      }),
    });
    const res = await onboardPOST(req);
    if (res.status !== 201) {
      const body = await res.json();
      throw new Error(`Onboarding failed: ${JSON.stringify(body)}`);
    }
    const body = await res.json();
    return body.data.institute;
  }

  // ── 1. Authentication & HTTP Method Safety Guards (STUDENT-API-01 .. 05) ────

  describe('1. Authentication & HTTP Method Guards', () => {
    it('STUDENT-API-01 GET list without session returns 401', async () => {
      const req = new NextRequest('http://localhost:3000/api/institute/students', {
        method: 'GET',
      });
      const res = await listGET(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error.code).toBe('UNAUTHENTICATED');
      expect(res.headers.get('x-request-id')).toBeDefined();
    });

    it('STUDENT-API-02 POST create without session returns 401', async () => {
      const req = new NextRequest('http://localhost:3000/api/institute/students', {
        method: 'POST',
        headers: new Headers({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          admissionNumber: 'ADM-101',
          firstName: 'Rahul',
          lastName: 'Sharma',
        }),
      });
      const res = await createPOST(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error.code).toBe('UNAUTHENTICATED');
    });

    it('STUDENT-API-03 GET by id without session returns 401', async () => {
      const req = new NextRequest(
        'http://localhost:3000/api/institute/students/123e4567-e89b-12d3-a456-426614174000',
        { method: 'GET' },
      );
      const res = await getByIdGET(req, {
        params: Promise.resolve({ id: '123e4567-e89b-12d3-a456-426614174000' }),
      });
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error.code).toBe('UNAUTHENTICATED');
    });

    it('STUDENT-API-04 PATCH without session returns 401', async () => {
      const req = new NextRequest(
        'http://localhost:3000/api/institute/students/123e4567-e89b-12d3-a456-426614174000',
        {
          method: 'PATCH',
          headers: new Headers({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ firstName: 'Hacked' }),
        },
      );
      const res = await updatePATCH(req, {
        params: Promise.resolve({ id: '123e4567-e89b-12d3-a456-426614174000' }),
      });
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error.code).toBe('UNAUTHENTICATED');
    });

    it('STUDENT-API-05 DELETE without session returns 401', async () => {
      const req = new NextRequest(
        'http://localhost:3000/api/institute/students/123e4567-e89b-12d3-a456-426614174000',
        { method: 'DELETE' },
      );
      const res = await archiveDELETE(req, {
        params: Promise.resolve({ id: '123e4567-e89b-12d3-a456-426614174000' }),
      });
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error.code).toBe('UNAUTHENTICATED');
    });

    it('returns 405 Method Not Allowed for unsupported HTTP methods', async () => {
      const rootPutRes = await rootPUT();
      expect(rootPutRes.status).toBe(405);
      expect(rootPutRes.headers.get('Allow')).toBe('GET, POST');

      const rootPatchRes = await rootPATCH();
      expect(rootPatchRes.status).toBe(405);

      const rootDeleteRes = await rootDELETE();
      expect(rootDeleteRes.status).toBe(405);

      const idPostRes = await idPOST();
      expect(idPostRes.status).toBe(405);
      expect(idPostRes.headers.get('Allow')).toBe('GET, PATCH, DELETE');

      const idPutRes = await idPUT();
      expect(idPutRes.status).toBe(405);
    });
  });

  // ── 2. Validation & Parameter Injection Defenses (STUDENT-API-20 .. 39) ────

  describe('2. Validation & Parameter Injection Defenses', () => {
    it('rejects malformed JSON payload with 400', async () => {
      const { cookieHeader } = await createAuthenticatedSession();
      await onboardInstitute(cookieHeader, 'v1');

      const req = new NextRequest('http://localhost:3000/api/institute/students', {
        method: 'POST',
        headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieHeader }),
        body: 'invalid-json-{',
      });

      const res = await createPOST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe('VALIDATION_ERROR');
      expect(json.error.message).toContain('Malformed JSON');
    });

    it('rejects payload missing required fields (admissionNumber, firstName, lastName)', async () => {
      const { cookieHeader } = await createAuthenticatedSession();
      await onboardInstitute(cookieHeader, 'v2');

      const req = new NextRequest('http://localhost:3000/api/institute/students', {
        method: 'POST',
        headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieHeader }),
        body: JSON.stringify({ firstName: 'OnlyFirst' }),
      });

      const res = await createPOST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects client parameter injection (instituteId, status, admissionStatus, deletedAt) via .strict() schema', async () => {
      const { cookieHeader } = await createAuthenticatedSession();
      await onboardInstitute(cookieHeader, 'v3');

      const req = new NextRequest('http://localhost:3000/api/institute/students', {
        method: 'POST',
        headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieHeader }),
        body: JSON.stringify({
          admissionNumber: 'ADM-999',
          firstName: 'Rahul',
          lastName: 'Kumar',
          instituteId: 'hacked-tenant-id',
          admissionStatus: 'admitted',
          status: 'active',
          deletedAt: '2026-01-01T00:00:00.000Z',
        }),
      });

      const res = await createPOST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects PATCH attempt to mutate immutable fields (admissionNumber, instituteId, status)', async () => {
      const { cookieHeader } = await createAuthenticatedSession();
      await onboardInstitute(cookieHeader, 'v4');

      // Create student
      const createReq = new NextRequest('http://localhost:3000/api/institute/students', {
        method: 'POST',
        headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieHeader }),
        body: JSON.stringify({
          admissionNumber: 'ADM-200',
          firstName: 'Ankit',
          lastName: 'Verma',
        }),
      });
      const createRes = await createPOST(createReq);
      const studentData = (await createRes.json()).data;

      // Attempt forbidden PATCH
      const patchReq = new NextRequest(`http://localhost:3000/api/institute/students/${studentData.id}`, {
        method: 'PATCH',
        headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieHeader }),
        body: JSON.stringify({
          admissionNumber: 'ADM-MODIFIED',
          instituteId: 'forbidden-inst-id',
        }),
      });

      const patchRes = await updatePATCH(patchReq, { params: Promise.resolve({ id: studentData.id }) });
      expect(patchRes.status).toBe(400);
    });

    it('rejects empty PATCH body with 400', async () => {
      const { cookieHeader } = await createAuthenticatedSession();
      await onboardInstitute(cookieHeader, 'v5');

      const createReq = new NextRequest('http://localhost:3000/api/institute/students', {
        method: 'POST',
        headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieHeader }),
        body: JSON.stringify({
          admissionNumber: 'ADM-201',
          firstName: 'Priya',
          lastName: 'Singh',
        }),
      });
      const createRes = await createPOST(createReq);
      const studentData = (await createRes.json()).data;

      const patchReq = new NextRequest(`http://localhost:3000/api/institute/students/${studentData.id}`, {
        method: 'PATCH',
        headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieHeader }),
        body: JSON.stringify({}),
      });

      const patchRes = await updatePATCH(patchReq, { params: Promise.resolve({ id: studentData.id }) });
      expect(patchRes.status).toBe(400);
    });

    it('rejects invalid UUID in path parameter', async () => {
      const { cookieHeader } = await createAuthenticatedSession();
      await onboardInstitute(cookieHeader, 'v6');

      const req = new NextRequest('http://localhost:3000/api/institute/students/not-a-uuid', {
        method: 'GET',
        headers: new Headers({ cookie: cookieHeader }),
      });

      const res = await getByIdGET(req, { params: Promise.resolve({ id: 'not-a-uuid' }) });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // ── 3. Core CRUD & Multi-Tenant Isolation (STUDENT-API-13 .. 19) ─────────────

  describe('3. Core CRUD & Multi-Tenant Isolation', () => {
    it('creates, lists, gets, updates, and archives a student record for an institute', async () => {
      const { cookieHeader } = await createAuthenticatedSession();
      const inst = await onboardInstitute(cookieHeader, 'crud1');

      // 1. Create student
      const createReq = new NextRequest('http://localhost:3000/api/institute/students', {
        method: 'POST',
        headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieHeader }),
        body: JSON.stringify({
          admissionNumber: 'ADM-001',
          firstName: 'Aarav',
          lastName: 'Patel',
          email: 'aarav@example.com',
          phone: '+919876543210',
          gender: 'male',
          dateOfBirth: '2010-05-15',
        }),
      });
      const createRes = await createPOST(createReq);
      expect(createRes.status).toBe(201);
      const created = (await createRes.json()).data;
      expect(created.id).toBeDefined();
      expect(created.instituteId).toBe(inst.id);
      expect(created.admissionNumber).toBe('ADM-001');
      expect(created.firstName).toBe('Aarav');
      expect(created.lastName).toBe('Patel');
      expect(created.admissionStatus).toBe('pending');
      expect(created.status).toBe('inactive');

      // 2. Get by ID
      const getReq = new NextRequest(`http://localhost:3000/api/institute/students/${created.id}`, {
        method: 'GET',
        headers: new Headers({ cookie: cookieHeader }),
      });
      const getRes = await getByIdGET(getReq, { params: Promise.resolve({ id: created.id }) });
      expect(getRes.status).toBe(200);
      const fetched = (await getRes.json()).data;
      expect(fetched.id).toBe(created.id);
      expect(fetched.firstName).toBe('Aarav');

      // 3. List students
      const listReq = new NextRequest('http://localhost:3000/api/institute/students', {
        method: 'GET',
        headers: new Headers({ cookie: cookieHeader }),
      });
      const listRes = await listGET(listReq);
      expect(listRes.status).toBe(200);
      const listData = (await listRes.json()).data;
      expect(Array.isArray(listData)).toBe(true);
      expect(listData.length).toBe(1);
      expect(listData[0].id).toBe(created.id);

      // 4. Update details
      const patchReq = new NextRequest(`http://localhost:3000/api/institute/students/${created.id}`, {
        method: 'PATCH',
        headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieHeader }),
        body: JSON.stringify({ firstName: 'Aarav Updated', city: 'Mumbai' }),
      });
      const patchRes = await updatePATCH(patchReq, { params: Promise.resolve({ id: created.id }) });
      expect(patchRes.status).toBe(200);
      const updated = (await patchRes.json()).data;
      expect(updated.firstName).toBe('Aarav Updated');
      expect(updated.city).toBe('Mumbai');

      // 5. Soft Archive (DELETE)
      const archiveReq = new NextRequest(`http://localhost:3000/api/institute/students/${created.id}`, {
        method: 'DELETE',
        headers: new Headers({ cookie: cookieHeader }),
      });
      const archiveRes = await archiveDELETE(archiveReq, { params: Promise.resolve({ id: created.id }) });
      expect(archiveRes.status).toBe(200);
      const archived = (await archiveRes.json()).data;
      expect(archived.status).toBe('archived');
      expect(archived.deletedAt).toBeDefined();
    });

    it('returns 409 Conflict when creating duplicate admission number in same institute', async () => {
      const { cookieHeader } = await createAuthenticatedSession();
      await onboardInstitute(cookieHeader, 'dup1');

      const req1 = new NextRequest('http://localhost:3000/api/institute/students', {
        method: 'POST',
        headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieHeader }),
        body: JSON.stringify({
          admissionNumber: 'ADM-DUP-01',
          firstName: 'Student',
          lastName: 'One',
        }),
      });
      const res1 = await createPOST(req1);
      expect(res1.status).toBe(201);

      const req2 = new NextRequest('http://localhost:3000/api/institute/students', {
        method: 'POST',
        headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieHeader }),
        body: JSON.stringify({
          admissionNumber: 'ADM-DUP-01',
          firstName: 'Student',
          lastName: 'Two',
        }),
      });
      const res2 = await createPOST(req2);
      expect(res2.status).toBe(409);
      const json2 = await res2.json();
      expect(json2.error.code).toBe('CONFLICT');
    });

    it('allows same admission number in different institutes', async () => {
      const { cookieHeader: cookieA } = await createAuthenticatedSession('ownerA');
      await onboardInstitute(cookieA, 'instA');

      const { cookieHeader: cookieB } = await createAuthenticatedSession('ownerB');
      await onboardInstitute(cookieB, 'instB');

      const admissionNumber = 'ADM-SHARED-100';

      const reqA = new NextRequest('http://localhost:3000/api/institute/students', {
        method: 'POST',
        headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieA }),
        body: JSON.stringify({ admissionNumber, firstName: 'InstA', lastName: 'Student' }),
      });
      const resA = await createPOST(reqA);
      expect(resA.status).toBe(201);

      const reqB = new NextRequest('http://localhost:3000/api/institute/students', {
        method: 'POST',
        headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieB }),
        body: JSON.stringify({ admissionNumber, firstName: 'InstB', lastName: 'Student' }),
      });
      const resB = await createPOST(reqB);
      expect(resB.status).toBe(201);
    });

    it('strictly enforces multi-tenant isolation across two separate institutes', async () => {
      const { cookieHeader: cookieA } = await createAuthenticatedSession('ownerIsoA');
      const instA = await onboardInstitute(cookieA, 'isoA');

      const { cookieHeader: cookieB } = await createAuthenticatedSession('ownerIsoB');
      const instB = await onboardInstitute(cookieB, 'isoB');

      expect(instA.id).not.toBe(instB.id);

      // Inst A creates student
      const reqCreateA = new NextRequest('http://localhost:3000/api/institute/students', {
        method: 'POST',
        headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieA }),
        body: JSON.stringify({ admissionNumber: 'ADM-ISO-A', firstName: 'Student', lastName: 'A' }),
      });
      const resCreateA = await createPOST(reqCreateA);
      expect(resCreateA.status).toBe(201);
      const studentA = (await resCreateA.json()).data;

      // Inst B tries to GET studentA -> 404
      const reqCrossGet = new NextRequest(`http://localhost:3000/api/institute/students/${studentA.id}`, {
        method: 'GET',
        headers: new Headers({ cookie: cookieB }),
      });
      const resCrossGet = await getByIdGET(reqCrossGet, { params: Promise.resolve({ id: studentA.id }) });
      expect(resCrossGet.status).toBe(404);

      // Inst B tries to PATCH studentA -> 404
      const reqCrossPatch = new NextRequest(`http://localhost:3000/api/institute/students/${studentA.id}`, {
        method: 'PATCH',
        headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieB }),
        body: JSON.stringify({ firstName: 'Hacked' }),
      });
      const resCrossPatch = await updatePATCH(reqCrossPatch, { params: Promise.resolve({ id: studentA.id }) });
      expect(resCrossPatch.status).toBe(404);

      // Inst B tries to archive studentA -> 404
      const reqCrossArchive = new NextRequest(`http://localhost:3000/api/institute/students/${studentA.id}`, {
        method: 'DELETE',
        headers: new Headers({ cookie: cookieB }),
      });
      const resCrossArchive = await archiveDELETE(reqCrossArchive, { params: Promise.resolve({ id: studentA.id }) });
      expect(resCrossArchive.status).toBe(404);
    });
  });

  // ── 4. Admission Lifecycle & Transition Rules (STUDENT-API-43 .. 51) ──────────

  describe('4. Admission & Standing Lifecycle Rules', () => {
    it('executes admission workflow: admit pending student and auto-activates status', async () => {
      const { cookieHeader } = await createAuthenticatedSession();
      await onboardInstitute(cookieHeader, 'adm1');

      // Create student (pending/inactive)
      const createReq = new NextRequest('http://localhost:3000/api/institute/students', {
        method: 'POST',
        headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieHeader }),
        body: JSON.stringify({ admissionNumber: 'ADM-ADMIT-1', firstName: 'Vijay', lastName: 'Kumar' }),
      });
      const createRes = await createPOST(createReq);
      const student = (await createRes.json()).data;
      expect(student.admissionStatus).toBe('pending');
      expect(student.status).toBe('inactive');

      // Call admit endpoint
      const admitReq = new NextRequest(`http://localhost:3000/api/institute/students/${student.id}/admit`, {
        method: 'POST',
        headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieHeader }),
        body: JSON.stringify({ admissionDate: '2026-08-01' }),
      });
      const admitRes = await admitPOST(admitReq, { params: Promise.resolve({ id: student.id }) });
      expect(admitRes.status).toBe(200);
      const admitted = (await admitRes.json()).data;
      expect(admitted.admissionStatus).toBe('admitted');
      expect(admitted.status).toBe('active');
    });

    it('rejects pending student', async () => {
      const { cookieHeader } = await createAuthenticatedSession();
      await onboardInstitute(cookieHeader, 'rej1');

      const createReq = new NextRequest('http://localhost:3000/api/institute/students', {
        method: 'POST',
        headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieHeader }),
        body: JSON.stringify({ admissionNumber: 'ADM-REJ-1', firstName: 'Rohan', lastName: 'Das' }),
      });
      const student = (await (await createPOST(createReq)).json()).data;

      const rejectReq = new NextRequest(`http://localhost:3000/api/institute/students/${student.id}/reject`, {
        method: 'POST',
        headers: new Headers({ cookie: cookieHeader }),
      });
      const rejectRes = await rejectPOST(rejectReq, { params: Promise.resolve({ id: student.id }) });
      expect(rejectRes.status).toBe(200);
      const rejected = (await rejectRes.json()).data;
      expect(rejected.admissionStatus).toBe('rejected');
      expect(rejected.status).toBe('inactive');
    });

    it('cancels pending student admission', async () => {
      const { cookieHeader } = await createAuthenticatedSession();
      await onboardInstitute(cookieHeader, 'can1');

      const createReq = new NextRequest('http://localhost:3000/api/institute/students', {
        method: 'POST',
        headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieHeader }),
        body: JSON.stringify({ admissionNumber: 'ADM-CAN-1', firstName: 'Kavita', lastName: 'Sen' }),
      });
      const student = (await (await createPOST(createReq)).json()).data;

      const cancelReq = new NextRequest(`http://localhost:3000/api/institute/students/${student.id}/cancel`, {
        method: 'POST',
        headers: new Headers({ cookie: cookieHeader }),
      });
      const cancelRes = await cancelPOST(cancelReq, { params: Promise.resolve({ id: student.id }) });
      expect(cancelRes.status).toBe(200);
      const cancelled = (await cancelRes.json()).data;
      expect(cancelled.admissionStatus).toBe('cancelled');
      expect(cancelled.status).toBe('inactive');
    });

    it('prevents activating a non-admitted student and enforces cross-state invariants', async () => {
      const { cookieHeader } = await createAuthenticatedSession();
      await onboardInstitute(cookieHeader, 'invAct');

      const createReq = new NextRequest('http://localhost:3000/api/institute/students', {
        method: 'POST',
        headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieHeader }),
        body: JSON.stringify({ admissionNumber: 'ADM-PENDING-ACT', firstName: 'Mohan', lastName: 'Lal' }),
      });
      const student = (await (await createPOST(createReq)).json()).data;

      // Attempt activation before admission
      const actReq = new NextRequest(`http://localhost:3000/api/institute/students/${student.id}/activate`, {
        method: 'POST',
        headers: new Headers({ cookie: cookieHeader }),
      });
      const actRes = await activatePOST(actReq, { params: Promise.resolve({ id: student.id }) });
      expect(actRes.status).toBe(400);
      const json = await actRes.json();
      expect(json.error.code).toBe('VALIDATION_ERROR');
      expect(json.error.message).toContain('admitted');
    });

    it('handles activate, deactivate, and archive endpoints for admitted students', async () => {
      const { cookieHeader } = await createAuthenticatedSession();
      await onboardInstitute(cookieHeader, 'lifeCycle1');

      // 1. Create and admit student
      const createReq = new NextRequest('http://localhost:3000/api/institute/students', {
        method: 'POST',
        headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieHeader }),
        body: JSON.stringify({ admissionNumber: 'ADM-LIFE-1', firstName: 'Sunita', lastName: 'Rao' }),
      });
      const student = (await (await createPOST(createReq)).json()).data;

      const admitReq = new NextRequest(`http://localhost:3000/api/institute/students/${student.id}/admit`, {
        method: 'POST',
        headers: new Headers({ cookie: cookieHeader }),
      });
      await admitPOST(admitReq, { params: Promise.resolve({ id: student.id }) });

      // 2. Deactivate student
      const deactReq = new NextRequest(`http://localhost:3000/api/institute/students/${student.id}/deactivate`, {
        method: 'POST',
        headers: new Headers({ cookie: cookieHeader }),
      });
      const deactRes = await deactivatePOST(deactReq, { params: Promise.resolve({ id: student.id }) });
      expect(deactRes.status).toBe(200);
      const deactivated = (await deactRes.json()).data;
      expect(deactivated.status).toBe('inactive');

      // 3. Reactivate student
      const reactReq = new NextRequest(`http://localhost:3000/api/institute/students/${student.id}/activate`, {
        method: 'POST',
        headers: new Headers({ cookie: cookieHeader }),
      });
      const reactRes = await activatePOST(reactReq, { params: Promise.resolve({ id: student.id }) });
      expect(reactRes.status).toBe(200);
      const reactivated = (await reactRes.json()).data;
      expect(reactivated.status).toBe('active');

      // 4. Archive student via explicit POST archive endpoint
      const archReq = new NextRequest(`http://localhost:3000/api/institute/students/${student.id}/archive`, {
        method: 'POST',
        headers: new Headers({ cookie: cookieHeader }),
      });
      const archRes = await archiveEndpointPOST(archReq, { params: Promise.resolve({ id: student.id }) });
      expect(archRes.status).toBe(200);
      const archived = (await archRes.json()).data;
      expect(archived.status).toBe('archived');
      expect(archived.deletedAt).toBeDefined();
    });
  });
});
