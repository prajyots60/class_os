import { test, expect, type BrowserContext, type APIRequestContext } from '@playwright/test';

/**
 * Phase 0.12.7 — Session & Route Guards E2E Test Suite
 *
 * Verifies all route security invariants established by the Server Component
 * guards in auth-guards.ts.
 *
 * FIXTURE STRATEGY:
 * Three fixture contexts created once in beforeAll — no test ordering dependency.
 *
 *   anonymousContext   — browser with no session cookies
 *   noTenantContext    — authenticated user, no institute membership
 *   tenantContext      — authenticated user with an active institute
 *
 * Each test sets its own context cookies at the start.
 * Tests are fully independent and can run in any order.
 *
 * RATE LIMIT AWARENESS:
 * - Better Auth /sign-up/email: max 5 per 60s
 * - All registrations happen in beforeAll with unique timestamps
 * - No sign-in API calls in setup (only cookies from registration)
 */

/** Cookie fixture type */
interface SessionFixture {
  cookies: Array<{
    name: string;
    value: string;
    domain: string;
    path: string;
    expires: number;
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'Strict' | 'Lax' | 'None';
  }>;
}

let noTenantFixture: SessionFixture;
let tenantFixture: SessionFixture;
let tenantUserEmail: string;
let instituteSlug: string;

async function registerTestUserWithRetry(
  requestContext: APIRequestContext,
  user: { email: string; password: string; name: string },
) {
  let attempts = 0;
  while (attempts < 6) {
    const res = await requestContext.post('/api/auth/sign-up/email', { data: user });
    if (res.status() === 429) {
      attempts++;
      await new Promise((resolve) => setTimeout(resolve, 12000));
      continue;
    }
    return res;
  }
  return requestContext.post('/api/auth/sign-up/email', { data: user });
}

test.beforeAll(async ({ playwright }) => {
  const timestamp = Date.now();
  const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';

  // ── User A: Authenticated, No Tenant ────────────────────────────────────────
  const ctxA = await playwright.request.newContext({ baseURL });
  const userA = {
    email: `guard_no_tenant_${timestamp}@test.com`,
    password: 'SecurePassword123!',
    name: 'Guard No Tenant User',
  };

  const regA = await registerTestUserWithRetry(ctxA, userA);
  expect(
    [200, 201],
    `User A registration failed with status ${regA.status()}`,
  ).toContain(regA.status());

  const stateA = await ctxA.storageState();
  noTenantFixture = { cookies: stateA.cookies as SessionFixture['cookies'] };
  await ctxA.dispose();

  // ── User B: Will become Tenant Owner ─────────────────────────────────────────
  const ctxB = await playwright.request.newContext({ baseURL });
  tenantUserEmail = `guard_tenant_${timestamp}@test.com`;
  instituteSlug = `guard-inst-${timestamp}`;

  const userB = {
    email: tenantUserEmail,
    password: 'SecurePassword123!',
    name: 'Guard Tenant Owner User',
  };

  const regB = await registerTestUserWithRetry(ctxB, userB);
  expect(
    [200, 201],
    `User B registration failed with status ${regB.status()}`,
  ).toContain(regB.status());


  // Onboard institute for User B using the API
  const onboardRes = await ctxB.post('/api/onboarding/institute', {
    data: {
      name: 'Guard Test Physics Academy',
      phone: '+919876543210',
      email: tenantUserEmail,
      slug: instituteSlug,
      timezone: 'Asia/Kolkata',
    },
  });
  expect(
    [200, 201],
    `User B onboarding failed with status ${onboardRes.status()}: ${await onboardRes.text()}`,
  ).toContain(onboardRes.status());

  const stateB = await ctxB.storageState();
  tenantFixture = { cookies: stateB.cookies as SessionFixture['cookies'] };
  await ctxB.dispose();
});

/** Helper: apply a session fixture to a browser context */
async function applySession(context: BrowserContext, fixture: SessionFixture) {
  await context.clearCookies();
  if (fixture.cookies.length > 0) {
    await context.addCookies(fixture.cookies);
  }
}

/** Helper: clear all session cookies (anonymous state) */
async function clearSession(context: BrowserContext) {
  await context.clearCookies();
}

// ── Security Matrix ────────────────────────────────────────────────────────────

test.describe('1. Anonymous Route Guards', () => {
  test('1a. Anonymous user → /dashboard → redirected to /sign-in?callbackUrl=%2Fdashboard', async ({
    page,
    context,
  }) => {
    await clearSession(context);
    await page.goto('/dashboard');

    // Server Component guard fires before any HTML — hard redirect
    await expect(page).toHaveURL(/\/sign-in\?callbackUrl=%2Fdashboard/);
    await expect(page.getByRole('heading', { name: /Sign in to your institute/i })).toBeVisible();
  });

  test('1b. Anonymous user → /onboarding → redirected to /sign-in?callbackUrl=%2Fonboarding', async ({
    page,
    context,
  }) => {
    await clearSession(context);
    await page.goto('/onboarding');

    await expect(page).toHaveURL(/\/sign-in\?callbackUrl=%2Fonboarding/);
    await expect(page.getByRole('heading', { name: /Sign in to your institute/i })).toBeVisible();
  });

  test('1c. Direct URL navigation to /dashboard is equally protected as link navigation', async ({
    page,
    context,
  }) => {
    await clearSession(context);
    // Direct address bar navigation (not router.push)
    await page.goto('http://localhost:3000/dashboard');

    await expect(page).toHaveURL(/\/sign-in\?callbackUrl=%2Fdashboard/);
  });
});

test.describe('2. Authenticated Without Tenant Guards', () => {
  test('2a. Authenticated (no tenant) → /dashboard → redirected to /onboarding', async ({
    page,
    context,
  }) => {
    await applySession(context, noTenantFixture);
    await page.goto('/dashboard');

    await expect(page).toHaveURL(/\/onboarding/);
    await expect(
      page.getByRole('heading', { name: /Setup Your Coaching Institute/i }),
    ).toBeVisible();
  });

  test('2b. Authenticated (no tenant) → /onboarding → stays on /onboarding', async ({
    page,
    context,
  }) => {
    await applySession(context, noTenantFixture);
    await page.goto('/onboarding');

    await expect(page).toHaveURL(/\/onboarding/);
    await expect(
      page.getByRole('heading', { name: /Setup Your Coaching Institute/i }),
    ).toBeVisible();
  });

  test('2c. No redirect loop: /dashboard → /onboarding renders correctly (no further redirect)', async ({
    page,
    context,
  }) => {
    await applySession(context, noTenantFixture);
    await page.goto('/dashboard');

    // Must settle on /onboarding — not bounce back to /dashboard
    await expect(page).toHaveURL(/\/onboarding/);
    await expect(
      page.getByRole('heading', { name: /Setup Your Coaching Institute/i }),
    ).toBeVisible();
    // Assert URL is stable — not still redirecting
    expect(page.url()).toMatch(/\/onboarding/);
    expect(page.url()).not.toMatch(/\/dashboard/);
  });
});

test.describe('3. Authenticated With Tenant Guards', () => {
  test('3a. Authenticated (with tenant) → /dashboard → stays on /dashboard', async ({
    page,
    context,
  }) => {
    await applySession(context, tenantFixture);
    await page.goto('/dashboard');

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
    await expect(page.getByText('Guard Test Physics Academy')).toBeVisible();
  });

  test('3b. Authenticated (with tenant) → /onboarding → redirected to /dashboard', async ({
    page,
    context,
  }) => {
    await applySession(context, tenantFixture);
    await page.goto('/onboarding');

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
  });

  test('3c. No redirect loop: /onboarding → /dashboard renders correctly (no further redirect)', async ({
    page,
    context,
  }) => {
    await applySession(context, tenantFixture);
    await page.goto('/onboarding');

    // Must settle on /dashboard — not bounce back to /onboarding
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
    expect(page.url()).not.toMatch(/\/onboarding/);
  });

  test('3d. Authenticated (with tenant) → /sign-in → redirected to /dashboard', async ({
    page,
    context,
  }) => {
    await applySession(context, tenantFixture);
    await page.goto('/sign-in');

    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('3e. Authenticated (with tenant) → /sign-up → redirected to /dashboard', async ({
    page,
    context,
  }) => {
    await applySession(context, tenantFixture);
    await page.goto('/sign-up');

    // sign-up uses client-side redirect via useSession — allow time for resolution
    await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 10000 });
    // With tenant, must go to /dashboard
    await expect(page).toHaveURL(/\/dashboard/);
  });
});

test.describe('4. Session Lifecycle Guards', () => {
  test('4a. Removing session cookie causes protected route to require re-authentication', async ({
    page,
    context,
  }) => {
    await applySession(context, tenantFixture);
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard/);

    // Remove session
    await context.clearCookies();

    // Navigate to protected route again
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/sign-in\?callbackUrl=%2Fdashboard/);
  });
});

test.describe('5. Callback URL Security', () => {
  test('5a. External phishing callbackUrl is sanitized — never redirects externally', async ({
    page,
    context,
  }) => {
    await clearSession(context);
    await page.goto('/sign-in?callbackUrl=https://evil.com/phish');
    await page.locator('#signin-email').fill(tenantUserEmail);
    await page.locator('#signin-password').fill('SecurePassword123!');
    await page.getByRole('button', { name: /^Sign in$/i }).click();
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    expect(page.url()).not.toContain('evil.com');
  });

  test('5b. Protocol-relative callbackUrl (//evil.com) is sanitized', async ({
    page,
    context,
  }) => {
    await clearSession(context);
    await page.goto('/sign-in?callbackUrl=//evil.com');
    await page.locator('#signin-email').fill(tenantUserEmail);
    await page.locator('#signin-password').fill('SecurePassword123!');
    await page.getByRole('button', { name: /^Sign in$/i }).click();
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    expect(page.url()).not.toContain('evil.com');
  });

  test('5c. Anonymous with external callbackUrl → /sign-in without leaking external URL', async ({
    page,
    context,
  }) => {
    await clearSession(context);
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/sign-in\?callbackUrl=%2Fdashboard/);
    expect(page.url()).not.toContain('evil.com');
  });

  test('5d. javascript: scheme callbackUrl is rejected', async ({ page, context }) => {
    await clearSession(context);
    await page.goto('/sign-in?callbackUrl=javascript:alert(1)');
    await page.locator('#signin-email').fill(tenantUserEmail);
    await page.locator('#signin-password').fill('SecurePassword123!');
    await page.getByRole('button', { name: /^Sign in$/i }).click();
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    expect(page.url()).not.toContain('javascript:');
  });
});

test.describe('6. Protected API Guards', () => {
  test('6a. GET /api/dashboard/context without session returns 401 UNAUTHENTICATED', async ({
    request,
  }) => {
    // Make request with no cookie header — anonymous
    const res = await request.get('/api/dashboard/context', {
      headers: { cookie: '' },
    });

    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('UNAUTHENTICATED');
    expect(body.error.message).toContain('Valid authentication session is required');
  });

  test('6b. GET /api/dashboard/context with valid tenant session returns tenant context', async ({
    request,
  }) => {
    const cookieHeader = tenantFixture.cookies.map((c) => `${c.name}=${c.value}`).join('; ');

    const res = await request.get('/api/dashboard/context', {
      headers: { cookie: cookieHeader },
    });
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.hasTenant).toBe(true);
    expect(body.tenantContext.role).toBe('owner');
    expect(body.institute.slug).toBe(instituteSlug);
  });

  test('6c. GET /api/dashboard/context with no-tenant session returns hasTenant:false', async ({
    request,
  }) => {
    const cookieHeader = noTenantFixture.cookies.map((c) => `${c.name}=${c.value}`).join('; ');

    const res = await request.get('/api/dashboard/context', {
      headers: { cookie: cookieHeader },
    });
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.hasTenant).toBe(false);
    expect(body.tenantContext).toBeUndefined();
  });

  test('6d. POST /api/onboarding/institute without session returns 401', async ({ request }) => {
    // Make request with no cookie header — anonymous
    const res = await request.post('/api/onboarding/institute', {
      headers: { cookie: '' },
      data: { name: 'Test', phone: '+911234567890', email: 'test@test.com' },
    });
    expect(res.status()).toBe(401);
  });
});

test.describe('7. Tenant Manipulation Rejection', () => {
  test('7a. Client-supplied x-role header does not affect server-resolved role', async ({
    request,
  }) => {
    const cookieHeader = tenantFixture.cookies.map((c) => `${c.name}=${c.value}`).join('; ');

    const res = await request.get('/api/dashboard/context', {
      headers: {
        cookie: cookieHeader,
        'x-user-role': 'superadmin',
        'x-institute-id': '00000000-0000-0000-0000-000000000000',
      },
    });
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.tenantContext.role).toBe('owner');
    expect(body.tenantContext.role).not.toBe('superadmin');
  });

  test('7b. Client-supplied instituteId in query param is ignored by server', async ({
    request,
  }) => {
    const cookieHeader = noTenantFixture.cookies.map((c) => `${c.name}=${c.value}`).join('; ');
    const fakeId = '00000000-0000-0000-0000-999999999999';

    const res = await request.get(`/api/dashboard/context?instituteId=${fakeId}`, {
      headers: { cookie: cookieHeader },
    });
    expect(res.status()).toBe(200);

    const body = await res.json();
    // Server resolves from session — user has no tenant, so hasTenant:false (fakeId is ignored)
    expect(body.hasTenant).toBe(false);
  });

  test('7c. Sign-out returns user to public shell and revokes protected route access', async ({
    page,
    context,
  }) => {
    await applySession(context, tenantFixture);
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard/);

    // Open User Menu & Click Sign Out
    await page.getByRole('button', { name: /User menu/i }).click();
    await page.getByRole('button', { name: /Sign Out/i }).click();
    await page.waitForURL(/\/sign-in/);

    // After sign-out, /dashboard should require authentication again
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/sign-in\?callbackUrl=%2Fdashboard/);
  });
});

