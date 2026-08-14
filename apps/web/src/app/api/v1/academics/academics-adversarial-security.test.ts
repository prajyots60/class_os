import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import {
  validateTestEnvironment,
  cleanTestDatabase,
  closeTestPool,
  db,
  createTestInstitute,
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
import { POST as sessionCancelPOST } from './sessions/[id]/cancel/route';
import { GET as attendanceGET, POST as attendancePOST } from './attendance/route';
import { GET as homeworkGET, POST as homeworkPOST } from './homework/route';
import { PATCH as homeworkIdPATCH, DELETE as homeworkIdDELETE } from './homework/[id]/route';
import { POST as homeworkPublishPOST } from './homework/[id]/publish/route';
import { GET as testsGET, POST as testsPOST } from './tests/route';
import { PATCH as testIdPATCH, DELETE as testIdDELETE } from './tests/[id]/route';
import { POST as testSchedulePOST } from './tests/[id]/schedule/route';
import { POST as testPublishPOST } from './tests/[id]/publish/route';
import { GET as marksGET, POST as marksPOST } from './tests/[id]/marks/route';

describe('Phase 2.7 — Academics Adversarial Security & Invariants Suite', () => {
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

  async function createAuthenticatedSession(emailPrefix = 'adv_user') {
    const email = `${emailPrefix}_${Date.now()}_${Math.floor(Math.random() * 99999)}@test.com`;
    const password = 'SecurePassword123!';
    const signUpResponse = await auth.api.signUpEmail({
      body: { email, password, name: 'Adversarial Test User' },
      asResponse: true,
    });

    const getSetCookie = (signUpResponse.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie;
    const cookieHeader = getSetCookie ? getSetCookie.call(signUpResponse.headers).join('; ') : (signUpResponse.headers.get('set-cookie') || '');
    if (!cookieHeader) throw new Error('No set-cookie header from signUpEmail');

    const user = await db.user.findFirstOrThrow({ where: { email: email.toLowerCase() } });
    return { user, cookieHeader };
  }

  function makeReq(
    url: string,
    method: string,
    cookieHeader?: string,
    body?: unknown,
    customHeaders?: Record<string, string>,
  ): NextRequest {
    const headers = new Headers();
    headers.set('x-forwarded-for', `10.0.0.${Math.floor(Math.random() * 250) + 1}`);
    if (cookieHeader) headers.set('cookie', cookieHeader);
    if (body) headers.set('content-type', 'application/json');
    if (customHeaders) {
      Object.entries(customHeaders).forEach(([k, v]) => headers.set(k, v));
    }

    return new NextRequest(`http://localhost:3000${url}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  // ── SEC-ADV-01: Authentication Guards ──────────────────────────────────────
  describe('SEC-ADV-01: Authentication Guards', () => {
    it('should reject unauthenticated calls to all endpoints with 401', async () => {
      const routes = [
        schedulesGET(makeReq('/api/v1/academics/schedules?batchId=00000000-0000-0000-0000-000000000000', 'GET')),
        schedulesPOST(makeReq('/api/v1/academics/schedules', 'POST', undefined, { batchId: '00000000-0000-0000-0000-000000000000' })),
        sessionsGET(makeReq('/api/v1/academics/sessions?batchId=00000000-0000-0000-0000-000000000000', 'GET')),
        sessionsGeneratePOST(makeReq('/api/v1/academics/sessions/generate', 'POST', undefined, { batchId: '00000000-0000-0000-0000-000000000000' })),
        attendanceGET(makeReq('/api/v1/academics/attendance?sessionId=00000000-0000-0000-0000-000000000000', 'GET')),
        attendancePOST(makeReq('/api/v1/academics/attendance', 'POST', undefined, { sessionId: '00000000-0000-0000-0000-000000000000' })),
        homeworkGET(makeReq('/api/v1/academics/homework?batchId=00000000-0000-0000-0000-000000000000', 'GET')),
        homeworkPOST(makeReq('/api/v1/academics/homework', 'POST', undefined, { batchId: '00000000-0000-0000-0000-000000000000' })),
        testsGET(makeReq('/api/v1/academics/tests?batchId=00000000-0000-0000-0000-000000000000', 'GET')),
        testsPOST(makeReq('/api/v1/academics/tests', 'POST', undefined, { batchId: '00000000-0000-0000-0000-000000000000' })),
      ];

      const responses = await Promise.all(routes);
      responses.forEach((res) => {
        expect(res.status).toBe(401);
      });
    });
  });

  // ── SEC-ADV-03: Tenant Spoofing Defense ─────────────────────────────────────
  describe('SEC-ADV-03: Tenant Spoofing Defense', () => {
    it('should ignore client-injected instituteId / x-institute-id / x-role headers', async () => {
      const sessA = await createAuthenticatedSession('owner_a');
      const instA = await createTestInstitute({ name: 'Institute A', slug: `inst-a-${crypto.randomUUID().slice(0, 6)}` });
      await createMembershipUseCase.execute({ userId: sessA.user.id, instituteId: instA.id, role: 'owner' });

      const instB = await createTestInstitute({ name: 'Institute B', slug: `inst-b-${crypto.randomUUID().slice(0, 6)}` });
      const subjectB = await createTestSubject(instB.id, { name: 'Math B', code: 'M-101' });
      const batchB = await createTestBatch(instB.id, subjectB.id, { name: 'Batch B', code: 'BB' });

      // User A attempts to create schedule in Batch B by spoofing headers or body instituteId
      const spoofReq = makeReq(
        '/api/v1/academics/schedules',
        'POST',
        sessA.cookieHeader,
        {
          batchId: batchB.id,
          instituteId: instB.id, // Client spoof attempt
          dayOfWeek: 'monday',
          startTime: '10:00',
          endTime: '11:00',
        },
        {
          'x-institute-id': instB.id,
          'x-tenant-id': instB.id,
          'x-role': 'owner',
        },
      );

      const res = await schedulesPOST(spoofReq);
      expect(res.status).toBe(404);
    });
  });

  // ── SEC-ADV-04: Cross-Tenant Isolation Matrix ───────────────────────────────
  describe('SEC-ADV-04: Cross-Tenant Isolation Matrix (Institute A vs Institute B)', () => {
    let cookieA: string;
    let instA: { id: string };
    let batchA: { id: string };
    let scheduleA: { id: string };
    let sessionA: { id: string };
    let homeworkA: { id: string };
    let testA: { id: string };

    let cookieB: string;

    beforeEach(async () => {
      // Institute A Setup
      const sessA = await createAuthenticatedSession('tenant_owner_a');
      cookieA = sessA.cookieHeader;
      instA = await createTestInstitute({ name: 'Tenant A', slug: `t-a-${crypto.randomUUID().slice(0, 6)}` });
      await createMembershipUseCase.execute({ userId: sessA.user.id, instituteId: instA.id, role: 'owner' });
      const subA = await createTestSubject(instA.id, { name: 'Sub A', code: 'SA' });
      batchA = await createTestBatch(instA.id, subA.id, { name: 'Batch A', code: 'BA' });

      // Create Schedule A
      const schedRes = await schedulesPOST(
        makeReq('/api/v1/academics/schedules', 'POST', cookieA, {
          batchId: batchA.id,
          dayOfWeek: 'monday',
          startTime: '10:00',
          endTime: '11:00',
        }),
      );
      expect(schedRes.status).toBe(201);
      scheduleA = (await schedRes.json()).data;

      // Generate Session A
      const genRes = await sessionsGeneratePOST(
        makeReq('/api/v1/academics/sessions/generate', 'POST', cookieA, {
          batchId: batchA.id,
          startDate: '2026-08-17',
          endDate: '2026-08-17',
        }),
      );
      expect(genRes.status).toBe(201);
      sessionA = (await genRes.json()).data[0];

      // Create Homework A
      const hwRes = await homeworkPOST(
        makeReq('/api/v1/academics/homework', 'POST', cookieA, {
          batchId: batchA.id,
          title: 'HW A',
          description: 'Desc A',
        }),
      );
      expect(hwRes.status).toBe(201);
      homeworkA = (await hwRes.json()).data;

      // Create Test A
      const tRes = await testsPOST(
        makeReq('/api/v1/academics/tests', 'POST', cookieA, {
          batchId: batchA.id,
          title: 'Test A',
          maximumMarks: 100,
        }),
      );
      expect(tRes.status).toBe(201);
      testA = (await tRes.json()).data;

      // Institute B Setup
      const sessB = await createAuthenticatedSession('tenant_owner_b');
      cookieB = sessB.cookieHeader;
      const instB = await createTestInstitute({ name: 'Tenant B', slug: `t-b-${crypto.randomUUID().slice(0, 6)}` });
      await createMembershipUseCase.execute({ userId: sessB.user.id, instituteId: instB.id, role: 'owner' });
    });

    it('User B cannot view or mutate Schedule A (returns 404)', async () => {
      const listRes = await schedulesGET(makeReq(`/api/v1/academics/schedules?batchId=${batchA.id}`, 'GET', cookieB));
      expect(listRes.status).toBe(404);

      const patchRes = await schedulesIdPATCH(
        makeReq(`/api/v1/academics/schedules/${scheduleA.id}`, 'PATCH', cookieB, { batchId: batchA.id, startTime: '12:00' }),
        { params: Promise.resolve({ id: scheduleA.id }) },
      );
      expect(patchRes.status).toBe(404);

      const delRes = await schedulesIdDELETE(
        makeReq(`/api/v1/academics/schedules/${scheduleA.id}?batchId=${batchA.id}`, 'DELETE', cookieB),
        { params: Promise.resolve({ id: scheduleA.id }) },
      );
      expect(delRes.status).toBe(404);
    });

    it('User B cannot view, complete, or cancel Session A (returns 404)', async () => {
      const listRes = await sessionsGET(makeReq(`/api/v1/academics/sessions?batchId=${batchA.id}`, 'GET', cookieB));
      expect(listRes.status).toBe(404);

      const compRes = await sessionCompletePOST(
        makeReq(`/api/v1/academics/sessions/${sessionA.id}/complete`, 'POST', cookieB),
        { params: Promise.resolve({ id: sessionA.id }) },
      );
      expect(compRes.status).toBe(404);

      const cancelRes = await sessionCancelPOST(
        makeReq(`/api/v1/academics/sessions/${sessionA.id}/cancel`, 'POST', cookieB, { reason: 'Attacker cancel' }),
        { params: Promise.resolve({ id: sessionA.id }) },
      );
      expect(cancelRes.status).toBe(404);
    });

    it('User B cannot edit, publish, or delete Homework A (returns 404)', async () => {
      const getRes = await homeworkGET(makeReq(`/api/v1/academics/homework?batchId=${batchA.id}`, 'GET', cookieB));
      expect(getRes.status).toBe(404);

      const editRes = await homeworkIdPATCH(
        makeReq(`/api/v1/academics/homework/${homeworkA.id}`, 'PATCH', cookieB, { title: 'Hacked HW' }),
        { params: Promise.resolve({ id: homeworkA.id }) },
      );
      expect(editRes.status).toBe(404);

      const pubRes = await homeworkPublishPOST(
        makeReq(`/api/v1/academics/homework/${homeworkA.id}/publish`, 'POST', cookieB),
        { params: Promise.resolve({ id: homeworkA.id }) },
      );
      expect(pubRes.status).toBe(404);

      const delRes = await homeworkIdDELETE(
        makeReq(`/api/v1/academics/homework/${homeworkA.id}`, 'DELETE', cookieB),
        { params: Promise.resolve({ id: homeworkA.id }) },
      );
      expect(delRes.status).toBe(404);
    });

    it('User B cannot edit, schedule, enter marks, or publish Test A (returns 404)', async () => {
      const listRes = await testsGET(makeReq(`/api/v1/academics/tests?batchId=${batchA.id}`, 'GET', cookieB));
      expect(listRes.status).toBe(404);

      const schedRes = await testSchedulePOST(
        makeReq(`/api/v1/academics/tests/${testA.id}/schedule`, 'POST', cookieB, { scheduledDate: '2026-08-25' }),
        { params: Promise.resolve({ id: testA.id }) },
      );
      expect(schedRes.status).toBe(404);

      const marksRes = await marksPOST(
        makeReq(`/api/v1/academics/tests/${testA.id}/marks`, 'POST', cookieB, {
          records: [{ enrollmentId: '00000000-0000-0000-0000-000000000000', marksObtained: 50 }],
        }),
        { params: Promise.resolve({ id: testA.id }) },
      );
      expect(marksRes.status).toBe(404);

      const pubRes = await testPublishPOST(
        makeReq(`/api/v1/academics/tests/${testA.id}/publish`, 'POST', cookieB),
        { params: Promise.resolve({ id: testA.id }) },
      );
      expect(pubRes.status).toBe(404);
    });
  });

  // ── SEC-ADV-05: Attendance Invariants & Atomicity ───────────────────────────
  describe('SEC-ADV-05: Attendance Invariants & Atomicity', () => {
    it('ACADEMIC-009: Submitting attendance for a cancelled session is rejected', async () => {
      const sess = await createAuthenticatedSession('owner_att');
      const inst = await createTestInstitute({ name: 'Inst Att', slug: `att-${crypto.randomUUID().slice(0, 6)}` });
      await createMembershipUseCase.execute({ userId: sess.user.id, instituteId: inst.id, role: 'owner' });
      const sub = await createTestSubject(inst.id, { name: 'Sub', code: 'SUB' });
      const batch = await createTestBatch(inst.id, sub.id, { name: 'Batch', code: 'B' });
      const st = await createTestStudent(inst.id, { firstName: 'John', lastName: 'Doe' });
      const enr = await createTestEnrollment(st.id, batch.id, { instituteId: inst.id, status: 'active' });

      // Create & cancel session
      const schedRes = await schedulesPOST(
        makeReq('/api/v1/academics/schedules', 'POST', sess.cookieHeader, {
          batchId: batch.id,
          dayOfWeek: 'monday',
          startTime: '10:00',
          endTime: '11:00',
        }),
      );
      expect(schedRes.status).toBe(201);

      const genRes = await sessionsGeneratePOST(
        makeReq('/api/v1/academics/sessions/generate', 'POST', sess.cookieHeader, {
          batchId: batch.id,
          startDate: '2026-08-17',
          endDate: '2026-08-17',
        }),
      );
      expect(genRes.status).toBe(201);
      const session = (await genRes.json()).data[0];

      await sessionCancelPOST(
        makeReq(`/api/v1/academics/sessions/${session.id}/cancel`, 'POST', sess.cookieHeader, { reason: 'Holiday' }),
        { params: Promise.resolve({ id: session.id }) },
      );

      // Attempt attendance on cancelled session
      const attRes = await attendancePOST(
        makeReq('/api/v1/academics/attendance', 'POST', sess.cookieHeader, {
          sessionId: session.id,
          records: [{ enrollmentId: enr.id, status: 'present' }],
        }),
      );
      expect(attRes.status).toBe(400);
      const json = await attRes.json();
      expect(json.error.code).toBe('INVALID_STATE_TRANSITION');
    });

    it('Atomicity: If 1 enrollment in a bulk attendance payload belongs to foreign batch, 0 records persist', async () => {
      const sess = await createAuthenticatedSession('owner_atom');
      const inst = await createTestInstitute({ name: 'Inst Atom', slug: `atom-${crypto.randomUUID().slice(0, 6)}` });
      await createMembershipUseCase.execute({ userId: sess.user.id, instituteId: inst.id, role: 'owner' });

      const sub = await createTestSubject(inst.id, { name: 'Sub', code: 'SUB' });
      const batch1 = await createTestBatch(inst.id, sub.id, { name: 'Batch 1', code: 'B1' });
      const batch2 = await createTestBatch(inst.id, sub.id, { name: 'Batch 2', code: 'B2' });

      const st1 = await createTestStudent(inst.id, { firstName: 'Student', lastName: 'One' });
      const st2 = await createTestStudent(inst.id, { firstName: 'Student', lastName: 'Two' });
      const enr1 = await createTestEnrollment(st1.id, batch1.id, { instituteId: inst.id, status: 'active' });
      const enr2 = await createTestEnrollment(st2.id, batch2.id, { instituteId: inst.id, status: 'active' }); // Enrolled in batch 2!

      const schedRes = await schedulesPOST(
        makeReq('/api/v1/academics/schedules', 'POST', sess.cookieHeader, {
          batchId: batch1.id,
          dayOfWeek: 'monday',
          startTime: '10:00',
          endTime: '11:00',
        }),
      );
      expect(schedRes.status).toBe(201);

      const genRes = await sessionsGeneratePOST(
        makeReq('/api/v1/academics/sessions/generate', 'POST', sess.cookieHeader, {
          batchId: batch1.id,
          startDate: '2026-08-17',
          endDate: '2026-08-17',
        }),
      );
      expect(genRes.status).toBe(201);
      const session = (await genRes.json()).data[0];

      // Submit bulk payload containing valid enr1 and invalid enr2
      const attRes = await attendancePOST(
        makeReq('/api/v1/academics/attendance', 'POST', sess.cookieHeader, {
          sessionId: session.id,
          records: [
            { enrollmentId: enr1.id, status: 'present' },
            { enrollmentId: enr2.id, status: 'present' },
          ],
        }),
      );
      expect(attRes.status).toBe(400);

      // Verify zero records were persisted for session
      const getRes = await attendanceGET(
        makeReq(`/api/v1/academics/attendance?sessionId=${session.id}`, 'GET', sess.cookieHeader),
      );
      const attList = (await getRes.json()).data;
      expect(attList.length).toBe(0);
    });
  });

  // ── SEC-ADV-06: Bulk Marks Bounds & Decimal Precision ───────────────────────
  describe('SEC-ADV-06: Bulk Marks Bounds & Precision', () => {
    it('ACADEMIC-010: Rejects marks > maxMarks, negative marks, or > 2 decimal places', async () => {
      const sess = await createAuthenticatedSession('owner_marks');
      const inst = await createTestInstitute({ name: 'Inst Marks', slug: `m-${crypto.randomUUID().slice(0, 6)}` });
      await createMembershipUseCase.execute({ userId: sess.user.id, instituteId: inst.id, role: 'owner' });

      const sub = await createTestSubject(inst.id, { name: 'Sub', code: 'SUB' });
      const batch = await createTestBatch(inst.id, sub.id, { name: 'Batch', code: 'B' });
      const st = await createTestStudent(inst.id, { firstName: 'Student', lastName: 'M' });
      const enr = await createTestEnrollment(st.id, batch.id, { instituteId: inst.id, status: 'active' });

      const tRes = await testsPOST(
        makeReq('/api/v1/academics/tests', 'POST', sess.cookieHeader, {
          batchId: batch.id,
          title: 'Physics Test',
          maximumMarks: 100,
        }),
      );
      expect(tRes.status).toBe(201);
      const test = (await tRes.json()).data;

      // 1. Marks > maxMarks (105 > 100)
      const res1 = await marksPOST(
        makeReq(`/api/v1/academics/tests/${test.id}/marks`, 'POST', sess.cookieHeader, {
          records: [{ enrollmentId: enr.id, marksObtained: 105 }],
        }),
        { params: Promise.resolve({ id: test.id }) },
      );
      expect(res1.status).toBe(400);

      // 2. Negative marks (-5)
      const res2 = await marksPOST(
        makeReq(`/api/v1/academics/tests/${test.id}/marks`, 'POST', sess.cookieHeader, {
          records: [{ enrollmentId: enr.id, marksObtained: -5 }],
        }),
        { params: Promise.resolve({ id: test.id }) },
      );
      expect(res2.status).toBe(400);

      // 3. Precision > 2 decimals (85.1234)
      const res3 = await marksPOST(
        makeReq(`/api/v1/academics/tests/${test.id}/marks`, 'POST', sess.cookieHeader, {
          records: [{ enrollmentId: enr.id, marksObtained: 85.1234 }],
        }),
        { params: Promise.resolve({ id: test.id }) },
      );
      expect(res3.status).toBe(400);

      // 4. Valid marks (85.5) succeeds
      const res4 = await marksPOST(
        makeReq(`/api/v1/academics/tests/${test.id}/marks`, 'POST', sess.cookieHeader, {
          records: [{ enrollmentId: enr.id, marksObtained: 85.5 }],
        }),
        { params: Promise.resolve({ id: test.id }) },
      );
      expect(res4.status).toBe(200);
    });
  });

  // ── SEC-ADV-07: Published Immutability ───────────────────────────────────────
  describe('SEC-ADV-07: Published Immutability Boundary', () => {
    it('Published homework cannot be updated or deleted', async () => {
      const sess = await createAuthenticatedSession('owner_pub_hw');
      const inst = await createTestInstitute({ name: 'Inst Pub HW', slug: `pubhw-${crypto.randomUUID().slice(0, 6)}` });
      await createMembershipUseCase.execute({ userId: sess.user.id, instituteId: inst.id, role: 'owner' });
      const sub = await createTestSubject(inst.id, { name: 'Sub', code: 'SUB' });
      const batch = await createTestBatch(inst.id, sub.id, { name: 'Batch', code: 'B' });

      const hwRes = await homeworkPOST(
        makeReq('/api/v1/academics/homework', 'POST', sess.cookieHeader, {
          batchId: batch.id,
          title: 'Draft HW',
          description: 'Initial',
        }),
      );
      expect(hwRes.status).toBe(201);
      const hw = (await hwRes.json()).data;

      // Publish homework
      await homeworkPublishPOST(
        makeReq(`/api/v1/academics/homework/${hw.id}/publish`, 'POST', sess.cookieHeader),
        { params: Promise.resolve({ id: hw.id }) },
      );

      // Attempt PATCH edit
      const editRes = await homeworkIdPATCH(
        makeReq(`/api/v1/academics/homework/${hw.id}`, 'PATCH', sess.cookieHeader, { title: 'Modified HW' }),
        { params: Promise.resolve({ id: hw.id }) },
      );
      expect(editRes.status).toBe(400);

      // Attempt DELETE
      const delRes = await homeworkIdDELETE(
        makeReq(`/api/v1/academics/homework/${hw.id}`, 'DELETE', sess.cookieHeader),
        { params: Promise.resolve({ id: hw.id }) },
      );
      expect(delRes.status).toBe(400);
    });

    it('Published test results cannot have marks edited or test configuration modified', async () => {
      const sess = await createAuthenticatedSession('owner_pub_test');
      const inst = await createTestInstitute({ name: 'Inst Pub Test', slug: `pubt-${crypto.randomUUID().slice(0, 6)}` });
      await createMembershipUseCase.execute({ userId: sess.user.id, instituteId: inst.id, role: 'owner' });
      const sub = await createTestSubject(inst.id, { name: 'Sub', code: 'SUB' });
      const batch = await createTestBatch(inst.id, sub.id, { name: 'Batch', code: 'B' });
      const st = await createTestStudent(inst.id, { firstName: 'Student', lastName: 'P' });
      const enr = await createTestEnrollment(st.id, batch.id, { instituteId: inst.id, status: 'active' });

      const tRes = await testsPOST(
        makeReq('/api/v1/academics/tests', 'POST', sess.cookieHeader, {
          batchId: batch.id,
          title: 'Final Exam',
          maximumMarks: 100,
        }),
      );
      expect(tRes.status).toBe(201);
      const test = (await tRes.json()).data;

      // Enter initial marks
      await marksPOST(
        makeReq(`/api/v1/academics/tests/${test.id}/marks`, 'POST', sess.cookieHeader, {
          records: [{ enrollmentId: enr.id, marksObtained: 90 }],
        }),
        { params: Promise.resolve({ id: test.id }) },
      );

      // Publish test results
      await testPublishPOST(
        makeReq(`/api/v1/academics/tests/${test.id}/publish`, 'POST', sess.cookieHeader),
        { params: Promise.resolve({ id: test.id }) },
      );

      // Attempt to re-enter / update marks
      const marksRes = await marksPOST(
        makeReq(`/api/v1/academics/tests/${test.id}/marks`, 'POST', sess.cookieHeader, {
          records: [{ enrollmentId: enr.id, marksObtained: 95 }],
        }),
        { params: Promise.resolve({ id: test.id }) },
      );
      expect(marksRes.status).toBe(400);

      // Attempt PATCH test config
      const patchRes = await testIdPATCH(
        makeReq(`/api/v1/academics/tests/${test.id}`, 'PATCH', sess.cookieHeader, { title: 'Changed Title' }),
        { params: Promise.resolve({ id: test.id }) },
      );
      expect(patchRes.status).toBe(400);

      // Attempt DELETE test
      const delRes = await testIdDELETE(
        makeReq(`/api/v1/academics/tests/${test.id}`, 'DELETE', sess.cookieHeader),
        { params: Promise.resolve({ id: test.id }) },
      );
      expect(delRes.status).toBe(400);
    });
  });
});
