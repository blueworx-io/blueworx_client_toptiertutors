<?php
/**
 * Elementor integration.
 *
 * Everything that knows Elementor exists lives behind this class, so the plugin
 * still boots — and the shortcode still renders — when Elementor is absent.
 *
 * @package BlueworxClientTopTierTutors
 */

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Registers the widget category and widgets with Elementor.
 */
class Blueworx_TopTierTutors_Elementor_Integration {

	/**
	 * Oldest Elementor release these widgets are built against.
	 *
	 * 3.5.0 is where `elementor/widgets/register` replaced the deprecated
	 * `widgets_registered` hook this class uses.
	 */
	const MIN_ELEMENTOR_VERSION = '3.5.0';

	/**
	 * Widget category slug.
	 */
	const CATEGORY = 'toptiertutors';

	/**
	 * Hook into Elementor.
	 *
	 * @return void
	 */
	public static function register() {
		add_action( 'elementor/elements/categories_registered', array( __CLASS__, 'register_category' ) );
		add_action( 'elementor/widgets/register', array( __CLASS__, 'register_widgets' ) );
		add_action( 'elementor/frontend/after_register_scripts', array( __CLASS__, 'register_editor_bridge' ) );
		add_action( 'admin_notices', array( __CLASS__, 'maybe_render_notice' ) );
	}

	/**
	 * Whether a usable Elementor is present.
	 *
	 * @return bool
	 */
	public static function is_supported() {
		return did_action( 'elementor/loaded' )
			&& defined( 'ELEMENTOR_VERSION' )
			&& version_compare( ELEMENTOR_VERSION, self::MIN_ELEMENTOR_VERSION, '>=' );
	}

	/**
	 * Add the plugin's own widget category.
	 *
	 * @param \Elementor\Elements_Manager $elements_manager Elementor's category registry.
	 * @return void
	 */
	public static function register_category( $elements_manager ) {
		if ( ! self::is_supported() ) {
			return;
		}

		$elements_manager->add_category(
			self::CATEGORY,
			array(
				'title' => __( 'Top Tier Tutors', 'blueworx-client-toptiertutors' ),
				'icon'  => 'fa fa-plug',
			)
		);
	}

	/**
	 * Register the widgets.
	 *
	 * @param \Elementor\Widgets_Manager $widgets_manager Elementor's widget registry.
	 * @return void
	 */
	public static function register_widgets( $widgets_manager ) {
		if ( ! self::is_supported() ) {
			return;
		}

		require_once BLUEWORX_TOPTIERTUTORS_DIR . 'includes/elementor/widgets/class-logo-carousel-widget.php';

		$widgets_manager->register( new Blueworx_TopTierTutors_Logo_Carousel_Widget() );
	}

	/**
	 * Re-initialise a marquee after Elementor redraws it in the editor.
	 *
	 * Elementor replaces a widget's DOM on every settings change, which drops the
	 * clones and the data-ttt-ready flag with it.
	 *
	 * @return void
	 */
	public static function register_editor_bridge() {
		wp_add_inline_script(
			Blueworx_TopTierTutors_Plugin::MARQUEE_HANDLE,
			// Guarded: this handle also loads on shortcode-only pages, where
			// Elementor never enqueues jQuery and an unguarded call would throw.
			'if ( window.jQuery ) {'
				. "jQuery( window ).on( 'elementor/frontend/init', function () {"
					. "elementorFrontend.hooks.addAction( 'frontend/element_ready/ttt-logo-carousel.default', function ( \$scope ) {"
						. 'if ( window.tttMarquee ) { window.tttMarquee.initAll( $scope[0] ); }'
					. '} );'
				. '} );'
			. '}'
		);
	}

	/**
	 * Tell an administrator when Elementor is missing or too old.
	 *
	 * @return void
	 */
	public static function maybe_render_notice() {
		if ( self::is_supported() || ! current_user_can( 'activate_plugins' ) ) {
			return;
		}

		$screen = get_current_screen();

		if ( ! $screen || 'plugins' !== $screen->id ) {
			return;
		}

		printf(
			'<div class="notice notice-warning is-dismissible"><p>%s</p></div>',
			esc_html(
				sprintf(
					/* translators: %s: minimum supported Elementor version. */
					__( 'Top Tier Tutors: the Logo Carousel widget needs Elementor %s or newer. The [toptiertutors_logo_carousel] shortcode still works without it.', 'blueworx-client-toptiertutors' ),
					self::MIN_ELEMENTOR_VERSION
				)
			)
		);
	}
}
