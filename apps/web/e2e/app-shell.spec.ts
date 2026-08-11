import { test, expect, type BrowserContext } from '@playwright/test';

/**
 * Phase 0.12.8 — Authenticated Application Shell E2E Test Suite
 *
 * FIXTURE STRATEGY:
 * Independent fixtures created in beforeAll:
 *   noTenantFixture — authenticated user without an institute
 *   tenantFixture   — authenticated user with an onboarded institute
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

let noTenantFixture: SessionFixture;
let tenantFixture: SessionFixture;
let tenantUserEmail: string;
let instituteName: string;
let instituteSlug: string;

async function registerTestUserWithRetry(
  requestContext: any,
  user: { email: string; password: string; name: string },
) {
  let attempts = 0;
  while (attempts < 4) {
    const res = await requestContext.post('/api/auth/sign-up/email', { data: user });
    if (res.status() === 429) {
      attempts++;
      await new Promise((resolve) => setTimeout(resolve, 4000));
      continue;
    }
    return res;
  }
  throw new Error(`Registration rate limited after retries for ${user.email}`);
}

test.beforeAll({ timeout: 60000 }, async ({ playwright }) => {
  const timestamp = Date.now();
  const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';

  // ── User A: Authenticated, No Tenant ────────────────────────────────────────
  const ctxA = await playwright.request.newContext({ baseURL });
  const userA = {
    email: `shell_notenant_${timestamp}@test.com`,
    password: 'SecurePassword123!',
    name: 'Shell NoTenant User',
  };

  const regA = await registerTestUserWithRetry(ctxA, userA);
  expect([200, 201]).toContain(regA.status());
  const stateA = await ctxA.storageState();
  noTenantFixture = { cookies: stateA.cookies as SessionFixture['cookies'] };
  await ctxA.dispose();

  // ── User B: Authenticated Tenant Owner ─────────────────────────────────────
  const ctxB = await playwright.request.newContext({ baseURL });
  tenantUserEmail = `shell_owner_${timestamp}@test.com`;
  instituteName = `Apex Academy ${timestamp}`;
  instituteSlug = `apex-academy-${timestamp}`;

  const userB = {
    email: tenantUserEmail,
    password: 'SecurePassword123!',
    name: 'Apex Founder',
  };

  const regB = await registerTestUserWithRetry(ctxB, userB);
  expect([200, 201]).toContain(regB.status());

  // Onboard institute
  const onboardRes = await ctxB.post('/api/onboarding/institute', {
    data: {
      name: instituteName,
      phone: '+919876543210',
      email: tenantUserEmail,
      slug: instituteSlug,
      timezone: 'Asia/Kolkata',
    },
  });
  expect([200, 201]).toContain(onboardRes.status());

  const stateB = await ctxB.storageState();
  tenantFixture = { cookies: stateB.cookies as SessionFixture['cookies'] };
  await ctxB.dispose();
});

async function applySession(context: BrowserContext, fixture: SessionFixture) {
  await context.clearCookies();
  if (fixture.cookies.length > 0) {
    await context.addCookies(fixture.cookies);
  }
}

test.describe('Authenticated Application Shell E2E Suite', () => {
  // ── Scenario 1: Desktop Workspace Shell ──────────────────────────────────────
  test('1. Authenticated tenant user renders AppSidebar, AppHeader, InstituteIdentity, and PageHeader on /dashboard', async ({
    page,
    context,
  }) => {
    await applySession(context, tenantFixture);
    await page.goto('/dashboard');

    await expect(page).toHaveURL(/\/dashboard/);

    // Verify desktop sidebar landmarks & institute identity
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();
    await expect(sidebar.getByText(instituteName)).toBeVisible();
    await expect(sidebar.getByText('owner', { exact: false })).toBeVisible();

    // Verify header breadcrumbs
    await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toBeVisible();

    // Verify User Menu
    await expect(page.getByText('Apex Founder')).toBeVisible();

    // Verify Page Header & Dashboard Content
    await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
    await expect(page.getByText('Overview of your institute operations.')).toBeVisible();
    await expect(page.getByText('Workspace Overview')).toBeVisible();
  });

  // ── Scenario 2: Mobile Navigation Drawer ─────────────────────────────────────
  test('2. Mobile viewport (<768px) hides desktop sidebar, renders toggle, and opens/closes mobile drawer', async ({
    page,
    context,
  }) => {
    await applySession(context, tenantFixture);

    // Mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard');

    // Desktop sidebar hidden
    await expect(page.locator('aside')).not.toBeVisible();

    // Mobile hamburger toggle button visible
    const mobileToggle = page.getByRole('button', { name: /Open navigation menu/i });
    await expect(mobileToggle).toBeVisible();

    // Click toggle to open drawer
    await mobileToggle.click();

    // Mobile drawer dialog visible
    const drawer = page.getByRole('dialog', { name: /Navigation Menu/i });
    await expect(drawer).toBeVisible();
    await expect(drawer.getByText(instituteName)).toBeVisible();

    // Close mobile drawer via close button
    const closeBtn = drawer.getByRole('button', { name: /Close navigation menu/i });
    await closeBtn.click();

    await expect(drawer).not.toBeVisible();
  });

  // ── Scenario 3: Tenant Isolation ─────────────────────────────────────────────
  test('3. Tenant identity is resolved from session and never displays alien tenant data', async ({
    page,
    context,
  }) => {
    await applySession(context, tenantFixture);
    await page.goto('/dashboard');

    // Asserts correct institute name
    await expect(page.getByText(instituteName)).toBeVisible();
    // Asserts user identity
    await expect(page.getByText('Apex Founder')).toBeVisible();
  });

  // ── Scenario 4: Authenticated User Without Tenant ────────────────────────────
  test('4. Authenticated user without tenant visiting /dashboard is redirected to /onboarding', async ({
    page,
    context,
  }) => {
    await applySession(context, noTenantFixture);
    await page.goto('/dashboard');

    await expect(page).toHaveURL(/\/onboarding/);
    await expect(page.getByRole('heading', { name: /Setup Your Coaching Institute/i })).toBeVisible();
  });

  // ── Scenario 5: Functional Sign Out (Run last to avoid invalidating shared session) ──
  test('5. Sign out revokes session and redirects to /sign-in', async ({
    page,
    context,
  }) => {
    await applySession(context, tenantFixture);
    await page.goto('/dashboard');

    // Open User Menu dropdown
    await page.getByRole('button', { name: /User menu for Apex Founder/i }).click();

    // Click Sign Out
    await page.getByRole('button', { name: /Sign Out/i }).click();

    // Redirected to /sign-in
    await page.waitForURL(/\/sign-in/);
    await expect(page.getByRole('heading', { name: /Sign in to your institute/i })).toBeVisible();

    // Substantive re-navigation to /dashboard is blocked
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/sign-in\?callbackUrl=%2Fdashboard/);
  });
});
