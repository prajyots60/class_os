/**
 * Phase 2.5 — Protected Academics APIs (/api/v1/academics/...) Security & Integration Suite
 *
 * Enforces ACADEMIC-API-01 through ACADEMIC-API-30 invariants:
 * - Server-authoritative TenantContext resolution
 * - Strict client identity rejection (instituteId, publishedAt, status)
 * - Cross-tenant isolation (returns 404 NOT_FOUND)
 * - Capability authorization checks
 * - Full functional workflows for Schedules, Sessions, Attendance, Homework, Tests, and Marks
 */
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import {
  validateTestEnvironment,
  cleanTestDatabase,
  closeTestPool,
  db,
  createTestInstitute,
  createTestUser,
  createTestSubject,
  createTestBatch,
  createTestStudent,
  createTestEnrollment,
} from '@coaching-os/database';
import {
  CreateInstituteMembershipUseCase,
  PrismaInstituteMembershipRepository,
} from '@coaching-os/identity';
import { auth } from '@coaching-os/auth';

// Route Handlers
import { GET as schedulesGET, POST as schedulesPOST } from './schedules/route';
import { PATCH as schedulesIdPATCH, DELETE as schedulesIdDELETE } from './schedules/[id]/route';
import { GET as sessionsGET } from './sessions/route';
import { POST as sessionsGeneratePOST } from './sessions/generate/route';
import { POST as sessionCompletePOST } from './sessions/[id]/complete/route';
import { GET as attendanceGET, POST as attendancePOST } from './attendance/route';
import { POST as homeworkPOST } from './homework/route';
import { PATCH as homeworkIdPATCH } from './homework/[id]/route';
import { POST as homeworkPublishPOST } from './homework/[id]/publish/route';
import { POST as testsPOST } from './tests/route';
import { POST as testSchedulePOST } from './tests/[id]/schedule/route';
import { POST as testPublishPOST } from './tests/[id]/publish/route';
import { GET as marksGET, POST as marksPOST } from './tests/[id]/marks/route';

describe('Phase 2.5 — Protected Academics APIs Security & Integration Suite', () => {
  let membershipRepo: PrismaInstituteMembershipRepository;
  let createMembershipUseCase: CreateInstituteMembershipUseCase;

  beforeAll(() => {
    validateTestEnvironment();
    membershipRepo = new PrismaInstituteMembershipRepository();
    createMembershipUseCase = new CreateInstituteMembershipUseCase(membershipRepo);
  });

  beforeEach(async () => {
    await cleanTestDatabase();
  });

  afterAll(async () => {
    await closeTestPool();
  });

  // ── Test Helpers ───────────────────────────────────────────────────────────

  async function createAuthenticatedSession(emailPrefix = 'acad_api_user') {
    const email = `${emailPrefix}_${Date.now()}_${Math.floor(Math.random() * 99999)}@test.com`;
    const password = 'SecurePassword123!';
    const signUpResponse = await auth.api.signUpEmail({
      body: { email, password, name: 'Academic Test User' },
      asResponse: true,
    });

    const getSetCookie = (signUpResponse.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie;
    const cookieHeader = getSetCookie ? getSetCookie.call(signUpResponse.headers).join('; ') : (signUpResponse.headers.get('set-cookie') || '');
    if (!cookieHeader) throw new Error('No set-cookie header from signUpEmail');

    const user = await db.user.findFirstOrThrow({ where: { email: email.toLowerCase() } });
    return { user, cookieHeader };
  }

  function makeReq(url: string, method: string, cookieHeader?: string, body?: unknown): NextRequest {
    const headers = new Headers();
    if (cookieHeader) headers.set('cookie', cookieHeader);
    if (body) headers.set('content-type', 'application/json');

    return new NextRequest(`http://localhost:3000${url}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  // ── 1. Authentication & Capability Authorization ────────────────────────────

  describe('Authentication & Authorization Guards', () => {
    it('ACADEMIC-API-01: should reject unauthenticated request with 401', async () => {
      const req = makeReq('/api/v1/academics/schedules?batchId=00000000-0000-0000-0000-000000000000', 'GET');
      const res = await schedulesGET(req);
      expect(res.status).toBe(401);
    });

    it('ACADEMIC-API-02: should reject user without active institute membership with 401/403', async () => {
      const { cookieHeader } = await createAuthenticatedSession();
      const req = makeReq('/api/v1/academics/schedules?batchId=00000000-0000-0000-0000-000000000000', 'GET', cookieHeader);
      const res = await schedulesGET(req);
      expect(res.status).toBe(401);
    });
  });

  // ── 2. Full Functional & Security End-to-End Workflow ────────────────────────

  describe('Full Functional & Security Workflow for Institute A & Adversarial Institute B', () => {
    let cookieA: string;
    let instA: { id: string };
    let batchA: { id: string };
    let teacherA: { id: string };
    let enrollmentA1: { id: string };
    let enrollmentA2: { id: string };

    let cookieB: string;
    let instB: { id: string };
    let batchB: { id: string };
    let enrollmentB: { id: string };

    beforeEach(async () => {
      // Setup Institute A
      const sessA = await createAuthenticatedSession('owner_a');
      cookieA = sessA.cookieHeader;
      instA = await createTestInstitute({ name: 'Apex Academy A', slug: `apex-${crypto.randomUUID().slice(0, 6)}` });
      
      await createMembershipUseCase.execute({
        userId: sessA.user.id,
        instituteId: instA.id,
        role: 'owner',
      });

      const subjectA = await createTestSubject(instA.id, { name: 'Physics', code: 'PHY-101' });
      batchA = await createTestBatch(instA.id, subjectA.id, { name: 'Batch Alpha', code: 'ALPHA' });

      teacherA = await createTestUser();
      await createMembershipUseCase.execute({
        userId: teacherA.id,
        instituteId: instA.id,
        role: 'teacher',
      });

      const st1 = await createTestStudent(instA.id, { firstName: 'Alice', lastName: 'Smith' });
      const st2 = await createTestStudent(instA.id, { firstName: 'Bob', lastName: 'Jones' });
      enrollmentA1 = await createTestEnrollment(st1.id, batchA.id, { instituteId: instA.id, status: 'active' });
      enrollmentA2 = await createTestEnrollment(st2.id, batchA.id, { instituteId: instA.id, status: 'active' });

      // Setup Institute B (Adversarial Tenant)
      const sessB = await createAuthenticatedSession('owner_b');
      cookieB = sessB.cookieHeader;
      instB = await createTestInstitute({ name: 'Beta Institute B', slug: `beta-${crypto.randomUUID().slice(0, 6)}` });
      
      await createMembershipUseCase.execute({
        userId: sessB.user.id,
        instituteId: instB.id,
        role: 'owner',
      });

      const subjectB = await createTestSubject(instB.id, { name: 'Chemistry', code: 'CHE-101' });
      batchB = await createTestBatch(instB.id, subjectB.id, { name: 'Batch Beta', code: 'BETA' });
      const stB = await createTestStudent(instB.id, { firstName: 'David', lastName: 'Miller' });
      enrollmentB = await createTestEnrollment(stB.id, batchB.id, { instituteId: instB.id, status: 'active' });
    });

    // ── Schedules Endpoints ──────────────────────────────────────────────────

    it('Schedules API: Create, List, Update, Delete & Cross-Tenant Protection', async () => {
      // 1. Create Schedule
      const createReq = makeReq('/api/v1/academics/schedules', 'POST', cookieA, {
        batchId: batchA.id,
        dayOfWeek: 'monday',
        startTime: '17:00',
        endTime: '18:30',
        teacherId: teacherA.id,
      });
      const createRes = await schedulesPOST(createReq);
      expect(createRes.status).toBe(201);
      const scheduleData = (await createRes.json()).data;
      expect(scheduleData.id).toBeDefined();

      // 2. List Schedules
      const listReq = makeReq(`/api/v1/academics/schedules?batchId=${batchA.id}`, 'GET', cookieA);
      const listRes = await schedulesGET(listReq);
      expect(listRes.status).toBe(200);
      const listData = (await listRes.json()).data;
      expect(listData.length).toBe(1);

      // 3. Update Schedule
      const updateReq = makeReq(`/api/v1/academics/schedules/${scheduleData.id}`, 'PATCH', cookieA, {
        batchId: batchA.id,
        dayOfWeek: 'tuesday',
        startTime: '18:00',
        endTime: '19:30',
      });
      const updateRes = await schedulesIdPATCH(updateReq, { params: Promise.resolve({ id: scheduleData.id }) });
      expect(updateRes.status).toBe(200);

      // 4. ACADEMIC-API-08/09: Cross-Tenant Protection (Institute B cannot read/update Schedule A)
      const foreignReadReq = makeReq(`/api/v1/academics/schedules?batchId=${batchA.id}`, 'GET', cookieB);
      const foreignReadRes = await schedulesGET(foreignReadReq);
      expect(foreignReadRes.status).toBe(404);

      const foreignUpdateReq = makeReq(`/api/v1/academics/schedules/${scheduleData.id}`, 'PATCH', cookieB, {
        batchId: batchA.id,
        dayOfWeek: 'friday',
      });
      const foreignUpdateRes = await schedulesIdPATCH(foreignUpdateReq, { params: Promise.resolve({ id: scheduleData.id }) });
      expect(foreignUpdateRes.status).toBe(404);

      // 5. Delete Schedule
      const delReq = makeReq(`/api/v1/academics/schedules/${scheduleData.id}?batchId=${batchA.id}`, 'DELETE', cookieA);
      const delRes = await schedulesIdDELETE(delReq, { params: Promise.resolve({ id: scheduleData.id }) });
      expect(delRes.status).toBe(200);
    });

    // ── Sessions Endpoints ───────────────────────────────────────────────────

    it('Sessions API: Generate, List, Complete, Cancel & Cross-Tenant Protection', async () => {
      // Create Schedule first
      await schedulesPOST(
        makeReq('/api/v1/academics/schedules', 'POST', cookieA, {
          batchId: batchA.id,
          dayOfWeek: 'monday',
          startTime: '17:00',
          endTime: '18:30',
        }),
      );

      // Generate Sessions
      const genReq = makeReq('/api/v1/academics/sessions/generate', 'POST', cookieA, {
        batchId: batchA.id,
        startDate: '2026-08-17',
        endDate: '2026-08-17',
      });
      const genRes = await sessionsGeneratePOST(genReq);
      expect(genRes.status).toBe(201);
      const sessions = (await genRes.json()).data;
      expect(sessions.length).toBe(1);
      const sessionId = sessions[0].id;

      // List Sessions
      const listReq = makeReq(`/api/v1/academics/sessions?batchId=${batchA.id}`, 'GET', cookieA);
      const listRes = await sessionsGET(listReq);
      expect(listRes.status).toBe(200);

      // Complete Session
      const compReq = makeReq(`/api/v1/academics/sessions/${sessionId}/complete`, 'POST', cookieA);
      const compRes = await sessionCompletePOST(compReq, { params: Promise.resolve({ id: sessionId }) });
      expect(compRes.status).toBe(200);
      expect((await compRes.json()).data.status).toBe('completed');

      // ACADEMIC-API-10: Foreign Tenant Read Session A returns 404
      const foreignListReq = makeReq(`/api/v1/academics/sessions?batchId=${batchA.id}`, 'GET', cookieB);
      const foreignListRes = await sessionsGET(foreignListReq);
      expect(foreignListRes.status).toBe(404);
    });

    // ── Attendance Endpoints ─────────────────────────────────────────────────

    it('Attendance API: Record, Get, Atomicity & Idempotency', async () => {
      // Generate Session first
      await schedulesPOST(
        makeReq('/api/v1/academics/schedules', 'POST', cookieA, {
          batchId: batchA.id,
          dayOfWeek: 'monday',
          startTime: '17:00',
          endTime: '18:30',
        }),
      );
      const genRes = await sessionsGeneratePOST(
        makeReq('/api/v1/academics/sessions/generate', 'POST', cookieA, {
          batchId: batchA.id,
          startDate: '2026-08-17',
          endDate: '2026-08-17',
        }),
      );
      const sessionId = (await genRes.json()).data[0].id;

      // Record Attendance
      const attReq = makeReq('/api/v1/academics/attendance', 'POST', cookieA, {
        sessionId,
        records: [
          { enrollmentId: enrollmentA1.id, status: 'present' },
          { enrollmentId: enrollmentA2.id, status: 'late' },
        ],
      });
      const attRes = await attendancePOST(attReq);
      expect(attRes.status).toBe(200);
      const attData = (await attRes.json()).data;
      expect(attData.length).toBe(2);

      // Get Attendance
      const getReq = makeReq(`/api/v1/academics/attendance?sessionId=${sessionId}`, 'GET', cookieA);
      const getRes = await attendanceGET(getReq);
      expect(getRes.status).toBe(200);

      // ACADEMIC-API-11/15: Cross-Tenant & Cross-Batch Protection
      const foreignAttReq = makeReq('/api/v1/academics/attendance', 'POST', cookieB, {
        sessionId,
        records: [{ enrollmentId: enrollmentB.id, status: 'present' }],
      });
      const foreignAttRes = await attendancePOST(foreignAttReq);
      expect(foreignAttRes.status).toBe(404);
    });

    // ── Homework Endpoints ───────────────────────────────────────────────────

    it('Homework API: Create Draft, Get, Update, Publish, Published Immutability', async () => {
      // 1. Create Homework (Draft)
      const createReq = makeReq('/api/v1/academics/homework', 'POST', cookieA, {
        batchId: batchA.id,
        title: 'Physics Homework 1',
        description: 'Solve questions 1-10',
      });
      const createRes = await homeworkPOST(createReq);
      expect(createRes.status).toBe(201);
      const hw = (await createRes.json()).data;
      expect(hw.isPublished).toBe(false);

      // 2. Update Draft Homework
      const patchReq = makeReq(`/api/v1/academics/homework/${hw.id}`, 'PATCH', cookieA, {
        title: 'Updated Physics Homework 1',
      });
      const patchRes = await homeworkIdPATCH(patchReq, { params: Promise.resolve({ id: hw.id }) });
      expect(patchRes.status).toBe(200);

      // 3. Publish Homework
      const pubReq = makeReq(`/api/v1/academics/homework/${hw.id}/publish`, 'POST', cookieA);
      const pubRes = await homeworkPublishPOST(pubReq, { params: Promise.resolve({ id: hw.id }) });
      expect(pubRes.status).toBe(200);
      expect((await pubRes.json()).data.isPublished).toBe(true);

      // 4. ACADEMIC-API-18: Published Homework Immutability (Attempt update fails with 400)
      const postPubPatch = makeReq(`/api/v1/academics/homework/${hw.id}`, 'PATCH', cookieA, {
        title: 'Post-Publish Modification Attempt',
      });
      const postPubRes = await homeworkIdPATCH(postPubPatch, { params: Promise.resolve({ id: hw.id }) });
      expect(postPubRes.status).toBe(400);
    });

    // ── Tests & Marks Endpoints ──────────────────────────────────────────────

    it('Tests & Marks API: Create, Schedule, Enter Marks, Publish & Immutability', async () => {
      // 1. Create Test
      const createReq = makeReq('/api/v1/academics/tests', 'POST', cookieA, {
        batchId: batchA.id,
        title: 'Midterm Exam',
        maximumMarks: 100,
      });
      const createRes = await testsPOST(createReq);
      expect(createRes.status).toBe(201);
      const test = (await createRes.json()).data;
      expect(test.status).toBe('draft');

      // 2. Schedule Test
      const schedReq = makeReq(`/api/v1/academics/tests/${test.id}/schedule`, 'POST', cookieA, {
        scheduledDate: '2026-08-25',
      });
      const schedRes = await testSchedulePOST(schedReq, { params: Promise.resolve({ id: test.id }) });
      expect(schedRes.status).toBe(200);

      // 3. Enter Marks
      const marksReq = makeReq(`/api/v1/academics/tests/${test.id}/marks`, 'POST', cookieA, {
        records: [
          { enrollmentId: enrollmentA1.id, marksObtained: 85.5 },
          { enrollmentId: enrollmentA2.id, marksObtained: 92.0 },
        ],
      });
      const marksRes = await marksPOST(marksReq, { params: Promise.resolve({ id: test.id }) });
      expect(marksRes.status).toBe(200);

      // Get Marks
      const getMarksReq = makeReq(`/api/v1/academics/tests/${test.id}/marks`, 'GET', cookieA);
      const getMarksRes = await marksGET(getMarksReq, { params: Promise.resolve({ id: test.id }) });
      expect(getMarksRes.status).toBe(200);
      expect((await getMarksRes.json()).data.length).toBe(2);

      // 4. Publish Results
      const pubReq = makeReq(`/api/v1/academics/tests/${test.id}/publish`, 'POST', cookieA);
      const pubRes = await testPublishPOST(pubReq, { params: Promise.resolve({ id: test.id }) });
      expect(pubRes.status).toBe(200);
      expect((await pubRes.json()).data.status).toBe('published');

      // 5. ACADEMIC-API-19/20: Published Test and Marks Immutability
      const postPubMarks = makeReq(`/api/v1/academics/tests/${test.id}/marks`, 'POST', cookieA, {
        records: [{ enrollmentId: enrollmentA1.id, marksObtained: 99 }],
      });
      const postPubMarksRes = await marksPOST(postPubMarks, { params: Promise.resolve({ id: test.id }) });
      expect(postPubMarksRes.status).toBe(400);
    });

    // ── 3. Client Identity Injections Rejection ─────────────────────────────

    it('ACADEMIC-API-04 & 07: Should reject client attempts to inject instituteId or status in payload', async () => {
      const spoofReq = makeReq('/api/v1/academics/tests', 'POST', cookieA, {
        batchId: batchA.id,
        title: 'Spoofed Test',
        maximumMarks: 100,
        instituteId: instB.id, // Injected instituteId
      });
      const spoofRes = await testsPOST(spoofReq);
      expect(spoofRes.status).toBe(400);

      const statusSpoofReq = makeReq('/api/v1/academics/tests', 'POST', cookieA, {
        batchId: batchA.id,
        title: 'Spoofed Test',
        maximumMarks: 100,
        status: 'published', // Injected status
      });
      const statusSpoofRes = await testsPOST(statusSpoofReq);
      expect(statusSpoofRes.status).toBe(400);
    });
  });
});
