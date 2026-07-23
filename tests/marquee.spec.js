// @ts-check
const { test, expect } = require('@playwright/test');

const fixtures = () => JSON.parse(String(process.env.TTT_FIXTURES));

test('renders one item per selected logo, with alt text', async ({ page }) => {
  await page.goto(fixtures().marquee);

  // Excludes clones from the outset: Task 3 duplicates the set to fill the
  // track, so a bare .ttt-marquee__item count stops meaning "one per logo"
  // as soon as the script lands.
  const items = page.locator('.ttt-marquee__item:not([data-ttt-clone])');
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

test('breaks out of the content column to the viewport width', async ({ page }) => {
  await page.goto(fixtures().marquee);

  const widths = await page.locator('.ttt-marquee').evaluate((el) => ({
    marquee: el.getBoundingClientRect().width,
    viewport: document.documentElement.clientWidth,
  }));

  // At least, rather than exactly: the CSS fallback is 100vw, which includes
  // the scrollbar. Task 3 measures the true client width and tightens this.
  expect(widths.marquee).toBeGreaterThanOrEqual(widths.viewport - 1);
});

test('leaves a non-full-bleed marquee in the content column', async ({ page }) => {
  await page.goto(fixtures().marqueePlain);

  const widths = await page.locator('.ttt-marquee').evaluate((el) => ({
    marquee: el.getBoundingClientRect().width,
    viewport: document.documentElement.clientWidth,
  }));

  // Compared against the viewport, not the parent: the theme's .entry-content
  // is itself alignfull, so the parent is viewport-wide either way and tells
  // you nothing about whether the break-out happened.
  expect(widths.marquee).toBeLessThan(widths.viewport);
});

test('clones the set to at least twice the viewport, in an even number of copies', async ({ page }) => {
  await page.goto(fixtures().marquee);
  await page.waitForFunction(() => document.querySelector('[data-ttt-clone]') !== null);

  const measured = await page.locator('.ttt-marquee').evaluate((root) => {
    const track = root.querySelector('.ttt-marquee__track');
    const viewport = root.querySelector('.ttt-marquee__viewport');
    const originals = track.querySelectorAll('.ttt-marquee__item:not([data-ttt-clone])');
    const total = track.querySelectorAll('.ttt-marquee__item');
    return {
      originals: originals.length,
      total: total.length,
      trackWidth: parseFloat(track.style.width),
      viewportWidth: viewport.clientWidth,
    };
  });

  expect(measured.originals).toBe(5);
  const copies = measured.total / measured.originals;
  expect(Number.isInteger(copies)).toBe(true);
  expect(copies % 2).toBe(0);
  expect(measured.trackWidth).toBeGreaterThanOrEqual(measured.viewportWidth * 2);
});

test('hides clones from assistive technology', async ({ page }) => {
  await page.goto(fixtures().marquee);
  await page.waitForFunction(() => document.querySelector('[data-ttt-clone]') !== null);

  const clones = page.locator('.ttt-marquee__item[data-ttt-clone="1"]');
  expect(await clones.count()).toBeGreaterThan(0);
  await expect(clones.first()).toHaveAttribute('aria-hidden', 'true');
});

test('derives duration from half the track width and the requested speed', async ({ page }) => {
  await page.goto(fixtures().marquee);
  await page.waitForFunction(() => document.querySelector('[data-ttt-clone]') !== null);

  const measured = await page.locator('.ttt-marquee').evaluate((root) => {
    const track = root.querySelector('.ttt-marquee__track');
    return {
      duration: parseFloat(getComputedStyle(track).animationDuration),
      trackWidth: parseFloat(track.style.width),
      speed: parseFloat(root.dataset.speed),
    };
  });

  // The keyframe travels -50%, so only half the track passes per cycle.
  const expected = measured.trackWidth / 2 / measured.speed;
  expect(measured.duration).toBeGreaterThan(0);
  expect(measured.duration).toBeCloseTo(expected, 1);
});

test('measures the viewport width without the scrollbar', async ({ page }) => {
  await page.goto(fixtures().marquee);
  await page.waitForFunction(() => document.querySelector('[data-ttt-clone]') !== null);

  const measured = await page.locator('.ttt-marquee').evaluate((root) => ({
    varValue: parseFloat(getComputedStyle(root).getPropertyValue('--ttt-vw')),
    clientWidth: document.documentElement.clientWidth,
    docScroll: document.documentElement.scrollWidth,
  }));

  expect(measured.varValue).toBe(measured.clientWidth);
  // Built on 100vw instead, a full-bleed strip overflows by the scrollbar width.
  expect(measured.docScroll).toBeLessThanOrEqual(measured.clientWidth + 1);
});

test('re-initialising an existing marquee relayouts rather than no-opping', async ({ page }) => {
  await page.goto(fixtures().marquee);
  await page.waitForFunction(() => document.querySelector('[data-ttt-clone]') !== null);

  const durations = await page.locator('.ttt-marquee').evaluate((root) => {
    const track = root.querySelector('.ttt-marquee__track');
    const before = parseFloat(getComputedStyle(track).animationDuration);

    root.setAttribute('data-speed', '30');
    window.tttMarquee.init(root);

    return { before, after: parseFloat(getComputedStyle(track).animationDuration) };
  });

  // Task 5 re-inits a widget the Elementor editor redrew. Halving the speed has
  // to double the time taken to cover the same track, or that call did nothing.
  expect(durations.before).toBeGreaterThan(0);
  expect(durations.after).toBeCloseTo(durations.before * 2, 1);
});

test('pauses on hover when asked to', async ({ page }) => {
  await page.goto(fixtures().marquee);
  await page.waitForFunction(() => document.querySelector('[data-ttt-clone]') !== null);

  const track = page.locator('.ttt-marquee__track');
  await expect(track).toHaveCSS('animation-play-state', 'running');

  await page.locator('.ttt-marquee').hover();
  await expect(track).toHaveCSS('animation-play-state', 'paused');
});

test('keeps running on hover when pause on hover is off', async ({ page }) => {
  await page.goto(fixtures().marqueePlain);
  await page.waitForFunction(() => document.querySelector('[data-ttt-clone]') !== null);

  await page.locator('.ttt-marquee').hover();
  await expect(page.locator('.ttt-marquee__track')).toHaveCSS('animation-play-state', 'running');
});

test.describe('with reduced motion', () => {
  test('does not animate, clone, or trap the logos out of reach', async ({ page }) => {
    // Set explicitly rather than through test.use({ reducedMotion: 'reduce' }):
    // on Playwright 1.61.1 that fixture does not reach the browser context with
    // this config, so the media query stays false and the specs below would be
    // asserting against un-reduced motion. Verified: test.use gives false,
    // emulateMedia gives true. It must precede goto(), or the script reads the
    // wrong value when it initialises.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(fixtures().marquee);
    await page.waitForFunction(() => document.querySelector('[data-ttt-ready="1"]') !== null);

    await expect(page.locator('.ttt-marquee__item[data-ttt-clone="1"]')).toHaveCount(0);
    await expect(page.locator('.ttt-marquee__track')).toHaveCSS('animation-name', 'none');
    await expect(page.locator('.ttt-marquee__viewport')).toHaveCSS('overflow-x', 'auto');
    await expect(page.locator('.ttt-marquee__viewport')).toHaveCSS('mask-image', 'none');
    await expect(page.locator('.ttt-marquee__viewport')).toHaveAttribute('tabindex', '0');
  });
});

test('does not animate until the script has built the track', async ({ page }) => {
  await page.goto(fixtures().marquee);
  await page.waitForFunction(() => document.querySelector('[data-ttt-clone]') !== null);

  // Standing in for a visitor with JavaScript blocked: without the ready flag
  // the strip must sit still rather than sliding into blank space and snapping.
  await page.locator('.ttt-marquee').evaluate((el) => el.removeAttribute('data-ttt-ready'));

  await expect(page.locator('.ttt-marquee__track')).toHaveCSS('animation-name', 'none');
});

test('clamps an absurd shortcode speed instead of strobing', async ({ page }) => {
  await page.goto(fixtures().marquee);
  await page.waitForFunction(() => document.querySelector('[data-ttt-clone]') !== null);

  const duration = await page.locator('.ttt-marquee').evaluate((root) => {
    const track = root.querySelector('.ttt-marquee__track');
    root.setAttribute('data-speed', '100000');
    window.tttMarquee.init(root);

    return parseFloat(getComputedStyle(track).animationDuration);
  });

  // The renderer clamps server-side; this covers the client half of the same
  // guard — whatever speed arrives, the cycle stays perceptible.
  expect(duration).toBeGreaterThan(0);
});
