import { test, expect } from '@playwright/test';

test.describe('Institute Onboarding API & Security E2E Suite', () => {
  test('rejects unauthenticated POST /api/onboarding/institute with 401 UNAUTHENTICATED', async ({ page }) => {
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

  test('successfully processes onboarding for authenticated user and rejects subsequent duplicate onboarding', async ({ page }) => {
    const testEmail = `e2e_founder_${Date.now()}@test.com`;
    const password = 'SecureTestPassword123!';

    // 1. Sign up user via Better Auth API endpoint
    const signUpResponse = await page.request.post('/api/auth/sign-up/email', {
      data: {
        email: testEmail,
        password,
        name: 'E2E Founder',
      },
    });

    expect(signUpResponse.status()).toBe(200);

    // 2. Perform Onboarding via POST /api/onboarding/institute
    const onboardResponse = await page.request.post('/api/onboarding/institute', {
      data: {
        name: 'E2E Vanguard Learning',
        phone: '+919876543210',
        email: 'contact@e2evanguard.test',
        timezone: 'Asia/Kolkata',
      },
    });

    expect(onboardResponse.status()).toBe(201);

    const body = await onboardResponse.json();
    expect(body.success).toBe(true);
    expect(body.data.institute.id).toBeDefined();
    expect(body.data.institute.name).toBe('E2E Vanguard Learning');
    expect(body.data.institute.slug).toBe('e2e-vanguard-learning');

    expect(body.data.tenantContext.userId).toBeDefined();
    expect(body.data.tenantContext.instituteId).toBe(body.data.institute.id);
    expect(body.data.tenantContext.role).toBe('owner');
    expect(body.data.tenantContext.status).toBe('active');

    // 3. Duplicate onboarding request for same authenticated user returns 409 Conflict
    const duplicateResponse = await page.request.post('/api/onboarding/institute', {
      data: {
        name: 'Second Institute Attempt',
        phone: '+919876543211',
        email: 'second@test.com',
      },
    });

    expect(duplicateResponse.status()).toBe(409);

    const dupBody = await duplicateResponse.json();
    expect(dupBody.error.code).toBe('CONFLICT');
    expect(dupBody.error.message).toContain('already associated with an active institute tenant');
  });
});
