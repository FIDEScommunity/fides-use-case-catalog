<?php
/**
 * Share-URL helpers. LinkedIn crawlers ignore ?usecase= on the listing page,
 * so listing query URLs 301 to /use-case/{id}/. Update/create forms also use
 * ?usecase= and must never be redirected.
 *
 * Listing detection is an exact path match (not a prefix). Nested form paths
 * such as /ecosystem-explorer/use-cases/update-use-case/ must stay unmatched.
 *
 * @package fides-use-case-catalog
 */

if (! defined('ABSPATH')) {
    exit;
}

/**
 * @return array<int, string>
 */
function fides_use_case_catalog_default_listing_path_aliases(): array {
    return array(
        '/use-cases/',
        '/ecosystem-explorer/use-cases/',
    );
}

function fides_use_case_catalog_normalize_path($path): string {
    if (! is_string($path) || $path === '') {
        return '';
    }
    $path = '/' . ltrim($path, '/');
    if ($path !== '/') {
        $path = rtrim($path, '/') . '/';
    }
    return $path;
}

/**
 * True only when $path is exactly one of the listing aliases.
 *
 * @param mixed             $path    Request path (query string already stripped).
 * @param array<int, mixed> $aliases Listing path aliases.
 */
function fides_use_case_catalog_path_is_exact_listing($path, array $aliases): bool {
    $normalized = fides_use_case_catalog_normalize_path(is_string($path) ? $path : '');
    if ($normalized === '' || $normalized === '/') {
        return false;
    }
    foreach ($aliases as $alias) {
        if (! is_string($alias) || $alias === '') {
            continue;
        }
        if ($normalized === fides_use_case_catalog_normalize_path($alias)) {
            return true;
        }
    }
    return false;
}

function fides_use_case_catalog_is_listing_request_path($path): bool {
    $aliases = fides_use_case_catalog_default_listing_path_aliases();
    if (function_exists('fides_use_case_catalog_listing_path')) {
        array_unshift($aliases, fides_use_case_catalog_listing_path());
    }
    return fides_use_case_catalog_path_is_exact_listing($path, $aliases);
}
