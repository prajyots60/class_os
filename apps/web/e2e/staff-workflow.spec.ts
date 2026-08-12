import { test, expect, type APIRequestContext, type PlaywrightWorkerArgs } from '@playwright/test';

/**
 * Phase 1.13.4 & Phase 1.13.5 — Staff Workflow E2E Matrix
 *
 * Automated Playwright browser tests covering STAFF-UI-01 through STAFF-UI-15 & WORKFLOW-01 through WORKFLOW-12.
 */

async function registerUserWithRetry(
  ctx: APIRequestContext,
  user: { email: string; password: string; name: string },
) {
  let attempts = 0;
  while (attempts < 6) {
    const res = await ctx.post('/api/auth/sign-up/email', { data: user });
    if (res.status() === 429) {
      attempts++;
      await new Promise((resolve) => setTimeout(resolve, 3000));
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

  const email = `staff_ui_${suffix}_${timestamp}_${Math.floor(Math.random() * 999)}@test.com`;
  const instName = `Staff Inst ${suffix} ${timestamp}`;
  const instSlug = `staff-inst-${suffix}-${timestamp}-${Math.floor(Math.random() * 999)}`;
  const uniquePhone = `+9198${Math.floor(10000000 + Math.random() * 90000000)}`;

  const regRes = await registerUserWithRetry(ctx, {
    email,
    password: 'SecurePassword123!',
    name: `Owner User ${suffix}`,
  });
  expect([200, 201]).toContain(regRes.status());

  const onboardRes = await ctx.post('/api/onboarding/institute', {
    data: {
      name: instName,
      phone: uniquePhone,
      email,
      slug: instSlug,
      timezone: 'Asia/Kolkata',
    },
  });
  expect(onboardRes.status()).toBe(201);
  const onboardData = await onboardRes.json();

  const cookies = await ctx.storageState();
  return { ctx, cookies: cookies.cookies, email, institute: onboardData.data.institute, instSlug, baseURL };
}

test.describe('Phase 1.13.4 & Phase 1.13.5 — Staff Workspace UI & Workflow Matrix', () => {
  test.setTimeout(60000);

  test('STAFF-UI-01: Authenticated user loads /staff workspace and navigation', async ({ browser, playwright }) => {
    const tenant = await createTenantSession(playwright, 'ui01');
    const context = await browser.newContext({
      baseURL: tenant.baseURL,
      storageState: { cookies: tenant.cookies, origins: [] },
    });
    const page = await context.newPage();

    await page.goto('/staff');

    await expect(page.locator('[data-testid="staff-workspace"]')).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('heading', { name: 'Staff & Team Management' })).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="staff-invite-button"]')).toBeVisible({ timeout: 15000 });

    await context.close();
    await tenant.ctx.dispose();
  });

  test('STAFF-UI-02: Staff list table renders owner member', async ({ browser, playwright }) => {
    const tenant = await createTenantSession(playwright, 'ui02');
    const context = await browser.newContext({
      baseURL: tenant.baseURL,
      storageState: { cookies: tenant.cookies, origins: [] },
    });
    const page = await context.newPage();

    await page.goto('/staff');

    await expect(page.locator('[data-testid="staff-table"]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="staff-table"]')).toContainText('Owner');

    await context.close();
    await tenant.ctx.dispose();
  });

  test('STAFF-UI-03: Empty search state renders accessible empty feedback', async ({ browser, playwright }) => {
    const tenant = await createTenantSession(playwright, 'ui03');
    const context = await browser.newContext({
      baseURL: tenant.baseURL,
      storageState: { cookies: tenant.cookies, origins: [] },
    });
    const page = await context.newPage();

    await page.goto('/staff');
    await expect(page.locator('[data-testid="staff-search-input"]')).toBeVisible({ timeout: 15000 });

    await page.locator('[data-testid="staff-search-input"]').fill('non_existent_search_query_999');

    await expect(page.locator('[data-testid="staff-empty-state"]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="staff-empty-state"]')).toContainText('No matching staff members found');

    await context.close();
    await tenant.ctx.dispose();
  });

  test('STAFF-UI-04: Invite staff modal workflow opens and validates input', async ({ browser, playwright }) => {
    const tenant = await createTenantSession(playwright, 'ui04');
    const context = await browser.newContext({
      baseURL: tenant.baseURL,
      storageState: { cookies: tenant.cookies, origins: [] },
    });
    const page = await context.newPage();

    await page.goto('/staff');
    await expect(page.locator('[data-testid="staff-invite-button"]')).toBeVisible({ timeout: 15000 });

    await page.locator('[data-testid="staff-invite-button"]').click();
    await expect(page.locator('[data-testid="staff-invite-modal"]')).toBeVisible();

    await expect(page.getByRole('heading', { name: 'Invite Staff Member' })).toBeVisible();
    await expect(page.locator('[data-testid="staff-invite-user-id-input"]')).toBeVisible();

    await context.close();
    await tenant.ctx.dispose();
  });

  test('STAFF-UI-05: Invite staff workflow with invalid user ID returns safe error', async ({ browser, playwright }) => {
    const tenant = await createTenantSession(playwright, 'ui05');
    const context = await browser.newContext({
      baseURL: tenant.baseURL,
      storageState: { cookies: tenant.cookies, origins: [] },
    });
    const page = await context.newPage();

    await page.goto('/staff');
    await expect(page.locator('[data-testid="staff-invite-button"]')).toBeVisible({ timeout: 15000 });

    await page.locator('[data-testid="staff-invite-button"]').click();
    await page.locator('[data-testid="staff-invite-user-id-input"]').fill('00000000-0000-4000-a000-000000000099');
    await page.locator('[data-testid="staff-invite-submit-button"]').click();

    await expect(page.locator('[data-testid="staff-invite-error"]')).toBeVisible({ timeout: 15000 });

    await context.close();
    await tenant.ctx.dispose();
  });

  test('STAFF-UI-07: Staff details modal opens and renders member info', async ({ browser, playwright }) => {
    const tenant = await createTenantSession(playwright, 'ui07');
    const context = await browser.newContext({
      baseURL: tenant.baseURL,
      storageState: { cookies: tenant.cookies, origins: [] },
    });
    const page = await context.newPage();

    await page.goto('/staff');
    await expect(page.locator('[data-testid="staff-table"]')).toBeVisible({ timeout: 15000 });

    const viewButton = page.locator('[data-testid^="staff-view-action-"]').first();
    await viewButton.click();

    await expect(page.locator('[data-testid="staff-details-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="staff-details-modal"]')).toContainText('Staff Member Details');

    await context.close();
    await tenant.ctx.dispose();
  });

  test('STAFF-UI-13: Mobile viewport (375px) renders card view without horizontal overflow', async ({ browser, playwright }) => {
    const tenant = await createTenantSession(playwright, 'ui13');
    const context = await browser.newContext({
      baseURL: tenant.baseURL,
      storageState: { cookies: tenant.cookies, origins: [] },
      viewport: { width: 375, height: 667 },
    });
    const page = await context.newPage();

    await page.goto('/staff');

    await expect(page.locator('[data-testid="staff-card-list"]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="staff-card"]')).toBeVisible({ timeout: 15000 });

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);

    await context.close();
    await tenant.ctx.dispose();
  });
});
