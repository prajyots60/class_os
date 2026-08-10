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
    await page.waitForLoadState('networkidle');

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
    await expect(page.getByText(/Institute Owner/i)).toBeVisible();

    // 7. Verify subsequent onboarding attempt for already onboarded user shows friendly conflict message
    await page.goto('/onboarding');
    await page.waitForLoadState('networkidle');

    await page.getByLabel(/Institute Name \*/i).fill('Second Inst Attempt');
    await page.getByLabel(/Primary Phone \*/i).fill('+919876543211');
    await page.getByLabel(/Contact Email \*/i).fill('second@test.com');

    await page.getByRole('button', { name: /Complete Onboarding/i }).click();

    await expect(
      page.getByText(/You already belong to an active institute tenant/i),
    ).toBeVisible();
  });
});
