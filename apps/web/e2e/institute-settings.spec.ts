import { test, expect, type APIRequestContext } from '@playwright/test';

/**
 * Phase 1.5.3 — Institute Settings & White-Label Branding E2E Test Suite
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

let ownerFixture: SessionFixture;
let ownerEmail: string;
let instituteName: string;
let instituteSlug: string;

async function registerTestUserWithRetry(
  requestContext: APIRequestContext,
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

test.beforeAll(async ({ playwright }) => {
  test.setTimeout(60000);
  const timestamp = Date.now();
  const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';

  const ctx = await playwright.request.newContext({ baseURL });
  ownerEmail = `settings_owner_${timestamp}@test.com`;
  instituteName = `Starlight Academy ${timestamp}`;
  instituteSlug = `starlight-${timestamp}`;

  const user = {
    email: ownerEmail,
    password: 'SecurePassword123!',
    name: 'Starlight Owner',
  };

  const regRes = await registerTestUserWithRetry(ctx, user);
  expect([200, 201]).toContain(regRes.status());

  const onboardRes = await ctx.post('/api/onboarding/institute', {
    data: {
      name: instituteName,
      phone: '+919876543210',
      email: ownerEmail,
      slug: instituteSlug,
      timezone: 'Asia/Kolkata',
    },
  });
  expect([200, 201]).toContain(onboardRes.status());

  const state = await ctx.storageState();
  ownerFixture = { cookies: state.cookies as SessionFixture['cookies'] };
  await ctx.dispose();
});

test.describe('Institute Settings & Branding UI E2E Suite', () => {
  // SETTINGS-01: Authenticated owner opens /settings
  test('SETTINGS-01: Authenticated owner loads /settings and sees existing profile data', async ({
    page,
    context,
  }) => {
    await context.clearCookies();
    await context.addCookies(ownerFixture.cookies);

    await page.goto('/settings');
    await expect(page).toHaveURL(/\/settings/);

    await expect(page.getByRole('heading', { name: 'Institute Settings' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Institute Profile' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'White-Label Branding' })).toBeVisible();

    // Verify initial input values populated from API
    await expect(page.locator('input[name="name"]')).toHaveValue(instituteName);
    await expect(page.locator('input[name="email"]')).toHaveValue(ownerEmail);
    await expect(page.locator('input[name="phone"]')).toHaveValue('+919876543210');
    await expect(page.locator('input[name="slug"]')).toHaveValue(instituteSlug);
  });

  // SETTINGS-02: Owner updates profile details and reloads to verify persistence
  test('SETTINGS-02: Owner updates institute profile details and persists changes across reloads', async ({
    page,
    context,
  }) => {
    await context.clearCookies();
    await context.addCookies(ownerFixture.cookies);

    await page.goto('/settings');

    const updatedName = `${instituteName} Updated`;
    const updatedPhone = '+919999988888';

    await page.locator('input[name="name"]').fill(updatedName);
    await page.locator('input[name="phone"]').fill(updatedPhone);

    const saveBtn = page.getByRole('button', { name: 'Save Changes' });
    await expect(saveBtn).toBeEnabled();
    await saveBtn.click();

    // Verify success alert banner
    await expect(page.getByText('Settings saved successfully.')).toBeVisible();

    // Reload page and verify persistence
    await page.reload();
    await expect(page.locator('input[name="name"]')).toHaveValue(updatedName);
    await expect(page.locator('input[name="phone"]')).toHaveValue(updatedPhone);
  });

  // SETTINGS-03: Owner updates branding (logo URL, primary HEX color) and verifies preview + persistence
  test('SETTINGS-03: Owner updates logo URL and primary color, preview updates and persists after reload', async ({
    page,
    context,
  }) => {
    await context.clearCookies();
    await context.addCookies(ownerFixture.cookies);

    await page.goto('/settings');

    const logoUrl = 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d';
    const primaryColor = '#2563EB';

    await page.locator('input[name="logoUrl"]').fill(logoUrl);
    await page.locator('input[name="primaryColor"]').fill(primaryColor);

    // Verify brand color preview updates in real time
    await expect(page.getByText('#2563EB', { exact: true })).toBeVisible();

    const saveBtn = page.getByRole('button', { name: 'Save Changes' });
    await saveBtn.click();

    await expect(page.getByText('Settings saved successfully.')).toBeVisible();

    // Reload page and verify persistence
    await page.reload();
    await expect(page.locator('input[name="logoUrl"]')).toHaveValue(logoUrl);
    await expect(page.locator('input[name="primaryColor"]')).toHaveValue(primaryColor);
  });

  // SETTINGS-04: Client validation blocks invalid email
  test('SETTINGS-04: Invalid email format triggers client error and blocks API PATCH', async ({
    page,
    context,
  }) => {
    await context.clearCookies();
    await context.addCookies(ownerFixture.cookies);

    await page.goto('/settings');

    let patchCalled = false;
    page.on('request', (req) => {
      if (req.url().includes('/api/institute/settings') && req.method() === 'PATCH') {
        patchCalled = true;
      }
    });

    await page.locator('input[name="email"]').fill('invalid-email-string');
    const saveBtn = page.getByRole('button', { name: 'Save Changes' });
    await saveBtn.click();

    await expect(page.getByText('Please enter a valid email address.')).toBeVisible();
    expect(patchCalled).toBe(false);
  });

  // SETTINGS-05: Client validation blocks invalid primary HEX color
  test('SETTINGS-05: Invalid HEX color format triggers client error and blocks API PATCH', async ({
    page,
    context,
  }) => {
    await context.clearCookies();
    await context.addCookies(ownerFixture.cookies);

    await page.goto('/settings');

    let patchCalled = false;
    page.on('request', (req) => {
      if (req.url().includes('/api/institute/settings') && req.method() === 'PATCH') {
        patchCalled = true;
      }
    });

    await page.locator('input[name="primaryColor"]').fill('rgb(255,0,0)');
    const saveBtn = page.getByRole('button', { name: 'Save Changes' });
    await saveBtn.click();

    await expect(
      page.getByText(/Primary color must be a valid HEX color code/i),
    ).toBeVisible();
    expect(patchCalled).toBe(false);
  });

  // SETTINGS-06: Non-HTTPS logo URL rejected
  test('SETTINGS-06: Non-HTTPS logo URL (http://) triggers validation error and blocks PATCH', async ({
    page,
    context,
  }) => {
    await context.clearCookies();
    await context.addCookies(ownerFixture.cookies);

    await page.goto('/settings');

    let patchCalled = false;
    page.on('request', (req) => {
      if (req.url().includes('/api/institute/settings') && req.method() === 'PATCH') {
        patchCalled = true;
      }
    });

    await page.locator('input[name="logoUrl"]').fill('http://insecure-domain.com/logo.png');
    const saveBtn = page.getByRole('button', { name: 'Save Changes' });
    await saveBtn.click();

    await expect(page.getByText(/Logo URL must be a valid HTTPS URL/i)).toBeVisible();
    expect(patchCalled).toBe(false);
  });

  // SETTINGS-07 & 08: Client payload security assertion
  test('SETTINGS-07 & SETTINGS-08: PATCH payload NEVER contains identity, role, or protected fields', async ({
    page,
    context,
  }) => {
    await context.clearCookies();
    await context.addCookies(ownerFixture.cookies);

    await page.goto('/settings');

    let interceptedPayload: Record<string, unknown> | null = null;
    page.on('request', (req) => {
      if (req.url().includes('/api/institute/settings') && req.method() === 'PATCH') {
        try {
          interceptedPayload = JSON.parse(req.postData() || '{}');
        } catch {
          interceptedPayload = null;
        }
      }
    });

    await page.locator('input[name="phone"]').fill('+919876543299');
    const saveBtn = page.getByRole('button', { name: 'Save Changes' });
    await saveBtn.click();

    await expect(page.getByText('Settings saved successfully.')).toBeVisible();

    expect(interceptedPayload).not.toBeNull();
    if (interceptedPayload) {
      const keys = Object.keys(interceptedPayload);
      expect(keys).not.toContain('id');
      expect(keys).not.toContain('slug');
      expect(keys).not.toContain('status');
      expect(keys).not.toContain('instituteId');
      expect(keys).not.toContain('tenantId');
      expect(keys).not.toContain('userId');
      expect(keys).not.toContain('role');
      expect(keys).not.toContain('permissions');
    }
  });

  // SETTINGS-09: Mobile responsiveness (375px & 320px)
  test('SETTINGS-09: Mobile viewports render without horizontal overflow', async ({
    page,
    context,
  }) => {
    await context.clearCookies();
    await context.addCookies(ownerFixture.cookies);

    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/settings');

    await expect(page.getByRole('heading', { name: 'Institute Settings' })).toBeVisible();

    // Assert no horizontal scrollbar overflow
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });
});
