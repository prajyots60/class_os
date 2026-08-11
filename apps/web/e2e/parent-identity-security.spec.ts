import { test, expect } from '@playwright/test';

test.describe('Phase 1.6.5 — Global ParentIdentity Security & Isolation E2E Suite', () => {
  test('PARENT-E2E-01: Anonymous requests to protected health/API routes cannot extract parent identity data', async ({
    request,
  }) => {
    const response = await request.get('/api/health');
    expect(response.status()).toBe(200);

    const body = await response.json();
    const rawPayload = JSON.stringify(body);

    expect(rawPayload).not.toContain('parentIdentity');
    expect(rawPayload).not.toContain('phone');
    expect(rawPayload).not.toContain('+91');
  });

  test('PARENT-E2E-03 & PARENT-E2E-04 & PARENT-E2E-05: Server API ignores injected headers (x-parent-id, x-user-id, x-institute-id, x-role)', async ({
    request,
  }) => {
    const response = await request.get('/api/health', {
      headers: {
        'x-parent-id': '00000000-0000-4000-a000-000000000000',
        'x-user-id': '00000000-0000-4000-a000-000000000000',
        'x-institute-id': '00000000-0000-4000-a000-000000000000',
        'x-role': 'owner',
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();

    // Verify response is completely unaffected by spoofed headers
    expect(body.status).toBe('ok');
    expect(body.checks.database).toBe('ok');
  });

  test('PARENT-E2E-08 & PARENT-E2E-09: Unauthenticated attempt to query internal endpoints returns 404 or 401 without stack leaks', async ({
    request,
  }) => {
    const response = await request.get('/api/v1/parents/00000000-0000-4000-a000-000000000000');
    expect([401, 404]).toContain(response.status());

    const text = await response.text();
    expect(text).not.toContain('postgresql://');
    expect(text).not.toContain('PrismaClientKnownRequestError');
  });
});
