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
<div class="ttt-marquee" data-ttt-marquee data-step-ms="600" data-pause-ms="2000" data-arc="24" data-direction="left" data-pause-on-hover="1" data-full-bleed="1">
  <div class="ttt-marquee__viewport">
    <ul class="ttt-marquee__track" role="list">
      <li class="ttt-marquee__item"><img src="…" alt="…" width="…" height="…" loading="lazy"></li>
      …
    </ul>
  </div>
</div>
```

JS then clones the whole logo set until the track is at least twice the viewport
width, so a three-logo strip rotates as seamlessly as a twenty-logo one. Real
rotation recycles tiles rather than shifting a track by a fixed percentage, so
— unlike the original marquee — there is no need for an even copy count.
Clones carry `aria-hidden="true"`, and any focusable content inside a clone
gets `tabindex="-1"`.

Without JS the strip renders as a static row of logos. Nothing disappears and
nothing is announced twice.

## Motion

**Updated 2026-07-23 (stepped rotation and arc):** the client asked for paged
motion — items rotate in, pause, then rotate again — in place of the
continuous marquee this section originally described. That request supersedes
the earlier "continuous drift" decision above; the off-canvas bleed and edge
fade still apply; the mechanism for how the strip moves does not. The vertical
arc described below is a further addition of the client's, not something
present in the Figma — the Figma node has all five tiles at `y=39` with
identical heights, dead flat.

- Motion is entirely JavaScript. Nothing animates via CSS any more: no
  keyframe, no `animation` declaration, no `--ttt-marquee-duration`.
- One **step** advances the track by the width of the leading item plus its
  gap (`stepPx`), transitioning `translateX` over `step_ms`. On
  `transitionend` the leading item is recycled to the end, transitions are
  turned off, the track is reset to `translateX(0)`, a reflow is forced, and
  transitions are turned back on — real rotation, so nothing ever runs out.
  `direction="right"` mirrors this: the trailing item moves to the front and
  the track starts offset by `-lastWidth`, transitioning to `0`.
- Between steps the strip holds for `pause_ms` before the next step.
- The **arc**: each item's own `translateY` lifts it toward the top as it
  moves away from the strip's horizontal centre. `d` is the distance from the
  viewport's centre to the item's centre, divided by half the viewport width,
  clamped to `1`; lift is `arc * d²` (squared so the centre stays flat and the
  rise gathers toward the edges). `arc: 0` is flat. The item's target arc for
  its position **after** the slide is set before the slide starts, so the lift
  animates together with the step instead of lurching afterwards. Items keep
  their own transform; the track keeps its own — they compose without
  fighting because they are different elements.
- `ResizeObserver` on the marquee root still recomputes `--ttt-vw` and
  re-clones, debounced.
- Pause on hover and keyboard focus now means: do not schedule the next step.
  A step already in flight finishes.
- `prefers-reduced-motion: reduce` still suppresses all of this — no
  stepping, no clones, no arc — and switches the viewport to
  `overflow-x: auto` so every logo stays reachable by scroll and keyboard.
- The even-clone-count rule this section previously required no longer
  applies. Real rotation recycles tiles instead of a track shifting by a fixed
  percentage, so any copy count covering the viewport twice over is fine.

## Design fidelity

| Property | Value | Note |
|---|---|---|
| Tile height | `200px` | Responsive control |
| Tile width | `auto`, `max-width: none` | `max-width: none` is required — themes commonly set `img { max-width: 100% }`, which would squash the wide logos |
| Gap | `60px` | Responsive control |
| Edge fade | `mask-image: linear-gradient(to right, transparent 0 7.692%, #000 50%, transparent 92.308% 100%)` | The inverse of Figma's `#fafafa` overlay. A mask assumes nothing about the section background, so it survives a background colour change; an overlay would not. Ships with the `-webkit-` prefix |
| Full bleed | `width: var(--ttt-vw); max-width: none; left: 50%; transform: translateX(-50%)` | `--ttt-vw` is set by JS from `document.documentElement.clientWidth`. Plain `100vw` includes the scrollbar and causes horizontal page overflow. CSS falls back to `100vw` before JS runs. `max-width: none` is required: block themes cap constrained-layout children with `max-width: var(--wp--style--global--content-size)`, and max-width beats width at any specificity. Centring is `left`/`transform` rather than negative margins because the same theme rule sets `margin-left: auto`, which a margin-based break-out has to out-specify on every theme |

Heading typography (Poppins SemiBold 22px / 1.6, `#0e0e0e`) is out of scope — it
belongs to the separate heading widget.

## Controls

All from Elementor's free tier; Elementor Pro is not required.

**Content**

- Images — `Controls_Manager::GALLERY`
- Image size — `Controls_Manager::SELECT` over `get_intermediate_image_sizes()` plus `full`, default `medium`. Not `Group_Control_Image_Size`: that control also emits custom dimensions and cropping, which would put resizing logic in the renderer for no gain here
- Direction — select, left (default) / right
- Step duration — slider, ms, default `600`, range 100–3000
- Pause — slider, ms, default `2000`, range 0–10000
- Arc height — slider, px, default `24`, range 0–120 (`0` is flat)
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
shortcode on a seeded page (the existing `tests/global-setup.js` pattern).

**Updated 2026-07-23 (stepped rotation and arc):** items 2 and 3 below described
the continuous marquee's even-clone-count rule and `--ttt-marquee-duration`,
both gone now. Current coverage (`tests/marquee.spec.js`): after one step the
leading item has moved to the end of the track (and the mirror for
`direction="right"`); order does not change during the dwell; hovering
prevents the next step (and does not when `pause_on_hover` is off); an item
near the edge has a more negative arc `translateY` than the centre item, which
sits within a pixel of zero; `arc="0"` leaves every item's transform flat;
reduced motion still yields no clones, no track transform, a scrollable
viewport, no mask and `tabindex="0"`.

1. Every selected logo renders, with its alt text.
2. The track is cloned to at least twice the viewport width.
3. Stepping and the arc behave as above.
4. Hovering pauses stepping when the control is on, and does not when off.
5. Under `prefers-reduced-motion: reduce`, nothing steps and the viewport is
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
