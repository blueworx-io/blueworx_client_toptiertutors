# Changelog

All notable changes to this plugin are documented here. Versions follow semver —
patch for fixes, minor for features — and every pull request bumps the version
and adds its entry here (CI enforces both).

## 0.3.2

- **CI now pins the shared foundation workflow to `@v1` instead of tracking its
  `main` branch.** Any change to the shared workflow used to land in this
  project's CI the moment it merged upstream, with no way to stage it. `v1` is a
  moving major tag that follows backward-compatible releases, so fixes still
  arrive on their own; a breaking change goes to `v2` and waits for a deliberate
  move here. `foundation_ref` is set to match — it defaults to `main`, so pinning
  only the `uses:` ref would run the v1 workflow against today's scripts.
  Nothing about the plugin itself changes.

## 0.3.1

- Logo carousel now always rests with a logo on the strip's centre line, at any
  viewport width. It previously started flush left and stepped by the leading
  item's width, so with logos of differing widths whatever landed mid-strip was
  chance — and the edge fade is fully opaque only at the centre, which made an
  empty centre the one position that read as broken. Steps now run centre to
  centre, and items are recycled once they have left the far edge rather than
  on every step. No markup, CSS or setting changes.

## 0.3.0

- Logo carousel motion replaced: continuous marquee drift is gone, at the
  client's request, in favour of a step / pause / step model — the strip
  advances by one item's width, holds for a dwell, and repeats. `speed` is
  replaced by `step_ms` (default `600`) and `pause_ms` (default `2000`) in the
  renderer, shortcode and Elementor widget alike.
- New `arc` setting (default `24`, `0` for flat): items lift toward the top as
  they move away from the strip's centre, animating together with the step
  rather than afterwards. This is an addition beyond the original Figma, which
  has all tiles flat.
- Pause on hover and keyboard focus, reduced-motion behaviour and clone-based
  looping are unchanged in effect, now driven by JavaScript transitions
  instead of a CSS keyframe. The even-clone-count rule no longer applies —
  any count covering the viewport twice over is fine, since items really
  rotate rather than a track shifting by a fixed percentage.

## 0.2.2

- The Elementor widget is now listed as "TTT Logo Carousel". Another installed
  plugin also provides a "Logo Carousel", and two identically named widgets in
  the panel are easy to confuse. Label only — the widget's internal name is
  unchanged, so widgets already placed on a page are unaffected.

## 0.2.1

- Plugin name shown in WordPress is now "BlueWorx Labs | Top Tier Tutors".
  Display only — the plugin folder, text domain and update checker are unchanged,
  so an installed copy updates in place rather than appearing as a second plugin.

## 0.2.0

- Logo Carousel Elementor widget: a full-bleed, continuously scrolling logo
  strip with an edge fade, matching Figma Section 11.
- `[toptiertutors_logo_carousel]` shortcode rendering the same markup, for pages
  not built in Elementor.
- Speed is set in pixels per second and stays constant as logos are added.
- Pauses on hover and on keyboard focus; honours `prefers-reduced-motion` by
  dropping the animation and making the strip scrollable instead.

## 0.1.0

- Initial scaffold: plugin skeleton on the `bluegroup_core_foundation` guardrails.
- `[toptiertutors]` shortcode placeholder and front-end stylesheet.
- CI caller workflow (`ci-wordpress.yml`, disposable local WordPress) and release
  caller workflow (`release-wordpress.yml`) for GitHub Release auto-updates.
- Vendored Plugin Update Checker v5.7 with release-asset updates wired up.
- Playwright smoke tests against the foundation's local WordPress harness: home
  page responds, the shortcode renders, the stylesheet is enqueued version-stamped.
