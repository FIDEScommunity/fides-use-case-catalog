<?php
/**
 * Plugin Name: FIDES design review config (staging)
 * Description: Settings for the FIDES design pilot on a staging site: shell route mapping, noindex, and the disabled external actions. Works for a standalone WordPress site whose home_url() ends in /design-review (pilot pages at the site root) and, as before, for a pilot below another site's root.
 *
 * Install as a must-use plugin (wp-content/mu-plugins/). Optional constants (wp-config.php):
 *  FIDES_DESIGN_REVIEW_STANDALONE      true: the site IS the pilot (home_url() ends in /design-review, pilot pages at the root,
 *                                      every request is a pilot request). Default: automatic, true when no BASE is set and the
 *                                      path of home_url() is /design-review.
 *  FIDES_DESIGN_REVIEW_BASE            subpath layout only: path segment of the pilot routes (default design-review)
 *  FIDES_DESIGN_REVIEW_OUTGOING        'blocklist' (default): no outgoing POST/PUT/PATCH/DELETE to GitHub or to the production
 *                                      site; 'strict': no outgoing write requests at all; 'off': no filter
 *  FIDES_DESIGN_REVIEW_ALLOW_MAIL      true allows wp_mail(); default: mail is not sent
 *  FIDES_DESIGN_REVIEW_LIVE_FALLBACK   origin for shell destinations that have no page on this site (default
 *                                      https://fides.community, '' hides those links)
 *  FIDES_DESIGN_REVIEW_SIGN_URL        Manifesto sign form URL (default: standalone: the live site's form; subpath: the form on this
 *                                      site's own /manifesto/ page)
 *  FIDES_DESIGN_REVIEW_BADGE           false hides the "Design review" badge
 */

if (! defined('ABSPATH')) {
    exit;
}

if (! function_exists('fides_design_review_base')) {
    /** True when this site is the pilot itself: home_url() ends in /design-review and the pilot pages sit at its root. */
    function fides_design_review_standalone(): bool {
        if (defined('FIDES_DESIGN_REVIEW_STANDALONE')) {
            return (bool) FIDES_DESIGN_REVIEW_STANDALONE;
        }
        return ! defined('FIDES_DESIGN_REVIEW_BASE') && rtrim((string) wp_parse_url(home_url('/'), PHP_URL_PATH), '/') === '/design-review';
    }

    /** Route base without slashes ('' when standalone: the site root is the pilot). */
    function fides_design_review_base(): string {
        if (fides_design_review_standalone()) {
            return '';
        }
        $base = defined('FIDES_DESIGN_REVIEW_BASE') ? (string) FIDES_DESIGN_REVIEW_BASE : 'design-review';
        $base = trim($base, '/');
        return preg_match('/^[a-z0-9][a-z0-9-]*$/', $base) === 1 ? $base : 'design-review';
    }

    /** Pilot route as a path below home_url(): '' or '/design-review' (subpath layout). */
    function fides_design_review_prefix(): string {
        $base = fides_design_review_base();
        return $base === '' ? '' : '/' . $base;
    }

    /** Full URL of a pilot page, e.g. fides_design_review_url('overview/'). Never doubles the home path. */
    function fides_design_review_url(string $rest = ''): string {
        return home_url(fides_design_review_prefix() . '/' . ltrim($rest, '/'));
    }

    /** Origin for destinations that have no page on this site. */
    function fides_design_review_live_origin(): string {
        return rtrim(defined('FIDES_DESIGN_REVIEW_LIVE_FALLBACK') ? (string) FIDES_DESIGN_REVIEW_LIVE_FALLBACK : 'https://fides.community', '/');
    }

    /** True while serving a page of the pilot (every page when standalone). */
    function fides_design_review_is_pilot_request(): bool {
        if (fides_design_review_standalone()) {
            return true;
        }
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
            '/awards/global-digital-trust-awards/'           => '{pilot}/global-digital-trust-awards/',
            '/awards/fides-community-awards/'                => '{pilot}/fides-community-awards/',
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
            $target = $map[ $path ];
            if ($path === '/' && fides_design_review_standalone()) {
                return home_url('/'); // the pilot homepage is the front page of the standalone site
            }
            if (strpos($target, '{pilot}') === 0) {
                return home_url(str_replace('{pilot}', fides_design_review_prefix(), $target));
            }
            $local = get_page_by_path(trim($target, '/'), OBJECT, 'page');
            if ($local instanceof WP_Post && $local->post_status === 'publish') {
                return home_url($target);
            }
            // A page this site does not have (standalone): the live page at the original path, read-only link.
            $live = fides_design_review_live_origin();
            return $live === '' ? '' : $live . $path;
        }
        // A proposed destination without a page on this site stays hidden.
        if ($url === '') {
            return '';
        }
        if (get_page_by_path(trim((string) $path, '/')) instanceof WP_Post) {
            return $url;
        }
        $live = fides_design_review_live_origin();
        return $live === '' ? '' : $live . $path;
    },
    10,
    2
);

// The catalog design views look up their pilot detail page by scanning the first 20 pages with the pilot marker.
// With the Learn pages that scan misses the detail pages, so name the detail pages explicitly.
foreach (array('wallet' => 'wallet', 'organization' => 'organization', 'credential' => 'credential') as $fides_pilot_type => $fides_pilot_slug) {
    add_filter(
        'fides_' . $fides_pilot_type . '_pilot_detail_base',
        static function () use ($fides_pilot_slug) {
            return fides_design_review_url($fides_pilot_slug . '/');
        }
    );
}

// Standalone: this site has no sign form (a WPForms form is site content), so the sign button opens the live form.
if (fides_design_review_standalone() && ! (defined('FIDES_DESIGN_REVIEW_SIGN_URL') && (string) FIDES_DESIGN_REVIEW_SIGN_URL !== '') && fides_design_review_live_origin() !== '') {
    add_filter(
        'fides_manifesto_sign_url',
        static function () {
            return fides_design_review_live_origin() . '/manifesto/#ratify-the-fides-manifesto-today';
        }
    );
}

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

// The same instruction as a header, for responses without a <head> (feeds, REST, files served through WordPress).
add_action(
    'send_headers',
    static function () {
        if (fides_design_review_is_pilot_request()) {
            header('X-Robots-Tag: noindex, nofollow', true);
        }
    }
);

add_filter(
    'robots_txt',
    static function ($output) {
        // Crawlers read robots.txt at the domain root; this line only matters when that root is served by this site.
        $line = 'Disallow: ' . wp_parse_url(fides_design_review_url(), PHP_URL_PATH);
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

// Opt-in for the new glossary page (Fides_DS_Glossary_Page) on the design-review site only.
// It is off by default in the plugin, so production keeps the classic glossary listing.
add_filter(
    'fides_ds_glossary_page_enabled',
    static function ($on, $id) {
        // Only the seeded glossary page; any other page with the shortcode keeps the classic listing.
        return $on || get_post_field('post_name', (int) $id) === 'glossary';
    },
    10,
    2
);
