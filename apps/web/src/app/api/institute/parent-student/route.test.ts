import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import {
  validateTestEnvironment,
  cleanTestDatabase,
  closeTestPool,
  db,
} from '@coaching-os/database';
import { auth } from '@coaching-os/auth';
import { GET as guardiansGET, POST as guardiansPOST, PUT as guardiansPUT, PATCH as guardiansPATCH, DELETE as guardiansDELETE } from '../students/[id]/guardians/route';
import { GET as parentStudentsGET, POST as parentStudentsPOST } from '../parents/[id]/students/route';
import { GET as relGET, PATCH as relPATCH, POST as relPOST, PUT as relPUT } from './[id]/route';
import { POST as primaryPOST, GET as primaryGET } from './[id]/primary/route';
import { POST as archivePOST, GET as archiveGET } from './[id]/archive/route';
import { POST as studentPOST } from '../students/route';
import { POST as parentPOST } from '../parents/route';
import { POST as onboardPOST } from '../../onboarding/institute/route';

describe('API /api/institute/parent-student Security, Validation & Multi-Tenant Matrix Suite', () => {
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
  async function createAuthenticatedSession(prefix = 'rel_api_user') {
    const email = prefix.includes('@')
      ? prefix
      : `${prefix}_${Date.now()}_${Math.floor(Math.random() * 99999)}@test.com`;
    const password = 'SecureTestPassword123!';
    const signUpResponse = await auth.api.signUpEmail({
      body: { email, password, name: 'Relationship API Test User' },
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
        name: `Rel Test Institute ${suffix}`,
        phone: '+919876543210',
        email: `${suffix}_${Date.now()}@test.com`,
        slug: `rel-${suffix}-${Date.now()}-${Math.floor(Math.random() * 999)}`,
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

  /**
   * Helper: create parent CRM record for institute.
   */
  async function createParent(cookieHeader: string, phoneSuffix: string) {
    const req = new NextRequest('http://localhost:3000/api/institute/parents', {
      method: 'POST',
      headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieHeader }),
      body: JSON.stringify({
        phone: `+9198${phoneSuffix}`,
        name: `Parent ${phoneSuffix}`,
        notes: 'Confidential staff notes for CRM',
      }),
    });
    const res = await parentPOST(req);
    if (res.status !== 201) {
      const body = await res.json();
      throw new Error(`Parent creation failed: ${JSON.stringify(body)}`);
    }
    return (await res.json()).data;
  }

  /**
   * Helper: create admitted student record for institute.
   */
  async function createStudent(cookieHeader: string, admSuffix: string) {
    const req = new NextRequest('http://localhost:3000/api/institute/students', {
      method: 'POST',
      headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieHeader }),
      body: JSON.stringify({
        admissionNumber: `ADM-${admSuffix}`,
        firstName: 'Student',
        lastName: admSuffix,
      }),
    });
    const res = await studentPOST(req);
    if (res.status !== 201) {
      const body = await res.json();
      throw new Error(`Student creation failed: ${JSON.stringify(body)}`);
    }
    return (await res.json()).data;
  }

  // ── 1. Authentication & HTTP Method Safety Guards (REL-API-01 .. 07) ───────

  describe('1. Authentication & HTTP Method Guards', () => {
    it('REL-API-01 GET guardians without session returns 401', async () => {
      const req = new NextRequest('http://localhost:3000/api/institute/students/123e4567-e89b-12d3-a456-426614174000/guardians', {
        method: 'GET',
      });
      const res = await guardiansGET(req, { params: Promise.resolve({ id: '123e4567-e89b-12d3-a456-426614174000' }) });
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error.code).toBe('UNAUTHENTICATED');
    });

    it('REL-API-02 POST guardian creation without session returns 401', async () => {
      const req = new NextRequest('http://localhost:3000/api/institute/students/123e4567-e89b-12d3-a456-426614174000/guardians', {
        method: 'POST',
        headers: new Headers({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          instituteParentId: '123e4567-e89b-12d3-a456-426614174001',
          relationshipType: 'father',
        }),
      });
      const res = await guardiansPOST(req, { params: Promise.resolve({ id: '123e4567-e89b-12d3-a456-426614174000' }) });
      expect(res.status).toBe(401);
    });

    it('REL-API-03 GET parent students without session returns 401', async () => {
      const req = new NextRequest('http://localhost:3000/api/institute/parents/123e4567-e89b-12d3-a456-426614174000/students', {
        method: 'GET',
      });
      const res = await parentStudentsGET(req, { params: Promise.resolve({ id: '123e4567-e89b-12d3-a456-426614174000' }) });
      expect(res.status).toBe(401);
    });

    it('REL-API-04 GET relationship detail without session returns 401', async () => {
      const req = new NextRequest('http://localhost:3000/api/institute/parent-student/123e4567-e89b-12d3-a456-426614174000', {
        method: 'GET',
      });
      const res = await relGET(req, { params: Promise.resolve({ id: '123e4567-e89b-12d3-a456-426614174000' }) });
      expect(res.status).toBe(401);
    });

    it('REL-API-05 PATCH relationship without session returns 401', async () => {
      const req = new NextRequest('http://localhost:3000/api/institute/parent-student/123e4567-e89b-12d3-a456-426614174000', {
        method: 'PATCH',
        headers: new Headers({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ relationshipType: 'mother' }),
      });
      const res = await relPATCH(req, { params: Promise.resolve({ id: '123e4567-e89b-12d3-a456-426614174000' }) });
      expect(res.status).toBe(401);
    });

    it('REL-API-06 POST primary without session returns 401', async () => {
      const req = new NextRequest('http://localhost:3000/api/institute/parent-student/123e4567-e89b-12d3-a456-426614174000/primary', {
        method: 'POST',
      });
      const res = await primaryPOST(req, { params: Promise.resolve({ id: '123e4567-e89b-12d3-a456-426614174000' }) });
      expect(res.status).toBe(401);
    });

    it('REL-API-07 POST archive without session returns 401', async () => {
      const req = new NextRequest('http://localhost:3000/api/institute/parent-student/123e4567-e89b-12d3-a456-426614174000/archive', {
        method: 'POST',
      });
      const res = await archivePOST(req, { params: Promise.resolve({ id: '123e4567-e89b-12d3-a456-426614174000' }) });
      expect(res.status).toBe(401);
    });

    it('returns 405 Method Not Allowed for unsupported HTTP methods', async () => {
      const gPut = await guardiansPUT();
      expect(gPut.status).toBe(405);
      expect(gPut.headers.get('Allow')).toBe('GET, POST');

      const gPatch = await guardiansPATCH();
      expect(gPatch.status).toBe(405);

      const gDelete = await guardiansDELETE();
      expect(gDelete.status).toBe(405);

      const psPost = await parentStudentsPOST();
      expect(psPost.status).toBe(405);
      expect(psPost.headers.get('Allow')).toBe('GET');

      const relPost = await relPOST();
      expect(relPost.status).toBe(405);
      expect(relPost.headers.get('Allow')).toBe('GET, PATCH, DELETE');

      const relPut = await relPUT();
      expect(relPut.status).toBe(405);

      const primGet = await primaryGET();
      expect(primGet.status).toBe(405);
      expect(primGet.headers.get('Allow')).toBe('POST');

      const archGet = await archiveGET();
      expect(archGet.status).toBe(405);
      expect(archGet.headers.get('Allow')).toBe('POST');
    });
  });

  // ── 2. Validation & Strict Schema Invariants ────────────────────────────────

  describe('2. Validation & Schema Invariants', () => {
    it('rejects malformed JSON payload with 400', async () => {
      const { cookieHeader } = await createAuthenticatedSession();
      await onboardInstitute(cookieHeader, 'val1');

      const req = new NextRequest('http://localhost:3000/api/institute/students/123e4567-e89b-12d3-a456-426614174000/guardians', {
        method: 'POST',
        headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieHeader }),
        body: 'invalid-json-{',
      });
      const res = await guardiansPOST(req, { params: Promise.resolve({ id: '123e4567-e89b-12d3-a456-426614174000' }) });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects payload missing required instituteParentId or relationshipType', async () => {
      const { cookieHeader } = await createAuthenticatedSession();
      await onboardInstitute(cookieHeader, 'val2');

      const req = new NextRequest('http://localhost:3000/api/institute/students/123e4567-e89b-12d3-a456-426614174000/guardians', {
        method: 'POST',
        headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieHeader }),
        body: JSON.stringify({ isPrimary: true }),
      });
      const res = await guardiansPOST(req, { params: Promise.resolve({ id: '123e4567-e89b-12d3-a456-426614174000' }) });
      expect(res.status).toBe(400);
    });

    it('rejects forbidden payload parameter injection (instituteId, studentId, status, deletedAt) via .strict() schema', async () => {
      const { cookieHeader } = await createAuthenticatedSession();
      await onboardInstitute(cookieHeader, 'val3');

      const req = new NextRequest('http://localhost:3000/api/institute/students/123e4567-e89b-12d3-a456-426614174000/guardians', {
        method: 'POST',
        headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieHeader }),
        body: JSON.stringify({
          instituteParentId: '123e4567-e89b-12d3-a456-426614174001',
          relationshipType: 'father',
          instituteId: 'hacked-tenant-id',
          studentId: 'override-student-id',
          status: 'active',
          deletedAt: null,
        }),
      });
      const res = await guardiansPOST(req, { params: Promise.resolve({ id: '123e4567-e89b-12d3-a456-426614174000' }) });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects invalid relationship taxonomy type', async () => {
      const { cookieHeader } = await createAuthenticatedSession();
      await onboardInstitute(cookieHeader, 'val4');

      const req = new NextRequest('http://localhost:3000/api/institute/students/123e4567-e89b-12d3-a456-426614174000/guardians', {
        method: 'POST',
        headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieHeader }),
        body: JSON.stringify({
          instituteParentId: '123e4567-e89b-12d3-a456-426614174001',
          relationshipType: 'alien_neighbor',
        }),
      });
      const res = await guardiansPOST(req, { params: Promise.resolve({ id: '123e4567-e89b-12d3-a456-426614174000' }) });
      expect(res.status).toBe(400);
    });

    it('rejects invalid UUID format in route parameter', async () => {
      const { cookieHeader } = await createAuthenticatedSession();
      await onboardInstitute(cookieHeader, 'val5');

      const req = new NextRequest('http://localhost:3000/api/institute/students/not-a-uuid/guardians', {
        method: 'GET',
        headers: new Headers({ cookie: cookieHeader }),
      });
      const res = await guardiansGET(req, { params: Promise.resolve({ id: 'not-a-uuid' }) });
      expect(res.status).toBe(400);
    });
  });

  // ── 3. Core Relationship Lifecycle & Multi-Tenant Security Matrix ───────────

  describe('3. Core Relationship Lifecycle & Multi-Tenant Matrix', () => {
    it('creates, lists, gets, updates, sets primary, and archives relationship', async () => {
      const { cookieHeader } = await createAuthenticatedSession();
      const inst = await onboardInstitute(cookieHeader, 'relCrud1');

      const parent = await createParent(cookieHeader, '76543210');
      const student = await createStudent(cookieHeader, 'RC-001');

      // 1. Create Relationship
      const createReq = new NextRequest(`http://localhost:3000/api/institute/students/${student.id}/guardians`, {
        method: 'POST',
        headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieHeader }),
        body: JSON.stringify({
          instituteParentId: parent.id,
          relationshipType: 'father',
          isPrimary: false,
        }),
      });
      const createRes = await guardiansPOST(createReq, { params: Promise.resolve({ id: student.id }) });
      expect(createRes.status).toBe(201);
      const createdRel = (await createRes.json()).data;
      expect(createdRel.id).toBeDefined();
      expect(createdRel.instituteId).toBe(inst.id);
      expect(createdRel.instituteParentId).toBe(parent.id);
      expect(createdRel.studentId).toBe(student.id);
      expect(createdRel.relationshipType).toBe('father');
      expect(createdRel.isPrimary).toBe(false);
      expect(createdRel.status).toBe('active');

      // 2. Get Relationship by ID
      const getReq = new NextRequest(`http://localhost:3000/api/institute/parent-student/${createdRel.id}`, {
        method: 'GET',
        headers: new Headers({ cookie: cookieHeader }),
      });
      const getRes = await relGET(getReq, { params: Promise.resolve({ id: createdRel.id }) });
      expect(getRes.status).toBe(200);
      const fetchedRel = (await getRes.json()).data;
      expect(fetchedRel.id).toBe(createdRel.id);

      // 3. List Guardians for Student
      const listGuardiansReq = new NextRequest(`http://localhost:3000/api/institute/students/${student.id}/guardians`, {
        method: 'GET',
        headers: new Headers({ cookie: cookieHeader }),
      });
      const listGuardiansRes = await guardiansGET(listGuardiansReq, { params: Promise.resolve({ id: student.id }) });
      expect(listGuardiansRes.status).toBe(200);
      const guardiansList = (await listGuardiansRes.json()).data;
      expect(guardiansList).toHaveLength(1);
      expect(guardiansList[0].id).toBe(createdRel.id);
      expect(guardiansList[0].relationshipType).toBe('father');

      // 4. List Students for Parent
      const listStudentsReq = new NextRequest(`http://localhost:3000/api/institute/parents/${parent.id}/students`, {
        method: 'GET',
        headers: new Headers({ cookie: cookieHeader }),
      });
      const listStudentsRes = await parentStudentsGET(listStudentsReq, { params: Promise.resolve({ id: parent.id }) });
      expect(listStudentsRes.status).toBe(200);
      const studentsList = (await listStudentsRes.json()).data;
      expect(studentsList).toHaveLength(1);
      expect(studentsList[0].id).toBe(createdRel.id);

      // 5. Update Relationship Type (PATCH)
      const patchReq = new NextRequest(`http://localhost:3000/api/institute/parent-student/${createdRel.id}`, {
        method: 'PATCH',
        headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieHeader }),
        body: JSON.stringify({ relationshipType: 'guardian' }),
      });
      const patchRes = await relPATCH(patchReq, { params: Promise.resolve({ id: createdRel.id }) });
      expect(patchRes.status).toBe(200);
      const updatedRel = (await patchRes.json()).data;
      expect(updatedRel.relationshipType).toBe('guardian');

      // 6. Set Primary Guardian (POST /primary)
      const primaryReq = new NextRequest(`http://localhost:3000/api/institute/parent-student/${createdRel.id}/primary`, {
        method: 'POST',
        headers: new Headers({ cookie: cookieHeader }),
      });
      const primaryRes = await primaryPOST(primaryReq, { params: Promise.resolve({ id: createdRel.id }) });
      expect(primaryRes.status).toBe(200);
      const promotedRel = (await primaryRes.json()).data;
      expect(promotedRel.isPrimary).toBe(true);

      // 7. Soft Archive (POST /archive or DELETE)
      const archiveReq = new NextRequest(`http://localhost:3000/api/institute/parent-student/${createdRel.id}/archive`, {
        method: 'POST',
        headers: new Headers({ cookie: cookieHeader }),
      });
      const archiveRes = await archivePOST(archiveReq, { params: Promise.resolve({ id: createdRel.id }) });
      expect(archiveRes.status).toBe(200);
      const archivedRel = (await archiveRes.json()).data;
      expect(archivedRel.status).toBe('archived');
      expect(archivedRel.isPrimary).toBe(false);
      expect(archivedRel.deletedAt).toBeDefined();
    });

    it('REL-04: prevents duplicate relationship creation with 409 CONFLICT', async () => {
      const { cookieHeader } = await createAuthenticatedSession();
      await onboardInstitute(cookieHeader, 'relDup');

      const parent = await createParent(cookieHeader, '11112222');
      const student = await createStudent(cookieHeader, 'DUP-01');

      // Link 1
      const req1 = new NextRequest(`http://localhost:3000/api/institute/students/${student.id}/guardians`, {
        method: 'POST',
        headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieHeader }),
        body: JSON.stringify({ instituteParentId: parent.id, relationshipType: 'father' }),
      });
      const res1 = await guardiansPOST(req1, { params: Promise.resolve({ id: student.id }) });
      expect(res1.status).toBe(201);

      // Link 2 (Duplicate)
      const req2 = new NextRequest(`http://localhost:3000/api/institute/students/${student.id}/guardians`, {
        method: 'POST',
        headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieHeader }),
        body: JSON.stringify({ instituteParentId: parent.id, relationshipType: 'father' }),
      });
      const res2 = await guardiansPOST(req2, { params: Promise.resolve({ id: student.id }) });
      expect(res2.status).toBe(409);
      const json2 = await res2.json();
      expect(json2.error.code).toBe('CONFLICT');
    });

    it('REL-05: primary guardian promotion replaces previous primary atomically', async () => {
      const { cookieHeader } = await createAuthenticatedSession();
      await onboardInstitute(cookieHeader, 'relPrimAtom');

      const parent1 = await createParent(cookieHeader, '10000001');
      const parent2 = await createParent(cookieHeader, '10000002');
      const student = await createStudent(cookieHeader, 'PRIM-01');

      // Create Parent 1 link (Primary)
      const req1 = new NextRequest(`http://localhost:3000/api/institute/students/${student.id}/guardians`, {
        method: 'POST',
        headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieHeader }),
        body: JSON.stringify({ instituteParentId: parent1.id, relationshipType: 'father', isPrimary: true }),
      });
      const res1 = await guardiansPOST(req1, { params: Promise.resolve({ id: student.id }) });
      const rel1 = (await res1.json()).data;
      expect(rel1.isPrimary).toBe(true);

      // Create Parent 2 link (Non-primary)
      const req2 = new NextRequest(`http://localhost:3000/api/institute/students/${student.id}/guardians`, {
        method: 'POST',
        headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieHeader }),
        body: JSON.stringify({ instituteParentId: parent2.id, relationshipType: 'mother', isPrimary: false }),
      });
      const res2 = await guardiansPOST(req2, { params: Promise.resolve({ id: student.id }) });
      const rel2 = (await res2.json()).data;
      expect(rel2.isPrimary).toBe(false);

      // Promote Parent 2 link to Primary
      const primReq = new NextRequest(`http://localhost:3000/api/institute/parent-student/${rel2.id}/primary`, {
        method: 'POST',
        headers: new Headers({ cookie: cookieHeader }),
      });
      const primRes = await primaryPOST(primReq, { params: Promise.resolve({ id: rel2.id }) });
      expect(primRes.status).toBe(200);

      // Verify Parent 1 link is no longer primary
      const getRel1 = new NextRequest(`http://localhost:3000/api/institute/parent-student/${rel1.id}`, {
        method: 'GET',
        headers: new Headers({ cookie: cookieHeader }),
      });
      const rel1Fetched = (await (await relGET(getRel1, { params: Promise.resolve({ id: rel1.id }) })).json()).data;
      expect(rel1Fetched.isPrimary).toBe(false);
    });

    it('REL-06 & REL-15: archived relationship cannot be set as primary or updated', async () => {
      const { cookieHeader } = await createAuthenticatedSession();
      await onboardInstitute(cookieHeader, 'relArchProt');

      const parent = await createParent(cookieHeader, '20000001');
      const student = await createStudent(cookieHeader, 'ARCH-01');

      const reqCreate = new NextRequest(`http://localhost:3000/api/institute/students/${student.id}/guardians`, {
        method: 'POST',
        headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieHeader }),
        body: JSON.stringify({ instituteParentId: parent.id, relationshipType: 'father' }),
      });
      const rel = (await (await guardiansPOST(reqCreate, { params: Promise.resolve({ id: student.id }) })).json()).data;

      // Archive relationship
      const archiveReq = new NextRequest(`http://localhost:3000/api/institute/parent-student/${rel.id}/archive`, {
        method: 'POST',
        headers: new Headers({ cookie: cookieHeader }),
      });
      await archivePOST(archiveReq, { params: Promise.resolve({ id: rel.id }) });

      // Attempt setting archived relationship as primary -> 400
      const primReq = new NextRequest(`http://localhost:3000/api/institute/parent-student/${rel.id}/primary`, {
        method: 'POST',
        headers: new Headers({ cookie: cookieHeader }),
      });
      const primRes = await primaryPOST(primReq, { params: Promise.resolve({ id: rel.id }) });
      expect(primRes.status).toBe(400);

      // Attempt updating archived relationship -> 400
      const patchReq = new NextRequest(`http://localhost:3000/api/institute/parent-student/${rel.id}`, {
        method: 'PATCH',
        headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieHeader }),
        body: JSON.stringify({ relationshipType: 'mother' }),
      });
      const patchRes = await relPATCH(patchReq, { params: Promise.resolve({ id: rel.id }) });
      expect(patchRes.status).toBe(400);
    });

    it('REL-01 & REL-02 & REL-03: enforces strict multi-tenant isolation across two separate institutes', async () => {
      // Setup Institute A
      const { cookieHeader: cookieA } = await createAuthenticatedSession('ownerRelA');
      const instA = await onboardInstitute(cookieA, 'relInstA');
      const parentA = await createParent(cookieA, '30000001');
      const studentA = await createStudent(cookieA, 'INST-A-01');

      // Setup Institute B
      const { cookieHeader: cookieB } = await createAuthenticatedSession('ownerRelB');
      const instB = await onboardInstitute(cookieB, 'relInstB');
      const parentB = await createParent(cookieB, '30000002');
      const studentB = await createStudent(cookieB, 'INST-B-01');

      expect(instA.id).not.toBe(instB.id);
      expect(parentA.id).not.toBe(parentB.id);

      // Link in Institute A
      const reqLinkA = new NextRequest(`http://localhost:3000/api/institute/students/${studentA.id}/guardians`, {
        method: 'POST',
        headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieA }),
        body: JSON.stringify({ instituteParentId: parentA.id, relationshipType: 'father' }),
      });
      const relA = (await (await guardiansPOST(reqLinkA, { params: Promise.resolve({ id: studentA.id }) })).json()).data;

      // 1. Inst B tries to GET studentA's guardians -> 404
      const reqCrossGuardians = new NextRequest(`http://localhost:3000/api/institute/students/${studentA.id}/guardians`, {
        method: 'GET',
        headers: new Headers({ cookie: cookieB }),
      });
      const resCrossGuardians = await guardiansGET(reqCrossGuardians, { params: Promise.resolve({ id: studentA.id }) });
      expect(resCrossGuardians.status).toBe(404);

      // 2. Inst B tries to GET parentA's students -> 404
      const reqCrossParentStudents = new NextRequest(`http://localhost:3000/api/institute/parents/${parentA.id}/students`, {
        method: 'GET',
        headers: new Headers({ cookie: cookieB }),
      });
      const resCrossParentStudents = await parentStudentsGET(reqCrossParentStudents, { params: Promise.resolve({ id: parentA.id }) });
      expect(resCrossParentStudents.status).toBe(404);

      // 3. Inst B tries to GET relA by ID -> 404
      const reqCrossRelGet = new NextRequest(`http://localhost:3000/api/institute/parent-student/${relA.id}`, {
        method: 'GET',
        headers: new Headers({ cookie: cookieB }),
      });
      const resCrossRelGet = await relGET(reqCrossRelGet, { params: Promise.resolve({ id: relA.id }) });
      expect(resCrossRelGet.status).toBe(404);

      // 4. Inst A tries to create mixed-tenant pair (parentA + studentB) -> 404
      const reqMixedPair = new NextRequest(`http://localhost:3000/api/institute/students/${studentB.id}/guardians`, {
        method: 'POST',
        headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieA }),
        body: JSON.stringify({ instituteParentId: parentA.id, relationshipType: 'father' }),
      });
      const resMixedPair = await guardiansPOST(reqMixedPair, { params: Promise.resolve({ id: studentB.id }) });
      expect(resMixedPair.status).toBe(404);
    });

    it('REL-14 & REL-16: relationship archive preserves ParentIdentity, Parent CRM, and Student profile untouched', async () => {
      const { cookieHeader } = await createAuthenticatedSession();
      await onboardInstitute(cookieHeader, 'relPreserv');

      const parent = await createParent(cookieHeader, '40000001');
      const student = await createStudent(cookieHeader, 'PRESERV-01');

      const reqCreate = new NextRequest(`http://localhost:3000/api/institute/students/${student.id}/guardians`, {
        method: 'POST',
        headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieHeader }),
        body: JSON.stringify({ instituteParentId: parent.id, relationshipType: 'mother' }),
      });
      const rel = (await (await guardiansPOST(reqCreate, { params: Promise.resolve({ id: student.id }) })).json()).data;

      // Archive relationship
      const archiveReq = new NextRequest(`http://localhost:3000/api/institute/parent-student/${rel.id}/archive`, {
        method: 'POST',
        headers: new Headers({ cookie: cookieHeader }),
      });
      await archivePOST(archiveReq, { params: Promise.resolve({ id: rel.id }) });

      // Verify Parent CRM notes and status remain active
      const parentRecord = await db.instituteParent.findUniqueOrThrow({ where: { id: parent.id } });
      expect(parentRecord.status).toBe('active');
      expect(parentRecord.notes).toBe('Confidential staff notes for CRM');

      // Verify Student status remains unchanged
      const studentRecord = await db.student.findUniqueOrThrow({ where: { id: student.id } });
      expect(studentRecord.status).toBe('inactive');
      expect(studentRecord.admissionStatus).toBe('pending');
      expect(studentRecord.deletedAt).toBeNull();
    });
  });
});
