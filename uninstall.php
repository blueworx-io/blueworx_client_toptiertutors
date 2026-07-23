<?php
/**
 * Uninstall handler.
 *
 * Runs when the plugin is deleted from wp-admin. Nothing is persisted yet — as
 * options, tables or post types are added, remove them here.
 *
 * @package BlueworxClientTopTierTutors
 */

// Exit if not called by WordPress during uninstall.
if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}
