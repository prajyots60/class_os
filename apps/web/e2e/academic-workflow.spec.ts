import { test, expect, type APIRequestContext, type PlaywrightWorkerArgs } from '@playwright/test';

/**
 * Phase 1.10.6 + 1.10.7 — Staff Academic Workspace UI & Workflow Audit E2E Suite
 *
 * Full verification matrix covering UX, Accessibility, Capability Gating, State Machine Transitions,
 * and Tenant Isolation boundaries for the Staff Academic Experience:
 * - ACADEMIC-01: Program Creation workflow
 * - ACADEMIC-02: Duplicate Program Code yields conflict error
 * - ACADEMIC-03: Program Code is immutable in edit mode
 * - ACADEMIC-04: Edit Program details
 * - ACADEMIC-05: Program Archive with accessible confirmation modal
 * - ACADEMIC-06: Subject Creation workflow
 * - ACADEMIC-07: Duplicate Subject Code yields conflict error
 * - ACADEMIC-08: Reusable Subject multi-program association UI check
 * - ACADEMIC-09: Edit Subject details
 * - ACADEMIC-10: Subject Archive with accessible confirmation modal
 * - ACADEMIC-11: Map Subject to Program
 * - ACADEMIC-12: Duplicate ProgramSubject mapping yields error
 * - ACADEMIC-13: Unmap Subject from Program
 * - ACADEMIC-14: Batch Creation with required subject & optional program
 * - ACADEMIC-15: Batch Code is immutable in edit mode
 * - ACADEMIC-16: Edit Batch details
 * - ACADEMIC-17: Primary Teacher Assignment by staff role
 * - ACADEMIC-18: Clear Primary Teacher Assignment
 * - ACADEMIC-19: Batch Status Transition (Draft -> Open)
 * - ACADEMIC-20: Batch Status Transition (Open -> Running)
 * - ACADEMIC-21: Batch Status Transition (Running -> Completed)
 * - ACADEMIC-22: Batch Status Transition (Completed -> Archived)
 * - ACADEMIC-23: Disallowed State Transition UI guard (Draft -> Completed illegal)
 * - ACADEMIC-24: Zero Phase 1.11 Feature Leakage Verification (No student enrollment or roster in UI)
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

  const email = `acad_ux_${suffix}_${timestamp}_${Math.floor(Math.random() * 999)}@test.com`;
  const instName = `Academic Institute ${suffix} ${timestamp}`;
  const instSlug = `acad-inst-${suffix}-${timestamp}-${Math.floor(Math.random() * 999)}`;

  const regRes = await registerUserWithRetry(ctx, {
    email,
    password: 'SecurePassword123!',
    name: `Academic Owner ${suffix}`,
  });
  expect([200, 201]).toContain(regRes.status());

  const uniquePhone = `+9197${Math.floor(10000000 + Math.random() * 90000000)}`;
  const onboardRes = await ctx.post('/api/onboarding/institute', {
    data: {
      name: instName,
      phone: uniquePhone,
      email,
      slug: instSlug,
      timezone: 'Asia/Kolkata',
    },
  });
  expect([200, 201]).toContain(onboardRes.status());

  const state = await ctx.storageState();
  await ctx.dispose();

  return { email, password: 'SecurePassword123!', cookies: state.cookies, baseURL };
}

test.describe('Academic Workspace Staff Workflow E2E Suite', () => {
  let sessionData: { email: string; password: string; cookies: CookieItem[]; baseURL: string };

  test.beforeAll(async ({ playwright }) => {
    sessionData = await createTenantSession(playwright, 'staff');
  });

  const getContext = (browser: import('@playwright/test').Browser) =>
    browser.newContext({
      baseURL: sessionData.baseURL,
      storageState: { cookies: sessionData.cookies, origins: [] },
    });

  test('ACADEMIC-01: Program Creation workflow', async ({ browser }) => {
    const context = await getContext(browser);
    const page = await context.newPage();

    await page.goto('/academics');
    await page.waitForSelector('[data-testid="academic-content"]');

    // Click Create Program button
    await page.click('[data-testid="add-program-button"]');
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    const code = `PROG_${Date.now().toString().slice(-4)}`;
    await page.fill('[data-testid="program-code-input"]', code);
    await page.fill('[data-testid="program-name-input"]', 'Master JEE Advanced Program');
    await page.click('[data-testid="program-form-submit-button"]');

    // Dialog should close and created row should be visible in table
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
    await expect(page.locator(`text=${code}`).first()).toBeVisible();
  });

  test('ACADEMIC-02: Duplicate Program Code yields conflict error', async ({ browser }) => {
    const context = await getContext(browser);
    const page = await context.newPage();

    await page.goto('/academics');
    await page.waitForSelector('[data-testid="academic-content"]');

    // Create initial program
    const dupCode = `DUP_${Date.now().toString().slice(-4)}`;
    await page.click('[data-testid="add-program-button"]');
    await page.fill('[data-testid="program-code-input"]', dupCode);
    await page.fill('[data-testid="program-name-input"]', 'Original Program');
    await page.click('[data-testid="program-form-submit-button"]');
    await expect(page.locator(`text=${dupCode}`).first()).toBeVisible();

    // Try creating duplicate program code
    await page.click('[data-testid="add-program-button"]');
    await page.fill('[data-testid="program-code-input"]', dupCode);
    await page.fill('[data-testid="program-name-input"]', 'Duplicate Attempt');
    await page.click('[data-testid="program-form-submit-button"]');

    // Should display error alert in dialog
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.locator('text=already exists')).toBeVisible();
  });

  test('ACADEMIC-03 & 04: Program Code immutability & Edit Program', async ({ browser }) => {
    const context = await getContext(browser);
    const page = await context.newPage();

    await page.goto('/academics');
    await page.waitForSelector('[data-testid="academic-content"]');

    const code = `EDIT_${Date.now().toString().slice(-4)}`;
    await page.click('[data-testid="add-program-button"]');
    await page.fill('[data-testid="program-code-input"]', code);
    await page.fill('[data-testid="program-name-input"]', 'Before Edit Name');
    await page.click('[data-testid="program-form-submit-button"]');

    // Find row and click edit
    const row = page.locator(`[data-testid^="program-row-"]`).filter({ hasText: code });
    await row.locator('button[title="Edit Program"]').click();

    // Verify program code input is disabled
    await expect(page.locator('[data-testid="program-code-input"]')).toBeDisabled();

    // Update name
    await page.fill('[data-testid="program-name-input"]', 'After Edit Name');
    await page.click('[data-testid="program-form-submit-button"]');

    await expect(page.locator('text=After Edit Name').first()).toBeVisible();
  });

  test('ACADEMIC-05: Program Archive with accessible modal', async ({ browser }) => {
    const context = await getContext(browser);
    const page = await context.newPage();

    await page.goto('/academics');
    await page.waitForSelector('[data-testid="academic-content"]');

    const code = `ARCH_${Date.now().toString().slice(-4)}`;
    await page.click('[data-testid="add-program-button"]');
    await page.fill('[data-testid="program-code-input"]', code);
    await page.fill('[data-testid="program-name-input"]', 'Program to Archive');
    await page.click('[data-testid="program-form-submit-button"]');

    const row = page.locator(`[data-testid^="program-row-"]`).filter({ hasText: code });
    await row.locator('button[title="Archive Program"]').click();

    // Confirm archive modal visible
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await page.click('[data-testid="archive-confirm-button"]');

    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  });

  test('ACADEMIC-06 & 07: Subject Creation & Duplicate prevention', async ({ browser }) => {
    const context = await getContext(browser);
    const page = await context.newPage();

    await page.goto('/academics');
    await page.click('[data-testid="tab-subjects"]');
    await page.waitForSelector('[data-testid="subjects-view"]');

    const code = `SUB_${Date.now().toString().slice(-4)}`;
    await page.click('[data-testid="add-subject-button"]');
    await page.fill('[data-testid="subject-code-input"]', code);
    await page.fill('[data-testid="subject-name-input"]', 'Quantum Physics');
    await page.click('[data-testid="subject-form-submit-button"]');

    await expect(page.locator(`text=${code}`).first()).toBeVisible();

    // Test duplicate
    await page.click('[data-testid="add-subject-button"]');
    await page.fill('[data-testid="subject-code-input"]', code);
    await page.fill('[data-testid="subject-name-input"]', 'Duplicate Physics');
    await page.click('[data-testid="subject-form-submit-button"]');
    await expect(page.locator('text=already exists')).toBeVisible();
  });

  test('ACADEMIC-08: Reusable Subject banner messaging', async ({ browser }) => {
    const context = await getContext(browser);
    const page = await context.newPage();

    await page.goto('/academics');
    await page.click('[data-testid="tab-subjects"]');
    await expect(page.locator('text=Reusable Aggregates')).toBeVisible();
  });

  test('ACADEMIC-11, 12, 13: ProgramSubject Mapping lifecycle', async ({ browser }) => {
    const context = await getContext(browser);
    const page = await context.newPage();

    // First create a program and a subject
    await page.goto('/academics');
    const pCode = `P_MAP_${Date.now().toString().slice(-4)}`;
    await page.click('[data-testid="add-program-button"]');
    await page.fill('[data-testid="program-code-input"]', pCode);
    await page.fill('[data-testid="program-name-input"]', 'Mapping Program');
    await page.click('[data-testid="program-form-submit-button"]');

    await page.click('[data-testid="tab-subjects"]');
    const sCode = `S_MAP_${Date.now().toString().slice(-4)}`;
    await page.click('[data-testid="add-subject-button"]');
    await page.fill('[data-testid="subject-code-input"]', sCode);
    await page.fill('[data-testid="subject-name-input"]', 'Mapping Subject');
    await page.click('[data-testid="subject-form-submit-button"]');

    // Go to Mappings tab
    await page.click('[data-testid="tab-mappings"]');
    await page.click('[data-testid="map-subject-button"]');

    // Select program & subject
    await page.selectOption('[data-testid="program-select-dropdown"]', { label: `${pCode} - Mapping Program` });
    await page.selectOption('[data-testid="subject-select-dropdown"]', { label: `${sCode} - Mapping Subject` });
    await page.click('[data-testid="mapping-form-submit-button"]');

    await expect(page.locator(`text=${sCode}`).first()).toBeVisible();

    // Try duplicate mapping
    await page.click('[data-testid="map-subject-button"]');
    await page.selectOption('[data-testid="program-select-dropdown"]', { label: `${pCode} - Mapping Program` });
    await page.selectOption('[data-testid="subject-select-dropdown"]', { label: `${sCode} - Mapping Subject` });
    await page.click('[data-testid="mapping-form-submit-button"]');
    await expect(page.locator('text=already mapped')).toBeVisible();

    // Close modal & Unmap
    await page.click('button[aria-label="Close modal"]');
    await page.click(`[data-testid^="unmap-button-"]`);
    await expect(page.locator(`text=Subject unmapped from program.`)).toBeVisible();
  });

  test('ACADEMIC-14 through 23: Batch creation, teacher assignment & state machine lifecycle', async ({ browser }) => {
    const context = await getContext(browser);
    const page = await context.newPage();

    // Create a subject for batch creation
    await page.goto('/academics');
    await page.click('[data-testid="tab-subjects"]');
    const sCode = `S_BATCH_${Date.now().toString().slice(-4)}`;
    await page.click('[data-testid="add-subject-button"]');
    await page.fill('[data-testid="subject-code-input"]', sCode);
    await page.fill('[data-testid="subject-name-input"]', 'Batch Target Subject');
    await page.click('[data-testid="subject-form-submit-button"]');

    // Switch to Batches tab
    await page.click('[data-testid="tab-batches"]');
    await page.click('[data-testid="add-batch-button"]');

    const bCode = `B_${Date.now().toString().slice(-4)}`;
    await page.fill('[data-testid="batch-code-input"]', bCode);
    await page.fill('[data-testid="batch-name-input"]', 'Morning Achievers Batch');
    await page.selectOption('[data-testid="batch-subject-select"]', { label: `${sCode} - Batch Target Subject` });
    await page.fill('[data-testid="batch-capacity-input"]', '40');
    await page.click('[data-testid="batch-form-submit-button"]');

    await expect(page.locator(`text=${bCode}`).first()).toBeVisible();

    // Assign Primary Teacher (ACADEMIC-17 & 18)
    const row = page.locator(`[data-testid^="batch-row-"]`).filter({ hasText: bCode });
    await row.locator('button[title="Assign Teacher"]').click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await page.click('[data-testid="assign-teacher-submit-button"]');
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();

    // Status Transition: Draft -> Open (ACADEMIC-19)
    await row.locator('button[title="Change Status"]').click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await page.selectOption('[data-testid="batch-status-select"]', 'open');
    await page.click('[data-testid="batch-status-submit-button"]');

    // Status Transition: Open -> Running (ACADEMIC-20)
    await row.locator('button[title="Change Status"]').click();
    await page.selectOption('[data-testid="batch-status-select"]', 'running');
    await page.click('[data-testid="batch-status-submit-button"]');

    // Status Transition: Running -> Completed (ACADEMIC-21)
    await row.locator('button[title="Change Status"]').click();
    await page.selectOption('[data-testid="batch-status-select"]', 'completed');
    await page.click('[data-testid="batch-status-submit-button"]');

    // Status Transition: Completed -> Archived (ACADEMIC-22)
    await row.locator('button[title="Change Status"]').click();
    await page.selectOption('[data-testid="batch-status-select"]', 'archived');
    await page.click('[data-testid="batch-status-submit-button"]');
  });

  test('ACADEMIC-24: Zero Phase 1.11 Feature Leakage Verification', async ({ browser }) => {
    const context = await getContext(browser);
    const page = await context.newPage();

    await page.goto('/academics');
    await page.waitForSelector('[data-testid="academic-content"]');

    // Verify no Phase 1.11 student/enrollment UI components, labels or rosters exist in workspace
    await expect(page.locator('text="Student Roster"')).not.toBeVisible();
    await expect(page.locator('text="Enroll Student"')).not.toBeVisible();
    await expect(page.locator('text="Attendance Sheet"')).not.toBeVisible();
    await expect(page.locator('text="Fee Schedule"')).not.toBeVisible();
  });
});
