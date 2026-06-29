import { test, expect } from '@playwright/test';

test.describe('Health API', () => {
  test('GET /api/health returns 200 with expected shape', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body).toHaveProperty('status');
  });
});
