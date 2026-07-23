<?php
/**
 * Plugin bootstrap.
 *
 * @package BlueworxClientTopTierTutors
 */

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Wires the plugin's hooks. Deliberately thin — feature code lives in its own
 * classes under includes/ and is registered from here.
 */
class Blueworx_TopTierTutors_Plugin {

	/**
	 * Shortcode that renders the plugin's front-end output.
	 */
	const SHORTCODE = 'toptiertutors';

	/**
	 * Hook the plugin into WordPress.
	 *
	 * @return void
	 */
	public static function register() {
		add_action( 'init', array( __CLASS__, 'register_shortcodes' ) );
		add_action( 'wp_enqueue_scripts', array( __CLASS__, 'enqueue_assets' ) );
	}

	/**
	 * Register the plugin's shortcodes.
	 *
	 * @return void
	 */
	public static function register_shortcodes() {
		add_shortcode( self::SHORTCODE, array( __CLASS__, 'render_shortcode' ) );
	}

	/**
	 * Render the [toptiertutors] shortcode.
	 *
	 * Placeholder output for the scaffold — replaced when the first real feature
	 * lands. The wrapper class and data attribute are what the smoke test asserts
	 * on, so keep them stable.
	 *
	 * @param array<string,string>|string $atts Shortcode attributes.
	 * @return string
	 */
	public static function render_shortcode( $atts = array() ) {
		unset( $atts );

		return sprintf(
			'<div class="ttt-root" data-ttt-version="%s"></div>',
			esc_attr( BLUEWORX_TOPTIERTUTORS_VERSION )
		);
	}

	/**
	 * Enqueue front-end assets.
	 *
	 * Version-stamped from the plugin header so a release busts the cache.
	 *
	 * @return void
	 */
	public static function enqueue_assets() {
		wp_enqueue_style(
			'blueworx-toptiertutors',
			BLUEWORX_TOPTIERTUTORS_URL . 'assets/toptiertutors.css',
			array(),
			BLUEWORX_TOPTIERTUTORS_VERSION
		);
	}
}
