# Changelog

All notable changes to this plugin are documented here. Versions follow semver —
patch for fixes, minor for features — and every pull request bumps the version
and adds its entry here (CI enforces both).

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
