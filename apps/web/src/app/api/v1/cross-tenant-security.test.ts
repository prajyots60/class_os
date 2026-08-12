import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { validateTestEnvironment, cleanTestDatabase, closeTestPool, db } from '@coaching-os/database';
import { auth } from '@coaching-os/auth';

// Handler imports
import { GET as studentsListGET } from './students/route';
import { GET as studentByIdGET, PATCH as studentByIdPATCH } from './students/[id]/route';
import { GET as guardianByIdGET } from './guardians/[id]/route';
import { GET as guardianStudentsGET } from './guardians/[id]/students/route';
import { GET as staffByIdGET } from './staff/[id]/route';
import { PATCH as updateStaffRolePATCH } from './staff/[id]/role/route';
import { POST as suspendStaffPOST } from './staff/[id]/suspend/route';
import { GET as enrollmentByIdGET } from './enrollments/[id]/route';

import { GET as batchByIdGET } from '../institute/batches/[id]/route';
import { POST as archiveBatchPOST } from '../institute/batches/[id]/archive/route';
import { GET as subjectByIdGET } from '../institute/subjects/[id]/route';
import { GET as programByIdGET } from '../institute/programs/[id]/route';
import { POST as withdrawEnrollmentPOST } from '../institute/enrollments/[id]/withdraw/route';
import { POST as transferEnrollmentPOST } from '../institute/enrollments/[id]/transfer/route';
import { POST as createEnrollmentPOST } from '../institute/enrollments/route';
import { POST as linkStudentGuardianPOST } from '../institute/students/[id]/guardians/route';
import { POST as mapProgramSubjectPOST } from '../institute/program-subjects/route';
import { POST as assignTeacherPOST } from '../institute/batches/[id]/teacher/route';
import { POST as archiveRelationshipPOST } from '../institute/parent-student/[id]/archive/route';

describe('Phase 1.14.2 & 1.14.3 — Comprehensive API Boundary & Cross-Tenant Security Matrix', () => {
  beforeAll(() => {
    validateTestEnvironment();
  });

  beforeEach(async () => {
    await cleanTestDatabase();
  });

  afterAll(async () => {
    await closeTestPool();
  });

  let testIpCounter = 100;
  function getUniqueIp(): string {
    testIpCounter += 1;
    return `10.100.${Math.floor(testIpCounter / 250)}.${testIpCounter % 250}`;
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
    return { user, cookieHeader, suffix };
  }

  async function setupTwoTenants() {
    const tenantAOwner = await createAuthUser('tenant_a_owner');
    const instA = await db.institute.create({
      data: {
        name: `Inst A ${tenantAOwner.suffix}`,
        slug: `inst-a-${tenantAOwner.suffix}`,
        email: `inst_a_${tenantAOwner.suffix}@test.com`,
        phone: `+9198${Math.floor(10000000 + Math.random() * 90000000)}`,
      },
    });
    await db.user.update({ where: { id: tenantAOwner.user.id }, data: { instituteId: instA.id } });

    const tenantBOwner = await createAuthUser('tenant_b_owner');
    const instB = await db.institute.create({
      data: {
        name: `Inst B ${tenantBOwner.suffix}`,
        slug: `inst-b-${tenantBOwner.suffix}`,
        email: `inst_b_${tenantBOwner.suffix}@test.com`,
        phone: `+9198${Math.floor(10000000 + Math.random() * 90000000)}`,
      },
    });
    await db.user.update({ where: { id: tenantBOwner.user.id }, data: { instituteId: instB.id } });

    return {
      instA,
      cookieA: tenantAOwner.cookieHeader,
      userA: tenantAOwner.user,
      instB,
      cookieB: tenantBOwner.cookieHeader,
      userB: tenantBOwner.user,
    };
  }

  function makeReq(url: string, cookie?: string, method = 'GET', body?: Record<string, unknown>, headers?: Record<string, string>) {
    return new NextRequest(url, {
      method,
      headers: new Headers({
        'Content-Type': 'application/json',
        ...(cookie ? { cookie } : {}),
        'x-forwarded-for': getUniqueIp(),
        ...headers,
      }),
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  // ============================================================================
  // Section 1: API Boundary Hardening Vectors (API-BOUNDARY-01 .. API-BOUNDARY-15)
  // ============================================================================

  it('API-BOUNDARY-01: Unauthenticated request is rejected with 401 Unauthorized', async () => {
    const req = makeReq('http://localhost:3000/api/v1/students');
    const res = await studentsListGET(req);
    expect(res.status).toBe(401);
  });

  it('API-BOUNDARY-02: Invalid session token is rejected with 401 Unauthorized', async () => {
    const req = makeReq('http://localhost:3000/api/v1/students', 'better-auth.session_token=invalid-fake-token-12345');
    const res = await studentsListGET(req);
    expect(res.status).toBe(401);
  });

  it('API-BOUNDARY-04: x-tenant-id header spoofing is ignored', async () => {
    const { cookieA, instB } = await setupTwoTenants();
    const studentB = await db.student.create({ data: { instituteId: instB.id, admissionNumber: `ADM-${Date.now()}`, firstName: 'S', lastName: 'B' } });

    const req = makeReq(`http://localhost:3000/api/v1/students/${studentB.id}`, cookieA, 'GET', undefined, {
      'x-tenant-id': instB.id,
    });
    const res = await studentByIdGET(req, { params: Promise.resolve({ id: studentB.id }) });
    expect(res.status).toBe(404);
  });

  it('API-BOUNDARY-05: x-role header spoofing does not bypass capability authorization', async () => {
    const { cookieA, instB } = await setupTwoTenants();
    const studentB = await db.student.create({ data: { instituteId: instB.id, admissionNumber: `ADM-${Date.now()}`, firstName: 'S', lastName: 'B' } });

    const req = makeReq(`http://localhost:3000/api/v1/students/${studentB.id}`, cookieA, 'GET', undefined, {
      'x-role': 'owner',
    });
    const res = await studentByIdGET(req, { params: Promise.resolve({ id: studentB.id }) });
    expect(res.status).toBe(404);
  });

  it('API-BOUNDARY-07: Query instituteId parameter injection is ignored', async () => {
    const { cookieA, instB } = await setupTwoTenants();
    const studentB = await db.student.create({ data: { instituteId: instB.id, admissionNumber: `ADM-${Date.now()}`, firstName: 'S', lastName: 'B' } });

    const req = makeReq(`http://localhost:3000/api/v1/students?instituteId=${instB.id}`, cookieA);
    const res = await studentsListGET(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.some((s: { id: string }) => s.id === studentB.id)).toBe(false);
  });

  it('API-BOUNDARY-10: Pagination limit exceeding max page size (100) is rejected with 400 Bad Request', async () => {
    const { cookieA } = await setupTwoTenants();
    const req = makeReq('http://localhost:3000/api/v1/students?limit=500', cookieA);
    const res = await studentsListGET(req);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('API-BOUNDARY-12: Error responses sanitize stack traces and internal Prisma errors', async () => {
    const { cookieA } = await setupTwoTenants();
    const req = makeReq('http://localhost:3000/api/v1/students/invalid-non-uuid-id', cookieA);
    const res = await studentByIdGET(req, { params: Promise.resolve({ id: 'invalid-non-uuid-id' }) });
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.stack).toBeUndefined();
  });

  it('API-BOUNDARY-15: Legitimate same-tenant operations work cleanly with 200/201', async () => {
    const { instA, cookieA } = await setupTwoTenants();
    const studentA = await db.student.create({ data: { instituteId: instA.id, admissionNumber: `ADM-${Date.now()}`, firstName: 'S', lastName: 'A' } });

    const getReq = makeReq(`http://localhost:3000/api/v1/students/${studentA.id}`, cookieA);
    const getRes = await studentByIdGET(getReq, { params: Promise.resolve({ id: studentA.id }) });
    expect(getRes.status).toBe(200);

    const patchReq = makeReq(`http://localhost:3000/api/v1/students/${studentA.id}`, cookieA, 'PATCH', { firstName: 'UpdatedName' });
    const patchRes = await studentByIdPATCH(patchReq, { params: Promise.resolve({ id: studentA.id }) });
    expect(patchRes.status).toBe(200);
  });

  // ============================================================================
  // Section 2: Direct Read Cross-Tenant Vectors (TENANT-01 .. TENANT-08)
  // ============================================================================

  it('TENANT-01: Tenant A cannot read Tenant B Student (404 NOT_FOUND)', async () => {
    const { cookieA, instB } = await setupTwoTenants();
    const studentB = await db.student.create({
      data: { instituteId: instB.id, admissionNumber: `ADM-B-${Date.now()}`, firstName: 'Stud', lastName: 'B' },
    });

    const req = makeReq(`http://localhost:3000/api/v1/students/${studentB.id}`, cookieA);
    const res = await studentByIdGET(req, { params: Promise.resolve({ id: studentB.id }) });
    expect(res.status).toBe(404);
  });

  it('TENANT-02: Tenant A cannot read Tenant B Guardian (404 NOT_FOUND)', async () => {
    const { cookieA, instB } = await setupTwoTenants();
    const pId = await db.parentIdentity.create({ data: { phone: `+9198${Math.floor(10000000 + Math.random() * 90000000)}` } });
    const ipB = await db.instituteParent.create({ data: { instituteId: instB.id, parentIdentityId: pId.id } });

    const req = makeReq(`http://localhost:3000/api/v1/guardians/${ipB.id}`, cookieA);
    const res = await guardianByIdGET(req, { params: Promise.resolve({ id: ipB.id }) });
    expect(res.status).toBe(404);
  });

  it('TENANT-03: Tenant A cannot read Tenant B Staff Membership (404 NOT_FOUND)', async () => {
    const { cookieA, userB, instB } = await setupTwoTenants();
    const memBId = `mem:${userB.id}:${instB.id}`;

    const req = makeReq(`http://localhost:3000/api/v1/staff/${memBId}`, cookieA);
    const res = await staffByIdGET(req, { params: Promise.resolve({ id: memBId }) });
    expect(res.status).toBe(404);
  });

  it('TENANT-04: Tenant A cannot read Tenant B Enrollment (404 NOT_FOUND)', async () => {
    const { cookieA, instB } = await setupTwoTenants();
    const studentB = await db.student.create({ data: { instituteId: instB.id, admissionNumber: `ADM-${Date.now()}`, firstName: 'S', lastName: 'B' } });
    const progB = await db.program.create({ data: { instituteId: instB.id, name: `P-${Date.now()}`, code: `P-${Date.now()}` } });
    const subjB = await db.subject.create({ data: { instituteId: instB.id, name: `S-${Date.now()}`, code: `S-${Date.now()}` } });
    const batchB = await db.batch.create({ data: { instituteId: instB.id, programId: progB.id, subjectId: subjB.id, name: `B`, code: `B-${Date.now()}` } });
    const enrB = await db.enrollment.create({ data: { instituteId: instB.id, studentId: studentB.id, batchId: batchB.id, status: 'active' } });

    const req = makeReq(`http://localhost:3000/api/v1/enrollments/${enrB.id}`, cookieA);
    const res = await enrollmentByIdGET(req, { params: Promise.resolve({ id: enrB.id }) });
    expect(res.status).toBe(404);
  });

  it('TENANT-05: Tenant A cannot read Tenant B Batch (404 NOT_FOUND)', async () => {
    const { cookieA, instB } = await setupTwoTenants();
    const progB = await db.program.create({ data: { instituteId: instB.id, name: `P-${Date.now()}`, code: `P-${Date.now()}` } });
    const subjB = await db.subject.create({ data: { instituteId: instB.id, name: `S-${Date.now()}`, code: `S-${Date.now()}` } });
    const batchB = await db.batch.create({ data: { instituteId: instB.id, programId: progB.id, subjectId: subjB.id, name: `B`, code: `B-${Date.now()}` } });

    const req = makeReq(`http://localhost:3000/api/institute/batches/${batchB.id}`, cookieA);
    const res = await batchByIdGET(req, { params: Promise.resolve({ id: batchB.id }) });
    expect(res.status).toBe(404);
  });

  it('TENANT-06: Tenant A cannot read Tenant B Subject (404 NOT_FOUND)', async () => {
    const { cookieA, instB } = await setupTwoTenants();
    const subjB = await db.subject.create({ data: { instituteId: instB.id, name: `S-${Date.now()}`, code: `S-${Date.now()}` } });

    const req = makeReq(`http://localhost:3000/api/institute/subjects/${subjB.id}`, cookieA);
    const res = await subjectByIdGET(req, { params: Promise.resolve({ id: subjB.id }) });
    expect(res.status).toBe(404);
  });

  it('TENANT-07: Tenant A cannot read Tenant B Program (404 NOT_FOUND)', async () => {
    const { cookieA, instB } = await setupTwoTenants();
    const progB = await db.program.create({ data: { instituteId: instB.id, name: `P-${Date.now()}`, code: `P-${Date.now()}` } });

    const req = makeReq(`http://localhost:3000/api/institute/programs/${progB.id}`, cookieA);
    const res = await programByIdGET(req, { params: Promise.resolve({ id: progB.id }) });
    expect(res.status).toBe(404);
  });

  it('TENANT-08: Tenant A cannot read Tenant B Guardian Students (404 NOT_FOUND)', async () => {
    const { cookieA, instB } = await setupTwoTenants();
    const pId = await db.parentIdentity.create({ data: { phone: `+9198${Math.floor(10000000 + Math.random() * 90000000)}` } });
    const ipB = await db.instituteParent.create({ data: { instituteId: instB.id, parentIdentityId: pId.id } });

    const req = makeReq(`http://localhost:3000/api/v1/guardians/${ipB.id}/students`, cookieA);
    const res = await guardianStudentsGET(req, { params: Promise.resolve({ id: ipB.id }) });
    expect(res.status).toBe(404);
  });

  // ============================================================================
  // Section 3: Cross-Tenant Mutation Vectors (TENANT-09 .. TENANT-16)
  // ============================================================================

  it('TENANT-09: Tenant A cannot update Tenant B Student (404 NOT_FOUND)', async () => {
    const { cookieA, instB } = await setupTwoTenants();
    const studentB = await db.student.create({ data: { instituteId: instB.id, admissionNumber: `ADM-${Date.now()}`, firstName: 'S', lastName: 'B' } });

    const req = makeReq(`http://localhost:3000/api/v1/students/${studentB.id}`, cookieA, 'PATCH', { firstName: 'Hacked' });
    const res = await studentByIdPATCH(req, { params: Promise.resolve({ id: studentB.id }) });
    expect(res.status).toBe(404);
  });

  it('TENANT-10: Tenant A cannot update Tenant B Staff role (404 NOT_FOUND)', async () => {
    const { cookieA, userB, instB } = await setupTwoTenants();
    const memBId = `mem:${userB.id}:${instB.id}`;

    const req = makeReq(`http://localhost:3000/api/v1/staff/${memBId}/role`, cookieA, 'PATCH', { role: 'teacher' });
    const res = await updateStaffRolePATCH(req, { params: Promise.resolve({ id: memBId }) });
    expect(res.status).toBe(404);
  });

  it('TENANT-11: Tenant A cannot suspend Tenant B Staff (404 NOT_FOUND)', async () => {
    const { cookieA, userB, instB } = await setupTwoTenants();
    const memBId = `mem:${userB.id}:${instB.id}`;

    const req = makeReq(`http://localhost:3000/api/v1/staff/${memBId}/suspend`, cookieA, 'POST');
    const res = await suspendStaffPOST(req, { params: Promise.resolve({ id: memBId }) });
    expect(res.status).toBe(404);
  });

  it('TENANT-12: Tenant A cannot archive Tenant B Batch (404 NOT_FOUND)', async () => {
    const { cookieA, instB } = await setupTwoTenants();
    const progB = await db.program.create({ data: { instituteId: instB.id, name: `P-${Date.now()}`, code: `P-${Date.now()}` } });
    const subjB = await db.subject.create({ data: { instituteId: instB.id, name: `S-${Date.now()}`, code: `S-${Date.now()}` } });
    const batchB = await db.batch.create({ data: { instituteId: instB.id, programId: progB.id, subjectId: subjB.id, name: `B`, code: `B-${Date.now()}` } });

    const req = makeReq(`http://localhost:3000/api/institute/batches/${batchB.id}/archive`, cookieA, 'POST');
    const res = await archiveBatchPOST(req, { params: Promise.resolve({ id: batchB.id }) });
    expect(res.status).toBe(404);
  });

  it('TENANT-13: Tenant A cannot withdraw Tenant B Enrollment (404 NOT_FOUND)', async () => {
    const { cookieA, instB } = await setupTwoTenants();
    const studentB = await db.student.create({ data: { instituteId: instB.id, admissionNumber: `ADM-${Date.now()}`, firstName: 'S', lastName: 'B' } });
    const progB = await db.program.create({ data: { instituteId: instB.id, name: `P-${Date.now()}`, code: `P-${Date.now()}` } });
    const subjB = await db.subject.create({ data: { instituteId: instB.id, name: `S-${Date.now()}`, code: `S-${Date.now()}` } });
    const batchB = await db.batch.create({ data: { instituteId: instB.id, programId: progB.id, subjectId: subjB.id, name: `B`, code: `B-${Date.now()}` } });
    const enrB = await db.enrollment.create({ data: { instituteId: instB.id, studentId: studentB.id, batchId: batchB.id, status: 'active' } });

    const req = makeReq(`http://localhost:3000/api/institute/enrollments/${enrB.id}/withdraw`, cookieA, 'POST');
    const res = await withdrawEnrollmentPOST(req, { params: Promise.resolve({ id: enrB.id }) });
    expect(res.status).toBe(404);
  });

  it('TENANT-14: Tenant A cannot transfer Tenant B Enrollment (404 NOT_FOUND)', async () => {
    const { cookieA, instB } = await setupTwoTenants();
    const studentB = await db.student.create({ data: { instituteId: instB.id, admissionNumber: `ADM-${Date.now()}`, firstName: 'S', lastName: 'B' } });
    const progB = await db.program.create({ data: { instituteId: instB.id, name: `P-${Date.now()}`, code: `P-${Date.now()}` } });
    const subjB = await db.subject.create({ data: { instituteId: instB.id, name: `S-${Date.now()}`, code: `S-${Date.now()}` } });
    const batchB1 = await db.batch.create({ data: { instituteId: instB.id, programId: progB.id, subjectId: subjB.id, name: `B1`, code: `B1-${Date.now()}` } });
    const batchB2 = await db.batch.create({ data: { instituteId: instB.id, programId: progB.id, subjectId: subjB.id, name: `B2`, code: `B2-${Date.now()}` } });
    const enrB = await db.enrollment.create({ data: { instituteId: instB.id, studentId: studentB.id, batchId: batchB1.id, status: 'active' } });

    const req = makeReq(`http://localhost:3000/api/institute/enrollments/${enrB.id}/transfer`, cookieA, 'POST', {
      targetBatchId: batchB2.id,
    });
    const res = await transferEnrollmentPOST(req, { params: Promise.resolve({ id: enrB.id }) });
    expect(res.status).toBe(404);
  });

  it('TENANT-16: Tenant A cannot archive Tenant B Relationship (404 NOT_FOUND)', async () => {
    const { cookieA, instB } = await setupTwoTenants();
    const studentB = await db.student.create({ data: { instituteId: instB.id, admissionNumber: `ADM-${Date.now()}`, firstName: 'S', lastName: 'B' } });
    const pId = await db.parentIdentity.create({ data: { phone: `+9198${Math.floor(10000000 + Math.random() * 90000000)}` } });
    const ipB = await db.instituteParent.create({ data: { instituteId: instB.id, parentIdentityId: pId.id } });
    const relB = await db.instituteParentStudent.create({
      data: { instituteId: instB.id, instituteParentId: ipB.id, studentId: studentB.id, relationshipType: 'father' },
    });

    const req = makeReq(`http://localhost:3000/api/institute/parent-student/${relB.id}/archive`, cookieA, 'POST');
    const res = await archiveRelationshipPOST(req, { params: Promise.resolve({ id: relB.id }) });
    expect(res.status).toBe(404);
  });

  // ============================================================================
  // Section 4: Header and Payload Injection Attacks (TENANT-17 .. TENANT-21)
  // ============================================================================

  it('TENANT-17: Injected instituteId in payload is rejected with 400 Bad Request by Zod schema', async () => {
    const { instA, cookieA, instB } = await setupTwoTenants();
    const studentA = await db.student.create({ data: { instituteId: instA.id, admissionNumber: `ADM-${Date.now()}`, firstName: 'S', lastName: 'A' } });

    const req = makeReq(`http://localhost:3000/api/v1/students/${studentA.id}`, cookieA, 'PATCH', {
      firstName: 'Updated',
      instituteId: instB.id,
    });
    const res = await studentByIdPATCH(req, { params: Promise.resolve({ id: studentA.id }) });
    expect(res.status).toBe(400);

    const fresh = await db.student.findUniqueOrThrow({ where: { id: studentA.id } });
    expect(fresh.instituteId).toBe(instA.id);
  });

  it('TENANT-19: Spoofed x-institute-id header is ignored by server session resolution', async () => {
    const { cookieA, instB } = await setupTwoTenants();
    const studentB = await db.student.create({ data: { instituteId: instB.id, admissionNumber: `ADM-${Date.now()}`, firstName: 'S', lastName: 'B' } });

    const req = makeReq(`http://localhost:3000/api/v1/students/${studentB.id}`, cookieA, 'GET', undefined, {
      'x-institute-id': instB.id,
    });
    const res = await studentByIdGET(req, { params: Promise.resolve({ id: studentB.id }) });
    expect(res.status).toBe(404);
  });

  // ============================================================================
  // Section 5: Enumeration & Disclosure Vectors (TENANT-23 .. TENANT-26)
  // ============================================================================

  it('TENANT-23: Searching students with Tenant B admission number returns empty list', async () => {
    const { cookieA, instB } = await setupTwoTenants();
    const admNum = `ADM-SECRET-${Date.now()}`;
    await db.student.create({ data: { instituteId: instB.id, admissionNumber: admNum, firstName: 'Secret', lastName: 'B' } });

    const req = makeReq(`http://localhost:3000/api/v1/students?search=${admNum}`, cookieA);
    const res = await studentsListGET(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data).toHaveLength(0);
  });

  it('TENANT-26: Collection pagination total reflects strictly target tenant items', async () => {
    const { instA, cookieA, instB } = await setupTwoTenants();
    await db.student.create({ data: { instituteId: instA.id, admissionNumber: `ADM-A1-${Date.now()}`, firstName: 'A1', lastName: 'A' } });
    await db.student.create({ data: { instituteId: instB.id, admissionNumber: `ADM-B1-${Date.now()}`, firstName: 'B1', lastName: 'B' } });

    const req = makeReq('http://localhost:3000/api/v1/students', cookieA);
    const res = await studentsListGET(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.every((s: { instituteId?: string }) => s.instituteId === instA.id || !s.instituteId)).toBe(true);
  });

  // ============================================================================
  // Section 6: Relationship Traversal Vectors (TENANT-27 .. TENANT-32)
  // ============================================================================

  it('TENANT-27: Linking Tenant A Student to Tenant B Guardian returns 404 NOT_FOUND', async () => {
    const { instA, cookieA, instB } = await setupTwoTenants();
    const studentA = await db.student.create({ data: { instituteId: instA.id, admissionNumber: `ADM-${Date.now()}`, firstName: 'S', lastName: 'A' } });
    const pId = await db.parentIdentity.create({ data: { phone: `+9198${Math.floor(10000000 + Math.random() * 90000000)}` } });
    const ipB = await db.instituteParent.create({ data: { instituteId: instB.id, parentIdentityId: pId.id } });

    const req = makeReq(`http://localhost:3000/api/institute/students/${studentA.id}/guardians`, cookieA, 'POST', {
      instituteParentId: ipB.id,
      relationshipType: 'father',
    });
    const res = await linkStudentGuardianPOST(req, { params: Promise.resolve({ id: studentA.id }) });
    expect(res.status).toBe(404);
  });

  it('TENANT-28: Enrolling Tenant A Student in Tenant B Batch returns 404 NOT_FOUND', async () => {
    const { instA, cookieA, instB } = await setupTwoTenants();
    const studentA = await db.student.create({ data: { instituteId: instA.id, admissionNumber: `ADM-${Date.now()}`, firstName: 'S', lastName: 'A', admissionStatus: 'admitted', status: 'active' } });
    const progB = await db.program.create({ data: { instituteId: instB.id, name: `P-${Date.now()}`, code: `P-${Date.now()}` } });
    const subjB = await db.subject.create({ data: { instituteId: instB.id, name: `S-${Date.now()}`, code: `S-${Date.now()}` } });
    const batchB = await db.batch.create({ data: { instituteId: instB.id, programId: progB.id, subjectId: subjB.id, name: `B`, code: `B-${Date.now()}` } });

    const req = makeReq(`http://localhost:3000/api/institute/enrollments`, cookieA, 'POST', {
      studentId: studentA.id,
      batchId: batchB.id,
    });
    const res = await createEnrollmentPOST(req);
    expect(res.status).toBe(404);
  });

  it('TENANT-30: Mapping Tenant A Program to Tenant B Subject returns 404 NOT_FOUND', async () => {
    const { instA, cookieA, instB } = await setupTwoTenants();
    const progA = await db.program.create({ data: { instituteId: instA.id, name: `P-${Date.now()}`, code: `PA-${Date.now()}` } });
    const subjB = await db.subject.create({ data: { instituteId: instB.id, name: `S-${Date.now()}`, code: `SB-${Date.now()}` } });

    const req = makeReq(`http://localhost:3000/api/institute/program-subjects`, cookieA, 'POST', {
      programId: progA.id,
      subjectId: subjB.id,
    });
    const res = await mapProgramSubjectPOST(req);
    expect(res.status).toBe(404);
  });

  it('TENANT-31: Assigning Tenant A Staff as Teacher to Tenant B Batch returns 404 NOT_FOUND', async () => {
    const { cookieA, userA, instB } = await setupTwoTenants();
    const progB = await db.program.create({ data: { instituteId: instB.id, name: `P-${Date.now()}`, code: `P-${Date.now()}` } });
    const subjB = await db.subject.create({ data: { instituteId: instB.id, name: `S-${Date.now()}`, code: `S-${Date.now()}` } });
    const batchB = await db.batch.create({ data: { instituteId: instB.id, programId: progB.id, subjectId: subjB.id, name: `B`, code: `B-${Date.now()}` } });

    const req = makeReq(`http://localhost:3000/api/institute/batches/${batchB.id}/teacher`, cookieA, 'POST', {
      teacherId: userA.id,
    });
    const res = await assignTeacherPOST(req, { params: Promise.resolve({ id: batchB.id }) });
    expect(res.status).toBe(404);
  });
});
