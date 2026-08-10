import { test, expect } from '@playwright/test';

/**
 * Phase 0.12.4 — Sign Up UI & Registration Flow E2E Test Suite
 *
 * Tests the complete signup journey:
 *   Landing Page → /sign-up → Registration → /onboarding
 *
 * Uses unique test identities for every run (no demo account pollution).
 * Does NOT bypass Better Auth: all sessions go through /api/auth/sign-up/email.
 *
 * LOCATOR STRATEGY:
 * AuthField renders labels that include a required asterisk (*) inside a <span>,
 * making the accessible text "Password *" not "Password". We use ID-based
 * locators (e.g., page.locator('#signup-password')) for precise targeting.
 */

test.describe('Sign Up Registration Flow E2E Suite', () => {
  // ── Test 1: Form renders correctly ──
  test('1. /sign-up renders form with all required fields and correct auth layout', async ({
    page,
  }) => {
    await page.goto('/sign-up');

    // Verify branding (use specific locator to avoid strict-mode violation)
    await expect(page.getByRole('link', { name: 'CoachingOS' })).toBeVisible();
    await expect(page.getByText(/Operations software for coaching institutes/i)).toBeVisible();

    // Verify form heading
    await expect(
      page.getByRole('heading', { name: /Create your CoachingOS account/i }),
    ).toBeVisible();

    // Verify all required fields are present by ID
    await expect(page.locator('#signup-name')).toBeVisible();
    await expect(page.locator('#signup-email')).toBeVisible();
    await expect(page.locator('#signup-password')).toBeVisible();
    await expect(page.locator('#signup-confirm-password')).toBeVisible();

    // Verify submit button exists
    await expect(page.getByRole('button', { name: /Create account/i })).toBeVisible();

    // Verify footer link to sign-in
    await expect(page.getByRole('link', { name: /Sign in/i })).toBeVisible();
  });

  // ── Test 2: Client-side validation errors ──
  test('2. /sign-up shows field-level validation errors on empty form submission', async ({
    page,
  }) => {
    await page.goto('/sign-up');

    // Click submit without filling anything
    await page.getByRole('button', { name: /Create account/i }).click();

    // Verify validation error messages appear
    await expect(page.getByText(/Full name is required/i)).toBeVisible();
    await expect(page.getByText(/Email address is required/i)).toBeVisible();
    await expect(page.getByText(/Password is required/i)).toBeVisible();
    await expect(page.getByText(/Please confirm your password/i)).toBeVisible();
  });

  // ── Test 3: Password mismatch validation ──
  test('3. /sign-up shows password mismatch error', async ({ page }) => {
    await page.goto('/sign-up');

    await page.locator('#signup-name').fill('Test User');
    await page.locator('#signup-email').fill('mismatch@test.com');
    await page.locator('#signup-password').fill('SecurePassword123!');
    await page.locator('#signup-confirm-password').fill('DifferentPassword!');

    await page.getByRole('button', { name: /Create account/i }).click();

    await expect(page.getByText(/Passwords do not match/i)).toBeVisible();
  });

  // ── Test 4: Short password validation ──
  test('4. /sign-up validates minimum password length', async ({ page }) => {
    await page.goto('/sign-up');

    await page.locator('#signup-name').fill('Test User');
    await page.locator('#signup-email').fill('shortpwd@test.com');
    await page.locator('#signup-password').fill('short');
    await page.locator('#signup-confirm-password').fill('short');

    await page.getByRole('button', { name: /Create account/i }).click();

    await expect(page.getByText(/at least 8 characters/i)).toBeVisible();
  });

  // ── Test 5: Password visibility toggle ──
  test('5. /sign-up password visibility toggle works correctly', async ({ page }) => {
    await page.goto('/sign-up');

    const passwordInput = page.locator('#signup-password');
    await passwordInput.fill('SecurePassword123!');

    // Default: password is hidden
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Click show password button (first one, for the password field)
    await page.getByRole('button', { name: /Show password/i }).first().click();
    await expect(passwordInput).toHaveAttribute('type', 'text');

    // Click hide password button
    await page.getByRole('button', { name: /Hide password/i }).first().click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  // ── Test 6: Complete successful registration flow ──
  test('6. Complete registration flow: /sign-up → Better Auth → /onboarding', async ({ page }) => {
    const testEmail = `signup_e2e_${Date.now()}@test.com`;
    const testPassword = 'SecurePassword123!';
    const testName = 'E2E Registration Tester';

    await page.goto('/sign-up');

    // Fill form with valid data using ID-based locators
    await page.locator('#signup-name').fill(testName);
    await page.locator('#signup-email').fill(testEmail);
    await page.locator('#signup-password').fill(testPassword);
    await page.locator('#signup-confirm-password').fill(testPassword);

    // Verify button is enabled before submit
    await expect(page.getByRole('button', { name: /Create account/i })).toBeEnabled();

    // Submit
    await page.getByRole('button', { name: /Create account/i }).click();

    // Wait for redirect to /onboarding (Better Auth creates user + session)
    await page.waitForURL('**/onboarding', { timeout: 15000 });

    // Verify we reached onboarding and it shows the institute setup form
    await expect(
      page.getByRole('heading', { name: /Setup Your Coaching Institute/i }),
    ).toBeVisible({ timeout: 10000 });
  });

  // ── Test 7: Duplicate email registration error ──
  test('7. Duplicate email shows safe user-facing error (not raw DB error)', async ({ page }) => {
    const duplicateEmail = `dup_signup_${Date.now()}@test.com`;
    const password = 'SecurePassword123!';

    // Register once via API
    const signUpResponse = await page.request.post('/api/auth/sign-up/email', {
      data: { email: duplicateEmail, password, name: 'First Tester' },
    });
    expect(signUpResponse.status()).toBe(200);

    // Clear cookies to ensure unauthenticated state for page navigation
    await page.context().clearCookies();

    // Now visit /sign-up and try to register with same email
    await page.goto('/sign-up');
    await page.locator('#signup-name').fill('Duplicate Tester');
    await page.locator('#signup-email').fill(duplicateEmail);
    await page.locator('#signup-password').fill(password);
    await page.locator('#signup-confirm-password').fill(password);
    await page.getByRole('button', { name: /Create account/i }).click();

    // Should show safe error message — NOT raw DB/Prisma error
    await expect(
      page.getByText(/An account with this email already exists/i),
    ).toBeVisible({ timeout: 8000 });

    // Should NOT expose internal errors
    await expect(page.getByText(/prisma/i)).not.toBeVisible();
    await expect(page.getByText(/P2002/i)).not.toBeVisible();
    await expect(page.getByText(/database/i)).not.toBeVisible();
    await expect(page.getByText(/stack trace/i)).not.toBeVisible();
  });

  // ── Test 8: Authenticated user visiting /sign-up is redirected ──
  test('8. Authenticated user visiting /sign-up is redirected to /onboarding', async ({ page }) => {
    const email = `auth_redirect_${Date.now()}@test.com`;
    const password = 'SecurePassword123!';

    // Create account and establish session
    const signUpResponse = await page.request.post('/api/auth/sign-up/email', {
      data: { email, password, name: 'Auth Redirect Tester' },
    });
    expect(signUpResponse.status()).toBe(200);

    // Now visit /sign-up as an authenticated user
    await page.goto('/sign-up');

    // Should be redirected away from /sign-up
    await page.waitForURL('**/onboarding', { timeout: 8000 });
  });

  // ── Test 9: Security — /sign-up to /api/auth/sign-up/email does NOT send forbidden fields ──
  test('9. Sign-up request does NOT send userId, instituteId, role, status, or tenantId', async ({
    page,
  }) => {
    const testEmail = `security_${Date.now()}@test.com`;
    const capturedRequests: { url: string; body: unknown }[] = [];

    // Intercept the Better Auth signup API request
    await page.route('**/api/auth/sign-up/email', (route) => {
      const request = route.request();
      try {
        const body = request.postDataJSON() as unknown;
        capturedRequests.push({ url: request.url(), body });
      } catch {
        // no body
      }
      route.continue();
    });

    await page.goto('/sign-up');
    await page.locator('#signup-name').fill('Security Test User');
    await page.locator('#signup-email').fill(testEmail);
    await page.locator('#signup-password').fill('SecurePassword123!');
    await page.locator('#signup-confirm-password').fill('SecurePassword123!');
    await page.getByRole('button', { name: /Create account/i }).click();

    // Wait for navigation (successful registration redirects to /onboarding)
    await page.waitForURL('**/onboarding', { timeout: 15000 }).catch(() => {
      // If redirect didn't happen, still check captured requests
    });

    // Inspect intercepted request payload
    const signupReq = capturedRequests[0];
    if (signupReq && typeof signupReq.body === 'object' && signupReq.body !== null) {
      const body = signupReq.body as Record<string, unknown>;
      expect(body).not.toHaveProperty('userId');
      expect(body).not.toHaveProperty('instituteId');
      expect(body).not.toHaveProperty('role');
      expect(body).not.toHaveProperty('status');
      expect(body).not.toHaveProperty('tenantId');
      expect(body).not.toHaveProperty('membershipId');
    }
  });
});
