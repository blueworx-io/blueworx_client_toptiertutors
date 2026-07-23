<?php
/**
 * Plugin Name:       BlueWorx Labs | Top Tier Tutors
 * Plugin URI:        https://github.com/blueworx-io/blueworx_client_toptiertutors
 * Description:       Top Tier Tutors WordPress plugin.
 * Version:           0.2.1
 * Requires at least: 6.0
 * Requires PHP:      8.2
 * Author:            Blueworx
 * Author URI:        https://babyblue.info
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       blueworx-client-toptiertutors
 * Domain Path:       /languages
 *
 * @package BlueworxClientTopTierTutors
 */

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'BLUEWORX_TOPTIERTUTORS_VERSION', '0.2.1' );
define( 'BLUEWORX_TOPTIERTUTORS_FILE', __FILE__ );
define( 'BLUEWORX_TOPTIERTUTORS_DIR', plugin_dir_path( __FILE__ ) );
define( 'BLUEWORX_TOPTIERTUTORS_URL', plugin_dir_url( __FILE__ ) );

require_once BLUEWORX_TOPTIERTUTORS_DIR . 'includes/marquee/class-marquee-renderer.php';
require_once BLUEWORX_TOPTIERTUTORS_DIR . 'includes/marquee/class-marquee-shortcode.php';
require_once BLUEWORX_TOPTIERTUTORS_DIR . 'includes/elementor/class-elementor-integration.php';
require_once BLUEWORX_TOPTIERTUTORS_DIR . 'includes/class-plugin.php';

Blueworx_TopTierTutors_Plugin::register();

/*
 * Auto-updates from GitHub Releases. See docs/wordpress-auto-updates.md in
 * bluegroup_core_foundation — the library is vendored at plugin-update-checker/
 * and must not be wrapped in a function or conditional (the `use` import has to
 * stay at file scope).
 */
require_once BLUEWORX_TOPTIERTUTORS_DIR . 'plugin-update-checker/plugin-update-checker.php';

use YahnisElsts\PluginUpdateChecker\v5\PucFactory;

$blueworx_update_checker = PucFactory::buildUpdateChecker(
	'https://github.com/blueworx-io/blueworx_client_toptiertutors/',
	__FILE__,
	'blueworx-client-toptiertutors' // Must equal the plugin's folder name on the
	                                // site and the release workflow's plugin_slug.
);

/*
 * The repo is private, so each site needs a read-only token to see releases:
 *
 *     define( 'BLUEWORX_PLUGIN_UPDATE_TOKEN', 'github_pat_...' );
 *
 * in wp-config.php — never in the plugin, never in the repo. Guarded so the same
 * code works unchanged if the repo is ever made public.
 */
if ( defined( 'BLUEWORX_PLUGIN_UPDATE_TOKEN' ) && BLUEWORX_PLUGIN_UPDATE_TOKEN ) {
	$blueworx_update_checker->setAuthentication( BLUEWORX_PLUGIN_UPDATE_TOKEN );
}

/*
 * Install the zip attached to the Release, not GitHub's source tarball — the
 * tarball extracts to <repo>-<version>, which WordPress treats as a different
 * plugin, and it ships every dev file in the repo.
 */
$blueworx_update_checker->getVcsApi()->enableReleaseAssets();
