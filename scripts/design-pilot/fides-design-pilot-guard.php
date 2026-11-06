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
            '/ecosystem-explorer/start/'                    => '/fides-design-pilot/start/',
            '/about-fides/'                                 => '/fides-design-pilot/about-fides/',
            '/manifesto/'                                   => '/fides-design-pilot/manifesto/',
            '/awards/global-digital-trust-awards/'          => '/fides-design-pilot/global-digital-trust-awards/',
            '/about-fides/news/'                            => '/fides-design-pilot/updates/',
            '/learn/'                                       => '/fides-design-pilot/learn/',
            '/learn/topics/'                                => '/fides-design-pilot/learn/topics/',
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
        // A proposed destination without a pilot page stays hidden: no live fallback for it.
        if ($url === '') {
            return '';
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
 * Signing is an existing WPForms form on the live Manifesto page (the pilot has no copy of it,
 * and the pilot must not collect signatures). The pilot page links to that form.
 */
add_filter(
    'fides_manifesto_sign_url',
    static function () {
        return 'https://fides.community/manifesto/#ratify-the-fides-manifesto-today';
    }
);

/*
 * localhost is not a *.local host, so make the catalog source order explicit:
 * GitHub first, as in production. A stale-data notice then means GitHub really
 * failed; the same-origin cache and the plugin data are only fallbacks.
 */
// The catalog design views look up their pilot detail page by scanning the first 20 pages with the pilot marker.
// With the Learn pages that scan misses the detail pages, so name the detail pages explicitly.
foreach (array('wallet' => 'wallet', 'organization' => 'organization', 'credential' => 'credential') as $fides_pilot_type => $fides_pilot_slug) {
    add_filter(
        'fides_' . $fides_pilot_type . '_pilot_detail_base',
        static function () use ($fides_pilot_slug) {
            return home_url('/fides-design-pilot/' . $fides_pilot_slug . '/');
        }
    );
}

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
        // A local crawl (not committed: it holds local catalogUrl paths) wins while present.
        $local_crawl = dirname(__DIR__, 3) . '/local-data/' . $catalog_type . '-aggregated.json';
        if (is_readable($local_crawl)) {
            return $local_crawl;
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

/*
 * No update checks against wordpress.org from the local pilot: they cannot
 * succeed here (outgoing requests are restricted) and only print warnings in
 * the admin. Updates are handled on the source site, not in the pilot.
 */
add_filter(
    'pre_site_transient_update_core',
    static function () {
        global $wp_version;
        return (object) array('last_checked' => time(), 'version_checked' => $wp_version, 'updates' => array());
    }
);
add_filter(
    'pre_site_transient_update_plugins',
    static function () {
        return (object) array('last_checked' => time(), 'checked' => array(), 'response' => array(), 'translations' => array(), 'no_update' => array());
    }
);
add_filter(
    'pre_site_transient_update_themes',
    static function () {
        return (object) array('last_checked' => time(), 'checked' => array(), 'response' => array(), 'translations' => array(), 'no_update' => array());
    }
);
