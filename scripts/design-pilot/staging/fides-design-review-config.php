<?php
/**
 * Plugin Name: FIDES design review config (staging)
 * Description: Settings for the FIDES design pilot pages on a staging site under /design-review/: shell route mapping, noindex, and the disabled external actions. Does nothing outside the pilot routes except the outgoing-request and mail policy below.
 *
 * Install as a must-use plugin (wp-content/mu-plugins/). Optional constants (wp-config.php):
 *  FIDES_DESIGN_REVIEW_BASE            path segment of the pilot routes (default design-review)
 *  FIDES_DESIGN_REVIEW_OUTGOING        'blocklist' (default): no outgoing POST/PUT/PATCH/DELETE to GitHub or to the production
 *                                      site; 'strict': no outgoing write requests at all; 'off': no filter
 *  FIDES_DESIGN_REVIEW_ALLOW_MAIL      true allows wp_mail(); default: mail is not sent
 *  FIDES_DESIGN_REVIEW_LIVE_FALLBACK   origin for shell destinations that have no page on this site (default
 *                                      https://fides.community, '' hides those links)
 *  FIDES_DESIGN_REVIEW_SIGN_URL        Manifesto sign form URL (default: the form on this site's own /manifesto/ page)
 *  FIDES_DESIGN_REVIEW_BADGE           false hides the "Design review" badge
 */

if (! defined('ABSPATH')) {
    exit;
}

if (! function_exists('fides_design_review_base')) {
    /** Route base without slashes. */
    function fides_design_review_base(): string {
        $base = defined('FIDES_DESIGN_REVIEW_BASE') ? (string) FIDES_DESIGN_REVIEW_BASE : 'design-review';
        $base = trim($base, '/');
        return preg_match('/^[a-z0-9][a-z0-9-]*$/', $base) === 1 ? $base : 'design-review';
    }

    /** True while serving a page below the pilot base. */
    function fides_design_review_is_pilot_request(): bool {
        $path = (string) wp_parse_url((string) ($_SERVER['REQUEST_URI'] ?? ''), PHP_URL_PATH); // phpcs:ignore WordPress.Security.ValidatedSanitizedInput
        $home = (string) wp_parse_url(home_url('/'), PHP_URL_PATH);
        $rel  = '/' . ltrim(substr($path, strlen(rtrim($home, '/'))), '/');
        $base = '/' . fides_design_review_base();
        return $rel === $base || strpos($rel, $base . '/') === 0;
    }

    /**
     * Shell destinations (fides.community paths) and the pilot page that stands in for them.
     * "{pilot}" is the route base. Keep in sync with fides-design-pilot-guard.php (staging/verify-package.sh compares both).
     *
     * @return array<string,string>
     */
    function fides_design_review_route_map(): array {
        return array(
            '/'                                              => '{pilot}/homepage-fragment/',
            '/ecosystem-explorer/'                           => '/explorer/',
            '/ecosystem-explorer/start/'                     => '{pilot}/start/',
            '/about-fides/'                                  => '{pilot}/about-fides/',
            '/manifesto/'                                    => '{pilot}/manifesto/',
            '/about-fides/news/'                             => '{pilot}/updates/',
            '/learn/'                                        => '{pilot}/learn/',
            '/learn/topics/'                                 => '{pilot}/learn/topics/',
            '/ecosystem-explorer/use-cases/'                 => '{pilot}/overview/',
            '/ecosystem-explorer/use-cases/submit-use-case/' => '/use-case-form/',
            '/ecosystem-explorer/map/'                       => '/map/',
            '/ecosystem-explorer/theme/'                     => '/theme/',
            '/ecosystem-explorer/personal-wallets/'          => '{pilot}/personal-wallets/',
            '/ecosystem-explorer/organizational-wallets/'    => '{pilot}/business-wallets/',
            '/ecosystem-explorer/credential-catalog/'        => '{pilot}/credentials/',
            '/ecosystem-explorer/issuer-catalog/'            => '/issuer-catalog/',
            '/ecosystem-explorer/relying-party-catalog/'     => '/relying-party-websites/',
            '/community-tools/glossary/'                     => '/glossary/',
            '/organizations/'                                => '{pilot}/organizations/',
            '/organizations/submit-organization/'            => '/organizations-submit/',
            '/organizations/update-organization/'            => '/organizations-update/',
        );
    }
}

add_filter(
    'fides_site_shell_url',
    static function ($url, $path) {
        if (preg_match('#^https?://#i', (string) $path)) {
            return $url;
        }
        $map = fides_design_review_route_map();
        if (isset($map[ $path ])) {
            return home_url(str_replace('{pilot}', '/' . fides_design_review_base(), $map[ $path ]));
        }
        // A proposed destination without a page on this site stays hidden.
        if ($url === '') {
            return '';
        }
        if (get_page_by_path(trim((string) $path, '/')) instanceof WP_Post) {
            return $url;
        }
        $live = defined('FIDES_DESIGN_REVIEW_LIVE_FALLBACK') ? (string) FIDES_DESIGN_REVIEW_LIVE_FALLBACK : 'https://fides.community';
        return $live === '' ? '' : rtrim($live, '/') . $path;
    },
    10,
    2
);

if (defined('FIDES_DESIGN_REVIEW_SIGN_URL') && (string) FIDES_DESIGN_REVIEW_SIGN_URL !== '') {
    add_filter(
        'fides_manifesto_sign_url',
        static function () {
            return (string) FIDES_DESIGN_REVIEW_SIGN_URL;
        }
    );
}

/*
 * External actions that stay off on staging:
 *  - blocklist mode: write requests to GitHub (catalog submissions and sync) and to the production site;
 *    reading (GET/HEAD) stays open so catalog data loads;
 *  - strict mode: every outgoing write request;
 *  - mail, unless FIDES_DESIGN_REVIEW_ALLOW_MAIL.
 */
add_filter(
    'pre_http_request',
    static function ($pre, $args, $url) {
        $mode = defined('FIDES_DESIGN_REVIEW_OUTGOING') ? (string) FIDES_DESIGN_REVIEW_OUTGOING : 'blocklist';
        if ($mode === 'off') {
            return $pre;
        }
        $method = strtoupper((string) ($args['method'] ?? 'GET'));
        if (in_array($method, array('GET', 'HEAD'), true)) {
            return $pre;
        }
        $host = strtolower((string) wp_parse_url((string) $url, PHP_URL_HOST));
        $own  = strtolower((string) wp_parse_url(home_url(), PHP_URL_HOST));
        $blocked = $mode === 'strict'
            ? $host !== $own
            : ($host !== $own && (preg_match('/(^|\.)github(usercontent)?\.com$/', $host) === 1 || $host === 'fides.community' || $host === 'www.fides.community'));
        if (! $blocked) {
            return $pre;
        }
        error_log('FIDES design review blocked ' . $method . ' ' . $host);
        return new WP_Error('fides_design_review_blocked', 'Outgoing write requests to this host are disabled on the design review site.');
    },
    1,
    3
);

add_filter(
    'pre_wp_mail',
    static function ($pre) {
        return defined('FIDES_DESIGN_REVIEW_ALLOW_MAIL') && FIDES_DESIGN_REVIEW_ALLOW_MAIL ? $pre : false;
    },
    1
);

/* Pilot pages are not for search engines, even if the rest of the site is. */
add_filter(
    'wp_robots',
    static function ($robots) {
        if (fides_design_review_is_pilot_request()) {
            $robots['noindex']  = true;
            $robots['nofollow'] = true;
        }
        return $robots;
    }
);

add_filter(
    'robots_txt',
    static function ($output) {
        $line = 'Disallow: ' . wp_parse_url(home_url('/' . fides_design_review_base() . '/'), PHP_URL_PATH);
        return rtrim((string) $output) . "\n\nUser-agent: *\n" . $line . "\n";
    }
);

add_action(
    'wp_footer',
    static function () {
        if ((defined('FIDES_DESIGN_REVIEW_BADGE') && ! FIDES_DESIGN_REVIEW_BADGE) || ! fides_design_review_is_pilot_request()) {
            return;
        }
        echo '<div style="position:fixed;bottom:0;right:0;z-index:99999;background:#0E0E0E;color:#fff;font:12px/18px Inter,system-ui,sans-serif;padding:4px 10px">Design review · not published</div>';
    }
);
