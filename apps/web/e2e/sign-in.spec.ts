import { test, expect } from '@playwright/test';

/**
 * Phase 0.12.5 — Sign In UI & Authentication Flow E2E Test Suite
 *
 * Tests the complete sign-in journey:
 *   /sign-in → Better Auth → Tenant Resolution → /dashboard OR /onboarding
 *
 * Uses isolated test user setup in beforeAll to respect Better Auth rate limits (3/10s).
 * Does NOT bypass Better Auth: all authentications go through /api/auth/sign-in/email.
 */

test.describe('Sign In Authentication Flow E2E Suite', () => {
  let testUser: { email: string; password: string };

  test.beforeAll(async ({ request }) => {
    const timestamp = Date.now();
    testUser = {
      email: `signin_suite_${timestamp}@test.com`,
      password: 'SecurePassword123!',
    };

    // Register single test user for the suite
    const regRes = await request.post('/api/auth/sign-up/email', {
      data: {
        email: testUser.email,
        password: testUser.password,
        name: 'SignIn Suite Tester',
      },
    });
    expect(regRes.status()).toBe(200);
  });

  // ── Test 1: Form renders correctly ──
  test('1. /sign-in renders form with all required fields and correct auth layout', async ({
    page,
  }) => {
    await page.goto('/sign-in');

    // Verify auth layout branding
    await expect(page.getByRole('link', { name: 'CoachingOS' })).toBeVisible();
    await expect(page.getByText(/Operations software for coaching institutes/i)).toBeVisible();

    // Verify header
    await expect(
      page.getByRole('heading', { name: /Sign in to your institute/i }),
    ).toBeVisible();

    // Verify fields by ID
    await expect(page.locator('#signin-email')).toBeVisible();
    await expect(page.locator('#signin-password')).toBeVisible();

    // Verify submit button
    await expect(page.getByRole('button', { name: /^Sign in$/i })).toBeVisible();

    // Verify footer link to sign-up
    await expect(page.getByRole('link', { name: /Create Institute Account/i })).toBeVisible();
  });

  // ── Test 2: Field validation on empty submission ──
  test('2. /sign-in shows field-level validation errors on empty form submission', async ({
    page,
  }) => {
    await page.goto('/sign-in');

    await page.getByRole('button', { name: /^Sign in$/i }).click();

    await expect(page.getByText(/Email address is required/i)).toBeVisible();
    await expect(page.getByText(/Password is required/i)).toBeVisible();
  });

  // ── Test 3: Invalid email format validation ──
  test('3. /sign-in validates email format', async ({ page }) => {
    await page.goto('/sign-in');

    await page.locator('#signin-email').fill('invalid-email-format');
    await page.locator('#signin-password').fill('SomePassword123!');
    await page.getByRole('button', { name: /^Sign in$/i }).click();

    await expect(page.getByText(/Please enter a valid email address/i)).toBeVisible();
  });

  // ── Test 4: Invalid credentials error ──
  test('4. /sign-in displays safe error on invalid credentials', async ({ page }) => {
    await page.context().clearCookies();

    await page.goto('/sign-in');
    await page.locator('#signin-email').fill(`nonexistent_${Date.now()}@test.com`);
    await page.locator('#signin-password').fill('WrongPassword123!');
    await page.getByRole('button', { name: /^Sign in$/i }).click();

    // Verify safe user-facing error message
    await expect(page.getByText(/Invalid email or password/i)).toBeVisible({ timeout: 8000 });

    // Verify internal error codes / stack traces are NOT exposed
    await expect(page.getByText(/prisma/i)).not.toBeVisible();
    await expect(page.getByText(/database/i)).not.toBeVisible();
    await expect(page.getByText(/stack trace/i)).not.toBeVisible();
  });

  // ── Test 5: Password visibility toggle ──
  test('5. /sign-in password visibility toggle works correctly', async ({ page }) => {
    await page.goto('/sign-in');

    const passwordInput = page.locator('#signin-password');
    await passwordInput.fill('MySecretPassword123!');

    // Default: hidden
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Reveal
    await page.getByRole('button', { name: /Show password/i }).click();
    await expect(passwordInput).toHaveAttribute('type', 'text');

    // Mask again
    await page.getByRole('button', { name: /Hide password/i }).click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  // ── Test 6: Complete successful sign-in flow for user without institute: /sign-in → Better Auth → /onboarding ──
  test('6. Complete sign-in flow for user without institute: /sign-in → Better Auth → /onboarding', async ({
    page,
  }) => {
    await page.context().clearCookies();

    await page.goto('/sign-in');
    await page.locator('#signin-email').fill(testUser.email);
    await page.locator('#signin-password').fill(testUser.password);
    await page.getByRole('button', { name: /^Sign in$/i }).click();

    // Should redirect to /onboarding (since user has no active tenant yet)
    await page.waitForURL('**/onboarding', { timeout: 15000 });
    await expect(
      page.getByRole('heading', { name: /Setup Your Coaching Institute/i }),
    ).toBeVisible({ timeout: 10000 });
  });

  // ── Test 7: Authenticated user visiting /sign-in is redirected ──
  test('7. Authenticated user visiting /sign-in is redirected to application', async ({ page }) => {
    // Authenticate user session
    const authRes = await page.request.post('/api/auth/sign-in/email', {
      data: { email: testUser.email, password: testUser.password },
    });
    expect(authRes.status()).toBe(200);

    // Visit /sign-in as an authenticated user
    await page.goto('/sign-in');

    // Should automatically redirect away from /sign-in to /onboarding or /dashboard
    await page.waitForURL(/\/(onboarding|dashboard)/, { timeout: 10000 });
  });

  // ── Test 8: Payload security & safe callbackUrl verification ──
  test('8. Sign-in request payload contains ONLY email and password, rejecting external callbackUrls', async ({
    page,
  }) => {
    // Respect Better Auth rate limit window (3 attempts / 10s)
    await page.waitForTimeout(3500);

    await page.context().clearCookies();
    const capturedRequests: { url: string; body: unknown }[] = [];

    // Intercept sign-in API request
    await page.route('**/api/auth/sign-in/email', (route) => {
      const request = route.request();
      try {
        const body = request.postDataJSON() as unknown;
        capturedRequests.push({ url: request.url(), body });
      } catch {
        // no body
      }
      route.continue();
    });

    // Visit with malicious external callbackUrl
    await page.goto('/sign-in?callbackUrl=https://evil-phishing-site.com');
    await page.locator('#signin-email').fill(testUser.email);
    await page.locator('#signin-password').fill(testUser.password);
    await page.getByRole('button', { name: /^Sign in$/i }).click();

    // Must NOT redirect to external site — must redirect internally to /onboarding or /dashboard
    await page.waitForURL(/\/(onboarding|dashboard)/, { timeout: 15000 });
    expect(page.url()).not.toContain('evil-phishing-site.com');

    // Verify payload security
    const signinReq = capturedRequests[0];
    if (signinReq && typeof signinReq.body === 'object' && signinReq.body !== null) {
      const body = signinReq.body as Record<string, unknown>;
      expect(body).not.toHaveProperty('userId');
      expect(body).not.toHaveProperty('instituteId');
      expect(body).not.toHaveProperty('role');
      expect(body).not.toHaveProperty('status');
      expect(body).not.toHaveProperty('tenantId');
      expect(body).not.toHaveProperty('membershipId');
      expect(Object.keys(body).sort()).toEqual(['email', 'password'].sort());
    }
  });
});
