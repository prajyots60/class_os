import { test, expect } from '@playwright/test';

test.describe('Application & Database Health Check Endpoint E2E Suite', () => {
  test('returns 200 OK and safe health status payload for GET /api/health', async ({ page }) => {
    const response = await page.request.get('/api/health');

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.status).toBe('ok');
    expect(body.timestamp).toBeDefined();
    expect(body.checks).toBeDefined();
    expect(body.checks.database).toBe('ok');

    // Ensure database URL or credentials are NOT exposed in public response
    const rawText = JSON.stringify(body);
    expect(rawText).not.toContain('postgresql://');
    expect(rawText).not.toContain('password');
  });
});
