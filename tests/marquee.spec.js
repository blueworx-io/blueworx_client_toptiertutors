// @ts-check
const { test, expect } = require('@playwright/test');

const fixtures = () => JSON.parse(String(process.env.TTT_FIXTURES));

test('renders one item per selected logo, with alt text', async ({ page }) => {
  await page.goto(fixtures().marquee);

  // Excludes clones from the outset: the script duplicates the set to fill
  // the track, so a bare .ttt-marquee__item count stops meaning "one per
  // logo" as soon as it lands.
  const items = page.locator('.ttt-marquee__item:not([data-ttt-clone])');
  await expect(items).toHaveCount(5);
  await expect(page.locator('.ttt-marquee__image').first()).toHaveAttribute('alt', 'Wide school logo');
});

test('carries its settings as data attributes', async ({ page }) => {
  await page.goto(fixtures().marquee);

  // The shortcode leaves step_ms/pause_ms/arc unset, so this also covers the
  // renderer's own defaults reaching the markup.
  const root = page.locator('.ttt-marquee');
  await expect(root).toHaveAttribute('data-step-ms', '600');
  await expect(root).toHaveAttribute('data-pause-ms', '2000');
  await expect(root).toHaveAttribute('data-arc', '24');
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
  // the scrollbar, before JS tightens it via --ttt-vw.
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

test('clones the set to at least twice the viewport', async ({ page }) => {
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
      // Real rotation recycles tiles rather than shifting a percentage, so —
      // unlike the old marquee — there is no need for an even copy count.
      trackWidth: track.getBoundingClientRect().width,
      viewportWidth: viewport.clientWidth,
    };
  });

  expect(measured.originals).toBe(5);
  expect(measured.total).toBeGreaterThan(measured.originals);
  expect(measured.total % measured.originals).toBe(0);
  expect(measured.trackWidth).toBeGreaterThanOrEqual(measured.viewportWidth * 2);
});

test('hides clones from assistive technology', async ({ page }) => {
  await page.goto(fixtures().marquee);
  await page.waitForFunction(() => document.querySelector('[data-ttt-clone]') !== null);

  const clones = page.locator('.ttt-marquee__item[data-ttt-clone="1"]');
  expect(await clones.count()).toBeGreaterThan(0);
  await expect(clones.first()).toHaveAttribute('aria-hidden', 'true');
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

  const counts = await page.locator('.ttt-marquee').evaluate((root) => {
    const track = root.querySelector('.ttt-marquee__track');
    const viewport = root.querySelector('.ttt-marquee__viewport');
    const before = track.querySelectorAll('.ttt-marquee__item').length;

    // Force the viewport far wider than the page really is. A no-op init()
    // would leave the clone count exactly where it was.
    viewport.style.width = '8000px';
    window.tttMarquee.init(root);

    return { before, after: track.querySelectorAll('.ttt-marquee__item').length };
  });

  // Covering an 8000px viewport twice over takes many more copies than the
  // original layout did; init() must have re-cloned rather than doing
  // nothing to a track it had already marked ready.
  expect(counts.after).toBeGreaterThan(counts.before);
});

test('after one step, the item that was leading moves to the end of the track', async ({ page }) => {
  await page.goto(fixtures().marqueeStep);

  const track = page.locator('.ttt-marquee__track');
  await track.evaluate((el) => {
    window.__tttLeading = el.firstElementChild;
  });

  await page.waitForFunction(() => {
    const el = document.querySelector('.ttt-marquee__track');
    return el.lastElementChild === window.__tttLeading;
  });

  const untouched = await track.evaluate((el) => el.contains(window.__tttLeading));
  expect(untouched).toBe(true);
});

test('direction="right" moves the trailing item to the front instead', async ({ page }) => {
  await page.goto(fixtures().marqueeStepRight);

  const track = page.locator('.ttt-marquee__track');
  await track.evaluate((el) => {
    window.__tttTrailing = el.lastElementChild;
  });

  await page.waitForFunction(() => {
    const el = document.querySelector('.ttt-marquee__track');
    return el.firstElementChild === window.__tttTrailing;
  });

  const untouched = await track.evaluate((el) => el.contains(window.__tttTrailing));
  expect(untouched).toBe(true);
});

test('the order does not change during the dwell', async ({ page }) => {
  // step_ms="120" pause_ms="300" — long enough to sample twice with margin
  // either side, short enough the test stays quick.
  await page.goto(fixtures().marqueeStep);

  const track = page.locator('.ttt-marquee__track');
  await track.evaluate((el) => {
    window.__tttDwell = el.firstElementChild;
  });

  await page.waitForTimeout(150);
  await expect
    .poll(() => track.evaluate((el) => el.firstElementChild === window.__tttDwell))
    .toBe(true);

  await page.waitForTimeout(100);
  await expect
    .poll(() => track.evaluate((el) => el.firstElementChild === window.__tttDwell))
    .toBe(true);
});

test('hovering prevents the next step', async ({ page }) => {
  await page.goto(fixtures().marqueeStep);
  await page.locator('.ttt-marquee').hover();

  const track = page.locator('.ttt-marquee__track');
  await track.evaluate((el) => {
    window.__tttHoverStash = el.firstElementChild;
  });

  // stepMs (120) + pauseMs (300) + margin: well past one full cycle would
  // otherwise take.
  await page.waitForTimeout(120 + 300 + 200);

  const unchanged = await track.evaluate((el) => el.firstElementChild === window.__tttHoverStash);
  expect(unchanged).toBe(true);
});

test('does not pause on hover when pause_on_hover is off', async ({ page }) => {
  await page.goto(fixtures().marqueePlain);
  await page.locator('.ttt-marquee').hover();

  const track = page.locator('.ttt-marquee__track');
  await track.evaluate((el) => {
    window.__tttHoverOffStash = el.firstElementChild;
  });

  await page.waitForFunction(() => {
    const el = document.querySelector('.ttt-marquee__track');
    return el.firstElementChild !== window.__tttHoverOffStash;
  });
});

/**
 * Distance, in px, between the viewport's centre line and the centre of the
 * item nearest to it. Zero means a logo is sitting dead centre.
 */
const centreMiss = (page) =>
  page.locator('.ttt-marquee').evaluate((root) => {
    const viewport = root.querySelector('.ttt-marquee__viewport');
    const vRect = viewport.getBoundingClientRect();
    const vCentre = vRect.left + vRect.width / 2;

    return Array.from(root.querySelectorAll('.ttt-marquee__item')).reduce((best, item) => {
      const rect = item.getBoundingClientRect();
      const miss = Math.abs(rect.left + rect.width / 2 - vCentre);

      return miss < best ? miss : best;
    }, Infinity);
  });

// Logos are different widths, so a strip that rests at translateX(0) — first
// item flush with the left edge — leaves whatever lands mid-strip to chance.
// The edge fade is fully opaque only at the centre, so an empty centre is the
// one position that reads as broken.
[390, 1025, 1920].forEach((width) => {
  test(`rests with a logo on the centre line at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width: width, height: 900 });
    await page.goto(fixtures().marquee);
    await page.waitForFunction(() => document.querySelector('[data-ttt-clone]') !== null);

    expect(await centreMiss(page)).toBeLessThanOrEqual(1);
  });
});

test('lands the next logo on the centre line after a step', async ({ page }) => {
  await page.goto(fixtures().marqueeStep);

  const track = page.locator('.ttt-marquee__track');
  await track.evaluate((el) => {
    window.__tttCentreStash = el.firstElementChild;
  });

  await page.waitForFunction(() => {
    const el = document.querySelector('.ttt-marquee__track');
    return el.lastElementChild === window.__tttCentreStash;
  });

  // Polled rather than asserted once: the step lands the centring, and the
  // recycle that follows it must not disturb what the step just achieved.
  await expect.poll(() => centreMiss(page)).toBeLessThanOrEqual(1);
});

test('lifts items away from centre when arc is set', async ({ page }) => {
  await page.goto(fixtures().marqueeArc);
  await page.waitForFunction(() => document.querySelector('[data-ttt-clone]') !== null);

  const measured = await page.locator('.ttt-marquee').evaluate((root) => {
    const viewport = root.querySelector('.ttt-marquee__viewport');
    const items = Array.from(root.querySelectorAll('.ttt-marquee__item'));
    const vRect = viewport.getBoundingClientRect();
    const vCenter = vRect.left + vRect.width / 2;

    const translateY = (el) => {
      const t = getComputedStyle(el).transform;
      if (t === 'none') {
        return 0;
      }
      return new DOMMatrixReadOnly(t).m42;
    };

    let nearest = null;
    let farthest = null;

    items.forEach((item) => {
      const rect = item.getBoundingClientRect();
      const dist = Math.abs(rect.left + rect.width / 2 - vCenter);
      const entry = { dist: dist, ty: translateY(item) };

      if (!nearest || dist < nearest.dist) {
        nearest = entry;
      }
      if (!farthest || dist > farthest.dist) {
        farthest = entry;
      }
    });

    return { nearestTy: nearest.ty, farthestTy: farthest.ty };
  });

  expect(Math.abs(measured.nearestTy)).toBeLessThanOrEqual(1);
  expect(measured.farthestTy).toBeLessThan(measured.nearestTy - 1);
});

test('arc="0" applies no vertical offset to any item', async ({ page }) => {
  await page.goto(fixtures().marqueeArcZero);
  await page.waitForFunction(() => document.querySelector('[data-ttt-clone]') !== null);

  const transforms = await page.locator('.ttt-marquee').evaluate((root) =>
    Array.from(root.querySelectorAll('.ttt-marquee__item')).map((item) => getComputedStyle(item).transform)
  );

  expect(transforms.length).toBeGreaterThan(0);
  transforms.forEach((t) => expect(t).toBe('none'));
});

test.describe('with reduced motion', () => {
  test('does not step, clone, or trap the logos out of reach', async ({ page }) => {
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

    const transform = await page.locator('.ttt-marquee__track').evaluate((el) => getComputedStyle(el).transform);
    expect(transform).toBe('none');

    await expect(page.locator('.ttt-marquee__viewport')).toHaveCSS('overflow-x', 'auto');
    await expect(page.locator('.ttt-marquee__viewport')).toHaveCSS('mask-image', 'none');
    await expect(page.locator('.ttt-marquee__viewport')).toHaveAttribute('tabindex', '0');
  });
});
