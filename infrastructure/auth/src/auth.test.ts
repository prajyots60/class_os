import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { auth } from './auth';
import { getAuthenticatedSession, requireInstituteMembership } from './session';
import {
  db,
  validateTestEnvironment,
  cleanTestDatabase,
  closeTestPool,
  createTestInstitute,
} from '@coaching-os/database';

describe('Better Auth Foundation & Session Integration Suite', () => {
  beforeAll(() => {
    validateTestEnvironment();
  });

  beforeEach(async () => {
    await cleanTestDatabase();
  });

  afterAll(async () => {
    await closeTestPool();
  });

  it('executes sign-up, sign-in, session retrieval, and membership context resolution', async () => {
    const inst = await createTestInstitute({ name: 'Apex Academy' });
    const email = `test_owner_${Date.now()}@apex.com`;
    const password = 'SecurePassword123!';

    // 1. Sign Up
    const signUpResult = await auth.api.signUpEmail({
      body: {
        email,
        password,
        name: 'Apex Owner',
      },
    });

    expect(signUpResult.user).toBeDefined();
    expect(signUpResult.user.email).toBe(email);
    expect(signUpResult.user.id).toBeDefined();

    // Link instituteId on user record for tenant context
    await db.user.update({
      where: { id: signUpResult.user.id },
      data: { instituteId: inst.id },
    });

    // 2. Sign In
    const signInRes = await auth.api.signInEmail({
      body: {
        email,
        password,
      },
      asResponse: true,
    });

    expect(signInRes.status).toBe(200);
    const setCookieHeader = signInRes.headers.get('set-cookie');
    expect(setCookieHeader).toBeDefined();

    // 3. Retrieve Session
    const reqHeaders = new Headers();
    if (setCookieHeader) {
      reqHeaders.set('cookie', setCookieHeader);
    }

    const session = await getAuthenticatedSession(reqHeaders);
    expect(session).not.toBeNull();
    expect(session?.user.email).toBe(email);

    // 4. Verify Institute Membership Context
    const tenantCtx = await requireInstituteMembership(reqHeaders, inst.id);
    expect(tenantCtx.instituteId).toBe(inst.id);
    expect(tenantCtx.role).toBe('owner');
  });

  it('rejects unauthorized access when no valid session cookie is provided', async () => {
    const reqHeaders = new Headers();
    const session = await getAuthenticatedSession(reqHeaders);
    expect(session).toBeNull();

    await expect(requireInstituteMembership(reqHeaders, 'some-inst-id')).rejects.toThrow(
      /UNAUTHORIZED/,
    );
  });

  it('verifies rate limit options configuration safety', () => {
    expect(auth.options.rateLimit).toBeDefined();
    expect(auth.options.rateLimit?.window).toBe(60);
    expect(auth.options.rateLimit?.max).toBe(100);
    expect(auth.options.rateLimit?.customRules).toHaveProperty('/sign-in/email');
    expect(auth.options.rateLimit?.customRules).toHaveProperty('/sign-up/email');
  });
});
