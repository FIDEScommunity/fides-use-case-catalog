<?php
/**
 * Shared safety checks and route settings for the design pilot seed scripts
 * (create-pages.php, create-learn-pages.php, preflight.php).
 *
 * Environment (all optional):
 *  PILOT_BASE           single path segment of the pilot routes   (fides-design-pilot; staging: design-review)
 *  PILOT_ALLOWED_HOSTS  comma separated hosts that may be seeded  (localhost,127.0.0.1,staging.fides.community)
 *
 * The production hosts below are refused whatever PILOT_ALLOWED_HOSTS says.
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

/**
 * @return array{base:string,host:string,local:bool}
 */
function fides_pilot_seed_context(): array {
    $base = trim((string) (getenv('PILOT_BASE') ?: 'fides-design-pilot'), '/');
    if (preg_match('/^[a-z0-9][a-z0-9-]*$/', $base) !== 1) {
        fwrite(STDERR, "PILOT_BASE must be a single lowercase path segment (got '{$base}').\n");
        exit(1);
    }
    $host = fides_pilot_host();
    if (in_array($host, array('fides.community', 'www.fides.community'), true)) {
        fwrite(STDERR, "Refusing to seed the production host {$host}.\n");
        exit(1);
    }
    $local = defined('FIDES_DESIGN_PILOT');
    if (! $local && ! fides_pilot_host_allowed()) {
        fwrite(STDERR, "Refusing to seed host {$host}: not in PILOT_ALLOWED_HOSTS (" . implode(',', fides_pilot_allowed_hosts()) . ").\n");
        exit(1);
    }
    return array('base' => $base, 'host' => $host, 'local' => $local);
}
