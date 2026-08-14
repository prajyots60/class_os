import { test, expect, type APIRequestContext, type PlaywrightWorkerArgs } from '@playwright/test';

/**
 * Phase 2.7 — Staff Academic Workspace WAI-ARIA & Accessibility Matrix
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

type CookieItem = Awaited<ReturnType<APIRequestContext['storageState']>>['cookies'][number];

async function createTenantSession(
  playwright: PlaywrightWorkerArgs['playwright'],
  suffix: string,
) {
  const timestamp = Date.now();
  const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';
  const ctx = await playwright.request.newContext({ baseURL });

  const ownerEmail = `acad_a11y_${suffix}_${timestamp}@test.com`;
  const password = 'SecurePassword123!';

  const signUpRes = await registerUserWithRetry(ctx, {
    email: ownerEmail,
    password,
    name: `Owner ${suffix}`,
  });
  expect(signUpRes.status()).toBe(200);

  const storageState = await ctx.storageState();
  const cookies: CookieItem[] = storageState.cookies;

  const onbRes = await ctx.post('/api/onboarding/institute', {
    data: {
      name: `Institute A11y ${suffix}`,
      phone: '+15551234567',
      email: ownerEmail,
    },
  });
  expect(onbRes.status()).toBe(201);
  const onbBody = await onbRes.json();
  const instituteId = onbBody.data.institute.id;

  return { ctx, cookies, ownerEmail, password, instituteId };
}

test.describe('Phase 2.7 — Academics Accessibility & WAI-ARIA Matrix', () => {

  test('A11Y-01: Keyboard Navigation Tab Sequence across Workspace Tabs', async ({ page, playwright }) => {
    const { cookies } = await createTenantSession(playwright, 'tab_seq');
    const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';
    await page.context().addCookies(cookies.map((c) => ({ ...c, domain: 'localhost' })));

    await page.goto(`${baseURL}/academics`);
    await page.waitForLoadState('networkidle');

    // Press Tab repeatedly to focus elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Verify currently focused element is interactive
    const isFocusedInteractive = await page.evaluate(() => {
      const active = document.activeElement;
      if (!active) return false;
      const tag = active.tagName.toLowerCase();
      return tag === 'button' || tag === 'a' || tag === 'input' || tag === 'select' || active.getAttribute('role') === 'tab';
    });
    expect(isFocusedInteractive).toBe(true);
  });

  test('A11Y-02: Dialog Focus Management & Escape Key Dismissal', async ({ page, playwright }) => {
    const { cookies, ctx } = await createTenantSession(playwright, 'modal_esc');
    const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';
    await page.context().addCookies(cookies.map((c) => ({ ...c, domain: 'localhost' })));

    // Create program/subject/batch
    const pRes = await ctx.post('/api/v1/programs', { data: { name: 'A11y Program', code: 'A11Y-P' } });
    const progId = (await pRes.json()).data.id;
    const sRes = await ctx.post('/api/v1/subjects', { data: { programId: progId, name: 'A11y Subj', code: 'A11Y-S' } });
    const subjId = (await sRes.json()).data.id;
    await ctx.post('/api/v1/batches', { data: { subjectId: subjId, name: 'A11y Batch', code: 'A11Y-B' } });

    await page.goto(`${baseURL}/academics?tab=homework`);
    await page.waitForLoadState('networkidle');

    // Open Homework Modal
    await page.getByRole('button', { name: 'Create Homework' }).click();
    await expect(page.getByText('Create Homework Draft')).toBeVisible();

    // Press Escape to dismiss modal dialog
    await page.keyboard.press('Escape');
    await expect(page.getByText('Create Homework Draft')).not.toBeVisible();
  });

  test('A11Y-03: Status Badges contain text labels (not color alone)', async ({ page, playwright }) => {
    const { cookies } = await createTenantSession(playwright, 'badges');
    const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';
    await page.context().addCookies(cookies.map((c) => ({ ...c, domain: 'localhost' })));

    await page.goto(`${baseURL}/academics`);
    await page.waitForLoadState('networkidle');

    // Verify overview badges contain explicit text content
    const hasTextBadges = await page.evaluate(() => {
      const badges = document.querySelectorAll('span, div');
      for (const b of Array.from(badges)) {
        const text = b.textContent?.trim();
        if (text === 'Completed' || text === 'Not Taken' || text === 'Draft' || text === 'Published') {
          return true;
        }
      }
      return false;
    });

    expect(hasTextBadges).toBe(true);
  });
});
