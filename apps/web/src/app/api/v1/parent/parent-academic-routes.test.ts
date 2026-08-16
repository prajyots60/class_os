import { describe, it, expect, beforeEach } from 'vitest';
import crypto from 'node:crypto';
import { db } from '@coaching-os/database';
import { signSessionToken } from '@coaching-os/auth';
import { NextRequest } from 'next/server';
import { GET as attendanceGET, POST as attendancePOST } from './students/[id]/attendance/route';
import { GET as homeworkGET, POST as homeworkPOST } from './students/[id]/homework/route';

describe('Phase 5.6 — Parent Academic REST Routes Security & Isolation Matrix', () => {
  let _parentUserA: { id: string; phone: string | null };
  let _parentIdentityAId: string;
  let sessionTokenA: string;

  let _parentUserB: { id: string; phone: string | null };
  let _parentIdentityBId: string;
  let sessionTokenB: string;

  let institute: { id: string };
  let batch: { id: string };
  let studentA: { id: string };
  let _studentB: { id: string };
  let batchSession: { id: string };
  let publishedHomework: { id: string };
  let draftHomework: { id: string };

  beforeEach(async () => {
    // 1. Create Institute
    const rawId = crypto.randomUUID();
    institute = await db.institute.create({
      data: {
        id: rawId,
        name: `Academic Test Inst ${rawId.slice(0, 8)}`,
        slug: `acad-inst-${rawId.slice(0, 8)}`,
        phone: '+919876543210',
        email: `acad-${rawId.slice(0, 6)}@inst.com`,
      },
    });

    // 2. Create Subject & Batch
    const subject = await db.subject.create({
      data: {
        instituteId: institute.id,
        name: 'Physics',
        code: `SUB-${rawId.slice(0, 4)}`,
      },
    });

    batch = await db.batch.create({
      data: {
        instituteId: institute.id,
        subjectId: subject.id,
        name: 'Physics Batch A',
        code: `PHY-${rawId.slice(0, 4)}`,
      },
    });

    // 3. Create Student A & B
    studentA = await db.student.create({
      data: {
        instituteId: institute.id,
        firstName: 'Student',
        lastName: 'A',
        admissionNumber: `ADM-${crypto.randomUUID().slice(0, 6)}`,
        status: 'active',
      },
    });

    studentB = await db.student.create({
      data: {
        instituteId: institute.id,
        firstName: 'Student',
        lastName: 'B',
        admissionNumber: `ADM-${crypto.randomUUID().slice(0, 6)}`,
        status: 'active',
      },
    });

    // 4. Enroll Student A in Batch
    const enrollmentA = await db.enrollment.create({
      data: {
        instituteId: institute.id,
        studentId: studentA.id,
        batchId: batch.id,
        status: 'active',
      },
    });

    // 5. Create Parent Identity A & Link to Student A
    const phoneA = `+9198${Math.floor(10000000 + Math.random() * 90000000)}`;
    const pidA = await db.parentIdentity.create({
      data: {
        phone: phoneA,
        status: 'active',
      },
    });
    _parentIdentityAId = pidA.id;

    const uA = await db.user.create({
      data: {
        parentIdentityId: pidA.id,
        email: `parentA-${crypto.randomUUID().slice(0, 6)}@test.com`,
        name: 'Parent User A',
        phone: phoneA,
        status: 'active',
      },
    });
    _parentUserA = { id: uA.id, phone: uA.phone };

    const childProfileA = await db.childProfile.create({
      data: {
        parentIdentityId: pidA.id,
        name: 'Child A',
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

    // Create session for Parent A
    const sessTokenA = `token-A-${crypto.randomUUID()}`;
    await db.session.create({
      data: {
        userId: uA.id,
        token: sessTokenA,
        expiresAt: new Date(Date.now() + 86400000),
      },
    });
    sessionTokenA = signSessionToken(sessTokenA);

    // 6. Create Parent Identity B (unlinked to Student A)
    const phoneB = `+9199${Math.floor(10000000 + Math.random() * 90000000)}`;
    const pidB = await db.parentIdentity.create({
      data: {
        phone: phoneB,
        status: 'active',
      },
    });
    _parentIdentityBId = pidB.id;

    const uB = await db.user.create({
      data: {
        parentIdentityId: pidB.id,
        email: `parentB-${crypto.randomUUID().slice(0, 6)}@test.com`,
        name: 'Parent User B',
        phone: phoneB,
        status: 'active',
      },
    });
    _parentUserB = { id: uB.id, phone: uB.phone };

    const sessTokenB = `token-B-${crypto.randomUUID()}`;
    await db.session.create({
      data: {
        userId: uB.id,
        token: sessTokenB,
        expiresAt: new Date(Date.now() + 86400000),
      },
    });
    sessionTokenB = signSessionToken(sessTokenB);

    // 7. Create BatchSession & Attendance Record for Student A
    batchSession = await db.batchSession.create({
      data: {
        instituteId: institute.id,
        batchId: batch.id,
        date: new Date(),
        startTime: '10:00',
        endTime: '11:30',
        status: 'completed',
        attendanceTaken: true,
      },
    });

    await db.attendance.create({
      data: {
        instituteId: institute.id,
        sessionId: batchSession.id,
        enrollmentId: enrollmentA.id,
        status: 'present',
      },
    });

    // 8. Create Published & Draft Homework for Batch
    publishedHomework = await db.homework.create({
      data: {
        instituteId: institute.id,
        batchId: batch.id,
        title: 'Quantum Physics Problem Set 1',
        description: 'Complete problems 1 through 10',
        publishedAt: new Date(),
      },
    });

    draftHomework = await db.homework.create({
      data: {
        instituteId: institute.id,
        batchId: batch.id,
        title: 'Draft Homework - Internal Staff Only',
        description: 'Internal draft not yet published',
        publishedAt: null,
      },
    });
  });

  const makeReq = (url: string, method = 'GET', token?: string) => {
    const headers: Record<string, string> = {};
    if (token) {
      headers['Cookie'] = `better-auth.session_token=${token}`;
    }
    return new NextRequest(`http://localhost:3000${url}`, { method, headers });
  };

  describe('Attendance Route Security', () => {
    it('returns 401 when request is unauthenticated', async () => {
      const req = makeReq(`/api/v1/parent/students/${studentA.id}/attendance`);
      const res = await attendanceGET(req, { params: Promise.resolve({ id: studentA.id }) });
      expect(res.status).toBe(401);
    });

    it('returns 404 Universal Masking when parent is unauthorized for target student', async () => {
      const req = makeReq(`/api/v1/parent/students/${studentA.id}/attendance`, 'GET', sessionTokenB);
      const res = await attendanceGET(req, { params: Promise.resolve({ id: studentA.id }) });
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error.message).toContain('not found or unauthorized');
    });

    it('returns 200 with attendance summary and records for authorized student', async () => {
      const req = makeReq(`/api/v1/parent/students/${studentA.id}/attendance`, 'GET', sessionTokenA);
      const res = await attendanceGET(req, { params: Promise.resolve({ id: studentA.id }) });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.data.student.id).toBe(studentA.id);
      expect(body.data.summary.totalSessions).toBe(1);
      expect(body.data.summary.presentCount).toBe(1);
      expect(body.data.summary.percentage).toBe(100);
      expect(body.data.records).toHaveLength(1);
      expect(body.data.records[0].status).toBe('present');
    });

    it('rejects POST method with 405 Method Not Allowed', async () => {
      const res = await attendancePOST();
      expect(res.status).toBe(405);
    });
  });

  describe('Homework Route Security', () => {
    it('returns 401 when request is unauthenticated', async () => {
      const req = makeReq(`/api/v1/parent/students/${studentA.id}/homework`);
      const res = await homeworkGET(req, { params: Promise.resolve({ id: studentA.id }) });
      expect(res.status).toBe(401);
    });

    it('returns 404 Universal Masking when parent is unauthorized for target student', async () => {
      const req = makeReq(`/api/v1/parent/students/${studentA.id}/homework`, 'GET', sessionTokenB);
      const res = await homeworkGET(req, { params: Promise.resolve({ id: studentA.id }) });
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error.message).toContain('not found or unauthorized');
    });

    it('returns 200 with published homework for authorized student', async () => {
      const req = makeReq(`/api/v1/parent/students/${studentA.id}/homework`, 'GET', sessionTokenA);
      const res = await homeworkGET(req, { params: Promise.resolve({ id: studentA.id }) });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.data.student.id).toBe(studentA.id);
      expect(body.data.homework).toHaveLength(1);
      expect(body.data.homework[0].id).toBe(publishedHomework.id);
      expect(body.data.homework[0].title).toBe('Quantum Physics Problem Set 1');
    });

    it('strictly excludes draft homework (publishedAt === null)', async () => {
      const req = makeReq(`/api/v1/parent/students/${studentA.id}/homework`, 'GET', sessionTokenA);
      const res = await homeworkGET(req, { params: Promise.resolve({ id: studentA.id }) });
      const body = await res.json();

      const homeworkIds = body.data.homework.map((h: { id: string }) => h.id);
      expect(homeworkIds).not.toContain(draftHomework.id);
    });

    it('rejects POST method with 405 Method Not Allowed', async () => {
      const res = await homeworkPOST();
      expect(res.status).toBe(405);
    });
  });
});
