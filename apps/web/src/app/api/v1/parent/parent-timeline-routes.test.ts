import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@coaching-os/database';
import { signSessionToken } from '@coaching-os/auth';
import { GET as timelineGET, POST as timelinePOST } from './timeline/route';

describe('Phase 5.9 — Parent Timeline REST Routes Security & Isolation Matrix', () => {
  let pidA: { id: string };
  let pidB: { id: string };
  let userA: { id: string };
  let userB: { id: string };
  let institute: { id: string; name: string };
  let studentA: { id: string };
  let studentB: { id: string };
  let validSessionTokenA: string;
  let validSessionTokenB: string;
  let activityA1: { id: string };
  let activityA2: { id: string };

  beforeEach(async () => {
    const rawId = Date.now().toString();
    institute = await db.institute.create({
      data: {
        name: `Test Institute ${rawId}`,
        slug: `inst-tl-${rawId}`,
        phone: `+9199${Math.floor(10000000 + Math.random() * 90000000)}`,
        email: `inst-tl-${rawId}@test.com`,
      },
    });

    const phoneA = `+9198${Math.floor(10000000 + Math.random() * 90000000)}`;
    pidA = await db.parentIdentity.create({
      data: { phone: phoneA, status: 'active' },
    });
    userA = await db.user.create({
      data: {
        parentIdentityId: pidA.id,
        email: `parent-tl-a-${Date.now()}@example.com`,
        name: 'Parent User A',
        phone: phoneA,
        status: 'active',
      },
    });

    const phoneB = `+9197${Math.floor(10000000 + Math.random() * 90000000)}`;
    pidB = await db.parentIdentity.create({
      data: { phone: phoneB, status: 'active' },
    });
    userB = await db.user.create({
      data: {
        parentIdentityId: pidB.id,
        email: `parent-tl-b-${Date.now()}@example.com`,
        name: 'Parent User B',
        phone: phoneB,
        status: 'active',
      },
    });

    studentA = await db.student.create({
      data: {
        instituteId: institute.id,
        firstName: 'Aarav',
        lastName: 'Sharma',
        admissionNumber: `ADM-TL-A-${Date.now()}`,
        status: 'active',
      },
    });

    studentB = await db.student.create({
      data: {
        instituteId: institute.id,
        firstName: 'Riya',
        lastName: 'Patel',
        admissionNumber: `ADM-TL-B-${Date.now()}`,
        status: 'active',
      },
    });

    // Parent A -> Student A
    const instParentA = await db.instituteParent.create({
      data: {
        instituteId: institute.id,
        parentIdentityId: pidA.id,
        status: 'active',
      },
    });
    await db.instituteParentStudent.create({
      data: {
        instituteId: institute.id,
        instituteParentId: instParentA.id,
        studentId: studentA.id,
        relationshipType: 'father',
        status: 'active',
      },
    });

    // Parent B -> Student B
    const instParentB = await db.instituteParent.create({
      data: {
        instituteId: institute.id,
        parentIdentityId: pidB.id,
        status: 'active',
      },
    });
    await db.instituteParentStudent.create({
      data: {
        instituteId: institute.id,
        instituteParentId: instParentB.id,
        studentId: studentB.id,
        relationshipType: 'mother',
        status: 'active',
      },
    });

    // Sessions
    const tokenStrA = `sess-token-tl-a-${Date.now()}`;
    await db.session.create({
      data: {
        userId: userA.id,
        token: tokenStrA,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    validSessionTokenA = signSessionToken(tokenStrA);

    const tokenStrB = `sess-token-tl-b-${Date.now()}`;
    await db.session.create({
      data: {
        userId: userB.id,
        token: tokenStrB,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    validSessionTokenB = signSessionToken(tokenStrB);

    // Create Activities for Student A and Student B
    activityA1 = await db.activity.create({
      data: {
        instituteId: institute.id,
        studentId: studentA.id,
        eventType: 'attendance.recorded',
        title: 'Attendance marked Present',
        description: 'Aarav was marked Present for Physics batch',
        occurredAt: new Date('2026-08-16T10:42:00.000Z'),
        actorName: 'Faculty Smith',
        idempotencyKey: `idemp-a1-${Date.now()}`,
      },
    });

    activityA2 = await db.activity.create({
      data: {
        instituteId: institute.id,
        studentId: studentA.id,
        eventType: 'homework.published',
        title: 'New Homework Assigned',
        description: 'Organic Chemistry Exercise 3',
        occurredAt: new Date('2026-08-16T09:15:00.000Z'),
        actorName: 'Faculty Jones',
        idempotencyKey: `idemp-a2-${Date.now()}`,
      },
    });

    await db.activity.create({
      data: {
        instituteId: institute.id,
        studentId: studentB.id,
        eventType: 'billing.payment_received',
        title: 'Fee Payment Received',
        description: 'Payment of ₹5,000 received for Riya',
        occurredAt: new Date('2026-08-15T17:10:00.000Z'),
        actorName: 'Accounts Admin',
        idempotencyKey: `idemp-b1-${Date.now()}`,
      },
    });
  });

  it('PARENT-TIMELINE-API-001: returns 401 when timeline request is unauthenticated', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/parent/timeline');
    const res = await timelineGET(req);
    expect(res.status).toBe(401);
  });

  it('PARENT-TIMELINE-API-002: returns 401 when parent session is expired', async () => {
    const expTokenStr = `exp-tl-token-${Date.now()}`;
    await db.session.create({
      data: {
        userId: userA.id,
        token: expTokenStr,
        expiresAt: new Date(Date.now() - 1000),
      },
    });
    const expiredToken = signSessionToken(expTokenStr);

    const req = new NextRequest('http://localhost:3000/api/v1/parent/timeline', {
      headers: { Cookie: `better-auth.session_token=${expiredToken}` },
    });
    const res = await timelineGET(req);
    expect(res.status).toBe(401);
  });

  it('PARENT-TIMELINE-API-003: returns 401 when parent identity is suspended', async () => {
    await db.parentIdentity.update({
      where: { id: pidA.id },
      data: { status: 'suspended' },
    });

    const req = new NextRequest('http://localhost:3000/api/v1/parent/timeline', {
      headers: { Cookie: `better-auth.session_token=${validSessionTokenA}` },
    });
    const res = await timelineGET(req);
    expect(res.status).toBe(401);
  });

  it('PARENT-TIMELINE-API-004: returns 401 when parent identity is deactivated', async () => {
    await db.parentIdentity.update({
      where: { id: pidA.id },
      data: { status: 'deactivated' },
    });

    const req = new NextRequest('http://localhost:3000/api/v1/parent/timeline', {
      headers: { Cookie: `better-auth.session_token=${validSessionTokenA}` },
    });
    const res = await timelineGET(req);
    expect(res.status).toBe(401);
  });

  it('PARENT-TIMELINE-API-005: Parent A receives authorized timeline items only', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/parent/timeline', {
      headers: { Cookie: `better-auth.session_token=${validSessionTokenA}` },
    });
    const res = await timelineGET(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.length).toBe(2);
    expect(body.data[0].id).toBe(activityA1.id);
    expect(body.data[1].id).toBe(activityA2.id);
  });

  it('PARENT-TIMELINE-API-006: Parent A cannot access Parent B child activity events', async () => {
    const reqA = new NextRequest('http://localhost:3000/api/v1/parent/timeline', {
      headers: { Cookie: `better-auth.session_token=${validSessionTokenA}` },
    });
    const resA = await timelineGET(reqA);
    const bodyA = await resA.json();

    const containsStudentB = bodyA.data.some(
      (item: { studentId: string }) => item.studentId === studentB.id,
    );
    expect(containsStudentB).toBe(false);

    // Verify Parent B receives only Student B events
    const reqB = new NextRequest('http://localhost:3000/api/v1/parent/timeline', {
      headers: { Cookie: `better-auth.session_token=${validSessionTokenB}` },
    });
    const resB = await timelineGET(reqB);
    const bodyB = await resB.json();
    expect(bodyB.data.length).toBe(1);
    expect(bodyB.data[0].studentId).toBe(studentB.id);
  });

  it('PARENT-TIMELINE-API-007: Filter by unauthorized student ID returns 404 Universal Masking', async () => {
    const req = new NextRequest(
      `http://localhost:3000/api/v1/parent/timeline?studentId=${studentB.id}`,
      { headers: { Cookie: `better-auth.session_token=${validSessionTokenA}` } },
    );
    const res = await timelineGET(req);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('PARENT-TIMELINE-API-008: Filter by authorized student ID returns filtered timeline', async () => {
    const req = new NextRequest(
      `http://localhost:3000/api/v1/parent/timeline?studentId=${studentA.id}`,
      { headers: { Cookie: `better-auth.session_token=${validSessionTokenA}` } },
    );
    const res = await timelineGET(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.length).toBe(2);
    expect(body.data.every((item: { studentId: string }) => item.studentId === studentA.id)).toBe(true);
  });

  it('PARENT-TIMELINE-API-009: client-supplied parentIdentityId in query params is ignored', async () => {
    const req = new NextRequest(
      `http://localhost:3000/api/v1/parent/timeline?parentIdentityId=${pidB.id}`,
      { headers: { Cookie: `better-auth.session_token=${validSessionTokenA}` } },
    );
    const res = await timelineGET(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data[0].studentName).toBe('Aarav Sharma');
  });

  it('PARENT-TIMELINE-API-010: client-supplied instituteId cannot bypass authorization', async () => {
    const otherUuid = '00000000-0000-4000-a000-000000000009';
    const req = new NextRequest(
      `http://localhost:3000/api/v1/parent/timeline?instituteId=${otherUuid}`,
      { headers: { Cookie: `better-auth.session_token=${validSessionTokenA}` } },
    );
    const res = await timelineGET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data[0].instituteName).toBe(institute.name);
  });

  it('PARENT-TIMELINE-API-011: internal activity idempotencyKey is not exposed in DTO', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/parent/timeline', {
      headers: { Cookie: `better-auth.session_token=${validSessionTokenA}` },
    });
    const res = await timelineGET(req);
    const body = await res.json();
    expect(body.data[0].idempotencyKey).toBeUndefined();
  });

  it('PARENT-TIMELINE-API-012: internal database IDs are not exposed in title or description', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/parent/timeline', {
      headers: { Cookie: `better-auth.session_token=${validSessionTokenA}` },
    });
    const res = await timelineGET(req);
    const body = await res.json();
    expect(body.data[0].title).not.toContain(activityA1.id);
    expect(body.data[0].description).not.toContain(studentA.id);
  });

  it('PARENT-TIMELINE-API-013: rejects POST mutation method with 405 Method Not Allowed', async () => {
    const res = await timelinePOST();
    expect(res.status).toBe(405);
  });

  it('PARENT-TIMELINE-API-014: timeline pagination limits and nextCursor function correctly', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/parent/timeline?limit=1', {
      headers: { Cookie: `better-auth.session_token=${validSessionTokenA}` },
    });
    const res = await timelineGET(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.length).toBe(1);
    expect(body.pagination.hasMore).toBe(true);
    expect(body.pagination.nextCursor).toBe(activityA1.id);
  });

  it('PARENT-TIMELINE-API-015: maintains deterministic chronological ordering (occurredAt desc)', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/parent/timeline', {
      headers: { Cookie: `better-auth.session_token=${validSessionTokenA}` },
    });
    const res = await timelineGET(req);
    const body = await res.json();

    const t1 = new Date(body.data[0].occurredAt).getTime();
    const t2 = new Date(body.data[1].occurredAt).getTime();
    expect(t1).toBeGreaterThanOrEqual(t2);
  });
});
