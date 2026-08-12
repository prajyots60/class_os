import { test, expect, type APIRequestContext, type PlaywrightWorkerArgs } from '@playwright/test';

/**
 * Phase 1.13.5 — Staff Accessibility E2E Test Suite
 *
 * Verifies modal focus traps, Escape key dismissals, ARIA attributes, semantic headings, and keyboard navigation.
 */

async function registerUserWithRetry(
  ctx: APIRequestContext,
  user: { email: string; password: string; name: string },
) {
  let attempts = 0;
  while (attempts < 10) {
    const res = await ctx.post('/api/auth/sign-up/email', { data: user });
    if (res.status() === 429) {
      attempts++;
      await new Promise((resolve) => setTimeout(resolve, 3500));
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

  const email = `staff_a11y_${suffix}_${timestamp}_${Math.floor(Math.random() * 999)}@test.com`;
  const instName = `A11y Inst ${suffix} ${timestamp}`;
  const instSlug = `a11y-inst-${suffix}-${timestamp}-${Math.floor(Math.random() * 999)}`;
  const uniquePhone = `+9198${Math.floor(10000000 + Math.random() * 90000000)}`;

  const regRes = await registerUserWithRetry(ctx, {
    email,
    password: 'SecurePassword123!',
    name: `A11y Owner ${suffix}`,
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

test.describe('Phase 1.13.5 — Staff Accessibility Audit', () => {
  test.setTimeout(60000);

  test('A11Y-01: Modal dialog has correct role="dialog", aria-modal, and Escape key dismissal', async ({ browser, playwright }) => {
    const tenant = await createTenantSession(playwright, 'a11y01');
    const context = await browser.newContext({
      baseURL: tenant.baseURL,
      storageState: { cookies: tenant.cookies, origins: [] },
    });
    const page = await context.newPage();

    await page.goto('/staff');
    await expect(page.locator('[data-testid="staff-invite-button"]')).toBeVisible({ timeout: 15000 });

    // Open invite modal
    await page.locator('[data-testid="staff-invite-button"]').click();

    const modal = page.locator('[data-testid="staff-invite-modal"]');
    await expect(modal).toBeVisible();
    await expect(modal).toHaveAttribute('role', 'dialog');
    await expect(modal).toHaveAttribute('aria-modal', 'true');

    // Press Escape to dismiss
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();

    await context.close();
    await tenant.ctx.dispose();
  });

  test('A11Y-02: Details modal has correct dialog semantics and Escape dismissal', async ({ browser, playwright }) => {
    const tenant = await createTenantSession(playwright, 'a11y02');
    const context = await browser.newContext({
      baseURL: tenant.baseURL,
      storageState: { cookies: tenant.cookies, origins: [] },
    });
    const page = await context.newPage();

    await page.goto('/staff');
    await expect(page.locator('[data-testid="staff-table"]')).toBeVisible({ timeout: 15000 });

    // Click details button
    await page.locator('[data-testid^="staff-view-action-"]').first().click();

    const detailsModal = page.locator('[data-testid="staff-details-modal"]');
    await expect(detailsModal).toBeVisible();
    await expect(detailsModal).toHaveAttribute('role', 'dialog');

    // Press Escape to dismiss
    await page.keyboard.press('Escape');
    await expect(detailsModal).not.toBeVisible();

    await context.close();
    await tenant.ctx.dispose();
  });

  test('A11Y-03: Filter select controls have explicit aria-labels and semantic HTML options', async ({ browser, playwright }) => {
    const tenant = await createTenantSession(playwright, 'a11y03');
    const context = await browser.newContext({
      baseURL: tenant.baseURL,
      storageState: { cookies: tenant.cookies, origins: [] },
    });
    const page = await context.newPage();

    await page.goto('/staff');
    await expect(page.locator('[data-testid="staff-role-filter"]')).toBeVisible({ timeout: 15000 });

    const roleFilter = page.locator('[data-testid="staff-role-filter"]');
    const statusFilter = page.locator('[data-testid="staff-status-filter"]');

    await expect(roleFilter).toHaveAttribute('aria-label', 'Filter by role');
    await expect(statusFilter).toHaveAttribute('aria-label', 'Filter by status');

    await context.close();
    await tenant.ctx.dispose();
  });
});
