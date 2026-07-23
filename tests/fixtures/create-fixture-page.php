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
