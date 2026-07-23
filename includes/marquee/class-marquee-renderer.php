<?php
/**
 * Markup for the logo marquee.
 *
 * Deliberately free of Elementor: the Elementor widget, the shortcode and the
 * test suite all render through this one method, so the markup has a single
 * definition and can be exercised without Elementor installed.
 *
 * @package BlueworxClientTopTierTutors
 */

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Turns marquee settings into HTML.
 */
class Blueworx_TopTierTutors_Marquee_Renderer {

	/**
	 * Default arguments. Height and gap of 0 mean "leave it to the stylesheet".
	 *
	 * @var array<string,mixed>
	 */
	const DEFAULTS = array(
		'ids'            => array(),
		'image_size'     => 'medium',
		'speed'          => 60,
		'direction'      => 'left',
		'pause_on_hover' => true,
		'full_bleed'     => true,
		'height'         => 0,
		'gap'            => 0,
		'extra_class'    => '',
	);

	/**
	 * Render the marquee.
	 *
	 * @param array<string,mixed> $args See self::DEFAULTS.
	 * @return string HTML, or an empty string when there is nothing to show.
	 */
	public static function render( array $args ) {
		$args = array_merge( self::DEFAULTS, $args );

		$ids = array_values( array_filter( array_map( 'absint', (array) $args['ids'] ) ) );

		if ( empty( $ids ) ) {
			return '';
		}

		$items = '';

		foreach ( $ids as $id ) {
			$image = wp_get_attachment_image(
				$id,
				$args['image_size'],
				false,
				array(
					'class'    => 'ttt-marquee__image',
					'loading'  => 'lazy',
					'decoding' => 'async',
				)
			);

			// Empty when the attachment has been deleted since it was chosen.
			if ( ! $image ) {
				continue;
			}

			$items .= '<li class="ttt-marquee__item">' . $image . '</li>';
		}

		if ( '' === $items ) {
			return '';
		}

		$styles = array();

		if ( absint( $args['height'] ) > 0 ) {
			$styles[] = '--ttt-marquee-height:' . absint( $args['height'] ) . 'px';
		}

		if ( absint( $args['gap'] ) > 0 ) {
			$styles[] = '--ttt-marquee-gap:' . absint( $args['gap'] ) . 'px';
		}

		return sprintf(
			'<div class="%1$s" data-ttt-marquee data-speed="%2$d" data-direction="%3$s" data-pause-on-hover="%4$d" data-full-bleed="%5$d"%6$s>' .
				'<div class="ttt-marquee__viewport"><ul class="ttt-marquee__track" role="list">%7$s</ul></div>' .
			'</div>',
			esc_attr( trim( 'ttt-marquee ' . $args['extra_class'] ) ),
			max( 1, absint( $args['speed'] ) ),
			'right' === $args['direction'] ? 'right' : 'left',
			$args['pause_on_hover'] ? 1 : 0,
			$args['full_bleed'] ? 1 : 0,
			$styles ? ' style="' . esc_attr( implode( ';', $styles ) ) . '"' : '',
			$items
		);
	}
}
