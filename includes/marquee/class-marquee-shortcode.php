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
