<?php
/**
 * Logo Carousel Elementor widget.
 *
 * A thin adapter: it declares controls and hands their values to
 * Blueworx_TopTierTutors_Marquee_Renderer, which owns the markup.
 *
 * @package BlueworxClientTopTierTutors
 */

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use Elementor\Controls_Manager;
use Elementor\Widget_Base;

/**
 * Continuous logo marquee.
 */
class Blueworx_TopTierTutors_Logo_Carousel_Widget extends Widget_Base {

	/**
	 * Widget slug.
	 *
	 * @return string
	 */
	public function get_name() {
		return 'ttt-logo-carousel';
	}

	/**
	 * Widget label.
	 *
	 * @return string
	 */
	public function get_title() {
		return __( 'Logo Carousel', 'blueworx-client-toptiertutors' );
	}

	/**
	 * Panel icon.
	 *
	 * @return string
	 */
	public function get_icon() {
		return 'eicon-slider-push';
	}

	/**
	 * Panel category.
	 *
	 * @return string[]
	 */
	public function get_categories() {
		return array( Blueworx_TopTierTutors_Elementor_Integration::CATEGORY );
	}

	/**
	 * Stylesheets this widget needs.
	 *
	 * @return string[]
	 */
	public function get_style_depends() {
		return array( Blueworx_TopTierTutors_Plugin::MARQUEE_HANDLE );
	}

	/**
	 * Scripts this widget needs.
	 *
	 * @return string[]
	 */
	public function get_script_depends() {
		return array( Blueworx_TopTierTutors_Plugin::MARQUEE_HANDLE );
	}

	/**
	 * Available image sizes, for the size select.
	 *
	 * @return array<string,string>
	 */
	private function image_size_options() {
		$options = array();

		foreach ( get_intermediate_image_sizes() as $size ) {
			$options[ $size ] = ucwords( str_replace( array( '-', '_' ), ' ', $size ) );
		}

		$options['full'] = __( 'Full', 'blueworx-client-toptiertutors' );

		return $options;
	}

	/**
	 * Declare the widget's controls.
	 *
	 * @return void
	 */
	protected function register_controls() {
		$this->start_controls_section(
			'content_section',
			array(
				'label' => __( 'Logos', 'blueworx-client-toptiertutors' ),
				'tab'   => Controls_Manager::TAB_CONTENT,
			)
		);

		$this->add_control(
			'images',
			array(
				'label'   => __( 'Images', 'blueworx-client-toptiertutors' ),
				'type'    => Controls_Manager::GALLERY,
				'default' => array(),
			)
		);

		$this->add_control(
			'image_size',
			array(
				'label'   => __( 'Image size', 'blueworx-client-toptiertutors' ),
				'type'    => Controls_Manager::SELECT,
				'options' => $this->image_size_options(),
				'default' => 'medium',
			)
		);

		$this->add_control(
			'direction',
			array(
				'label'   => __( 'Direction', 'blueworx-client-toptiertutors' ),
				'type'    => Controls_Manager::SELECT,
				'options' => array(
					'left'  => __( 'Left', 'blueworx-client-toptiertutors' ),
					'right' => __( 'Right', 'blueworx-client-toptiertutors' ),
				),
				'default' => 'left',
			)
		);

		$this->add_control(
			'speed',
			array(
				'label'       => __( 'Speed', 'blueworx-client-toptiertutors' ),
				'description' => __( 'Pixels per second. Stays constant however many logos you add.', 'blueworx-client-toptiertutors' ),
				'type'        => Controls_Manager::SLIDER,
				'size_units'  => array( 'px' ),
				'range'       => array(
					'px' => array(
						'min'  => 10,
						'max'  => 300,
						'step' => 5,
					),
				),
				'default'     => array(
					'unit' => 'px',
					'size' => 60,
				),
			)
		);

		$this->add_control(
			'pause_on_hover',
			array(
				'label'        => __( 'Pause on hover', 'blueworx-client-toptiertutors' ),
				'type'         => Controls_Manager::SWITCHER,
				'default'      => 'yes',
				'return_value' => 'yes',
			)
		);

		$this->add_control(
			'full_bleed',
			array(
				'label'        => __( 'Full width', 'blueworx-client-toptiertutors' ),
				'description'  => __( 'Break out of the content column to the edges of the screen.', 'blueworx-client-toptiertutors' ),
				'type'         => Controls_Manager::SWITCHER,
				'default'      => 'yes',
				'return_value' => 'yes',
			)
		);

		$this->end_controls_section();

		$this->start_controls_section(
			'style_section',
			array(
				'label' => __( 'Logos', 'blueworx-client-toptiertutors' ),
				'tab'   => Controls_Manager::TAB_STYLE,
			)
		);

		$this->add_responsive_control(
			'item_height',
			array(
				'label'      => __( 'Logo height', 'blueworx-client-toptiertutors' ),
				'type'       => Controls_Manager::SLIDER,
				'size_units' => array( 'px' ),
				'range'      => array(
					'px' => array(
						'min' => 40,
						'max' => 400,
					),
				),
				'default'    => array(
					'unit' => 'px',
					'size' => 200,
				),
				'selectors'  => array(
					'{{WRAPPER}} .ttt-marquee' => '--ttt-marquee-height: {{SIZE}}{{UNIT}};',
				),
			)
		);

		$this->add_responsive_control(
			'item_gap',
			array(
				'label'      => __( 'Gap', 'blueworx-client-toptiertutors' ),
				'type'       => Controls_Manager::SLIDER,
				'size_units' => array( 'px' ),
				'range'      => array(
					'px' => array(
						'min' => 0,
						'max' => 200,
					),
				),
				'default'    => array(
					'unit' => 'px',
					'size' => 60,
				),
				'selectors'  => array(
					'{{WRAPPER}} .ttt-marquee' => '--ttt-marquee-gap: {{SIZE}}{{UNIT}};',
				),
			)
		);

		$this->end_controls_section();
	}

	/**
	 * Render the widget.
	 *
	 * @return void
	 */
	protected function render() {
		$settings = $this->get_settings_for_display();

		$ids = array();

		foreach ( (array) $settings['images'] as $image ) {
			if ( ! empty( $image['id'] ) ) {
				$ids[] = (int) $image['id'];
			}
		}

		if ( empty( $ids ) ) {
			if ( \Elementor\Plugin::$instance->editor->is_edit_mode() ) {
				printf(
					'<p class="ttt-marquee__placeholder">%s</p>',
					esc_html__( 'Choose some logos to show here.', 'blueworx-client-toptiertutors' )
				);
			}

			return;
		}

		$speed = isset( $settings['speed']['size'] ) ? (int) $settings['speed']['size'] : 60;

		// Renderer output is already escaped attribute by attribute.
		echo Blueworx_TopTierTutors_Marquee_Renderer::render( // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
			array(
				'ids'            => $ids,
				'image_size'     => $settings['image_size'],
				'speed'          => $speed,
				'direction'      => $settings['direction'],
				'pause_on_hover' => 'yes' === $settings['pause_on_hover'],
				'full_bleed'     => 'yes' === $settings['full_bleed'],
			)
		);
	}
}
