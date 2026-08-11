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
import { POST as onboardPOST } from '../../onboarding/institute/route';

describe('API /api/institute/parents Security, Validation & Tenant Isolation Suite', () => {
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
  async function createAuthenticatedSession(prefix = 'parent_api_user') {
    const email = prefix.includes('@')
      ? prefix
      : `${prefix}_${Date.now()}_${Math.floor(Math.random() * 99999)}@test.com`;
    const password = 'SecureTestPassword123!';
    const signUpResponse = await auth.api.signUpEmail({
      body: { email, password, name: 'Parent API Test User' },
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
        name: `Parent Test Institute ${suffix}`,
        phone: '+919876543210',
        email: `${suffix}_${Date.now()}@test.com`,
        slug: `prt-${suffix}-${Date.now()}-${Math.floor(Math.random() * 999)}`,
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

  // ── 1. Authentication & Method Safety Guards (PCRM-E2E-01 .. PCRM-E2E-05) ────

  describe('1. Authentication & HTTP Method Guards', () => {
    it('PCRM-E2E-01 GET list without session returns 401', async () => {
      const req = new NextRequest('http://localhost:3000/api/institute/parents', {
        method: 'GET',
      });
      const res = await listGET(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error.code).toBe('UNAUTHENTICATED');
      expect(res.headers.get('x-request-id')).toBeDefined();
    });

    it('PCRM-E2E-02 POST create without session returns 401', async () => {
      const req = new NextRequest('http://localhost:3000/api/institute/parents', {
        method: 'POST',
        headers: new Headers({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ phone: '+919876543210' }),
      });
      const res = await createPOST(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error.code).toBe('UNAUTHENTICATED');
    });

    it('PCRM-E2E-03 GET by id without session returns 401', async () => {
      const req = new NextRequest('http://localhost:3000/api/institute/parents/123e4567-e89b-12d3-a456-426614174000', {
        method: 'GET',
      });
      const res = await getByIdGET(req, { params: Promise.resolve({ id: '123e4567-e89b-12d3-a456-426614174000' }) });
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error.code).toBe('UNAUTHENTICATED');
    });

    it('PCRM-E2E-04 PATCH without session returns 401', async () => {
      const req = new NextRequest('http://localhost:3000/api/institute/parents/123e4567-e89b-12d3-a456-426614174000', {
        method: 'PATCH',
        headers: new Headers({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ notes: 'Hacked Notes' }),
      });
      const res = await updatePATCH(req, { params: Promise.resolve({ id: '123e4567-e89b-12d3-a456-426614174000' }) });
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error.code).toBe('UNAUTHENTICATED');
    });

    it('PCRM-E2E-05 DELETE (Archive) without session returns 401', async () => {
      const req = new NextRequest('http://localhost:3000/api/institute/parents/123e4567-e89b-12d3-a456-426614174000', {
        method: 'DELETE',
      });
      const res = await archiveDELETE(req, { params: Promise.resolve({ id: '123e4567-e89b-12d3-a456-426614174000' }) });
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

  // ── 2. Validation & Parameter Injection Defenses ────────────────────────────

  describe('2. Validation & Parameter Injection Defenses', () => {
    it('rejects malformed JSON payload with 400', async () => {
      const { cookieHeader } = await createAuthenticatedSession();
      await onboardInstitute(cookieHeader, 'v1');

      const req = new NextRequest('http://localhost:3000/api/institute/parents', {
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

    it('rejects payload missing phone with 400', async () => {
      const { cookieHeader } = await createAuthenticatedSession();
      await onboardInstitute(cookieHeader, 'v2');

      const req = new NextRequest('http://localhost:3000/api/institute/parents', {
        method: 'POST',
        headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieHeader }),
        body: JSON.stringify({ notes: 'Some notes' }),
      });

      const res = await createPOST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects forbidden parameter injection (instituteId, parentIdentityId) via .strict() schema', async () => {
      const { cookieHeader } = await createAuthenticatedSession();
      await onboardInstitute(cookieHeader, 'v3');

      const req = new NextRequest('http://localhost:3000/api/institute/parents', {
        method: 'POST',
        headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieHeader }),
        body: JSON.stringify({
          phone: '+919876543210',
          instituteId: 'hacked-tenant-id',
          parentIdentityId: 'hacked-parent-id',
        }),
      });

      const res = await createPOST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects PATCH attempt to mutate instituteId or parentIdentityId', async () => {
      const { cookieHeader } = await createAuthenticatedSession();
      await onboardInstitute(cookieHeader, 'v4');

      // First create valid parent
      const createReq = new NextRequest('http://localhost:3000/api/institute/parents', {
        method: 'POST',
        headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieHeader }),
        body: JSON.stringify({ phone: '+919876543210', notes: 'Initial' }),
      });
      const createRes = await createPOST(createReq);
      const parentData = (await createRes.json()).data;

      // Attempt forbidden PATCH
      const patchReq = new NextRequest(`http://localhost:3000/api/institute/parents/${parentData.id}`, {
        method: 'PATCH',
        headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieHeader }),
        body: JSON.stringify({
          instituteId: 'forbidden-inst-id',
          parentIdentityId: 'forbidden-parent-id',
        }),
      });

      const patchRes = await updatePATCH(patchReq, { params: Promise.resolve({ id: parentData.id }) });
      expect(patchRes.status).toBe(400);
    });

    it('rejects invalid UUID in path parameter', async () => {
      const { cookieHeader } = await createAuthenticatedSession();
      await onboardInstitute(cookieHeader, 'v5');

      const req = new NextRequest('http://localhost:3000/api/institute/parents/not-a-uuid', {
        method: 'GET',
        headers: new Headers({ cookie: cookieHeader }),
      });

      const res = await getByIdGET(req, { params: Promise.resolve({ id: 'not-a-uuid' }) });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // ── 3. Core CRUD & Multi-Tenant Lifecycle ───────────────────────────────────

  describe('3. Core CRUD & Multi-Tenant Isolation', () => {
    it('creates, lists, gets, updates, and archives a parent CRM record for an institute', async () => {
      const { cookieHeader } = await createAuthenticatedSession();
      const inst = await onboardInstitute(cookieHeader, 'crud1');

      // 1. Create parent
      const createReq = new NextRequest('http://localhost:3000/api/institute/parents', {
        method: 'POST',
        headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieHeader }),
        body: JSON.stringify({
          phone: '+919876543210',
          name: 'Sharma Parent',
          notes: 'Wants morning updates',
        }),
      });
      const createRes = await createPOST(createReq);
      expect(createRes.status).toBe(201);
      const created = (await createRes.json()).data;
      expect(created.id).toBeDefined();
      expect(created.instituteId).toBe(inst.id);
      expect(created.parentIdentityId).toBeDefined();
      expect(created.parentIdentity?.phone).toBe('+919876543210');
      expect(created.parentIdentity?.name).toBe('Sharma Parent');
      expect(created.notes).toBe('Wants morning updates');
      expect(created.status).toBe('active');

      // 2. Get by ID
      const getReq = new NextRequest(`http://localhost:3000/api/institute/parents/${created.id}`, {
        method: 'GET',
        headers: new Headers({ cookie: cookieHeader }),
      });
      const getRes = await getByIdGET(getReq, { params: Promise.resolve({ id: created.id }) });
      expect(getRes.status).toBe(200);
      const fetched = (await getRes.json()).data;
      expect(fetched.id).toBe(created.id);
      expect(fetched.parentIdentity?.name).toBe('Sharma Parent');

      // 3. List parents
      const listReq = new NextRequest('http://localhost:3000/api/institute/parents', {
        method: 'GET',
        headers: new Headers({ cookie: cookieHeader }),
      });
      const listRes = await listGET(listReq);
      expect(listRes.status).toBe(200);
      const listData = (await listRes.json()).data;
      expect(Array.isArray(listData)).toBe(true);
      expect(listData.length).toBe(1);
      expect(listData[0].id).toBe(created.id);

      // 4. Update notes
      const patchReq = new NextRequest(`http://localhost:3000/api/institute/parents/${created.id}`, {
        method: 'PATCH',
        headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieHeader }),
        body: JSON.stringify({ notes: 'Updated preference: evening updates' }),
      });
      const patchRes = await updatePATCH(patchReq, { params: Promise.resolve({ id: created.id }) });
      expect(patchRes.status).toBe(200);
      const updated = (await patchRes.json()).data;
      expect(updated.notes).toBe('Updated preference: evening updates');

      // 5. Soft Archive (DELETE)
      const archiveReq = new NextRequest(`http://localhost:3000/api/institute/parents/${created.id}`, {
        method: 'DELETE',
        headers: new Headers({ cookie: cookieHeader }),
      });
      const archiveRes = await archiveDELETE(archiveReq, { params: Promise.resolve({ id: created.id }) });
      expect(archiveRes.status).toBe(200);
      const archived = (await archiveRes.json()).data;
      expect(archived.status).toBe('inactive');
    });

    it('returns 409 Conflict when attempting to register duplicate phone in same institute', async () => {
      const { cookieHeader } = await createAuthenticatedSession();
      await onboardInstitute(cookieHeader, 'dup1');

      const phone = '+919999888877';
      const req1 = new NextRequest('http://localhost:3000/api/institute/parents', {
        method: 'POST',
        headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieHeader }),
        body: JSON.stringify({ phone, name: 'First Attempt' }),
      });
      const res1 = await createPOST(req1);
      expect(res1.status).toBe(201);

      const req2 = new NextRequest('http://localhost:3000/api/institute/parents', {
        method: 'POST',
        headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieHeader }),
        body: JSON.stringify({ phone, name: 'Second Duplicate Attempt' }),
      });
      const res2 = await createPOST(req2);
      expect(res2.status).toBe(409);
      const json2 = await res2.json();
      expect(json2.error.code).toBe('CONFLICT');
    });

    it('strictly enforces multi-tenant isolation across two separate institutes', async () => {
      // Setup Institute A
      const { cookieHeader: cookieA } = await createAuthenticatedSession('ownerA');
      const instA = await onboardInstitute(cookieA, 'instA');

      // Setup Institute B
      const { cookieHeader: cookieB } = await createAuthenticatedSession('ownerB');
      const instB = await onboardInstitute(cookieB, 'instB');

      const sharedPhone = '+919876500000';

      // 1. Inst A creates parent for sharedPhone
      const reqCreateA = new NextRequest('http://localhost:3000/api/institute/parents', {
        method: 'POST',
        headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieA }),
        body: JSON.stringify({ phone: sharedPhone, notes: 'Inst A Notes' }),
      });
      const resCreateA = await createPOST(reqCreateA);
      expect(resCreateA.status).toBe(201);
      const parentA = (await resCreateA.json()).data;

      // 2. Inst B creates parent for SAME sharedPhone
      const reqCreateB = new NextRequest('http://localhost:3000/api/institute/parents', {
        method: 'POST',
        headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieB }),
        body: JSON.stringify({ phone: sharedPhone, notes: 'Inst B Notes' }),
      });
      const resCreateB = await createPOST(reqCreateB);
      expect(resCreateB.status).toBe(201);
      const parentB = (await resCreateB.json()).data;

      // Invariants: same global parentIdentityId, different InstituteParent IDs & instituteIds
      expect(parentA.parentIdentityId).toBe(parentB.parentIdentityId);
      expect(parentA.id).not.toBe(parentB.id);
      expect(parentA.instituteId).toBe(instA.id);
      expect(parentB.instituteId).toBe(instB.id);

      // 3. Inst B tries to GET parentA by ID -> returns 404
      const reqCrossGet = new NextRequest(`http://localhost:3000/api/institute/parents/${parentA.id}`, {
        method: 'GET',
        headers: new Headers({ cookie: cookieB }),
      });
      const resCrossGet = await getByIdGET(reqCrossGet, { params: Promise.resolve({ id: parentA.id }) });
      expect(resCrossGet.status).toBe(404);

      // 4. Inst B tries to PATCH parentA -> returns 404
      const reqCrossPatch = new NextRequest(`http://localhost:3000/api/institute/parents/${parentA.id}`, {
        method: 'PATCH',
        headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieB }),
        body: JSON.stringify({ notes: 'Hacked Notes' }),
      });
      const resCrossPatch = await updatePATCH(reqCrossPatch, { params: Promise.resolve({ id: parentA.id }) });
      expect(resCrossPatch.status).toBe(404);

      // 5. Inst A archives parentA -> parentA is inactive, parentB remains active
      const reqArchiveA = new NextRequest(`http://localhost:3000/api/institute/parents/${parentA.id}`, {
        method: 'DELETE',
        headers: new Headers({ cookie: cookieA }),
      });
      const resArchiveA = await archiveDELETE(reqArchiveA, { params: Promise.resolve({ id: parentA.id }) });
      expect(resArchiveA.status).toBe(200);

      // Verify Inst B parent status is untouched
      const reqGetB = new NextRequest(`http://localhost:3000/api/institute/parents/${parentB.id}`, {
        method: 'GET',
        headers: new Headers({ cookie: cookieB }),
      });
      const resGetB = await getByIdGET(reqGetB, { params: Promise.resolve({ id: parentB.id }) });
      expect(resGetB.status).toBe(200);
      const fetchedB = (await resGetB.json()).data;
      expect(fetchedB.status).toBe('active');
    });
  });
});
