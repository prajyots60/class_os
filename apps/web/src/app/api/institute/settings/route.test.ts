import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import {
  validateTestEnvironment,
  cleanTestDatabase,
  closeTestPool,
  db,
} from '@coaching-os/database';
import { auth } from '@coaching-os/auth';
import { GET, PATCH, POST, PUT, DELETE } from './route';
import { POST as onboardPOST } from '../../onboarding/institute/route';

describe('API /api/institute/settings Integration & Security Matrix', () => {
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
   * Helper: create an authenticated user session via Better Auth API.
   */
  async function createAuthenticatedSession(
    email = `settings_user_${Date.now()}_${Math.floor(Math.random() * 9999)}@test.com`,
  ) {
    const password = 'SecureTestPassword123!';
    const signUpResponse = await auth.api.signUpEmail({
      body: { email, password, name: 'Settings Test User' },
      asResponse: true,
    });

    const cookieHeader = signUpResponse.headers.get('set-cookie');
    if (!cookieHeader) throw new Error('No set-cookie header from Better Auth signUpEmail');

    const user = await db.user.findFirstOrThrow({ where: { email } });
    const headers = new Headers({ cookie: cookieHeader });

    return { user, headers, cookieHeader };
  }

  /**
   * Helper: onboard an institute for the user session.
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
        name: `Settings Test Institute ${suffix}`,
        phone: '+919876543210',
        email: `${suffix}@test.com`,
        slug: `stg-${suffix}-${Date.now()}`,
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

  // ── 1. Authentication & Method Guards ──────────────────────────────────────

  describe('1. Authentication & HTTP Method Guards', () => {
    it('1.1 GET returns 401 when no session cookie is present', async () => {
      const req = new NextRequest('http://localhost:3000/api/institute/settings', {
        method: 'GET',
      });

      const res = await GET(req);
      expect(res.status).toBe(401);

      const json = await res.json();
      expect(json.error.code).toBe('UNAUTHENTICATED');
      expect(res.headers.get('x-request-id')).toBeDefined();
    });

    it('1.2 PATCH returns 401 when no session cookie is present', async () => {
      const req = new NextRequest('http://localhost:3000/api/institute/settings', {
        method: 'PATCH',
        headers: new Headers({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ name: 'Hacked Name' }),
      });

      const res = await PATCH(req);
      expect(res.status).toBe(401);

      const json = await res.json();
      expect(json.error.code).toBe('UNAUTHENTICATED');
    });

    it('1.3 Unsupported HTTP methods return 405 Method Not Allowed', async () => {
      const resPost = await POST();
      expect(resPost.status).toBe(405);
      expect(resPost.headers.get('Allow')).toBe('GET, PATCH');

      const resPut = await PUT();
      expect(resPut.status).toBe(405);

      const resDelete = await DELETE();
      expect(resDelete.status).toBe(405);
    });
  });

  // ── 2. GET /api/institute/settings ─────────────────────────────────────────

  describe('2. GET /api/institute/settings', () => {
    it('2.1 Returns institute settings for an authorized tenant member', async () => {
      const { headers, cookieHeader } = await createAuthenticatedSession();
      const onboarded = await onboardInstitute(cookieHeader, 'get-owner');

      const req = new NextRequest('http://localhost:3000/api/institute/settings', {
        method: 'GET',
        headers,
      });

      const res = await GET(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.id).toBe(onboarded.institute.id);
      expect(json.data.name).toBe(onboarded.institute.name);
      expect(json.data.slug).toBe(onboarded.institute.slug);
      expect(json.data.phone).toBe('+919876543210');
      expect(json.data.timezone).toBe('Asia/Kolkata');
      expect(json.data.status).toBe('active');
      expect(res.headers.get('x-request-id')).toBeDefined();
      expect(res.headers.get('Cache-Control')).toBe('no-store, max-age=0');
    });

    it('2.2 Security: Ignores client-supplied ?instituteId query parameter', async () => {
      const { cookieHeader, headers } = await createAuthenticatedSession();
      const onboarded = await onboardInstitute(cookieHeader, 'get-sec');
      const fakeInstId = '00000000-0000-4000-a000-000000000099';

      const req = new NextRequest(
        `http://localhost:3000/api/institute/settings?instituteId=${fakeInstId}`,
        { method: 'GET', headers },
      );

      const res = await GET(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.data.id).toBe(onboarded.institute.id);
      expect(json.data.id).not.toBe(fakeInstId);
    });

    it('2.3 Security: Ignores injected client headers (x-institute-id, x-role)', async () => {
      const { cookieHeader } = await createAuthenticatedSession();
      const onboarded = await onboardInstitute(cookieHeader, 'get-hdr');

      const injectedHeaders = new Headers({
        cookie: cookieHeader,
        'x-institute-id': 'hacked_institute_id',
        'x-role': 'superadmin',
      });

      const req = new NextRequest('http://localhost:3000/api/institute/settings', {
        method: 'GET',
        headers: injectedHeaders,
      });

      const res = await GET(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.data.id).toBe(onboarded.institute.id);
    });
  });

  // ── 3. PATCH /api/institute/settings (Success & Partial Updates) ──────────

  describe('3. PATCH /api/institute/settings (Updates & Persistence)', () => {
    it('3.1 Allows owner to update name, phone, email, timezone, primaryColor, and logoUrl', async () => {
      const { cookieHeader, headers } = await createAuthenticatedSession();
      await onboardInstitute(cookieHeader, 'patch-full');

      const patchReq = new NextRequest('http://localhost:3000/api/institute/settings', {
        method: 'PATCH',
        headers: new Headers({
          'Content-Type': 'application/json',
          cookie: cookieHeader,
        }),
        body: JSON.stringify({
          name: 'Vanguard Learning Hub',
          phone: '+919999111222',
          email: 'admin@vanguardhub.com',
          timezone: 'Asia/Kolkata',
          primaryColor: '#0F172A',
          logoUrl: 'https://cdn.vanguard.com/brand.png',
        }),
      });

      const res = await PATCH(patchReq);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.name).toBe('Vanguard Learning Hub');
      expect(json.data.phone).toBe('+919999111222');
      expect(json.data.email).toBe('admin@vanguardhub.com');
      expect(json.data.primaryColor).toBe('#0F172A');
      expect(json.data.logoUrl).toBe('https://cdn.vanguard.com/brand.png');

      // Verify DB persistence via GET
      const getReq = new NextRequest('http://localhost:3000/api/institute/settings', {
        method: 'GET',
        headers,
      });
      const getRes = await GET(getReq);
      const getJson = await getRes.json();
      expect(getJson.data.name).toBe('Vanguard Learning Hub');
      expect(getJson.data.primaryColor).toBe('#0F172A');
    });

    it('3.2 Performs partial updates without overwriting untouched settings', async () => {
      const { cookieHeader } = await createAuthenticatedSession();
      const onboarded = await onboardInstitute(cookieHeader, 'patch-partial');

      const patchReq = new NextRequest('http://localhost:3000/api/institute/settings', {
        method: 'PATCH',
        headers: new Headers({
          'Content-Type': 'application/json',
          cookie: cookieHeader,
        }),
        body: JSON.stringify({
          name: 'Partial Update Name',
        }),
      });

      const res = await PATCH(patchReq);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.data.name).toBe('Partial Update Name');
      expect(json.data.phone).toBe('+919876543210');
      expect(json.data.email).toBe(onboarded.institute.email);
    });

    it('3.3 Allows resetting logoUrl and primaryColor to null', async () => {
      const { cookieHeader } = await createAuthenticatedSession();
      await onboardInstitute(cookieHeader, 'patch-reset');

      // First set branding values
      await PATCH(
        new NextRequest('http://localhost:3000/api/institute/settings', {
          method: 'PATCH',
          headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieHeader }),
          body: JSON.stringify({ primaryColor: '#123456', logoUrl: 'https://cdn.example.com/logo.png' }),
        }),
      );

      // Now reset to null
      const res = await PATCH(
        new NextRequest('http://localhost:3000/api/institute/settings', {
          method: 'PATCH',
          headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieHeader }),
          body: JSON.stringify({ primaryColor: null, logoUrl: null }),
        }),
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.primaryColor).toBeNull();
      expect(json.data.logoUrl).toBeNull();
    });
  });

  // ── 4. PATCH Payload Validation & Security Attacking ──────────────────────

  describe('4. Validation Rules & Security Attack Defense', () => {
    it('4.1 Rejects empty PATCH object {} with 400 VALIDATION_ERROR', async () => {
      const { cookieHeader } = await createAuthenticatedSession();
      await onboardInstitute(cookieHeader, 'v-empty');

      const req = new NextRequest('http://localhost:3000/api/institute/settings', {
        method: 'PATCH',
        headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieHeader }),
        body: JSON.stringify({}),
      });

      const res = await PATCH(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error.code).toBe('VALIDATION_ERROR');
    });

    it('4.2 Rejects malformed JSON body with 400 VALIDATION_ERROR', async () => {
      const { cookieHeader } = await createAuthenticatedSession();
      await onboardInstitute(cookieHeader, 'v-json');

      const req = new NextRequest('http://localhost:3000/api/institute/settings', {
        method: 'PATCH',
        headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieHeader }),
        body: '{ malformed json...',
      });

      const res = await PATCH(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error.code).toBe('VALIDATION_ERROR');
    });

    it('4.3 Rejects name shorter than 2 characters', async () => {
      const { cookieHeader } = await createAuthenticatedSession();
      await onboardInstitute(cookieHeader, 'v-name');

      const req = new NextRequest('http://localhost:3000/api/institute/settings', {
        method: 'PATCH',
        headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieHeader }),
        body: JSON.stringify({ name: 'A' }),
      });

      const res = await PATCH(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe('VALIDATION_ERROR');
    });

    it('4.4 Rejects invalid email formats', async () => {
      const { cookieHeader } = await createAuthenticatedSession();
      await onboardInstitute(cookieHeader, 'v-email');

      const req = new NextRequest('http://localhost:3000/api/institute/settings', {
        method: 'PATCH',
        headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieHeader }),
        body: JSON.stringify({ email: 'not-an-email' }),
      });

      const res = await PATCH(req);
      expect(res.status).toBe(400);
    });

    it('4.5 Rejects non-HTTPS logo URLs (HTTP, javascript:, file:)', async () => {
      const { cookieHeader } = await createAuthenticatedSession();
      await onboardInstitute(cookieHeader, 'v-logo');

      const invalidUrls = [
        'http://cdn.example.com/logo.png',
        'javascript:alert(1)',
        'file:///etc/passwd',
        'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
      ];

      for (const url of invalidUrls) {
        const req = new NextRequest('http://localhost:3000/api/institute/settings', {
          method: 'PATCH',
          headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieHeader }),
          body: JSON.stringify({ logoUrl: url }),
        });

        const res = await PATCH(req);
        expect(res.status).toBe(400);
      }
    });

    it('4.6 Rejects non-HEX primary colors (RGB, HSL, CSS vars, invalid HEX)', async () => {
      const { cookieHeader } = await createAuthenticatedSession();
      await onboardInstitute(cookieHeader, 'v-color');

      const invalidColors = [
        'rgb(255, 0, 0)',
        'hsl(0, 100%, 50%)',
        'var(--primary)',
        'red',
        '#12345',
        '#GGGGGG',
      ];

      for (const color of invalidColors) {
        const req = new NextRequest('http://localhost:3000/api/institute/settings', {
          method: 'PATCH',
          headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieHeader }),
          body: JSON.stringify({ primaryColor: color }),
        });

        const res = await PATCH(req);
        expect(res.status).toBe(400);
      }
    });

    it('4.7 Rejects attempts to pass protected identity fields (id, slug, status, createdAt, role, instituteId)', async () => {
      const { cookieHeader } = await createAuthenticatedSession();
      await onboardInstitute(cookieHeader, 'v-strict');

      const attackPayloads = [
        { id: 'hacked_id' },
        { slug: 'hacked-slug' },
        { status: 'archived' },
        { role: 'superadmin' },
        { instituteId: 'foreign_institute' },
        { tenantId: 'foreign_tenant' },
      ];

      for (const payload of attackPayloads) {
        const req = new NextRequest('http://localhost:3000/api/institute/settings', {
          method: 'PATCH',
          headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieHeader }),
          body: JSON.stringify({ name: 'Valid Name', ...payload }),
        });

        const res = await PATCH(req);
        expect(res.status).toBe(400);

        const json = await res.json();
        expect(json.error.code).toBe('VALIDATION_ERROR');
      }
    });
  });

  // ── 5. Multi-Tenant Isolation & Role Authorization ─────────────────────────

  describe('5. Multi-Tenant Isolation & Security Matrix', () => {
    it('5.1 Cross-Tenant Attack: User A cannot read or modify Tenant B settings', async () => {
      const { cookieHeader: cookieA, headers: headersA } = await createAuthenticatedSession('usera@test.com');
      const { cookieHeader: cookieB } = await createAuthenticatedSession('userb@test.com');

      const onboardedA = await onboardInstitute(cookieA, 'tenant-a');
      const onboardedB = await onboardInstitute(cookieB, 'tenant-b');

      // User A GET -> gets Tenant A settings
      const getRes = await GET(new NextRequest('http://localhost:3000/api/institute/settings', { method: 'GET', headers: headersA }));
      const getJson = await getRes.json();
      expect(getJson.data.id).toBe(onboardedA.institute.id);
      expect(getJson.data.id).not.toBe(onboardedB.institute.id);

      // User A PATCH with body trying to target Tenant B -> modifies Tenant A only, never Tenant B
      const patchReq = new NextRequest('http://localhost:3000/api/institute/settings', {
        method: 'PATCH',
        headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieA }),
        body: JSON.stringify({ name: 'User A Modified Name' }),
      });
      const patchRes = await PATCH(patchReq);
      expect(patchRes.status).toBe(200);

      // Verify Tenant B remains untouched
      const getBRes = await GET(new NextRequest('http://localhost:3000/api/institute/settings', {
        method: 'GET',
        headers: new Headers({ cookie: cookieB }),
      }));
      const getBJson = await getBRes.json();
      expect(getBJson.data.name).toBe(onboardedB.institute.name);
      expect(getBJson.data.name).not.toBe('User A Modified Name');
    });

    it('5.2 Role Authorization: Member with unauthorized role returns 403 AUTHORIZATION_DENIED', async () => {
      const { cookieHeader, user } = await createAuthenticatedSession('parent_user@test.com');
      const onboarded = await onboardInstitute(cookieHeader, 'rbac-role');

      // Convert user from staff owner to parent membership (lacks settings:update capability)
      await db.user.update({
        where: { id: user.id },
        data: { instituteId: null, phone: '+919988776655' },
      });

      const parentIdentity = await db.parentIdentity.create({
        data: { phone: '+919988776655' },
      });

      const instParent = await db.instituteParent.create({
        data: {
          instituteId: onboarded.institute.id,
          name: 'Parent User',
          primaryPhone: '+919988776655',
        },
      });

      await db.instituteMembership.create({
        data: {
          parentIdentityId: parentIdentity.id,
          instituteId: onboarded.institute.id,
          instituteParentId: instParent.id,
        },
      });

      const patchReq = new NextRequest('http://localhost:3000/api/institute/settings', {
        method: 'PATCH',
        headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieHeader }),
        body: JSON.stringify({ name: 'Parent Attempted Update' }),
      });

      const res = await PATCH(patchReq);
      expect(res.status).toBe(403);

      const json = await res.json();
      expect(json.error.code).toBe('FORBIDDEN');
    });
  });

  // ── 6. Error Leakage & Response Audit ──────────────────────────────────────

  describe('6. Response Contract & Security Leakage Audit', () => {
    it('6.1 Exposes zero Prisma stack traces, database credentials, or internal paths on error', async () => {
      const { cookieHeader } = await createAuthenticatedSession();
      await onboardInstitute(cookieHeader, 'audit-leak');

      // Send malformed PATCH
      const req = new NextRequest('http://localhost:3000/api/institute/settings', {
        method: 'PATCH',
        headers: new Headers({ 'Content-Type': 'application/json', cookie: cookieHeader }),
        body: JSON.stringify({ primaryColor: 'invalid-color' }),
      });

      const res = await PATCH(req);
      const rawText = await res.text();

      expect(rawText).not.toContain('DATABASE_URL');
      expect(rawText).not.toContain('password');
      expect(rawText).not.toContain('stack');
      expect(rawText).not.toContain('prisma');
      expect(rawText).not.toContain('SELECT');
    });
  });
});
