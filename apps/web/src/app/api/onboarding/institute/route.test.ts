import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import {
  validateTestEnvironment,
  cleanTestDatabase,
  closeTestPool,
  db,
} from '@coaching-os/database';
import { auth } from '@coaching-os/auth';
import { POST, GET, PUT, PATCH, DELETE } from './route';

describe('POST /api/onboarding/institute API Boundary Integration Suite', () => {
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
   * Helper to create a NextRequest with a valid Better Auth session header
   */
  async function createAuthenticatedRequest(
    url: string,
    method = 'POST',
    body?: Record<string, unknown> | string,
    userEmail = `test_founder_${Date.now()}_${Math.floor(Math.random() * 1000)}@test.com`,
  ) {
    const password = 'SecureTestPassword123!';
    const name = 'Founder User';

    // 1. Sign up user via Better Auth API to obtain valid signed session cookie
    const signUpResponse = await auth.api.signUpEmail({
      body: {
        email: userEmail,
        password,
        name,
      },
      asResponse: true,
    });

    const cookieHeader = signUpResponse.headers.get('set-cookie');
    if (!cookieHeader) {
      throw new Error('Failed to obtain set-cookie header from Better Auth signUpEmail');
    }

    // 2. Fetch created user from DB
    const user = await db.user.findFirstOrThrow({
      where: { email: userEmail },
    });

    const headers = new Headers({
      'Content-Type': 'application/json',
      cookie: cookieHeader,
    });

    const req = new NextRequest(url, {
      method,
      headers,
      body: body !== undefined ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
    });

    return { req, user, cookieHeader };
  }

  describe('1. Authentication Boundary & Security Payload Invariants', () => {
    it('1. Returns 401 UNAUTHENTICATED when request has no valid session', async () => {
      const req = new NextRequest('http://localhost:3000/api/onboarding/institute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Anonymous Academy',
          phone: '+919876543210',
          email: 'anon@test.com',
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(401);

      const json = await res.json();
      expect(json.error.code).toBe('UNAUTHENTICATED');
      expect(json.error.requestId).toBeDefined();
      expect(res.headers.get('x-request-id')).toBeDefined();
    });

    it('3, 6, 7, 8. Ignores client-supplied userId, instituteId, role, and status injection in request body', async () => {
      const foreignUserId = '00000000-0000-4000-a000-000000000099';
      const foreignInstId = '00000000-0000-4000-a000-000000000088';

      const { req, user } = await createAuthenticatedRequest(
        'http://localhost:3000/api/onboarding/institute',
        'POST',
        {
          name: 'Injection Protection Academy',
          phone: '+919876543210',
          email: 'injection@test.com',
          // Malicious injections attempt to control identity & tenancy
          userId: foreignUserId,
          instituteId: foreignInstId,
          role: 'parent',
          status: 'suspended',
        },
      );

      const res = await POST(req);
      expect(res.status).toBe(201);

      const json = await res.json();
      expect(json.success).toBe(true);

      // CRITICAL SECURITY ASSERTIONS: Server uses session.user.id and server-controlled owner role
      expect(json.data.tenantContext.userId).toBe(user.id);
      expect(json.data.tenantContext.userId).not.toBe(foreignUserId);
      expect(json.data.tenantContext.instituteId).not.toBe(foreignInstId);
      expect(json.data.tenantContext.role).toBe('owner');
      expect(json.data.tenantContext.status).toBe('active');
    });
  });

  describe('2. Input Validation & Request Contract', () => {
    it('2a. Returns 400 VALIDATION_ERROR on malformed JSON payload', async () => {
      const { req } = await createAuthenticatedRequest(
        'http://localhost:3000/api/onboarding/institute',
        'POST',
        '{ invalid json string ...',
      );

      const res = await POST(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error.code).toBe('VALIDATION_ERROR');
      expect(json.error.message).toContain('Malformed JSON payload');
    });

    it('2b. Returns 400 VALIDATION_ERROR on missing or invalid schema fields', async () => {
      const { req } = await createAuthenticatedRequest(
        'http://localhost:3000/api/onboarding/institute',
        'POST',
        {
          name: 'A', // Too short (min 2 chars)
          phone: '123', // Invalid phone
          email: 'not-an-email', // Invalid email
        },
      );

      const res = await POST(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error.code).toBe('VALIDATION_ERROR');
      expect(json.error.details).toBeDefined();
    });
  });

  describe('3. Successful Onboarding & DTO Serialization', () => {
    it('201. Successfully onboards institute and returns 201 Created with safe DTO payload', async () => {
      const { req, user } = await createAuthenticatedRequest(
        'http://localhost:3000/api/onboarding/institute',
        'POST',
        {
          name: 'Apex Learning Institute',
          phone: '+919876543210',
          email: 'contact@apex.test',
          timezone: 'Asia/Kolkata',
          primaryColor: '#6366F1',
        },
      );

      const res = await POST(req);
      expect(res.status).toBe(201);
      expect(res.headers.get('x-request-id')).toBeDefined();

      const json = await res.json();
      expect(json.success).toBe(true);

      // Verify Institute DTO
      expect(json.data.institute.id).toBeDefined();
      expect(json.data.institute.name).toBe('Apex Learning Institute');
      expect(json.data.institute.slug).toBe('apex-learning-institute');
      expect(json.data.institute.phone).toBe('+919876543210');
      expect(json.data.institute.email).toBe('contact@apex.test');
      expect(json.data.institute.primaryColor).toBe('#6366F1');

      // Verify TenantContext DTO
      expect(json.data.tenantContext.userId).toBe(user.id);
      expect(json.data.tenantContext.instituteId).toBe(json.data.institute.id);
      expect(json.data.tenantContext.role).toBe('owner');
      expect(json.data.tenantContext.status).toBe('active');

      // Ensure zero DB connection or internal properties are leaked
      const rawText = JSON.stringify(json);
      expect(rawText).not.toContain('postgresql://');
      expect(rawText).not.toContain('prisma');
    });
  });

  describe('4. Conflict Semantics (Phase 1.4.3 Invariants)', () => {
    it('409a. Returns 409 CONFLICT if authenticated user is already associated with an institute', async () => {
      const { req, cookieHeader } = await createAuthenticatedRequest(
        'http://localhost:3000/api/onboarding/institute',
        'POST',
        {
          name: 'First Institute',
          phone: '+919876543210',
          email: 'first@test.com',
        },
      );

      // First onboarding succeeds
      const res1 = await POST(req);
      expect(res1.status).toBe(201);

      // User submits second onboarding request using same session cookie
      const req2 = new NextRequest('http://localhost:3000/api/onboarding/institute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: cookieHeader,
        },
        body: JSON.stringify({
          name: 'Second Institute Retry',
          phone: '+919876543211',
          email: 'second@test.com',
        }),
      });

      const res2 = await POST(req2);
      expect(res2.status).toBe(409);

      const json2 = await res2.json();
      expect(json2.error.code).toBe('CONFLICT');
      expect(json2.error.message).toContain('already associated with an active institute tenant');
    });

    it('409b. Returns 409 CONFLICT if institute slug already exists', async () => {
      // Pre-create institute with slug 'existing-slug-inst'
      await db.institute.create({
        data: {
          name: 'Existing Slug Institute',
          slug: 'existing-slug-inst',
          phone: '+919999999999',
          email: 'existing@test.com',
        },
      });

      const { req } = await createAuthenticatedRequest(
        'http://localhost:3000/api/onboarding/institute',
        'POST',
        {
          name: 'Existing Slug Inst', // Normalizes to 'existing-slug-inst'
          phone: '+919876543210',
          email: 'new@test.com',
        },
      );

      const res = await POST(req);
      expect(res.status).toBe(409);

      const json = await res.json();
      expect(json.error.code).toBe('CONFLICT');
      expect(json.error.message).toContain('already exists');
    });
  });

  describe('5. HTTP Method Safety (405 Method Not Allowed)', () => {
    it('Returns 405 Method Not Allowed for GET, PUT, PATCH, DELETE', async () => {
      const getRes = await GET();
      expect(getRes.status).toBe(405);
      expect(getRes.headers.get('Allow')).toBe('POST');

      const putRes = await PUT();
      expect(putRes.status).toBe(405);

      const patchRes = await PATCH();
      expect(patchRes.status).toBe(405);

      const delRes = await DELETE();
      expect(delRes.status).toBe(405);
    });
  });
});
