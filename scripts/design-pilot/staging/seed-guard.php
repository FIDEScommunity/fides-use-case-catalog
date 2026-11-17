<?php
/**
 * Shared safety checks and route settings for the design pilot seed scripts
 * (create-pages.php, create-learn-pages.php, preflight.php).
 *
 * Environment (all optional):
 *  PILOT_BASE           single path segment of the pilot routes   (fides-design-pilot; subpath staging: design-review)
 *  PILOT_STANDALONE=1   the pilot is its own WordPress site: home_url() already ends in PILOT_HOME_PATH, the pilot pages sit at
 *                       the root of that site (no base segment), so /design-review/overview/ is page "overview".
 *  PILOT_HOME_PATH      path home_url() must have in standalone mode      (/design-review)
 *  PILOT_ALLOWED_HOSTS  comma separated hosts that may be seeded  (localhost,127.0.0.1,staging.fides.community)
 *
 * The production hosts below are refused whatever PILOT_ALLOWED_HOSTS says.
 * fides_pilot_seed_context() keeps that refusal. The bounded Learn trial is the
 * only caller that may pass true, and only together with LEARN_TARGET=production
 * and LEARN_TRIAL_BOUNDED=1 on the main site. Other seeds must not pass true.
 */

if (! defined('ABSPATH')) {
    fwrite(STDERR, "Run through WP-CLI.\n");
    exit(1);
}

/** @return string[] hosts that may be seeded besides a site that defines FIDES_DESIGN_PILOT */
function fides_pilot_allowed_hosts(): array {
    return array_filter(array_map('trim', explode(',', strtolower((string) (getenv('PILOT_ALLOWED_HOSTS') ?: 'localhost,127.0.0.1,staging.fides.community')))), 'strlen');
}

function fides_pilot_host(): string {
    return strtolower((string) wp_parse_url(home_url(), PHP_URL_HOST));
}

/** True for a host in PILOT_ALLOWED_HOSTS; the production hosts are never allowed. */
function fides_pilot_host_allowed(): bool {
    $host = fides_pilot_host();
    return ! in_array($host, array('fides.community', 'www.fides.community'), true) && in_array($host, fides_pilot_allowed_hosts(), true);
}

function fides_pilot_standalone(): bool {
    return getenv('PILOT_STANDALONE') === '1';
}

/** Path of home_url() without a trailing slash: '' for a site at the domain root, '/design-review' for the standalone site. */
function fides_pilot_mount(): string {
    return rtrim((string) wp_parse_url(home_url('/'), PHP_URL_PATH), '/');
}

/**
 * Scheme, host and port of home_url() when the site lives below a path ('' for a site at the domain root).
 * Some plugin settings pass an attribute such as detail_url through home_url() and others print it raw, so a site below a path
 * cannot use site-relative links in seeded content; it gets absolute links built from home_url() at seed time.
 */
function fides_pilot_origin(): string {
    if (fides_pilot_mount() === '') {
        return '';
    }
    $p = wp_parse_url(home_url('/'));
    return (string) ($p['scheme'] ?? 'https') . '://' . (string) ($p['host'] ?? '') . (isset($p['port']) ? ':' . $p['port'] : '');
}

/** origin + path of home_url() ('' at the domain root): the part of an absolute seeded link that depends on the host. */
function fides_pilot_home_prefix(): string {
    return fides_pilot_origin() === '' ? '' : fides_pilot_origin() . fides_pilot_mount();
}

/**
 * Hash input without the host: absolute links of a site below a path are compared as {{home}}/..., so moving the site to
 * another domain (wp search-replace) does not make every seeded page look edited. A no-op at the domain root.
 */
function fides_pilot_normalize(string $text): string {
    $home = fides_pilot_home_prefix();
    return $home === '' ? $text : str_replace(array($home, str_replace('/', '\\/', $home)), '{{home}}', $text);
}

/** True only for the bounded Learn package, and only when that package names production. */
function fides_learn_trial_bounded_production(): bool {
    return getenv('LEARN_TRIAL_BOUNDED') === '1' && getenv('LEARN_TARGET') === 'production';
}

/** Production Learn install: multisite main site at https://fides.community/. */
function fides_learn_trial_assert_main_site(): void {
    if (! is_multisite() || ! is_main_site() || (int) get_current_blog_id() !== 1) {
        $blog = function_exists('get_current_blog_id') ? (int) get_current_blog_id() : 0;
        fwrite(STDERR, "Refusing: the production Learn install runs only on the main site (blog {$blog}).\n");
        exit(1);
    }
    $home = untrailingslashit(home_url());
    if (! in_array($home, array('https://fides.community', 'https://www.fides.community'), true)) {
        fwrite(STDERR, "Refusing: production home_url is {$home}.\n");
        exit(1);
    }
    if (fides_pilot_mount() !== '') {
        fwrite(STDERR, "Refusing: the main site must live at the domain root.\n");
        exit(1);
    }
}

/**
 * @return array{base:string,host:string,local:bool,standalone:bool,mount:string,origin:string}
 */
function fides_pilot_seed_context(bool $allow_bounded_learn = false): array {
    $host = fides_pilot_host();
    $bounded_production = $allow_bounded_learn && fides_learn_trial_bounded_production()
        && in_array($host, array('fides.community', 'www.fides.community'), true);
    if (in_array($host, array('fides.community', 'www.fides.community'), true) && ! $bounded_production) {
        fwrite(STDERR, "Refusing to seed the production host {$host}.\n");
        exit(1);
    }
    if ($bounded_production) {
        fides_learn_trial_assert_main_site();
    }
    $local = defined('FIDES_DESIGN_PILOT');
    if (! $bounded_production && ! $local && ! fides_pilot_host_allowed()) {
        fwrite(STDERR, "Refusing to seed host {$host}: not in PILOT_ALLOWED_HOSTS (" . implode(',', fides_pilot_allowed_hosts()) . ").\n");
        exit(1);
    }
    $standalone = fides_pilot_standalone();
    $mount      = fides_pilot_mount();
    if ($standalone) {
        $expect = '/' . trim((string) (getenv('PILOT_HOME_PATH') ?: '/design-review'), '/');
        if ($mount !== $expect) {
            fwrite(STDERR, "Standalone mode: home_url() path is '{$mount}', expected '{$expect}' (no double path, no site at the domain root).\n");
            exit(1);
        }
        $base = '';
    } else {
        $base = trim((string) (getenv('PILOT_BASE') ?: 'fides-design-pilot'), '/');
        if (preg_match('/^[a-z0-9][a-z0-9-]*$/', $base) !== 1) {
            fwrite(STDERR, "PILOT_BASE must be a single lowercase path segment (got '{$base}').\n");
            exit(1);
        }
    }
    return array('base' => $base, 'host' => $host, 'local' => $local, 'standalone' => $standalone, 'mount' => $mount, 'origin' => fides_pilot_origin());
}
