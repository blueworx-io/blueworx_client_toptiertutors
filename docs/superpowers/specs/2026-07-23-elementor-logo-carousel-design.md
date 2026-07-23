# Design — Elementor logo carousel widget

**Date:** 2026-07-23
**Status:** Approved, ready for an implementation plan
**Figma:** [Section 11 — `10:221`](https://www.figma.com/design/bG4a7GmaGGLT91Dc19nTYI/Untitled?node-id=10-221&m=dev)
(the originally supplied `10:231` is the section's fade rectangle, not the carousel)

## What we're building

A full-bleed, continuously scrolling strip of school logos, delivered as an
Elementor widget in this plugin. It is the "In Proud Partnership with Schools
Across South Africa" band on the Top Tier Tutors home page.

The widget renders the strip only. The heading above it is a separate Elementor
heading widget placed by the site builder, and the decorative dot layer belongs
to the page background — it recurs on nearly every section of the design and
does not belong to this widget.

## Decisions taken, and why

| Decision | Chosen | Why not the alternative |
|---|---|---|
| Scope | Carousel only | A bundled heading duplicates what Elementor's heading widget already does well |
| Motion | Continuous marquee, no arrows or dots | The design's off-canvas bleed and edge fade only make sense under constant drift; paging would fight both |
| Content input | Elementor Gallery control | A repeater is slower to populate for ~20 logos; per-image links aren't needed yet |
| Mechanics | CSS keyframe marquee | Swiper's loop stutters with variable-width slides, and pins us to whichever Swiper version Elementor ships |

### Reference: oneeleven.tech

The client pointed at <https://oneeleven.tech> as a comparable. Its strip is
Elementor's **stock Image Carousel** driven as a marquee: `loop: true`,
`speed: 5000`, `linear` timing, 6/3/2 slides per view across breakpoints, no
fade, contained to 1021px, uniform 147×34 logos.

Our design differs in three ways the stock widget cannot express, which is what
justifies a custom widget rather than CSS overrides on the stock one:

1. Full-bleed — logos run off both edges of the viewport, not a content column.
2. A wide `#fafafa` edge fade.
3. Fixed-height, auto-width tiles (Figma has 395px and 146px logos sharing a
   200px height). Swiper's loop mode is unreliable with variable slide widths.

## Architecture

Elementor is kept at the edges. Everything with logic behind it is
Elementor-independent, which is what makes it testable in the WordPress harness
we already have — that harness has no Elementor.

| File | Responsibility | Elementor-aware |
|---|---|---|
| `includes/marquee/class-marquee-renderer.php` | `render( array $args ): string` — settings to HTML, pure | No |
| `includes/marquee/class-marquee-shortcode.php` | `[toptiertutors_logo_carousel]` | No |
| `includes/elementor/class-elementor-integration.php` | Elementor guard, widget category, widget + asset registration | Yes |
| `includes/elementor/widgets/class-logo-carousel-widget.php` | Elementor controls mapped to renderer args | Yes |
| `assets/logo-carousel.css` | Layout, animation, fade, full-bleed | No |
| `assets/logo-carousel.js` | Cloning, measurement, CSS custom properties | No |

The shortcode is not a bonus feature. It is the seam that lets Playwright drive
the real markup, CSS and JS without Elementor installed, and it costs roughly
twenty lines.

### Data flow

```
Elementor settings ─┐
                    ├─→ Marquee_Renderer::render() ─→ HTML with data-* attributes
Shortcode atts ─────┘                                        │
                                                             ▼
                                          logo-carousel.js reads data-*,
                                          clones track, measures, sets CSS vars
                                                             │
                                                             ▼
                                          logo-carousel.css animates
```

## Markup

PHP renders the logo set **once**:

```html
<div class="ttt-marquee" data-speed="60" data-direction="left" data-pause-on-hover="1" data-full-bleed="1">
  <div class="ttt-marquee__viewport">
    <ul class="ttt-marquee__track" role="list">
      <li class="ttt-marquee__item"><img src="…" alt="…" width="…" height="…" loading="lazy"></li>
      …
    </ul>
  </div>
</div>
```

JS then clones the whole logo set until the track is at least twice the viewport
width **and holds an even number of copies**, so a three-logo strip loops as
seamlessly as a twenty-logo one. The even count is what makes a `-50%` shift land
exactly on a copy boundary. Clones carry `aria-hidden="true"`, and any focusable
content inside a clone gets `tabindex="-1"`.

Without JS the strip renders as a static row of logos. Nothing disappears and
nothing is announced twice.

## Motion

- One keyframe: `translateX(0)` → `translateX(-50%)`, `linear`, `infinite`.
- The animation travels half the track, so the duration is
  `--ttt-marquee-duration: (trackWidth ÷ 2) ÷ speed` seconds — **speed is px/sec
  and stays constant** however many logos are added. Dividing by the full track
  width would run the strip at half the requested speed; a count-based duration
  would instead speed up silently as logos are added.
- `ResizeObserver` on the viewport recomputes duration and `--ttt-vw`, debounced.
- Pause on hover is `animation-play-state: paused`, applied only when the
  control is on.
- `prefers-reduced-motion: reduce` disables the animation entirely and switches
  the viewport to `overflow-x: auto` so every logo stays reachable by scroll and
  keyboard.

## Design fidelity

| Property | Value | Note |
|---|---|---|
| Tile height | `200px` | Responsive control |
| Tile width | `auto`, `max-width: none` | `max-width: none` is required — themes commonly set `img { max-width: 100% }`, which would squash the wide logos |
| Gap | `60px` | Responsive control |
| Edge fade | `mask-image: linear-gradient(to right, transparent 0 7.692%, #000 50%, transparent 92.308% 100%)` | The inverse of Figma's `#fafafa` overlay. A mask assumes nothing about the section background, so it survives a background colour change; an overlay would not. Ships with the `-webkit-` prefix |
| Full bleed | `width: var(--ttt-vw); margin-inline: calc(50% - var(--ttt-vw) / 2)` | `--ttt-vw` is set by JS from `document.documentElement.clientWidth`. Plain `100vw` includes the scrollbar and causes horizontal page overflow. CSS falls back to `100vw` before JS runs |

Heading typography (Poppins SemiBold 22px / 1.6, `#0e0e0e`) is out of scope — it
belongs to the separate heading widget.

## Controls

All from Elementor's free tier; Elementor Pro is not required.

**Content**

- Images — `Controls_Manager::GALLERY`
- Image size — `Controls_Manager::SELECT` over `get_intermediate_image_sizes()` plus `full`, default `medium`. Not `Group_Control_Image_Size`: that control also emits custom dimensions and cropping, which would put resizing logic in the renderer for no gain here
- Direction — select, left (default) / right
- Speed — slider, px per second, default `60`, range 10–300
- Pause on hover — switcher, default on
- Full bleed — switcher, default on

**Style**

- Item height — responsive slider, default `200`
- Gap — responsive slider, default `60`

No `content_template()`. A JS twin of the PHP render is a known maintenance trap
— the two drift apart and the editor stops matching the front end. Elementor
falls back to server-side rendering over AJAX when it is absent.

## Failure modes

| Case | Behaviour |
|---|---|
| No images selected | Editor-only placeholder notice; nothing rendered on the front end |
| Attachment deleted after selection | That ID is skipped; the rest render |
| Elementor not active, or below the minimum version | Admin notice; widget not registered; the plugin still boots and the shortcode still works |
| JS blocked or failed | Static row of logos, no animation |

## Testing

Playwright, against the foundation's local WordPress harness, driving the
shortcode on a seeded page (the existing `tests/global-setup.js` pattern):

1. Every selected logo renders, with its alt text.
2. The track is cloned to at least twice the viewport width, with an even number
   of copies.
3. `--ttt-marquee-duration` matches `(trackWidth ÷ 2) ÷ speed` within tolerance.
4. The animation pauses on hover when the control is on, and does not when off.
5. Under `prefers-reduced-motion: reduce`, no animation runs and the viewport is
   horizontally scrollable.
6. The fade mask is applied to the viewport.
7. With full bleed on, the widget's width exceeds its container's width.

### Known coverage gap

These tests exercise the renderer, CSS and JS — not the Elementor adapter, since
the harness has no Elementor. The adapter will be verified by hand in the
Elementor editor for this build, and a follow-up issue raised to install
Elementor into the harness and add a widget-registration test. This is recorded
rather than left to be discovered later.

## Out of scope

Per-image links, grayscale/hover treatments, border radius, arrows, dots,
touch-drag, the section heading, and the decorative dot layer. Each is a
separate issue if wanted.
