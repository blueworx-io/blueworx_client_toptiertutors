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
