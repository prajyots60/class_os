import { test, expect, type Page, type APIResponse } from '@playwright/test';

async function registerAndApplySession(
  page: Page,
  user: { email: string; password: string; name: string },
): Promise<APIResponse> {
  let attempts = 0;
  let res: APIResponse | undefined;
  while (attempts < 6) {
    res = await page.request.post('/api/auth/sign-up/email', { data: user });
    if (res.status() === 429) {
      attempts++;
      await new Promise((resolve) => setTimeout(resolve, 12000));
      continue;
    }
    break;
  }
  if (!res) {
    throw new Error('Registration failed: no response returned');
  }
  expect([200, 201]).toContain(res.status());
  const rawCookie = res.headers()['set-cookie'] ?? '';
  if (rawCookie) {
    const firstCookie = rawCookie.split(';')[0];
    const [name, value] = firstCookie.split('=');
    if (name && value) {
      await page.context().addCookies([
        { name, value, domain: 'localhost', path: '/', httpOnly: true, secure: false, sameSite: 'Lax' },
      ]);
    }
  }
  return res;
}

test.describe('Institute Onboarding UI & End-to-End Flow Suite', () => {
  test('1. Unauthenticated POST to /api/onboarding/institute returns 401 UNAUTHENTICATED', async ({ page }) => {
    const ts = Date.now();
    const response = await page.request.post('/api/onboarding/institute', {
      data: {
        name: 'Unauthenticated Academy',
        phone: `+919${ts.toString().slice(-9)}`,
        email: `unauth_${ts}@test.com`,
      },
    });

    expect(response.status()).toBe(401);

    const body = await response.json();
    expect(body.error).toBeDefined();
    expect(body.error.code).toBe('UNAUTHENTICATED');
    expect(body.error.requestId).toBeDefined();
  });

  test('2. Complete End-to-End Onboarding UI Flow: Sign Up -> Onboarding Form -> Dashboard Redirect', async ({ page }) => {
    const ts = Date.now();
    const testEmail = `ui_founder_${ts}@test.com`;
    const password = 'SecureTestPassword123!';
    const instituteName = `Vanguard Physics ${ts}`;
    const instituteEmail = `vanguard_${ts}@test.com`;
    const phone = `+919${ts.toString().slice(-9)}`;

    // 1. Authenticate user & sync session cookies to page context
    await registerAndApplySession(page, {
      email: testEmail,
      password,
      name: 'UI Founder Tester',
    });

    // 2. Navigate to /onboarding UI route
    await page.goto('/onboarding');

    // Verify Onboarding UI Header & Form elements render
    await expect(page.getByRole('heading', { name: /Setup Your Coaching Institute/i })).toBeVisible();
    await expect(page.getByLabel(/Institute Name \*/i)).toBeVisible();
    await expect(page.getByLabel(/Primary Phone \*/i)).toBeVisible();
    await expect(page.getByLabel(/Contact Email \*/i)).toBeVisible();

    const submitBtn = page.getByRole('button', { name: /Complete Onboarding/i });
    await expect(submitBtn).toBeVisible();

    // 3. Test client-side UX field validation on empty fields
    await page.getByLabel(/Institute Name \*/i).clear();
    await page.getByLabel(/Primary Phone \*/i).clear();
    await page.getByLabel(/Contact Email \*/i).clear();
    await submitBtn.click();
    await expect(page.getByText(/Institute name is required\./i)).toBeVisible();
    await expect(page.getByText(/Primary phone number is required\./i)).toBeVisible();
    await expect(page.getByText(/Contact email address is required\./i)).toBeVisible();

    // 4. Fill form with valid unique institute setup information
    await page.getByLabel(/Institute Name \*/i).fill(instituteName);
    await page.getByLabel(/Primary Phone \*/i).fill(phone);
    await page.getByLabel(/Contact Email \*/i).fill(instituteEmail);

    // Verify live slug preview
    await expect(page.getByText(new RegExp(`vanguard-physics-${ts}`, 'i'))).toBeVisible();

    // 5. Submit Onboarding Form
    await submitBtn.click();

    // 6. Verify successful redirect to /dashboard workspace
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
    await expect(page.locator('aside').getByText(instituteName)).toBeVisible();

    // 7. Verify subsequent onboarding attempt for already onboarded user redirects to /dashboard via tenant guard
    await page.goto('/onboarding');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
  });

  // ── Scenario A — New User → /dashboard → redirect to /onboarding → complete → /dashboard shows institute ──

  test('Scenario A: New user visiting /dashboard is redirected to /onboarding, completes onboarding, /dashboard shows institute name', async ({ page }) => {
    const ts = Date.now();
    const testEmail = `scenario_a_${ts}@test.com`;
    const password = 'SecureTestPassword123!';
    const instituteName = `Scenario Academy ${ts}`;
    const instituteEmail = `scenario_a_${ts}@inst.test`;
    const phone = `+919${ts.toString().slice(-9)}`;

    // 1. Sign up new user & apply session
    await registerAndApplySession(page, {
      email: testEmail,
      password,
      name: 'Scenario A User',
    });

    // 2. Navigate to /dashboard without having onboarded
    await page.goto('/dashboard');

    // 3. Server detects no active tenant — client redirects to /onboarding
    await page.waitForURL('**/onboarding', { timeout: 10000 });
    await expect(page.getByRole('heading', { name: /Setup Your Coaching Institute/i })).toBeVisible();

    // 4. Complete onboarding
    await page.getByLabel(/Institute Name \*/i).fill(instituteName);
    await page.getByLabel(/Primary Phone \*/i).fill(phone);
    await page.getByLabel(/Contact Email \*/i).fill(instituteEmail);
    await page.getByRole('button', { name: /Complete Onboarding/i }).click();

    // 5. Redirect to /dashboard
    await page.waitForURL('**/dashboard', { timeout: 15000 });

    // 6. Dashboard shows real institute name (server-resolved)
    await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
    await expect(page.locator('aside').getByText(instituteName)).toBeVisible();
    await expect(page.locator('aside').getByText('owner', { exact: false })).toBeVisible();
  });

  // ── Scenario B — Existing user visiting /onboarding is redirected to /dashboard ──

  test('Scenario B: Already-onboarded user visiting /onboarding is redirected to /dashboard', async ({ page }) => {
    const ts = Date.now();
    const testEmail = `scenario_b_${ts}@test.com`;
    const password = 'SecureTestPassword123!';
    const instituteName = `Existing Institute B ${ts}`;
    const instituteEmail = `scenariob_${ts}@inst.test`;
    const phone = `+919${ts.toString().slice(-9)}`;

    // 1. Sign up and onboard
    await registerAndApplySession(page, {
      email: testEmail,
      password,
      name: 'Scenario B User',
    });

    await page.goto('/onboarding');
    await expect(page.getByRole('heading', { name: /Setup Your Coaching Institute/i })).toBeVisible();

    await page.getByLabel(/Institute Name \*/i).fill(instituteName);
    await page.getByLabel(/Primary Phone \*/i).fill(phone);
    await page.getByLabel(/Contact Email \*/i).fill(instituteEmail);
    await page.getByRole('button', { name: /Complete Onboarding/i }).click();

    await page.waitForURL('**/dashboard', { timeout: 15000 });

    // 2. Now try to navigate back to /onboarding
    await page.goto('/onboarding');

    // 3. Should be redirected to /dashboard immediately (tenant guard fires)
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
  });

  // ── Scenario C — Browser refresh retains correct tenant resolution ──

  test('Scenario C: Browser refresh after onboarding retains correct TenantContext on /dashboard', async ({ page }) => {
    const ts = Date.now();
    const testEmail = `scenario_c_${ts}@test.com`;
    const password = 'SecureTestPassword123!';
    const instituteName = `Refresh Persistence Institute ${ts}`;
    const instituteEmail = `scenarioc_${ts}@refresh.test`;
    const phone = `+919${ts.toString().slice(-9)}`;

    // 1. Sign up and complete onboarding
    await registerAndApplySession(page, {
      email: testEmail,
      password,
      name: 'Scenario C User',
    });

    await page.goto('/onboarding');
    await expect(page.getByRole('heading', { name: /Setup Your Coaching Institute/i })).toBeVisible();

    await page.getByLabel(/Institute Name \*/i).fill(instituteName);
    await page.getByLabel(/Primary Phone \*/i).fill(phone);
    await page.getByLabel(/Contact Email \*/i).fill(instituteEmail);
    await page.getByRole('button', { name: /Complete Onboarding/i }).click();

    await page.waitForURL('**/dashboard', { timeout: 15000 });
    await expect(page.locator('aside').getByText(instituteName)).toBeVisible();

    // 2. Reload the page (simulates browser refresh)
    await page.reload();

    // 3. Dashboard still resolves the correct tenant — session cookie persists
    await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
    await expect(page.locator('aside').getByText(instituteName)).toBeVisible();
    await expect(page.locator('aside').getByText('owner', { exact: false })).toBeVisible();

    // Stays on /dashboard (not redirected to /onboarding)
    expect(page.url()).toContain('/dashboard');
  });

  // ── Scenario D — Tenant manipulation via query param is ignored ──

  test('Scenario D: Client-supplied instituteId in query param is ignored; server resolves from session', async ({ page }) => {
    const ts = Date.now();
    const testEmail = `scenario_d_${ts}@test.com`;
    const password = 'SecureTestPassword123!';
    const fakeInstituteId = '00000000-0000-4000-a000-000000000099';

    // 1. Sign up (no institute)
    const signUpResponse = await registerAndApplySession(page, {
      email: testEmail,
      password,
      name: 'Scenario D User',
    });
    const rawCookie = signUpResponse.headers()['set-cookie'] ?? '';
    const cookie = rawCookie.split(';')[0];

    // 2. Attempt to manipulate tenant context via query param
    const response = await page.request.get(
      `/api/dashboard/context?instituteId=${fakeInstituteId}`,
      { headers: { cookie } },
    );
    expect(response.status()).toBe(200);

    const body = await response.json();
    // User has no institute — server ignores the injected query param and returns hasTenant: false
    expect(body.hasTenant).toBe(false);
  });

  // ── Scenario E — Header tenant injection is ignored ──

  test('Scenario E: Custom x-institute-id and x-role headers in request are ignored', async ({ page }) => {
    const ts = Date.now();
    const testEmail = `scenario_e_${ts}@test.com`;
    const password = 'SecureTestPassword123!';
    const fakeInstituteId = '00000000-0000-4000-a000-000000000088';

    const signUpResponse = await registerAndApplySession(page, {
      email: testEmail,
      password,
      name: 'Scenario E User',
    });
    const rawCookie = signUpResponse.headers()['set-cookie'] ?? '';
    const cookie = rawCookie.split(';')[0];

    const response = await page.request.get('/api/dashboard/context', {
      headers: {
        cookie,
        'x-institute-id': fakeInstituteId,
        'x-role': 'superadmin',
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.hasTenant).toBe(false);
  });

  // ── Scenario F — Body identity injection is ignored ──

  test('Scenario F: Body identity injection (userId, role, status) during onboarding is overridden by server', async ({ page }) => {
    const ts = Date.now();
    const testEmail = `scenario_f_${ts}@test.com`;
    const password = 'SecureTestPassword123!';
    const fakeUserId = '00000000-0000-4000-a000-000000000077';

    const signUpResponse = await registerAndApplySession(page, {
      email: testEmail,
      password,
      name: 'Scenario F User',
    });
    const rawCookie = signUpResponse.headers()['set-cookie'] ?? '';
    const cookie = rawCookie.split(';')[0];

    const response = await page.request.post('/api/onboarding/institute', {
      headers: { cookie },
      data: {
        name: `Injection Guard Academy ${ts}`,
        phone: `+919${ts.toString().slice(-9)}`,
        email: `injection_guard_${ts}@test.com`,
        userId: fakeUserId,
        role: 'parent',
        status: 'suspended',
      },
    });

    expect(response.status()).toBe(201);
    const body = await response.json();

    // Server-resolved context reflects owner role, active status, and real user ID
    expect(body.data.tenantContext.userId).not.toBe(fakeUserId);
    expect(body.data.tenantContext.role).toBe('owner');
    expect(body.data.tenantContext.status).toBe('active');
  });

  // ── Scenario G — Replay onboarding attempt returns 409 Conflict ──

  test('Scenario G: Replaying onboarding API call returns 409 CONFLICT for onboarded session', async ({ page }) => {
    const ts = Date.now();
    const testEmail = `scenario_g_${ts}@test.com`;
    const password = 'SecureTestPassword123!';

    const signUpResponse = await registerAndApplySession(page, {
      email: testEmail,
      password,
      name: 'Scenario G User',
    });
    const rawCookie = signUpResponse.headers()['set-cookie'] ?? '';
    const cookie = rawCookie.split(';')[0];

    // First onboarding
    const res1 = await page.request.post('/api/onboarding/institute', {
      headers: { cookie },
      data: {
        name: `Replay Academy One ${ts}`,
        phone: `+919${ts.toString().slice(-9)}`,
        email: `replay1_${ts}@test.com`,
      },
    });
    expect(res1.status()).toBe(201);

    // Immediate replay attempt
    const res2 = await page.request.post('/api/onboarding/institute', {
      headers: { cookie },
      data: {
        name: `Replay Academy Two ${ts}`,
        phone: `+919${(ts + 1).toString().slice(-9)}`,
        email: `replay2_${ts}@test.com`,
      },
    });

    expect(res2.status()).toBe(409);
    const body2 = await res2.json();
    expect(body2.error.code).toBe('CONFLICT');
  });
});
