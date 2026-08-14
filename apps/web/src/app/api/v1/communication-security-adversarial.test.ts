import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { validateTestEnvironment, cleanTestDatabase, closeTestPool, db } from '@coaching-os/database';
import { auth } from '@coaching-os/auth';

// Route Handlers
import { GET as announcementsGET, POST as announcementsPOST } from './communication/announcements/route';
import { GET as announcementByIdGET, PATCH as announcementByIdPATCH, DELETE as announcementByIdDELETE } from './communication/announcements/[id]/route';
import { POST as publishPOST } from './communication/announcements/[id]/publish/route';
import { POST as archivePOST } from './communication/announcements/[id]/archive/route';
import { GET as notificationsGET } from './communication/notifications/route';
import { GET as notificationByIdGET } from './communication/notifications/[id]/route';
import { POST as readPOST } from './communication/notifications/[id]/read/route';
import { GET as activitiesGET, POST as activitiesPOST, PUT as activitiesPUT, PATCH as activitiesPATCH, DELETE as activitiesDELETE } from './students/[id]/activities/route';
import { GET as activityByIdGET } from './students/[id]/activities/[activityId]/route';

describe('Phase 4.6.1 — Communication REST API Security, Adversarial & Immutability Suite', () => {
  beforeAll(() => {
    validateTestEnvironment();
  });

  beforeEach(async () => {
    await cleanTestDatabase();
  });

  afterAll(async () => {
    await closeTestPool();
  });

  let testIpCounter = 500;
  function getUniqueIp(): string {
    testIpCounter += 1;
    return `10.200.${Math.floor(testIpCounter / 250)}.${testIpCounter % 250}`;
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
    return { user, cookieHeader };
  }

  async function setupInstituteContext(prefix: string) {
    const { user, cookieHeader } = await createAuthUser(prefix);
    const inst = await db.institute.create({
      data: {
        name: `${prefix} Institute`,
        slug: `slug-${prefix.toLowerCase()}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        phone: `+9198${Math.floor(10000000 + Math.random() * 90000000)}`,
        email: `inst_${Date.now()}_${Math.floor(Math.random() * 1000)}@test.com`,
      },
    });

    await db.user.update({
      where: { id: user.id },
      data: {
        institute: { connect: { id: inst.id } },
        status: 'active',
      },
    });

    return { user, institute: inst, cookieHeader };
  }

  // ============================================================================
  // 1. Unauthenticated Requests (401 Unauthorized)
  // ============================================================================
  describe('Unauthenticated Access Controls', () => {
    it('rejects unauthenticated GET /announcements with 401', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/communication/announcements', {
        headers: { 'x-forwarded-for': getUniqueIp() },
      });
      const res = await announcementsGET(req);
      expect(res.status).toBe(401);
    });

    it('rejects unauthenticated POST /announcements with 401', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/communication/announcements', {
        method: 'POST',
        headers: { 'x-forwarded-for': getUniqueIp(), 'content-type': 'application/json' },
        body: JSON.stringify({ targetType: 'institute', title: 'Test', content: 'Test content' }),
      });
      const res = await announcementsPOST(req);
      expect(res.status).toBe(401);
    });

    it('rejects unauthenticated GET /notifications with 401', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/communication/notifications', {
        headers: { 'x-forwarded-for': getUniqueIp() },
      });
      const res = await notificationsGET(req);
      expect(res.status).toBe(401);
    });
  });

  // ============================================================================
  // 2. Tenant Isolation & Client instituteId Spoofing
  // ============================================================================
  describe('Tenant Isolation & Spoofing Defenses', () => {
    it('ignores client instituteId injection and creates announcement under server context', async () => {
      const ctxA = await setupInstituteContext('InstA');
      const ctxB = await setupInstituteContext('InstB');

      const req = new NextRequest('http://localhost:3000/api/v1/communication/announcements', {
        method: 'POST',
        headers: {
          cookie: ctxA.cookieHeader,
          'x-forwarded-for': getUniqueIp(),
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          instituteId: ctxB.institute.id, // Injected foreign tenant ID
          targetType: 'institute',
          title: 'Spoof Test',
          content: 'Testing spoofing defense',
        }),
      });

      const res = await announcementsPOST(req);
      expect(res.status).toBe(400); // Strict Zod schema rejects unauthorized instituteId property
    });

    it('returns 404 Not Found when accessing announcement from another tenant', async () => {
      const ctxA = await setupInstituteContext('TenantA');
      const ctxB = await setupInstituteContext('TenantB');

      // Create announcement in Tenant A via API
      const createReqA = new NextRequest('http://localhost:3000/api/v1/communication/announcements', {
        method: 'POST',
        headers: { cookie: ctxA.cookieHeader, 'x-forwarded-for': getUniqueIp(), 'content-type': 'application/json' },
        body: JSON.stringify({ targetType: 'institute', title: 'Tenant A Announcement', content: 'Secret content A' }),
      });
      const createResA = await announcementsPOST(createReqA);
      expect(createResA.status).toBe(201);
      const ann = (await createResA.json()).data;

      // Tenant B attempts reading Tenant A announcement
      const req = new NextRequest(`http://localhost:3000/api/v1/communication/announcements/${ann.id}`, {
        headers: { cookie: ctxB.cookieHeader, 'x-forwarded-for': getUniqueIp() },
      });

      const res = await announcementByIdGET(req, { params: Promise.resolve({ id: ann.id }) });
      expect(res.status).toBe(404); // Must mask foreign tenant resource as 404!
    });
  });

  // ============================================================================
  // 3. Announcement Life Cycle & Immutability Matrix
  // ============================================================================
  describe('Announcement Life Cycle & Immutability', () => {
    it('supports full lifecycle: draft -> update -> publish -> immutable -> archive', async () => {
      const ctx = await setupInstituteContext('LifeCycle');

      // 1. Create Draft
      const createReq = new NextRequest('http://localhost:3000/api/v1/communication/announcements', {
        method: 'POST',
        headers: { cookie: ctx.cookieHeader, 'x-forwarded-for': getUniqueIp(), 'content-type': 'application/json' },
        body: JSON.stringify({ targetType: 'institute', title: 'Draft Title', content: 'Draft Content' }),
      });
      const createRes = await announcementsPOST(createReq);
      expect(createRes.status).toBe(201);
      const ann = (await createRes.json()).data;
      expect(ann.status).toBe('draft');

      // 2. Update Draft
      const patchReq = new NextRequest(`http://localhost:3000/api/v1/communication/announcements/${ann.id}`, {
        method: 'PATCH',
        headers: { cookie: ctx.cookieHeader, 'x-forwarded-for': getUniqueIp(), 'content-type': 'application/json' },
        body: JSON.stringify({ title: 'Updated Title' }),
      });
      const patchRes = await announcementByIdPATCH(patchReq, { params: Promise.resolve({ id: ann.id }) });
      expect(patchRes.status).toBe(200);

      // 3. Publish Draft
      const publishReq = new NextRequest(`http://localhost:3000/api/v1/communication/announcements/${ann.id}/publish`, {
        method: 'POST',
        headers: { cookie: ctx.cookieHeader, 'x-forwarded-for': getUniqueIp() },
      });
      const publishRes = await publishPOST(publishReq, { params: Promise.resolve({ id: ann.id }) });
      expect(publishRes.status).toBe(200);
      const published = (await publishRes.json()).data;
      expect(published.status).toBe('published');

      // 4. Attempt PATCH on Published (Must be REJECTED 400 Bad Request)
      const invalidPatch = new NextRequest(`http://localhost:3000/api/v1/communication/announcements/${ann.id}`, {
        method: 'PATCH',
        headers: { cookie: ctx.cookieHeader, 'x-forwarded-for': getUniqueIp(), 'content-type': 'application/json' },
        body: JSON.stringify({ title: 'Illegal Modification' }),
      });
      const invalidPatchRes = await announcementByIdPATCH(invalidPatch, { params: Promise.resolve({ id: ann.id }) });
      expect(invalidPatchRes.status).toBe(400);

      // 5. Attempt DELETE on Published (Must be REJECTED 400 Bad Request)
      const invalidDelete = new NextRequest(`http://localhost:3000/api/v1/communication/announcements/${ann.id}`, {
        method: 'DELETE',
        headers: { cookie: ctx.cookieHeader, 'x-forwarded-for': getUniqueIp() },
      });
      const invalidDeleteRes = await announcementByIdDELETE(invalidDelete, { params: Promise.resolve({ id: ann.id }) });
      expect(invalidDeleteRes.status).toBe(400);

      // 6. Archive Published
      const archiveReq = new NextRequest(`http://localhost:3000/api/v1/communication/announcements/${ann.id}/archive`, {
        method: 'POST',
        headers: { cookie: ctx.cookieHeader, 'x-forwarded-for': getUniqueIp() },
      });
      const archiveRes = await archivePOST(archiveReq, { params: Promise.resolve({ id: ann.id }) });
      expect(archiveRes.status).toBe(200);
      expect((await archiveRes.json()).data.status).toBe('archived');
    });
  });

  // ============================================================================
  // 4. Recipient Notification Isolation (R-COM-API-002)
  // ============================================================================
  describe('Recipient Notification Isolation', () => {
    it('prevents User B from accessing or marking User A notifications as read', async () => {
      const ctx = await setupInstituteContext('NotifTenant');

      // Create second user in same institute
      const { user: userB, cookieHeader: cookieB } = await createAuthUser('UserB');
      const parentIdentityB = await db.parentIdentity.create({
        data: { phone: `+9197${Math.floor(10000000 + Math.random() * 90000000)}`, name: 'UserB Identity' },
      });
      const instituteParentB = await db.instituteParent.create({
        data: { instituteId: ctx.institute.id, parentIdentityId: parentIdentityB.id },
      });
      await db.user.update({
        where: { id: userB.id },
        data: {
          institute: { connect: { id: ctx.institute.id } },
          parentIdentity: { connect: { id: parentIdentityB.id } },
        },
      });
      await db.instituteMembership.create({
        data: {
          instituteId: ctx.institute.id,
          parentIdentityId: parentIdentityB.id,
          instituteParentId: instituteParentB.id,
        },
      });

      // Create Notification for User A (ctx.user)
      const notifA = await db.notification.create({
        data: {
          instituteId: ctx.institute.id,
          recipientUserId: ctx.user.id,
          recipientType: 'staff',
          title: 'User A Notice',
          message: 'Private message for A',
        },
      });

      // User B attempts reading User A notification detail -> 404 Not Found
      const readReqB = new NextRequest(`http://localhost:3000/api/v1/communication/notifications/${notifA.id}`, {
        headers: { cookie: cookieB, 'x-forwarded-for': getUniqueIp() },
      });
      const readResB = await notificationByIdGET(readReqB, { params: Promise.resolve({ id: notifA.id }) });
      expect(readResB.status).toBe(404);

      // User B attempts marking User A notification read -> 404 Not Found
      const markReqB = new NextRequest(`http://localhost:3000/api/v1/communication/notifications/${notifA.id}/read`, {
        method: 'POST',
        headers: { cookie: cookieB, 'x-forwarded-for': getUniqueIp() },
      });
      const markResB = await readPOST(markReqB, { params: Promise.resolve({ id: notifA.id }) });
      expect(markResB.status).toBe(404);

      // User A reads notification successfully
      const markReqA = new NextRequest(`http://localhost:3000/api/v1/communication/notifications/${notifA.id}/read`, {
        method: 'POST',
        headers: { cookie: ctx.cookieHeader, 'x-forwarded-for': getUniqueIp() },
      });
      const markResA = await readPOST(markReqA, { params: Promise.resolve({ id: notifA.id }) });
      expect(markResA.status).toBe(200);
      expect((await markResA.json()).data.isRead).toBe(true);
    });
  });

  // ============================================================================
  // 5. Activity Timeline Immutability & Method Safety
  // ============================================================================
  describe('Activity Timeline Immutability & Method Safety', () => {
    it('serves student activity timeline and enforces 405 Method Not Allowed for mutation methods', async () => {
      const ctx = await setupInstituteContext('ActivityInst');

      const student = await db.student.create({
        data: {
          instituteId: ctx.institute.id,
          firstName: 'John',
          lastName: 'Doe',
          admissionNumber: `ADM-${Date.now()}`,
          status: 'active',
        },
      });

      const activity = await db.activity.create({
        data: {
          instituteId: ctx.institute.id,
          studentId: student.id,
          eventType: 'attendance_absent',
          title: 'Physics Absent',
          description: 'Marked absent',
          occurredAt: new Date(),
        },
      });

      // GET student activities list -> 200 OK
      const listReq = new NextRequest(`http://localhost:3000/api/v1/students/${student.id}/activities`, {
        headers: { cookie: ctx.cookieHeader, 'x-forwarded-for': getUniqueIp() },
      });
      const listRes = await activitiesGET(listReq, { params: Promise.resolve({ id: student.id }) });
      expect(listRes.status).toBe(200);
      const items = (await listRes.json()).data;
      expect(items).toHaveLength(1);
      expect(items[0].id).toBe(activity.id);

      // GET single activity detail -> 200 OK
      const detailReq = new NextRequest(`http://localhost:3000/api/v1/students/${student.id}/activities/${activity.id}`, {
        headers: { cookie: ctx.cookieHeader, 'x-forwarded-for': getUniqueIp() },
      });
      const detailRes = await activityByIdGET(detailReq, { params: Promise.resolve({ id: student.id, activityId: activity.id }) });
      expect(detailRes.status).toBe(200);

      // Verify Method Safety (405 Method Not Allowed)
      expect((await activitiesPOST()).status).toBe(405);
      expect((await activitiesPUT()).status).toBe(405);
      expect((await activitiesPATCH()).status).toBe(405);
      expect((await activitiesDELETE()).status).toBe(405);
    });
  });
});
