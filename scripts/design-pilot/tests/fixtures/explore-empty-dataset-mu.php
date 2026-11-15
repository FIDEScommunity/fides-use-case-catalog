<?php
/**
 * Test fixture for the Explore pages (local design pilot only; never part of a package).
 *
 * With ?fides_explore_fixture=empty the use case data is empty, so the pages show "No examples yet". Copied to the pilot
 * mu-plugins folder by tests/run-explore-themes-sectors-empty.sh and removed again by it. Only active on localhost.
 */
if (! defined('ABSPATH')) {
    exit;
}
add_filter(
    'fides_use_case_design_items',
    static function ($items) {
        $host = strtolower((string) wp_parse_url((string) get_option('home'), PHP_URL_HOST));
        // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- test fixture, read-only GET flag
        if (in_array($host, array('localhost', '127.0.0.1'), true) && isset($_GET['fides_explore_fixture']) && $_GET['fides_explore_fixture'] === 'empty') {
            return array();
        }
        return $items;
    }
);

// ?fides_explore_fixture=emptyall: no use cases AND no classified catalog record (the block must disappear completely).
add_filter(
    'fides_explore_catalog_selection',
    static function ($selection) {
        $host = strtolower((string) wp_parse_url((string) get_option('home'), PHP_URL_HOST));
        // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- test fixture, read-only GET flag
        if (in_array($host, array('localhost', '127.0.0.1'), true) && isset($_GET['fides_explore_fixture']) && $_GET['fides_explore_fixture'] === 'emptyall') {
            return array();
        }
        return $selection;
    }
);
add_filter(
    'fides_use_case_design_items',
    static function ($items) {
        $host = strtolower((string) wp_parse_url((string) get_option('home'), PHP_URL_HOST));
        // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- test fixture, read-only GET flag
        if (in_array($host, array('localhost', '127.0.0.1'), true) && isset($_GET['fides_explore_fixture']) && $_GET['fides_explore_fixture'] === 'emptyall') {
            return array();
        }
        return $items;
    },
    11
);
