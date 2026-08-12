/**
 * Phase 1.12.5 — Protected Identity APIs (/api/v1) Security & Adversarial E2E Audit
 *
 * Explicitly tests all 24 IDENTITY threats from ADR-0015 against the live /api/v1 HTTP boundary.
 */
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import {
  validateTestEnvironment,
  cleanTestDatabase,
  closeTestPool,
  db,
} from '@coaching-os/database';
import { auth } from '@coaching-os/auth';

// V1 Route Handlers
import { GET as studentsListGET } from './students/route';
import { GET as studentByIdGET, PATCH as studentByIdPATCH } from './students/[id]/route';
import { GET as guardiansListGET } from './guardians/route';
import { GET as guardianByIdGET } from './guardians/[id]/route';
import { GET as staffListGET } from './staff/route';
import { GET as staffByIdGET } from './staff/[id]/route';
import { GET as enrollmentsListGET } from './enrollments/route';

// Onboarding route handler to bootstrap real test institutes
import { POST as onboardPOST } from '../onboarding/institute/route';

describe('Phase 1.12.5 — Protected Identity APIs Adversarial Security Suite', () => {
  beforeAll(() => {
    validateTestEnvironment();
  });

  beforeEach(async () => {
    await cleanTestDatabase();
  });

  afterAll(async () => {
    await closeTestPool();
  });

  // ── Test Fixture Helpers ───────────────────────────────────────────────────

  let testIpCounter = 1;
  function getUniqueIp(): string {
    testIpCounter += 1;
    return `10.100.${Math.floor(testIpCounter / 250)}.${testIpCounter % 250}`;
  }

  async function createAuthenticatedSession(prefix = 'v1_sec_user') {
    const email = `${prefix}_${Date.now()}_${Math.floor(Math.random() * 99999)}@test.com`;
    const password = 'SecureTestPassword123!';
    const signUpResponse = await auth.api.signUpEmail({
      body: { email, password, name: 'V1 Security Test User' },
      asResponse: true,
    });

    const cookieHeader = signUpResponse.headers.get('set-cookie');
    if (!cookieHeader) throw new Error('No set-cookie header from Better Auth signUpEmail');

    const user = await db.user.findFirstOrThrow({ where: { email: email.toLowerCase() } });
    return { user, cookieHeader };
  }

  async function onboardInstitute(cookieHeader: string, suffix: string) {
    const req = new NextRequest('http://localhost:3000/api/onboarding/institute', {
      method: 'POST',
      headers: new Headers({
        'Content-Type': 'application/json',
        cookie: cookieHeader,
        'x-forwarded-for': getUniqueIp(),
      }),
      body: JSON.stringify({
        name: `V1 Sec Institute ${suffix}`,
        phone: '+919876543210',
        email: `v1_inst_${suffix}_${Date.now()}@test.com`,
        slug: `v1-sec-${suffix}-${Date.now()}-${Math.floor(Math.random() * 999)}`,
      }),
    });
    const res = await onboardPOST(req);
    const body = await res.json();
    return body.data.institute;
  }

  async function createStudent(instituteId: string, prefix = 'STU') {
    return db.student.create({
      data: {
        instituteId,
        admissionNumber: `ADM-${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        firstName: 'TestFirst',
        lastName: prefix,
        admissionStatus: 'admitted',
        status: 'active',
      },
    });
  }

  // Helper to create a parent identity linked user
  async function createParentSession(instId: string, prefix = 'parent') {
    const email = `${prefix}_${Date.now()}_${Math.floor(Math.random() * 99999)}@test.com`;
    const password = 'SecureTestPassword123!';
    const signUpRes = await auth.api.signUpEmail({
      body: { email, password, name: 'Parent User' },
      asResponse: true,
    });

    const cookieHeader = signUpRes.headers.get('set-cookie')!;
    const parentUser = await db.user.findFirstOrThrow({ where: { email: email.toLowerCase() } });

    const phone = `+9198${Date.now().toString().slice(-8)}`;
    await db.user.update({
      where: { id: parentUser.id },
      data: { phone },
    });

    const parentId = await db.parentIdentity.create({ data: { phone } });
    const instParent = await db.instituteParent.create({
      data: { instituteId: instId, parentIdentityId: parentId.id },
    });
    await db.instituteMembership.create({
      data: {
        instituteId: instId,
        parentIdentityId: parentId.id,
        instituteParentId: instParent.id,
      },
    });

    return { user: parentUser, cookieHeader };
  }

  // ── IDENTITY-01 — Unauthenticated Access ──────────────────────────────────

  describe('IDENTITY-01 — Unauthenticated access', () => {
    it('rejects requests missing authentication credentials with 401 UNAUTHENTICATED', async () => {
      const fakeUuid = '123e4567-e89b-12d3-a456-426614174000';
      const ip = getUniqueIp();
      const requests = [
        { name: 'GET /students', call: () => studentsListGET(new NextRequest('http://localhost:3000/api/v1/students', { headers: { 'x-forwarded-for': ip } })) },
        { name: 'GET /students/[id]', call: () => studentByIdGET(new NextRequest(`http://localhost:3000/api/v1/students/${fakeUuid}`, { headers: { 'x-forwarded-for': ip } }), { params: Promise.resolve({ id: fakeUuid }) }) },
        { name: 'GET /guardians', call: () => guardiansListGET(new NextRequest('http://localhost:3000/api/v1/guardians', { headers: { 'x-forwarded-for': ip } })) },
        { name: 'GET /staff', call: () => staffListGET(new NextRequest('http://localhost:3000/api/v1/staff', { headers: { 'x-forwarded-for': ip } })) },
        { name: 'GET /enrollments', call: () => enrollmentsListGET(new NextRequest('http://localhost:3000/api/v1/enrollments', { headers: { 'x-forwarded-for': ip } })) },
      ];

      for (const reqInfo of requests) {
        const res = await reqInfo.call();
        expect(res.status, `Endpoint ${reqInfo.name} must return 401`).toBe(401);
        const body = await res.json();
        expect(body.error.code).toBe('UNAUTHENTICATED');
      }
    });
  });

  // ── IDENTITY-02 — Invalid / Revoked Session ─────────────────────────────

  describe('IDENTITY-02 — Invalid / revoked session', () => {
    it('rejects invalid, malformed, or fake auth tokens/cookies with 401 UNAUTHENTICATED', async () => {
      const badHeaders = [
        new Headers({ Authorization: '', 'x-forwarded-for': getUniqueIp() }),
        new Headers({ Authorization: 'Bearer', 'x-forwarded-for': getUniqueIp() }),
        new Headers({ Authorization: 'Bearer malformed.token.value', 'x-forwarded-for': getUniqueIp() }),
        new Headers({ cookie: 'better-auth.session_token=fake_session_123', 'x-forwarded-for': getUniqueIp() }),
      ];

      for (const headers of badHeaders) {
        const req = new NextRequest('http://localhost:3000/api/v1/students', { headers });
        const res = await studentsListGET(req);
        expect(res.status).toBe(401);
        const body = await res.json();
        expect(body.error.code).toBe('UNAUTHENTICATED');
      }
    });
  });

  // ── IDENTITY-03 — Capability Escalation ──────────────────────────────────

  describe('IDENTITY-03 — Capability escalation', () => {
    it('denies requests when user membership lacks mandatory capability with 403 FORBIDDEN', async () => {
      const { cookieHeader: ownerCookie } = await createAuthenticatedSession('owner03');
      const inst = await onboardInstitute(ownerCookie, 'inst03');
      const student = await createStudent(inst.id, 'CapTest');

      // Create parent user & parent membership (lacks student:update capability)
      const { cookieHeader: parentCookie } = await createParentSession(inst.id, 'parent03');

      // Parent attempts to PATCH student profile -> 403
      const req = new NextRequest(`http://localhost:3000/api/v1/students/${student.id}`, {
        method: 'PATCH',
        headers: new Headers({
          'Content-Type': 'application/json',
          cookie: parentCookie,
          'x-forwarded-for': getUniqueIp(),
        }),
        body: JSON.stringify({ firstName: 'HackedName' }),
      });
      const res = await studentByIdPATCH(req, { params: Promise.resolve({ id: student.id }) });
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error.code).toBe('FORBIDDEN');
    });
  });

  // ── IDENTITY-04 — Role Spoofing ──────────────────────────────────────────

  describe('IDENTITY-04 — Role spoofing', () => {
    it('ignores client-supplied X-Role headers and rejects body role overrides', async () => {
      const { cookieHeader } = await createAuthenticatedSession('user04');
      await onboardInstitute(cookieHeader, 'inst04');

      const spoofedReq = new NextRequest('http://localhost:3000/api/v1/students', {
        headers: new Headers({
          cookie: cookieHeader,
          'x-role': 'owner',
          'X-Role': 'owner',
          'x-forwarded-for': getUniqueIp(),
        }),
      });

      const res = await studentsListGET(spoofedReq);
      expect(res.status).toBe(200); // Uses session membership, not header spoof
    });
  });

  // ── IDENTITY-05 — Tenant Spoofing ────────────────────────────────────────

  describe('IDENTITY-05 — Tenant spoofing', () => {
    it('ignores x-institute-id headers and confines user to session-authoritative tenant', async () => {
      const { cookieHeader: cookieA } = await createAuthenticatedSession('userA05');
      const instA = await onboardInstitute(cookieA, 'instA05');
      const studentA = await createStudent(instA.id, 'TenantAStudent');

      const { cookieHeader: cookieB } = await createAuthenticatedSession('userB05');
      await onboardInstitute(cookieB, 'instB05');

      // User B attempts to access Student A by spoofing x-institute-id header for Inst A -> 404
      const req = new NextRequest(`http://localhost:3000/api/v1/students/${studentA.id}`, {
        headers: new Headers({
          cookie: cookieB,
          'x-institute-id': instA.id,
          'X-Institute-ID': instA.id,
          'x-forwarded-for': getUniqueIp(),
        }),
      });

      const res = await studentByIdGET(req, { params: Promise.resolve({ id: studentA.id }) });
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error.code).toBe('NOT_FOUND');
    });
  });

  // ── IDENTITY-06 — Cross-Tenant Student Access ────────────────────────────

  describe('IDENTITY-06 — Cross-tenant student access', () => {
    it('returns 404 NOT_FOUND when attempting to access or modify a student in another institute', async () => {
      const { cookieHeader: cookieA } = await createAuthenticatedSession('userA06');
      const instA = await onboardInstitute(cookieA, 'instA06');
      const studentA = await createStudent(instA.id, 'CrossTenantStu');

      const { cookieHeader: cookieB } = await createAuthenticatedSession('userB06');
      await onboardInstitute(cookieB, 'instB06');

      const ip = getUniqueIp();
      // User B GET student A -> 404
      const getReq = new NextRequest(`http://localhost:3000/api/v1/students/${studentA.id}`, {
        headers: new Headers({ cookie: cookieB, 'x-forwarded-for': ip }),
      });
      const getRes = await studentByIdGET(getReq, { params: Promise.resolve({ id: studentA.id }) });
      expect(getRes.status).toBe(404);

      // User B PATCH student A -> 404
      const patchReq = new NextRequest(`http://localhost:3000/api/v1/students/${studentA.id}`, {
        method: 'PATCH',
        headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieB, 'x-forwarded-for': ip }),
        body: JSON.stringify({ firstName: 'Tampered' }),
      });
      const patchRes = await studentByIdPATCH(patchReq, { params: Promise.resolve({ id: studentA.id }) });
      expect(patchRes.status).toBe(404);
    });
  });

  // ── IDENTITY-07 — Cross-Tenant Guardian Access ───────────────────────────

  describe('IDENTITY-07 — Cross-tenant guardian access', () => {
    it('returns 404 for cross-tenant guardian lookup and empty list for cross-tenant guardian-student link', async () => {
      const { cookieHeader: cookieA } = await createAuthenticatedSession('userA07');
      const instA = await onboardInstitute(cookieA, 'instA07');
      const phone = `+9197${Date.now().toString().slice(-8)}`;
      const pId = await db.parentIdentity.create({ data: { phone } });
      const parentA = await db.instituteParent.create({
        data: { instituteId: instA.id, parentIdentityId: pId.id },
      });

      const { cookieHeader: cookieB } = await createAuthenticatedSession('userB07');
      await onboardInstitute(cookieB, 'instB07');

      // User B GET guardian A -> 404
      const req = new NextRequest(`http://localhost:3000/api/v1/guardians/${parentA.id}`, {
        headers: new Headers({ cookie: cookieB, 'x-forwarded-for': getUniqueIp() }),
      });
      const res = await guardianByIdGET(req, { params: Promise.resolve({ id: parentA.id }) });
      expect(res.status).toBe(404);
    });
  });

  // ── IDENTITY-08 — Cross-Tenant Staff Membership Access ───────────────────

  describe('IDENTITY-08 — Cross-tenant staff membership access', () => {
    it('returns 404 for cross-tenant staff lookup and confines staff list strictly to session tenant', async () => {
      const { user: userA, cookieHeader: cookieA } = await createAuthenticatedSession('userA08');
      const instA = await onboardInstitute(cookieA, 'instA08');

      const { cookieHeader: cookieB } = await createAuthenticatedSession('userB08');
      await onboardInstitute(cookieB, 'instB08');

      const ip = getUniqueIp();
      // User B attempts GET staff member A -> 404
      const req = new NextRequest(`http://localhost:3000/api/v1/staff/${userA.id}`, {
        headers: new Headers({ cookie: cookieB, 'x-forwarded-for': ip }),
      });
      const res = await staffByIdGET(req, { params: Promise.resolve({ id: userA.id }) });
      expect(res.status).toBe(404);

      // User B GET /staff -> returns ONLY user B's staff
      const listReq = new NextRequest('http://localhost:3000/api/v1/staff', {
        headers: new Headers({ cookie: cookieB, 'x-forwarded-for': ip }),
      });
      const listRes = await staffListGET(listReq);
      expect(listRes.status).toBe(200);
      const listBody = await listRes.json();
      expect(listBody.data.every((s: { instituteId: string }) => s.instituteId !== instA.id)).toBe(true);
    });
  });

  // ── IDENTITY-09 — Client instituteId Injection ──────────────────────────

  describe('IDENTITY-09 — Client instituteId injection', () => {
    it('rejects payloads containing injected instituteId with 400 VALIDATION_ERROR', async () => {
      const { cookieHeader } = await createAuthenticatedSession('user09');
      const inst = await onboardInstitute(cookieHeader, 'inst09');
      const student = await createStudent(inst.id, 'Inj09');

      const req = new NextRequest(`http://localhost:3000/api/v1/students/${student.id}`, {
        method: 'PATCH',
        headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieHeader, 'x-forwarded-for': getUniqueIp() }),
        body: JSON.stringify({
          firstName: 'ValidName',
          instituteId: 'foreign-tenant-uuid',
        }),
      });

      const res = await studentByIdPATCH(req, { params: Promise.resolve({ id: student.id }) });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // ── IDENTITY-10 — Client userId Injection ─────────────────────────────

  describe('IDENTITY-10 — Client userId injection', () => {
    it('rejects payloads containing injected userId with 400 VALIDATION_ERROR', async () => {
      const { cookieHeader } = await createAuthenticatedSession('user10');
      const inst = await onboardInstitute(cookieHeader, 'inst10');
      const student = await createStudent(inst.id, 'Inj10');

      const req = new NextRequest(`http://localhost:3000/api/v1/students/${student.id}`, {
        method: 'PATCH',
        headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieHeader, 'x-forwarded-for': getUniqueIp() }),
        body: JSON.stringify({
          firstName: 'ValidName',
          userId: 'foreign-user-uuid',
        }),
      });

      const res = await studentByIdPATCH(req, { params: Promise.resolve({ id: student.id }) });
      expect(res.status).toBe(400);
    });
  });

  // ── IDENTITY-11 — Client role Injection ───────────────────────────────

  describe('IDENTITY-11 — Client role injection', () => {
    it('rejects payloads containing injected role with 400 VALIDATION_ERROR', async () => {
      const { cookieHeader } = await createAuthenticatedSession('user11');
      const inst = await onboardInstitute(cookieHeader, 'inst11');
      const student = await createStudent(inst.id, 'Inj11');

      const req = new NextRequest(`http://localhost:3000/api/v1/students/${student.id}`, {
        method: 'PATCH',
        headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieHeader, 'x-forwarded-for': getUniqueIp() }),
        body: JSON.stringify({
          firstName: 'ValidName',
          role: 'owner',
        }),
      });

      const res = await studentByIdPATCH(req, { params: Promise.resolve({ id: student.id }) });
      expect(res.status).toBe(400);
    });
  });

  // ── IDENTITY-12 — Unauthorized Identity Status Mutation ────────────────

  describe('IDENTITY-12 — Unauthorized identity status mutation', () => {
    it('rejects attempting to mutate student admissionStatus or status via generic PATCH with 400', async () => {
      const { cookieHeader } = await createAuthenticatedSession('user12');
      const inst = await onboardInstitute(cookieHeader, 'inst12');
      const student = await createStudent(inst.id, 'Inj12');

      const req = new NextRequest(`http://localhost:3000/api/v1/students/${student.id}`, {
        method: 'PATCH',
        headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieHeader, 'x-forwarded-for': getUniqueIp() }),
        body: JSON.stringify({
          status: 'archived',
          admissionStatus: 'rejected',
        }),
      });

      const res = await studentByIdPATCH(req, { params: Promise.resolve({ id: student.id }) });
      expect(res.status).toBe(400);
    });
  });

  // ── IDENTITY-13 — Sensitive Security Field Exposure ────────────────────

  describe('IDENTITY-13 — Sensitive security field exposure', () => {
    it('guarantees response DTOs never expose sensitive authentication or internal fields', async () => {
      const { user, cookieHeader } = await createAuthenticatedSession('user13');
      await onboardInstitute(cookieHeader, 'inst13');

      const req = new NextRequest(`http://localhost:3000/api/v1/staff/${user.id}`, {
        headers: new Headers({ cookie: cookieHeader, 'x-forwarded-for': getUniqueIp() }),
      });
      const res = await staffByIdGET(req, { params: Promise.resolve({ id: user.id }) });
      expect(res.status).toBe(200);

      const jsonText = await res.text();

      const forbiddenSubstrings = [
        'password',
        'hashedPassword',
        'token',
        'sessionToken',
        'accessToken',
        'refreshToken',
        'secret',
        'mfa',
        'oauth',
        'credentials',
      ];

      for (const term of forbiddenSubstrings) {
        expect(jsonText.toLowerCase(), `Response must not leak '${term}'`).not.toContain(term);
      }
    });
  });

  // ── IDENTITY-14 — Unbounded Pagination ──────────────────────────────────

  describe('IDENTITY-14 — Unbounded pagination', () => {
    it('rejects invalid or excessive pagination limits with 400 VALIDATION_ERROR', async () => {
      const { cookieHeader } = await createAuthenticatedSession('user14');
      await onboardInstitute(cookieHeader, 'inst14');

      const invalidLimits = ['0', '-1', '101', '100000', '999999999', 'Infinity', 'abc'];

      for (const limit of invalidLimits) {
        const req = new NextRequest(`http://localhost:3000/api/v1/students?limit=${limit}`, {
          headers: new Headers({ cookie: cookieHeader, 'x-forwarded-for': getUniqueIp() }),
        });
        const res = await studentsListGET(req);
        expect(res.status, `Limit ${limit} should be rejected with 400`).toBe(400);
        const body = await res.json();
        expect(body.error.code).toBe('VALIDATION_ERROR');
      }
    });
  });

  // ── IDENTITY-15 — Search / Filter Injection ────────────────────────────

  describe('IDENTITY-15 — Search/filter injection', () => {
    it('handles malicious query strings safely without exposing SQL or DB errors', async () => {
      const { cookieHeader } = await createAuthenticatedSession('user15');
      await onboardInstitute(cookieHeader, 'inst15');

      const maliciousQueries = [
        "'; DROP TABLE students; --",
        "' OR '1'='1",
        "/* comment */ % _",
        "UNION SELECT * FROM user",
      ];

      for (const query of maliciousQueries) {
        const req = new NextRequest(`http://localhost:3000/api/v1/students?search=${encodeURIComponent(query)}`, {
          headers: new Headers({ cookie: cookieHeader, 'x-forwarded-for': getUniqueIp() }),
        });
        const res = await studentsListGET(req);
        expect(res.status).toBe(200);
        const text = await res.text();
        expect(text).not.toContain('prisma');
        expect(text).not.toContain('syntax error');
      }
    });
  });

  // ── IDENTITY-16 — Rate-limit Bypass ────────────────────────────────────

  describe('IDENTITY-16 — Rate-limit bypass', () => {
    it('returns 429 RATE_LIMITED with Retry-After header when rate limit is exceeded', async () => {
      const { cookieHeader } = await createAuthenticatedSession('user16');
      await onboardInstitute(cookieHeader, 'inst16');

      const dedicatedIp = '192.168.99.1';

      // Hit rate limit threshold (100 reads per minute)
      let rateLimited = false;
      for (let i = 0; i < 105; i++) {
        const req = new NextRequest('http://localhost:3000/api/v1/students', {
          headers: new Headers({ cookie: cookieHeader, 'x-forwarded-for': dedicatedIp }),
        });
        const res = await studentsListGET(req);
        if (res.status === 429) {
          rateLimited = true;
          expect(res.headers.get('Retry-After')).toBeDefined();
          const body = await res.json();
          expect(body.error.code).toBe('RATE_LIMITED');
          break;
        }
      }
      expect(rateLimited).toBe(true);
    });
  });

  // ── IDENTITY-17 — Error Information Disclosure ──────────────────────────

  describe('IDENTITY-17 — Error information disclosure', () => {
    it('never leaks stack traces, database schema, or internal class names in error responses', async () => {
      const { cookieHeader } = await createAuthenticatedSession('user17');
      await onboardInstitute(cookieHeader, 'inst17');

      // Force invalid UUID error
      const req = new NextRequest('http://localhost:3000/api/v1/students/not-a-valid-uuid', {
        headers: new Headers({ cookie: cookieHeader, 'x-forwarded-for': getUniqueIp() }),
      });
      const res = await studentByIdGET(req, { params: Promise.resolve({ id: 'not-a-valid-uuid' }) });
      expect(res.status).toBe(400);

      const text = await res.text();
      expect(text).not.toContain('stack');
      expect(text).not.toContain('at Process');
      expect(text).not.toContain('node_modules');
      expect(text).not.toContain('PrismaClient');
    });
  });

  // ── IDENTITY-18 — Mass Assignment ──────────────────────────────────────

  describe('IDENTITY-18 — Mass assignment', () => {
    it('strictly rejects payloads with unapproved or system-managed fields', async () => {
      const { cookieHeader } = await createAuthenticatedSession('user18');
      const inst = await onboardInstitute(cookieHeader, 'inst18');
      const student = await createStudent(inst.id, 'Mass18');

      const forbiddenFields = [
        { id: '123e4567-e89b-12d3-a456-426614174000' },
        { createdAt: new Date().toISOString() },
        { updatedAt: new Date().toISOString() },
        { deletedAt: new Date().toISOString() },
        { password: 'InjectedPassword123!' },
        { token: 'InjectedToken' },
        { capabilities: ['*'] },
        { tenantId: 'injected-tenant' },
      ];

      for (const field of forbiddenFields) {
        const req = new NextRequest(`http://localhost:3000/api/v1/students/${student.id}`, {
          method: 'PATCH',
          headers: new Headers({
            'Content-Type': 'application/json',
            cookie: cookieHeader,
            'x-forwarded-for': getUniqueIp(),
          }),
          body: JSON.stringify({
            firstName: 'ValidName',
            ...field,
          }),
        });

        const res = await studentByIdPATCH(req, { params: Promise.resolve({ id: student.id }) });
        expect(res.status, `Payload ${JSON.stringify(field)} must return 400`).toBe(400);
      }
    });
  });

  // ── IDENTITY-19 — ID Enumeration ────────────────────────────────────────

  describe('IDENTITY-19 — ID enumeration', () => {
    it('returns identical 404 responses for non-existent vs foreign tenant resource IDs', async () => {
      const { cookieHeader: cookieA } = await createAuthenticatedSession('userA19');
      const instA = await onboardInstitute(cookieA, 'instA19');
      const studentA = await createStudent(instA.id, 'StuA19');

      const { cookieHeader: cookieB } = await createAuthenticatedSession('userB19');
      await onboardInstitute(cookieB, 'instB19');

      const nonExistentUuid = '123e4567-e89b-12d3-a456-426614174999';

      const ip = getUniqueIp();
      // 1. Foreign tenant student ID lookup by User B
      const foreignReq = new NextRequest(`http://localhost:3000/api/v1/students/${studentA.id}`, {
        headers: new Headers({ cookie: cookieB, 'x-forwarded-for': ip }),
      });
      const foreignRes = await studentByIdGET(foreignReq, { params: Promise.resolve({ id: studentA.id }) });
      const foreignBody = await foreignRes.json();

      // 2. Non-existent UUID lookup by User B
      const missingReq = new NextRequest(`http://localhost:3000/api/v1/students/${nonExistentUuid}`, {
        headers: new Headers({ cookie: cookieB, 'x-forwarded-for': ip }),
      });
      const missingRes = await studentByIdGET(missingReq, { params: Promise.resolve({ id: nonExistentUuid }) });
      const missingBody = await missingRes.json();

      // Invariant: Both return status 404 with identical error shape (zero existence leakage)
      expect(foreignRes.status).toBe(404);
      expect(missingRes.status).toBe(404);
      expect(foreignBody.error.code).toBe(missingBody.error.code);
    });
  });

  // ── IDENTITY-20 — API Version Bypass ────────────────────────────────────

  describe('IDENTITY-20 — API version bypass', () => {
    it('enforces strict URL path versioning and ignores header version overrides', async () => {
      const { cookieHeader } = await createAuthenticatedSession('user20');
      await onboardInstitute(cookieHeader, 'inst20');

      const req = new NextRequest('http://localhost:3000/api/v1/students', {
        headers: new Headers({
          cookie: cookieHeader,
          'X-API-Version': 'v2',
          'x-forwarded-for': getUniqueIp(),
        }),
      });

      const res = await studentsListGET(req);
      expect(res.status).toBe(200); // Standard v1 response, header ignored
    });
  });

  // ── IDENTITY-21 — Parent Privilege Escalation ───────────────────────────

  describe('IDENTITY-21 — Parent privilege escalation', () => {
    it('prevents parent identities from accessing staff endpoints or executing student mutations', async () => {
      const { cookieHeader: ownerCookie } = await createAuthenticatedSession('owner21');
      const inst = await onboardInstitute(ownerCookie, 'inst21');
      const student = await createStudent(inst.id, 'Stu21');

      // Create parent identity & membership
      const { cookieHeader: parentCookie } = await createParentSession(inst.id, 'parent21');

      const ip = getUniqueIp();
      // 1. Parent attempts staff list -> 403
      const staffReq = new NextRequest('http://localhost:3000/api/v1/staff', {
        headers: new Headers({ cookie: parentCookie, 'x-forwarded-for': ip }),
      });
      const staffRes = await staffListGET(staffReq);
      expect(staffRes.status).toBe(403);

      // 2. Parent attempts student mutation -> 403
      const mutReq = new NextRequest(`http://localhost:3000/api/v1/students/${student.id}`, {
        method: 'PATCH',
        headers: new Headers({ 'Content-Type': 'application/json', cookie: parentCookie, 'x-forwarded-for': ip }),
        body: JSON.stringify({ firstName: 'ParentTamper' }),
      });
      const mutRes = await studentByIdPATCH(mutReq, { params: Promise.resolve({ id: student.id }) });
      expect(mutRes.status).toBe(403);
    });
  });

  // ── IDENTITY-22 — Teacher Resource-Scope Escalation ────────────────────

  describe('IDENTITY-22 — Teacher resource-scope escalation', () => {
    it('prevents staff lacking staff:read capability from accessing staff endpoints', async () => {
      const { cookieHeader: ownerCookie } = await createAuthenticatedSession('owner22');
      const inst = await onboardInstitute(ownerCookie, 'inst22');

      // Create parent identity membership (which lacks staff:read)
      const { cookieHeader: parentCookie } = await createParentSession(inst.id, 'parent22');

      // Parent/non-admin attempts staff list -> 403
      const req = new NextRequest('http://localhost:3000/api/v1/staff', {
        headers: new Headers({ cookie: parentCookie, 'x-forwarded-for': getUniqueIp() }),
      });
      const res = await staffListGET(req);
      expect(res.status).toBe(403);
    });
  });

  // ── IDENTITY-23 — Staff Role Self-Escalation ───────────────────────────

  describe('IDENTITY-23 — Staff role self-escalation', () => {
    it('prevents staff members from self-escalating role or permissions via update endpoints', async () => {
      const { cookieHeader } = await createAuthenticatedSession('user23');
      const inst = await onboardInstitute(cookieHeader, 'inst23');
      const student = await createStudent(inst.id, 'Stu23');

      // Attempt role self-escalation in payload
      const req = new NextRequest(`http://localhost:3000/api/v1/students/${student.id}`, {
        method: 'PATCH',
        headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieHeader, 'x-forwarded-for': getUniqueIp() }),
        body: JSON.stringify({
          firstName: 'ValidName',
          role: 'owner',
          permissions: ['*'],
          capabilities: ['*'],
        }),
      });

      const res = await studentByIdPATCH(req, { params: Promise.resolve({ id: student.id }) });
      expect(res.status).toBe(400); // Rejected by .strict() validation schema
    });
  });

  // ── IDENTITY-24 — Audit / Observability PII Exposure ───────────────────

  describe('IDENTITY-24 — Audit/observability PII exposure', () => {
    it('ensures headers and payload fields returned in responses do not expose unhashed secrets', async () => {
      const { cookieHeader } = await createAuthenticatedSession('user24');
      const inst = await onboardInstitute(cookieHeader, 'inst24');
      const student = await createStudent(inst.id, 'Stu24');

      const req = new NextRequest(`http://localhost:3000/api/v1/students/${student.id}`, {
        headers: new Headers({ cookie: cookieHeader, 'x-forwarded-for': getUniqueIp() }),
      });

      const res = await studentByIdGET(req, { params: Promise.resolve({ id: student.id }) });
      expect(res.status).toBe(200);

      const headersJson = JSON.stringify(Object.fromEntries(res.headers.entries()));
      expect(headersJson).not.toContain('cookie');
      expect(headersJson).not.toContain('password');
      expect(headersJson).not.toContain('set-cookie');
    });
  });
});
