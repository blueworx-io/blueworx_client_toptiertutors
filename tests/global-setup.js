// @ts-check
const { execFileSync } = require('child_process');
const { existsSync } = require('fs');
const path = require('path');

// Seeds the content the suite cannot create for itself — a published page
// carrying the [toptiertutors] shortcode — by talking to the local harness's
// WordPress directly. Worker processes are forked after this runs, so the URL
// is handed on through the environment.
const WP_LOAD = path.join(__dirname, '..', '.wp-test', 'wp', 'wp-load.php');
const SEEDER = path.join(__dirname, 'fixtures', 'create-fixture-page.php');

module.exports = () => {
  if (!existsSync(WP_LOAD)) {
    throw new Error(
      `No local WordPress at ${WP_LOAD}. Start the harness first: npm run wp:up`
    );
  }

  const permalink = execFileSync('php', [SEEDER, WP_LOAD], { encoding: 'utf8' }).trim();

  if (!permalink) {
    throw new Error('Fixture page seeding produced no permalink.');
  }

  process.env.TTT_FIXTURE_URL = permalink;
  console.log(`Fixture page ready: ${permalink}`);
};
