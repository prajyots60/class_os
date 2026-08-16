import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@coaching-os/database';
import { signSessionToken } from '@coaching-os/auth';
import { GET as notifListGET, POST as notifListPOST } from './notifications/route';
import { GET as unreadCountGET } from './notifications/unread-count/route';
import { POST as markReadPOST, GET as markReadGET } from './notifications/[id]/read/route';

describe('Phase 5.9 — Parent Notifications REST Routes Security & Recipient Isolation Matrix', () => {
  let pidA: { id: string };
  let pidB: { id: string };
  let userA: { id: string };
  let userB: { id: string };
  let institute: { id: string };
  let validSessionTokenA: string;
  let validSessionTokenB: string;
  let notifA1: { id: string };
  let notifA2: { id: string };
  let notifB1: { id: string };

  beforeEach(async () => {
    const rawId = Date.now().toString();
    institute = await db.institute.create({
      data: {
        name: `Test Institute ${rawId}`,
        slug: `inst-nt-${rawId}`,
        phone: `+9199${Math.floor(10000000 + Math.random() * 90000000)}`,
        email: `inst-nt-${rawId}@test.com`,
      },
    });

    const phoneA = `+9198${Math.floor(10000000 + Math.random() * 90000000)}`;
    pidA = await db.parentIdentity.create({ data: { phone: phoneA, status: 'active' } });
    userA = await db.user.create({
      data: {
        parentIdentityId: pidA.id,
        email: `parent-nt-a-${Date.now()}@example.com`,
        name: 'Parent User A',
        phone: phoneA,
        status: 'active',
      },
    });

    const phoneB = `+9197${Math.floor(10000000 + Math.random() * 90000000)}`;
    pidB = await db.parentIdentity.create({ data: { phone: phoneB, status: 'active' } });
    userB = await db.user.create({
      data: {
        parentIdentityId: pidB.id,
        email: `parent-nt-b-${Date.now()}@example.com`,
        name: 'Parent User B',
        phone: phoneB,
        status: 'active',
      },
    });

    // Sessions
    const tokenStrA = `sess-token-nt-a-${Date.now()}`;
    await db.session.create({
      data: {
        userId: userA.id,
        token: tokenStrA,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    validSessionTokenA = signSessionToken(tokenStrA);

    const tokenStrB = `sess-token-nt-b-${Date.now()}`;
    await db.session.create({
      data: {
        userId: userB.id,
        token: tokenStrB,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    validSessionTokenB = signSessionToken(tokenStrB);

    // Notifications
    notifA1 = await db.notification.create({
      data: {
        instituteId: institute.id,
        recipientUserId: userA.id,
        recipientType: 'parent',
        priority: 'high',
        category: 'attendance',
        title: 'Attendance Alert',
        message: 'Aarav was marked absent today.',
        isRead: false,
      },
    });

    notifA2 = await db.notification.create({
      data: {
        instituteId: institute.id,
        recipientUserId: userA.id,
        recipientType: 'parent',
        priority: 'informational',
        category: 'assessment',
        title: 'Marks Published',
        message: 'Aarav Physics Mock Test results are available.',
        isRead: true,
        readAt: new Date(),
      },
    });

    notifB1 = await db.notification.create({
      data: {
        instituteId: institute.id,
        recipientUserId: userB.id,
        recipientType: 'parent',
        priority: 'informational',
        category: 'billing',
        title: 'Fee Payment Received',
        message: 'Receipt REC-2026-00099 issued for Riya.',
        isRead: false,
      },
    });
  });

  it('PARENT-NOTIFICATION-API-001: returns 401 when notification request is unauthenticated', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/parent/notifications');
    const res = await notifListGET(req);
    expect(res.status).toBe(401);
  });

  it('PARENT-NOTIFICATION-API-002: Parent A receives only own recipient-scoped notifications', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/parent/notifications', {
      headers: { Cookie: `better-auth.session_token=${validSessionTokenA}` },
    });
    const res = await notifListGET(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.length).toBe(2);
    expect(body.data.some((n: { id: string }) => n.id === notifA1.id)).toBe(true);
    expect(body.data.some((n: { id: string }) => n.id === notifA2.id)).toBe(true);
  });

  it('PARENT-NOTIFICATION-API-003: Parent A cannot read Parent B notifications', async () => {
    const reqA = new NextRequest('http://localhost:3000/api/v1/parent/notifications', {
      headers: { Cookie: `better-auth.session_token=${validSessionTokenA}` },
    });
    const resA = await notifListGET(reqA);
    const bodyA = await resA.json();
    const containsB = bodyA.data.some((item: { id: string }) => item.id === notifB1.id);
    expect(containsB).toBe(false);

    // Verify Parent B receives Parent B notifications
    const reqB = new NextRequest('http://localhost:3000/api/v1/parent/notifications', {
      headers: { Cookie: `better-auth.session_token=${validSessionTokenB}` },
    });
    const resB = await notifListGET(reqB);
    const bodyB = await resB.json();
    expect(bodyB.data.length).toBe(1);
    expect(bodyB.data[0].id).toBe(notifB1.id);
  });

  it('PARENT-NOTIFICATION-API-004: Parent A attempting to mark Parent B notification as read returns 404 Universal Masking', async () => {
    const req = new NextRequest(
      `http://localhost:3000/api/v1/parent/notifications/${notifB1.id}/read`,
      { headers: { Cookie: `better-auth.session_token=${validSessionTokenA}` } },
    );
    const res = await markReadPOST(req, { params: Promise.resolve({ id: notifB1.id }) });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('PARENT-NOTIFICATION-API-005: mark notification as read is idempotent and returns 200 OK', async () => {
    const req1 = new NextRequest(
      `http://localhost:3000/api/v1/parent/notifications/${notifA1.id}/read`,
      { headers: { Cookie: `better-auth.session_token=${validSessionTokenA}` } },
    );
    const res1 = await markReadPOST(req1, { params: Promise.resolve({ id: notifA1.id }) });
    expect(res1.status).toBe(200);
    const body1 = await res1.json();
    expect(body1.data.isRead).toBe(true);

    // Call again idempotently
    const req2 = new NextRequest(
      `http://localhost:3000/api/v1/parent/notifications/${notifA1.id}/read`,
      { headers: { Cookie: `better-auth.session_token=${validSessionTokenA}` } },
    );
    const res2 = await markReadPOST(req2, { params: Promise.resolve({ id: notifA1.id }) });
    expect(res2.status).toBe(200);
  });

  it('PARENT-NOTIFICATION-API-006: unread count endpoint returns accurate recipient-scoped count', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/parent/notifications/unread-count', {
      headers: { Cookie: `better-auth.session_token=${validSessionTokenA}` },
    });
    const res = await unreadCountGET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.unreadCount).toBe(1); // notifA1 is unread
  });

  it('PARENT-NOTIFICATION-API-007: rejects non-GET mutation methods on list endpoint with 405 Method Not Allowed', async () => {
    const res = await notifListPOST();
    expect(res.status).toBe(405);
  });

  it('PARENT-NOTIFICATION-API-008: rejects non-POST methods on mark-as-read endpoint with 405 Method Not Allowed', async () => {
    const res = await markReadGET();
    expect(res.status).toBe(405);
  });

  it('PARENT-NOTIFICATION-API-009: filter by isRead=false returns only unread notifications', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/parent/notifications?isRead=false', {
      headers: { Cookie: `better-auth.session_token=${validSessionTokenA}` },
    });
    const res = await notifListGET(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.length).toBe(1);
    expect(body.data[0].id).toBe(notifA1.id);
  });

  it('PARENT-NOTIFICATION-API-010: no session or token information leaks in notification payload', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/parent/notifications', {
      headers: { Cookie: `better-auth.session_token=${validSessionTokenA}` },
    });
    const res = await notifListGET(req);
    const body = await res.json();
    const item = body.data[0];
    expect(item.token).toBeUndefined();
    expect(item.session).toBeUndefined();
    expect(item.password).toBeUndefined();
  });
});
