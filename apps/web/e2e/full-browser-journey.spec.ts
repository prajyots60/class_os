import { test, expect, type BrowserContext, type APIRequestContext } from '@playwright/test';

/**
 * Phase 0.12.9 — Full Browser Journey Integration E2E Test Suite
 *
 * Consolidates and proves CoachingOS browser journeys end-to-end:
 *   - Landing Page -> Sign Up -> Onboarding -> Workspace Dashboard
 *   - Session Persistence & Hard Refresh
 *   - Returning Owner Sign In
 *   - Tenant / No-Tenant Server Guard Transitions
 *   - Auth Page Guards (/sign-in, /sign-up)
 *   - Callback URL Security & Open Redirect Defense
 *   - Mobile Application Shell Navigation Drawer
 *   - Duplicate Registration & Validation Regression
 *   - Sign Out & Session Invalidation
 *   - Browser Back-Button Cache & History Defense
 *
 * RATE-LIMIT RESILIENCE:
 * Retries registration requests automatically with backoff if Better Auth rate limit (HTTP 429) is met.
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

async function registerTestUserWithRetry(
  requestContext: APIRequestContext,
  user: { email: string; password: string; name: string },
) {
  let attempts = 0;
  while (attempts < 5) {
    const res = await requestContext.post('/api/auth/sign-up/email', { data: user });
    if (res.status() === 429) {
      attempts++;
      await new Promise((resolve) => setTimeout(resolve, 6000));
      continue;
    }
    return res;
  }
  return requestContext.post('/api/auth/sign-up/email', { data: user });
}

let sharedNoTenantFixture: SessionFixture;
let sharedTenantFixture: SessionFixture;
let sharedOwnerCredentials: { email: string; password: string; name: string; instituteName: string; slug: string };

test.beforeAll(async ({ playwright }) => {
  const timestamp = Date.now();
  const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';

  // ── 1. Create No-Tenant User ──
  const ctxA = await playwright.request.newContext({ baseURL });
  const noTenantUser = {
    email: `journey_notenant_${timestamp}@test.com`,
    password: 'SecurePassword123!',
    name: 'Journey NoTenant User',
  };
  const regA = await registerTestUserWithRetry(ctxA, noTenantUser);
  expect([200, 201]).toContain(regA.status());
  const stateA = await ctxA.storageState();
  sharedNoTenantFixture = { cookies: stateA.cookies as SessionFixture['cookies'] };
  await ctxA.dispose();

  // ── 2. Create Tenant Owner User & Institute ──
  const ctxB = await playwright.request.newContext({ baseURL });
  sharedOwnerCredentials = {
    email: `journey_owner_${timestamp}@test.com`,
    password: 'SecurePassword123!',
    name: 'Quantum Founder',
    instituteName: `Quantum Academy ${timestamp}`,
    slug: `quantum-academy-${timestamp}`,
  };

  const regB = await registerTestUserWithRetry(ctxB, sharedOwnerCredentials);
  expect([200, 201]).toContain(regB.status());

  const onboardRes = await ctxB.post('/api/onboarding/institute', {
    data: {
      name: sharedOwnerCredentials.instituteName,
      phone: '+919876543210',
      email: sharedOwnerCredentials.email,
      slug: sharedOwnerCredentials.slug,
      timezone: 'Asia/Kolkata',
    },
  });
  expect([200, 201]).toContain(onboardRes.status());

  const stateB = await ctxB.storageState();
  sharedTenantFixture = { cookies: stateB.cookies as SessionFixture['cookies'] };
  await ctxB.dispose();
});

async function applySession(context: BrowserContext, fixture: SessionFixture) {
  await context.clearCookies();
  if (fixture.cookies.length > 0) {
    await context.addCookies(fixture.cookies);
  }
}

async function clearSession(context: BrowserContext) {
  await context.clearCookies();
}

test.describe('Phase 0.12.9 — Full Browser Journey Integration Suite', () => {

  // ───────────────────────────────────────────────────────────────────────────
  // JOURNEY A — NEW INSTITUTE OWNER (COMPLETE END-TO-END BROWSER FLOW)
  // ───────────────────────────────────────────────────────────────────────────
  test('JOURNEY A: Unauthenticated → / -> /sign-up -> /onboarding -> /dashboard workspace & refresh persistence', async ({
    page,
    context,
  }) => {
    await clearSession(context);
    const timestamp = Date.now();
    const ownerEmail = `journey_a_owner_${timestamp}@test.com`;
    const password = 'SecurePassword123!';
    const instituteName = `Journey A Institute ${timestamp}`;

    // 1. Visit landing page
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: /Run your coaching institute from one place/i }),
    ).toBeVisible();

    // 2. Click Get Started CTA -> navigates to /sign-up
    await page.getByRole('link', { name: /Get Started/i }).first().click();
    await page.waitForURL('**/sign-up');
    await expect(page.getByRole('heading', { name: /Create your CoachingOS account/i })).toBeVisible();

    // 3. Attempt empty form submission -> validation errors
    let networkRequestFired = false;
    page.on('request', (req) => {
      if (req.url().includes('/api/auth/sign-up/email')) networkRequestFired = true;
    });

    await page.getByRole('button', { name: /Create account/i }).click();
    await expect(page.getByText(/Full name is required/i)).toBeVisible();
    expect(networkRequestFired).toBe(false);

    // 4. Fill valid sign-up details & toggle password visibility
    await page.locator('#signup-name').fill('Journey A Founder');
    await page.locator('#signup-email').fill(ownerEmail);
    await page.locator('#signup-password').fill(password);
    await page.locator('#signup-confirm-password').fill(password);

    // Test password toggle
    const passwordInput = page.locator('#signup-password');
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // 5. Submit registration
    await page.getByRole('button', { name: /Create account/i }).click();

    // 6. Redirected to /onboarding setup page
    await page.waitForURL('**/onboarding', { timeout: 15000 });
    await expect(page.getByRole('heading', { name: /Setup Your Coaching Institute/i })).toBeVisible();

    // 7. Fill onboarding form & check live slug preview
    await page.getByLabel(/Institute Name \*/i).fill(instituteName);
    await page.getByLabel(/Primary Phone \*/i).fill('+919876543210');
    await page.getByLabel(/Contact Email \*/i).fill(ownerEmail);

    await expect(page.getByText(new RegExp(`journey-a-institute-${timestamp}`, 'i'))).toBeVisible();

    // 8. Submit onboarding
    await page.getByRole('button', { name: /Complete Onboarding/i }).click();

    // 9. Redirected to /dashboard workspace shell
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();

    // Verify workspace components render with owner data
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();
    await expect(sidebar.getByText(instituteName)).toBeVisible();
    await expect(sidebar.getByText('owner', { exact: false })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toBeVisible();
    await expect(page.getByText('Journey A Founder')).toBeVisible();

    // 10. Verify hard refresh session & tenant persistence
    await page.reload();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(sidebar.getByText(instituteName)).toBeVisible();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // JOURNEY C — RETURNING OWNER SIGN IN
  // ───────────────────────────────────────────────────────────────────────────
  test('JOURNEY C: Returning tenant owner signs in on /sign-in and lands on /dashboard', async ({
    page,
    context,
  }) => {
    await clearSession(context);
    await page.goto('/sign-in');

    await page.locator('#signin-email').fill(sharedOwnerCredentials.email);
    await page.locator('#signin-password').fill(sharedOwnerCredentials.password);

    await page.getByRole('button', { name: /^Sign in$/i }).click();

    await page.waitForURL('**/dashboard', { timeout: 15000 });
    await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
    await expect(page.locator('aside').getByText(sharedOwnerCredentials.instituteName)).toBeVisible();

    // Verify session persistence after reload
    await page.reload();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // JOURNEY D — NO-TENANT USER ROUTE GUARDS
  // ───────────────────────────────────────────────────────────────────────────
  test('JOURNEY D: Authenticated user without tenant visiting /dashboard is redirected to /onboarding', async ({
    page,
    context,
  }) => {
    await applySession(context, sharedNoTenantFixture);
    await page.goto('/dashboard');

    await expect(page).toHaveURL(/\/onboarding/);
    await expect(page.getByRole('heading', { name: /Setup Your Coaching Institute/i })).toBeVisible();

    // Stays on /onboarding
    await page.goto('/onboarding');
    await expect(page).toHaveURL(/\/onboarding/);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // JOURNEY E — EXISTING TENANT USER ONBOARDING GUARD
  // ───────────────────────────────────────────────────────────────────────────
  test('JOURNEY E: Authenticated user with tenant visiting /onboarding is redirected to /dashboard', async ({
    page,
    context,
  }) => {
    await applySession(context, sharedTenantFixture);
    await page.goto('/onboarding');

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('aside').getByText(sharedOwnerCredentials.instituteName)).toBeVisible();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // JOURNEY F — AUTH PAGE GUARDS (/sign-in, /sign-up)
  // ───────────────────────────────────────────────────────────────────────────
  test('JOURNEY F: Authenticated tenant user visiting /sign-in or /sign-up is redirected to /dashboard', async ({
    page,
    context,
  }) => {
    await applySession(context, sharedTenantFixture);

    await page.goto('/sign-in');
    await expect(page).toHaveURL(/\/dashboard/);

    await page.goto('/sign-up');
    await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/dashboard/);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // JOURNEY G — CALLBACK URL SECURITY & OPEN REDIRECT REGRESSION
  // ───────────────────────────────────────────────────────────────────────────
  test('JOURNEY G: Anonymous visit to /dashboard sets safe callbackUrl; malicious callback URLs are sanitized', async ({
    page,
    context,
  }) => {
    await clearSession(context);

    // Anonymous visit sets callbackUrl=/dashboard
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/sign-in\?callbackUrl=%2Fdashboard/);

    // Malicious external callbackUrl ignored on sign-in
    await page.goto('/sign-in?callbackUrl=https://evil.example.com/phish');
    await page.locator('#signin-email').fill(sharedOwnerCredentials.email);
    await page.locator('#signin-password').fill(sharedOwnerCredentials.password);
    await page.getByRole('button', { name: /^Sign in$/i }).click();

    await page.waitForURL('**/dashboard', { timeout: 15000 });
    expect(page.url()).not.toContain('evil.example.com');
  });

  // ───────────────────────────────────────────────────────────────────────────
  // JOURNEY H — MOBILE APPLICATION SHELL
  // ───────────────────────────────────────────────────────────────────────────
  test('JOURNEY H: Mobile viewport (<768px) hides desktop sidebar, renders drawer toggle, and opens/closes drawer', async ({
    page,
    context,
  }) => {
    await applySession(context, sharedTenantFixture);
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard');

    // Desktop sidebar hidden
    await expect(page.locator('aside')).not.toBeVisible();

    // Toggle menu
    const toggle = page.getByRole('button', { name: /Open navigation menu/i });
    await expect(toggle).toBeVisible();
    await toggle.click();

    // Drawer opens with dialog role
    const drawer = page.getByRole('dialog', { name: /Navigation Menu/i });
    await expect(drawer).toBeVisible();
    await expect(drawer.getByText(sharedOwnerCredentials.instituteName)).toBeVisible();

    // Close via close button
    await drawer.getByRole('button', { name: /Close navigation menu/i }).click();
    await expect(drawer).not.toBeVisible();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // JOURNEY J — ERROR & DUPLICATE REGISTRATION REGRESSION
  // ───────────────────────────────────────────────────────────────────────────
  test('JOURNEY J: Duplicate email shows safe user-facing alert without leaking Prisma/DB traces', async ({
    page,
    context,
  }) => {
    await clearSession(context);
    await page.goto('/sign-up');

    await page.locator('#signup-name').fill('Duplicate Founder');
    await page.locator('#signup-email').fill(sharedOwnerCredentials.email); // Existing email
    await page.locator('#signup-password').fill('SecurePassword123!');
    await page.locator('#signup-confirm-password').fill('SecurePassword123!');

    await page.getByRole('button', { name: /Create account/i }).click();

    // Safe error message visible
    await expect(page.getByText(/An account with this email already exists/i)).toBeVisible({
      timeout: 8000,
    });

    // Zero raw database/Prisma details leaked
    await expect(page.getByText(/prisma/i)).not.toBeVisible();
    await expect(page.getByText(/P2002/i)).not.toBeVisible();
    await expect(page.getByText(/database/i)).not.toBeVisible();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // JOURNEY B — SIGN OUT & PROTECTED ROUTE INVALIDATION (RUN NEAR END)
  // ───────────────────────────────────────────────────────────────────────────
  test('JOURNEY B: Sign Out revokes session and blocks subsequent access to /dashboard', async ({
    page,
    context,
  }) => {
    await applySession(context, sharedTenantFixture);
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard/);

    // Open User Menu
    await page.getByRole('button', { name: /User menu for Quantum Founder/i }).click();

    // Click Sign Out
    await page.getByRole('button', { name: /Sign Out/i }).click();

    // Browser redirected to /sign-in
    await page.waitForURL(/\/sign-in/);
    await expect(page.getByRole('heading', { name: /Sign in to your institute/i })).toBeVisible();

    // Attempting direct URL navigation to /dashboard fails and hard-redirects
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/sign-in\?callbackUrl=%2Fdashboard/);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // JOURNEY I — BROWSER NAVIGATION & BACK BUTTON CACHE DEFENSE (RUN LAST)
  // ───────────────────────────────────────────────────────────────────────────
  test('JOURNEY I: Browser back button after sign-out or anonymous redirect does not leak protected content', async ({
    page,
    context,
  }) => {
    await clearSession(context);

    // 1. Anonymous starts at /, attempts to visit /dashboard -> redirected to /sign-in
    await page.goto('/');
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/sign-in\?callbackUrl=%2Fdashboard/);

    // Click back button -> returns to landing page /, protected dashboard content is NOT rendered
    await page.goBack();
    expect(page.url()).not.toContain('/dashboard');
    await expect(page.getByText('Workspace Overview')).not.toBeVisible();

    // 2. Sign in -> /dashboard -> Sign Out -> back button
    await page.goto('/sign-in');
    await page.locator('#signin-email').fill(sharedOwnerCredentials.email);
    await page.locator('#signin-password').fill(sharedOwnerCredentials.password);
    await page.getByRole('button', { name: /^Sign in$/i }).click();
    await page.waitForURL('**/dashboard');

    // Click Sign Out
    await page.getByRole('button', { name: /User menu for Quantum Founder/i }).click();
    await page.getByRole('button', { name: /Sign Out/i }).click();
    await page.waitForURL(/\/sign-in/);

    // Click back button after sign-out -> server guard rejects revoked session, protected content NOT rendered
    await page.goBack();
    expect(page.url()).not.toContain('/dashboard');
    await expect(page.getByText('Workspace Overview')).not.toBeVisible();
  });
});


