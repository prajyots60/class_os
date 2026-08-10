import { test, expect } from '@playwright/test';

test.describe('Institute Onboarding UI & End-to-End Flow Suite', () => {
  test('1. Unauthenticated POST to /api/onboarding/institute returns 401 UNAUTHENTICATED', async ({ page }) => {
    const response = await page.request.post('/api/onboarding/institute', {
      data: {
        name: 'Unauthenticated Academy',
        phone: '+919876543210',
        email: 'unauth@test.com',
      },
    });

    expect(response.status()).toBe(401);

    const body = await response.json();
    expect(body.error).toBeDefined();
    expect(body.error.code).toBe('UNAUTHENTICATED');
    expect(body.error.requestId).toBeDefined();
  });

  test('2. Complete End-to-End Onboarding UI Flow: Sign Up -> Onboarding Form -> Dashboard Redirect', async ({ page }) => {
    const testEmail = `ui_founder_${Date.now()}@test.com`;
    const password = 'SecureTestPassword123!';

    // 1. Authenticate user via Better Auth Sign-Up API
    const signUpResponse = await page.request.post('/api/auth/sign-up/email', {
      data: {
        email: testEmail,
        password,
        name: 'UI Founder Tester',
      },
    });
    expect(signUpResponse.status()).toBe(200);

    // 2. Navigate to /onboarding UI route
    await page.goto('/onboarding');

    // Verify Onboarding UI Header & Form elements render
    await expect(page.getByRole('heading', { name: /Setup Your Coaching Institute/i })).toBeVisible();
    await expect(page.getByLabel(/Institute Name \*/i)).toBeVisible();
    await expect(page.getByLabel(/Primary Phone \*/i)).toBeVisible();
    await expect(page.getByLabel(/Contact Email \*/i)).toBeVisible();

    const submitBtn = page.getByRole('button', { name: /Complete Onboarding/i });
    await expect(submitBtn).toBeVisible();

    // 3. Test client-side UX field validation
    await submitBtn.click();
    await expect(page.getByText(/Institute name is required\./i)).toBeVisible();
    await expect(page.getByText(/Primary phone number is required\./i)).toBeVisible();
    await expect(page.getByText(/Contact email address is required\./i)).toBeVisible();

    // 4. Fill form with valid institute setup information
    await page.getByLabel(/Institute Name \*/i).fill('Vanguard Physics Classes');
    await page.getByLabel(/Primary Phone \*/i).fill('+919876543210');
    await page.getByLabel(/Contact Email \*/i).fill('contact@vanguardphysics.test');

    // Verify live slug preview
    await expect(page.getByText(/vanguard-physics-classes/i)).toBeVisible();

    // 5. Submit Onboarding Form
    await submitBtn.click();

    // 6. Verify successful redirect to /dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await expect(page.getByRole('heading', { name: /CoachingOS Dashboard/i })).toBeVisible();
    await expect(page.getByText(/Institute Onboarding Completed/i)).toBeVisible();

    // 7. Verify subsequent onboarding attempt for already onboarded user redirects to /dashboard via tenant guard
    await page.goto('/onboarding');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await expect(page.getByRole('heading', { name: /CoachingOS Dashboard/i })).toBeVisible();
  });

  // ── Scenario A — New User → /dashboard → redirect to /onboarding → complete → /dashboard shows institute ──

  test('Scenario A: New user visiting /dashboard is redirected to /onboarding, completes onboarding, /dashboard shows institute name', async ({ page }) => {
    const testEmail = `scenario_a_${Date.now()}@test.com`;
    const password = 'SecureTestPassword123!';

    // 1. Sign up new user
    const signUpResponse = await page.request.post('/api/auth/sign-up/email', {
      data: { email: testEmail, password, name: 'Scenario A User' },
    });
    expect(signUpResponse.status()).toBe(200);

    // 2. Navigate to /dashboard without having onboarded
    await page.goto('/dashboard');

    // 3. Server detects no active tenant — client redirects to /onboarding
    await page.waitForURL('**/onboarding', { timeout: 10000 });
    await expect(page.getByRole('heading', { name: /Setup Your Coaching Institute/i })).toBeVisible();

    // 4. Complete onboarding
    await page.getByLabel(/Institute Name \*/i).fill('Scenario Academy');
    await page.getByLabel(/Primary Phone \*/i).fill('+919111111111');
    await page.getByLabel(/Contact Email \*/i).fill('scenario@academy.test');
    await page.getByRole('button', { name: /Complete Onboarding/i }).click();

    // 5. Redirect to /dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // 6. Dashboard shows real institute name (server-resolved)
    await expect(page.getByRole('heading', { name: /CoachingOS Dashboard/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Scenario Academy' })).toBeVisible();
    await expect(page.getByText('owner', { exact: true })).toBeVisible();
  });

  // ── Scenario B — Existing user visiting /onboarding is redirected to /dashboard ──

  test('Scenario B: Already-onboarded user visiting /onboarding is redirected to /dashboard', async ({ page }) => {
    const testEmail = `scenario_b_${Date.now()}@test.com`;
    const password = 'SecureTestPassword123!';

    // 1. Sign up and onboard
    await page.request.post('/api/auth/sign-up/email', {
      data: { email: testEmail, password, name: 'Scenario B User' },
    });

    await page.goto('/onboarding');
    await expect(page.getByRole('heading', { name: /Setup Your Coaching Institute/i })).toBeVisible();

    await page.getByLabel(/Institute Name \*/i).fill('Existing Institute B');
    await page.getByLabel(/Primary Phone \*/i).fill('+919222222222');
    await page.getByLabel(/Contact Email \*/i).fill('scenariob@inst.test');
    await page.getByRole('button', { name: /Complete Onboarding/i }).click();

    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // 2. Now try to navigate back to /onboarding
    await page.goto('/onboarding');

    // 3. Should be redirected to /dashboard immediately (tenant guard fires)
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await expect(page.getByRole('heading', { name: /CoachingOS Dashboard/i })).toBeVisible();
  });

  // ── Scenario C — Browser refresh retains correct tenant resolution ──

  test('Scenario C: Browser refresh after onboarding retains correct TenantContext on /dashboard', async ({ page }) => {
    const testEmail = `scenario_c_${Date.now()}@test.com`;
    const password = 'SecureTestPassword123!';

    // 1. Sign up and complete onboarding
    await page.request.post('/api/auth/sign-up/email', {
      data: { email: testEmail, password, name: 'Scenario C User' },
    });

    await page.goto('/onboarding');
    await expect(page.getByRole('heading', { name: /Setup Your Coaching Institute/i })).toBeVisible();

    await page.getByLabel(/Institute Name \*/i).fill('Refresh Persistence Institute');
    await page.getByLabel(/Primary Phone \*/i).fill('+919333333333');
    await page.getByLabel(/Contact Email \*/i).fill('scenarioc@refresh.test');
    await page.getByRole('button', { name: /Complete Onboarding/i }).click();

    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Refresh Persistence Institute' })).toBeVisible();

    // 2. Reload the page (simulates browser refresh)
    await page.reload();

    // 3. Dashboard still resolves the correct tenant — session cookie persists
    await expect(page.getByRole('heading', { name: /CoachingOS Dashboard/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Refresh Persistence Institute' })).toBeVisible();
    await expect(page.getByText('owner', { exact: true })).toBeVisible();

    // Stays on /dashboard (not redirected to /onboarding)
    expect(page.url()).toContain('/dashboard');
  });

  // ── Scenario D — Tenant manipulation via query param is ignored ──

  test('Scenario D: Client-supplied instituteId in query param is ignored; server resolves from session', async ({ page }) => {
    const testEmail = `scenario_d_${Date.now()}@test.com`;
    const password = 'SecureTestPassword123!';
    const fakeInstituteId = '00000000-0000-4000-a000-000000000099';

    // 1. Sign up (no institute)
    const signUpResponse = await page.request.post('/api/auth/sign-up/email', {
      data: { email: testEmail, password, name: 'Scenario D User' },
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
    const testEmail = `scenario_e_${Date.now()}@test.com`;
    const password = 'SecureTestPassword123!';
    const fakeInstituteId = '00000000-0000-4000-a000-000000000088';

    const signUpResponse = await page.request.post('/api/auth/sign-up/email', {
      data: { email: testEmail, password, name: 'Scenario E User' },
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
    const testEmail = `scenario_f_${Date.now()}@test.com`;
    const password = 'SecureTestPassword123!';
    const fakeUserId = '00000000-0000-4000-a000-000000000077';

    const signUpResponse = await page.request.post('/api/auth/sign-up/email', {
      data: { email: testEmail, password, name: 'Scenario F User' },
    });
    const rawCookie = signUpResponse.headers()['set-cookie'] ?? '';
    const cookie = rawCookie.split(';')[0];

    const response = await page.request.post('/api/onboarding/institute', {
      headers: { cookie },
      data: {
        name: 'Injection Guard Academy',
        phone: '+919876543210',
        email: 'injection_guard@test.com',
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
    const testEmail = `scenario_g_${Date.now()}@test.com`;
    const password = 'SecureTestPassword123!';

    const signUpResponse = await page.request.post('/api/auth/sign-up/email', {
      data: { email: testEmail, password, name: 'Scenario G User' },
    });
    const rawCookie = signUpResponse.headers()['set-cookie'] ?? '';
    const cookie = rawCookie.split(';')[0];

    // First onboarding
    const res1 = await page.request.post('/api/onboarding/institute', {
      headers: { cookie },
      data: {
        name: 'Replay Academy One',
        phone: '+919876543210',
        email: 'replay1@test.com',
      },
    });
    expect(res1.status()).toBe(201);

    // Immediate replay attempt
    const res2 = await page.request.post('/api/onboarding/institute', {
      headers: { cookie },
      data: {
        name: 'Replay Academy Two',
        phone: '+919876543211',
        email: 'replay2@test.com',
      },
    });

    expect(res2.status()).toBe(409);
    const body2 = await res2.json();
    expect(body2.error.code).toBe('CONFLICT');
  });
});



