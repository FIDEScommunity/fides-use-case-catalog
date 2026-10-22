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

/*
 * Site shell navigation uses fides.community paths. On the pilot, point them
 * at the existing local page for the same destination (use cases go to the
 * pilot overview) and at the live page when the local copy has none.
 */
add_filter(
    'fides_site_shell_url',
    static function ($url, $path) {
        if (preg_match('#^https?://#i', (string) $path)) {
            return $url;
        }
        $local = array(
            '/'                                             => '/fides-design-pilot/homepage-fragment/',
            '/ecosystem-explorer/'                          => '/explorer/',
            '/ecosystem-explorer/use-cases/'                => '/fides-design-pilot/overview/',
            '/ecosystem-explorer/use-cases/submit-use-case/' => '/use-case-form/',
            '/ecosystem-explorer/map/'                      => '/map/',
            '/ecosystem-explorer/theme/'                    => '/theme/',
            '/ecosystem-explorer/personal-wallets/'         => '/fides-design-pilot/personal-wallets/',
            '/ecosystem-explorer/organizational-wallets/'   => '/fides-design-pilot/business-wallets/',
            '/ecosystem-explorer/credential-catalog/'       => '/fides-design-pilot/credentials/',
            '/ecosystem-explorer/issuer-catalog/'           => '/issuer-catalog/',
            '/ecosystem-explorer/relying-party-catalog/'    => '/relying-party-websites/',
            '/community-tools/glossary/'                    => '/glossary/',
            '/organizations/'                               => '/fides-design-pilot/organizations/',
            '/organizations/submit-organization/'           => '/organizations-submit/',
            '/organizations/update-organization/'           => '/organizations-update/',
        );
        if (isset($local[$path])) {
            return home_url($local[$path]);
        }
        if (get_page_by_path(trim((string) $path, '/')) instanceof WP_Post) {
            return $url;
        }
        return 'https://fides.community' . $path;
    },
    10,
    2
);

/*
 * localhost is not a *.local host, so make the catalog source order explicit:
 * GitHub first, as in production. A stale-data notice then means GitHub really
 * failed; the same-origin cache and the plugin data are only fallbacks.
 */
add_filter('fides_use_case_catalog_prefer_local_source', '__return_false');

/*
 * On localhost the shared loader prefers the plugin's bundled wallet and
 * credential aggregates, which lag the crawler output GitHub serves. Read
 * the crawler output of the pilot worktree instead, so the server-rendered
 * pages and the browser (GitHub first) show the same records.
 */
add_filter(
    'fides_catalog_local_json_path_for',
    static function ($path, $catalog_type) {
        $repos = array('wallet' => 'wallet-catalog', 'credential' => 'credential-catalog');
        if (! isset($repos[ $catalog_type ])) {
            return $path;
        }
        $crawler = dirname(__DIR__, 3) . '/' . $repos[ $catalog_type ] . '/data/aggregated.json';
        return is_readable($crawler) ? $crawler : $path;
    },
    10,
    2
);

add_action(
    'wp_footer',
    static function () {
        echo '<div style="position:fixed;bottom:0;right:0;z-index:99999;background:#0E0E0E;color:#fff;font:12px/18px Inter,system-ui,sans-serif;padding:4px 10px">Local design pilot · not published</div>';
    }
);
