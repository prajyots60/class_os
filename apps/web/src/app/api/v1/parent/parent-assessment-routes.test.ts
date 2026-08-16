import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@coaching-os/database';
import { signSessionToken } from '@coaching-os/auth';
import { GET as assessmentsGET, POST as assessmentsPOST } from './students/[id]/assessments/route';

describe('Phase 5.7 — Parent Assessment REST Routes Security & Isolation Matrix', () => {
  let pidA: { id: string };
  let pidB: { id: string };
  let userA: { id: string };
  let userB: { id: string };
  let institute: { id: string };
  let batch: { id: string };
  let studentA: { id: string; instituteId: string };
  let studentB: { id: string; instituteId: string };
  let enrollmentA: { id: string };
  let childProfileA: { id: string };
  let publishedTest: { id: string };
  let validSessionTokenA: string;
  let validSessionTokenB: string;

  beforeEach(async () => {
    // 1. Create Institute
    institute = await db.institute.create({
      data: {
        name: 'Assessment Test Institute',
        slug: `assess-test-inst-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        phone: `+9198${Math.floor(10000000 + Math.random() * 90000000)}`,
        email: `assess-inst-${Date.now()}@example.com`,
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
        email: `parent-assess-a-${Date.now()}@example.com`,
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
        email: `parent-assess-b-${Date.now()}@example.com`,
        name: 'Parent User B',
        phone: phoneB,
        status: 'active',
      },
    });

    // 3. Create Students & Batch
    studentA = await db.student.create({
      data: {
        instituteId: institute.id,
        firstName: 'Aarav',
        lastName: 'Sharma',
        admissionNumber: `ADM-${Date.now()}-A`,
      },
    });
    studentB = await db.student.create({
      data: {
        instituteId: institute.id,
        firstName: 'Ananya',
        lastName: 'Verma',
        admissionNumber: `ADM-${Date.now()}-B`,
      },
    });

    const subject = await db.subject.create({
      data: {
        instituteId: institute.id,
        name: 'Physics',
        code: `SUB-${Date.now()}`,
      },
    });

    batch = await db.batch.create({
      data: {
        instituteId: institute.id,
        subjectId: subject.id,
        name: 'JEE Physics Batch 2026',
        code: `BATCH-${Date.now()}`,
      },
    });

    enrollmentA = await db.enrollment.create({
      data: {
        instituteId: institute.id,
        studentId: studentA.id,
        batchId: batch.id,
        status: 'active',
      },
    });

    // 4. Create Parent A -> Child Profile -> Student A Link
    childProfileA = await db.childProfile.create({
      data: {
        parentIdentityId: pidA.id,
        name: 'Aarav Sharma',
      },
    });

    const instParent = await db.instituteParent.create({
      data: {
        instituteId: institute.id,
        parentIdentityId: pidA.id,
        status: 'active',
      },
    });

    await db.instituteParentStudent.create({
      data: {
        instituteId: institute.id,
        instituteParentId: instParent.id,
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

    // 5. Sessions
    const tokenStrA = `sess-token-assess-a-${Date.now()}`;
    await db.session.create({
      data: {
        userId: userA.id,
        token: tokenStrA,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    validSessionTokenA = signSessionToken(tokenStrA);

    const tokenStrB = `sess-token-assess-b-${Date.now()}`;
    await db.session.create({
      data: {
        userId: userB.id,
        token: tokenStrB,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    validSessionTokenB = signSessionToken(tokenStrB);

    // 6. Create Published Test & Marks for Student A
    publishedTest = await db.test.create({
      data: {
        instituteId: institute.id,
        batchId: batch.id,
        title: 'Physics Mechanics Unit Test',
        maximumMarks: 50,
        scheduledDate: new Date('2026-08-15'),
        status: 'published',
      },
    });

    await db.marks.create({
      data: {
        instituteId: institute.id as string,
        testId: publishedTest.id as string,
        enrollmentId: enrollmentA.id as string,
        marksObtained: 42.0,
      },
    });

    // 7. Create Draft Test (should be excluded)
    await db.test.create({
      data: {
        instituteId: institute.id as string,
        batchId: batch.id as string,
        title: 'Draft Physics Test',
        maximumMarks: 100,
        status: 'draft',
      },
    });
  });

  describe('GET /api/v1/parent/students/[id]/assessments', () => {
    it('PARENT-ASSESS-API-001: returns 401 when request is unauthenticated', async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/v1/parent/students/${studentA.id}/assessments`,
      );
      const res = await assessmentsGET(req, { params: Promise.resolve({ id: studentA.id }) });
      expect(res.status).toBe(401);
    });

    it('PARENT-ASSESS-API-002: returns 401 when session is expired', async () => {
      const expToken = `exp-sess-${Date.now()}`;
      await db.session.create({
        data: {
          userId: userA.id,
          token: expToken,
          expiresAt: new Date(Date.now() - 1000),
        },
      });
      const expiredToken = signSessionToken(expToken);

      const req = new NextRequest(
        `http://localhost:3000/api/v1/parent/students/${studentA.id}/assessments`,
        { headers: { Cookie: `better-auth.session_token=${expiredToken}` } },
      );
      const res = await assessmentsGET(req, { params: Promise.resolve({ id: studentA.id }) });
      expect(res.status).toBe(401);
    });

    it('PARENT-ASSESS-API-003: returns 401 when parent identity is suspended', async () => {
      await db.parentIdentity.update({
        where: { id: pidA.id },
        data: { status: 'suspended' },
      });

      const req = new NextRequest(
        `http://localhost:3000/api/v1/parent/students/${studentA.id}/assessments`,
        { headers: { Cookie: `better-auth.session_token=${validSessionTokenA}` } },
      );
      const res = await assessmentsGET(req, { params: Promise.resolve({ id: studentA.id }) });
      expect(res.status).toBe(401);
    });

    it('PARENT-ASSESS-API-004: returns 401 when parent identity is deactivated', async () => {
      await db.parentIdentity.update({
        where: { id: pidA.id },
        data: { status: 'deactivated' },
      });

      const req = new NextRequest(
        `http://localhost:3000/api/v1/parent/students/${studentA.id}/assessments`,
        { headers: { Cookie: `better-auth.session_token=${validSessionTokenA}` } },
      );
      const res = await assessmentsGET(req, { params: Promise.resolve({ id: studentA.id }) });
      expect(res.status).toBe(401);
    });

    it('PARENT-ASSESS-API-005: returns 404 Universal Masking when parent is unauthorized for target student', async () => {
      // Parent B attempting to access Parent A's student (Student A)
      const req = new NextRequest(
        `http://localhost:3000/api/v1/parent/students/${studentA.id}/assessments`,
        { headers: { Cookie: `better-auth.session_token=${validSessionTokenB}` } },
      );
      const res = await assessmentsGET(req, { params: Promise.resolve({ id: studentA.id }) });
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error.code).toBe('NOT_FOUND');
    });

    it('PARENT-ASSESS-API-006: returns 404 Universal Masking for non-existent student ID', async () => {
      const randomUuid = '00000000-0000-4000-a000-000000000000';
      const req = new NextRequest(
        `http://localhost:3000/api/v1/parent/students/${randomUuid}/assessments`,
        { headers: { Cookie: `better-auth.session_token=${validSessionTokenA}` } },
      );
      const res = await assessmentsGET(req, { params: Promise.resolve({ id: randomUuid }) });
      expect(res.status).toBe(404);
    });

    it('PARENT-ASSESS-API-007: client-supplied parentIdentityId in query params is ignored', async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/v1/parent/students/${studentA.id}/assessments?parentIdentityId=${pidB.id}`,
        { headers: { Cookie: `better-auth.session_token=${validSessionTokenA}` } },
      );
      const res = await assessmentsGET(req, { params: Promise.resolve({ id: studentA.id }) });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.student.id).toBe(studentA.id);
    });

    it('PARENT-ASSESS-API-008: client-supplied instituteId cannot bypass tenant authorization', async () => {
      const otherInstUuid = '00000000-0000-4000-a000-000000000001';
      const req = new NextRequest(
        `http://localhost:3000/api/v1/parent/students/${studentA.id}/assessments?instituteId=${otherInstUuid}`,
        { headers: { Cookie: `better-auth.session_token=${validSessionTokenA}` } },
      );
      const res = await assessmentsGET(req, { params: Promise.resolve({ id: studentA.id }) });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.student.instituteId).toBe(institute.id);
    });

    it('PARENT-ASSESS-API-009: returns 200 with summary and assessments for authorized student', async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/v1/parent/students/${studentA.id}/assessments`,
        { headers: { Cookie: `better-auth.session_token=${validSessionTokenA}` } },
      );
      const res = await assessmentsGET(req, { params: Promise.resolve({ id: studentA.id }) });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.data).toBeDefined();
      expect(body.data.student.fullName).toBe('Aarav Sharma');
      expect(body.data.summary.totalAssessments).toBe(1);
      expect(body.data.summary.averagePercentage).toBe(84);
      expect(body.data.summary.highestPercentage).toBe(84);

      expect(body.data.assessments).toHaveLength(1);
      expect(body.data.assessments[0].title).toBe('Physics Mechanics Unit Test');
      expect(body.data.assessments[0].marksObtained).toBe(42);
      expect(body.data.assessments[0].maximumMarks).toBe(50);
      expect(body.data.assessments[0].percentage).toBe(84);
    });

    it('PARENT-ASSESS-API-010: strictly excludes non-published tests (draft/scheduled/marks_entered)', async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/v1/parent/students/${studentA.id}/assessments`,
        { headers: { Cookie: `better-auth.session_token=${validSessionTokenA}` } },
      );
      const res = await assessmentsGET(req, { params: Promise.resolve({ id: studentA.id }) });
      expect(res.status).toBe(200);

      const body = await res.json();
      const testTitles = body.data.assessments.map((a: { title: string }) => a.title);
      expect(testTitles).toContain('Physics Mechanics Unit Test');
      expect(testTitles).not.toContain('Draft Physics Test');
    });

    it('PARENT-ASSESS-API-011: handles student without marks gracefully (null percentage)', async () => {
      // Create student link for Student B under Parent A (Student B has no marks)
      const childProfileB = await db.childProfile.create({
        data: {
          parentIdentityId: pidA.id,
          name: 'Ananya Verma',
        },
      });

      await db.studentLink.create({
        data: {
          childProfileId: childProfileB.id,
          instituteId: institute.id,
          studentId: studentB.id,
        },
      });

      // Enroll Student B in batch
      await db.enrollment.create({
        data: {
          instituteId: institute.id,
          studentId: studentB.id,
          batchId: batch.id,
          status: 'active',
        },
      });

      const req = new NextRequest(
        `http://localhost:3000/api/v1/parent/students/${studentB.id}/assessments`,
        { headers: { Cookie: `better-auth.session_token=${validSessionTokenA}` } },
      );
      const res = await assessmentsGET(req, { params: Promise.resolve({ id: studentB.id }) });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.data.summary.totalAssessments).toBe(1);
      expect(body.data.summary.averagePercentage).toBeNull();
      expect(body.data.assessments[0].marksObtained).toBeNull();
      expect(body.data.assessments[0].percentage).toBeNull();
    });

    it('PARENT-ASSESS-API-012: rejects POST method with 405 Method Not Allowed', async () => {
      const res = await assessmentsPOST();
      expect(res.status).toBe(405);
    });
  });
});
