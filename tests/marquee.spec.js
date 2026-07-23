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

test('sizes tiles by height with width left to the logo', async ({ page }) => {
  await page.goto(fixtures().marquee);

  const box = await page.locator('.ttt-marquee__image').first().boundingBox();
  expect(box?.height).toBeCloseTo(200, 0);
  // The wide fixture logo is 395x200, so its natural width must survive.
  expect(box?.width).toBeCloseTo(395, 0);
});

test('separates tiles by the gap', async ({ page }) => {
  await page.goto(fixtures().marquee);

  const gap = await page
    .locator('.ttt-marquee__item')
    .first()
    .evaluate((el) => getComputedStyle(el).marginRight);

  expect(gap).toBe('60px');
});

test('fades both edges with a mask', async ({ page }) => {
  await page.goto(fixtures().marquee);

  const mask = await page
    .locator('.ttt-marquee__viewport')
    .evaluate((el) => {
      const cs = getComputedStyle(el);
      return cs.maskImage !== 'none' ? cs.maskImage : cs.webkitMaskImage;
    });

  expect(mask).toContain('linear-gradient');
  expect(mask).toContain('7.692%');
  expect(mask).toContain('92.308%');
});

test('breaks out of its container to full width', async ({ page }) => {
  await page.goto(fixtures().marquee);

  const widths = await page.locator('.ttt-marquee').evaluate((el) => ({
    marquee: el.getBoundingClientRect().width,
    parent: el.parentElement.getBoundingClientRect().width,
  }));

  expect(widths.marquee).toBeGreaterThan(widths.parent);
});

test('leaves a non-full-bleed marquee inside its container', async ({ page }) => {
  await page.goto(fixtures().marqueePlain);

  const widths = await page.locator('.ttt-marquee').evaluate((el) => ({
    marquee: el.getBoundingClientRect().width,
    parent: el.parentElement.getBoundingClientRect().width,
  }));

  expect(widths.marquee).toBeLessThanOrEqual(widths.parent + 1);
});
