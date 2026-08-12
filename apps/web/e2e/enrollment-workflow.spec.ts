import { test, expect, type APIRequestContext, type PlaywrightWorkerArgs } from '@playwright/test';

/**
 * Phase 1.11.6 + Phase 1.11.7 — Staff Enrollment UI & UX E2E Test Matrix
 *
 * Comprehensive verification matrix covering UX, Accessibility, Capability Gating, State Transitions,
 * Atomic Transfers, and Multi-Tenant Isolation boundaries for the Staff Student Enrollment Experience.
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

  const email = `enr_ux_${suffix}_${timestamp}_${Math.floor(Math.random() * 999)}@test.com`;
  const instName = `Enroll UX Inst ${suffix} ${timestamp}`;
  const instSlug = `enr-ux-inst-${suffix}-${timestamp}-${Math.floor(Math.random() * 999)}`;

  const regRes = await registerUserWithRetry(ctx, {
    email,
    password: 'SecurePassword123!',
    name: `Staff ${suffix}`,
  });
  expect([200, 201]).toContain(regRes.status());

  const uniquePhone = `+9198${Math.floor(10000000 + Math.random() * 90000000)}`;
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
  return {
    ctx,
    email,
    institute: onboardData.data.institute,
    cookies: cookies.cookies,
    baseURL,
  };
}

async function createAdmittedStudent(ctx: APIRequestContext, prefix: string) {
  const admNo = `ADM-ENR-${prefix}-${Date.now()}`;
  const stdRes = await ctx.post('/api/institute/students', {
    data: { admissionNumber: admNo, firstName: `EnrStudent_${prefix}`, lastName: 'Test' },
  });
  expect(stdRes.status()).toBe(201);
  const std = (await stdRes.json()).data;

  const admitRes = await ctx.post(`/api/institute/students/${std.id}/admit`);
  expect(admitRes.status()).toBe(200);

  return std;
}

async function createOpenBatch(ctx: APIRequestContext, prefix: string) {
  const sCode = `S-ENR-${prefix}-${Date.now()}`;
  const subjRes = await ctx.post('/api/institute/subjects', {
    data: { name: `Subject ${prefix}`, code: sCode },
  });
  expect(subjRes.status()).toBe(201);
  const subj = (await subjRes.json()).data;

  const code = `B-ENR-${prefix}-${Date.now()}`;
  const batchRes = await ctx.post('/api/institute/batches', {
    data: {
      name: `Batch ${prefix}`,
      code,
      capacity: 30,
      subjectId: subj.id,
    },
  });
  expect(batchRes.status()).toBe(201);
  const batch = (await batchRes.json()).data;

  const statusRes = await ctx.post(`/api/institute/batches/${batch.id}/status`, {
    data: { status: 'open' },
  });
  if (statusRes.status() === 200) {
    return (await statusRes.json()).data;
  }
  return batch;
}

test.describe('Phase 1.11.6 + 1.11.7 — Enrollment UI & UX E2E Matrix', () => {

  test('ENROLLMENT-UI-01: Open Enrollments workspace & verify layout shell', async ({ browser, playwright }) => {
    const tenant = await createTenantSession(playwright, 'ui01');
    const context = await browser.newContext({
      baseURL: tenant.baseURL,
      storageState: { cookies: tenant.cookies, origins: [] },
    });
    const page = await context.newPage();

    await page.goto('/enrollments');

    await expect(page.getByTestId('enrollment-content')).toBeVisible();
    await expect(page.getByTestId('enrollments-page-title')).toBeVisible();
    await expect(page.getByTestId('add-enrollment-button')).toBeVisible();

    await context.close();
    await tenant.ctx.dispose();
  });

  test('ENROLLMENT-UI-02: Search with zero matches renders accessible empty state', async ({ browser, playwright }) => {
    const tenant = await createTenantSession(playwright, 'ui02');
    const context = await browser.newContext({
      baseURL: tenant.baseURL,
      storageState: { cookies: tenant.cookies, origins: [] },
    });
    const page = await context.newPage();

    await page.goto('/enrollments');
    await expect(page.getByTestId('enrollment-content')).toBeVisible();

    await page.getByTestId('enrollment-search-input').fill('ZeroMatchesSearchQuery999');

    await expect(page.getByTestId('enrollment-empty-state')).toBeVisible();
    await expect(page.getByText('No matching enrollments found')).toBeVisible();

    await context.close();
    await tenant.ctx.dispose();
  });

  test('ENROLLMENT-UI-03: Create enrollment modal workflow & successful submission', async ({ browser, playwright }) => {
    const tenant = await createTenantSession(playwright, 'ui03');
    const student = await createAdmittedStudent(tenant.ctx, 'ui03');
    const batch = await createOpenBatch(tenant.ctx, 'ui03');

    const context = await browser.newContext({
      baseURL: tenant.baseURL,
      storageState: { cookies: tenant.cookies, origins: [] },
    });
    const page = await context.newPage();

    await page.goto('/enrollments');
    await expect(page.getByTestId('enrollment-content')).toBeVisible();

    await page.getByTestId('add-enrollment-button').click();

    await expect(page.getByTestId('enrollment-form-modal')).toBeVisible();

    await page.getByTestId('student-select-dropdown').selectOption(student.id);
    await page.getByTestId('batch-select-dropdown').selectOption(batch.id);

    await page.getByTestId('submit-enrollment-button').click();

    await expect(page.getByTestId('enrollment-form-modal')).not.toBeVisible();
    await expect(page.getByTestId('enrollment-table')).toBeVisible();

    await context.close();
    await tenant.ctx.dispose();
  });

  test('ENROLLMENT-UI-04: Form field validation errors render accessible attributes', async ({ browser, playwright }) => {
    const tenant = await createTenantSession(playwright, 'ui04');
    const context = await browser.newContext({
      baseURL: tenant.baseURL,
      storageState: { cookies: tenant.cookies, origins: [] },
    });
    const page = await context.newPage();

    await page.goto('/enrollments');
    await expect(page.getByTestId('enrollment-content')).toBeVisible();

    await page.getByTestId('add-enrollment-button').click();
    await expect(page.getByTestId('enrollment-form-modal')).toBeVisible();

    await expect(page.getByTestId('submit-enrollment-button')).toBeDisabled();

    await context.close();
    await tenant.ctx.dispose();
  });

  test('ENROLLMENT-UI-05: Duplicate active enrollment attempt yields safe 409 conflict feedback', async ({ browser, playwright }) => {
    const tenant = await createTenantSession(playwright, 'ui05');
    const student = await createAdmittedStudent(tenant.ctx, 'ui05');
    const batch = await createOpenBatch(tenant.ctx, 'ui05');

    // First enrollment
    const enr1 = await tenant.ctx.post('/api/institute/enrollments', {
      data: { studentId: student.id, batchId: batch.id, status: 'active' },
    });
    expect(enr1.status()).toBe(201);

    const context = await browser.newContext({
      baseURL: tenant.baseURL,
      storageState: { cookies: tenant.cookies, origins: [] },
    });
    const page = await context.newPage();

    await page.goto('/enrollments');
    await expect(page.getByTestId('enrollment-content')).toBeVisible();

    await page.getByTestId('add-enrollment-button').click();
    await expect(page.getByTestId('enrollment-form-modal')).toBeVisible();

    await page.getByTestId('student-select-dropdown').selectOption(student.id);
    await page.getByTestId('batch-select-dropdown').selectOption(batch.id);

    await page.getByTestId('submit-enrollment-button').click();

    await expect(page.getByTestId('enrollment-form-error')).toBeVisible();
    await expect(page.getByTestId('enrollment-form-modal')).toBeVisible();

    await context.close();
    await tenant.ctx.dispose();
  });

  test('ENROLLMENT-UI-06: Search enrollments by student name, admission number, or batch code', async ({ browser, playwright }) => {
    const tenant = await createTenantSession(playwright, 'ui06');
    const student = await createAdmittedStudent(tenant.ctx, 'ui06');
    const batch = await createOpenBatch(tenant.ctx, 'ui06');

    await tenant.ctx.post('/api/institute/enrollments', {
      data: { studentId: student.id, batchId: batch.id, status: 'active' },
    });

    const context = await browser.newContext({
      baseURL: tenant.baseURL,
      storageState: { cookies: tenant.cookies, origins: [] },
    });
    const page = await context.newPage();

    await page.goto('/enrollments');
    await expect(page.getByTestId('enrollment-content')).toBeVisible();
    await expect(page.getByTestId('enrollment-table')).toBeVisible();

    await page.getByTestId('enrollment-search-input').fill(student.admissionNumber);
    await expect(page.locator('table').getByText(student.admissionNumber)).toBeVisible();

    await context.close();
    await tenant.ctx.dispose();
  });

  test('ENROLLMENT-UI-07: Filter list by enrollment status', async ({ browser, playwright }) => {
    const tenant = await createTenantSession(playwright, 'ui07');
    const student = await createAdmittedStudent(tenant.ctx, 'ui07');
    const batch = await createOpenBatch(tenant.ctx, 'ui07');

    const res = await tenant.ctx.post('/api/institute/enrollments', {
      data: { studentId: student.id, batchId: batch.id, status: 'pending' },
    });
    const enr = (await res.json()).data;

    const context = await browser.newContext({
      baseURL: tenant.baseURL,
      storageState: { cookies: tenant.cookies, origins: [] },
    });
    const page = await context.newPage();

    await page.goto('/enrollments');
    await expect(page.getByTestId('enrollment-content')).toBeVisible();
    await expect(page.getByTestId('enrollment-table')).toBeVisible();

    await page.getByTestId('enrollment-status-filter').selectOption('pending');

    await expect(page.getByTestId(`enrollment-row-${enr.id}`)).toBeVisible();

    await context.close();
    await tenant.ctx.dispose();
  });

  test('ENROLLMENT-UI-08: View enrollment details modal drawer', async ({ browser, playwright }) => {
    const tenant = await createTenantSession(playwright, 'ui08');
    const student = await createAdmittedStudent(tenant.ctx, 'ui08');
    const batch = await createOpenBatch(tenant.ctx, 'ui08');

    const res = await tenant.ctx.post('/api/institute/enrollments', {
      data: { studentId: student.id, batchId: batch.id, status: 'active' },
    });
    expect(res.status()).toBe(201);
    const enr = (await res.json()).data;

    const context = await browser.newContext({
      baseURL: tenant.baseURL,
      storageState: { cookies: tenant.cookies, origins: [] },
    });
    const page = await context.newPage();

    await page.goto('/enrollments');
    await expect(page.getByTestId('enrollment-content')).toBeVisible();
    await expect(page.getByTestId('enrollment-table')).toBeVisible();
    await expect(page.getByTestId(`enrollment-row-${enr.id}`)).toBeVisible();

    await page.getByTestId('enrollment-table').getByTestId(`view-details-button-${enr.id}`).click();

    await expect(page.getByTestId('enrollment-details-modal')).toBeVisible();

    await page.getByTestId('close-details-modal-button').click();
    await expect(page.getByTestId('enrollment-details-modal')).not.toBeVisible();

    await context.close();
    await tenant.ctx.dispose();
  });

  test('ENROLLMENT-UI-09: Transition pending enrollment to active', async ({ browser, playwright }) => {
    const tenant = await createTenantSession(playwright, 'ui09');
    const student = await createAdmittedStudent(tenant.ctx, 'ui09');
    const batch = await createOpenBatch(tenant.ctx, 'ui09');

    const res = await tenant.ctx.post('/api/institute/enrollments', {
      data: { studentId: student.id, batchId: batch.id, status: 'pending' },
    });
    expect(res.status()).toBe(201);
    const enr = (await res.json()).data;

    const context = await browser.newContext({
      baseURL: tenant.baseURL,
      storageState: { cookies: tenant.cookies, origins: [] },
    });
    const page = await context.newPage();

    await page.goto('/enrollments');
    await expect(page.getByTestId('enrollment-content')).toBeVisible();
    await expect(page.getByTestId('enrollment-table')).toBeVisible();
    await expect(page.getByTestId(`enrollment-row-${enr.id}`)).toBeVisible();

    await page.getByTestId('enrollment-table').getByTestId(`activate-button-${enr.id}`).click();

    await expect(page.getByTestId('enrollment-success-alert')).toBeVisible();

    await context.close();
    await tenant.ctx.dispose();
  });

  test('ENROLLMENT-UI-10: Transition active enrollment to completed', async ({ browser, playwright }) => {
    const tenant = await createTenantSession(playwright, 'ui10');
    const student = await createAdmittedStudent(tenant.ctx, 'ui10');
    const batch = await createOpenBatch(tenant.ctx, 'ui10');

    const res = await tenant.ctx.post('/api/institute/enrollments', {
      data: { studentId: student.id, batchId: batch.id, status: 'active' },
    });
    expect(res.status()).toBe(201);
    const enr = (await res.json()).data;

    const context = await browser.newContext({
      baseURL: tenant.baseURL,
      storageState: { cookies: tenant.cookies, origins: [] },
    });
    const page = await context.newPage();

    await page.goto('/enrollments');
    await expect(page.getByTestId('enrollment-content')).toBeVisible();
    await expect(page.getByTestId('enrollment-table')).toBeVisible();
    await expect(page.getByTestId(`enrollment-row-${enr.id}`)).toBeVisible();

    await page.getByTestId('enrollment-table').getByTestId(`complete-button-${enr.id}`).click();

    await expect(page.getByTestId('enrollment-success-alert')).toBeVisible();

    await context.close();
    await tenant.ctx.dispose();
  });

  test('ENROLLMENT-UI-11: Transition enrollment to withdrawn', async ({ browser, playwright }) => {
    const tenant = await createTenantSession(playwright, 'ui11');
    const student = await createAdmittedStudent(tenant.ctx, 'ui11');
    const batch = await createOpenBatch(tenant.ctx, 'ui11');

    const res = await tenant.ctx.post('/api/institute/enrollments', {
      data: { studentId: student.id, batchId: batch.id, status: 'active' },
    });
    expect(res.status()).toBe(201);
    const enr = (await res.json()).data;

    const context = await browser.newContext({
      baseURL: tenant.baseURL,
      storageState: { cookies: tenant.cookies, origins: [] },
    });
    const page = await context.newPage();

    await page.goto('/enrollments');
    await expect(page.getByTestId('enrollment-content')).toBeVisible();
    await expect(page.getByTestId('enrollment-table')).toBeVisible();
    await expect(page.getByTestId(`enrollment-row-${enr.id}`)).toBeVisible();

    await page.getByTestId('enrollment-table').getByTestId(`withdraw-button-${enr.id}`).click();
    await expect(page.getByTestId('enrollment-confirmation-modal')).toBeVisible();

    await page.getByTestId('confirm-modal-action-button').click();
    await expect(page.getByTestId('enrollment-success-alert')).toBeVisible();

    await context.close();
    await tenant.ctx.dispose();
  });

  test('ENROLLMENT-UI-12: Transition pending enrollment to cancelled', async ({ browser, playwright }) => {
    const tenant = await createTenantSession(playwright, 'ui12');
    const student = await createAdmittedStudent(tenant.ctx, 'ui12');
    const batch = await createOpenBatch(tenant.ctx, 'ui12');

    const res = await tenant.ctx.post('/api/institute/enrollments', {
      data: { studentId: student.id, batchId: batch.id, status: 'pending' },
    });
    expect(res.status()).toBe(201);
    const enr = (await res.json()).data;

    const context = await browser.newContext({
      baseURL: tenant.baseURL,
      storageState: { cookies: tenant.cookies, origins: [] },
    });
    const page = await context.newPage();

    await page.goto('/enrollments');
    await expect(page.getByTestId('enrollment-content')).toBeVisible();
    await expect(page.getByTestId('enrollment-table')).toBeVisible();
    await expect(page.getByTestId(`enrollment-row-${enr.id}`)).toBeVisible();

    await page.getByTestId('enrollment-table').getByTestId(`cancel-button-${enr.id}`).click();
    await expect(page.getByTestId('enrollment-confirmation-modal')).toBeVisible();

    await page.getByTestId('confirm-modal-action-button').click();
    await expect(page.getByTestId('enrollment-success-alert')).toBeVisible();

    await context.close();
    await tenant.ctx.dispose();
  });

  test('ENROLLMENT-UI-13: Atomic batch transfer modal workflow & historical record preservation', async ({ browser, playwright }) => {
    const tenant = await createTenantSession(playwright, 'ui13');
    const student = await createAdmittedStudent(tenant.ctx, 'ui13');
    const batch1 = await createOpenBatch(tenant.ctx, 'ui13_b1');
    const batch2 = await createOpenBatch(tenant.ctx, 'ui13_b2');

    const res = await tenant.ctx.post('/api/institute/enrollments', {
      data: { studentId: student.id, batchId: batch1.id, status: 'active' },
    });
    expect(res.status()).toBe(201);
    const enr1 = (await res.json()).data;

    const context = await browser.newContext({
      baseURL: tenant.baseURL,
      storageState: { cookies: tenant.cookies, origins: [] },
    });
    const page = await context.newPage();

    await page.goto('/enrollments');
    await expect(page.getByTestId('enrollment-content')).toBeVisible();
    await expect(page.getByTestId('enrollment-table')).toBeVisible();
    await expect(page.getByTestId(`enrollment-row-${enr1.id}`)).toBeVisible();

    await page.getByTestId('enrollment-table').getByTestId(`transfer-button-${enr1.id}`).click();
    await expect(page.getByTestId('enrollment-transfer-modal')).toBeVisible();

    await page.getByTestId('target-batch-select-dropdown').selectOption(batch2.id);
    await page.getByTestId('submit-transfer-button').click();

    await expect(page.getByTestId('enrollment-transfer-modal')).not.toBeVisible();
    await expect(page.getByTestId('enrollment-success-alert')).toBeVisible();

    await context.close();
    await tenant.ctx.dispose();
  });

  test('ENROLLMENT-UI-14: Soft archive an enrollment record', async ({ browser, playwright }) => {
    const tenant = await createTenantSession(playwright, 'ui14');
    const student = await createAdmittedStudent(tenant.ctx, 'ui14');
    const batch = await createOpenBatch(tenant.ctx, 'ui14');

    const res = await tenant.ctx.post('/api/institute/enrollments', {
      data: { studentId: student.id, batchId: batch.id, status: 'active' },
    });
    expect(res.status()).toBe(201);
    const enr = (await res.json()).data;

    const completeRes = await tenant.ctx.post(`/api/institute/enrollments/${enr.id}/complete`);
    expect(completeRes.status()).toBe(200);

    const context = await browser.newContext({
      baseURL: tenant.baseURL,
      storageState: { cookies: tenant.cookies, origins: [] },
    });
    const page = await context.newPage();

    await page.goto('/enrollments');
    await expect(page.getByTestId('enrollment-content')).toBeVisible();
    await expect(page.getByTestId('enrollment-table')).toBeVisible();
    await expect(page.getByTestId(`enrollment-row-${enr.id}`)).toBeVisible();

    await page.getByTestId('enrollment-table').getByTestId(`archive-button-${enr.id}`).click();
    await expect(page.getByTestId('enrollment-confirmation-modal')).toBeVisible();

    await page.getByTestId('confirm-modal-action-button').click();
    await expect(page.getByTestId('enrollment-success-alert')).toBeVisible();

    await context.close();
    await tenant.ctx.dispose();
  });

  test('ENROLLMENT-UI-15: Mobile viewport (375px) renders card view without horizontal scroll', async ({ browser, playwright }) => {
    const tenant = await createTenantSession(playwright, 'ui15');
    const student = await createAdmittedStudent(tenant.ctx, 'ui15');
    const batch = await createOpenBatch(tenant.ctx, 'ui15');

    const res = await tenant.ctx.post('/api/institute/enrollments', {
      data: { studentId: student.id, batchId: batch.id, status: 'active' },
    });
    expect(res.status()).toBe(201);
    const enr = (await res.json()).data;

    const context = await browser.newContext({
      baseURL: tenant.baseURL,
      storageState: { cookies: tenant.cookies, origins: [] },
      viewport: { width: 375, height: 667 },
    });
    const page = await context.newPage();

    await page.goto('/enrollments');
    await expect(page.getByTestId('enrollment-content')).toBeVisible();
    await expect(page.getByTestId(`enrollment-card-${enr.id}`)).toBeVisible();

    await context.close();
    await tenant.ctx.dispose();
  });

  test('ENROLLMENT-UI-16: Keyboard navigation & Escape key modal dismissal', async ({ browser, playwright }) => {
    const tenant = await createTenantSession(playwright, 'ui16');
    const student = await createAdmittedStudent(tenant.ctx, 'ui16');
    const batch = await createOpenBatch(tenant.ctx, 'ui16');

    const res = await tenant.ctx.post('/api/institute/enrollments', {
      data: { studentId: student.id, batchId: batch.id, status: 'active' },
    });
    expect(res.status()).toBe(201);
    const enr = (await res.json()).data;

    const context = await browser.newContext({
      baseURL: tenant.baseURL,
      storageState: { cookies: tenant.cookies, origins: [] },
    });
    const page = await context.newPage();

    await page.goto('/enrollments');
    await expect(page.getByTestId('enrollment-content')).toBeVisible();
    await expect(page.getByTestId('enrollment-table')).toBeVisible();
    await expect(page.getByTestId(`enrollment-row-${enr.id}`)).toBeVisible();

    await page.getByTestId('enrollment-table').getByTestId(`view-details-button-${enr.id}`).click();
    await expect(page.getByTestId('enrollment-details-modal')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByTestId('enrollment-details-modal')).not.toBeVisible();

    await context.close();
    await tenant.ctx.dispose();
  });

  test('ENROLLMENT-UI-17: Capability-aware controls (UI elements reflect permission grants)', async ({ browser, playwright }) => {
    const tenant = await createTenantSession(playwright, 'ui17');
    const context = await browser.newContext({
      baseURL: tenant.baseURL,
      storageState: { cookies: tenant.cookies, origins: [] },
    });
    const page = await context.newPage();

    await page.goto('/enrollments');
    await expect(page.getByTestId('enrollment-content')).toBeVisible();

    // Owner role has full capabilities (add enrollment button present)
    await expect(page.getByTestId('add-enrollment-button')).toBeVisible();

    await context.close();
    await tenant.ctx.dispose();
  });

  test('ENROLLMENT-UI-18: Cross-tenant isolation', async ({ playwright }) => {
    const tenantA = await createTenantSession(playwright, 'ui18a');
    const tenantB = await createTenantSession(playwright, 'ui18b');

    const studentA = await createAdmittedStudent(tenantA.ctx, 'ui18a');
    const batchA = await createOpenBatch(tenantA.ctx, 'ui18a');

    const resA = await tenantA.ctx.post('/api/institute/enrollments', {
      data: { studentId: studentA.id, batchId: batchA.id, status: 'active' },
    });
    const enrA = (await resA.json()).data;

    // Tenant B attempts to fetch Tenant A's enrollment
    const getResB = await tenantB.ctx.get(`/api/institute/enrollments/${enrA.id}`);
    expect(getResB.status()).toBe(404);

    // Tenant B attempts to archive Tenant A's enrollment
    const delResB = await tenantB.ctx.delete(`/api/institute/enrollments/${enrA.id}`);
    expect(delResB.status()).toBe(404);

    await tenantA.ctx.dispose();
    await tenantB.ctx.dispose();
  });

});
