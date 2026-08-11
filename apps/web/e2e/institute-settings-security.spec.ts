import { test, expect, type APIRequestContext, type PlaywrightWorkerArgs } from '@playwright/test';

/**
 * Phase 1.5.4 — Institute Settings & White-Label Branding Security E2E & Acceptance Suite
 *
 * Authoritative security matrix covering:
 * - Authentication enforcement (API & Browser redirects)
 * - Authorization (RBAC capability checks for Owner vs non-Owner roles)
 * - Multi-tenant isolation & spoofing defense (query, header, body parameters)
 * - Immutable field protection (id, slug, status, role, tenantId)
 * - Validation & CSS/XSS injection defense (malicious primaryColor & logoUrl)
 * - Workspace branding persistence & scope isolation
 * - Safe error responses & HTTP method safety
 */

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

let ownerAFixture: SessionFixture;
let instituteAName: string;
let instituteASlug: string;

let ownerBFixture: SessionFixture;
let instituteBName: string;

async function registerUserWithRetry(
  ctx: APIRequestContext,
  user: { email: string; password: string; name: string },
) {
  let attempts = 0;
  while (attempts < 6) {
    const res = await ctx.post('/api/auth/sign-up/email', { data: user });
    if (res.status() === 429) {
      attempts++;
      await new Promise((resolve) => setTimeout(resolve, 10000));
      continue;
    }
    return res;
  }
  return ctx.post('/api/auth/sign-up/email', { data: user });
}

async function createTenantSession(
  playwright: PlaywrightWorkerArgs['playwright'],
  suffix: string,
) {
  const timestamp = Date.now();
  const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';
  const ctx = await playwright.request.newContext({ baseURL });

  const email = `sec_owner_${suffix}_${timestamp}@test.com`;
  const instName = `Security Inst ${suffix} ${timestamp}`;
  const instSlug = `sec-inst-${suffix}-${timestamp}`;

  const regRes = await registerUserWithRetry(ctx, {
    email,
    password: 'SecurePassword123!',
    name: `Owner ${suffix}`,
  });
  expect([200, 201]).toContain(regRes.status());

  const uniquePhone = `+9198${Math.floor(10000000 + Math.random() * 90000000)}`;
  const onboardRes = await ctx.post('/api/onboarding/institute', {
    data: {
      name: instName,
      phone: uniquePhone,
      email,
      slug: instSlug,
      timezone: 'Asia/Kolkata',
    },
  });
  if (![200, 201].includes(onboardRes.status())) {
    console.error('Onboarding failed:', await onboardRes.json());
  }
  expect([200, 201]).toContain(onboardRes.status());

  const state = await ctx.storageState();
  const cookies = state.cookies as SessionFixture['cookies'];
  await ctx.dispose();

  return { email, instName, instSlug, fixture: { cookies } };
}

test.beforeAll(async ({ playwright }) => {
  test.setTimeout(120000);
  const tenantA = await createTenantSession(playwright, 'tenant-a');
  instituteAName = tenantA.instName;
  instituteASlug = tenantA.instSlug;
  ownerAFixture = tenantA.fixture;

  await new Promise((resolve) => setTimeout(resolve, 10000));

  const tenantB = await createTenantSession(playwright, 'tenant-b');
  instituteBName = tenantB.instName;
  ownerBFixture = tenantB.fixture;
});

test.describe('Phase 1.5.4 Security E2E & Acceptance Gate Matrix', () => {

  // ── 1. Authentication Security ─────────────────────────────────────────────

  test('SET-E2E-01: Anonymous GET /api/institute/settings returns 401 UNAUTHENTICATED', async ({ request }) => {
    const res = await request.get('/api/institute/settings');
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('UNAUTHENTICATED');
  });

  test('SET-E2E-02: Anonymous PATCH /api/institute/settings returns 401 UNAUTHENTICATED', async ({ request }) => {
    const res = await request.patch('/api/institute/settings', {
      data: { name: 'Hacked Name' },
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('UNAUTHENTICATED');
  });

  test('SET-E2E-03: Anonymous browser visit to /settings redirects to sign-in page', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/settings');
    await expect(page).toHaveURL(/\/sign-in/);
  });

  // ── 2. Authorization (RBAC Capabilities) ──────────────────────────────────

  test('SET-E2E-04: Authenticated Owner can GET /api/institute/settings', async ({ playwright }) => {
    const ctx = await playwright.request.newContext({
      baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000',
      storageState: { cookies: ownerAFixture.cookies, origins: [] },
    });
    const res = await ctx.get('/api/institute/settings');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.name).toBe(instituteAName);
    await ctx.dispose();
  });

  test('SET-E2E-05: Authenticated Owner can PATCH /api/institute/settings', async ({ playwright }) => {
    const ctx = await playwright.request.newContext({
      baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000',
      storageState: { cookies: ownerAFixture.cookies, origins: [] },
    });
    const updatedName = `${instituteAName} Modified`;
    const res = await ctx.patch('/api/institute/settings', {
      data: { name: updatedName },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.name).toBe(updatedName);
    await ctx.dispose();
  });

  // ── 3. Multi-Tenant Isolation & Spoofing Defense ─────────────────────────

  test('SET-E2E-10 & SET-E2E-14: Tenant A update does not mutate Tenant B settings', async ({ playwright }) => {
    const ctxA = await playwright.request.newContext({
      baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000',
      storageState: { cookies: ownerAFixture.cookies, origins: [] },
    });
    const ctxB = await playwright.request.newContext({
      baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000',
      storageState: { cookies: ownerBFixture.cookies, origins: [] },
    });

    // Tenant A updates name
    const resA = await ctxA.patch('/api/institute/settings', {
      data: { name: 'Isolated Name Tenant A' },
    });
    expect(resA.status()).toBe(200);

    // Verify Tenant B remains completely unchanged
    const resB = await ctxB.get('/api/institute/settings');
    expect(resB.status()).toBe(200);
    const bodyB = await resB.json();
    expect(bodyB.data.name).toBe(instituteBName);
    expect(bodyB.data.name).not.toBe('Isolated Name Tenant A');

    await ctxA.dispose();
    await ctxB.dispose();
  });

  test('SET-E2E-11: Query parameter ?instituteId=<tenantB> is ignored during PATCH', async ({ playwright }) => {
    const ctxA = await playwright.request.newContext({
      baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000',
      storageState: { cookies: ownerAFixture.cookies, origins: [] },
    });
    const ctxB = await playwright.request.newContext({
      baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000',
      storageState: { cookies: ownerBFixture.cookies, origins: [] },
    });

    // Get Tenant B ID
    const bodyBBefore = await (await ctxB.get('/api/institute/settings')).json();
    const tenantBId = bodyBBefore.data.id;

    // Tenant A sends PATCH targeting ?instituteId=tenantBId
    const resA = await ctxA.patch(`/api/institute/settings?instituteId=${tenantBId}`, {
      data: { name: 'Spoofed Query Target' },
    });
    expect(resA.status()).toBe(200);

    // Tenant B must remain untouched
    const bodyBAfter = await (await ctxB.get('/api/institute/settings')).json();
    expect(bodyBAfter.data.name).toBe(instituteBName);

    await ctxA.dispose();
    await ctxB.dispose();
  });

  test('SET-E2E-12: Header spoofing (x-institute-id, x-role) is completely ignored', async ({ playwright }) => {
    const ctxA = await playwright.request.newContext({
      baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000',
      storageState: { cookies: ownerAFixture.cookies, origins: [] },
      extraHTTPHeaders: {
        'x-institute-id': 'spoofed_inst_id',
        'x-role': 'superadmin',
      },
    });
    const resA = await ctxA.get('/api/institute/settings');
    expect(resA.status()).toBe(200);
    const bodyA = await resA.json();
    expect(bodyA.data.slug).toBe(instituteASlug);
    await ctxA.dispose();
  });

  test('SET-E2E-13: Body parameter injection (instituteId, role, status) is rejected by validator', async ({ playwright }) => {
    const ctxA = await playwright.request.newContext({
      baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000',
      storageState: { cookies: ownerAFixture.cookies, origins: [] },
    });
    const res = await ctxA.patch('/api/institute/settings', {
      data: {
        name: 'Valid Name',
        instituteId: '00000000-0000-0000-0000-000000000000',
        role: 'owner',
        status: 'archived',
      },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
    await ctxA.dispose();
  });

  // ── 4. CSS / XSS Injection & Validation Defense ──────────────────────────

  test('SET-E2E-15: Malicious primaryColor payloads are rejected server-side', async ({ playwright }) => {
    const ctxA = await playwright.request.newContext({
      baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000',
      storageState: { cookies: ownerAFixture.cookies, origins: [] },
    });

    const maliciousColors = [
      'red',
      'rgb(255,0,0)',
      'hsl(0,100%,50%)',
      'var(--evil-var)',
      'url("https://evil.com/bg.png")',
      '<style>body{background:red}</style>',
      'javascript:alert(1)',
      '#GGGGGG',
      '#12345',
    ];

    for (const color of maliciousColors) {
      const res = await ctxA.patch('/api/institute/settings', {
        data: { primaryColor: color },
      });
      expect(res.status()).toBe(400);
    }
    await ctxA.dispose();
  });

  test('SET-E2E-16: Malicious logoUrl payloads are rejected server-side', async ({ playwright }) => {
    const ctxA = await playwright.request.newContext({
      baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000',
      storageState: { cookies: ownerAFixture.cookies, origins: [] },
    });

    const maliciousUrls = [
      'http://insecure-domain.com/logo.png',
      'javascript:alert("xss")',
      'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
      'file:///etc/passwd',
      '//evil.example.com/logo.png',
    ];

    for (const url of maliciousUrls) {
      const res = await ctxA.patch('/api/institute/settings', {
        data: { logoUrl: url },
      });
      expect(res.status()).toBe(400);
    }
    await ctxA.dispose();
  });

  // ── 5. Workspace Branding & Persistence ───────────────────────────────────

  test('SET-E2E-17 & SET-E2E-18: Valid branding updates dynamically apply CSS --primary variable in UI and survive reloads', async ({ page, context }) => {
    await context.clearCookies();
    await context.addCookies(ownerAFixture.cookies);

    await page.goto('/settings');
    const validColor = '#3B82F6';
    const validLogo = 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d';

    await page.locator('input[name="primaryColor"]').fill(validColor);
    await page.locator('input[name="logoUrl"]').fill(validLogo);
    await page.getByRole('button', { name: 'Save Changes' }).click();

    await expect(page.getByText('Settings saved successfully.')).toBeVisible();

    // Verify root layout container receives injected --primary CSS variable
    const appShellRoot = page.locator('#workspace-app-shell');
    await expect(appShellRoot).toHaveAttribute('style', /--primary:\s*217 91% 60%/);

    // Reload page and verify persistent style injection
    await page.reload();
    await expect(appShellRoot).toHaveAttribute('style', /--primary:\s*217 91% 60%/);
  });

  test('SET-E2E-19: Branding style remains intact across internal route navigation', async ({ page, context }) => {
    await context.clearCookies();
    await context.addCookies(ownerAFixture.cookies);

    await page.goto('/settings');
    const appShellRoot = page.locator('#workspace-app-shell');
    await expect(appShellRoot).toHaveAttribute('style', /--primary:\s*/);

    // Navigate to dashboard
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(appShellRoot).toHaveAttribute('style', /--primary:\s*/);
  });

  // ── 6. Error Handling & HTTP Method Security ──────────────────────────────

  test('SET-E2E-23: Malformed JSON body returns 400 VALIDATION_ERROR', async ({ playwright }) => {
    const ctxA = await playwright.request.newContext({
      baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000',
      storageState: { cookies: ownerAFixture.cookies, origins: [] },
    });
    const res = await ctxA.patch('/api/institute/settings', {
      headers: { 'Content-Type': 'application/json' },
      data: '{ invalid json payload ...',
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
    await ctxA.dispose();
  });

  test('SET-E2E-25: Unsupported HTTP methods (POST, PUT, DELETE) return 405 Method Not Allowed', async ({ request }) => {
    const resPost = await request.post('/api/institute/settings', { data: {} });
    expect(resPost.status()).toBe(405);
    expect(resPost.headers()['allow']).toBe('GET, PATCH');

    const resPut = await request.put('/api/institute/settings', { data: {} });
    expect(resPut.status()).toBe(405);

    const resDelete = await request.delete('/api/institute/settings');
    expect(resDelete.status()).toBe(405);
  });
});
