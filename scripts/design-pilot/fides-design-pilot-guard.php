<?php
/**
 * Plugin Name: FIDES design pilot guard (local only)
 * Description: Keeps the cloned pilot site from publishing, syncing or mailing anything. Read-only HTTP (GET/HEAD) stays allowed so catalog data can load.
 */

if (! defined('ABSPATH')) {
    exit;
}

add_filter(
    'pre_http_request',
    static function ($pre, $args, $url) {
        $method = strtoupper((string) ($args['method'] ?? 'GET'));
        if (in_array($method, array('GET', 'HEAD'), true)) {
            return $pre;
        }
        error_log('FIDES design pilot guard blocked ' . $method . ' ' . $url);
        return new WP_Error('fides_design_pilot_blocked', 'Outgoing write requests are disabled on the local design pilot.');
    },
    1,
    3
);

add_filter(
    'pre_wp_mail',
    static function () {
        return false;
    },
    1
);

add_filter(
    'wp_robots',
    static function ($robots) {
        $robots['noindex']  = true;
        $robots['nofollow'] = true;
        return $robots;
    }
);

add_action(
    'wp_footer',
    static function () {
        echo '<div style="position:fixed;bottom:0;right:0;z-index:99999;background:#0E0E0E;color:#fff;font:12px/18px Inter,system-ui,sans-serif;padding:4px 10px">Local design pilot · not published</div>';
    }
);
