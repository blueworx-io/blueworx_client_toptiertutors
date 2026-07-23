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
	 * Handle shared by the marquee stylesheet and script.
	 */
	const MARQUEE_HANDLE = 'ttt-logo-carousel';

	/**
	 * Hook the plugin into WordPress.
	 *
	 * @return void
	 */
	public static function register() {
		add_action( 'init', array( __CLASS__, 'register_shortcodes' ) );
		add_action( 'init', array( __CLASS__, 'register_marquee_assets' ) );
		add_action( 'wp_enqueue_scripts', array( __CLASS__, 'enqueue_assets' ) );

		Blueworx_TopTierTutors_Marquee_Shortcode::register();
		Blueworx_TopTierTutors_Elementor_Integration::register();
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

	/**
	 * Register (but do not enqueue) the marquee assets.
	 *
	 * Registered on `init` rather than `wp_enqueue_scripts` so the handles exist
	 * whatever order things run in — the shortcode renders during `the_content`,
	 * which is after `wp_enqueue_scripts` has already fired.
	 *
	 * @return void
	 */
	public static function register_marquee_assets() {
		wp_register_style(
			self::MARQUEE_HANDLE,
			BLUEWORX_TOPTIERTUTORS_URL . 'assets/logo-carousel.css',
			array(),
			BLUEWORX_TOPTIERTUTORS_VERSION
		);

		wp_register_script(
			self::MARQUEE_HANDLE,
			BLUEWORX_TOPTIERTUTORS_URL . 'assets/logo-carousel.js',
			array(),
			BLUEWORX_TOPTIERTUTORS_VERSION,
			true
		);
	}

	/**
	 * Enqueue the marquee assets. Called by whatever renders a marquee.
	 *
	 * @return void
	 */
	public static function enqueue_marquee_assets() {
		wp_enqueue_style( self::MARQUEE_HANDLE );
		wp_enqueue_script( self::MARQUEE_HANDLE );
	}
}
