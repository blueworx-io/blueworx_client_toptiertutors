<?php
/**
 * Creates the page the shortcode spec needs, inside the local test WordPress.
 *
 * Run by tests/global-setup.js against the harness's wp-load.php. Seeding through
 * WordPress itself rather than driving the block editor keeps the spec off the
 * ~100-request editor screen, which the harness's single-threaded PHP server
 * serves too slowly to be a reliable smoke test.
 *
 * Prints the published page's permalink on stdout. CLI only — it is excluded
 * from the release zip along with the rest of tests/.
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

const TTT_FIXTURE_SLUG = 'ttt-shortcode-smoke';

$existing = get_page_by_path( TTT_FIXTURE_SLUG );

if ( $existing ) {
	echo get_permalink( $existing );
	exit( 0 );
}

$page_id = wp_insert_post(
	array(
		'post_title'   => 'TTT shortcode smoke',
		'post_name'    => TTT_FIXTURE_SLUG,
		'post_content' => '[toptiertutors]',
		'post_type'    => 'page',
		'post_status'  => 'publish',
	),
	true
);

if ( is_wp_error( $page_id ) ) {
	fwrite( STDERR, $page_id->get_error_message() . "\n" );
	exit( 1 );
}

echo get_permalink( $page_id );
