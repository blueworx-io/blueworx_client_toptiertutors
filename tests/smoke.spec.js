// @ts-check
const { test, expect } = require('@playwright/test');

// Seeded by tests/global-setup.js, which publishes the pages through WordPress
// itself rather than driving the block editor.
const FIXTURE_URL = () => JSON.parse(String(process.env.TTT_FIXTURES)).shortcode;

test('the site serves its home page', async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.status(), 'home page should respond 200').toBe(200);
  await expect(page).toHaveTitle(/.+/);
});

test('the [toptiertutors] shortcode renders its wrapper', async ({ page }) => {
  await page.goto(FIXTURE_URL());

  const root = page.locator('.ttt-root');
  await expect(root).toHaveCount(1);
  // Stamped from the plugin header, so this also proves the plugin is active
  // and its constants loaded — an inactive plugin leaves the shortcode as text.
  await expect(root).toHaveAttribute('data-ttt-version', /^\d+\.\d+\.\d+$/);
});

test('the plugin stylesheet is enqueued on the front end', async ({ page }) => {
  await page.goto(FIXTURE_URL());

  const href = await page
    .locator('link[rel="stylesheet"][href*="assets/toptiertutors.css"]')
    .first()
    .getAttribute('href');

  expect(href, 'stylesheet should be enqueued').toBeTruthy();
  // Version-stamped so a release busts the cache.
  expect(href).toMatch(/[?&]ver=\d+\.\d+\.\d+/);
});
