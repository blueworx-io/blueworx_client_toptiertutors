# Elementor Logo Carousel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a full-bleed, continuously scrolling logo marquee as an Elementor widget in the Top Tier Tutors plugin, matching Figma Section 11 (`10:221`).

**Architecture:** Elementor is kept at the edges. A framework-free renderer produces the markup, a shortcode exposes it for testing and non-Elementor use, and the Elementor widget is a thin adapter mapping controls onto the same renderer. Motion is a CSS keyframe; JavaScript only clones the track and computes a duration so scroll speed stays constant in px/sec.

**Tech Stack:** PHP 8.2+, WordPress 6.0+, Elementor 3.5+ (free tier), vanilla JS (no build step), Playwright against the foundation's local WordPress harness.

**Spec:** [`docs/superpowers/specs/2026-07-23-elementor-logo-carousel-design.md`](../specs/2026-07-23-elementor-logo-carousel-design.md)

## Global Constraints

- Branch is `add-logo-carousel-widget`. Never commit to `main`.
- Plugin header `Version:` and `package.json` `version` must match exactly — CI fails otherwise. Both go to `0.2.0` in Task 6.
- `CHANGELOG.md` must gain a `## 0.2.0` section in the same PR as the version bump.
- No new npm or Composer dependencies. `approved-deps.json` stays as it is.
- All Elementor controls used must exist in **Elementor free** — no Pro-only controls.
- Text domain is `blueworx-client-toptiertutors` for every translatable string.
- Every PHP file starts with the `ABSPATH` guard used by `includes/class-plugin.php`.
- Class prefix is `Blueworx_TopTierTutors_`; CSS/JS prefix is `ttt-`.
- Tests run with `npm run wp:up` then `npx playwright test`. A skipped test is not a passing test.
- Do not run `npm run lint` in a fix-and-rerun loop. Run it once at the end (Task 6) and report findings.

---

### Task 1: Renderer, shortcode and test fixtures

Produces the markup and the seam every later task tests through.

**Files:**
- Create: `includes/marquee/class-marquee-renderer.php`
- Create: `includes/marquee/class-marquee-shortcode.php`
- Create: `tests/fixtures/images/logo-wide.png` (395×200), `tests/fixtures/images/logo-narrow.png` (146×200)
- Create: `tests/marquee.spec.js`
- Modify: `includes/class-plugin.php`
- Modify: `tests/fixtures/create-fixture-page.php` (seed attachments + marquee pages, output JSON)
- Modify: `tests/global-setup.js` (expose the JSON as `TTT_FIXTURES`)
- Modify: `tests/smoke.spec.js` (read the new fixture map)

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `Blueworx_TopTierTutors_Marquee_Renderer::render( array $args ): string` where `$args` keys are `ids` (int[]), `image_size` (string), `speed` (int px/sec), `direction` (`'left'|'right'`), `pause_on_hover` (bool), `full_bleed` (bool), `height` (int px, `0` = use CSS default), `gap` (int px, `0` = use CSS default), `extra_class` (string).
  - `Blueworx_TopTierTutors_Marquee_Shortcode::TAG` = `'toptiertutors_logo_carousel'`, and `::register(): void`.
  - `Blueworx_TopTierTutors_Plugin::MARQUEE_HANDLE` = `'ttt-logo-carousel'`, `::register_marquee_assets(): void`, `::enqueue_marquee_assets(): void`.
  - Env var `TTT_FIXTURES` — JSON string, keys `shortcode`, `marquee`, `marqueePlain`, and `logoIds` (array of two attachment IDs).

- [ ] **Step 1: Generate the two fixture images**

These are committed once. CI never regenerates them, so GD is only needed on the machine running this step.

```bash
mkdir -p tests/fixtures/images
php -r '
$specs = array( array( "logo-wide.png", 395, 200, array( 62, 76, 138 ) ), array( "logo-narrow.png", 146, 200, array( 198, 164, 88 ) ) );
foreach ( $specs as $s ) {
    list( $name, $w, $h, $rgb ) = $s;
    $im = imagecreatetruecolor( $w, $h );
    imagefill( $im, 0, 0, imagecolorallocate( $im, $rgb[0], $rgb[1], $rgb[2] ) );
    imagepng( $im, "tests/fixtures/images/" . $name );
    imagedestroy( $im );
    echo $name . " written\n";
}'
```

Expected output:

```
logo-wide.png written
logo-narrow.png written
```

- [ ] **Step 2: Write the failing test**

Create `tests/marquee.spec.js`:

```js
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
```

- [ ] **Step 3: Run the test to verify it fails**

```bash
npm run wp:up
npx playwright test tests/marquee.spec.js
```

Expected: FAIL. `global-setup.js` throws or the specs fail on `TTT_FIXTURES` being undefined — the shortcode does not exist yet.

- [ ] **Step 4: Write the renderer**

Create `includes/marquee/class-marquee-renderer.php`:

```php
<?php
/**
 * Markup for the logo marquee.
 *
 * Deliberately free of Elementor: the Elementor widget, the shortcode and the
 * test suite all render through this one method, so the markup has a single
 * definition and can be exercised without Elementor installed.
 *
 * @package BlueworxClientTopTierTutors
 */

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Turns marquee settings into HTML.
 */
class Blueworx_TopTierTutors_Marquee_Renderer {

	/**
	 * Default arguments. Height and gap of 0 mean "leave it to the stylesheet".
	 *
	 * @var array<string,mixed>
	 */
	const DEFAULTS = array(
		'ids'            => array(),
		'image_size'     => 'medium',
		'speed'          => 60,
		'direction'      => 'left',
		'pause_on_hover' => true,
		'full_bleed'     => true,
		'height'         => 0,
		'gap'            => 0,
		'extra_class'    => '',
	);

	/**
	 * Render the marquee.
	 *
	 * @param array<string,mixed> $args See self::DEFAULTS.
	 * @return string HTML, or an empty string when there is nothing to show.
	 */
	public static function render( array $args ) {
		$args = array_merge( self::DEFAULTS, $args );

		$ids = array_values( array_filter( array_map( 'absint', (array) $args['ids'] ) ) );

		if ( empty( $ids ) ) {
			return '';
		}

		$items = '';

		foreach ( $ids as $id ) {
			$image = wp_get_attachment_image(
				$id,
				$args['image_size'],
				false,
				array(
					'class'    => 'ttt-marquee__image',
					'loading'  => 'lazy',
					'decoding' => 'async',
				)
			);

			// Empty when the attachment has been deleted since it was chosen.
			if ( ! $image ) {
				continue;
			}

			$items .= '<li class="ttt-marquee__item">' . $image . '</li>';
		}

		if ( '' === $items ) {
			return '';
		}

		$styles = array();

		if ( absint( $args['height'] ) > 0 ) {
			$styles[] = '--ttt-marquee-height:' . absint( $args['height'] ) . 'px';
		}

		if ( absint( $args['gap'] ) > 0 ) {
			$styles[] = '--ttt-marquee-gap:' . absint( $args['gap'] ) . 'px';
		}

		return sprintf(
			'<div class="%1$s" data-ttt-marquee data-speed="%2$d" data-direction="%3$s" data-pause-on-hover="%4$d" data-full-bleed="%5$d"%6$s>' .
				'<div class="ttt-marquee__viewport"><ul class="ttt-marquee__track" role="list">%7$s</ul></div>' .
			'</div>',
			esc_attr( trim( 'ttt-marquee ' . $args['extra_class'] ) ),
			max( 1, absint( $args['speed'] ) ),
			'right' === $args['direction'] ? 'right' : 'left',
			$args['pause_on_hover'] ? 1 : 0,
			$args['full_bleed'] ? 1 : 0,
			$styles ? ' style="' . esc_attr( implode( ';', $styles ) ) . '"' : '',
			$items
		);
	}
}
```

- [ ] **Step 5: Write the shortcode**

Create `includes/marquee/class-marquee-shortcode.php`:

```php
<?php
/**
 * [toptiertutors_logo_carousel] shortcode.
 *
 * The same markup as the Elementor widget, for pages that are not built in
 * Elementor — and the seam the Playwright suite drives, since the test harness
 * has no Elementor.
 *
 * @package BlueworxClientTopTierTutors
 */

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Registers and renders the marquee shortcode.
 */
class Blueworx_TopTierTutors_Marquee_Shortcode {

	/**
	 * Shortcode tag.
	 */
	const TAG = 'toptiertutors_logo_carousel';

	/**
	 * Hook the shortcode in.
	 *
	 * @return void
	 */
	public static function register() {
		add_shortcode( self::TAG, array( __CLASS__, 'render' ) );
	}

	/**
	 * Render the shortcode.
	 *
	 * @param array<string,string>|string $atts Shortcode attributes.
	 * @return string
	 */
	public static function render( $atts ) {
		$atts = shortcode_atts(
			array(
				'ids'            => '',
				'size'           => 'medium',
				'speed'          => 60,
				'direction'      => 'left',
				'pause_on_hover' => 'yes',
				'full_bleed'     => 'yes',
				'height'         => 0,
				'gap'            => 0,
			),
			$atts,
			self::TAG
		);

		$html = Blueworx_TopTierTutors_Marquee_Renderer::render(
			array(
				'ids'            => explode( ',', $atts['ids'] ),
				'image_size'     => sanitize_key( $atts['size'] ),
				'speed'          => absint( $atts['speed'] ),
				'direction'      => sanitize_key( $atts['direction'] ),
				'pause_on_hover' => 'no' !== $atts['pause_on_hover'],
				'full_bleed'     => 'no' !== $atts['full_bleed'],
				'height'         => absint( $atts['height'] ),
				'gap'            => absint( $atts['gap'] ),
			)
		);

		// Only pay for the assets on pages that actually render a marquee.
		if ( '' !== $html ) {
			Blueworx_TopTierTutors_Plugin::enqueue_marquee_assets();
		}

		return $html;
	}
}
```

- [ ] **Step 6: Wire both into the plugin**

In `includes/class-plugin.php`, add the handle constant directly below `const SHORTCODE = 'toptiertutors';`:

```php
	/**
	 * Handle shared by the marquee stylesheet and script.
	 */
	const MARQUEE_HANDLE = 'ttt-logo-carousel';
```

Replace the body of `register()` with:

```php
	public static function register() {
		add_action( 'init', array( __CLASS__, 'register_shortcodes' ) );
		add_action( 'init', array( __CLASS__, 'register_marquee_assets' ) );
		add_action( 'wp_enqueue_scripts', array( __CLASS__, 'enqueue_assets' ) );

		Blueworx_TopTierTutors_Marquee_Shortcode::register();
	}
```

Add these two methods to the class:

```php
	/**
	 * Register (but do not enqueue) the marquee assets.
	 *
	 * Registered on `init` rather than `wp_enqueue_scripts` so the handles exist
	 * whatever order things run in — the shortcode renders during `the_content`,
	 * which is after `wp_enqueue_scripts` has already fired.
	 *
	 * @return void
	 */
	public static function register_marquee_assets() {
		wp_register_style(
			self::MARQUEE_HANDLE,
			BLUEWORX_TOPTIERTUTORS_URL . 'assets/logo-carousel.css',
			array(),
			BLUEWORX_TOPTIERTUTORS_VERSION
		);

		wp_register_script(
			self::MARQUEE_HANDLE,
			BLUEWORX_TOPTIERTUTORS_URL . 'assets/logo-carousel.js',
			array(),
			BLUEWORX_TOPTIERTUTORS_VERSION,
			true
		);
	}

	/**
	 * Enqueue the marquee assets. Called by whatever renders a marquee.
	 *
	 * @return void
	 */
	public static function enqueue_marquee_assets() {
		wp_enqueue_style( self::MARQUEE_HANDLE );
		wp_enqueue_script( self::MARQUEE_HANDLE );
	}
```

In `blueworx-client-toptiertutors.php`, add these two requires immediately above the existing `includes/class-plugin.php` require:

```php
require_once BLUEWORX_TOPTIERTUTORS_DIR . 'includes/marquee/class-marquee-renderer.php';
require_once BLUEWORX_TOPTIERTUTORS_DIR . 'includes/marquee/class-marquee-shortcode.php';
```

- [ ] **Step 7: Extend the fixture seeder**

Replace the whole of `tests/fixtures/create-fixture-page.php` with:

```php
<?php
/**
 * Seeds the content the Playwright suite needs, inside the local test WordPress.
 *
 * Run by tests/global-setup.js against the harness's wp-load.php. Seeding
 * through WordPress itself rather than driving the block editor keeps the specs
 * off the ~100-request editor screen, which the harness's single-threaded PHP
 * server serves too slowly to be a reliable smoke test.
 *
 * Prints a JSON map of fixture URLs and attachment IDs on stdout. CLI only — it
 * is excluded from the release zip along with the rest of tests/.
 *
 * @package BlueworxClientTopTierTutors
 */

if ( PHP_SAPI !== 'cli' ) {
	exit( 1 );
}

if ( empty( $argv[1] ) || ! file_exists( $argv[1] ) ) {
	fwrite( STDERR, "Usage: php create-fixture-page.php /path/to/wp-load.php\n" );
	exit( 1 );
}

require_once $argv[1];

/**
 * Find or create a published page.
 *
 * @param string $slug    Page slug.
 * @param string $title   Page title.
 * @param string $content Page content.
 * @return string Permalink.
 */
function ttt_fixture_page( $slug, $title, $content ) {
	$existing = get_page_by_path( $slug );

	if ( $existing ) {
		// Keep the content current when the fixture definition changes.
		if ( $existing->post_content !== $content ) {
			wp_update_post(
				array(
					'ID'           => $existing->ID,
					'post_content' => $content,
				)
			);
		}

		return get_permalink( $existing );
	}

	$page_id = wp_insert_post(
		array(
			'post_title'   => $title,
			'post_name'    => $slug,
			'post_content' => $content,
			'post_type'    => 'page',
			'post_status'  => 'publish',
		),
		true
	);

	if ( is_wp_error( $page_id ) ) {
		fwrite( STDERR, $page_id->get_error_message() . "\n" );
		exit( 1 );
	}

	return get_permalink( $page_id );
}

/**
 * Find or create an attachment from a file in tests/fixtures/images.
 *
 * Attachment metadata is written by hand rather than through
 * wp_generate_attachment_metadata(), so the harness does not need the GD
 * extension. Only the full size is ever requested by the fixtures.
 *
 * @param string $filename Basename inside tests/fixtures/images.
 * @param string $alt      Alt text.
 * @param int    $width    Pixel width.
 * @param int    $height   Pixel height.
 * @return int Attachment ID.
 */
function ttt_fixture_image( $filename, $alt, $width, $height ) {
	$existing = get_posts(
		array(
			'post_type'      => 'attachment',
			'post_status'    => 'inherit',
			'posts_per_page' => 1,
			'name'           => sanitize_title( pathinfo( $filename, PATHINFO_FILENAME ) ),
			'fields'         => 'ids',
		)
	);

	if ( ! empty( $existing ) ) {
		return (int) $existing[0];
	}

	$source = __DIR__ . '/images/' . $filename;
	$upload = wp_upload_dir();
	$target = trailingslashit( $upload['path'] ) . $filename;

	if ( ! file_exists( $source ) ) {
		fwrite( STDERR, "Missing fixture image: {$source}\n" );
		exit( 1 );
	}

	wp_mkdir_p( $upload['path'] );

	if ( ! copy( $source, $target ) ) {
		fwrite( STDERR, "Could not copy fixture image to {$target}\n" );
		exit( 1 );
	}

	$attachment_id = wp_insert_attachment(
		array(
			'post_mime_type' => 'image/png',
			'post_title'     => pathinfo( $filename, PATHINFO_FILENAME ),
			'post_status'    => 'inherit',
		),
		$target,
		0,
		true
	);

	if ( is_wp_error( $attachment_id ) ) {
		fwrite( STDERR, $attachment_id->get_error_message() . "\n" );
		exit( 1 );
	}

	wp_update_attachment_metadata(
		$attachment_id,
		array(
			'width'  => $width,
			'height' => $height,
			'file'   => _wp_relative_upload_path( $target ),
			'sizes'  => array(),
		)
	);

	update_post_meta( $attachment_id, '_wp_attachment_image_alt', $alt );

	return (int) $attachment_id;
}

$wide   = ttt_fixture_image( 'logo-wide.png', 'Wide school logo', 395, 200 );
$narrow = ttt_fixture_image( 'logo-narrow.png', 'Narrow school logo', 146, 200 );

// Five tiles, alternating wide/narrow, mirroring Figma Section 11.
$marquee_ids = implode( ',', array( $wide, $narrow, $wide, $narrow, $wide ) );

$fixtures = array(
	'shortcode'    => ttt_fixture_page( 'ttt-shortcode-smoke', 'TTT shortcode smoke', '[toptiertutors]' ),
	'marquee'      => ttt_fixture_page(
		'ttt-marquee',
		'TTT marquee',
		'[toptiertutors_logo_carousel ids="' . $marquee_ids . '" size="full" speed="60"]'
	),
	'marqueePlain' => ttt_fixture_page(
		'ttt-marquee-plain',
		'TTT marquee plain',
		'[toptiertutors_logo_carousel ids="' . $wide . ',' . $narrow . '" size="full" speed="120" pause_on_hover="no" full_bleed="no"]'
	),
	'logoIds'      => array( $wide, $narrow ),
);

echo wp_json_encode( $fixtures );
```

- [ ] **Step 8: Update global setup to publish the fixture map**

Replace `tests/global-setup.js` with:

```js
// @ts-check
const { execFileSync } = require('child_process');
const { existsSync } = require('fs');
const path = require('path');

// Seeds the content the suite cannot create for itself — logo attachments and
// the pages that render them — by talking to the local harness's WordPress
// directly. Worker processes are forked after this runs, so the fixture map is
// handed on through the environment.
const WP_LOAD = path.join(__dirname, '..', '.wp-test', 'wp', 'wp-load.php');
const SEEDER = path.join(__dirname, 'fixtures', 'create-fixture-page.php');

module.exports = () => {
  if (!existsSync(WP_LOAD)) {
    throw new Error(
      `No local WordPress at ${WP_LOAD}. Start the harness first: npm run wp:up`
    );
  }

  const raw = execFileSync('php', [SEEDER, WP_LOAD], { encoding: 'utf8' }).trim();

  let fixtures;
  try {
    fixtures = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Fixture seeding did not return JSON. Got: ${raw}`);
  }

  if (!fixtures.marquee) {
    throw new Error('Fixture seeding produced no marquee page.');
  }

  process.env.TTT_FIXTURES = JSON.stringify(fixtures);
  console.log(`Fixtures ready: ${Object.keys(fixtures).join(', ')}`);
};
```

- [ ] **Step 9: Point the existing smoke spec at the new fixture map**

In `tests/smoke.spec.js`, replace these lines:

```js
// Seeded by tests/global-setup.js, which publishes the page through WordPress
// itself rather than driving the block editor.
const FIXTURE_URL = () => String(process.env.TTT_FIXTURE_URL);
```

with:

```js
// Seeded by tests/global-setup.js, which publishes the pages through WordPress
// itself rather than driving the block editor.
const FIXTURE_URL = () => JSON.parse(String(process.env.TTT_FIXTURES)).shortcode;
```

- [ ] **Step 10: Run the tests to verify they pass**

```bash
npx playwright test
```

Expected: PASS — 3 smoke tests plus 4 marquee tests, 7 total, 0 skipped.

- [ ] **Step 11: Commit**

```bash
git add includes/marquee blueworx-client-toptiertutors.php includes/class-plugin.php tests
git commit -m "Add marquee renderer and shortcode with test fixtures"
```

---

### Task 2: Stylesheet — layout, fade and full bleed

**Files:**
- Create: `assets/logo-carousel.css`
- Modify: `tests/marquee.spec.js`

**Interfaces:**
- Consumes: the markup and data attributes from Task 1.
- Produces: CSS custom properties other tasks write to — `--ttt-marquee-height` (default `200px`), `--ttt-marquee-gap` (default `60px`), `--ttt-marquee-duration` (default `40s`), `--ttt-vw` (default `100vw`). Keyframe name `ttt-marquee-scroll`.

- [ ] **Step 1: Write the failing test**

Append to `tests/marquee.spec.js`:

```js
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
```

The companion assertion — that full bleed does not push the page into
horizontal overflow — belongs to Task 3, not here. It depends on `--ttt-vw`,
which JavaScript measures; until Task 3 lands, the CSS falls back to `100vw`,
which includes the scrollbar and would fail this task for a reason this task
cannot fix.

```js

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
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npx playwright test tests/marquee.spec.js
```

Expected: the five new tests FAIL — no stylesheet exists, so tiles are unsized, `marginRight` is `0px` and the mask is `none`.

- [ ] **Step 3: Write the stylesheet**

Create `assets/logo-carousel.css`:

```css
/*
 * Top Tier Tutors — logo marquee.
 *
 * Motion is CSS only. JavaScript clones the track and sets
 * --ttt-marquee-duration; everything below works without it, just static.
 */

.ttt-marquee {
	--ttt-marquee-height: 200px;
	--ttt-marquee-gap: 60px;
	--ttt-marquee-duration: 40s;
	/* Replaced by JS with the client width, which excludes the scrollbar. */
	--ttt-vw: 100vw;

	position: relative;
}

/*
 * Break out of the content column to the viewport edges. 100vw includes the
 * scrollbar, which is why --ttt-vw is measured in JS instead.
 *
 * max-width: none is required, not tidiness. Block themes cap constrained
 * layout children with
 * `.is-layout-constrained > :where(...) { max-width: var(--wp--style--global--content-size) }`,
 * and max-width beats width no matter how specific the width rule is — without
 * this the strip silently stays at content width.
 *
 * Centring is left/transform rather than negative margins because the same
 * theme rule sets `margin-left: auto`, and a margin-based break-out has to win
 * a specificity and load-order fight with it on every theme.
 */
.ttt-marquee[data-full-bleed="1"] {
	width: var(--ttt-vw);
	max-width: none;
	margin-left: 0;
	margin-right: 0;
	left: 50%;
	transform: translateX(-50%);
}

/*
 * The edge fade, as a mask rather than a gradient overlay: a mask assumes
 * nothing about the section's background colour, so changing the background
 * cannot leave two mismatched greys meeting mid-fade.
 */
.ttt-marquee__viewport {
	overflow: hidden;
	-webkit-mask-image: linear-gradient(
		to right,
		transparent 0%,
		transparent 7.692%,
		#000 50%,
		transparent 92.308%,
		transparent 100%
	);
	mask-image: linear-gradient(
		to right,
		transparent 0%,
		transparent 7.692%,
		#000 50%,
		transparent 92.308%,
		transparent 100%
	);
}

.ttt-marquee__track {
	display: flex;
	align-items: center;
	width: max-content;
	margin: 0;
	padding: 0;
	list-style: none;
	animation: ttt-marquee-scroll var(--ttt-marquee-duration) linear infinite;
}

.ttt-marquee[data-direction="right"] .ttt-marquee__track {
	animation-direction: reverse;
}

/*
 * The gap is a margin on every item, including the last, rather than flex
 * `gap`. Flex gap leaves no space after the final tile, so the wrap from the
 * end of the track back to its start would jump by one gap on every loop.
 */
.ttt-marquee__item {
	flex: 0 0 auto;
	margin-right: var(--ttt-marquee-gap);
}

/*
 * max-width: none is load-bearing. Themes almost universally set
 * `img { max-width: 100% }`, which would squash the wide logos.
 */
.ttt-marquee__image,
.ttt-marquee__item img {
	display: block;
	height: var(--ttt-marquee-height);
	width: auto;
	max-width: none;
}

@keyframes ttt-marquee-scroll {
	from {
		transform: translateX(0);
	}

	to {
		transform: translateX(-50%);
	}
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npx playwright test tests/marquee.spec.js
```

Expected: PASS, 9 tests.

- [ ] **Step 5: Commit**

```bash
git add assets/logo-carousel.css tests/marquee.spec.js
git commit -m "Style the marquee: tile sizing, edge fade mask, full bleed"
```

---

### Task 3: Script — cloning, measurement and duration

**Files:**
- Create: `assets/logo-carousel.js`
- Modify: `tests/marquee.spec.js`

**Interfaces:**
- Consumes: `--ttt-marquee-duration`, `--ttt-vw` and the keyframe from Task 2; the `data-speed` attribute from Task 1.
- Produces: clones marked `data-ttt-clone="1"`; an explicit `track.style.width` in px; `--ttt-marquee-duration` and `--ttt-vw` set on the `.ttt-marquee` element; a global initialiser reachable as `window.tttMarquee.init(root)` so the Elementor editor hook in Task 5 can call it.

- [ ] **Step 1: Write the failing test**

Append to `tests/marquee.spec.js`:

```js
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
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npx playwright test tests/marquee.spec.js
```

Expected: the four new tests FAIL, timing out in `waitForFunction` — nothing clones anything yet.

- [ ] **Step 3: Write the script**

Create `assets/logo-carousel.js`:

```js
/**
 * Top Tier Tutors — logo marquee.
 *
 * The animation itself is CSS. This file does the two things CSS cannot: fill
 * the track with enough copies to loop seamlessly at any viewport width, and
 * convert a speed in pixels per second into an animation duration.
 */
(function () {
	'use strict';

	var ROOT_SELECTOR = '[data-ttt-marquee]';
	var DEFAULT_SPEED = 60;

	/**
	 * Whether the visitor has asked for reduced motion.
	 *
	 * @return {boolean} True when motion should be suppressed.
	 */
	function prefersReducedMotion() {
		return (
			typeof window.matchMedia === 'function' &&
			window.matchMedia('(prefers-reduced-motion: reduce)').matches
		);
	}

	/**
	 * Remove every clone from a track.
	 *
	 * @param {HTMLElement} track Track element.
	 * @return {void}
	 */
	function clearClones(track) {
		var clones = track.querySelectorAll('[data-ttt-clone="1"]');

		for (var i = 0; i < clones.length; i++) {
			clones[i].parentNode.removeChild(clones[i]);
		}
	}

	/**
	 * Width of one full set of tiles, including the trailing gap.
	 *
	 * @param {Array<HTMLElement>} items Original tiles.
	 * @return {number} Width in pixels.
	 */
	function setWidth(items) {
		var total = 0;

		for (var i = 0; i < items.length; i++) {
			var gap = parseFloat(window.getComputedStyle(items[i]).marginRight) || 0;
			total += items[i].getBoundingClientRect().width + gap;
		}

		return total;
	}

	/**
	 * Build the track out and set the animation duration.
	 *
	 * @param {HTMLElement} root Marquee root.
	 * @return {void}
	 */
	function layout(root) {
		var track = root.querySelector('.ttt-marquee__track');
		var viewport = root.querySelector('.ttt-marquee__viewport');

		if (!track || !viewport) {
			return;
		}

		root.style.setProperty('--ttt-vw', document.documentElement.clientWidth + 'px');

		clearClones(track);
		track.style.width = '';

		// Reduced motion never animates, so cloning would only duplicate content.
		if (prefersReducedMotion()) {
			return;
		}

		var originals = [].slice.call(track.children);

		if (!originals.length) {
			return;
		}

		var oneSet = setWidth(originals);

		if (!oneSet) {
			return;
		}

		// Enough copies to cover twice the viewport, rounded up to an even number
		// so that a -50% shift lands exactly on a copy boundary.
		var copies = Math.ceil(Math.max(viewport.clientWidth * 2, oneSet * 2) / oneSet);

		if (copies % 2 === 1) {
			copies += 1;
		}

		for (var copy = 1; copy < copies; copy++) {
			for (var i = 0; i < originals.length; i++) {
				var clone = originals[i].cloneNode(true);

				clone.setAttribute('data-ttt-clone', '1');
				clone.setAttribute('aria-hidden', 'true');

				var focusable = clone.querySelectorAll('a, button, input, select, textarea, [tabindex]');

				for (var f = 0; f < focusable.length; f++) {
					focusable[f].setAttribute('tabindex', '-1');
				}

				track.appendChild(clone);
			}
		}

		// Set explicitly so the -50% keyframe is exact rather than depending on
		// how the browser resolves max-content with trailing margins.
		var trackWidth = oneSet * copies;
		track.style.width = trackWidth + 'px';

		var speed = parseFloat(root.getAttribute('data-speed')) || DEFAULT_SPEED;
		root.style.setProperty('--ttt-marquee-duration', trackWidth / 2 / speed + 's');
	}

	/**
	 * Initialise one marquee, and keep it correct as things resize.
	 *
	 * @param {HTMLElement} root Marquee root.
	 * @return {void}
	 */
	function init(root) {
		if (!root) {
			return;
		}

		// Listeners attach once, but the layout always re-runs. A second init()
		// — the Elementor editor redrawing a widget in place — must reflect
		// whatever changed rather than silently doing nothing.
		if (root.getAttribute('data-ttt-ready') !== '1') {
			root.setAttribute('data-ttt-ready', '1');

			var relayout = function () {
				layout(root);
			};

			// Images have no measurable width until they load.
			var images = root.querySelectorAll('img');

			for (var i = 0; i < images.length; i++) {
				if (!images[i].complete) {
					images[i].addEventListener('load', relayout);
					images[i].addEventListener('error', relayout);
				}
			}

			if (typeof window.ResizeObserver === 'function') {
				var frame = null;
				var observer = new window.ResizeObserver(function () {
					if (frame) {
						window.cancelAnimationFrame(frame);
					}

					frame = window.requestAnimationFrame(relayout);
				});

				observer.observe(root);
			} else {
				window.addEventListener('resize', relayout);
			}
		}

		layout(root);
	}

	/**
	 * Initialise every marquee in a container.
	 *
	 * @param {ParentNode} [scope] Container, defaults to the document.
	 * @return {void}
	 */
	function initAll(scope) {
		var roots = (scope || document).querySelectorAll(ROOT_SELECTOR);

		for (var i = 0; i < roots.length; i++) {
			init(roots[i]);
		}
	}

	// Exposed so the Elementor editor can re-initialise a widget it just redrew.
	window.tttMarquee = { init: init, initAll: initAll };

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', function () {
			initAll();
		});
	} else {
		initAll();
	}
})();
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npx playwright test tests/marquee.spec.js
```

Expected: PASS, 13 tests.

- [ ] **Step 5: Commit**

```bash
git add assets/logo-carousel.js tests/marquee.spec.js
git commit -m "Clone the marquee track and derive its duration from speed"
```

---

### Task 4: Pause on hover and reduced motion

**Files:**
- Modify: `assets/logo-carousel.css`
- Modify: `tests/marquee.spec.js`

**Interfaces:**
- Consumes: `data-pause-on-hover` from Task 1, the keyframe from Task 2, the reduced-motion branch already present in Task 3's script.
- Produces: no new interfaces.

- [ ] **Step 1: Write the failing test**

Append to `tests/marquee.spec.js`:

```js
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
  test.use({ reducedMotion: 'reduce' });

  test('does not animate, clone, or trap the logos out of reach', async ({ page }) => {
    await page.goto(fixtures().marquee);
    await page.waitForFunction(() => document.querySelector('[data-ttt-ready="1"]') !== null);

    await expect(page.locator('.ttt-marquee__item[data-ttt-clone="1"]')).toHaveCount(0);
    await expect(page.locator('.ttt-marquee__track')).toHaveCSS('animation-name', 'none');
    await expect(page.locator('.ttt-marquee__viewport')).toHaveCSS('overflow-x', 'auto');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npx playwright test tests/marquee.spec.js
```

Expected: `pauses on hover when asked to` FAILS (stays `running`) and the reduced-motion test FAILS on `animation-name` still being `ttt-marquee-scroll` and `overflow-x` being `hidden`.

- [ ] **Step 3: Add the two rules**

Append to `assets/logo-carousel.css`:

```css
/*
 * focus-within as well as hover: a keyboard user tabbing into the strip needs
 * it to hold still just as much as a mouse user reading it does.
 */
.ttt-marquee[data-pause-on-hover="1"]:hover .ttt-marquee__track,
.ttt-marquee[data-pause-on-hover="1"]:focus-within .ttt-marquee__track {
	animation-play-state: paused;
}

/*
 * Reduced motion drops the animation entirely. The strip then has to stay
 * reachable, so the viewport becomes scrollable rather than clipping whatever
 * does not fit.
 */
@media (prefers-reduced-motion: reduce) {
	.ttt-marquee__track {
		animation: none;
	}

	.ttt-marquee__viewport {
		overflow-x: auto;
	}
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npx playwright test
```

Expected: PASS — 3 smoke plus 16 marquee tests, 19 total, 0 skipped.

- [ ] **Step 5: Commit**

```bash
git add assets/logo-carousel.css tests/marquee.spec.js
git commit -m "Pause the marquee on hover and honour reduced motion"
```

---

### Task 5: Elementor integration and widget

No automated coverage — the harness has no Elementor. Step 6 is a manual verification checklist, and Task 6 raises the follow-up issue.

**Files:**
- Create: `includes/elementor/class-elementor-integration.php`
- Create: `includes/elementor/widgets/class-logo-carousel-widget.php`
- Modify: `blueworx-client-toptiertutors.php`
- Modify: `includes/class-plugin.php`
- Modify: `docs/superpowers/specs/2026-07-23-elementor-logo-carousel-design.md`

**Interfaces:**
- Consumes: `Blueworx_TopTierTutors_Marquee_Renderer::render()` and `Blueworx_TopTierTutors_Plugin::MARQUEE_HANDLE` from Task 1.
- Produces: widget name `ttt-logo-carousel`; Elementor category slug `toptiertutors`.

- [ ] **Step 1: Reconcile the spec with the control actually used**

The spec names `Group_Control_Image_Size`. Use a plain select instead: the group control also emits custom width/height and cropping settings, which would push resizing logic into the renderer that nothing in this design needs. In the spec, replace this line:

```markdown
- Image size — `Group_Control_Image_Size`, default `medium`
```

with:

```markdown
- Image size — `Controls_Manager::SELECT` over `get_intermediate_image_sizes()` plus `full`, default `medium`. Not `Group_Control_Image_Size`: that control also emits custom dimensions and cropping, which would put resizing logic in the renderer for no gain here
```

- [ ] **Step 2: Write the integration class**

Create `includes/elementor/class-elementor-integration.php`:

```php
<?php
/**
 * Elementor integration.
 *
 * Everything that knows Elementor exists lives behind this class, so the plugin
 * still boots — and the shortcode still renders — when Elementor is absent.
 *
 * @package BlueworxClientTopTierTutors
 */

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Registers the widget category and widgets with Elementor.
 */
class Blueworx_TopTierTutors_Elementor_Integration {

	/**
	 * Oldest Elementor release these widgets are built against.
	 *
	 * 3.5.0 is where `elementor/widgets/register` replaced the deprecated
	 * `widgets_registered` hook this class uses.
	 */
	const MIN_ELEMENTOR_VERSION = '3.5.0';

	/**
	 * Widget category slug.
	 */
	const CATEGORY = 'toptiertutors';

	/**
	 * Hook into Elementor.
	 *
	 * @return void
	 */
	public static function register() {
		add_action( 'elementor/elements/categories_registered', array( __CLASS__, 'register_category' ) );
		add_action( 'elementor/widgets/register', array( __CLASS__, 'register_widgets' ) );
		add_action( 'elementor/frontend/after_register_scripts', array( __CLASS__, 'register_editor_bridge' ) );
		add_action( 'admin_notices', array( __CLASS__, 'maybe_render_notice' ) );
	}

	/**
	 * Whether a usable Elementor is present.
	 *
	 * @return bool
	 */
	public static function is_supported() {
		return did_action( 'elementor/loaded' )
			&& defined( 'ELEMENTOR_VERSION' )
			&& version_compare( ELEMENTOR_VERSION, self::MIN_ELEMENTOR_VERSION, '>=' );
	}

	/**
	 * Add the plugin's own widget category.
	 *
	 * @param \Elementor\Elements_Manager $elements_manager Elementor's category registry.
	 * @return void
	 */
	public static function register_category( $elements_manager ) {
		$elements_manager->add_category(
			self::CATEGORY,
			array(
				'title' => __( 'Top Tier Tutors', 'blueworx-client-toptiertutors' ),
				'icon'  => 'fa fa-plug',
			)
		);
	}

	/**
	 * Register the widgets.
	 *
	 * @param \Elementor\Widgets_Manager $widgets_manager Elementor's widget registry.
	 * @return void
	 */
	public static function register_widgets( $widgets_manager ) {
		if ( ! self::is_supported() ) {
			return;
		}

		require_once BLUEWORX_TOPTIERTUTORS_DIR . 'includes/elementor/widgets/class-logo-carousel-widget.php';

		$widgets_manager->register( new Blueworx_TopTierTutors_Logo_Carousel_Widget() );
	}

	/**
	 * Re-initialise a marquee after Elementor redraws it in the editor.
	 *
	 * Elementor replaces a widget's DOM on every settings change, which drops the
	 * clones and the data-ttt-ready flag with it.
	 *
	 * @return void
	 */
	public static function register_editor_bridge() {
		wp_add_inline_script(
			Blueworx_TopTierTutors_Plugin::MARQUEE_HANDLE,
			"jQuery( window ).on( 'elementor/frontend/init', function () {"
				. "elementorFrontend.hooks.addAction( 'frontend/element_ready/ttt-logo-carousel.default', function ( \$scope ) {"
					. 'if ( window.tttMarquee ) { window.tttMarquee.initAll( $scope[0] ); }'
				. '} );'
			. '} );'
		);
	}

	/**
	 * Tell an administrator when Elementor is missing or too old.
	 *
	 * @return void
	 */
	public static function maybe_render_notice() {
		if ( self::is_supported() || ! current_user_can( 'activate_plugins' ) ) {
			return;
		}

		printf(
			'<div class="notice notice-warning"><p>%s</p></div>',
			esc_html(
				sprintf(
					/* translators: %s: minimum supported Elementor version. */
					__( 'Top Tier Tutors: the Logo Carousel widget needs Elementor %s or newer. The [toptiertutors_logo_carousel] shortcode still works without it.', 'blueworx-client-toptiertutors' ),
					self::MIN_ELEMENTOR_VERSION
				)
			)
		);
	}
}
```

- [ ] **Step 3: Write the widget**

Create `includes/elementor/widgets/class-logo-carousel-widget.php`:

```php
<?php
/**
 * Logo Carousel Elementor widget.
 *
 * A thin adapter: it declares controls and hands their values to
 * Blueworx_TopTierTutors_Marquee_Renderer, which owns the markup.
 *
 * @package BlueworxClientTopTierTutors
 */

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use Elementor\Controls_Manager;
use Elementor\Widget_Base;

/**
 * Continuous logo marquee.
 */
class Blueworx_TopTierTutors_Logo_Carousel_Widget extends Widget_Base {

	/**
	 * Widget slug.
	 *
	 * @return string
	 */
	public function get_name() {
		return 'ttt-logo-carousel';
	}

	/**
	 * Widget label.
	 *
	 * @return string
	 */
	public function get_title() {
		return __( 'Logo Carousel', 'blueworx-client-toptiertutors' );
	}

	/**
	 * Panel icon.
	 *
	 * @return string
	 */
	public function get_icon() {
		return 'eicon-slider-push';
	}

	/**
	 * Panel category.
	 *
	 * @return string[]
	 */
	public function get_categories() {
		return array( Blueworx_TopTierTutors_Elementor_Integration::CATEGORY );
	}

	/**
	 * Stylesheets this widget needs.
	 *
	 * @return string[]
	 */
	public function get_style_depends() {
		return array( Blueworx_TopTierTutors_Plugin::MARQUEE_HANDLE );
	}

	/**
	 * Scripts this widget needs.
	 *
	 * @return string[]
	 */
	public function get_script_depends() {
		return array( Blueworx_TopTierTutors_Plugin::MARQUEE_HANDLE );
	}

	/**
	 * Available image sizes, for the size select.
	 *
	 * @return array<string,string>
	 */
	private function image_size_options() {
		$options = array();

		foreach ( get_intermediate_image_sizes() as $size ) {
			$options[ $size ] = ucwords( str_replace( array( '-', '_' ), ' ', $size ) );
		}

		$options['full'] = __( 'Full', 'blueworx-client-toptiertutors' );

		return $options;
	}

	/**
	 * Declare the widget's controls.
	 *
	 * @return void
	 */
	protected function register_controls() {
		$this->start_controls_section(
			'content_section',
			array(
				'label' => __( 'Logos', 'blueworx-client-toptiertutors' ),
				'tab'   => Controls_Manager::TAB_CONTENT,
			)
		);

		$this->add_control(
			'images',
			array(
				'label'   => __( 'Images', 'blueworx-client-toptiertutors' ),
				'type'    => Controls_Manager::GALLERY,
				'default' => array(),
			)
		);

		$this->add_control(
			'image_size',
			array(
				'label'   => __( 'Image size', 'blueworx-client-toptiertutors' ),
				'type'    => Controls_Manager::SELECT,
				'options' => $this->image_size_options(),
				'default' => 'medium',
			)
		);

		$this->add_control(
			'direction',
			array(
				'label'   => __( 'Direction', 'blueworx-client-toptiertutors' ),
				'type'    => Controls_Manager::SELECT,
				'options' => array(
					'left'  => __( 'Left', 'blueworx-client-toptiertutors' ),
					'right' => __( 'Right', 'blueworx-client-toptiertutors' ),
				),
				'default' => 'left',
			)
		);

		$this->add_control(
			'speed',
			array(
				'label'       => __( 'Speed', 'blueworx-client-toptiertutors' ),
				'description' => __( 'Pixels per second. Stays constant however many logos you add.', 'blueworx-client-toptiertutors' ),
				'type'        => Controls_Manager::SLIDER,
				'size_units'  => array( 'px' ),
				'range'       => array(
					'px' => array(
						'min'  => 10,
						'max'  => 300,
						'step' => 5,
					),
				),
				'default'     => array(
					'unit' => 'px',
					'size' => 60,
				),
			)
		);

		$this->add_control(
			'pause_on_hover',
			array(
				'label'        => __( 'Pause on hover', 'blueworx-client-toptiertutors' ),
				'type'         => Controls_Manager::SWITCHER,
				'default'      => 'yes',
				'return_value' => 'yes',
			)
		);

		$this->add_control(
			'full_bleed',
			array(
				'label'        => __( 'Full width', 'blueworx-client-toptiertutors' ),
				'description'  => __( 'Break out of the content column to the edges of the screen.', 'blueworx-client-toptiertutors' ),
				'type'         => Controls_Manager::SWITCHER,
				'default'      => 'yes',
				'return_value' => 'yes',
			)
		);

		$this->end_controls_section();

		$this->start_controls_section(
			'style_section',
			array(
				'label' => __( 'Logos', 'blueworx-client-toptiertutors' ),
				'tab'   => Controls_Manager::TAB_STYLE,
			)
		);

		$this->add_responsive_control(
			'item_height',
			array(
				'label'      => __( 'Logo height', 'blueworx-client-toptiertutors' ),
				'type'       => Controls_Manager::SLIDER,
				'size_units' => array( 'px' ),
				'range'      => array(
					'px' => array(
						'min' => 40,
						'max' => 400,
					),
				),
				'default'    => array(
					'unit' => 'px',
					'size' => 200,
				),
				'selectors'  => array(
					'{{WRAPPER}} .ttt-marquee' => '--ttt-marquee-height: {{SIZE}}{{UNIT}};',
				),
			)
		);

		$this->add_responsive_control(
			'item_gap',
			array(
				'label'      => __( 'Gap', 'blueworx-client-toptiertutors' ),
				'type'       => Controls_Manager::SLIDER,
				'size_units' => array( 'px' ),
				'range'      => array(
					'px' => array(
						'min' => 0,
						'max' => 200,
					),
				),
				'default'    => array(
					'unit' => 'px',
					'size' => 60,
				),
				'selectors'  => array(
					'{{WRAPPER}} .ttt-marquee' => '--ttt-marquee-gap: {{SIZE}}{{UNIT}};',
				),
			)
		);

		$this->end_controls_section();
	}

	/**
	 * Render the widget.
	 *
	 * @return void
	 */
	protected function render() {
		$settings = $this->get_settings_for_display();

		$ids = array();

		foreach ( (array) $settings['images'] as $image ) {
			if ( ! empty( $image['id'] ) ) {
				$ids[] = (int) $image['id'];
			}
		}

		if ( empty( $ids ) ) {
			if ( \Elementor\Plugin::$instance->editor->is_edit_mode() ) {
				printf(
					'<p class="ttt-marquee__placeholder">%s</p>',
					esc_html__( 'Choose some logos to show here.', 'blueworx-client-toptiertutors' )
				);
			}

			return;
		}

		$speed = isset( $settings['speed']['size'] ) ? (int) $settings['speed']['size'] : 60;

		// Renderer output is already escaped attribute by attribute.
		echo Blueworx_TopTierTutors_Marquee_Renderer::render( // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
			array(
				'ids'            => $ids,
				'image_size'     => $settings['image_size'],
				'speed'          => $speed,
				'direction'      => $settings['direction'],
				'pause_on_hover' => 'yes' === $settings['pause_on_hover'],
				'full_bleed'     => 'yes' === $settings['full_bleed'],
			)
		);
	}
}
```

- [ ] **Step 4: Load and register the integration**

In `blueworx-client-toptiertutors.php`, add below the two requires added in Task 1:

```php
require_once BLUEWORX_TOPTIERTUTORS_DIR . 'includes/elementor/class-elementor-integration.php';
```

In `includes/class-plugin.php`, add this line to `register()`, below the shortcode registration:

```php
		Blueworx_TopTierTutors_Elementor_Integration::register();
```

- [ ] **Step 5: Check the PHP parses and the suite still passes**

```bash
php -l includes/elementor/class-elementor-integration.php
php -l includes/elementor/widgets/class-logo-carousel-widget.php
npx playwright test
```

Expected: `No syntax errors detected` for both, and 19 tests passing — the widget files are never loaded without Elementor, so nothing regresses.

- [ ] **Step 6: Verify the widget by hand**

The harness has no Elementor, so this is manual. On a WordPress site with Elementor installed and this plugin active:

1. Edit a page with Elementor. The panel has a **Top Tier Tutors** category containing **Logo Carousel**.
2. Drag it in with no images chosen — the editor shows "Choose some logos to show here." and the front end shows nothing.
3. Choose five logos. They scroll leftwards, seamlessly, with both edges faded.
4. Change **Speed** to 200 — it scrolls faster, and still loops without a jump.
5. Change **Direction** to Right — it reverses.
6. Turn **Pause on hover** off, reload, hover — it keeps moving.
7. Turn **Full width** off — the strip sits inside the content column.
8. Set **Logo height** on the Tablet breakpoint — only tablet widths change.
9. Deactivate Elementor — an admin notice appears and the shortcode still renders.

Record the result in the PR description. If any step fails, fix it before Task 6.

- [ ] **Step 7: Commit**

```bash
git add includes/elementor blueworx-client-toptiertutors.php includes/class-plugin.php docs/superpowers/specs
git commit -m "Add the Logo Carousel Elementor widget over the shared renderer"
```

---

### Task 6: Version, changelog, docs and follow-up issue

**Files:**
- Modify: `blueworx-client-toptiertutors.php` (header `Version:` and the version constant)
- Modify: `package.json`
- Modify: `CHANGELOG.md`
- Modify: `README.md`
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: everything from Tasks 1–5.
- Produces: version `0.2.0` across the plugin header, the constant and `package.json`.

- [ ] **Step 1: Bump the version in all three places**

In `blueworx-client-toptiertutors.php`:

```php
 * Version:           0.2.0
```

```php
define( 'BLUEWORX_TOPTIERTUTORS_VERSION', '0.2.0' );
```

In `package.json`:

```json
  "version": "0.2.0",
```

- [ ] **Step 2: Add the changelog section**

Insert directly above the `## 0.1.0` heading in `CHANGELOG.md`:

```markdown
## 0.2.0

- Logo Carousel Elementor widget: a full-bleed, continuously scrolling logo
  strip with an edge fade, matching Figma Section 11.
- `[toptiertutors_logo_carousel]` shortcode rendering the same markup, for pages
  not built in Elementor.
- Speed is set in pixels per second and stays constant as logos are added.
- Pauses on hover and on keyboard focus; honours `prefers-reduced-motion` by
  dropping the animation and making the strip scrollable instead.
```

- [ ] **Step 3: Add the linter to the lint script**

The two new JS files need checking. In `package.json`, replace the `lint` script with:

```json
    "lint": "node --check playwright.config.js && node --check tests/global-setup.js && node --check tests/smoke.spec.js && node --check tests/marquee.spec.js && node --check assets/logo-carousel.js",
```

- [ ] **Step 4: Document the widget**

Add this section to `README.md`, directly above `## Local testing`:

````markdown
## Logo Carousel

A full-bleed, continuously scrolling strip of logos. Add it in Elementor from
the **Top Tier Tutors** category, or with the shortcode:

```
[toptiertutors_logo_carousel ids="12,13,14" size="full" speed="60"]
```

| Attribute | Default | Meaning |
|---|---|---|
| `ids` | — | Comma-separated attachment IDs, in display order |
| `size` | `medium` | Registered image size |
| `speed` | `60` | Pixels per second — constant however many logos there are |
| `direction` | `left` | `left` or `right` |
| `pause_on_hover` | `yes` | `no` to keep scrolling under the cursor |
| `full_bleed` | `yes` | `no` to keep it inside the content column |
| `height` | CSS default (200px) | Logo height in px |
| `gap` | CSS default (60px) | Space between logos in px |

Elementor 3.5+ is needed for the widget; the shortcode works without Elementor.
````

Add this bullet to the "This project" section of `CLAUDE.md`, below the Status line:

```markdown
- **Elementor:** the widget in `includes/elementor/` is a thin adapter over `Blueworx_TopTierTutors_Marquee_Renderer`. Keep it that way — the renderer, shortcode, CSS and JS stay Elementor-free so the Playwright suite can drive them in a harness that has no Elementor.
```

- [ ] **Step 5: Run lint and the full suite once**

```bash
npm run lint
npm run build
npx playwright test
```

Expected: lint prints no errors, build prints its no-op message, 19 tests pass with 0 skipped. Per the linting rule, do not start a fix-and-rerun loop — collect any findings and report them at the end.

- [ ] **Step 6: Commit and push**

```bash
git add -A
git commit -m "Release 0.2.0: logo carousel widget"
git push -u origin add-logo-carousel-widget
```

- [ ] **Step 7: Open the pull request and the follow-up issue**

```bash
gh pr create --fill --title "Add the Logo Carousel Elementor widget"
gh issue create \
  --title "Install Elementor into the test harness and cover the widget adapter" \
  --body "The Logo Carousel's renderer, CSS and JS are covered by Playwright through the shortcode, but the Elementor widget class itself is only verified by hand — the foundation's WordPress harness has no Elementor. Pull Elementor into the harness during provisioning and add a test that the widget registers, appears in the Top Tier Tutors category, and renders the same markup as the shortcode. Recorded in the design spec under 'Known coverage gap'."
```

Paste the Task 5 Step 6 manual verification results into the PR description.

---

## Self-review

**Spec coverage**

| Spec requirement | Task |
|---|---|
| Renderer, shortcode, Elementor integration, widget, CSS, JS file layout | 1, 2, 3, 5 |
| Markup shape and single PHP render of the set | 1 |
| Even clone count, `aria-hidden`, `tabindex="-1"` | 3 |
| `(trackWidth ÷ 2) ÷ speed` duration | 3 |
| `ResizeObserver` recompute | 3 |
| Pause on hover | 4 |
| `prefers-reduced-motion` + scrollable fallback | 3 (no cloning), 4 (CSS) |
| Tile height / `width: auto` / `max-width: none` | 2 |
| Gap 60px | 2 |
| Edge fade mask with `-webkit-` prefix | 2 |
| Full bleed via `--ttt-vw` | 2, 3 |
| All eight controls | 5 |
| No `content_template()` | 5 (not written) |
| No images → editor placeholder only | 5 |
| Deleted attachment skipped | 1 |
| Elementor missing/old → notice, plugin still boots | 5 |
| All seven listed test cases | 1–4 |
| Known coverage gap recorded and issued | 5 (manual), 6 (issue) |

**Deviation from the spec:** `Group_Control_Image_Size` is replaced by a plain select, with the spec edited to match in Task 5 Step 1.

**Naming consistency:** `Blueworx_TopTierTutors_Marquee_Renderer::render`, `Blueworx_TopTierTutors_Marquee_Shortcode::TAG`, `Blueworx_TopTierTutors_Plugin::MARQUEE_HANDLE`, `Blueworx_TopTierTutors_Elementor_Integration::CATEGORY`, `window.tttMarquee.init/initAll`, `--ttt-marquee-height/-gap/-duration`, `--ttt-vw`, `data-ttt-marquee`, `data-ttt-clone`, `data-ttt-ready`, keyframe `ttt-marquee-scroll` — each is defined once and used identically wherever it recurs.
