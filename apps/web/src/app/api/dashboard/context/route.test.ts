import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import {
  validateTestEnvironment,
  cleanTestDatabase,
  closeTestPool,
  db,
} from '@coaching-os/database';
import { auth } from '@coaching-os/auth';
import { GET, POST, DELETE } from './route';
import { POST as onboardPOST } from '../../onboarding/institute/route';

describe('GET /api/dashboard/context API Integration Suite', () => {
  beforeAll(() => {
    validateTestEnvironment();
  });

  beforeEach(async () => {
    await cleanTestDatabase();
  });

  afterAll(async () => {
    await closeTestPool();
  });

  /**
   * Helper: sign up a user and return their cookie header + user record.
   * Uses Better Auth API — identical to onboarding route test pattern.
   */
  async function createAuthenticatedSession(
    email = `ctx_user_${Date.now()}_${Math.floor(Math.random() * 9999)}@test.com`,
  ) {
    const password = 'SecureTestPassword123!';
    const signUpResponse = await auth.api.signUpEmail({
      body: { email, password, name: 'Context Test User' },
      asResponse: true,
    });

    const cookieHeader = signUpResponse.headers.get('set-cookie');
    if (!cookieHeader) throw new Error('No set-cookie header from Better Auth signUpEmail');

    const user = await db.user.findFirstOrThrow({ where: { email } });
    const headers = new Headers({ cookie: cookieHeader });

    return { user, headers, cookieHeader };
  }

  /**
   * Helper: onboard an institute using the POST /api/onboarding/institute endpoint
   * so the user.instituteId is set atomically via the real $transaction.
   */
  async function onboardInstitute(cookieHeader: string, suffix: string) {
    const onboardHeaders = new Headers({
      'Content-Type': 'application/json',
      cookie: cookieHeader,
    });
    const req = new NextRequest('http://localhost:3000/api/onboarding/institute', {
      method: 'POST',
      headers: onboardHeaders,
      body: JSON.stringify({
        name: `Context Test Institute ${suffix}`,
        phone: '+919876543210',
        email: `${suffix}@test.com`,
        slug: `ctx-${suffix}-${Date.now()}`,
      }),
    });
    const res = await onboardPOST(req);
    if (res.status !== 201) {
      const body = await res.json();
      throw new Error(`Onboarding failed: ${JSON.stringify(body)}`);
    }
    const body = await res.json();
    return body.data;
  }

  // ── 1. Authentication Boundary ─────────────────────────────────────────────

  describe('1. Authentication & Security Boundary', () => {
    it('1.1 Returns 401 when no session cookie is present', async () => {
      const req = new NextRequest('http://localhost:3000/api/dashboard/context', {
        method: 'GET',
      });

      const res = await GET(req);
      expect(res.status).toBe(401);

      const json = await res.json();
      expect(json.error.code).toBe('UNAUTHENTICATED');
      expect(json.error.requestId).toBeDefined();
      expect(res.headers.get('x-request-id')).toBeDefined();
    });

    it('1.2 Ignores any client-supplied instituteId in query parameters', async () => {
      const { cookieHeader, user } = await createAuthenticatedSession();
      const onboarded = await onboardInstitute(cookieHeader, 'sec');
      const fakeInstituteId = '00000000-0000-4000-a000-000000000099';

      const headers = new Headers({ cookie: cookieHeader });
      const req = new NextRequest(
        `http://localhost:3000/api/dashboard/context?instituteId=${fakeInstituteId}`,
        { method: 'GET', headers },
      );

      const res = await GET(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.hasTenant).toBe(true);
      // SECURITY: resolved instituteId is from the session-derived DB lookup, not query param
      expect(json.tenantContext.userId).toBe(user.id);
      expect(json.tenantContext.instituteId).toBe(onboarded.institute.id);
      expect(json.tenantContext.instituteId).not.toBe(fakeInstituteId);
    });

    it('1.3 Returns 405 for POST method', async () => {
      const res = await POST();
      expect(res.status).toBe(405);
      expect(res.headers.get('Allow')).toBe('GET');
    });

    it('1.4 Returns 405 for DELETE method', async () => {
      const res = await DELETE();
      expect(res.status).toBe(405);
    });
  });

  // ── 2. TenantContext Resolution ────────────────────────────────────────────

  describe('2. TenantContext Resolution', () => {
    it('2.1 Returns hasTenant:false when authenticated user has no institute', async () => {
      const { headers } = await createAuthenticatedSession();

      const req = new NextRequest('http://localhost:3000/api/dashboard/context', {
        method: 'GET',
        headers,
      });

      const res = await GET(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.hasTenant).toBe(false);
      expect(res.headers.get('Cache-Control')).toBe('no-store, max-age=0');
    });

    it('2.2 Returns resolved TenantContext when user has an active institute', async () => {
      const { headers, cookieHeader, user } = await createAuthenticatedSession();
      const onboarded = await onboardInstitute(cookieHeader, 'active');

      const req = new NextRequest('http://localhost:3000/api/dashboard/context', {
        method: 'GET',
        headers,
      });

      const res = await GET(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.hasTenant).toBe(true);

      // TenantContext fields — all server-resolved
      expect(json.tenantContext.userId).toBe(user.id);
      expect(json.tenantContext.instituteId).toBe(onboarded.institute.id);
      expect(json.tenantContext.membershipId).toBeDefined();
      expect(json.tenantContext.role).toBe('owner');
      expect(json.tenantContext.status).toBe('active');

      // Safe institute display data
      expect(json.institute.name).toContain('Context Test Institute');
      expect(json.institute.slug).toBeDefined();
      expect(json.institute.status).toBe('active');
    });

    it('2.3 hasTenant:false response never leaks tenantContext fields', async () => {
      // A user with no institute should get hasTenant:false with NO tenantContext fields
      const { headers } = await createAuthenticatedSession();

      const req = new NextRequest('http://localhost:3000/api/dashboard/context', {
        method: 'GET',
        headers,
      });

      const res = await GET(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.hasTenant).toBe(false);
      // Invariant: no tenantContext fields are exposed when hasTenant is false
      expect(json.tenantContext).toBeUndefined();
      expect(json.institute).toBeUndefined();
    });

    it('2.4 Returns Cache-Control: no-store on all responses', async () => {
      const { headers } = await createAuthenticatedSession();

      const req = new NextRequest('http://localhost:3000/api/dashboard/context', {
        method: 'GET',
        headers,
      });

      const res = await GET(req);
      expect(res.headers.get('Cache-Control')).toBe('no-store, max-age=0');
    });
  });

  // ── 3. Membership Lifecycle ────────────────────────────────────────────────

  describe('3. Membership Lifecycle', () => {
    it('3.1 Suspended user returns hasTenant:false (active membership required)', async () => {
      const { headers, cookieHeader, user } = await createAuthenticatedSession();
      await onboardInstitute(cookieHeader, 'susp');

      // Suspend the user — mimics membership suspension (status-based guard)
      await db.user.update({
        where: { id: user.id },
        data: { status: 'suspended' },
      });

      // GetUserMembershipsUseCase (activeOnly:true) filters out suspended memberships
      const req = new NextRequest('http://localhost:3000/api/dashboard/context', {
        method: 'GET',
        headers,
      });

      const res = await GET(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.hasTenant).toBe(false);
    });

    it('3.2 User with instituteId set to null returns hasTenant:false', async () => {
      const { headers, cookieHeader, user } = await createAuthenticatedSession();
      await onboardInstitute(cookieHeader, 'removed');

      // Remove institute association
      await db.user.update({
        where: { id: user.id },
        data: { instituteId: null },
      });

      const req = new NextRequest('http://localhost:3000/api/dashboard/context', {
        method: 'GET',
        headers,
      });

      const res = await GET(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.hasTenant).toBe(false);
    });
  });

  // ── 4. Tenant Isolation ────────────────────────────────────────────────────

  describe('4. Tenant Isolation', () => {
    it('4.1 User A only sees their own institute; cannot see User B institute', async () => {
      const { headers: headersA, cookieHeader: cookieA, user: userA } =
        await createAuthenticatedSession(`ctx_a_${Date.now()}@test.com`);
      const { cookieHeader: cookieB } =
        await createAuthenticatedSession(`ctx_b_${Date.now()}@test.com`);

      const onboardedA = await onboardInstitute(cookieA, 'iso-a');
      await onboardInstitute(cookieB, 'iso-b');

      // User A requests dashboard context — should only see Institute A
      const req = new NextRequest('http://localhost:3000/api/dashboard/context', {
        method: 'GET',
        headers: headersA,
      });

      const res = await GET(req);
      const json = await res.json();

      expect(json.hasTenant).toBe(true);
      expect(json.tenantContext.userId).toBe(userA.id);
      expect(json.tenantContext.instituteId).toBe(onboardedA.institute.id);
    });
  });
});
