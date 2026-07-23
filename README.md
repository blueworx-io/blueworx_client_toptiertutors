# blueworx_client_toptiertutors

Top Tier Tutors — WordPress plugin, built on the shared
[`bluegroup_core_foundation`](https://github.com/blueworx-io/bluegroup_core_foundation)
guardrails.

The site is built in code as a plugin — never straight into WordPress core, a
loose theme, or a page builder.

## Layout

| Path | What it is |
|------|------------|
| `blueworx-client-toptiertutors.php` | Main plugin file — header, constants, update checker |
| `includes/` | Feature code, registered from `class-plugin.php` |
| `assets/` | Front-end CSS/JS, enqueued version-stamped from the plugin header |
| `tests/` | Playwright specs, run against a real WordPress |
| `plugin-update-checker/` | Vendored PUC v5.7 — committed deliberately, upgraded by swapping the folder |

## Local testing

Tests run against a disposable WordPress the foundation provisions (PHP + SQLite,
no Docker). It expects `bluegroup_core_foundation` cloned alongside this repo.

```bash
npm install
npm run wp:up          # provisions + activates the plugin on http://127.0.0.1:8881
WP_ADMIN_USER=admin WP_ADMIN_PASS=wptest-admin-pw npx playwright test
npm run wp:down
```

A skipped test is not a passing test — CI fails any run that executes zero tests.

## CI

Every pull request runs the foundation's WordPress guardrails: lint, build, PHP
syntax check, version bump, changelog, approved dependencies, plugin/package
version sync, single-zip check, and Playwright against the local WordPress.

## Releasing

Updates ship as GitHub Releases; sites install them through the vendored update
checker. No zip is uploaded by hand.

1. On the branch, bump the `Version:` header **and** `package.json`, and add the
   `CHANGELOG.md` section.
2. Merge the green PR.
3. When a release is actually wanted: `git tag v0.2.0 && git push origin v0.2.0`.

Each site needs `BLUEWORX_PLUGIN_UPDATE_TOKEN` in `wp-config.php` (fine-grained
read-only Contents token) — without it a private repo's releases are invisible
and the site silently reports the plugin as up to date. Full detail:
`docs/wordpress-auto-updates.md` in the foundation.
