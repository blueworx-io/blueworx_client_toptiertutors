// @ts-check
const { test, expect } = require('@playwright/test');

const fixtures = () => JSON.parse(String(process.env.TTT_FIXTURES));

test('renders one item per selected logo, with alt text', async ({ page }) => {
  await page.goto(fixtures().marquee);

  const items = page.locator('.ttt-marquee__item');
  await expect(items).toHaveCount(5);
  await expect(page.locator('.ttt-marquee__image').first()).toHaveAttribute('alt', 'Wide school logo');
});

test('carries its settings as data attributes', async ({ page }) => {
  await page.goto(fixtures().marquee);

  const root = page.locator('.ttt-marquee');
  await expect(root).toHaveAttribute('data-speed', '60');
  await expect(root).toHaveAttribute('data-direction', 'left');
  await expect(root).toHaveAttribute('data-pause-on-hover', '1');
  await expect(root).toHaveAttribute('data-full-bleed', '1');
});

test('switches on the shortcode attributes it is given', async ({ page }) => {
  await page.goto(fixtures().marqueePlain);

  const root = page.locator('.ttt-marquee');
  await expect(root).toHaveAttribute('data-pause-on-hover', '0');
  await expect(root).toHaveAttribute('data-full-bleed', '0');
});

test('renders a viewport wrapping a list track', async ({ page }) => {
  await page.goto(fixtures().marquee);

  await expect(page.locator('.ttt-marquee > .ttt-marquee__viewport > ul.ttt-marquee__track')).toHaveCount(1);
});
