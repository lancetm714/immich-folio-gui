import { test, expect } from '@playwright/test';

test.describe('About page', () => {
  test('loads and shows the about content', async ({ page }) => {
    await page.goto('/about');
    const about = page.locator('.about');
    await expect(about).toBeVisible();
  });

  test('has a portrait column', async ({ page }) => {
    await page.goto('/about');
    const portrait = page.locator('.about__portrait-col');
    await expect(portrait).toBeVisible();
  });

  test('has a text column with name', async ({ page }) => {
    await page.goto('/about');
    const name = page.locator('.about__name');
    await expect(name).toBeVisible();
    const text = await name.textContent();
    expect(text).toBeTruthy();
  });
});
