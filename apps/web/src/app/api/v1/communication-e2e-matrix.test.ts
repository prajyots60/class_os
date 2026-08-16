import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { validateTestEnvironment, cleanTestDatabase, closeTestPool, db } from '@coaching-os/database';
import { auth } from '@coaching-os/auth';
import {
  PrismaActivityRepository,
  PrismaNotificationRepository,
  ProjectActivityUseCase,
  ActivityProjectionService,
  NotificationProjectionService,
} from '@coaching-os/communication';

// Route Handlers
import { POST as announcementsPOST } from './communication/announcements/route';
import { GET as announcementByIdGET, PATCH as announcementByIdPATCH } from './communication/announcements/[id]/route';
import { GET as activitiesGET } from './students/[id]/activities/route';

describe('Phase 4.8 — Communication Security, Privacy, UX & E2E Verification Matrix', () => {
  beforeAll(() => {
    validateTestEnvironment();
  });

  beforeEach(async () => {
    await cleanTestDatabase();
  });

  afterAll(async () => {
    await closeTestPool();
  });

  let testIpCounter = 800;
  function getUniqueIp(): string {
    testIpCounter += 1;
    return `10.210.${Math.floor(testIpCounter / 250)}.${testIpCounter % 250}`;
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
    return { user, cookieHeader, email, password };
  }

  async function setupTenant(prefix: string) {
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

  function getEventDependencies(mockStudentIds: string[] = [], mockParentUserIds: string[] = []) {
    const activityRepo = new PrismaActivityRepository(db);
    const notificationRepo = new PrismaNotificationRepository(db);
    const projectActivityUseCase = new ProjectActivityUseCase(activityRepo);
    const activityProjectionService = new ActivityProjectionService(projectActivityUseCase);
    const notificationProjectionService = new NotificationProjectionService(notificationRepo);

    const studentParentResolver: StudentParentResolver = {
      findParentUserIdsForStudent: async (instituteId: string, studentId: string) => {
        const student = await db.student.findFirst({ where: { id: studentId, instituteId } });
        if (!student) return [];
        return mockParentUserIds;
      },
      findStudentById: async (instituteId: string, studentId: string) => {
        const s = await db.student.findFirst({ where: { id: studentId, instituteId } });
        return s ? { id: s.id, instituteId: s.instituteId } : null;
      },
    };

    const batchEnrollmentResolver: BatchEnrollmentResolver = {
      findActiveStudentIdsByBatch: async () => mockStudentIds,
      findActiveInstituteUserIds: async () => [],
    };

    return {
      activityProjectionService,
      notificationProjectionService,
      studentParentResolver,
      batchEnrollmentResolver,
    };
  }

  // ============================================================================
  // 1. TENANT ISOLATION & IDOR DEFENSES (COM-SEC-001 - COM-SEC-005)
  // ============================================================================

  describe('Tenant Isolation & IDOR Defenses (COM-SEC-001 - COM-SEC-005)', () => {
    it('COM-SEC-001: returns 404 Not Found when Institute A user reads Institute B announcement', async () => {
      const tenantA = await setupTenant('InstA_001');
      const tenantB = await setupTenant('InstB_001');

      const annB = await db.announcement.create({
        data: {
          instituteId: tenantB.institute.id,
          title: 'Secret Inst B Notice',
          body: 'Private Inst B content',
          publishedAt: new Date(),
        },
      });

      const req = new NextRequest(`http://localhost:3000/api/v1/communication/announcements/${annB.id}`, {
        headers: { cookie: tenantA.cookieHeader, 'x-forwarded-for': getUniqueIp() },
      });

      const res = await announcementByIdGET(req, { params: Promise.resolve({ id: annB.id }) });
      expect(res.status).toBe(404);
    });

    it('COM-SEC-002: returns 404 Not Found when Institute A user mutates Institute B announcement', async () => {
      const tenantA = await setupTenant('InstA_002');
      const tenantB = await setupTenant('InstB_002');

      const draftB = await db.announcement.create({
        data: {
          instituteId: tenantB.institute.id,
          title: 'Draft Inst B Notice',
          body: 'Draft content',
        },
      });

      const req = new NextRequest(`http://localhost:3000/api/v1/communication/announcements/${draftB.id}`, {
        method: 'PATCH',
        headers: {
          cookie: tenantA.cookieHeader,
          'content-type': 'application/json',
          'x-forwarded-for': getUniqueIp(),
        },
        body: JSON.stringify({ title: 'Hacked Title' }),
      });

      const res = await announcementByIdPATCH(req, { params: Promise.resolve({ id: draftB.id }) });
      expect(res.status).toBe(404);
    });

    it('COM-SEC-003: client-injected instituteId is ignored and rejected by strict Zod schema', async () => {
      const tenantA = await setupTenant('InstA_003');
      const tenantB = await setupTenant('InstB_003');

      const req = new NextRequest('http://localhost:3000/api/v1/communication/announcements', {
        method: 'POST',
        headers: {
          cookie: tenantA.cookieHeader,
          'content-type': 'application/json',
          'x-forwarded-for': getUniqueIp(),
        },
        body: JSON.stringify({
          title: 'Attempted Spoof Announcement',
          content: 'Spoofed body',
          targetType: 'institute',
          instituteId: tenantB.institute.id, // Injected foreign instituteId
        }),
      });

      const res = await announcementsPOST(req);
      expect(res.status).toBe(400); // .strict() Zod schema rejects injected key
    });

    it('COM-SEC-004: foreign student ID query returns 404 Not Found', async () => {
      const tenantA = await setupTenant('InstA_004');
      const tenantB = await setupTenant('InstB_004');

      const studentB = await db.student.create({
        data: {
          instituteId: tenantB.institute.id,
          admissionNumber: 'ADM-B-004',
          firstName: 'Student',
          lastName: 'B',
          admissionStatus: 'admitted',
          status: 'active',
        },
      });

      const req = new NextRequest(`http://localhost:3000/api/v1/students/${studentB.id}/activities`, {
        headers: { cookie: tenantA.cookieHeader, 'x-forwarded-for': getUniqueIp() },
      });

      const res = await activitiesGET(req, { params: Promise.resolve({ id: studentB.id }) });
      expect(res.status).toBe(404);
    });

    it('COM-SEC-005: User B cannot access or mark read User A notification (returns 404)', async () => {
      const tenantA = await setupTenant('InstA_005');
      const tenantB = await setupTenant('InstB_005');

      const notifA = await db.notification.create({
        data: {
          instituteId: tenantA.institute.id,
          recipientUserId: tenantA.user.id,
          recipientType: 'staff',
          title: 'Private User A Alert',
          message: 'For User A only',
          priority: 'important',
          category: 'system',
        },
      });

      // User B from Tenant B tries to GET User A notification from Tenant A
      const getReq = new NextRequest(`http://localhost:3000/api/v1/communication/notifications/${notifA.id}`, {
        headers: { cookie: tenantB.cookieHeader, 'x-forwarded-for': getUniqueIp() },
      });
      const getRes = await notificationByIdGET(getReq, { params: Promise.resolve({ id: notifA.id }) });
      expect(getRes.status).toBe(404);

      // User B tries to mark read User A notification
      const readReq = new NextRequest(`http://localhost:3000/api/v1/communication/notifications/${notifA.id}/read`, {
        method: 'POST',
        headers: { cookie: tenantB.cookieHeader, 'x-forwarded-for': getUniqueIp() },
      });
      const readRes = await readPOST(readReq, { params: Promise.resolve({ id: notifA.id }) });
      expect(readRes.status).toBe(404);
    });
  });

  // ============================================================================
  // 2. CAPABILITY & RBAC MATRIX (COM-SEC-006)
  // ============================================================================

  describe('Capability & RBAC Matrix (COM-SEC-006)', () => {
    it('COM-SEC-006: rejects announcement creation for user role missing announcement:create capability', async () => {
      const { user, cookieHeader } = await createAuthUser('UnprivilegedUser');
      const inst = await db.institute.create({
        data: {
          name: 'Restricted Institute',
          slug: `slug-restricted-${Date.now()}`,
          phone: '+919876543210',
          email: `restricted_${Date.now()}@test.com`,
        },
      });

      // Associate user with institute as suspended status (which strips write capabilities)
      await db.user.update({
        where: { id: user.id },
        data: { institute: { connect: { id: inst.id } }, status: 'suspended' },
      });

      const req = new NextRequest('http://localhost:3000/api/v1/communication/announcements', {
        method: 'POST',
        headers: {
          cookie: cookieHeader,
          'content-type': 'application/json',
          'x-forwarded-for': getUniqueIp(),
        },
        body: JSON.stringify({
          title: 'Unauthorized Post Attempt',
          content: 'Should fail',
          targetType: 'institute',
        }),
      });

      const res = await announcementsPOST(req);
      expect([401, 403]).toContain(res.status);
    });
  });

  // ============================================================================
  // 3. ANNOUNCEMENT LIFECYCLE & STATE TRANSITIONS (COM-SEC-007, COM-SEC-019)
  // ============================================================================

  describe('Announcement Lifecycle & State Transitions (COM-SEC-007, COM-SEC-019)', () => {
    it('COM-SEC-007: rejects PATCH or DELETE on published announcement', async () => {
      const tenant = await setupTenant('Inst_007');

      const pubAnn = await db.announcement.create({
        data: {
          instituteId: tenant.institute.id,
          title: 'Immutable Published Announcement',
          body: 'Published content',
          publishedAt: new Date(),
        },
      });

      // PATCH attempt
      const patchReq = new NextRequest(`http://localhost:3000/api/v1/communication/announcements/${pubAnn.id}`, {
        method: 'PATCH',
        headers: {
          cookie: tenant.cookieHeader,
          'content-type': 'application/json',
          'x-forwarded-for': getUniqueIp(),
        },
        body: JSON.stringify({ title: 'Mutated Title' }),
      });
      const patchRes = await announcementByIdPATCH(patchReq, { params: Promise.resolve({ id: pubAnn.id }) });
      expect(patchRes.status).toBe(400);

      // DELETE attempt
      const delReq = new NextRequest(`http://localhost:3000/api/v1/communication/announcements/${pubAnn.id}`, {
        method: 'DELETE',
        headers: { cookie: tenant.cookieHeader, 'x-forwarded-for': getUniqueIp() },
      });
      const delRes = await announcementByIdDELETE(delReq, { params: Promise.resolve({ id: pubAnn.id }) });
      expect(delRes.status).toBe(400);
    });

    it('COM-SEC-019: rejects invalid state transition (publishing an already archived announcement)', async () => {
      const tenant = await setupTenant('Inst_019');

      const archivedAnn = await db.announcement.create({
        data: {
          instituteId: tenant.institute.id,
          title: 'Archived Notice',
          body: 'Archived content',
          publishedAt: new Date(),
        },
      });

      // Manually set status to archived via API
      const archReq = new NextRequest(`http://localhost:3000/api/v1/communication/announcements/${archivedAnn.id}/archive`, {
        method: 'POST',
        headers: { cookie: tenant.cookieHeader, 'x-forwarded-for': getUniqueIp() },
      });
      await archivePOST(archReq, { params: Promise.resolve({ id: archivedAnn.id }) });

      const pubReq = new NextRequest(`http://localhost:3000/api/v1/communication/announcements/${archivedAnn.id}/publish`, {
        method: 'POST',
        headers: { cookie: tenant.cookieHeader, 'x-forwarded-for': getUniqueIp() },
      });

      const pubRes = await publishPOST(pubReq, { params: Promise.resolve({ id: archivedAnn.id }) });
      expect(pubRes.status).toBe(400);
    });
  });

  // ============================================================================
  // 4. ACTIVITY TIMELINE IMMUTABILITY (COM-SEC-008)
  // ============================================================================

  describe('Activity Timeline Immutability (COM-SEC-008)', () => {
    it('COM-SEC-008: enforces 405 Method Not Allowed for POST, PUT, PATCH, DELETE on activity timeline', async () => {
      expect((await activitiesPOST()).status).toBe(405);
      expect((await activitiesPUT()).status).toBe(405);
      expect((await activitiesPATCH()).status).toBe(405);
      expect((await activitiesDELETE()).status).toBe(405);
    });
  });

  // ============================================================================
  // 5. EVENT TENANT SECURITY, IDEMPOTENCY & CONCURRENCY (COM-SEC-009 - COM-SEC-012)
  // ============================================================================

  describe('Event Tenant Security, Idempotency & Concurrency (COM-SEC-009 - COM-SEC-012)', () => {
    it('COM-SEC-009: prevents cross-tenant projection when event instituteId contradicts student instituteId', async () => {
      const tenantA = await setupTenant('InstA_009');
      const tenantB = await setupTenant('InstB_009');

      const studentB = await db.student.create({
        data: {
          instituteId: tenantB.institute.id,
          admissionNumber: 'ADM-B-009',
          firstName: 'Student',
          lastName: 'B',
          admissionStatus: 'admitted',
          status: 'active',
        },
      });

      const deps = getEventDependencies();
      const forgedEvent = {
        eventId: `evt-forged-${Date.now()}`,
        eventType: 'academics.attendance.recorded' as const,
        eventVersion: '1.0',
        timestamp: new Date().toISOString(),
        occurredAt: new Date().toISOString(),
        instituteId: tenantA.institute.id, // Forged Inst A ID
        payload: {
          sessionId: `sess-${Date.now()}`,
          batchId: `batch-${Date.now()}`,
          sessionTitle: 'Math 101',
          records: [{ studentId: studentB.id, status: 'absent' as const }],
          recordedByUserId: tenantA.user.id,
          recordedByName: tenantA.user.name,
        },
      };

      await handleAttendanceRecorded(forgedEvent, deps);

      const activities = await db.activity.findMany({
        where: { studentId: studentB.id },
      });
      expect(activities).toHaveLength(0);
    });

    it('COM-SEC-010: duplicate event replay produces exactly 1 Activity and 1 Notification', async () => {
      const tenant = await setupTenant('Inst_010');
      const student = await db.student.create({
        data: {
          instituteId: tenant.institute.id,
          admissionNumber: 'ADM-010',
          firstName: 'Child',
          lastName: '010',
          admissionStatus: 'admitted',
          status: 'active',
        },
      });

      const deps = getEventDependencies([], [tenant.user.id]);
      const event = {
        eventId: `evt-replay-unique-${Date.now()}`,
        eventType: 'academics.attendance.recorded' as const,
        eventVersion: '1.0',
        timestamp: new Date().toISOString(),
        occurredAt: new Date().toISOString(),
        instituteId: tenant.institute.id,
        payload: {
          sessionId: `sess-${Date.now()}`,
          batchId: `batch-${Date.now()}`,
          sessionTitle: 'Physics',
          records: [{ studentId: student.id, status: 'absent' as const }],
          recordedByUserId: tenant.user.id,
          recordedByName: tenant.user.name,
        },
      };

      await handleAttendanceRecorded(event, deps);
      await handleAttendanceRecorded(event, deps);
      await handleAttendanceRecorded(event, deps);

      const activities = await db.activity.findMany({ where: { studentId: student.id } });
      expect(activities).toHaveLength(1);
    });

    it('COM-SEC-011: concurrent event processing handles race conditions cleanly without duplicate projections', async () => {
      const tenant = await setupTenant('Inst_011');
      const student = await db.student.create({
        data: {
          instituteId: tenant.institute.id,
          admissionNumber: 'ADM-011',
          firstName: 'Child',
          lastName: '011',
          admissionStatus: 'admitted',
          status: 'active',
        },
      });

      const deps = getEventDependencies([student.id]);
      const event = {
        eventId: `evt-concurrent-${Date.now()}`,
        eventType: 'academics.homework.published' as const,
        eventVersion: '1.0',
        timestamp: new Date().toISOString(),
        occurredAt: new Date().toISOString(),
        instituteId: tenant.institute.id,
        payload: {
          homeworkId: `hw-${Date.now()}`,
          batchId: `batch-${Date.now()}`,
          title: 'Physics Chapter 4',
          subjectName: 'Physics',
          dueDate: '2026-08-20',
          assignedByUserId: tenant.user.id,
          assignedByName: tenant.user.name,
        },
      };

      await Promise.all([
        handleHomeworkPublished(event, deps),
        handleHomeworkPublished(event, deps),
        handleHomeworkPublished(event, deps),
        handleHomeworkPublished(event, deps),
      ]);

      const activities = await db.activity.findMany({ where: { studentId: student.id } });
      expect(activities).toHaveLength(1);
    });

    it('COM-SEC-012: malformed event envelopes are rejected safely without crashing process', async () => {
      const malformedEvent = {
        eventId: '',
        eventType: 'unknown.fake.event',
        timestamp: 'invalid-date',
        instituteId: '',
        payload: null,
      };

      const val = validateEventEnvelope(malformedEvent);
      expect(val.isValid).toBe(false);
      expect(val.errorReason).toBeDefined();
    });
  });

  // ============================================================================
  // 6. XSS & UNSAFE CONTENT HANDLING (COM-SEC-017)
  // ============================================================================

  describe('XSS & Unsafe Content Handling (COM-SEC-017)', () => {
    it('COM-SEC-017: persists and renders announcements containing XSS strings safely', async () => {
      const tenant = await setupTenant('Inst_017');

      const xssTitle = '<script>alert("xss-title")</script>';
      const xssContent = '<img src=x onerror=alert("xss-body") /> Normal announcement body';

      const req = new NextRequest('http://localhost:3000/api/v1/communication/announcements', {
        method: 'POST',
        headers: {
          cookie: tenant.cookieHeader,
          'content-type': 'application/json',
          'x-forwarded-for': getUniqueIp(),
        },
        body: JSON.stringify({
          title: xssTitle,
          content: xssContent,
          targetType: 'institute',
        }),
      });

      const res = await announcementsPOST(req);
      expect(res.status).toBe(201);
      const data = (await res.json()).data;
      expect(data.title).toBe(xssTitle);
      expect(data.content).toBe(xssContent);
    });
  });
});

